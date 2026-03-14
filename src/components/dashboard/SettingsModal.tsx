// 设置弹窗组件 - 用于编辑持股和查看交易记录

import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, FileText, TrendingUp, TrendingDown } from 'lucide-react';
import type { HoldingItem } from '@/types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  holdings: HoldingItem[];
  onSave: (holdings: HoldingItem[]) => void;
}

// 交易记录类型
interface Trade {
  id: string;
  symbol: string;
  name: string;
  type: '买入' | '卖出';
  price: number;
  shares: number;
  amount: number;
  date: string;
  time: string;
  broker: string;
  fee: number;
  note: string;
}

interface TradeData {
  trades: Trade[];
  summary: {
    totalTrades: number;
    totalBuy: number;
    totalSell: number;
    totalAmount: number;
    totalFee: number;
  };
}

// 持股编辑表单
const HoldingForm = ({
  holding,
  onUpdate,
  onDelete,
}: {
  holding: HoldingItem;
  onUpdate: (holding: HoldingItem) => void;
  onDelete: () => void;
}) => {
  const [formData, setFormData] = useState(holding);

  useEffect(() => {
    setFormData(holding);
  }, [holding]);

  const handleChange = (field: keyof HoldingItem, value: string | number) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);
    onUpdate(updated);
  };

  return (
    <div className="p-3 bg-slate-50 rounded-lg mb-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-slate-900">{formData.name}</span>
        <button
          onClick={onDelete}
          className="p-1 text-red-500 hover:bg-red-50 rounded"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-slate-500">代码</label>
          <input
            type="text"
            value={formData.symbol}
            onChange={(e) => handleChange('symbol', e.target.value)}
            className="w-full px-2 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:border-slate-400"
          />
        </div>
        <div>
          <label className="text-xs text-slate-500">持股数量</label>
          <input
            type="number"
            value={formData.shares}
            onChange={(e) => handleChange('shares', parseInt(e.target.value) || 0)}
            className="w-full px-2 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:border-slate-400"
          />
        </div>
        <div>
          <label className="text-xs text-slate-500">成本价</label>
          <input
            type="number"
            step="0.01"
            value={formData.shares > 0 ? (formData.cost / formData.shares).toFixed(2) : '0.00'}
            onChange={(e) => {
              const price = parseFloat(e.target.value) || 0;
              handleChange('cost', price * formData.shares);
            }}
            className="w-full px-2 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:border-slate-400"
          />
        </div>
        <div>
          <label className="text-xs text-slate-500">当前价</label>
          <input
            type="number"
            step="0.01"
            value={formData.currentPrice}
            onChange={(e) => handleChange('currentPrice', parseFloat(e.target.value) || 0)}
            className="w-full px-2 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:border-slate-400"
          />
        </div>
      </div>
    </div>
  );
};

