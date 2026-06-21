import { useState } from 'react';
import { X, Copy, Check, ExternalLink, Link as LinkIcon, Globe } from 'lucide-react';

const SHORTENER_SUGGESTIONS = [
  { name: 'TinyURL', url: 'https://tinyurl.com' },
  { name: 'Bitly', url: 'https://bitly.com' },
  { name: 'Rebrandly', url: 'https://rebrandly.com' },
  { name: 'ShortURL', url: 'https://shorturl.at' },
];

interface ShareCategoryDialogProps {
  channelCount: number;
  shareUrl: string;
  onClose: () => void;
}

export default function ShareCategoryDialog({ channelCount, shareUrl, onClose }: ShareCategoryDialogProps) {
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

  const handleOpenShortener = () => {
    window.open('https://tinyurl.com/app', '_blank', 'noopener');
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
            Share Category
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-gray-700 transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {channelCount > 10 && (
          <div className="mb-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              This category contains {channelCount} channels, which may produce
              a long share link. For easier sharing, you can optionally shorten
              the link using a URL shortening service.
            </p>
          </div>
        )}

        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Share Link
          </label>
          <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600">
            <LinkIcon className="h-4 w-4 text-gray-400 shrink-0" />
            <p className="text-sm text-gray-600 dark:text-gray-400 truncate font-mono">
              {shareUrl}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={handleCopy}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand-coral px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-coral/90 transition-all active:scale-95"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied!' : 'Copy Original Link'}
          </button>
          <button
            onClick={onClose}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-white dark:bg-gray-700 px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-200 ring-1 ring-inset ring-gray-200 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition-all active:scale-95"
          >
            <Globe className="h-4 w-4" />
            Continue Sharing
          </button>
          <button
            onClick={handleOpenShortener}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-white dark:bg-gray-700 px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-200 ring-1 ring-inset ring-gray-200 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition-all active:scale-95"
          >
            <ExternalLink className="h-4 w-4" />
            Open URL Shortener
          </button>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            Suggested URL Shorteners
          </p>
          <div className="flex flex-wrap gap-2">
            {SHORTENER_SUGGESTIONS.map(s => (
              <a
                key={s.name}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition"
              >
                {s.name}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
