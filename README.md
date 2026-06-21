# Wasla

**واصـلة** — Your curated collection of YouTube channels, playlists, and video courses.

A video platform that transforms YouTube playlists into structured learning courses. Aggregate channels, track progress, and build your personal video curriculum.

## Overview

Wasla is a comprehensive video learning platform that enables users to:
- Import and organize YouTube channels by ID, handle, or URL
- Transform YouTube playlists into structured learning courses
- Track video progress and resume playback
- Filter and search content by category, time range, and sorting options
- Experience a fully bilingual interface with Arabic (default) and English support
- Enjoy a responsive, progressive web app experience

## Key Features

### Channel Management
- Import YouTube channels via ID (`UC...`), handle (`@channelname`), or full URL
- Organize channels with custom categories
- View channel details and video lists

### Course System
- Save YouTube playlists and treat them as learning courses
- Structure content with categories and descriptions
- Track video progress and completion

### Video Playback
- Built-in mini player overlay with course-style progression
- Resume videos from where you left off
- Seamless navigation between videos

### Search & Filters
- Filter by category, publication time range (last hour, today, week, month, year)
- Sort by newest, most viewed, channel name, or category
- Full-text search across video titles and channel names

### Multilingual Support
- Arabic (default) with full RTL layout support
- English interface available
- One-click language switching

### User Experience
- Responsive grid and list views
- Progressive Web App (PWA) ready for mobile and desktop
- Dark theme by default with light mode option
- Local storage persistence (no external database)

## Technology Stack

### Frontend

| Component | Technology |
|-----------|------------|
| Framework | React 19 with TypeScript 6 |
| Build Tool | Vite 8 |
| Styling | Tailwind CSS v4 |
| Routing | React Router v7 |
| Icons | Lucide React |
| HTTP Client | Axios |

### State Management

- **React Context** for global state management
  - Language (Arabic/English with RTL/LTR support)
  - Theme (dark/light mode)
  - Video player controls

### Data Storage

- **localStorage** with `wasla_*` prefix for persistence
  - Channels and playlists
  - View preferences and settings
  - Video progress tracking
- No external database required

### Backend

- **Express 5** with TypeScript
- **YouTube RSS parsing** via `xml2js`
- **In-memory caching** with 12-minute TTL
- **Channel resolution** for handles and URLs

## Architecture

### Playlist → Course System
Playlists are transformed into mini-courses with structured learning paths. Each playlist can have:
- Custom categories
- Descriptions
- Video progress tracking
- Course-style navigation

### Video Tracking
The mini player maintains session state, allowing users to resume videos from where they left off. Combined with playlist organization, this creates a course-like learning experience.

### RTL/LTR Layout
Arabic is the default language with full right-to-left layout support. The interface seamlessly switches between RTL and LTR modes based on the selected language.

### Theme System
Dark mode is the default theme. Users can switch to light mode in settings, with preferences persisted across sessions.

## Project Structure

```
wasla/
├── frontend/
│   ├── public/
│   │   ├── favicon.png
│   │   ├── logo.png
│   │   └── manifest.json          # PWA configuration
│   └── src/
│       ├── components/            # Reusable UI components
│       │   ├── VideoCard.tsx      # Video display with metadata
│       │   ├── PlaylistCard.tsx   # Course/playlist cards
│       │   ├── Sidebar.tsx        # Navigation
│       │   ├── MiniPlayerModal.tsx # Floating video player
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
│       ├── pages/                 # Application routes
│       │   ├── HomePage.tsx       # Latest videos feed
│       │   ├── ChannelsPage.tsx   # Channel management
│       │   ├── ChannelPage.tsx    # Channel details
│       │   ├── PlaylistsPage.tsx  # Playlist management
│       │   ├── PlaylistCoursePage.tsx # Course view
│       │   ├── CategoryPage.tsx   # Category filtering
│       │   ├── SettingsPage.tsx   # User preferences
│       │   └── HowToUsePage.tsx   # Usage documentation
│       ├── context/               # Global state providers
│       │   ├── LanguageContext.tsx # i18n and RTL/LTR
│       │   ├── ThemeContext.tsx    # Dark/light theme
│       │   └── PlayerContext.tsx   # Video player state
│       ├── hooks/
│       │   └── useMeta.ts         # Document metadata
│       ├── locales/               # Translation files
│       │   ├── ar.ts              # Arabic translations
│       │   └── en.ts              # English translations
│       ├── utils/
│       │   ├── formatRelativeTime.ts
│       │   └── storageMigration.ts
│       ├── api.ts                 # HTTP client configuration
│       ├── storage.ts             # Local storage utilities
│       ├── types.ts               # TypeScript definitions
│       ├── index.css              # Tailwind CSS configuration
│       ├── App.tsx                # Application router and layout
│       └── main.tsx               # React entry point
├── backend/
│   └── src/
│       ├── index.ts               # Express server entry point
│       ├── routes/
│       │   └── channel.ts         # API endpoints
│       ├── services/
│       │   └── rssService.ts      # YouTube RSS parsing
│       ├── utils/
│       │   └── dateUtils.ts
│       └── types/
├── package.json                   # Project configuration and scripts
└── vercel.json
```

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm (or your preferred package manager)

### Installation

```bash
npm run install:all
```

This command installs all dependencies for both frontend and backend.

### Development

```bash
npm run dev
```

The development server will start with:
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3001`

### Build

```bash
npm run build
```

Build the application for production deployment.

## Important Notes

- **Arabic is the default language** — The interface is optimized for Arabic with full RTL support. Switch to English from the navigation bar.
- **Dark mode is the default theme** — Toggle to light mode in Settings. Your preference is automatically saved.
- **PWA support** — The app can be installed as a standalone application on mobile and desktop devices.
- **Local storage only** — All user data is stored in your browser's localStorage under the `wasla_*` prefix. Clearing browser data will remove your channels and playlists.

## License

This project is part of the Wasla initiative to make YouTube content more accessible and structured for learning purposes.
