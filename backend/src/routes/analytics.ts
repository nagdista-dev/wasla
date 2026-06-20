import { Router, Request, Response } from 'express';
import { trackEvent, getDashboard, clearAnalytics } from '../services/analyticsService.js';

const router = Router();

function isAuthorized(req: Request): boolean {
  const password = process.env.ADMIN_DASHBOARD_PASSWORD;
  if (!password) return false;
  const auth = req.headers.authorization;
  if (!auth) return false;
  return auth === `Bearer ${password}`;
}

router.post('/track', (req: Request, res: Response) => {
  try {
    const { type, path, videoId, visitorId, timestamp } = req.body;

    if (!type || !visitorId || !timestamp) {
      return res.status(400).json({ success: false, error: 'Missing required fields: type, visitorId, timestamp' });
    }

    if (!['pageview', 'videoclick', 'visitor'].includes(type)) {
      return res.status(400).json({ success: false, error: 'Invalid event type' });
    }

    trackEvent({ type, path, videoId, visitorId, timestamp });
    res.json({ success: true });
  } catch (error) {
    console.error('Error tracking event:', error);
    res.status(500).json({ success: false, error: 'Failed to track event' });
  }
});

router.get('/dashboard', (req: Request, res: Response) => {
  if (!isAuthorized(req)) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    const data = getDashboard();
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch dashboard data' });
  }
});

router.delete('/dashboard', (req: Request, res: Response) => {
  if (!isAuthorized(req)) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    clearAnalytics();
    res.json({ success: true, message: 'Analytics data cleared' });
  } catch (error) {
    console.error('Error clearing analytics:', error);
    res.status(500).json({ success: false, error: 'Failed to clear analytics data' });
  }
});

export default router;
