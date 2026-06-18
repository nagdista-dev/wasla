import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  Home,
  Users,
  Settings,
  Heart,
  Menu,
  X,
  Sun,
  Moon,
  Tag,
  LayoutDashboard,
  Languages,
  BookOpen,
  BookmarkCheck,
  HeartHandshake,
  GraduationCap,
  MessageCircle,
  Search,
  SlidersHorizontal,
  Headphones,
  History,
  Newspaper,
} from "lucide-react";
import { lazy, memo, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import FloatingButton from "./components/FloatingButton";
import LoadingScreen from "./components/LoadingScreen";
import AddChannelModal from "./components/AddChannelModal";
import AddPlaylistModal from "./components/AddPlaylistModal";
import MobileAppBanner from "./components/MobileAppBanner";

import type { Channel, Playlist } from "./types";
import { loadChannels, saveChannels, loadPlaylists, savePlaylists, readStoredValue } from "./storage";
import { useLanguage } from "./context/LanguageContext";
import { useTheme } from "./context/ThemeContext";
import { useAudio } from "./context/AudioContext";
import Sidebar from "./components/Sidebar";
import FilterModal from "./components/FilterModal";
import { useFilters } from "./context/FilterContext";
import logo from "./assets/logo.png";

function syncLoadChannels(): Channel[] {
  try {
    const stored = localStorage.getItem('wasla_channels');
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    const seen = new Set<string>();
    return parsed.filter((ch) => {
      if (!ch || !ch.id || seen.has(ch.id)) return false;
      seen.add(ch.id);
      return true;
    });
  } catch {
    return [];
  }
}

function syncLoadPlaylists(): Playlist[] {
  try {
    const stored = localStorage.getItem('wasla_playlists');
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    const seenIds = new Set<string>();
    const seenUrls = new Set<string>();
    return parsed.filter((p) => {
      if (!p || !p.id || seenIds.has(p.id)) return false;
      if (p.url && seenUrls.has(p.url)) return false;
      seenIds.add(p.id);
      if (p.url) seenUrls.add(p.url);
      return true;
    });
  } catch {
    return [];
  }
}

const HomePage = lazy(() => import("./pages/HomePage"));
const ChannelPage = lazy(() => import("./pages/ChannelPage"));
const PlaylistCoursePage = lazy(() => import("./pages/PlaylistCoursePage"));
const CategoryPage = lazy(() => import("./pages/CategoryPage"));
const ChannelsPage = lazy(() => import("./pages/ChannelsPage"));
const PlaylistsPage = lazy(() => import("./pages/PlaylistsPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const WatchLaterPage = lazy(() => import("./pages/WatchLaterPage"));
const HowToUsePage = lazy(() => import("./pages/HowToUsePage"));
const FavoritesPage = lazy(() => import("./pages/FavoritesPage"));
const CoursesPage = lazy(() => import("./pages/CoursesPage"));
const CourseDetailPage = lazy(() => import("./pages/CourseDetailPage"));
const CourseDashboardPage = lazy(() => import("./pages/CourseDashboardPage"));
const ContactPage = lazy(() => import("./pages/ContactPage"));
const VideoPage = lazy(() => import("./pages/VideoPage"));
const AudioPage = lazy(() => import("./pages/AudioPage"));
const WatchHistoryPage = lazy(() => import("./pages/WatchHistoryPage"));
const PostsPage = lazy(() => import("./pages/PostsPage"));
const PostDetailPage = lazy(() => import("./pages/PostDetailPage"));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function StartupRedirect() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    const syncStart = readStoredValue<string>('wasla_start_page');
    if (syncStart && pathname === '/') {
      navigate(syncStart, { replace: true });
      return;
    }
    import('./storage').then(({ loadSetting }) => {
      loadSetting<string>('wasla_start_page').then((startPage) => {
        if (startPage && pathname === '/') {
          navigate(startPage, { replace: true });
        }
      });
    });
  }, [navigate, pathname]);

  return null;
}

