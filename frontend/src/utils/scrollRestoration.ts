const SCROLL_KEY = 'wasla_home_scroll';

export function saveHomeScroll(): void {
  try {
    sessionStorage.setItem(SCROLL_KEY, String(window.scrollY));
  } catch {}
}

export function getHomeScroll(): number {
  try {
    const val = sessionStorage.getItem(SCROLL_KEY);
    return val ? parseInt(val, 10) : 0;
  } catch {
    return 0;
  }
}

export function clearHomeScroll(): void {
  try {
    sessionStorage.removeItem(SCROLL_KEY);
  } catch {}
}
