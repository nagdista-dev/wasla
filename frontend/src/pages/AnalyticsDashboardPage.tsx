import { useState, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { fetchDashboard, clearAnalytics, type DashboardData } from '../services/analyticsService';
import { BarChart3, Eye, MousePointerClick, Users, Trash2, Lock, BarChart, Calendar } from 'lucide-react';

export default function AnalyticsDashboardPage() {
  const { t, isRTL } = useLanguage();
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadData = useCallback(async (pw: string) => {
    setLoading(true);
    setError('');
    try {
      const result = await fetchDashboard(pw);
      setData(result);
      setAuthenticated(true);
    } catch {
      setError(t('analytics.invalidPassword'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim()) {
      loadData(password.trim());
    }
  };

  const handleClear = async () => {
    if (!confirm(t('analytics.confirmClear'))) return;
    try {
      await clearAnalytics(password);
      await loadData(password);
    } catch {
      setError(t('analytics.clearError'));
    }
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-white dark:bg-dark-navy flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-brand-coral to-brand-orange flex items-center justify-center mb-4">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('analytics.dashboard')}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              {t('analytics.enterPassword')}
            </p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('analytics.passwordPlaceholder')}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-coral focus:outline-none focus:ring-2 focus:ring-brand-coral/20 dark:border-gray-700 dark:bg-dark-navy dark:text-white dark:placeholder-gray-500"
              autoFocus
            />
            {error && (
              <p className="text-sm text-red-500 text-center">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading || !password.trim()}
              className="w-full rounded-xl bg-gradient-to-r from-brand-coral to-brand-orange px-4 py-3 text-sm font-semibold text-white shadow-lg hover:shadow-xl transition-all active:scale-95 disabled:opacity-50"
            >
              {loading ? t('analytics.loading') : t('analytics.unlock')}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const maxPageView = Math.max(...data.pageViews.map((p) => p.count), 1);
  const maxVideoClick = Math.max(...data.videoClicks.map((v) => v.count), 1);
  const maxDaily = Math.max(...data.dailyVisits.map((d) => d.count), 1);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-navy" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="mx-auto w-full max-w-[1440px] 2xl:max-w-[1600px] px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-coral to-brand-orange flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('analytics.dashboard')}
            </h1>
          </div>
          <button
            onClick={handleClear}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-red-500 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 transition"
          >
            <Trash2 className="w-4 h-4" />
            {t('analytics.clearData')}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="rounded-xl bg-white dark:bg-dark-navy border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-3 mb-3">
              <Eye className="w-5 h-5 text-brand-coral" />
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {t('analytics.totalVisits')}
              </span>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {data.totalVisits.toLocaleString()}
            </p>
          </div>

          <div className="rounded-xl bg-white dark:bg-dark-navy border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-3 mb-3">
              <Users className="w-5 h-5 text-brand-coral" />
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {t('analytics.uniqueVisitors')}
              </span>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {data.uniqueVisitors.toLocaleString()}
            </p>
          </div>

          <div className="rounded-xl bg-white dark:bg-dark-navy border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-3 mb-3">
              <MousePointerClick className="w-5 h-5 text-brand-coral" />
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {t('analytics.videoClicks')}
              </span>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {data.videoClicks.reduce((s, v) => s + v.count, 0).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="rounded-xl bg-white dark:bg-dark-navy border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-2 mb-4">
              <BarChart className="w-5 h-5 text-brand-coral" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('analytics.mostVisitedPages')}
              </h2>
            </div>
            {data.pageViews.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">
                {t('analytics.noData')}
              </p>
            ) : (
              <div className="space-y-3">
                {data.pageViews.map((pv) => (
                  <div key={pv.path} className="flex items-center gap-3">
                    <span className="text-sm text-gray-600 dark:text-gray-300 truncate flex-1 min-w-0 font-medium">
                      {pv.path || '/'}
                    </span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="w-32 sm:w-48 h-2 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-brand-coral to-brand-orange rounded-full transition-all"
                          style={{ width: `${(pv.count / maxPageView) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 w-8 text-right tabular-nums">
                        {pv.count}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl bg-white dark:bg-dark-navy border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-2 mb-4">
              <MousePointerClick className="w-5 h-5 text-brand-coral" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('analytics.mostClickedVideos')}
              </h2>
            </div>
            {data.videoClicks.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">
                {t('analytics.noData')}
              </p>
            ) : (
              <div className="space-y-3">
                {data.videoClicks.map((vc) => (
                  <div key={vc.videoId} className="flex items-center gap-3">
                    <span className="text-sm text-gray-600 dark:text-gray-300 truncate flex-1 min-w-0 font-medium font-mono">
                      {vc.videoId}
                    </span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="w-32 sm:w-48 h-2 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-brand-coral to-brand-orange rounded-full transition-all"
                          style={{ width: `${(vc.count / maxVideoClick) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 w-8 text-right tabular-nums">
                        {vc.count}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl bg-white dark:bg-dark-navy border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-brand-coral" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('analytics.dailyVisits')}
            </h2>
          </div>
          {data.dailyVisits.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">
              {t('analytics.noData')}
            </p>
          ) : (
            <div className="flex items-end gap-1.5 h-40">
              {data.dailyVisits.map((dv) => (
                <div
                  key={dv.date}
                  className="flex-1 flex flex-col items-center gap-1 group relative"
                >
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity absolute -top-5 whitespace-nowrap">
                    {dv.count}
                  </span>
                  <div
                    className="w-full bg-gradient-to-t from-brand-coral to-brand-orange rounded-t transition-all hover:opacity-80 cursor-default"
                    style={{
                      height: `${(dv.count / maxDaily) * 100}%`,
                      minHeight: dv.count > 0 ? '4px' : '0',
                    }}
                  />
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 truncate w-full text-center leading-none">
                    {dv.date.slice(5)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