// 交易记录组件 - 带有添加功能
const TradeHistory = ({
  trades,
  onAddTrade,
}: {
  trades: Trade[];
  onAddTrade: (trade: Trade) => void;
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTrade, setNewTrade] = useState({
    symbol: '',
    name: '',
    type: '买入' as '买入' | '卖出',
    price: 0,
    shares: 0,
    date: new Date().toISOString().split('T')[0],
    broker: '',
    note: '',
  });

  const handleAddTrade = () => {
    if (!newTrade.symbol || !newTrade.name || newTrade.shares <= 0 || newTrade.price <= 0) return;

    const trade: Trade = {
      id: `T${Date.now()}`,
      symbol: newTrade.symbol,
      name: newTrade.name,
      type: newTrade.type,
      price: newTrade.price,
      shares: newTrade.shares,
      amount: newTrade.price * newTrade.shares,
      date: newTrade.date,
      time: new Date().toTimeString().slice(0, 8),
      broker: newTrade.broker || '自定义',
      fee: newTrade.price * newTrade.shares * 0.0003, // 假设手续费万三
      note: newTrade.note,
    };

    onAddTrade(trade);
    setShowAddForm(false);
    setNewTrade({
      symbol: '',
      name: '',
      type: '买入',
      price: 0,
      shares: 0,
      date: new Date().toISOString().split('T')[0],
      broker: '',
      note: '',
    });
  };

  return (
    <div>
      {/* 添加交易表单 */}
      {showAddForm ? (
        <div className="p-3 bg-slate-50 rounded-lg mb-3">
          <h4 className="text-sm font-medium text-slate-700 mb-2">添加新交易</h4>
          <div className="grid grid-cols-3 gap-2 mb-2">
            <input
              type="text"
              placeholder="股票代码"
              value={newTrade.symbol}
              onChange={(e) => setNewTrade({ ...newTrade, symbol: e.target.value })}
              className="px-2 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:border-slate-400"
            />
            <input
              type="text"
              placeholder="股票名称"
              value={newTrade.name}
              onChange={(e) => setNewTrade({ ...newTrade, name: e.target.value })}
              className="px-2 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:border-slate-400"
            />
            <select
              value={newTrade.type}
              onChange={(e) => setNewTrade({ ...newTrade, type: e.target.value as '买入' | '卖出' })}
              className="px-2 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:border-slate-400"
            >
              <option value="买入">买入</option>
              <option value="卖出">卖出</option>
            </select>
          </div>
          <div className="grid grid-cols-3 gap-2 mb-2">
            <input
              type="number"
              placeholder="价格"
              value={newTrade.price || ''}
              onChange={(e) => setNewTrade({ ...newTrade, price: parseFloat(e.target.value) || 0 })}
              className="px-2 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:border-slate-400"
            />
            <input
              type="number"
              placeholder="数量"
              value={newTrade.shares || ''}
              onChange={(e) => setNewTrade({ ...newTrade, shares: parseInt(e.target.value) || 0 })}
              className="px-2 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:border-slate-400"
            />
            <input
              type="date"
              value={newTrade.date}
              onChange={(e) => setNewTrade({ ...newTrade, date: e.target.value })}
              className="px-2 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:border-slate-400"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAddTrade}
              className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              确认添加
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full flex items-center justify-center gap-1 px-3 py-2 mb-3 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          添加交易记录
        </button>
      )}

      {/* 交易列表 */}
      <div className="max-h-64 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-white">
            <tr className="text-left text-slate-500 border-b">
              <th className="py-2">日期</th>
              <th className="py-2">股票</th>
              <th className="py-2">类型</th>
              <th className="py-2">价格</th>
              <th className="py-2">数量</th>
              <th className="py-2">金额</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((trade) => (
              <tr key={trade.id} className="border-b border-slate-100">
                <td className="py-2 text-slate-600">{trade.date}</td>
                <td className="py-2">
                  <span className="font-medium">{trade.name}</span>
                  <span className="text-xs text-slate-400 ml-1">{trade.symbol}</span>
                </td>
                <td className="py-2">
                  <span
                    className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                      trade.type === '买入'
                        ? 'bg-emerald-50 text-emerald-600'
                        : 'bg-red-50 text-red-600'
                    }`}
                  >
                    {trade.type}
                  </span>
                </td>
                <td className="py-2">¥{trade.price.toFixed(2)}</td>
                <td className="py-2">{trade.shares}</td>
                <td className="py-2">¥{trade.amount.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// 主设置弹窗组件
export const SettingsModal = ({
  isOpen,
  onClose,
  holdings,
  onSave,
}: SettingsModalProps) => {
  const [activeTab, setActiveTab] = useState<'holdings' | 'trades'>('holdings');
  const [localHoldings, setLocalHoldings] = useState<HoldingItem[]>(holdings);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [newHolding, setNewHolding] = useState({
    symbol: '',
    name: '',
    shares: 0,
    cost: 0,
    currentPrice: 0,
  });

  // 加载交易记录
  useEffect(() => {
    if (isOpen) {
      fetch('/data/trades.json')
        .then((res) => res.json())
        .then((data: TradeData) => {
          setTrades(data.trades);
        })
        .catch(() => {
          setTrades([]);
        });
    }
  }, [isOpen]);

  // 同步持股数据
  useEffect(() => {
    setLocalHoldings(holdings);
  }, [holdings]);

  // 键盘关闭
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleUpdateHolding = (updated: HoldingItem) => {
    // 重新计算相关值
    const totalValue = updated.shares * updated.currentPrice;
    const profitLoss = totalValue - updated.cost;
    const profitLossPercent = updated.cost > 0 ? (profitLoss / updated.cost) * 100 : 0;
    const changePercent = updated.currentPrice > 0 ? (updated.change / (updated.currentPrice - updated.change)) * 100 : 0;

    const updatedHolding: HoldingItem = {
      ...updated,
      totalValue,
      profitLoss,
      profitLossPercent,
      changePercent,
    };

    setLocalHoldings((prev) =>
      prev.map((h) => (h.symbol === updated.symbol ? updatedHolding : h))
    );
  };

  const handleDeleteHolding = (symbol: string) => {
    setLocalHoldings((prev) => prev.filter((h) => h.symbol !== symbol));
  };

  const handleAddHolding = () => {
    if (!newHolding.symbol || !newHolding.name) return;

    const totalValue = newHolding.shares * newHolding.currentPrice;
    const profitLoss = totalValue - newHolding.cost;
    const profitLossPercent = newHolding.cost > 0 ? (profitLoss / newHolding.cost) * 100 : 0;

    const holding: HoldingItem = {
      symbol: newHolding.symbol,
      name: newHolding.name,
      currentPrice: newHolding.currentPrice,
      change: 0,
      changePercent: 0,
      shares: newHolding.shares,
      cost: newHolding.cost,
      totalValue,
      profitLoss,
      profitLossPercent,
      trendData: Array(7).fill(newHolding.currentPrice),
      open: newHolding.currentPrice * 0.99,
      high: newHolding.currentPrice * 1.01,
      low: newHolding.currentPrice * 0.98,
      volume: 0,
      amount: 0,
      marketCap: 0,
      pe: 0,
      pb: 0,
    };
    setLocalHoldings((prev) => [...prev, holding]);
    setNewHolding({ symbol: '', name: '', shares: 0, cost: 0, currentPrice: 0 });
  };

  // 添加交易记录并更新持股
  const handleAddTrade = (trade: Trade) => {
    const newTrades = [...trades, trade];
    setTrades(newTrades);

    // 根据交易更新持股
    const existingHolding = localHoldings.find(h => h.symbol === trade.symbol);

    if (trade.type === '买入') {
      if (existingHolding) {
        // 增持 - 更新现有持股
        const newShares = existingHolding.shares + trade.shares;
        const newCost = existingHolding.cost + trade.amount;
        const newCurrentPrice = trade.price;
        const newTotalValue = newShares * newCurrentPrice;
        const profitLoss = newTotalValue - newCost;
        const profitLossPercent = newCost > 0 ? (profitLoss / newCost) * 100 : 0;

        const updatedHolding: HoldingItem = {
          ...existingHolding,
          shares: newShares,
          cost: newCost,
          currentPrice: newCurrentPrice,
          totalValue: newTotalValue,
          profitLoss,
          profitLossPercent,
          trendData: Array(7).fill(newCurrentPrice),
        };

        setLocalHoldings(prev => prev.map(h => h.symbol === trade.symbol ? updatedHolding : h));
      } else {
        // 新买入 - 添加新持股
        const holding: HoldingItem = {
          symbol: trade.symbol,
          name: trade.name,
          currentPrice: trade.price,
          change: 0,
          changePercent: 0,
          shares: trade.shares,
          cost: trade.amount,
          totalValue: trade.amount,
          profitLoss: 0,
          profitLossPercent: 0,
          trendData: Array(7).fill(trade.price),
          open: trade.price * 0.99,
          high: trade.price * 1.01,
          low: trade.price * 0.98,
          volume: 0,
          amount: 0,
          marketCap: 0,
          pe: 0,
          pb: 0,
        };
        setLocalHoldings(prev => [...prev, holding]);
      }
    } else {
      // 卖出 - 减少持股
      if (existingHolding) {
        const newShares = existingHolding.shares - trade.shares;
        if (newShares <= 0) {
          // 全部卖出 - 删除持股
          setLocalHoldings(prev => prev.filter(h => h.symbol !== trade.symbol));
        } else {
          // 部分卖出
          const costReduction = (existingHolding.cost / existingHolding.shares) * trade.shares;
          const newCost = existingHolding.cost - costReduction;
          const newTotalValue = newShares * trade.price;
          const profitLoss = newTotalValue - newCost;
          const profitLossPercent = newCost > 0 ? (profitLoss / newCost) * 100 : 0;

          const updatedHolding: HoldingItem = {
            ...existingHolding,
            shares: newShares,
            cost: newCost,
            currentPrice: trade.price,
            totalValue: newTotalValue,
            profitLoss,
            profitLossPercent,
            trendData: Array(7).fill(trade.price),
          };

          setLocalHoldings(prev => prev.map(h => h.symbol === trade.symbol ? updatedHolding : h));
        }
      }
    }
  };

  const handleSave = () => {
    onSave(localHoldings);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">设置</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* 标签页 */}
        <div className="flex border-b border-slate-100">
          <button
            onClick={() => setActiveTab('holdings')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'holdings'
                ? 'text-slate-900 border-b-2 border-slate-900'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <TrendingUp className="w-4 h-4 inline-block mr-1" />
            持股管理
          </button>
          <button
            onClick={() => setActiveTab('trades')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'trades'
                ? 'text-slate-900 border-b-2 border-slate-900'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileText className="w-4 h-4 inline-block mr-1" />
            交易记录
          </button>
        </div>

        {/* 内容区域 */}
        <div className="p-4 overflow-y-auto max-h-[calc(80vh-140px)]">
          {activeTab === 'holdings' && (
            <div>
              {/* 持股列表 */}
              {localHoldings.map((holding) => (
                <HoldingForm
                  key={holding.symbol}
                  holding={holding}
                  onUpdate={handleUpdateHolding}
                  onDelete={() => handleDeleteHolding(holding.symbol)}
                />
              ))}

              {/* 添加新持股 */}
              <div className="mt-4 p-3 border border-dashed border-slate-300 rounded-lg">
                <h4 className="text-sm font-medium text-slate-700 mb-2">添加新股</h4>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="股票代码"
                    value={newHolding.symbol}
                    onChange={(e) =>
                      setNewHolding({ ...newHolding, symbol: e.target.value })
                    }
                    className="px-2 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:border-slate-400"
                  />
                  <input
                    type="text"
                    placeholder="股票名称"
                    value={newHolding.name}
                    onChange={(e) =>
                      setNewHolding({ ...newHolding, name: e.target.value })
                    }
                    className="px-2 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:border-slate-400"
                  />
                  <input
                    type="number"
                    placeholder="持股数量"
                    value={newHolding.shares || ''}
                    onChange={(e) =>
                      setNewHolding({
                        ...newHolding,
                        shares: parseInt(e.target.value) || 0,
                      })
                    }
                    className="px-2 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:border-slate-400"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <input
                    type="number"
                    placeholder="成本价"
                    value={newHolding.cost || ''}
                    onChange={(e) =>
                      setNewHolding({
                        ...newHolding,
                        cost: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="px-2 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:border-slate-400"
                  />
                  <input
                    type="number"
                    placeholder="当前价"
                    value={newHolding.currentPrice || ''}
                    onChange={(e) =>
                      setNewHolding({
                        ...newHolding,
                        currentPrice: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="px-2 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:border-slate-400"
                  />
                </div>
                <button
                  onClick={handleAddHolding}
                  className="w-full flex items-center justify-center gap-1 px-3 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  添加持股
                </button>
              </div>
            </div>
          )}

          {activeTab === 'trades' && (
            <TradeHistory
              trades={trades}
              onAddTrade={handleAddTrade}
            />
          )}
        </div>

        {/* 底部操作栏 */}
        <div className="p-4 border-t border-slate-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <Save className="w-4 h-4" />
            保存
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
