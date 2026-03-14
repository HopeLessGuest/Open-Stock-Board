// 市场概览面板组件 - 显示行业热力图和市场动态

import { useStockStore } from '@/store/useStore';
import { TrendingUp, TrendingDown, BarChart2, Flame, Loader2, DatabaseZap } from 'lucide-react';
import type { IndustryData } from '@/types';

// 行业热力图块组件
const IndustryBlock = ({ industry }: { industry: IndustryData }) => {
  const isPositive = industry.changePercent >= 0;
  const intensity = Math.min(Math.abs(industry.changePercent) / 3, 1); // 归一化强度

  // 根据涨跌动态调整颜色
  const bgColor = isPositive
    ? `rgba(16, 185, 129, ${0.1 + intensity * 0.3})` // 绿色
    : `rgba(239, 68, 68, ${0.1 + intensity * 0.3})`; // 红色

  const textColor = isPositive ? 'text-emerald-600' : 'text-red-600';

  return (
    <div
      className="w-[124px] p-3 rounded-xl cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-md"
      style={{ backgroundColor: bgColor }}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-slate-900">
          {industry.name}
        </span>
        {isPositive ? (
          <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
        ) : (
          <TrendingDown className="w-3.5 h-3.5 text-red-500" />
        )}
      </div>
      <div className={`text-lg font-bold ${textColor}`}>
        {isPositive ? '+' : ''}
        {industry.changePercent.toFixed(2)}%
      </div>
      <div className="mt-2 pt-2 border-t border-white/30">
        <div className="text-xs text-slate-600">
          <span className="font-medium">{industry.leadingStock}</span>
        </div>
        <div className={`text-xs ${textColor}`}>
          {isPositive ? '+' : ''}
          {industry.leadingStockChange.toFixed(2)}%
        </div>
      </div>
    </div>
  );
};

// 市场动态卡片组件
const MarketStatCard = ({
  label,
  value,
  change,
  icon: Icon,
}: {
  label: string;
  value: string;
  change: number;
  icon: typeof BarChart2;
}) => {
  const isPositive = change >= 0;

  return (
    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
      <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
        <Icon className="w-5 h-5 text-slate-600" />
      </div>
      <div className="flex-1">
        <span className="text-xs text-slate-500">{label}</span>
        <div className="mt-0.5">
          <span className="text-lg font-semibold text-slate-900">{value}</span>
          <div
            className={`text-xs font-medium mt-0.5 ${
              isPositive ? 'text-emerald-500' : 'text-red-500'
            }`}
          >
            {isPositive ? '+' : ''}
            {change.toFixed(2)}%
          </div>
        </div>
      </div>
    </div>
  );
};

// 主面板组件
export const MarketOverviewPanel = () => {
  const { industries, isIndustriesLoading } = useStockStore();
  const industryCount = industries.length;

  // 计算市场总体情况
  const avgChange = industryCount > 0
    ? industries.reduce((sum, ind) => sum + ind.changePercent, 0) / industryCount
    : 0;
  const totalAmount = industries.reduce((sum, ind) => sum + ind.amount, 0);
  const upCount = industries.filter((ind) => ind.changePercent > 0).length;
  const downCount = industries.filter((ind) => ind.changePercent < 0).length;
  const upDownRatio = industryCount > 0 ? ((upCount - downCount) / industryCount) * 100 : 0;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
      {/* 标题区域 */}
      <div className="p-4 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-slate-700" />
            <h2 className="text-lg font-semibold text-slate-900">市场概览</h2>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded-md font-medium">
              上涨 {upCount}
            </span>
            <span className="px-2 py-1 bg-red-50 text-red-600 rounded-md font-medium">
              下跌 {downCount}
            </span>
          </div>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="p-4">
        {isIndustriesLoading ? (
          <div className="space-y-4 animate-pulse">
            <div className="flex items-center gap-2 text-slate-500 text-xs">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              正在加载市场数据...
            </div>
            <div className="grid grid-cols-3 gap-3">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div key={`market-stat-loading-${idx}`} className="h-24 rounded-xl bg-slate-100" />
              ))}
            </div>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={`industry-loading-${idx}`} className="h-20 rounded-xl bg-slate-100" />
              ))}
            </div>
          </div>
        ) : industryCount === 0 ? (
          <div className="min-h-44 rounded-xl border border-dashed border-slate-300 bg-slate-50/70 flex items-center justify-center">
            <div className="text-center px-6">
              <DatabaseZap className="w-7 h-7 mx-auto text-slate-400 mb-2" />
              <p className="text-sm font-medium text-slate-600">暂无可计算的市场数据</p>
              <p className="text-xs text-slate-400 mt-1">请先添加持仓或等待行情刷新后自动生成</p>
            </div>
          </div>
        ) : (
          <>
        {/* 市场统计 */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <MarketStatCard
            label="市场涨跌"
            value={avgChange >= 0 ? '偏多' : '偏空'}
            change={avgChange}
            icon={BarChart2}
          />
          <MarketStatCard
            label="成交额"
            value={`${(totalAmount / 100).toFixed(1)}百亿`}
            change={1.25}
            icon={BarChart2}
          />
          <MarketStatCard
            label="行业涨跌比"
            value={`${upCount}:${downCount}`}
            change={upDownRatio}
            icon={BarChart2}
          />
        </div>

        {/* 行业热力图 */}
        <div>
          <h3 className="text-sm font-medium text-slate-700 mb-3">行业热力图</h3>
          <div className="flex flex-wrap justify-center gap-2">
            {industries.map((industry) => (
              <IndustryBlock key={industry.name} industry={industry} />
            ))}
          </div>
        </div>

        {/* 图例说明 */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-emerald-400" />
            <span className="text-xs text-slate-500">涨幅越大越绿</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-red-400" />
            <span className="text-xs text-slate-500">跌幅越大越红</span>
          </div>
        </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MarketOverviewPanel;
