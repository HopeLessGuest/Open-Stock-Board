import { Info, PieChart, Newspaper, TrendingUp } from 'lucide-react';

const sampleHoldings = [
  { symbol: '600519', name: '贵州茅台', price: 1685.6, changePercent: 1.56, shares: 100 },
  { symbol: '300750', name: '宁德时代', price: 185.6, changePercent: 1.92, shares: 200 },
  { symbol: '600036', name: '招商银行', price: 36.26, changePercent: 4.26, shares: 800 },
];

const sampleNews = [
  'A股三大指数集体收涨，科技板块领涨',
  '新能源产业链景气度回升，资金回流明显',
  '银行板块估值修复，红利策略持续受关注',
];

export const SampleDashboard = () => {
  const totalValue = sampleHoldings.reduce((sum, item) => sum + item.price * item.shares, 0);

  return (
    <div className="h-full rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-6 overflow-y-auto scrollbar-thin soft-scrollbar">
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800">
        <Info className="w-5 h-5 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold">当前未检测到持仓数据，正在展示样例看板</p>
          <p className="text-xs mt-1 text-amber-700">
            请在 public/data/trades.json 中维护你的真实交易记录，或确保后端持仓接口可用。
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-5">
        <section className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <PieChart className="w-4 h-4 text-slate-600" />
            样例持仓
          </h3>
          <div className="mt-3 space-y-2">
            {sampleHoldings.map((item) => (
              <div key={item.symbol} className="rounded-lg border border-slate-100 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{item.name}</p>
                    <p className="text-xs text-slate-400">{item.symbol}</p>
                  </div>
                  <p className={`text-xs font-semibold ${item.changePercent >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {item.changePercent >= 0 ? '+' : ''}{item.changePercent.toFixed(2)}%
                  </p>
                </div>
                <p className="mt-2 text-lg font-bold text-slate-900">¥{item.price.toFixed(2)}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-slate-600" />
            样例资产概况
          </h3>
          <div className="mt-3 space-y-3">
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs text-slate-500">总市值</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                ¥{totalValue.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div className="rounded-lg bg-emerald-50 p-3">
              <p className="text-xs text-emerald-600">总盈亏（样例）</p>
              <p className="text-xl font-bold text-emerald-700 mt-1">+¥28,560 (+6.92%)</p>
            </div>
          </div>
        </section>

        <section className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <Newspaper className="w-4 h-4 text-slate-600" />
            样例新闻
          </h3>
          <div className="mt-3 space-y-2">
            {sampleNews.map((title, idx) => (
              <div key={title} className="rounded-lg border border-slate-100 p-3">
                <p className="text-xs text-slate-400 mb-1">资讯 {idx + 1}</p>
                <p className="text-sm text-slate-700 leading-relaxed">{title}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default SampleDashboard;