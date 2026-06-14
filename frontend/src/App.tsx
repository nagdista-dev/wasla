import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useLocation,
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
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import FloatingButton from "./components/FloatingButton";
import AddChannelModal from "./components/AddChannelModal";
import ChannelsPage from "./pages/ChannelsPage";
import HomePage from "./pages/HomePage";
import ChannelPage from "./pages/ChannelPage";
import CategoryPage from "./pages/CategoryPage";
import SettingsPage from "./pages/SettingsPage";
import PlaylistsPage from "./pages/PlaylistsPage";
import MobileAppBanner from "./components/MobileAppBanner";
import MiniPlayerModal from "./components/MiniPlayerModal";
import type { Channel } from "./types";
import { loadChannels, saveChannels } from "./storage";
import { useLanguage } from "./context/LanguageContext";
import { useTheme } from "./context/ThemeContext";
import Sidebar from "./components/Sidebar";
import logo from "./assets/logo.png";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function Navigation({ channels }: { channels: Channel[] }) {
  const { pathname } = useLocation();
  const { language, setLanguage, isRTL } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const navItems = [
    { path: "/", label: "Home", icon: Home },
    { path: "/channels", label: "Channels", icon: Users },
    { path: "/playlists", label: "Playlists", icon: Heart },
    { path: "/settings", label: "Settings", icon: Settings },
  ];
  const categories = useMemo(
    () =>
      Array.from(new Set(channels.flatMap((c) => c.categories))).sort((a, b) =>
        a.localeCompare(b),
      ),
    [channels],
  );

  const closeMenu = () => setMenuOpen(false);

  return (
 <nav className="fixed top-0 left-0 right-0 min-h-fit z-50 border-b border-gray-200 bg-white/90 backdrop-blur-md dark:border-gray-700 dark:bg-dark-navy/90">
  <div className="mx-auto max-w-7xl px-4">
    <div className="flex items-center justify-between h-16">
      <div className="flex items-center">
        <Link to="/">
          <img src={logo} alt="Wasla" className="h-18 w-18 object-contain" />
        </Link>
      </div>

      <div className="hidden md:flex items-center justify-center gap-1">
        {navItems.map((item) => {
          const isActive = pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-brand-coral/10 text-brand-coral"
                  : "text-gray-700 hover:bg-gray-100 hover:text-brand-coral dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-brand-coral"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={toggleTheme}
          className="rounded-md p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/10"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </button>

        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as "en" | "ar")}
          className="hidden md:block rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 focus:border-brand-coral focus:ring-brand-coral dark:border-gray-600 dark:bg-dark-navy dark:text-gray-300"
        >
          <option value="en">English</option>
          <option value="ar">العربية</option>
        </select>

        <button
          onClick={() => setMenuOpen(true)}
          className="md:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/10"
          aria-label="Menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>
    </div>
  </div>

  {menuOpen && (
    <div className="fixed inset-0 z-50 md:hidden">
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={closeMenu}
      />

      <div
        className={`fixed top-0 ${
          isRTL ? "left-0" : "right-0"
        } h-dvh w-64 bg-white shadow-2xl dark:bg-dark-navy flex flex-col ${
          isRTL ? "animate-slide-in-rtl" : "animate-slide-in"
        }`}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4 dark:border-gray-700 flex-shrink-0">
          <Link to="/" className="flex items-center">
            <img src={logo} alt="Wasla" className="h-12 w-12 object-contain" />
          </Link>

          <button
            onClick={closeMenu}
            className="rounded-md p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/10"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col p-4 space-y-1 flex-shrink-0">
          {navItems.map((item) => {
            const isActive = pathname === item.path;

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
                  <span className="ml-auto h-2 w-2 rounded-full bg-white" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Categories (scroll area) */}
        {categories.length > 0 && (
          <div className="flex flex-col flex-1 min-h-0 border-t border-gray-200 dark:border-gray-700">
            <div className="px-4 pt-2 flex-0">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                Categories
              </p>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 dark:scrollbar-thumb-gray-600 dark:scrollbar-track-gray-800 px-2 pb-4">
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
        )}
      </div>
    </div>
  )}
</nav>
  );
}

function App() {
  const [channels, setChannels] = useState<Channel[]>(loadChannels);
  const [showModal, setShowModal] = useState(false);

  const updateChannels = (nextChannels: Channel[]) => {
    setChannels(nextChannels);
    saveChannels(nextChannels);
  };

  const handleAddChannel = (entry: Channel) => {
    const withoutDuplicate = channels.filter(
      (channel) => channel.id !== entry.id,
    );
    updateChannels([...withoutDuplicate, entry]);
  };

  const handleDeleteChannel = (id: string) => {
    const nextChannels = channels.filter((channel) => channel.id !== id);
    updateChannels(nextChannels);
  };

  const handleUpdateChannel = (
    id: string,
    name: string,
    categories: string[],
  ) => {
    const nextChannels = channels.map((channel) =>
      channel.id === id ? { ...channel, name, categories } : channel,
    );
    updateChannels(nextChannels);
  };

  const handleToggleFavorite = (id: string) => {
    const nextChannels = channels.map((channel) =>
      channel.id === id ? { ...channel, favorite: !channel.favorite } : channel,
    );
    updateChannels(nextChannels);
  };

  return (
    <BrowserRouter>
      <ScrollToTop />
      {/* Mobile navigation */}
      <Navigation channels={channels} />
      {/* Desktop sidebar */}
      <Sidebar channels={channels} />
      <div className="flex flex-col flex-1 min-h-screen md:ml-64 pt-16">
        <main className="flex-1">
          <Routes>
            <Route
              path="/"
              element={
                <HomePage channels={channels} onUpdate={handleUpdateChannel} />
              }
            />
            <Route path="/channel/:channelId" element={<ChannelPage />} />
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
            <Route path="/playlists" element={<PlaylistsPage />} />
            <Route
              path="/settings"
              element={
                <SettingsPage channels={channels} onUpdate={updateChannels} />
              }
            />
          </Routes>
        </main>
        <FloatingButton onClick={() => setShowModal(true)} />
        {showModal && (
          <AddChannelModal
            onClose={() => setShowModal(false)}
            onAdd={handleAddChannel}
            existingCategories={Array.from(
              new Set(channels.flatMap((c) => c.categories)),
            )}
          />
        )}
        <MobileAppBanner />
        <MiniPlayerModal />
      </div>
    </BrowserRouter>
  );
}

export default App;
