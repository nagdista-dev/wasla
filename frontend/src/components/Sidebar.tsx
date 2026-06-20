import { memo, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Users, Heart, Settings, Tag, LayoutDashboard, BookOpen, BookmarkCheck, HeartHandshake, GraduationCap, MessageCircle, History, Newspaper } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import type { Channel, Playlist } from '../types';

interface SidebarProps {
  channels: Channel[];
  playlists?: Playlist[];
}

const Sidebar = memo(function Sidebar({ channels, playlists = [] }: SidebarProps) {
  const { pathname } = useLocation();
  const { isRTL, t } = useLanguage();
  const navItems = [
    { path: '/', label: t('nav.home'), icon: Home },
    { path: '/favorites', label: t('favorites.title'), icon: HeartHandshake },
    { path: '/courses', label: t('courses.title'), icon: GraduationCap },
    { path: '/posts', label: t('posts.title'), icon: Newspaper },
    { path: '/playlists', label: t('nav.playlists'), icon: Heart },
    { path: '/channels', label: t('nav.channels'), icon: Users },
    { path: '/watch-later', label: t('watchLater.title'), icon: BookmarkCheck },
    { path: '/history', label: t('watchHistory.title'), icon: History },
    { path: '/how-to-use', label: t('nav.howToUse'), icon: BookOpen },
    { path: '/contact', label: t('contact.title'), icon: MessageCircle },
    { path: '/settings', label: t('nav.settings'), icon: Settings },
  ];

  const categories = useMemo(
    () => {
      const cats = Array.from(new Set([
        ...channels.flatMap((c) => c.categories),
        ...playlists.flatMap((p) => p.categories),
      ])).sort((a, b) => a.localeCompare(b));
      return cats;
    },
    [channels, playlists]
  );

  const isAllActive = pathname === '/' || pathname === '/channels' || pathname === '/playlists';

  return (
    <aside className={`fixed top-16 inset-y-0 hidden w-64 border-r border-gray-200/70 bg-white/80 backdrop-blur-xl dark:border-gray-700/50 dark:bg-dark-navy/80 md:flex md:flex-col ${
      isRTL ? 'right-0 border-l border-r-0' : 'left-0'
    }`}>
      <div className="flex flex-col flex-1 min-h-0 pt-4">
        <div className="px-4 pt-2 pb-2 flex-shrink-0">
          <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400 dark:text-gray-500">
            {t('sidebar.navigation')}
          </p>
        </div>
        <nav className="px-3 pb-2 space-y-0.5 flex-shrink-0">
          {navItems.map((item) => {
            const isActive = pathname === item.path || (item.path === '/posts' && pathname.startsWith('/posts/'));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-brand-coral/10 text-brand-coral font-semibold'
                    : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/5'
                }`}
              >
                <item.icon className={`h-[18px] w-[18px] ${isActive ? 'text-brand-coral' : 'text-gray-400'}`} />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="flex flex-col flex-1 min-h-0 overflow-y-auto categories-scroll">
          <div className="px-4 pt-2 pb-1 border-t border-gray-100 dark:border-gray-700/50 flex-shrink-0">
            <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400 dark:text-gray-500">
              {t('sidebar.categories')}
            </p>
          </div>
          <div className="space-y-0.5 px-3 pb-4">
            <Link
              to="/"
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                isAllActive
                  ? 'bg-brand-coral/10 text-brand-coral font-semibold'
                  : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/5'
              }`}
            >
              <LayoutDashboard className={`h-[18px] w-[18px] ${isAllActive ? 'text-brand-coral' : 'text-gray-400'}`} />
              <span className="truncate">{t('sidebar.all')}</span>
            </Link>
            {categories.map((cat) => {
              const isActive = pathname === `/category/${encodeURIComponent(cat)}`;
              return (
                <Link
                  key={cat}
                  to={`/category/${encodeURIComponent(cat)}`}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-brand-coral/10 text-brand-coral font-semibold'
                      : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/5'
                  }`}
                >
                  <Tag className={`h-[18px] w-[18px] ${isActive ? 'text-brand-coral' : 'text-gray-400'}`} />
                  <span className="truncate">{cat}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </aside>
  );
});

export default Sidebar;
