// React Context状态管理 - 用于股票看板应用

import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import type { HoldingItem, NewsItem, ViewMode, TimeRange, IndustryData, ChartData } from '@/types';
import {
  applyQuotesToHoldings,
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

const classifySector = (holding: HoldingItem): string => {
  const name = holding.name;
  const symbol = holding.symbol;

  if (name.includes('银行')) return '银行';
  if (name.includes('证券') || name.includes('券商')) return '证券';
  if (name.includes('保险')) return '保险';
  if (name.includes('白酒') || name.includes('酿酒') || name.includes('酒')) return '白酒';
  if (name.includes('医药') || name.includes('医疗') || name.includes('生物')) return '医药';
  if (name.includes('半导体') || name.includes('芯片')) return '半导体';
  if (name.includes('新能源') || name.includes('电池') || name.includes('光伏')) return '新能源';
  if (name.includes('汽车') || name.includes('整车')) return '汽车';
  if (name.includes('煤炭')) return '煤炭';
  if (name.includes('钢铁')) return '钢铁';

  if (symbol.startsWith('688')) return '科创板';
  if (symbol.startsWith('300')) return '创业板';
  if (symbol.startsWith('60')) return '沪市主板';
  if (symbol.startsWith('00')) return '深市主板';
  if (symbol.startsWith('8') || symbol.startsWith('4')) return '北交所';

  return '其他';
};

const buildLocalIndustriesData = (holdings: HoldingItem[]): IndustryData[] => {
  if (holdings.length === 0) return [];

  const groups = new Map<string, {
    amount: number;
    weightedChange: number;
    leadingStock: string;
    leadingStockChange: number;
  }>();

  holdings.forEach((holding) => {
    const sector = classifySector(holding);
    const amount = holding.totalValue;
    const changePercent = Number.isFinite(holding.changePercent) ? holding.changePercent : 0;

    const prev = groups.get(sector) || {
      amount: 0,
      weightedChange: 0,
      leadingStock: holding.name,
      leadingStockChange: changePercent,
    };

    prev.amount += amount;
    prev.weightedChange += changePercent * amount;

    if (Math.abs(changePercent) > Math.abs(prev.leadingStockChange)) {
      prev.leadingStock = holding.name;
      prev.leadingStockChange = changePercent;
    }

    groups.set(sector, prev);
  });

  return Array.from(groups.entries())
    .map(([name, value]) => {
      const avgChangePercent = value.amount > 0 ? value.weightedChange / value.amount : 0;
      return {
        name,
        changePercent: Number(avgChangePercent.toFixed(2)),
        change: Number((value.amount * avgChangePercent / 100).toFixed(2)),
        amount: Number(value.amount.toFixed(2)),
        leadingStock: value.leadingStock,
        leadingStockChange: Number(value.leadingStockChange.toFixed(2)),
      };
    })
    .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
};

const getRangePoints = (range: TimeRange): number => {
  switch (range) {
    case '1D':
      return 24;
    case '1W':
      return 35;
    case '1M':
      return 30;
    case '3M':
      return 45;
    case '1Y':
      return 60;
    case 'YTD':
      return 50;
    default:
      return 30;
  }
};

const toTimelineDate = (range: TimeRange, index: number, points: number): string => {
  const now = new Date();
  const t = points <= 1 ? 1 : index / (points - 1);
  const date = new Date(now);

  if (range === '1D') {
    const hours = Math.round((1 - t) * 23);
    date.setHours(now.getHours() - hours, 0, 0, 0);
    return date.toISOString();
  }

  const rangeDays =
    range === '1W' ? 7 :
      range === '1M' ? 30 :
        range === '3M' ? 90 :
          range === '1Y' ? 365 :
            Math.max(1, Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 86400000));

  const days = Math.round((1 - t) * rangeDays);
  date.setDate(now.getDate() - days);
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
};

const sampleTrend = (trendData: number[], points: number): number[] => {
  if (points <= 0) return [];
  if (trendData.length === 0) return Array.from({ length: points }, () => 0);
  if (trendData.length === 1) return Array.from({ length: points }, () => trendData[0]);

  return Array.from({ length: points }, (_, idx) => {
    const pos = (idx / Math.max(points - 1, 1)) * (trendData.length - 1);
    const left = Math.floor(pos);
    const right = Math.min(left + 1, trendData.length - 1);
    const ratio = pos - left;
    const value = trendData[left] * (1 - ratio) + trendData[right] * ratio;
    return Number(value.toFixed(2));
  });
};

