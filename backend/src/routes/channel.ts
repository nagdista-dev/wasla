import { Router, Request, Response } from 'express';
import { fetchChannelData, clearCache, getCacheStats, resolveChannelId } from '../services/rssService.js';
import { ChannelResponse } from '../types/index.js';

const router = Router();

router.get('/channel/:identifier', async (req: Request, res: Response) => {
  try {
    const identifier = req.params.identifier as string;

    if (!identifier) {
      const response: ChannelResponse = {
        success: false,
        error: 'Channel identifier is required',
      };
      return res.status(400).json(response);
    }

    let channelId = identifier;
    if (!identifier.startsWith('UC')) {
      const resolved = await resolveChannelId(identifier);
      if (!resolved) {
        const response: ChannelResponse = {
          success: false,
          error: 'Could not resolve channel. Please provide a valid channel ID, @handle, or YouTube URL.',
        };
        return res.status(404).json(response);
      }
      channelId = resolved;
    }

    const data = await fetchChannelData(channelId);
    const response: ChannelResponse = {
      success: true,
      data,
      cached: Boolean(data.cached),
    };
    res.json(response);
  } catch (error) {
    console.error(`Error fetching channel ${req.params.identifier}:`, error);
    const response: ChannelResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch channel data',
    };
    res.status(500).json(response);
  }
});

router.get('/resolve/:identifier', async (req: Request, res: Response) => {
  try {
    const identifier = req.params.identifier as string;
    const channelId = await resolveChannelId(identifier);
    
    if (!channelId) {
      return res.status(404).json({ success: false, error: 'Could not resolve channel' });
    }
    
    res.json({ success: true, channelId });
  } catch (error) {
    console.error(`Error resolving channel ${req.params.identifier}:`, error);
    res.status(500).json({ success: false, error: 'Failed to resolve channel' });
  }
});

router.delete('/cache', (_req: Request, res: Response) => {
  clearCache();
  res.json({ success: true, message: 'Cache cleared' });
});

router.get('/cache/stats', (_req: Request, res: Response) => {
  res.json(getCacheStats());
});

export default router;