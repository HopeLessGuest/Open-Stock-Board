import type { ChartData, HoldingItem, IndustryData, NewsItem, TimeRange } from '@/types';

type Primitive = string | number | null | undefined;

type GenericRecord = Record<string, unknown>;

interface TradeRecord {
  id: string;
  symbol: string;
  name: string;
  type: string;
  price: number;
  shares: number;
  amount: number;
  fee?: number;
}

interface TradesFile {
  trades: TradeRecord[];
}

interface NormalizedQuote {
  symbol: string;
  name?: string;
  currentPrice: number;
  change: number;
  changePercent: number;
  open?: number;
  high?: number;
  low?: number;
  volume?: number;
  amount?: number;
  marketCap?: number;
  pe?: number;
  pb?: number;
}

const API_BASE_URL = (import.meta.env.VITE_A_SHARE_API_BASE_URL as string | undefined)?.trim() || '';
const API_TOKEN = (import.meta.env.VITE_A_SHARE_API_TOKEN as string | undefined)?.trim() || '';
const API_TIMEOUT_MS = Number(import.meta.env.VITE_A_SHARE_API_TIMEOUT_MS || 6000);
const API_RETRY_COUNT = Number(import.meta.env.VITE_A_SHARE_API_RETRY_COUNT || 1);

const toNumber = (value: Primitive, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
};

