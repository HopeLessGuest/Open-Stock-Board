import { useEffect, useState } from 'react';
import { X, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';

type TradeType = '买入' | '卖出';

interface QuickTradeModalProps {
  isOpen: boolean;
  defaultType: TradeType;
  onClose: () => void;
  onSubmit: (payload: {
    symbol: string;
    name: string;
    type: TradeType;
    price: number;
    shares: number;
    fee: number;
  }) => void;
}

const toTitle = (type: TradeType): string => (type === '买入' ? '新增买入交易' : '新增卖出交易');

export const QuickTradeModal = ({ isOpen, defaultType, onClose, onSubmit }: QuickTradeModalProps) => {
  const [form, setForm] = useState({
    symbol: '',
    name: '',
    type: defaultType,
    price: '',
    shares: '',
    fee: '',
  });

  useEffect(() => {
    setForm((prev) => ({ ...prev, type: defaultType }));
  }, [defaultType, isOpen]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', onKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    const symbol = form.symbol.trim();
    const name = form.name.trim();
    const price = Number(form.price);
    const shares = Number(form.shares);
    const fee = Number(form.fee || 0);

    if (!symbol || !name || price <= 0 || shares <= 0) return;

    onSubmit({
      symbol,
      name,
      type: form.type,
      price,
      shares,
      fee,
    });

    setForm({
      symbol: '',
      name: '',
      type: defaultType,
      price: '',
      shares: '',
      fee: '',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2">
            {form.type === '买入' ? (
              <ArrowUpCircle className="h-5 w-5 text-emerald-600" />
            ) : (
              <ArrowDownCircle className="h-5 w-5 text-red-600" />
            )}
            <h3 className="text-base font-semibold text-slate-900">{toTitle(form.type)}</h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-slate-100" aria-label="关闭交易弹窗">
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>

        <div className="space-y-3 px-5 py-4">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setForm((prev) => ({ ...prev, type: '买入' }))}
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                form.type === '买入'
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              买入
            </button>
            <button
              onClick={() => setForm((prev) => ({ ...prev, type: '卖出' }))}
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                form.type === '卖出'
                  ? 'border-red-300 bg-red-50 text-red-700'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              卖出
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="股票代码"
              value={form.symbol}
              onChange={(event) => setForm((prev) => ({ ...prev, symbol: event.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
            />
            <input
              type="text"
              placeholder="股票名称"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <input
              type="number"
              step="0.01"
              placeholder="价格"
              value={form.price}
              onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
            />
            <input
              type="number"
              step="1"
              placeholder="数量"
              value={form.shares}
              onChange={(event) => setForm((prev) => ({ ...prev, shares: event.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
            />
            <input
              type="number"
              step="0.01"
              placeholder="手续费"
              value={form.fee}
              onChange={(event) => setForm((prev) => ({ ...prev, fee: event.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-4">
          <button onClick={onClose} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
            取消
          </button>
          <button
            onClick={handleSubmit}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            确认提交
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuickTradeModal;
