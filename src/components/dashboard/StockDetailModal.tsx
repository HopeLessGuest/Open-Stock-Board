// 股票详情弹窗组件 - 显示股票详细信息和K线图

import { useEffect } from 'react';
import { useStockStore } from '@/store/useStore';
import {
  X,
  TrendingUp,
  TrendingDown,
  BarChart2,
  Building2,
  PieChart,
  Activity,
} from 'lucide-react';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { CandlestickData } from '@/types';

const buildCandlestickFromTrend = (trendData: number[]): CandlestickData[] => {
  if (trendData.length === 0) return [];

  const today = new Date();
  return trendData.map((close, idx) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (trendData.length - 1 - idx));
    const open = idx > 0 ? trendData[idx - 1] : close;
    const high = Math.max(open, close) * 1.01;
    const low = Math.min(open, close) * 0.99;

    return {
      date: date.toISOString(),
      open: Number(open.toFixed(2)),
      close: Number(close.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
    };
  });
};

// 统计卡片组件
const StatCard = ({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: typeof BarChart2;
}) => (
  <div className="p-3 bg-slate-50 rounded-xl">
    <div className="flex items-center gap-2 mb-1">
      <Icon className="w-3.5 h-3.5 text-slate-400" />
      <span className="text-xs text-slate-500">{label}</span>
    </div>
    <div className="text-lg font-semibold text-slate-900">{value}</div>
  </div>
);

// K线图组件
const CandlestickChart = ({ data }: { data: CandlestickData[] }) => {
  // 将K线数据转换为组合图表数据
  const chartData = data.map((item) => ({
    date: item.date,
    // 柱状图显示涨跌
    bar: item.close - item.open,
    // 上下影线
    shadowHigh: item.high - Math.max(item.open, item.close),
    shadowLow: Math.min(item.open, item.close) - item.low,
    // 开盘收盘
    open: item.open,
    close: item.close,
    high: item.high,
    low: item.low,
    isUp: item.close >= item.open,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: '#94A3B8' }}
          tickLine={false}
          axisLine={{ stroke: '#E2E8F0' }}
          tickFormatter={(value) => {
            const date = new Date(value);
            return `${date.getMonth() + 1}/${date.getDate()}`;
          }}
          interval={Math.floor(data.length / 6)}
        />
        <YAxis
          tick={{ fontSize: 10, fill: '#94A3B8' }}
          tickLine={false}
          axisLine={false}
          domain={['auto', 'auto']}
          tickFormatter={(value) => `¥${value}`}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const item = payload[0].payload;
              return (
                <div className="bg-slate-900 text-white p-3 rounded-lg shadow-lg text-xs">
                  <p className="font-medium mb-1">{item.date}</p>
                  <p>开盘: ¥{item.open.toFixed(2)}</p>
                  <p>收盘: ¥{item.close.toFixed(2)}</p>
                  <p>最高: ¥{item.high.toFixed(2)}</p>
                  <p>最低: ¥{item.low.toFixed(2)}</p>
                </div>
              );
            }
            return null;
          }}
        />
        {/* 上下影线 */}
        <Bar
          dataKey="shadowHigh"
          stackId="shadow"
          fill="transparent"
          stroke={undefined}
        />
        <Bar
          dataKey="shadowLow"
          stackId="shadow"
          fill="transparent"
          stroke={undefined}
        />
        {/* K线实体 */}
        <Bar
          dataKey="bar"
          stackId="candle"
          fill={(props: { payload: { isUp: boolean } }) =>
            props.payload.isUp ? '#10B981' : '#EF4444'
          }
        />
        {/* 价格走势线 */}
        <Line
          type="monotone"
          dataKey="close"
          stroke="#0F172A"
          strokeWidth={1.5}
          dot={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
};

