// React Context状态管理 - 用于股票看板应用

import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import type { HoldingItem, NewsItem, ViewMode, TimeRange, IndustryData, ChartData } from '@/types';
import {
  applyQuotesToHoldings,
  fetchAShareChartData,
  fetchAShareIndustries,
  fetchAShareNews,
  fetchAShareQuotes,
  loadPortfolioFromTrades,
} from '@/lib/aShareData';

type QuickTradeType = '买入' | '卖出';

interface QuickTradePayload {
  symbol: string;
  name: string;
  type: QuickTradeType;
  price: number;
  shares: number;
  fee?: number;
}

const buildSeedTrend = (price: number): number[] => Array.from({ length: 7 }, () => Number(price.toFixed(2)));

const buildTrendFromChartData = (
  chartPoints: ChartData[],
  currentPrice: number,
  targetPoints = 10,
): number[] => {
  if (!(currentPrice > 0) || chartPoints.length === 0) {
    return Array.from({ length: targetPoints }, () => Number(currentPrice.toFixed(2)));
  }

  const rates = chartPoints
    .map((item) => item.yieldRate)
    .filter((value) => Number.isFinite(value));

  if (rates.length === 0) {
    return Array.from({ length: targetPoints }, () => Number(currentPrice.toFixed(2)));
  }

  const lastRate = rates[rates.length - 1] ?? 0;
  const denom = 1 + lastRate / 100;
  const basePrice = Math.abs(denom) > 1e-6 ? currentPrice / denom : currentPrice;

  const reconstructed = rates
    .map((rate) => Number((basePrice * (1 + rate / 100)).toFixed(2)))
    .filter((value) => Number.isFinite(value) && value > 0);

  if (reconstructed.length === 0) {
    return Array.from({ length: targetPoints }, () => Number(currentPrice.toFixed(2)));
  }

  if (reconstructed.length <= targetPoints) {
    return reconstructed;
  }

  return Array.from({ length: targetPoints }, (_, idx) => {
    const pos = Math.round((idx * (reconstructed.length - 1)) / (targetPoints - 1));
    return reconstructed[pos] ?? reconstructed[reconstructed.length - 1];
  });
};

const recalcHoldingByPrice = (holding: HoldingItem, currentPrice: number): HoldingItem => {
  const totalValue = currentPrice * holding.shares;
  const totalCost = holding.cost * holding.shares;
  const profitLoss = totalValue - totalCost;
  const profitLossPercent = totalCost > 0 ? (profitLoss / totalCost) * 100 : 0;

  return {
    ...holding,
    currentPrice: Number(currentPrice.toFixed(2)),
    totalValue: Number(totalValue.toFixed(2)),
    profitLoss: Number(profitLoss.toFixed(2)),
    profitLossPercent: Number(profitLossPercent.toFixed(2)),
    trendData: [...holding.trendData, Number(currentPrice.toFixed(2))].slice(-14),
  };
};

// 行业分类映射
const SECTOR_MAP: Record<string, string> = {
  // 白酒
  '600519': '白酒', '000858': '白酒', '000596': '白酒', '002304': '白酒',
  '603369': '白酒', '600779': '白酒', '000568': '白酒', '002266': '白酒',
  // 银行
  '000001': '银行', '600036': '银行', '601398': '银行', '601288': '银行',
  '601939': '银行', '601988': '银行', '601818': '银行', '601166': '银行',
  '600000': '银行', '600016': '银行', '601328': '银行', '601998': '银行',
  // 保险
  '601318': '保险', '601601': '保险', '601628': '保险', '601336': '保险',
  // 证券
  '600030': '证券', '601688': '证券', '000776': '证券', '601211': '证券',
  // 家电
  '600690': '家电', '000333': '家电', '002408': '家电',
  // 医药
  '600276': '医药', '000538': '医药', '603259': '医药', '600867': '医药',
  // 电力/能源
  '600900': '电力', '601985': '核电', '600027': '能源',
  // 房地产
  '000002': '房地产', '600048': '房地产',
  // 有色金属
  '601899': '有色金属', '600547': '有色金属',
  // 科技
  '002415': '科技', '000725': '科技', '002230': '科技',
};

