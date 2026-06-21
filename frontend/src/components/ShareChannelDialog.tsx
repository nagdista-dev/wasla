import { useState } from 'react';
import { X, Copy, Check, ExternalLink } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface ShareChannelDialogProps {
  shareUrl: string;
  channelName: string;
  onClose: () => void;
}

export default function ShareChannelDialog({ shareUrl, channelName, onClose }: ShareChannelDialogProps) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard write failed
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {t('shareChannel.title')}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-gray-700 transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
          {t('shareChannel.description', { name: channelName })}
        </p>

        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            {t('shareChannel.shareLink')}
          </label>
          <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600">
            <span className="text-sm text-gray-600 dark:text-gray-400 truncate font-mono select-all">
              {shareUrl}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={handleCopy}
            className="w-full flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all active:scale-95"
            style={{ background: 'linear-gradient(135deg, #e2436a, #f37345)' }}
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? t('shareChannel.copied') : t('shareChannel.copyLink')}
          </button>
          <button
            onClick={() => {
              window.open(shareUrl, '_blank', 'noopener');
            }}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-white dark:bg-gray-700 px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-200 ring-1 ring-inset ring-gray-200 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition-all active:scale-95"
          >
            <ExternalLink className="h-4 w-4" />
            {t('shareChannel.openInBrowser')}
          </button>
          <button
            onClick={onClose}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-white dark:bg-gray-700 px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-200 ring-1 ring-inset ring-gray-200 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition-all active:scale-95"
          >
            {t('shareChannel.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
