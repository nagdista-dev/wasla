export function saveScrollPosition(key: string): void {
  try {
    sessionStorage.setItem(`ws_scroll_${key}`, String(window.scrollY));
  } catch {}
}

export function getScrollPosition(key: string): number {
  try {
    const val = sessionStorage.getItem(`ws_scroll_${key}`);
    return val ? parseInt(val, 10) : 0;
  } catch {
    return 0;
  }
}

export function clearScrollPosition(key: string): void {
  try {
    sessionStorage.removeItem(`ws_scroll_${key}`);
  } catch {}
}

export function getRouteScrollKey(pathname: string): string {
  return pathname.replace(/\/$/, '') || '/';
}

export function saveHomeScroll(): void {
  saveScrollPosition(getRouteScrollKey('/'));
}

export function getHomeScroll(): number {
  return getScrollPosition(getRouteScrollKey('/'));
}

export function clearHomeScroll(): void {
  clearScrollPosition(getRouteScrollKey('/'));
}

const NAV_FROM_KEY = 'ws_nav_from_video';

export function setNavigatedFromVideo(): void {
  try {
    sessionStorage.setItem(NAV_FROM_KEY, '1');
  } catch {}
}

export function clearNavigatedFromVideo(): void {
  try {
    sessionStorage.removeItem(NAV_FROM_KEY);
  } catch {}
}

export function wasNavigatedFromVideo(): boolean {
  try {
    return sessionStorage.getItem(NAV_FROM_KEY) === '1';
  } catch {
    return false;
  }
}

const SKIP_HOME_FETCH_KEY = 'ws_skip_home_fetch';

export function setSkipHomeFetch(): void {
  try {
    sessionStorage.setItem(SKIP_HOME_FETCH_KEY, '1');
  } catch {}
}

export function shouldSkipHomeFetch(): boolean {
  try {
    return sessionStorage.getItem(SKIP_HOME_FETCH_KEY) === '1';
  } catch {
    return false;
  }
}

export function clearSkipHomeFetch(): void {
  try {
    sessionStorage.removeItem(SKIP_HOME_FETCH_KEY);
  } catch {}
}