const Navigation = memo(function Navigation({ channels, onOpenSearch }: { channels: Channel[]; onOpenSearch?: () => void }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { language, setLanguage, isRTL, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { activeFilterCount, setShowFilterModal } = useFilters();
  const { currentVideo: audioVideo, isPlaying: isAudioPlaying } = useAudio();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    queueMicrotask(() => setMenuOpen(false));
  }, [language]);
  const navItems = [
    { path: "/", label: t('nav.home'), icon: Home },
    { path: "/favorites", label: t('favorites.title'), icon: HeartHandshake },
    { path: "/courses", label: t('courses.title'), icon: GraduationCap },
    { path: "/posts", label: t('posts.title'), icon: Newspaper },
    { path: "/channels", label: t('nav.channels'), icon: Users },
    { path: "/playlists", label: t('nav.playlists'), icon: Heart },
    { path: "/watch-later", label: t('watchLater.title'), icon: BookmarkCheck },
    { path: "/history", label: t('watchHistory.title'), icon: History },
    { path: "/how-to-use", label: t('nav.howToUse'), icon: BookOpen },
    { path: "/contact", label: t('contact.title'), icon: MessageCircle },
    { path: "/settings", label: t('nav.settings'), icon: Settings },
  ];
  const categories = useMemo(
    () => {
      const cats = Array.from(new Set(channels.flatMap((c) => c.categories))).sort((a, b) => a.localeCompare(b));
      return ['Live', ...cats];
    },
    [channels],
  );

  const closeMenu = () => setMenuOpen(false);

  return (
<>
<nav className="fixed top-0 left-0 right-0 min-h-fit z-50 border-b border-gray-200 bg-white/90 backdrop-blur-md dark:border-gray-700 dark:bg-dark-navy/90">
  <div className="mx-auto max-w-7xl px-4">
    <div className="flex items-center justify-between h-16">
      <Link to="/">
        <img src={logo} alt={t('app.name')} className="h-18 w-18 object-contain" />
      </Link>

      <div className="flex items-center gap-2">
        <button
          onClick={onOpenSearch}
          className="rounded-md min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/10"
          aria-label={t('home.search')}
        >
          <Search className="h-4 w-4" />
        </button>
        <button
          onClick={() => setShowFilterModal(true)}
          className="rounded-md min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/10 relative"
          aria-label={t('filterModal.filter')}
        >
          <SlidersHorizontal className="h-4 w-4" />
          {activeFilterCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-brand-coral text-[10px] font-bold text-white leading-none px-1">
              {activeFilterCount}
            </span>
          )}
        </button>
        <button
          onClick={toggleTheme}
          className="rounded-md min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/10"
          aria-label={t('nav.toggleTheme')}
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </button>

        <button
          onClick={() => setLanguage(language === "en" ? "ar" : "en")}
          className="rounded-md min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/10"
          aria-label={t('nav.toggleLanguage')}
        >
          <Languages className="h-4 w-4" />
        </button>

        {isAudioPlaying && audioVideo && (
          <button
            onClick={() => navigate(`/audio/${audioVideo._videoId}`, { state: { video: audioVideo } })}
            className="rounded-md min-w-[44px] min-h-[44px] flex items-center justify-center text-brand-coral hover:bg-gray-100 dark:hover:bg-white/10 relative"
            aria-label={t('audioPage.activeIndicator')}
          >
            <Headphones className="h-4 w-4 audio-waveform-icon" />
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-brand-coral animate-ping" />
          </button>
        )}

        <button
          onClick={() => setMenuOpen(true)}
          className="md:hidden min-w-[44px] min-h-[44px] flex items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/10"
          aria-label={t('nav.menu')}
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>
    </div>
  </div>
</nav>

  {menuOpen && (
    <div className="fixed inset-0 z-[80] md:hidden">
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={closeMenu}
      />

      <div
        className={`fixed top-0 ${
          isRTL ? "right-0" : "left-0"
        } h-dvh w-64 bg-white shadow-2xl dark:bg-dark-navy flex flex-col will-change-transform ${
          isRTL ? "animate-slide-in" : "animate-slide-in-rtl"
        }`}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4 dark:border-gray-700 flex-shrink-0">
          <Link to="/" className="flex items-center">
            <img src={logo} alt={t('app.name')} className="h-12 w-12 object-contain" />
          </Link>

          <button
            onClick={closeMenu}
            className="rounded-md p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/10"
            aria-label={t('nav.closeMenu')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col p-4 space-y-1 flex-shrink-0">
          {navItems.map((item) => {
            const isActive = pathname === item.path || (item.path === '/posts' && pathname.startsWith('/posts/'));

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={closeMenu}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                  isActive
                    ? "bg-brand-coral text-white shadow-md"
                    : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10"
                }`}
              >
                <item.icon
                  className={`h-5 w-5 ${isActive ? "text-white" : ""}`}
                />
                {item.label}

                {isActive && (
                  <span className={`${isRTL ? 'mr-auto' : 'ml-auto'} h-2 w-2 rounded-full bg-white`} />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Categories (scroll area) */}
        <div className="flex flex-col flex-1 min-h-0 border-t border-gray-200 dark:border-gray-700">
          <div className="px-4 pt-2 flex-0">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              {t('nav.categories')}
            </p>
          </div>

          <div className="flex-1 min-h-0 modal-scroll px-2 pb-4">
            <Link
              to="/"
              onClick={closeMenu}
              className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                pathname === "/"
                  ? "bg-brand-coral text-white shadow-md"
                  : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10"
              }`}
            >
              <LayoutDashboard
                className={`h-4 w-4 ${
                  pathname === "/" ? "text-white" : "text-gray-400"
                }`}
              />
              <span className="truncate">{t('nav.all')}</span>
            </Link>
            {categories.map((cat) => {
              const isActive =
                pathname === `/category/${encodeURIComponent(cat)}`;

              return (
                <Link
                  key={cat}
                  to={`/category/${encodeURIComponent(cat)}`}
                  onClick={closeMenu}
                  className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                    isActive
                      ? "bg-brand-coral text-white shadow-md"
                      : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10"
                  }`}
                >
                  <Tag
                    className={`h-4 w-4 ${
                      isActive ? "text-white" : "text-gray-400"
                    }`}
                  />
                  <span className="truncate">{cat}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  )}
  </>
  );
});

function App() {
  const { isRTL } = useLanguage();
  const { filters, setSelectedCategory, setTimeRange, setSortBy, setHiddenCategories, resetFilters, showFilterModal, setShowFilterModal } = useFilters();
  const [channels, setChannels] = useState<Channel[]>(syncLoadChannels);
  const [playlists, setPlaylists] = useState<Playlist[]>(syncLoadPlaylists);
  const [showChannelModal, setShowChannelModal] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [splashFadeOut, setSplashFadeOut] = useState(false);

  useEffect(() => {
    loadChannels().then((items) => { if (items.length > 0) setChannels(items); });
    loadPlaylists().then((items) => { if (items.length > 0) setPlaylists(items); });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSplashFadeOut(true);
      setTimeout(() => setShowSplash(false), 600);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const updateChannels = useCallback(async (nextChannels: Channel[]) => {
    setChannels(nextChannels);
    await saveChannels(nextChannels);
  }, []);

  const updatePlaylists = useCallback(async (nextPlaylists: Playlist[]) => {
    setPlaylists(nextPlaylists);
    await savePlaylists(nextPlaylists);
  }, []);

  const handleAddChannel = useCallback((entry: Channel) => {
    setChannels(prev => {
      const withoutDuplicate = prev.filter(
        (channel) => channel.id !== entry.id,
      );
      const next = [...withoutDuplicate, entry];
      saveChannels(next);
      return next;
    });
  }, []);

  const handleImportChannelsJson = useCallback((entries: Channel[]) => {
    setChannels(prev => {
      const existingIds = new Set(prev.map(c => c.id));
      const next = [...prev];
      for (const entry of entries) {
        if (!existingIds.has(entry.id)) {
          next.push(entry);
          existingIds.add(entry.id);
        }
      }
      saveChannels(next);
      return next;
    });
  }, []);

  const handleDeleteChannel = useCallback((id: string) => {
    setChannels(prev => {
      const next = prev.filter((channel) => channel.id !== id);
      saveChannels(next);
      return next;
    });
  }, []);

  const handleUpdateChannel = useCallback(
    (id: string, name: string, categories: string[]) => {
      setChannels(prev => {
        const next = prev.map((channel) =>
          channel.id === id ? { ...channel, name, categories } : channel,
        );
        saveChannels(next);
        return next;
      });
    },
    [],
  );

  const handleToggleFavorite = useCallback((id: string) => {
    setChannels(prev => {
      const next = prev.map((channel) =>
        channel.id === id ? { ...channel, favorite: !channel.favorite } : channel,
      );
      saveChannels(next);
      return next;
    });
  }, []);

  const handleAddPlaylist = useCallback((entry: { id: string; name: string; url?: string; thumbnail?: string; channelName?: string; description?: string; categories: string[] }) => {
    setPlaylists(prev => {
      const withoutDuplicate = prev.filter(
        (pl) => pl.id !== entry.id && pl.url !== entry.url,
      );
      const next = [...withoutDuplicate, { ...entry, timestamp: Date.now() }];
      savePlaylists(next);
      return next;
    });
  }, []);

  const handleDeletePlaylist = useCallback((id: string) => {
    setPlaylists(prev => {
      const next = prev.filter((pl) => pl.id !== id);
      savePlaylists(next);
      return next;
    });
  }, []);

  const handleUpdatePlaylist = useCallback(
    (id: string, name: string, description: string | undefined, categories: string[]) => {
      setPlaylists(prev => {
        const next = prev.map((pl) =>
          pl.id === id ? { ...pl, name, description, categories } : pl,
        );
        savePlaylists(next);
        return next;
      });
    },
    [],
  );

  const allCategories = useMemo(
    () => {
      const categories = Array.from(new Set([
        ...channels.flatMap((c) => c.categories),
        ...playlists.flatMap((p) => p.categories),
      ])).sort((a, b) => a.localeCompare(b));
      return ['Live', ...categories];
    },
    [channels, playlists],
  );

  return (
    <>
      {showSplash && <LoadingScreen fadeOut={splashFadeOut} />}
      <BrowserRouter>
        <ScrollToTop />
        <StartupRedirect />
        {/* Mobile navigation */}
        <Navigation channels={channels} onOpenSearch={() => setShowSearch(true)} />
        {/* Desktop sidebar */}
        <Sidebar channels={channels} playlists={playlists} />
        <div className={`flex flex-col flex-1 min-h-screen pt-16 overflow-visible ${
          isRTL ? 'md:mr-64' : 'md:ml-64'
        }`}>
          <main className="flex-1 overflow-visible">
            <Suspense fallback={
              <div className="min-h-screen flex items-center justify-center dark:bg-dark-navy" style={{ minHeight: "100dvh" }}>
                <div className="flex flex-col items-center gap-4 px-6">
                  <img src={logo} alt="" className="w-16 h-16 sm:w-20 sm:h-20 object-contain opacity-50 splash-logo-pulse" />
                  <div className="flex gap-2.5">
                    <span className="w-3 h-3 rounded-full bg-brand-coral splash-dot" style={{ animationDelay: "0ms" }} />
                    <span className="w-3 h-3 rounded-full bg-brand-orange splash-dot" style={{ animationDelay: "150ms" }} />
                    <span className="w-3 h-3 rounded-full bg-brand-yellow splash-dot" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            }>
            <Routes>
              <Route
                path="/"
                element={
                  <HomePage channels={channels} onUpdate={handleUpdateChannel} onImportChannelsJson={handleImportChannelsJson} showSearch={showSearch} onCloseSearch={() => setShowSearch(false)} />
                }
              />
              <Route path="/channel/:channelId" element={<ChannelPage />} />
              <Route path="/playlist/:playlistId" element={<PlaylistCoursePage />} />
              <Route path="/video/:videoId" element={<VideoPage />} />
              <Route path="/audio/:videoId" element={<AudioPage />} />
              <Route
                path="/category/:categoryName"
                element={<CategoryPage channels={channels} />}
              />
              <Route
                path="/channels"
                element={
                  <ChannelsPage
                    channels={channels}
                    onDelete={handleDeleteChannel}
                    onUpdate={handleUpdateChannel}
                    onToggleFavorite={handleToggleFavorite}
                  />
                }
              />
              <Route
                path="/posts"
                element={<PostsPage channels={channels} />}
              />
              <Route
                path="/posts/:postId"
                element={<PostDetailPage />}
              />
              <Route
                path="/playlists"
                element={
                  <PlaylistsPage
                    playlists={playlists}
                    onDelete={handleDeletePlaylist}
                    onUpdate={handleUpdatePlaylist}
                  />
                }
              />
              <Route
                path="/settings"
                element={
                  <SettingsPage channels={channels} playlists={playlists} onUpdate={updateChannels} onUpdatePlaylists={updatePlaylists} />
                }
              />
              <Route
                path="/watch-later"
                element={<WatchLaterPage />}
              />
              <Route
                path="/history"
                element={<WatchHistoryPage />}
              />
              <Route
                path="/how-to-use"
                element={<HowToUsePage />}
              />
              <Route
                path="/favorites"
                element={<FavoritesPage />}
              />
              <Route
                path="/courses"
                element={<CoursesPage />}
              />
              <Route
                path="/courses/:id"
                element={<CourseDetailPage />}
              />
              <Route
                path="/courses/:id/dashboard"
                element={<CourseDashboardPage />}
              />
              <Route
                path="/contact"
                element={<ContactPage />}
              />
            </Routes>
          </Suspense>
        </main>
        <FloatingButton
          onAddChannel={() => setShowChannelModal(true)}
          onAddPlaylist={() => setShowPlaylistModal(true)}
        />
        {showChannelModal && (
          <AddChannelModal
            onClose={() => setShowChannelModal(false)}
            onAdd={handleAddChannel}
            existingCategories={allCategories}
          />
        )}
        {showPlaylistModal && (
          <AddPlaylistModal
            onClose={() => setShowPlaylistModal(false)}
            onAdd={handleAddPlaylist}
            existingCategories={allCategories}
          />
        )}
        <MobileAppBanner />
        <FilterModal
          isOpen={showFilterModal}
          onClose={() => setShowFilterModal(false)}
          filters={filters}
          onApply={(f) => {
            setSelectedCategory(f.selectedCategory);
            setTimeRange(f.timeRange);
            setSortBy(f.sortBy);
            setHiddenCategories(f.hiddenCategories);
          }}
          onReset={resetFilters}
          categories={allCategories}
        />
        </div>
      </BrowserRouter>
    </>
  );
}

export default App;
