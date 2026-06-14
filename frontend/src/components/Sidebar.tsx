import { Link, useLocation } from 'react-router-dom';
import { Home, Users, Heart, Settings, Tag, LayoutDashboard, BookOpen } from 'lucide-react';
import { useMemo } from 'react';
import type { Channel, Playlist } from '../types';

const navItems = [
  { path: '/', label: 'Home', icon: Home },
  { path: '/channels', label: 'Channels', icon: Users },
  { path: '/playlists', label: 'Playlists', icon: Heart },
  { path: '/how-to-use', label: 'How to Use', icon: BookOpen },
  { path: '/settings', label: 'Settings', icon: Settings },
];

interface SidebarProps {
  channels: Channel[];
  playlists?: Playlist[];
}

export default function Sidebar({ channels, playlists = [] }: SidebarProps) {
  const { pathname } = useLocation();

  const categories = useMemo(
    () => Array.from(new Set([
      ...channels.flatMap((c) => c.categories),
      ...playlists.flatMap((p) => p.categories),
    ])).sort((a, b) => a.localeCompare(b)),
    [channels, playlists]
  );

  const isAllActive = pathname === '/' || pathname === '/channels' || pathname === '/playlists';

  return (
    <aside className="fixed top-16 inset-y-0 left-0 hidden w-64 border-r border-gray-200 bg-white/90 backdrop-blur-md dark:border-gray-700 dark:bg-dark-navy/90 md:flex md:flex-col">
      <div className="flex flex-col flex-1 min-h-0 overflow-y-auto categories-scroll pt-4">
        <div className="px-4 pt-3 pb-2 border-b border-gray-100 dark:border-gray-700/50">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            Navigation
          </p>
        </div>
        <nav className="px-4 py-2 space-y-1 flex-shrink-0">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-brand-coral text-white shadow-md'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10'
                }`}
              >
                <item.icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="px-4 pt-2 pb-2 border-t border-gray-100 dark:border-gray-700/50">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            Categories
          </p>
        </div>
        <div className="space-y-1 px-4 pb-4">
          <Link
            to="/"
            className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
              isAllActive
                ? 'bg-brand-coral text-white shadow-md'
                : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10'
            }`}
          >
            <LayoutDashboard className={`h-4 w-4 ${isAllActive ? 'text-white' : 'text-gray-400'}`} />
            <span className="truncate">All</span>
          </Link>
          {categories.map((cat) => {
            const isActive = pathname === `/category/${encodeURIComponent(cat)}`;
            return (
              <Link
                key={cat}
                to={`/category/${encodeURIComponent(cat)}`}
                className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-brand-coral text-white shadow-md'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10'
                }`}
              >
                <Tag className={`h-4 w-4 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                <span className="truncate">{cat}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
