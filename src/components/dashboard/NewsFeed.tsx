// 右侧新闻面板组件 - 显示实时金融新闻和公司新闻

import { useStockStore } from '@/store/useStore';
import { useState, type MouseEvent } from 'react';
import { Newspaper, TrendingUp, Building2, LineChart, ChevronDown, ChevronUp, Loader2, DatabaseZap } from 'lucide-react';
import type { NewsItem } from '@/types';

// 新闻分类标签
const categoryIcons = {
  market: LineChart,
  company: Building2,
  economy: TrendingUp,
  industry: TrendingUp,
};

const categoryLabels = {
  market: '市场',
  company: '公司',
  economy: '宏观',
  industry: '行业',
};

// 情绪标签组件
const SentimentTag = ({ sentiment }: { sentiment: NewsItem['sentiment'] }) => {
  const styles = {
    bullish: 'bg-emerald-50 text-emerald-600',
    bearish: 'bg-red-50 text-red-600',
    neutral: 'bg-slate-100 text-slate-600',
  };

  const labels = {
    bullish: '看涨',
    bearish: '看跌',
    neutral: '中性',
  };

  return (
    <span
      className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[sentiment]}`}
    >
      {labels[sentiment]}
    </span>
  );
};

// 新闻卡片组件
const NewsCard = ({ item }: { item: NewsItem }) => {
  const { setNewsExpanded } = useStockStore();
  const isExpanded = Boolean(item.isExpanded);
  const detailUrl = item.detailUrl || `https://www.baidu.com/s?wd=${encodeURIComponent(item.title)}`;

  const handleToggle = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setNewsExpanded(item.id, !isExpanded);
  };

  const handleOpenDetail = () => {
    window.open(detailUrl, '_blank', 'noopener,noreferrer');
  };

  const Icon = categoryIcons[item.category];

  return (
    <div className="p-4 bg-white rounded-xl border border-slate-100 hover:border-slate-200 transition-all duration-200">
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={handleOpenDetail}
          className="flex-1 min-w-0 text-left group"
        >
          <div className="flex items-center gap-2 mb-2">
            <Icon className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs text-slate-500">
              {categoryLabels[item.category]}
            </span>
            <span className="text-xs text-slate-300">·</span>
            <span className="text-xs text-slate-400">{item.source}</span>
            <span className="text-xs text-slate-300">·</span>
            <span className="text-xs text-slate-400">{item.publishTime}</span>
          </div>

          <h3 className="text-sm font-medium text-slate-900 leading-snug mb-2 line-clamp-2 group-hover:text-slate-700">
            {item.title}
          </h3>

          {item.relatedSymbols && item.relatedSymbols.length > 0 && (
            <div className="flex items-center gap-1 mb-2">
              {item.relatedSymbols.map((symbol) => (
                <span
                  key={symbol}
                  className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-xs rounded"
                >
                  {symbol}
                </span>
              ))}
            </div>
          )}
        </button>

        <div className="flex flex-col items-end gap-2">
          <SentimentTag sentiment={item.sentiment} />
          <button
            type="button"
            onClick={handleToggle}
            className="p-1 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label={isExpanded ? '收起新闻详情' : '展开新闻详情'}
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-slate-100 space-y-3">
          <p className="text-sm text-slate-600 leading-relaxed">
            {item.summary}
          </p>
          <a
            href={detailUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-sm font-medium text-slate-700 hover:text-slate-900 underline underline-offset-2"
          >
            查看新闻详情
          </a>
        </div>
      )}
    </div>
  );
};

// 主新闻面板组件
export const NewsFeed = () => {
  const { news, selectedStock, isNewsLoading, isBackendConnected } = useStockStore();
  const [activeTab, setActiveTab] = useState<'all' | 'market' | 'company'>('all');

  // 筛选新闻
  const filteredNews = news.filter((item) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'market') return item.category === 'market';
    if (activeTab === 'company') {
      return (
        item.category === 'company' ||
        (item.relatedSymbols && item.relatedSymbols.includes(selectedStock || ''))
      );
    }
    return true;
  });

  return (
    <div className="h-full flex flex-col bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      {/* 标题区域 */}
      <div className="p-4 border-b border-slate-100">
        <div className="flex items-center gap-2 mb-3">
          <Newspaper className="w-5 h-5 text-slate-700" />
          <h2 className="text-lg font-semibold text-slate-900">实时新闻</h2>
        </div>

        {/* 标签页切换 */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          {(['all', 'market', 'company'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                activeTab === tab
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab === 'all' ? '全部' : tab === 'market' ? '市场' : '公司'}
            </button>
          ))}
        </div>
      </div>

      {/* 新闻列表 */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3 scrollbar-thin soft-scrollbar">
        {isNewsLoading ? (
          Array.from({ length: 4 }).map((_, idx) => (
            <div key={`news-loading-${idx}`} className="p-4 bg-slate-50 rounded-xl border border-slate-100 animate-pulse">
              <div className="flex items-center gap-2 text-slate-500 text-xs mb-3">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                加载新闻中...
              </div>
              <div className="h-3 bg-slate-200 rounded w-4/5 mb-2" />
              <div className="h-3 bg-slate-200 rounded w-3/5" />
            </div>
          ))
        ) : filteredNews.length > 0 ? (
          filteredNews.map((item) => (
            <NewsCard key={item.id} item={item} />
          ))
        ) : (
          <div className="h-full min-h-40 rounded-xl border border-dashed border-slate-300 bg-slate-50/70 flex items-center justify-center">
            <div className="text-center px-6">
              <DatabaseZap className="w-7 h-7 mx-auto text-slate-400 mb-2" />
              <p className="text-sm font-medium text-slate-600">
                {!isBackendConnected && news.length === 0 ? '未连接数据' : '暂无新闻数据'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {!isBackendConnected && news.length === 0 ? '请确认后端新闻接口已启动' : '可尝试切换筛选标签'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 底部提示 */}
      <div className="p-3 border-t border-slate-100">
        <p className="text-xs text-slate-400 text-center">
          {filteredNews.length} 条新闻
        </p>
      </div>
    </div>
  );
};

export default NewsFeed;