const pick = <T = Primitive>(obj: GenericRecord, keys: string[], fallback?: T): T => {
  for (const key of keys) {
    if (key in obj) {
      return obj[key] as T;
    }
  }
  return fallback as T;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const requestJSON = async <T>(path: string, params?: Record<string, string>): Promise<T> => {
  if (!API_BASE_URL) {
    throw new Error('Missing VITE_A_SHARE_API_BASE_URL');
  }

  const url = new URL(path, API_BASE_URL.endsWith('/') ? API_BASE_URL : `${API_BASE_URL}/`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== '') url.searchParams.set(key, value);
    });
  }

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (API_TOKEN) {
    headers.Authorization = `Bearer ${API_TOKEN}`;
  }

  let lastError: unknown;

  for (let attempt = 0; attempt <= API_RETRY_COUNT; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

    try {
      const response = await fetch(url.toString(), { headers, signal: controller.signal });
      if (!response.ok) {
        throw new Error(`A-share API error ${response.status}`);
      }

      return response.json() as Promise<T>;
    } catch (error) {
      const isTimeout = error instanceof DOMException && error.name === 'AbortError';
      lastError = isTimeout ? new Error(`A-share API timeout after ${API_TIMEOUT_MS}ms`) : error;

      if (attempt < API_RETRY_COUNT) {
        await sleep(200 * (attempt + 1));
        continue;
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw lastError instanceof Error ? lastError : new Error('A-share API request failed');
};

const toTrendSeed = (price: number): number[] => Array.from({ length: 7 }, () => Number(price.toFixed(2)));

export const loadPortfolioFromTrades = async (): Promise<HoldingItem[]> => {
  const response = await fetch('/data/trades.json');
  if (!response.ok) {
    throw new Error(`Failed to load trades.json (${response.status})`);
  }

  const data = (await response.json()) as TradesFile;
  const trades = Array.isArray(data.trades) ? data.trades : [];

  const bySymbol = new Map<string, { symbol: string; name: string; shares: number; costAmount: number }>();

  trades.forEach((trade) => {
    const symbol = String(trade.symbol || '').trim();
    if (!symbol) return;

    const isBuy = String(trade.type || '').includes('买');
    const signedShares = toNumber(trade.shares) * (isBuy ? 1 : -1);
    const amount = toNumber(trade.amount);
    const fee = toNumber(trade.fee);

    const current = bySymbol.get(symbol) || {
      symbol,
      name: String(trade.name || symbol),
      shares: 0,
      costAmount: 0,
    };

    if (isBuy) {
      current.shares += signedShares;
      current.costAmount += amount + fee;
    } else {
      const sellShares = Math.abs(signedShares);
      const avgCost = current.shares > 0 ? current.costAmount / current.shares : 0;
      current.shares -= sellShares;
      current.costAmount = Math.max(0, current.costAmount - avgCost * sellShares);
    }

    if (current.shares < 0) current.shares = 0;
    bySymbol.set(symbol, current);
  });

  return Array.from(bySymbol.values())
    .filter((item) => item.shares > 0)
    .map((item) => {
      const cost = item.shares > 0 ? item.costAmount / item.shares : 0;
      const currentPrice = Number(cost.toFixed(2));
      const totalValue = currentPrice * item.shares;

      return {
        symbol: item.symbol,
        name: item.name,
        currentPrice,
        change: 0,
        changePercent: 0,
        shares: item.shares,
        cost: Number(cost.toFixed(2)),
        totalValue: Number(totalValue.toFixed(2)),
        profitLoss: Number((totalValue - item.costAmount).toFixed(2)),
        profitLossPercent: item.costAmount > 0 ? Number((((totalValue - item.costAmount) / item.costAmount) * 100).toFixed(2)) : 0,
        trendData: toTrendSeed(currentPrice),
      };
    });
};

const normalizeQuote = (raw: GenericRecord): NormalizedQuote => {
  const symbol = String(pick(raw, ['symbol', 'code', 'ts_code'], ''));
  const currentPrice = toNumber(pick(raw, ['currentPrice', 'lastPrice', 'price', 'close', 'last', 'trade']));
  const prevClose = toNumber(pick(raw, ['prevClose', 'preClose', 'prev_close', 'yesterdayClose']));
  const changeFromApi = toNumber(pick(raw, ['change', 'chg', 'priceChange']), Number.NaN);

  const change = Number.isFinite(changeFromApi)
    ? changeFromApi
    : (prevClose > 0 ? currentPrice - prevClose : 0);

  const changePercentFromApi = toNumber(pick(raw, ['changePercent', 'pctChg', 'pct', 'percent']), Number.NaN);
  const changePercent = Number.isFinite(changePercentFromApi)
    ? changePercentFromApi
    : (prevClose > 0 ? (change / prevClose) * 100 : 0);

  return {
    symbol,
    name: String(pick(raw, ['name', 'stockName'], symbol)),
    currentPrice,
    change,
    changePercent,
    open: toNumber(pick(raw, ['open'])),
    high: toNumber(pick(raw, ['high'])),
    low: toNumber(pick(raw, ['low'])),
    volume: toNumber(pick(raw, ['volume', 'vol'])),
    amount: toNumber(pick(raw, ['amount', 'turnover'])),
    marketCap: toNumber(pick(raw, ['marketCap', 'total_mv'])),
    pe: toNumber(pick(raw, ['pe', 'pe_ttm'])),
    pb: toNumber(pick(raw, ['pb'])),
  };
};

export const fetchAShareQuotes = async (symbols: string[]): Promise<Map<string, NormalizedQuote>> => {
  if (symbols.length === 0) return new Map();

  const response = await requestJSON<{ data?: GenericRecord[]; quotes?: GenericRecord[] }>('quotes', {
    symbols: symbols.join(','),
  });

  const rows = (response.data || response.quotes || []) as GenericRecord[];
  const result = new Map<string, NormalizedQuote>();

  rows.forEach((row) => {
    const normalized = normalizeQuote(row);
    if (!normalized.symbol || normalized.currentPrice <= 0) return;
    result.set(normalized.symbol, normalized);
  });

  return result;
};

export const applyQuotesToHoldings = (
  holdings: HoldingItem[],
  quotes: Map<string, NormalizedQuote>,
): HoldingItem[] => {
  return holdings.map((holding) => {
    const quote = quotes.get(holding.symbol);
    if (!quote) return holding;

    const currentPrice = quote.currentPrice;
    const totalValue = currentPrice * holding.shares;
    const totalCost = holding.cost * holding.shares;
    const profitLoss = totalValue - totalCost;
    const profitLossPercent = totalCost > 0 ? (profitLoss / totalCost) * 100 : 0;

    const trendData = [...holding.trendData, Number(currentPrice.toFixed(2))].slice(-14);

    return {
      ...holding,
      name: quote.name || holding.name,
      currentPrice: Number(currentPrice.toFixed(2)),
      change: Number(quote.change.toFixed(2)),
      changePercent: Number(quote.changePercent.toFixed(2)),
      totalValue: Number(totalValue.toFixed(2)),
      profitLoss: Number(profitLoss.toFixed(2)),
      profitLossPercent: Number(profitLossPercent.toFixed(2)),
      trendData,
      open: quote.open,
      high: quote.high,
      low: quote.low,
      volume: quote.volume,
      amount: quote.amount,
      marketCap: quote.marketCap,
      pe: quote.pe,
      pb: quote.pb,
    };
  });
};

const mapRangeToApi = (range: TimeRange): string => {
  switch (range) {
    case '1D':
      return '1d';
    case '1W':
      return '1w';
    case '1M':
      return '1m';
    case '3M':
      return '3m';
    case '1Y':
      return '1y';
    case 'YTD':
      return 'ytd';
    default:
      return '1m';
  }
};

export const fetchAShareChartData = async (
  range: TimeRange,
  symbol?: string | null,
): Promise<ChartData[]> => {
  const response = await requestJSON<{ data?: GenericRecord[]; points?: GenericRecord[] }>('chart', {
    range: mapRangeToApi(range),
    symbol: symbol || '',
  });

  const rows = (response.data || response.points || []) as GenericRecord[];
  if (rows.length === 0) return [];

  const closes = rows.map((row) => toNumber(pick(row, ['close', 'price', 'value', 'last']))).filter((x) => x > 0);
  const base = closes[0] || 1;

  return rows.map((row, index) => {
    const close = toNumber(pick(row, ['close', 'price', 'value', 'last']), base);
    const date = String(pick(row, ['date', 'time', 'timestamp'], new Date().toISOString()));
    const apiYieldRate = toNumber(pick(row, ['yieldRate']), Number.NaN);
    const yieldRate = Number.isFinite(apiYieldRate)
      ? apiYieldRate
      : ((close - base) / base) * 100;
    const apiYieldAmount = toNumber(pick(row, ['yieldAmount']), Number.NaN);
    const yieldAmount = Number.isFinite(apiYieldAmount)
      ? apiYieldAmount
      : 100000 * (yieldRate / 100);

    return {
      date,
      yieldRate: Number(yieldRate.toFixed(2)),
      yieldAmount: Number(yieldAmount.toFixed(2)),
      _idx: index,
    };
  })
    .sort((a, b) => (a.date > b.date ? 1 : -1))
    .map(({ _idx, ...item }) => item);
};

export const fetchAShareNews = async (): Promise<NewsItem[]> => {
  const response = await requestJSON<{ data?: GenericRecord[]; news?: GenericRecord[] }>('news');
  const rows = (response.data || response.news || []) as GenericRecord[];

  return rows.map((row, index) => ({
    id: String(pick(row, ['id'], `news-${index}`)),
    title: String(pick(row, ['title'], '')),
    summary: String(pick(row, ['summary', 'content'], '')),
    source: String(pick(row, ['source'], '未知来源')),
    publishTime: String(pick(row, ['publishTime', 'time'], '刚刚')),
    relatedSymbols: Array.isArray(row.relatedSymbols)
      ? (row.relatedSymbols as string[])
      : undefined,
    sentiment: (String(pick(row, ['sentiment'], 'neutral')) as NewsItem['sentiment']) || 'neutral',
    category: (String(pick(row, ['category'], 'market')) as NewsItem['category']) || 'market',
    detailUrl: String(pick(row, ['detailUrl', 'url'], '')) || undefined,
    isExpanded: false,
  }));
};

export const fetchAShareIndustries = async (): Promise<IndustryData[]> => {
  const response = await requestJSON<{ data?: GenericRecord[]; industries?: GenericRecord[] }>('industries');
  const rows = (response.data || response.industries || []) as GenericRecord[];

  return rows.map((row) => ({
    name: String(pick(row, ['name'], '未知行业')),
    changePercent: toNumber(pick(row, ['changePercent', 'pctChg'])),
    change: toNumber(pick(row, ['change'])),
    amount: toNumber(pick(row, ['amount', 'turnover'])),
    leadingStock: String(pick(row, ['leadingStock', 'leader'], '--')),
    leadingStockChange: toNumber(pick(row, ['leadingStockChange', 'leaderChange'])),
  }));
};
