import { Router, Request, Response } from 'express';
import { fetchChannelData, fetchChannelDetails, clearAllCaches, getCacheStats, resolveChannelId, fetchPlaylistData, getChannelPlaylists, fetchCommunityPostsXml } from '../services/rssService.js';
import { ChannelResponse, ChannelFeedData, CacheEntry, ChannelDetailsResponse, PlaylistResponse, ChannelPlaylistsResponse, PlaylistSummary } from '../types/index.js';

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

router.get('/channel/:identifier/videos', async (req: Request, res: Response) => {
  try {
    const identifier = Array.isArray(req.params.identifier) ? req.params.identifier[0] : req.params.identifier;

    if (!identifier) {
      return res.status(400).json({ success: false, error: 'Channel identifier is required' });
    }

    let channelId = identifier;
    let handle: string | undefined;

    if (!identifier.startsWith('UC') || identifier.length !== 24) {
      const resolved = await resolveChannelId(identifier);
      if (!resolved) {
        return res.status(404).json({ success: false, error: 'Could not resolve channel' });
      }
      channelId = resolved;
      if (!identifier.startsWith('UC')) handle = identifier.replace(/^@/, '');
    }

    const data = await fetchChannelDetails(channelId, handle);
    const response: ChannelDetailsResponse = { success: true, data };
    res.json(response);
  } catch (error) {
    const id = Array.isArray(req.params.identifier) ? req.params.identifier[0] : req.params.identifier;
    console.error(`Error fetching channel details ${id}:`, error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed to fetch channel details' });
  }
});

router.get('/channel/:identifier/playlists', async (req: Request, res: Response) => {
  try {
    const identifier = Array.isArray(req.params.identifier) ? req.params.identifier[0] : req.params.identifier;

    if (!identifier) {
      return res.status(400).json({ success: false, channelId: '', channelName: '', playlists: [] });
    }

    let channelId = identifier;

    if (!identifier.startsWith('UC') || identifier.length !== 24) {
      const resolved = await resolveChannelId(identifier);
      if (!resolved) {
        return res.status(404).json({ success: false, channelId: '', channelName: '', playlists: [] });
      }
      channelId = resolved;
    }

    let channelName = 'Unknown Channel';
    try {
      const details = await fetchChannelDetails(channelId);
      channelName = details.channelName;
    } catch {
    }

    try {
      const playlists = await getChannelPlaylists(channelId);
      const response: ChannelPlaylistsResponse = {
        success: true,
        channelId,
        channelName,
        playlists,
      };
      res.json(response);
    } catch (error) {
      console.error(`Error fetching playlists for channel ${channelId}:`, error);
      const response: ChannelPlaylistsResponse = {
        success: false,
        channelId,
        channelName,
        playlists: [],
      };
      res.json(response);
    }
  } catch (error) {
    const id = Array.isArray(req.params.identifier) ? req.params.identifier[0] : req.params.identifier;
    console.error(`Error fetching channel playlists ${id}:`, error);
    res.status(500).json({ success: false, channelId: '', channelName: '', playlists: [] });
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

router.get('/community/:channelId', async (req: Request, res: Response) => {
  try {
    const channelId = Array.isArray(req.params.channelId) ? req.params.channelId[0] : req.params.channelId;
    if (!channelId) {
      return res.status(400).json({ success: false, error: 'Channel ID is required' });
    }

    const data = await fetchCommunityPostsXml(channelId);
    res.json({ success: true, ...data });
  } catch (error) {
    const channelId = Array.isArray(req.params.channelId) ? req.params.channelId[0] : req.params.channelId;
    console.error(`Error fetching community posts for ${channelId}:`, error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch community posts',
    });
  }
});

router.get('/playlist/:id', async (req: Request, res: Response) => {
  const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  try {
    if (!idParam) {
      const response: PlaylistResponse = {
        success: false,
        error: 'Playlist ID is required',
      };
      return res.status(400).json(response);
    }

    const data = await fetchPlaylistData(idParam);
    const response: PlaylistResponse = {
      success: true,
      data: {
        playlistId: idParam,
        playlistName: data.playlistName,
        channelName: data.channelName,
        videos: data.videos,
      },
    };
    res.json(response);
  } catch (error) {
    console.error(`Error fetching playlist ${idParam}:`, error);
    const response: PlaylistResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch playlist data',
    };
    res.status(500).json(response);
  }
});

router.delete('/cache', (_req: Request, res: Response) => {
  clearAllCaches();
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
        .filter((cat: string, index: number, self: string[]) => self.indexOf(cat) === index);

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
