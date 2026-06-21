/**
 * Stable Portal Utility
 *
 * Creates a portal container div ONCE (lazily) and appends it to document.body.
 * The container is NEVER removed — it lives for the entire SPA lifetime.
 *
 * This eliminates the race condition between React's concurrent-mode commit
 * phase and useEffect cleanup timing that causes:
 *   "NotFoundError: Failed to execute 'insertBefore'/'removeChild' on 'Node'"
 *
 * Usage:
 *   const root = getStablePortalRoot('my-portal');
 *   return createPortal(<Content />, root);
 */

const portals = new Map<string, HTMLDivElement>();

export function getStablePortalRoot(id: string): HTMLDivElement {
  if (portals.has(id)) {
    return portals.get(id)!;
  }
  const el = document.createElement('div');
  el.setAttribute('data-portal-id', id);
  document.body.appendChild(el);
  portals.set(id, el);
  return el;
}
