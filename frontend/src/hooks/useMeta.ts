import { useEffect } from 'react';

const DEFAULT_DESCRIPTION = 'Your curated collection of YouTube channels, playlists, and video courses.';
const DEFAULT_IMAGE = '/logo.png';

function setMeta(name: string, content: string) {
  let el = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    if (name.startsWith('og:') || name.startsWith('twitter:')) {
      el.setAttribute('property', name);
    } else {
      el.setAttribute('name', name);
    }
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

export function useMeta(opts?: {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
}) {
  useEffect(() => {
    const appName = localStorage.getItem('wasla_language') === 'ar' ? 'وصـلة' : 'Wasla';
    const title = opts?.title ? `${opts.title} — ${appName}` : appName;
    const description = opts?.description || DEFAULT_DESCRIPTION;
    const image = opts?.image || DEFAULT_IMAGE;
    const url = opts?.url || window.location.href;

    document.title = title;
    setMeta('description', description);
    setMeta('og:title', title);
    setMeta('og:description', description);
    setMeta('og:image', image);
    setMeta('og:url', url);
    setMeta('og:type', 'website');
    setMeta('og:site_name', appName);
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', title);
    setMeta('twitter:description', description);
    setMeta('twitter:image', image);

    return () => {
      document.title = appName;
    };
  }, [opts?.title, opts?.description, opts?.image, opts?.url]);
}
