import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { Home, Users, Settings, Heart, Menu } from 'lucide-react';
import { useState } from 'react';
import FloatingButton from './components/FloatingButton';
import AddChannelModal from './components/AddChannelModal';
import ChannelsPage from './pages/ChannelsPage';
import HomePage from './pages/HomePage';
import SettingsPage from './pages/SettingsPage';
import PlaylistsPage from './pages/PlaylistsPage';
import type { Channel } from './types';
import { loadChannels, saveChannels } from './storage';
import { useLanguage } from './context/LanguageContext';

function Navigation() {
  const { language, setLanguage, isRTL: _isRTL } = useLanguage();
  const navItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/channels', label: 'Channels', icon: Users },
    { path: '/playlists', label: 'Playlists', icon: Heart },
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-gray-200 bg-white shadow-sm">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex h-16 justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="text-xl font-bold text-blue-600">
              Wasla
            </Link>
            <div className="hidden items-center gap-1 md:flex">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className="flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 hover:text-blue-600"
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
            <div className="flex items-center gap-4">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as 'en' | 'ar')}
                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 hidden md:block"
              >
                <option value="en">English</option>
                <option value="ar">العربية</option>
              </select>
              <div className="flex items-center gap-4">
                <button className="p-2 rounded-md hover:bg-gray-100" aria-label="Menu">
                  <Menu className="h-5 w-5" />
                </button>
              </div>
            </div>
        </div>
      </div>
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
    const withoutDuplicate = channels.filter((channel) => channel.id !== entry.id);
    updateChannels([...withoutDuplicate, entry]);
  };

  const handleDeleteChannel = (id: string) => {
    const nextChannels = channels.filter((channel) => channel.id !== id);
    updateChannels(nextChannels);
  };

  return (
    <BrowserRouter>
      <div className="flex min-h-screen flex-col">
        <Navigation />
        <main className="flex-1 pt-16">
          <Routes>
            <Route path="/" element={<HomePage channels={channels} />} />
            <Route
              path="/channels"
              element={
                <ChannelsPage
                  channels={channels}
                  onAdd={(entry) => {
                    handleAddChannel(entry);
                    setShowModal(false);
                  }}
                  onDelete={handleDeleteChannel}
                />
              }
            />
            <Route path="/playlists" element={<PlaylistsPage />} />
            <Route path="/settings" element={<SettingsPage channels={channels} onUpdate={updateChannels} />} />
          </Routes>
        </main>
        <FloatingButton onClick={() => setShowModal(true)} />
        {showModal && <AddChannelModal onClose={() => setShowModal(false)} onAdd={handleAddChannel} />}
      </div>
    </BrowserRouter>
  );
}

export default App;
