import { Router, Request, Response } from 'express';
import { fetchChannelData, clearCache, getCacheStats, resolveChannelId } from '../services/rssService.js';
import { ChannelResponse, ChannelFeedData, CacheEntry } from '../types/index.js';

const router = Router();

router.get('/channel/:identifier', async (req: Request, res: Response) => {
  try {
    const identifier = Array.isArray(req.params.identifier) ? req.params.identifier[0] : req.params.identifier;

    if (!identifier) {
      const response: ChannelResponse = {
        success: false,
        error: 'Channel identifier is required',
      };
      return res.status(400).json(response);
    }

    let channelId = identifier;
    if (!identifier.startsWith('UC') || identifier.length !== 24) {
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
    const id = Array.isArray(req.params.identifier) ? req.params.identifier[0] : req.params.identifier;
    console.error(`Error fetching channel ${id}:`, error);
    const response: ChannelResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch channel data',
    };
    res.status(500).json(response);
  }
});

router.get('/resolve/:identifier', async (req: Request, res: Response) => {
  try {
    const identifier = Array.isArray(req.params.identifier) ? req.params.identifier[0] : req.params.identifier;
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

router.patch('/channel/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, categories } = req.body;

    if (!id) {
      const response: ChannelResponse = {
        success: false,
        error: 'Channel ID is required',
      };
      return res.status(400).json(response);
    }

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      const response: ChannelResponse = {
        success: false,
        error: 'Channel name is required and must not be empty',
      };
      return res.status(400).json(response);
    }

    const trimmedName = name.trim();
    if (trimmedName.length > 100) {
      const response: ChannelResponse = {
        success: false,
        error: 'Channel name must be 100 characters or less',
      };
      return res.status(400).json(response);
    }

    const existingChannels = getCacheStats();
    const existingChannel = existingChannels.entries.find((entry) => entry.id === id);

    if (existingChannel) {
      const existingName = existingChannel.data.channelName;
      const existingId = existingChannel.id;

      const hasDuplicate = existingChannels.entries.some((entry) => {
        if (entry.id === existingId) return false;
        return entry.data.channelName.toLowerCase() === trimmedName.toLowerCase();
      });

      if (hasDuplicate) {
        const response: ChannelResponse = {
          success: false,
          error: 'A channel with this name already exists',
        };
        return res.status(409).json(response);
      }
    }

    const updatedData: ChannelFeedData = {
      channelName: trimmedName,
      videos: existingChannel?.data.videos || [],
      latestVideo: existingChannel?.data.latestVideo || {} as any,
      cached: existingChannel?.data.cached || false,
    };

    if (categories) {
      if (!Array.isArray(categories)) {
        const response: ChannelResponse = {
          success: false,
          error: 'Categories must be an array',
        };
        return res.status(400).json(response);
      }

      const validCategories = categories
        .filter((cat: string) => cat && typeof cat === 'string' && cat.trim().length > 0)
        .map((cat: string) => cat.trim())
        .filter((cat: string, index: number, self: string[]) => self.indexOf(cat) === index)
        .slice(0, 10);

      updatedData.channelName = trimmedName;
      updatedData.videos = existingChannel?.data.videos || [];
      updatedData.latestVideo = existingChannel?.data.latestVideo || {} as any;
      updatedData.cached = existingChannel?.data.cached || false;
    }

    const response: ChannelResponse = {
      success: true,
      data: updatedData,
    };
    res.json(response);
  } catch (error) {
    console.error(`Error updating channel ${req.params.id}:`, error);
    const response: ChannelResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update channel',
    };
    res.status(500).json(response);
  }
});

export default router;