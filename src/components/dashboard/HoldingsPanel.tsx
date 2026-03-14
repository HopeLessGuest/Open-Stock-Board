// 左侧持仓面板组件 - 显示持仓列表和实时数据追踪

import { useStockStore } from '@/store/useStore';
import { TrendingUp, TrendingDown, BarChart3, DatabaseZap } from 'lucide-react';

// MiniSparkline组件 - 小型折线图
const MiniSparkline = ({ data, isPositive }: { data: number[]; isPositive: boolean }) => {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * 100;
      const y = 100 - ((value - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg
      viewBox="0 0 100 50"
      className="w-20 h-8"
      preserveAspectRatio="none"
    >
      <polyline
        points={points}
        fill="none"
        stroke={isPositive ? '#10B981' : '#EF4444'}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

// 持仓列表项组件
const HoldingItem = ({
  holding,
  isSelected,
  onClick,
}: {
  holding: {
    symbol: string;
    name: string;
    currentPrice: number;
    change: number;
    changePercent: number;
    totalValue: number;
    profitLoss: number;
    profitLossPercent: number;
    trendData: number[];
  };
  isSelected: boolean;
  onClick: () => void;
}) => {
  const isPositive = holding.change >= 0;

  return (
    <button
      onClick={onClick}
      className={`w-full p-3 rounded-lg transition-all duration-200 text-left group ${
        isSelected
          ? 'bg-slate-100 border border-slate-300 shadow-md ring-1 ring-slate-200'
          : 'hover:bg-slate-50 border border-transparent hover:border-slate-200'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-slate-900">
              {holding.name}
            </span>
            <span className="text-xs text-slate-400">{holding.symbol}</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {isPositive ? (
            <TrendingUp className="w-3 h-3 text-emerald-500" />
          ) : (
            <TrendingDown className="w-3 h-3 text-red-500" />
          )}
          <span
            className={`text-xs font-medium ${
              isPositive ? 'text-emerald-500' : 'text-red-500'
            }`}
          >
            {isPositive ? '+' : ''}
            {holding.changePercent.toFixed(2)}%
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-lg font-bold text-slate-900">
            ¥{holding.currentPrice.toFixed(2)}
          </span>
          <span
            className={`text-xs ${
              holding.profitLoss >= 0 ? 'text-emerald-500' : 'text-red-500'
            }`}
          >
            {holding.profitLoss >= 0 ? '+' : ''}¥
            {holding.profitLoss.toFixed(2)}
          </span>
        </div>
        <MiniSparkline data={holding.trendData} isPositive={isPositive} />
      </div>
    </button>
  );
};

// 主面板组件
export const HoldingsPanel = () => {
  const {
    holdings,
    selectedStock,
    setSelectedStock,
    isQuotesLoading,
    isBackendConnected,
  } = useStockStore();

  const handleStockClick = (symbol: string) => {
    setSelectedStock(symbol);
  };

  const handleAllDataClick = () => {
    setSelectedStock(null);
  };

  // 计算总市值和总盈亏
  const totalValue = holdings.reduce((sum, h) => sum + h.totalValue, 0);
  const totalCost = holdings.reduce((sum, h) => sum + h.cost, 0);
  const totalProfitLoss = totalValue - totalCost;
  const totalProfitLossPercent = totalCost > 0 ? (totalProfitLoss / totalCost) * 100 : 0;
  const isPositiveTotal = totalProfitLoss >= 0;
  const absTotalProfitLoss = Math.abs(totalProfitLoss);
  const absTotalProfitLossPercent = Math.abs(totalProfitLossPercent);

  return (
    <div className="h-full flex flex-col bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      {/* 标题区域 */}
      <div className="p-4 border-b border-slate-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-slate-700" />
            <h2 className="text-lg font-semibold text-slate-900">持仓列表</h2>
          </div>
        </div>

        {/* 总览统计 */}
        <button
          type="button"
          onClick={handleAllDataClick}
          className={`w-full text-left p-3 rounded-xl transition-all duration-200 border ${
            selectedStock === null
              ? 'bg-slate-100 border-slate-300 ring-2 ring-slate-200 shadow-sm'
              : 'bg-slate-50 border-transparent hover:bg-slate-100/80 hover:border-slate-200'
          }`}
          title="切换到全量数据"
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-xs text-slate-500">总市值</span>
              <div className="text-lg font-bold text-slate-900">
                ¥{totalValue.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}
              </div>
            </div>
            <div>
              <span className="text-xs text-slate-500">总盈亏</span>
              <div
                className={`font-bold ${
                  isPositiveTotal ? 'text-emerald-500' : 'text-red-500'
                }`}
              >
                <div className="text-lg leading-tight whitespace-nowrap">
                  {isPositiveTotal ? '+' : '-'}¥
                  {absTotalProfitLoss.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}
                </div>
                <div className="text-xs leading-tight mt-0.5">
                  ({isPositiveTotal ? '+' : '-'}
                  {absTotalProfitLossPercent.toFixed(2)}%)
                </div>
              </div>
            </div>
          </div>
        </button>
      </div>

      {/* 持仓列表 */}
      <div className={`flex-1 min-h-0 overflow-y-auto p-3 space-y-2 scrollbar-thin soft-scrollbar ${isQuotesLoading ? 'animate-pulse' : ''}`}>
        {holdings.length > 0 ? (
          holdings.map((holding) => (
            <HoldingItem
              key={holding.symbol}
              holding={holding}
              isSelected={selectedStock === holding.symbol}
              onClick={() => handleStockClick(holding.symbol)}
            />
          ))
        ) : (
          <div className="h-full min-h-32 rounded-xl border border-dashed border-slate-300 bg-slate-50/70 flex items-center justify-center">
            <div className="text-center px-4">
              <DatabaseZap className="w-6 h-6 mx-auto text-slate-400 mb-2" />
              <p className="text-sm font-medium text-slate-600">{isBackendConnected ? '暂无持仓数据' : '未连接数据'}</p>
              <p className="text-xs text-slate-400 mt-1">
                {isBackendConnected ? '请检查 trades.json 交易记录' : '请确认 quotes 接口是否可用'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 底部提示 */}
      <div className="p-3 border-t border-slate-100">
        <p className="text-xs text-slate-400 text-center">
          点击股票查看详情 · 数据每3秒刷新
        </p>
      </div>
    </div>
  );
};

export default HoldingsPanel;
