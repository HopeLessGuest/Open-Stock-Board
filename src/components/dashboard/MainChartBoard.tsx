// 中间主看板组件 - 可切换收益率/收益额的图表展示

import { useStockStore } from '@/store/useStore';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, TrendingDown, Percent, DollarSign, DatabaseZap, Loader2 } from 'lucide-react';
import type { ViewMode, TimeRange } from '@/types';

// 时间范围选项
const timeRanges: TimeRange[] = ['1D', '1W', '1M', '3M', '1Y', 'YTD'];

const formatAxisLabel = (value: string, range: TimeRange) => {
  const date = new Date(value);
  if (range === '1D') {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  }
  if (range === '1W') {
    return `${date.getMonth() + 1}/${date.getDate()} ${date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
  }
  return `${date.getMonth() + 1}/${date.getDate()}`;
};

const formatTooltipLabel = (value: string, range: TimeRange) => {
  const date = new Date(value);
  if (range === '1D' || range === '1W') {
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  return date.toLocaleDateString('zh-CN');
};

// 视图模式按钮组件
const ViewModeButton = ({
  mode,
  isActive,
  onClick,
  icon: Icon,
  label,
}: {
  mode: ViewMode;
  isActive: boolean;
  onClick: () => void;
  icon: typeof Percent;
  label: string;
}) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
      isActive
        ? 'bg-slate-900 text-white shadow-md'
        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
    }`}
  >
    <Icon className="w-4 h-4" />
    {label}
  </button>
);

// 时间范围按钮组件
const TimeRangeButton = ({
  range,
  isActive,
  onClick,
}: {
  range: TimeRange;
  isActive: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`px-3 py-1 rounded-lg text-sm font-medium transition-all duration-200 ${
      isActive
        ? 'bg-slate-100 text-slate-900'
        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
    }`}
  >
    {range}
  </button>
);

// 自定义Tooltip组件
const CustomTooltip = ({
  active,
  payload,
  label,
  viewMode,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
  viewMode: ViewMode;
}) => {
  if (active && payload && payload.length && payload[0]?.value !== undefined) {
    const value = payload[0].value;
    return (
      <div className="bg-slate-900 text-white p-3 rounded-lg shadow-lg">
        <p className="text-xs text-slate-300 mb-1">{label}</p>
        <p className="text-lg font-bold">
          {viewMode === 'rate' ? (
            <>
              {value >= 0 ? '+' : ''}
              {typeof value === 'number' ? value.toFixed(2) : '0.00'}%
            </>
          ) : (
            <>
              ¥{value >= 0 ? '+' : ''}
              {typeof value === 'number' ? value.toLocaleString('zh-CN', { maximumFractionDigits: 0 }) : '0'}
            </>
          )}
        </p>
      </div>
    );
  }
  return null;
};

