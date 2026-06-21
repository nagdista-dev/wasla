import { api } from '../api';

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

export async function createShareLink(
  categoryName: string,
  channels: { id: string; name: string; handle?: string }[]
): Promise<string> {
  const response = await api.post('/shares', { categoryName, channels });
  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to create share link');
  }
  const { shareId } = response.data.data;
  return shareId;
}

export async function getShareData(shareId: string) {
  const response = await api.get(`/shares/${shareId}`);
  if (!response.data.success) {
    throw new Error(response.data.error || 'Share not found');
  }
  return response.data.data;
}
