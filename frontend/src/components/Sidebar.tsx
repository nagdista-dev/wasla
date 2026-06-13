import { Link, useLocation } from 'react-router-dom';
import { Home, Users, Settings, Heart, Tag } from 'lucide-react';
import { useMemo } from 'react';
import type { Channel } from '../types';

interface SidebarProps {
  channels: Channel[];
}

export default function Sidebar({ channels }: SidebarProps) {
  const { pathname } = useLocation();

  const navItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/channels', label: 'Channels', icon: Users },
    { path: '/playlists', label: 'Playlists', icon: Heart },
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  const categories = useMemo(
    () => Array.from(new Set(channels.flatMap((c) => c.categories))).sort((a, b) => a.localeCompare(b)),
    [channels]
  );

  return (
    <nav className="fixed inset-y-0 left-0 hidden w-64 border-r border-gray-200 bg-white/90 backdrop-blur-md dark:border-gray-700 dark:bg-dark-navy/90 md:block">
      <Link to="/" className="flex h-16 items-center justify-center border-b border-gray-200 dark:border-gray-700">
        <span className="bg-gradient-brand bg-clip-text text-lg font-bold text-transparent">Wasla</span>
      </Link>
      <div className="flex flex-col h-full min-h-0">
        <div className="flex-shrink-0 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-brand-coral text-white shadow-md'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10'
                }`}
              >
                <item.icon className={`h-5 w-5 ${isActive ? 'text-white' : ''}`} />
                {item.label}
                {isActive && <span className="ml-auto h-2 w-2 rounded-full bg-white" />}
              </Link>
            );
          })}
        </div>
        {categories.length > 0 && (
          <div className="flex-1 min-h-0 overflow-y-auto border-t border-gray-200 dark:border-gray-700 categories-scroll ">
            <div className="px-4 py-2">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                Categories
              </p>
            </div>
            <div className="space-y-1 px-4 pb-4">
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
        )}
      </div>
    </nav>
  );
}
