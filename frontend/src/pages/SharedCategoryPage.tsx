import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, CheckCircle, Download, ExternalLink, Loader2, Share2, Users } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useMeta } from '../hooks/useMeta';
import { getShareData } from '../utils/shareUtils';
import { loadChannels, saveChannels } from '../storage';
import type { Channel } from '../types';
import logo from '../assets/logo.png';

export default function SharedCategoryPage() {
  const { t } = useLanguage();
  const { shareId } = useParams<{ shareId: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<{
    shareId: string;
    categoryName: string;
    channels: { id: string; name: string; handle?: string }[];
    createdAt: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(false);

  useEffect(() => {
    if (!shareId) {
      setError('No share ID provided');
      setLoading(false);
      return;
    }
    getShareData(shareId)
      .then(setData)
      .catch((err) => setError(err.message || 'Failed to load shared category'))
      .finally(() => setLoading(false));
  }, [shareId]);

  useMeta(data ? {
    title: data.categoryName,
    description: `Shared from Wasla • ${data.channels.length} channels`,
  } : undefined);

  const channelCount = useMemo(() => data?.channels.length ?? 0, [data]);

  const handleImport = useCallback(async () => {
    if (!data || importing || imported) return;
    setImporting(true);
    try {
      const existingChannels = await loadChannels();
      const existingIds = new Set(existingChannels.map(c => c.id));
      const next: Channel[] = [...existingChannels];
      let changed = false;

      for (const ch of data.channels) {
        if (!ch.id) continue;
        if (existingIds.has(ch.id)) {
          const idx = next.findIndex(c => c.id === ch.id);
          if (idx >= 0 && !next[idx].categories.includes(data.categoryName)) {
            next[idx] = { ...next[idx], categories: [...next[idx].categories, data.categoryName] };
            changed = true;
          }
        } else {
          next.push({ id: ch.id, name: ch.name, categories: [data.categoryName], handle: ch.handle });
          changed = true;
        }
        existingIds.add(ch.id);
      }

      if (changed) {
        await saveChannels(next);
      }

      const stored = localStorage.getItem('wasla_shared_categories');
      const sharedCategories = stored ? JSON.parse(stored) : [];
      if (!sharedCategories.includes(data.categoryName)) {
        localStorage.setItem('wasla_shared_categories', JSON.stringify([...sharedCategories, data.categoryName]));
      }

      setImported(true);
      setTimeout(() => {
        navigate(`/category/${encodeURIComponent(data.categoryName)}`, { replace: true });
      }, 1500);
    } catch (err) {
      console.error('Import failed:', err);
      setError('Failed to import category');
    } finally {
      setImporting(false);
    }
  }, [data, importing, imported, navigate]);

  const timeAgo = useMemo(() => {
    if (!data) return '';
    const diff = Date.now() - data.createdAt;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    return `${months}mo ago`;
  }, [data]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-navy p-4">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-brand-coral mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">{t('shared.loading')}</p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-navy p-4">
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl max-w-md w-full p-8 text-center">
          <AlertCircle className="w-14 h-14 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t('shared.notFound')}</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-xl font-medium text-gray-700 dark:text-gray-200 transition"
          >
            {t('shared.goHome')}
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-navy flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden">
          {/* Preview Card */}
          <div className="p-6 sm:p-8">
            {/* Badge */}
            <div className="flex items-center gap-2 mb-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 text-xs font-bold uppercase tracking-wide border border-blue-200 dark:border-blue-800/50">
                <Share2 className="h-3 w-3" />
                {t('category.sharedBadge')}
              </span>
              {timeAgo && (
                <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">{timeAgo}</span>
              )}
            </div>

            {/* Category Name */}
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white mb-2">
              {data.categoryName}
            </h1>

            {/* Channel Count */}
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-6">
              <Users className="h-4 w-4" />
              <span className="font-medium">{t('category.channels', { count: channelCount })}</span>
            </div>

            {/* Channel List Preview */}
            <div className="mb-6 space-y-2">
              {data.channels.slice(0, 8).map((ch) => (
                <div key={ch.id} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-700/50">
                  <div className="h-8 w-8 shrink-0 rounded-full bg-gradient-to-br from-brand-coral to-brand-orange flex items-center justify-center text-white font-bold text-sm">
                    {ch.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{ch.name}</p>
                    {ch.handle && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">@{ch.handle}</p>
                    )}
                  </div>
                </div>
              ))}
              {channelCount > 8 && (
                <p className="text-sm text-gray-400 dark:text-gray-500 text-center pt-1 font-medium">
                  +{channelCount - 8} more channels
                </p>
              )}
            </div>

            {/* Import Button */}
            {imported ? (
              <div className="flex items-center justify-center gap-2 rounded-2xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/30 p-4">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="font-semibold text-green-700 dark:text-green-300">{t('import.success')}</span>
              </div>
            ) : (
              <button
                onClick={handleImport}
                disabled={importing}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-brand-coral px-6 py-3 text-base font-bold text-white shadow-lg shadow-brand-coral/20 hover:bg-brand-coral/90 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {importing ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Download className="h-5 w-5" />
                )}
                {importing ? t('import.processing') : 'Import Category'}
              </button>
            )}

            {/* Open in App Button */}
            <button
              onClick={() => {
                window.location.href = `wasla://s/${data.shareId}`;
              }}
              className="w-full mt-3 flex items-center justify-center gap-2 rounded-2xl bg-white dark:bg-gray-700 px-6 py-3 text-sm font-semibold text-gray-700 dark:text-gray-200 ring-1 ring-inset ring-gray-200 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition-all active:scale-[0.98]"
            >
              <ExternalLink className="h-4 w-4" />
              Open in Wasla App
            </button>
          </div>

          {/* Footer Branding */}
          <div className="border-t border-gray-100 dark:border-gray-700/50 px-6 sm:px-8 py-4 flex items-center justify-center gap-2 text-gray-400 dark:text-gray-500 text-sm">
            <img src={logo} alt="" className="h-5 w-5 object-contain opacity-70" />
            <span className="font-medium">{t('app.name')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
