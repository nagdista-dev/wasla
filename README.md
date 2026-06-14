# Wasla

A video platform that turns YouTube playlists into structured learning courses. Aggregate channels, track progress, and build your personal video curriculum.

> **واصـلة** — Your curated collection of YouTube channels, playlists, and video courses.

## Features

- **Channels system** — Add YouTube channels by ID (`UC...`), handle (`@channelname`), or full URL. Organize them with custom categories.
- **Playlists as courses** — Save YouTube playlists and treat them as learning courses with structured content.
- **Video player system** — Built-in mini player overlay + internal playback with course-style progression.
- **Progress tracking** — Resume videos where you left off, mark content as watched.
- **Search and filters** — Filter by category, time range, sort by newest/views/channel/category. Full-text search across titles and channel names.
- **Multilingual support** — Arabic (default) with full RTL layout and English. One-click language switching.
- **Responsive grid/list views** — Toggle between compact grid and detailed list layout.
- **PWA ready** — Installable as a standalone app on mobile and desktop.

## Tech Stack

### Frontend

| Layer | Technology |
|---|---|
| Framework | React 19 + TypeScript 6 |
| Build tool | Vite 8 |
| Styling | Tailwind CSS v4 |
| Routing | React Router v7 |
| Icons | Lucide React |
| HTTP | Axios |

### State & Persistence

- **React Context** for global state: language (Arabic/English), theme (dark/light), and video player.
- **localStorage** (`wasla_*` prefix) for channels, playlists, view preferences, and progress tracking.
- No external database — all user data lives in the browser.

### Backend

- Express 5 + TypeScript
- YouTube RSS feed parsing via `xml2js`
- In-memory caching with request deduplication (12-minute TTL)
- Channel handle/URL resolution

## Key Concepts

### Playlist → Course system
Playlists are treated as mini-courses. Each playlist can have categories, a description, and tracked video progress — turning a simple YouTube playlist into a structured learning path.

### Video tracking
The mini player remembers your session. When you re-open a video, playback resumes from where you left off. Combined with playlist-based organization, this enables course-style consumption.

### RTL/LTR layout
Arabic is the default language. The entire UI flips seamlessly between RTL and LTR based on the selected language, including navigation, text alignment, and spacing.

### Theme system
Dark mode is the default theme. Light mode is available via the settings panel. Theme preference is persisted across sessions.

## Project Structure

```
wasla/
├── frontend/
│   ├── public/
│   │   ├── favicon.png
│   │   ├── logo.png
│   │   └── manifest.json          # PWA manifest
│   └── src/
│       ├── components/            # Reusable UI components
│       │   ├── VideoCard.tsx      # Video thumbnail, metadata, channel badge
│       │   ├── PlaylistCard.tsx   # Playlist/course card
│       │   ├── Sidebar.tsx        # Navigation sidebar
│       │   ├── MiniPlayerModal.tsx # Floating video overlay
│       │   ├── AddChannelModal.tsx
│       │   ├── EditChannelModal.tsx
│       │   ├── AddPlaylistModal.tsx
│       │   ├── EditPlaylistModal.tsx
│       │   ├── ConfirmActionModal.tsx
│       │   ├── ConfirmDeleteModal.tsx
│       │   ├── CustomFilterDropdown.tsx
│       │   ├── FilterDropdown.tsx
│       │   ├── FloatingButton.tsx
│       │   ├── FeatureCard.tsx
│       │   ├── MobileAppBanner.tsx
│       │   └── Toast.tsx
│       ├── pages/                 # Route-level page components
│       │   ├── HomePage.tsx       # Latest videos feed
│       │   ├── ChannelsPage.tsx   # Channel management
│       │   ├── ChannelPage.tsx    # Single channel detail
│       │   ├── PlaylistsPage.tsx  # Playlist/course management
│       │   ├── PlaylistCoursePage.tsx # Course view with progress
│       │   ├── CategoryPage.tsx   # Filter by category
│       │   ├── SettingsPage.tsx   # Theme, language, data management
│       │   └── HowToUsePage.tsx   # Usage guide
│       ├── context/               # React context providers
│       │   ├── LanguageContext.tsx # i18n + RTL/LTR switching
│       │   ├── ThemeContext.tsx    # Dark/light theme
│       │   └── PlayerContext.tsx   # Video player state
│       ├── hooks/
│       │   └── useMeta.ts         # Document meta tags
│       ├── locales/               # Translation dictionaries
│       │   ├── ar.ts              # Arabic (default)
│       │   └── en.ts              # English
│       ├── utils/
│       │   ├── formatRelativeTime.ts
│       │   └── storageMigration.ts
│       ├── api.ts                 # Axios client
│       ├── storage.ts             # localStorage load/save (wasla_* keys)
│       ├── types.ts               # Shared TypeScript types
│       ├── index.css              # Tailwind v4 config + global styles
│       ├── App.tsx                # Router + layout
│       └── main.tsx               # Entry point
├── backend/
│   └── src/
│       ├── index.ts               # Express server entry
│       ├── routes/
│       │   └── channel.ts         # API endpoints
│       ├── services/
│       │   └── rssService.ts      # YouTube RSS parsing
│       ├── utils/
│       │   └── dateUtils.ts
│       └── types/
├── package.json                   # Root orchestration scripts
└── vercel.json
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Install

```bash
npm run install:all
```

### Development

```bash
npm run dev
```

Frontend runs on `http://localhost:5173`, backend on `http://localhost:3001`.

### Build

```bash
npm run build
```

## Important Notes

- **Arabic is the default language** — The UI ships in Arabic out of the box. Switch to English from the navigation bar.
- **Dark mode is the default theme** — Toggle to light mode in Settings. Preference is saved automatically.
- **PWA install support** — Supported browsers will prompt install. On mobile, add to home screen for an app-like experience.
- **No external database** — All data is stored in your browser's localStorage under the `wasla_*` prefix. Clearing browser data will remove your channels and playlists.
