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