// 主弹窗组件
export const StockDetailModal = () => {
  const { isDetailModalOpen, closeDetailModal, selectedStock, holdings } = useStockStore();

  const stockData = selectedStock
    ? holdings.find((item) => item.symbol === selectedStock) || null
    : null;
  const candlestickData = stockData ? buildCandlestickFromTrend(stockData.trendData) : [];

  // 关闭弹窗的键盘事件
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeDetailModal();
      }
    };

    if (isDetailModalOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // 防止背景滚动
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isDetailModalOpen, closeDetailModal]);

  if (!isDetailModalOpen || !stockData) return null;

  const isPositive = stockData.change >= 0;

  return (
    // 背景遮罩
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm"
      onClick={closeDetailModal}
    >
      {/* 弹窗主体 */}
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
              <Building2 className="w-6 h-6 text-slate-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {stockData.name}
              </h2>
              <span className="text-sm text-slate-400">{stockData.symbol}</span>
            </div>
          </div>
          <button
            onClick={closeDetailModal}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* 内容区域 */}
        <div className="p-5 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* 价格信息 */}
          <div className="flex items-baseline gap-4 mb-6">
            <span className="text-4xl font-bold text-slate-900">
              ¥{stockData.currentPrice.toFixed(2)}
            </span>
            <span
              className={`flex items-center gap-1 text-lg font-medium ${
                isPositive ? 'text-emerald-500' : 'text-red-500'
              }`}
            >
              {isPositive ? (
                <TrendingUp className="w-5 h-5" />
              ) : (
                <TrendingDown className="w-5 h-5" />
              )}
              {isPositive ? '+' : ''}
              {stockData.change.toFixed(2)} ({stockData.changePercent.toFixed(2)}%)
            </span>
          </div>

          {/* K线图 */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              近期走势
            </h3>
            <div className="bg-slate-50 rounded-xl p-4">
              <CandlestickChart data={candlestickData} />
            </div>
          </div>

          {/* 关键指标 */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
              <PieChart className="w-4 h-4" />
              关键指标
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard
                label="开盘"
                value={`¥${(stockData.open ?? stockData.currentPrice).toFixed(2)}`}
                icon={BarChart2}
              />
              <StatCard
                label="最高"
                value={`¥${(stockData.high ?? stockData.currentPrice).toFixed(2)}`}
                icon={TrendingUp}
              />
              <StatCard
                label="最低"
                value={`¥${(stockData.low ?? stockData.currentPrice).toFixed(2)}`}
                icon={TrendingDown}
              />
              <StatCard
                label="成交量"
                value={`${(((stockData.volume ?? 0) / 10000)).toFixed(2)}万`}
                icon={Activity}
              />
              <StatCard
                label="总市值"
                value={`${(((stockData.marketCap ?? 0) / 100000000)).toFixed(2)}亿`}
                icon={PieChart}
              />
              <StatCard
                label="市盈率"
                value={(stockData.pe ?? 0).toFixed(2)}
                icon={BarChart2}
              />
              <StatCard
                label="市净率"
                value={(stockData.pb ?? 0).toFixed(2)}
                icon={PieChart}
              />
              <StatCard
                label="成交额"
                value={`${(((stockData.amount ?? 0) / 100000000)).toFixed(2)}亿`}
                icon={Activity}
              />
            </div>
          </div>

          {/* 持仓信息 */}
          <div>
            <h3 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              持仓信息
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard
                label="持仓数量"
                value={`${stockData.shares}股`}
                icon={BarChart2}
              />
              <StatCard
                label="持仓成本"
                value={`¥${stockData.cost.toFixed(2)}`}
                icon={BarChart2}
              />
              <StatCard
                label="当前市值"
                value={`¥${stockData.totalValue.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}`}
                icon={PieChart}
              />
              <StatCard
                label="持仓盈亏"
                value={`${stockData.profitLoss >= 0 ? '+' : ''}¥${stockData.profitLoss.toFixed(2)}`}
                icon={stockData.profitLoss >= 0 ? TrendingUp : TrendingDown}
              />
            </div>
          </div>
        </div>

        {/* 底部操作栏 */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            onClick={closeDetailModal}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            关闭
          </button>
          <button className="px-4 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors">
            添加到自选
          </button>
        </div>
      </div>
    </div>
  );
};

export default StockDetailModal;
