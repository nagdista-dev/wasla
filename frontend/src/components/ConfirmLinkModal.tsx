import { memo, useEffect, useCallback } from 'react';
import { ExternalLink, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface ConfirmLinkModalProps {
  url: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmLinkModal = memo(function ConfirmLinkModal({ url, onConfirm, onCancel }: ConfirmLinkModalProps) {
  const { t, isRTL } = useLanguage();

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onCancel();
  }, [onCancel]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [handleKeyDown]);

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div
        className="relative z-10 w-full max-w-md rounded-2xl bg-white dark:bg-gray-800 shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-label={t('confirmLink.title')}
      >
        <button
          onClick={onCancel}
          className={`absolute top-3 ${isRTL ? 'left-3' : 'right-3'} rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/10 dark:hover:text-gray-300 transition-colors`}
          aria-label={t('confirmLink.cancel')}
        >
          <X className="h-4 w-4" />
        </button>

        <div className="p-6">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/30">
            <ExternalLink className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
          </div>

          <h3 className="text-lg font-bold text-gray-900 dark:text-white text-center mb-2">
            {t('confirmLink.title')}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-1">
            {t('confirmLink.message')}
          </p>
          <p className="text-xs text-yellow-600 dark:text-yellow-400 text-center mb-4 font-medium">
            {t('postCard.externalRedirect')}
          </p>

          <div className="rounded-xl bg-gray-50 dark:bg-white/5 p-3 mb-6 border border-gray-100 dark:border-white/10">
            <p className="text-xs font-mono text-gray-500 dark:text-gray-400 break-all leading-relaxed">
              {url}
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 rounded-xl px-4 py-3 text-sm font-semibold text-gray-700 bg-gray-100 border border-gray-200 hover:bg-gray-200 dark:text-gray-300 dark:bg-white/10 dark:border-white/15 dark:hover:bg-white/15 transition-all active:scale-95 min-h-[44px]"
            >
              {t('postCard.cancelRedirect')}
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 rounded-xl px-4 py-3 text-sm font-semibold text-white bg-brand-coral hover:bg-red-700 transition-all active:scale-95 min-h-[44px] shadow-sm"
            >
              {t('postCard.confirmRedirect')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

export default ConfirmLinkModal;
