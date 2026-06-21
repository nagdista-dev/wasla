import { Router, Request, Response } from 'express';
import { createShare, getShare } from '../services/shareService.js';

const router = Router();

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://wasla.app';
const DEEP_LINK_SCHEME = 'wasla';

router.post('/api/shares', (req: Request, res: Response) => {
  try {
    const { categoryName, channels } = req.body;

    if (!categoryName || typeof categoryName !== 'string' || categoryName.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Category name is required' });
    }

    if (!Array.isArray(channels) || channels.length === 0) {
      return res.status(400).json({ success: false, error: 'At least one channel is required' });
    }

    for (const ch of channels) {
      if (!ch.id || !ch.name) {
        return res.status(400).json({ success: false, error: 'Each channel must have an id and name' });
      }
    }

    const share = createShare(categoryName.trim(), channels);
    res.json({ success: true, data: share });
  } catch (error) {
    console.error('Error creating share:', error);
    res.status(500).json({ success: false, error: 'Failed to create share' });
  }
});

router.get('/api/shares/:shareId', (req: Request, res: Response) => {
  try {
    const shareIdParam = req.params.shareId;
    const shareId = Array.isArray(shareIdParam) ? shareIdParam[0] : shareIdParam;
    if (!shareId) {
      res.status(400).json({ success: false, error: 'Share ID is required' });
      return;
    }

    const share = getShare(shareId);
    if (!share) {
      res.status(404).json({ success: false, error: 'Share not found' });
      return;
    }

    res.json({ success: true, data: share });
  } catch (error) {
    console.error('Error fetching share:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch share' });
  }
});

function renderShareNotFound(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Wasla - Share Not Found</title>
  <meta property="og:title" content="Wasla" />
  <meta property="og:description" content="This shared category was not found or has expired." />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Wasla" />
  <meta name="twitter:card" content="summary_large_image" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #0a1128; color: #fff; }
    .card { text-align: center; padding: 2rem; }
    h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
    p { color: #94a3b8; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Share Not Found</h1>
    <p>This shared category was not found or has expired.</p>
  </div>
</body>
</html>`;
}

function renderSharePage(shareId: string, categoryName: string, channelCount: number): string {
  const title = `${categoryName} - Wasla`;
  const description = `Shared from Wasla • ${channelCount} ${channelCount === 1 ? 'Channel' : 'Channels'}`;
  const url = `${FRONTEND_URL}/s/${shareId}`;
  const image = `${FRONTEND_URL}/logo.png`;
  const deepLink = `${DEEP_LINK_SCHEME}://s/${shareId}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <meta name="description" content="${description}" />
  <meta property="og:title" content="${categoryName}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:image" content="${image}" />
  <meta property="og:url" content="${url}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Wasla" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${categoryName}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${image}" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #0a1128; color: #fff; }
    .card { background: #1e293b; border-radius: 1.5rem; padding: 2.5rem; max-width: 420px; width: 90%; text-align: center; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); }
    .badge { display: inline-block; background: rgba(226, 67, 106, 0.15); color: #e2436a; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; padding: 0.35rem 0.75rem; border-radius: 999px; margin-bottom: 1rem; border: 1px solid rgba(226, 67, 106, 0.3); }
    h1 { font-size: 1.75rem; font-weight: 800; margin-bottom: 0.5rem; }
    p { color: #94a3b8; font-size: 1rem; margin-bottom: 1.5rem; }
    .btn { display: inline-block; background: #e2436a; color: #fff; padding: 0.75rem 2rem; border-radius: 0.75rem; text-decoration: none; font-weight: 600; font-size: 1rem; transition: background 0.2s; }
    .btn:hover { background: #d13a5e; }
    .brand { display: flex; align-items: center; justify-content: center; gap: 0.5rem; margin-top: 2rem; color: #64748b; font-size: 0.875rem; }
    .brand svg { width: 24px; height: 24px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">Shared</div>
    <h1>${categoryName}</h1>
    <p>${channelCount} ${channelCount === 1 ? 'Channel' : 'Channels'}</p>
    <a class="btn" href="${url}" onclick="event.preventDefault();var s=document.getElementById('s');s.style.display='flex'">Import Category</a>
    <div id="s" style="display:none;align-items:center;justify-content:center;gap:0.75rem;margin-top:1rem;flex-wrap:wrap">
      <p style="color:#94a3b8;font-size:0.875rem;margin:0">Choose how to open:</p>
      <a class="btn" href="${deepLink}" style="padding:0.5rem 1.25rem;font-size:0.875rem">Open in App</a>
      <a class="btn" href="${url}" style="padding:0.5rem 1.25rem;font-size:0.875rem;background:#334155">Open in Browser</a>
    </div>
    <div class="brand">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
      Wasla
    </div>
  </div>
  <script>
    (function() {
      var ua = navigator.userAgent;
      var isCrawler = /bot|crawl|spider|facebook|twitter|whatsapp|telegram|linkedin/i.test(ua);
      if (!isCrawler && !window.__redirected) {
        window.__redirected = true;
        var appUrl = "${deepLink}";
        var webUrl = "${url}";
        var timeout = setTimeout(function() { window.location.href = webUrl; }, 800);
        window.location.href = appUrl;
      }
    })();
  </script>
</body>
</html>`;
}

function handleShareRequest(req: Request, res: Response): void {
  try {
    const shareIdParam = req.params.shareId;
    const shareId = Array.isArray(shareIdParam) ? shareIdParam[0] : shareIdParam;
    if (!shareId) {
      res.status(404).send('Not found');
      return;
    }

    const share = getShare(shareId);
    if (!share) {
      res.status(404).send(renderShareNotFound());
      return;
    }

    const channelCount = share.channels.length;
    const html = renderSharePage(shareId, share.categoryName, channelCount);

    res.set('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    res.send(html);
  } catch (error) {
    console.error('Error rendering shared page:', error);
    res.status(500).send('Internal server error');
  }
}

router.get('/shared/:shareId', handleShareRequest);
router.get('/s/:shareId', handleShareRequest);

export default router;
