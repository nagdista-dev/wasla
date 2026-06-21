export function encodeSharePayload(payload: any): string {
  const json = JSON.stringify(payload);
  const encoded = encodeURIComponent(json);
  return btoa(encoded);
}

export function decodeSharePayload(base64: string): any {
  const decoded = atob(base64);
  const json = decodeURIComponent(decoded);
  return JSON.parse(json);
}

export function createShareUrl(
  categoryName: string,
  channels: { id: string; name: string; handle?: string }[]
): string {
  const payload = { c: categoryName, ch: channels };
  const encoded = encodeSharePayload(payload);
  return `${window.location.origin}/import/category?data=${encoded}`;
}