const buildLocalChartData = (
  holdings: HoldingItem[],
  range: TimeRange,
  symbol?: string | null,
): ChartData[] => {
  if (holdings.length === 0) return [];

  const points = getRangePoints(range);
  const targetHolding = symbol ? holdings.find((item) => item.symbol === symbol) : null;

  if (targetHolding) {
    const series = sampleTrend(targetHolding.trendData, points);
    const base = series[0] || targetHolding.currentPrice || 1;
    const baseAmount = base * targetHolding.shares;

    return series.map((price, index) => {
      const value = price * targetHolding.shares;
      const yieldAmount = value - baseAmount;
      const yieldRate = baseAmount > 0 ? (yieldAmount / baseAmount) * 100 : 0;
      return {
        date: toTimelineDate(range, index, points),
        yieldRate: Number(yieldRate.toFixed(2)),
        yieldAmount: Number(yieldAmount.toFixed(2)),
      };
    });
  }

  const sampledSeries = holdings.map((holding) => ({
    shares: holding.shares,
    data: sampleTrend(holding.trendData, points),
  }));

  const totalSeries = Array.from({ length: points }, (_, idx) => {
    return sampledSeries.reduce((sum, item) => sum + (item.data[idx] || 0) * item.shares, 0);
  });

  const base = totalSeries[0] || 1;

  return totalSeries.map((value, index) => {
    const yieldAmount = value - base;
    const yieldRate = base > 0 ? (yieldAmount / base) * 100 : 0;
    return {
      date: toTimelineDate(range, index, points),
      yieldRate: Number(yieldRate.toFixed(2)),
      yieldAmount: Number(yieldAmount.toFixed(2)),
    };
  });
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
  const [isNewsLoading, setIsNewsLoading] = useState(false);
  const [isIndustriesLoading, setIsIndustriesLoading] = useState(false);
  const [apiErrorToast, setApiErrorToast] = useState<string | null>(null);
  const holdingsRef = useRef<HoldingItem[]>([]);
  const selectedStockRef = useRef<string | null>(null);
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

  const loadChartData = useCallback((range: TimeRange, symbol?: string | null) => {
    setIsChartLoading(true);
    const nextChartData = buildLocalChartData(holdingsRef.current, range, symbol);
    setChartData(nextChartData);
    setIsChartLoading(false);
  }, []);

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
    loadChartData(range, selectedStock);
  }, [loadChartData, selectedStock]);

  // 设置选中的股票
  const handleSetSelectedStock = useCallback((symbol: string | null) => {
    setSelectedStock(symbol);
    loadChartData(timeRange, symbol);
  }, [timeRange, loadChartData]);

  // 设置视图模式
  const handleSetViewMode = useCallback((mode: ViewMode) => {
    setViewMode(mode);
  }, []);

  // 设置时间范围
  const handleSetTimeRange = useCallback((range: TimeRange) => {
    setTimeRange(range);
    loadChartData(range, selectedStock);
  }, [loadChartData, selectedStock]);

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
        if (!cancelled) {
          setHoldings(baseHoldings);
        }

        if (baseHoldings.length > 0) {
          setIsQuotesLoading(true);
          try {
            const quotes = await fetchAShareQuotes(baseHoldings.map((item) => item.symbol));
            if (!cancelled) {
              setHoldings((prevHoldings) => applyQuotesToHoldings(prevHoldings, quotes));
              setIsBackendConnected(true);
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
        }

        try {
          const latestNews = await fetchAShareNews();
          if (!cancelled) {
            setNews(latestNews);
            setIsBackendConnected(true);
          }
        } catch (error) {
          console.error('News request failed:', error);
          if (!cancelled) {
            setNews([]);
            setIsBackendConnected(false);
            notifyApiError('新闻服务连接失败，请检查后端 API。');
          }
        } finally {
          if (!cancelled) {
            setIsNewsLoading(false);
          }
        }

        if (!cancelled) {
          loadChartData('1M', null);
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
    }, 3000);

    return () => clearInterval(interval);
  }, [refreshPrices]);

  useEffect(() => {
    loadChartData(timeRange, selectedStock);
  }, [holdings, timeRange, selectedStock, loadChartData]);

  useEffect(() => {
    setIsIndustriesLoading(true);
    const nextIndustries = buildLocalIndustriesData(holdings);
    setIndustries(nextIndustries);
    setIsIndustriesLoading(false);
  }, [holdings]);

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
