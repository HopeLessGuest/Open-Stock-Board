// 股票数据类型定义

// K线数据
export interface CandlestickData {
  // 日期
  date: string;
  // 开盘价
  open: number;
  // 收盘价
  close: number;
  // 最高价
  high: number;
  // 最低价
  low: number;
}

// 新闻项类型
export interface NewsItem {
  // 新闻ID
  id: string;
  // 标题
  title: string;
  // 摘要
  summary: string;
  // 来源
  source: string;
  // 发布时间
  publishTime: string;
  // 相关股票代码
  relatedSymbols?: string[];
  // 情绪标签
  sentiment: 'bullish' | 'bearish' | 'neutral';
  // 分类
  category: 'world' | 'company' | 'industry';
  // 行业标签
  industry?: string;
  // 详情链接
  detailUrl?: string;
  // 是否已展开
  isExpanded?: boolean;
}

// 行业数据类型
export interface IndustryData {
  // 行业名称
  name: string;
  // 涨跌幅
  changePercent: number;
  // 涨跌额
  change: number;
  // 成交额
  amount: number;
  // 领涨股票
  leadingStock: string;
  // 领涨股票涨跌幅
  leadingStockChange: number;
}

// 视图模式类型
export type ViewMode = 'rate' | 'amount';

// 时间范围类型
export type TimeRange = '1D' | '1W' | '1M' | '3M' | '1Y' | 'YTD';

// 图表数据类型
export interface ChartData {
  // 日期
  date: string;
  // 收益率
  yieldRate: number;
  // 收益额
  yieldAmount: number;
}

// 持仓列表项
export interface HoldingItem {
  // 股票代码
  symbol: string;
  // 股票名称
  name: string;
  // 当前价格
  currentPrice: number;
  // 涨跌额
  change: number;
  // 涨跌幅
  changePercent: number;
  // 持仓数量
  shares: number;
  // 持仓成本
  cost: number;
  // 当前市值
  totalValue: number;
  // 盈亏金额
  profitLoss: number;
  // 盈亏比例
  profitLossPercent: number;
  // 7日趋势数据
  trendData: number[];
  // 开盘价
  open?: number;
  // 最高价
  high?: number;
  // 最低价
  low?: number;
  // 成交量
  volume?: number;
  // 成交额
  amount?: number;
  // 总市值
  marketCap?: number;
  // 市盈率
  pe?: number;
  // 市净率
  pb?: number;
}