const classifySector = (symbol: string): string =>
  SECTOR_MAP[symbol.replace(/\.\w+$/, '').trim()] ?? '其他';

const buildLocalChartData = (
  holdings: HoldingItem[],
  range: TimeRange,
  selectedStock: string | null,
): ChartData[] => {
  const targets = selectedStock
    ? holdings.filter((h) => h.symbol === selectedStock)
    : holdings;

  if (targets.length === 0) return [];

  const now = new Date();
  const ytdDays = Math.max(1, Math.floor(
    (now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 86400000
  ));
  const daysMap: Record<TimeRange, number> = {
    '1D': 1, '1W': 7, '1M': 30, '3M': 90, '1Y': 365, 'YTD': ytdDays,
  };
  const days = daysMap[range];
  const numPoints = Math.min(days, 30);

  return Array.from({ length: numPoints }, (_, i) => {
    const progress = numPoints <= 1 ? 1 : i / (numPoints - 1);

    const d = new Date(now);
    d.setDate(now.getDate() - days + Math.round(progress * days));
    const dateStr = d.toISOString().split('T')[0];

    let totalValue = 0;
    let totalCost = 0;

    for (const h of targets) {
      const tLen = h.trendData.length;
      if (tLen === 0) continue;
      const tIdx = Math.min(Math.floor(progress * (tLen - 1)), tLen - 1);
      const price = h.trendData[tIdx] ?? h.currentPrice;
      totalValue += price * h.shares;
      totalCost += h.cost * h.shares;
    }

    const yieldAmount = totalValue - totalCost;
    const yieldRate = totalCost > 0 ? (yieldAmount / totalCost) * 100 : 0;

    return {
      date: dateStr,
      yieldRate: Number(yieldRate.toFixed(2)),
      yieldAmount: Number(yieldAmount.toFixed(2)),
    };
  });
};

const buildLocalIndustriesData = (holdings: HoldingItem[]): IndustryData[] => {
  if (holdings.length === 0) return [];

  const sectors = new Map<
    string,
    { totalValue: number; weightedChange: number; leadingName: string; leadingChange: number; leadingAbs: number }
  >();

  for (const h of holdings) {
    const sector = classifySector(h.symbol);
    const s = sectors.get(sector) ?? {
      totalValue: 0, weightedChange: 0, leadingName: '', leadingChange: 0, leadingAbs: 0,
    };
    s.totalValue += h.totalValue;
    s.weightedChange += h.changePercent * h.totalValue;
    if (Math.abs(h.changePercent) > s.leadingAbs) {
      s.leadingAbs = Math.abs(h.changePercent);
      s.leadingName = h.name;
      s.leadingChange = h.changePercent;
    }
    sectors.set(sector, s);
  }

  return Array.from(sectors.entries()).map(([name, s]) => ({
    name,
    changePercent: Number((s.totalValue > 0 ? s.weightedChange / s.totalValue : 0).toFixed(2)),
    change: 0,
    amount: Number(s.totalValue.toFixed(0)),
    leadingStock: s.leadingName,
    leadingStockChange: Number(s.leadingChange.toFixed(2)),
  }));
};


interface StockStoreContextType {
  // 持仓列表
  holdings: HoldingItem[];
  // 选中的股票代码
  selectedStock: string | null;
  // 视图模式 (收益率/收益额)
  viewMode: ViewMode;
  // 时间范围
  timeRange: TimeRange;
  // 新闻列表
  news: NewsItem[];
  // 行业数据
  industries: IndustryData[];
  // 图表数据
  chartData: ChartData[];
  // 是否显示股票详情弹窗
  isDetailModalOpen: boolean;
  // 是否显示设置弹窗
  isSettingsOpen: boolean;
  // 加载状态
  isLoading: boolean;
  // 后端连接状态
  isBackendConnected: boolean;
  // 外部数据加载状态
  isQuotesLoading: boolean;
  isChartLoading: boolean;
  isInitialChartLoading: boolean;
  isNewsLoading: boolean;
  isIndustriesLoading: boolean;
  apiErrorToast: string | null;

  // Actions
  setSelectedStock: (symbol: string | null) => void;
  setViewMode: (mode: ViewMode) => void;
  setTimeRange: (range: TimeRange) => void;
  setNewsExpanded: (id: string, isExpanded: boolean) => void;
  openDetailModal: () => void;
  closeDetailModal: () => void;
  openSettings: () => void;
  closeSettings: () => void;
  updateHoldings: (holdings: HoldingItem[]) => void;
  applyQuickTrade: (payload: QuickTradePayload) => void;
  refreshPrices: () => void;
  refreshChartData: (range: TimeRange) => void;
  closeApiErrorToast: () => void;
}

const StockStoreContext = createContext<StockStoreContextType | undefined>(undefined);

interface StockStoreProviderProps {
  children: ReactNode;
}

export const StockStoreProvider = ({ children }: StockStoreProviderProps) => {
  // 初始状态
  const [holdings, setHoldings] = useState<HoldingItem[]>([]);
  const [selectedStock, setSelectedStock] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('rate');
  const [timeRange, setTimeRange] = useState<TimeRange>('1M');
  const [news, setNews] = useState<NewsItem[]>([]);
  const [industries, setIndustries] = useState<IndustryData[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isBackendConnected, setIsBackendConnected] = useState(true);
  const [isQuotesLoading, setIsQuotesLoading] = useState(false);
  const [isChartLoading, setIsChartLoading] = useState(false);
  const [isInitialChartLoading, setIsInitialChartLoading] = useState(true);
  const [isNewsLoading, setIsNewsLoading] = useState(false);
  const [isIndustriesLoading, setIsIndustriesLoading] = useState(false);
  const [apiErrorToast, setApiErrorToast] = useState<string | null>(null);
  const holdingsRef = useRef<HoldingItem[]>([]);
  const selectedStockRef = useRef<string | null>(null);
  const initialChartSettledRef = useRef(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastToastAtRef = useRef(0);

  const TOAST_COOLDOWN_MS = 15000;

  useEffect(() => {
    holdingsRef.current = holdings;
  }, [holdings]);

  useEffect(() => {
    selectedStockRef.current = selectedStock;
  }, [selectedStock]);

  const closeApiErrorToast = useCallback(() => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    setApiErrorToast(null);
  }, []);

  const notifyApiError = useCallback((message: string) => {
    const now = Date.now();
    if (now - lastToastAtRef.current < TOAST_COOLDOWN_MS) return;

    lastToastAtRef.current = now;
    setApiErrorToast(message);

    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }

    toastTimerRef.current = setTimeout(() => {
      setApiErrorToast(null);
      toastTimerRef.current = null;
    }, 5000);
  }, []);

  const loadChartData = useCallback(async (range: TimeRange, symbol?: string | null) => {
    // 先本地快速兜底，避免等待后端超时导致面板空白
    const localFallback = buildLocalChartData(holdingsRef.current, range, symbol ?? null);
    setChartData(localFallback);
    setIsChartLoading(true);
    try {
      const nextChartData = await fetchAShareChartData(range, symbol);
      if (nextChartData.length > 0) {
        setChartData(nextChartData);
        setIsBackendConnected(true);
      }
    } catch (error) {
      console.error('Chart request failed:', error);
      setIsBackendConnected(false);
      notifyApiError('图表服务连接失败，请检查后端 API。');
    } finally {
      setIsChartLoading(false);
      if (!initialChartSettledRef.current) {
        initialChartSettledRef.current = true;
        setIsInitialChartLoading(false);
      }
    }
  }, [notifyApiError]);

  // 刷新价格（实时接口）
  const refreshPrices = useCallback(() => {
    void (async () => {
      const symbols = holdingsRef.current.map((item) => item.symbol).filter(Boolean);
      if (symbols.length === 0) return;

      setIsQuotesLoading(true);
      try {
        const quotes = await fetchAShareQuotes(symbols);
        setHoldings((prevHoldings) => applyQuotesToHoldings(prevHoldings, quotes));
        setIsBackendConnected(true);
      } catch (error) {
        console.error('Failed to refresh quote data:', error);
        setIsBackendConnected(false);
        notifyApiError('行情服务连接失败，请检查后端 API。');
      } finally {
        setIsQuotesLoading(false);
      }
    })();
  }, [notifyApiError]);

  // 刷新图表数据
  const refreshChartData = useCallback((range: TimeRange) => {
    void loadChartData(range, selectedStock);
  }, [loadChartData, selectedStock]);

  // 设置选中的股票
  const handleSetSelectedStock = useCallback((symbol: string | null) => {
    setSelectedStock(symbol);
  }, []);

  // 设置视图模式
  const handleSetViewMode = useCallback((mode: ViewMode) => {
    setViewMode(mode);
  }, []);

  // 设置时间范围
  const handleSetTimeRange = useCallback((range: TimeRange) => {
    setTimeRange(range);
  }, []);

  // 设置新闻展开状态
  const handleSetNewsExpanded = useCallback((id: string, isExpanded: boolean) => {
    setNews(prevNews =>
      prevNews.map((item) =>
        item.id === id ? { ...item, isExpanded } : item
      )
    );
  }, []);

  // 打开详情弹窗
  const openDetailModal = useCallback(() => {
    setIsDetailModalOpen(true);
  }, []);

  // 关闭详情弹窗
  const closeDetailModal = useCallback(() => {
    setIsDetailModalOpen(false);
  }, []);

  // 打开设置弹窗
  const openSettings = useCallback(() => {
    setIsSettingsOpen(true);
  }, []);

  // 关闭设置弹窗
  const closeSettings = useCallback(() => {
    setIsSettingsOpen(false);
  }, []);

  // 更新持股
  const updateHoldings = useCallback((newHoldings: HoldingItem[]) => {
    setHoldings(newHoldings);
  }, []);

  const applyQuickTrade = useCallback((payload: QuickTradePayload) => {
    const symbol = payload.symbol.trim();
    const name = payload.name.trim() || symbol;
    const price = Number(payload.price);
    const shares = Number(payload.shares);
    const fee = Number(payload.fee || 0);

    if (!symbol || price <= 0 || shares <= 0) return;

    setHoldings((prev) => {
      const target = prev.find((item) => item.symbol === symbol);

      if (payload.type === '买入') {
        if (!target) {
          const totalCost = price * shares + fee;
          const costPerShare = totalCost / shares;
          const created: HoldingItem = {
            symbol,
            name,
            currentPrice: Number(price.toFixed(2)),
            change: 0,
            changePercent: 0,
            shares,
            cost: Number(costPerShare.toFixed(2)),
            totalValue: Number((price * shares).toFixed(2)),
            profitLoss: Number(((price * shares) - totalCost).toFixed(2)),
            profitLossPercent: totalCost > 0 ? Number((((price * shares - totalCost) / totalCost) * 100).toFixed(2)) : 0,
            trendData: buildSeedTrend(price),
          };
          return [...prev, created];
        }

        const nextShares = target.shares + shares;
        const totalCostAmount = target.cost * target.shares + price * shares + fee;
        const nextHolding = recalcHoldingByPrice({
          ...target,
          name: target.name || name,
          shares: nextShares,
          cost: Number((totalCostAmount / nextShares).toFixed(2)),
        }, price);

        return prev.map((item) => (item.symbol === symbol ? nextHolding : item));
      }

      if (!target) return prev;

      const soldShares = Math.min(target.shares, shares);
      const remainShares = target.shares - soldShares;
      if (remainShares <= 0) {
        if (selectedStockRef.current === symbol) setSelectedStock(null);
        return prev.filter((item) => item.symbol !== symbol);
      }

      const nextHolding = recalcHoldingByPrice({
        ...target,
        shares: remainShares,
      }, price);

      return prev.map((item) => (item.symbol === symbol ? nextHolding : item));
    });
  }, []);

  // 初始化数据源（不使用mock）
  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      setIsLoading(true);

      try {
        const baseHoldings = await loadPortfolioFromTrades();
        let latestHoldings = baseHoldings;
        if (!cancelled) {
          setHoldings(baseHoldings);
          setIndustries(buildLocalIndustriesData(baseHoldings));
          setChartData(buildLocalChartData(baseHoldings, '1M', null));
        }

        if (baseHoldings.length > 0) {
          setIsQuotesLoading(true);
          try {
            const quotes = await fetchAShareQuotes(baseHoldings.map((item) => item.symbol));
            if (!cancelled) {
              const applied = applyQuotesToHoldings(baseHoldings, quotes);
              latestHoldings = applied;
              setHoldings(applied);
              setIsBackendConnected(true);
            }

            // 首屏额外拉一次 1D 图表，初始化每只持仓的 10 个缩略图点。
            const enrichedHoldings = await Promise.all(
              latestHoldings.map(async (holding) => {
                try {
                  const chartPoints = await fetchAShareChartData('1D', holding.symbol);
                  if (chartPoints.length === 0) return holding;
                  return {
                    ...holding,
                    trendData: buildTrendFromChartData(chartPoints, holding.currentPrice, 10),
                  };
                } catch {
                  return holding;
                }
              })
            );

            if (!cancelled) {
              latestHoldings = enrichedHoldings;
              setHoldings(enrichedHoldings);
            }
          } catch (error) {
            console.error('Initial quote request failed:', error);
            if (!cancelled) {
              setIsBackendConnected(false);
              notifyApiError('初始行情加载失败，请检查后端 API。');
            }
          } finally {
            if (!cancelled) {
              setIsQuotesLoading(false);
            }
          }
        }

        if (!cancelled) {
          setIsNewsLoading(true);
          setIsIndustriesLoading(true);
        }

        try {
          const [latestNews, latestIndustries] = await Promise.all([
            fetchAShareNews(),
            fetchAShareIndustries(),
          ]);
          if (!cancelled) {
            setNews(latestNews);
            setIndustries(
              latestIndustries.length > 0
                ? latestIndustries
                : buildLocalIndustriesData(latestHoldings)
            );
            setIsBackendConnected(true);
          }
        } catch (error) {
          console.error('News or industries request failed:', error);
          if (!cancelled) {
            setNews([]);
            setIndustries(buildLocalIndustriesData(latestHoldings));
            setIsBackendConnected(false);
            notifyApiError('新闻或行业服务连接失败，请检查后端 API。');
          }
        } finally {
          if (!cancelled) {
            setIsNewsLoading(false);
            setIsIndustriesLoading(false);
          }
        }

      } catch (error) {
        console.error('Failed to initialize A-share data source:', error);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [loadChartData, notifyApiError]);

  // 实时价格轮询
  useEffect(() => {
    const interval = setInterval(() => {
      refreshPrices();
    }, 10000);

    return () => clearInterval(interval);
  }, [refreshPrices]);

  useEffect(() => {
    void loadChartData(timeRange, selectedStock);
  }, [timeRange, selectedStock, loadChartData]);

  // 当后端不可用时，使用本地行业计算保持面板有数据
  useEffect(() => {
    if (!isBackendConnected && holdings.length > 0) {
      setIndustries(buildLocalIndustriesData(holdings));
    }
  }, [holdings, isBackendConnected]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const value: StockStoreContextType = {
    holdings,
    selectedStock,
    viewMode,
    timeRange,
    news,
    industries,
    chartData,
    isDetailModalOpen,
    isSettingsOpen,
    isLoading,
    isBackendConnected,
    isQuotesLoading,
    isChartLoading,
    isInitialChartLoading,
    isNewsLoading,
    isIndustriesLoading,
    apiErrorToast,
    setSelectedStock: handleSetSelectedStock,
    setViewMode: handleSetViewMode,
    setTimeRange: handleSetTimeRange,
    setNewsExpanded: handleSetNewsExpanded,
    openDetailModal,
    closeDetailModal,
    openSettings,
    closeSettings,
    updateHoldings,
    applyQuickTrade,
    refreshPrices,
    refreshChartData,
    closeApiErrorToast,
  };

  return (
    <StockStoreContext.Provider value={value}>
      {children}
    </StockStoreContext.Provider>
  );
};

// 自定义Hook
export const useStockStore = (): StockStoreContextType => {
  const context = useContext(StockStoreContext);
  if (context === undefined) {
    throw new Error('useStockStore must be used within a StockStoreProvider');
  }
  return context;
};

export default useStockStore;
