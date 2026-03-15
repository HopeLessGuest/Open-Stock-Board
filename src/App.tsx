// 股票看板主应用组件

import { useMemo, useState } from 'react';
import { StockStoreProvider, useStockStore } from '@/store/useStore';
import { HoldingsPanel } from '@/components/dashboard/HoldingsPanel';
import { MainChartBoard } from '@/components/dashboard/MainChartBoard';
import { NewsFeed } from '@/components/dashboard/NewsFeed';
import { StockDetailModal } from '@/components/dashboard/StockDetailModal';
import { MarketOverviewPanel } from '@/components/dashboard/MarketOverviewPanel';
import { SettingsModal } from '@/components/dashboard/SettingsModal';
import { ApiErrorToast } from '@/components/dashboard/ApiErrorToast';
import { QuickTradeModal } from '@/components/dashboard/QuickTradeModal';
import { AlertTriangle, ArrowDownCircle, ArrowUpCircle, Settings } from 'lucide-react';
import { SampleDashboard } from '@/components/dashboard/SampleDashboard';

const PROJECT_FOLDER_NAME = 'open-stock-board';

const projectTitle = PROJECT_FOLDER_NAME
  .split(/[-_]/)
  .filter(Boolean)
  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
  .join(' ');

const RightTopBar = ({
  onOpenSettings,
  onOpenTrade,
}: {
  onOpenSettings: () => void;
  onOpenTrade: (type: '买入' | '卖出') => void;
}) => {
  const displayDate = useMemo(() => {
    return new Date().toLocaleDateString('zh-CN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, []);

  return (
    <section className="h-40 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex h-full flex-col justify-between">
        <div>
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-2xl font-bold text-slate-900">{projectTitle}</h1>
            <button
              onClick={onOpenSettings}
              className="rounded-lg p-2 transition-colors hover:bg-slate-100"
              title="设置"
            >
              <Settings className="h-5 w-5 text-slate-600" />
            </button>
          </div>
          <p className="mt-1 text-xs text-slate-400">{displayDate}</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onOpenTrade('买入')}
            className="inline-flex items-center justify-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            <ArrowUpCircle className="h-4 w-4" />
            买入
          </button>
          <button
            onClick={() => onOpenTrade('卖出')}
            className="inline-flex items-center justify-center gap-1 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            <ArrowDownCircle className="h-4 w-4" />
            卖出
          </button>
        </div>
      </div>
    </section>
  );
};

// 主内容区组件
const MainContent = ({
  showSamplePage,
  onOpenSettings,
  onOpenTrade,
}: {
  showSamplePage: boolean;
  onOpenSettings: () => void;
  onOpenTrade: (type: '买入' | '卖出') => void;
}) => {
  if (showSamplePage) {
    return (
      <main className="p-4 min-h-screen">
        <SampleDashboard />
      </main>
    );
  }

  return (
    <main className="p-4 min-h-screen">
      <div className="grid grid-cols-12 lg:grid-cols-[2.5fr_6fr_3.5fr] gap-4 items-stretch">
        {/* 左侧边栏 */}
        <div className="col-span-12 lg:col-span-1 self-stretch lg:self-start lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)] lg:overflow-y-auto scrollbar-thin soft-scrollbar">
          <HoldingsPanel />
        </div>

        {/* 中间区域 */}
        <div className="col-span-12 lg:col-span-1 self-start flex flex-col gap-4">
          {/* 主看板 - 图表 (1) */}
          <div className="h-[50vh]">
            <MainChartBoard />
          </div>

          {/* 市场概览面板 (0.7) */}
          <div>
            <MarketOverviewPanel />
          </div>
        </div>

        {/* 右侧边栏 */}
        <div className="col-span-12 lg:col-span-1 self-stretch flex flex-col gap-4">
          <RightTopBar onOpenSettings={onOpenSettings} onOpenTrade={onOpenTrade} />
          <div className="flex-1 min-h-0">
            <NewsFeed />
          </div>
        </div>
      </div>
    </main>
  );
};

// 设置按钮和弹窗包装组件
const SettingsWrapper = () => {
  const {
    isSettingsOpen,
    openSettings,
    closeSettings,
    holdings,
    updateHoldings,
    isLoading,
    applyQuickTrade,
    apiErrorToast,
    closeApiErrorToast,
  } = useStockStore();
  const showSamplePage = !isLoading && holdings.length === 0;
  const [tradeModalOpen, setTradeModalOpen] = useState(false);
  const [tradeType, setTradeType] = useState<'买入' | '卖出'>('买入');

  const handleOpenTrade = (type: '买入' | '卖出') => {
    setTradeType(type);
    setTradeModalOpen(true);
  };

  return (
    <>
      {showSamplePage && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 flex items-center gap-2 text-amber-700 text-sm">
          <AlertTriangle className="w-4 h-4" />
          未检测到持仓数据，当前展示样例页面。请检查 public/data/trades.json 或后端数据源。
        </div>
      )}
      <MainContent showSamplePage={showSamplePage} onOpenSettings={openSettings} onOpenTrade={handleOpenTrade} />
      <StockDetailModal />
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={closeSettings}
        holdings={holdings}
        onSave={updateHoldings}
      />
      <QuickTradeModal
        isOpen={tradeModalOpen}
        defaultType={tradeType}
        onClose={() => setTradeModalOpen(false)}
        onSubmit={(payload) => {
          applyQuickTrade(payload);
          setTradeModalOpen(false);
        }}
      />
      <ApiErrorToast message={apiErrorToast} onClose={closeApiErrorToast} />
    </>
  );
};

function App() {
  return (
    <StockStoreProvider>
      <div className="min-h-screen bg-slate-50">
        <SettingsWrapper />
      </div>
    </StockStoreProvider>
  );
}

export default App;
