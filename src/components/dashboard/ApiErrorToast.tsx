import { useEffect, useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface ApiErrorToastProps {
  message: string | null;
  onClose: () => void;
}

export const ApiErrorToast = ({ message, onClose }: ApiErrorToastProps) => {
  const [renderedMessage, setRenderedMessage] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (message) {
      setRenderedMessage(message);
      requestAnimationFrame(() => setIsVisible(true));
      return;
    }

    setIsVisible(false);
    const timer = setTimeout(() => setRenderedMessage(null), 280);
    return () => clearTimeout(timer);
  }, [message]);

  if (!renderedMessage) return null;

  return (
    <div
      className={`fixed bottom-5 right-5 z-[60] w-[320px] rounded-xl border border-red-200 bg-white/95 p-3 shadow-2xl backdrop-blur-sm transition-all duration-300 ease-out ${
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-16 opacity-0'
      }`}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-900">连接异常</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">{renderedMessage}</p>
        </div>
        <button onClick={onClose} className="rounded-md p-1 hover:bg-slate-100" aria-label="关闭提醒">
          <X className="h-4 w-4 text-slate-500" />
        </button>
      </div>
    </div>
  );
};

export default ApiErrorToast;