// 主图表板组件
export const MainChartBoard = () => {
  const {
    holdings,
    selectedStock,
    viewMode,
    timeRange,
    chartData,
    isLoading,
    isChartLoading,
    isInitialChartLoading,
    isBackendConnected,
    setViewMode,
    setTimeRange,
  } = useStockStore();

  // 获取当前选中的股票数据
  const currentStock = holdings.find((h) => h.symbol === selectedStock);
  const isAllView = !currentStock;

  const totalValue = holdings.reduce((sum, h) => sum + h.totalValue, 0);
  const totalCost = holdings.reduce((sum, h) => sum + h.cost * h.shares, 0);
  const totalProfitLoss = totalValue - totalCost;
  const totalProfitLossPercent = totalCost > 0 ? (totalProfitLoss / totalCost) * 100 : 0;

  const title = isAllView ? '全部持仓' : currentStock.name;
  const symbolText = isAllView ? `${holdings.length}只股票` : currentStock.symbol;
  const headlineValue = isAllView ? totalValue : currentStock.currentPrice;
  const changeValue = isAllView ? totalProfitLoss : currentStock.change;
  const changePercent = isAllView ? totalProfitLossPercent : currentStock.changePercent;
  const positionValue = isAllView ? totalValue : currentStock.totalValue;
  const positionProfitLoss = isAllView ? totalProfitLoss : currentStock.profitLoss;
  const positionProfitLossPercent = isAllView ? totalProfitLossPercent : currentStock.profitLossPercent;
  const isPositive = changeValue >= 0;
  const valueLabel = isAllView ? '总市值' : '持仓市值';
  const shouldShowChartSkeleton = isInitialChartLoading || ((isLoading || isChartLoading) && chartData.length === 0);

  return (
    <div className="h-full flex flex-col bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      {/* 头部信息 */}
      <div className="px-5 py-3 border-b border-slate-100">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-2xl font-bold text-slate-900">
                {title}
              </h2>
              <span className="text-sm text-slate-400">{symbolText}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-900">
                ¥{headlineValue.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}
              </span>
              <span
                className={`flex items-center gap-0.5 text-lg font-medium ${
                  isPositive ? 'text-emerald-500' : 'text-red-500'
                }`}
              >
                {isPositive ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                {isPositive ? '+' : ''}
                {changeValue.toLocaleString('zh-CN', { maximumFractionDigits: 2 })} ({changePercent.toFixed(2)}%)
              </span>
            </div>
          </div>

          {/* 持仓信息 */}
          <div className="text-right">
            <span className="text-xs text-slate-500">{valueLabel}</span>
            <div className="text-lg font-semibold text-slate-900">
              ¥{positionValue.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}
            </div>
            <span
              className={`text-sm ${
                positionProfitLoss >= 0 ? 'text-emerald-500' : 'text-red-500'
              }`}
            >
              {positionProfitLoss >= 0 ? '+' : ''}¥
              {positionProfitLoss.toFixed(2)} (
              {positionProfitLossPercent.toFixed(2)}%)
            </span>
          </div>
        </div>

        {/* 视图模式切换 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <ViewModeButton
              mode="rate"
              isActive={viewMode === 'rate'}
              onClick={() => setViewMode('rate')}
              icon={Percent}
              label="收益率"
            />
            <ViewModeButton
              mode="amount"
              isActive={viewMode === 'amount'}
              onClick={() => setViewMode('amount')}
              icon={DollarSign}
              label="收益额"
            />
          </div>

          {/* 时间范围选择 */}
          <div className="flex items-center gap-1">
            {timeRanges.map((range) => (
              <TimeRangeButton
                key={range}
                range={range}
                isActive={timeRange === range}
                onClick={() => setTimeRange(range)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* 图表区域 */}
      <div className="flex-1 min-h-[208px] lg:min-h-[240px] p-5">
        {shouldShowChartSkeleton ? (
          <div className="h-full min-h-[176px] lg:min-h-[208px] rounded-xl border border-slate-100 bg-slate-50 p-4 animate-pulse">
            <div className="flex items-center gap-2 text-slate-500 text-sm mb-4">
              <Loader2 className="w-4 h-4 animate-spin" />
              正在加载图表数据...
            </div>
            <div className="h-full flex flex-col justify-end gap-3">
              <div className="h-16 bg-slate-200/70 rounded-lg" />
              <div className="h-20 bg-slate-200/70 rounded-lg" />
              <div className="h-24 bg-slate-200/70 rounded-lg" />
            </div>
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-full min-h-[176px] lg:min-h-[208px] rounded-xl border border-dashed border-slate-300 bg-slate-50/60 flex items-center justify-center">
            <div className="text-center px-6">
              <DatabaseZap className="w-8 h-8 mx-auto text-slate-400 mb-3" />
              <p className="text-sm font-medium text-slate-600">{isBackendConnected ? '暂无图表数据' : '未连接数据'}</p>
              <p className="text-xs text-slate-400 mt-1">
                {isBackendConnected ? '请切换时间范围或稍后重试' : '请确认后端服务和数据接口已启动'}
              </p>
            </div>
          </div>
        ) : (
          <div className="h-full relative">
            {isChartLoading && (
              <div className="absolute right-2 top-0 z-10 inline-flex items-center gap-1 rounded-md bg-white/90 px-2 py-1 text-xs text-slate-500 shadow-sm">
                <Loader2 className="w-3 h-3 animate-spin" />
                更新中
              </div>
            )}
            <ResponsiveContainer width="100%" height="100%">
              {viewMode === 'rate' ? (
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: '#94A3B8' }}
                tickLine={false}
                axisLine={{ stroke: '#E2E8F0' }}
                minTickGap={20}
                tickFormatter={(value) => formatAxisLabel(value, timeRange)}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#94A3B8' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}%`}
                domain={['auto', 'auto']}
              />
              <Tooltip
                content={<CustomTooltip viewMode={viewMode} />}
                isAnimationActive={false}
                formatter={(value: number) => [
                  `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`,
                  '收益率',
                ]}
                labelFormatter={(label) => formatTooltipLabel(label, timeRange)}
              />
              <Line
                type="monotone"
                dataKey="yieldRate"
                stroke={isPositive ? '#10B981' : '#EF4444'}
                strokeWidth={2}
                isAnimationActive={false}
                dot={false}
                activeDot={{ r: 4, fill: isPositive ? '#10B981' : '#EF4444' }}
              />
            </LineChart>
              ) : (
            <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="colorYieldAmount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0F172A" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#0F172A" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: '#94A3B8' }}
                tickLine={false}
                axisLine={{ stroke: '#E2E8F0' }}
                minTickGap={20}
                tickFormatter={(value) => formatAxisLabel(value, timeRange)}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#94A3B8' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `¥${(value / 1000).toFixed(0)}k`}
                domain={['auto', 'auto']}
              />
              <Tooltip
                content={<CustomTooltip viewMode={viewMode} />}
                isAnimationActive={false}
                formatter={(value: number) => [
                  `¥${value.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}`,
                  '收益额',
                ]}
                labelFormatter={(label) => formatTooltipLabel(label, timeRange)}
              />
              <Area
                type="monotone"
                dataKey="yieldAmount"
                stroke="#0F172A"
                strokeWidth={2}
                isAnimationActive={false}
                fill="url(#colorYieldAmount)"
              />
            </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};

export default MainChartBoard;
