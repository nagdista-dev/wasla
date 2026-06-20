import { api } from '../api';

const VISITOR_KEY = 'wasla_visitor_id';

function getVisitorId(): string {
  let id = localStorage.getItem(VISITOR_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(VISITOR_KEY, id);
  }
  return id;
}

let lastTrackedPath = '';

export function trackPageView(path: string) {
  if (path === lastTrackedPath) return;
  lastTrackedPath = path;

  const visitorId = getVisitorId();
  api.post('/analytics/track', {
    type: 'pageview',
    path,
    visitorId,
    timestamp: Date.now(),
  }).catch(() => {});
}

export function trackVideoClick(videoId: string) {
  const visitorId = getVisitorId();
  api.post('/analytics/track', {
    type: 'videoclick',
    videoId,
    visitorId,
    timestamp: Date.now(),
  }).catch(() => {});
}

export function trackVisitor() {
  const visitorId = getVisitorId();
  api.post('/analytics/track', {
    type: 'visitor',
    visitorId,
    timestamp: Date.now(),
  }).catch(() => {});
}

export interface DashboardData {
  totalVisits: number;
  uniqueVisitors: number;
  pageViews: { path: string; count: number }[];
  videoClicks: { videoId: string; count: number }[];
  dailyVisits: { date: string; count: number }[];
}

export async function fetchDashboard(password: string): Promise<DashboardData> {
  const res = await api.get('/analytics/dashboard', {
    headers: { Authorization: `Bearer ${password}` },
  });
  return res.data.data;
}

export async function clearAnalytics(password: string): Promise<void> {
  await api.delete('/analytics/dashboard', {
    headers: { Authorization: `Bearer ${password}` },
  });
}
