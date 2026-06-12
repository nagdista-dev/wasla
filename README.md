# Wasla

A full-stack YouTube channel feed aggregator built with React, Express, and TypeScript. Track latest videos from your favorite YouTube channels in one place.

## Features

- **Multi-channel feed**: Add multiple YouTube channels and view their latest videos
- **Flexible channel input**: Add channels by ID (`UC...`), handle (`@channelname`), or full YouTube URL
- **Real-time data**: Fetches latest videos via YouTube RSS feeds with 12-minute caching
- **Bilingual support**: English and Arabic with RTL layout support
- **Responsive UI**: Grid and list view modes, dark/light theme ready
- **Local storage**: Channels persist in browser localStorage

## Tech Stack

### Frontend
- React 19 + TypeScript
- Vite for fast development and building
- Tailwind CSS v4 for styling
- React Router v7 for navigation
- Lucide React for icons
- Axios for API requests

### Backend
- Express 5 + TypeScript
- xml2js for RSS feed parsing
- Native fetch for HTTP requests
- In-memory caching with deduplication

## Project Structure

```
wasla/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── pages/           # Page components (Home, Channels, Playlists, Settings)
│   │   ├── context/         # React context (LanguageContext)
│   │   ├── api.ts           # Axios API client
│   │   ├── storage.ts       # LocalStorage utilities
│   │   └── types.ts         # TypeScript types
│   └── package.json
├── backend/                  # Express backend API
│   ├── src/
│   │   ├── routes/          # API routes (channel.ts)
│   │   ├── services/        # Business logic (rssService.ts)
│   │   ├── utils/           # Utilities (dateUtils.ts)
│   │   ├── types/           # TypeScript types
│   │   └── index.ts         # Entry point
│   └── package.json
└── package.json             # Root workspace scripts
```

## Getting Started

### Prerequisites
- Node.js 18+
- npm

### Installation

```bash
# Install all dependencies
npm run install:all
```

### Development

```bash
# Run both frontend and backend concurrently
npm run dev
```

Frontend runs on `http://localhost:5173`, backend on `http://localhost:3001`.

### Build

```bash
# Build both frontend and backend
npm run build
```

### Production

```bash
# Start production backend server
npm run start
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/hello` | Health check |
| GET | `/api/health` | Backend status |
| GET | `/api/channel/:identifier` | Fetch channel data (ID, @handle, or URL) |
| GET | `/api/resolve/:identifier` | Resolve channel identifier to UC ID |
| DELETE | `/api/cache` | Clear server cache |
| GET | `/api/cache/stats` | View cache statistics |

## Usage

1. **Add a channel**: Click the floating `+` button or "Add Channel" on the Channels page
2. **Enter channel info**: Provide a YouTube channel ID (`UC...`), handle (`@channelname`), or full URL
3. **View latest videos**: Home page shows latest video from each channel
4. **Manage channels**: Channels page lets you view/delete added channels
5. **Switch language**: Use the language selector in the navigation bar (English/Arabic)

## Environment Variables

### Backend (.env)
```env
PORT=3001
```

## License

ISC