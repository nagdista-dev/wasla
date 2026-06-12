import { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { X, Loader2, RefreshCcw } from 'lucide-react';
import { useToast } from './Toast';
import type { Channel } from '../types';

type UpdateChannelResponse = {
  success: boolean;
  data?: {
    channelName: string;
    videos: Array<Record<string, unknown>>;
    latestVideo: Record<string, unknown>;
    cached?: boolean;
  };
  error?: string;
};

type ResolveResponse = {
  success: boolean;
  channelId?: string;
  error?: string;
};

const extractHandle = (value: string): string | null => {
  const trimmed = value.trim();
  
  const ucMatch = trimmed.match(/UC[\w-]{22,}/);
  if (ucMatch) return ucMatch[0];

  const handleMatch = trimmed.match(/^@([\w.-]+)$/);
  if (handleMatch) return handleMatch[1];

  const urlMatch = trimmed.match(/(?:youtube\.com\/)(?:@|channel\/|user\/|c\/)([^/?]+)/);
  if (urlMatch) return urlMatch[1];

  const plainHandleMatch = trimmed.match(/^[a-zA-Z0-9._-]+$/);
  if (plainHandleMatch && trimmed.length > 0) return trimmed;

  return null;
};

export default function EditChannelModal({ channel, onClose, onUpdate }: {
  channel: Channel;
  onClose: () => void;
  onUpdate: (name: string, categories: string[]) => void;
}) {
  useToast();
  const [name, setName] = useState(channel.name);
  const [categories, setCategories] = useState<string[]>(channel.categories);
  const [categoryInput, setCategoryInput] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [resolvedId, setResolvedId] = useState<string | null>(channel.handle || null);
  const [prevCategories, setPrevCategories] = useState<string[]>(() => {
    const stored = localStorage.getItem('prevCategories');
    return stored ? JSON.parse(stored) : [];
  });

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      const identifier = extractHandle(resolvedId || '');
      if (!identifier) {
        setName(channel.name);
        return;
      }

      setIsResolving(true);
      
      try {
        const resp = await api.get<ResolveResponse>(`/resolve/${encodeURIComponent(identifier)}`);
        if (resp.data.success && resp.data.channelId) {
          setResolvedId(resp.data.channelId);
          
          const nameResp = await api.get<UpdateChannelResponse>(`/channel/${resp.data.channelId}`);
          if (nameResp.data.success) {
            setName(nameResp.data.data?.channelName || channel.name);
          }
        } else {
          setResolvedId(null);
        }
      } catch (error) {
        console.error(error);
        setResolvedId(null);
      } finally {
        setIsResolving(false);
      }
    }, 500);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [resolvedId, channel.name]);

  const handleAddCategory = () => {
    if (categoryInput.trim()) {
      const newCat = categoryInput.trim();
      const updated = Array.from(new Set([...categories, newCat]));
      setCategories(updated);
      setPrevCategories((prev) => Array.from(new Set([...prev, newCat])));
      localStorage.setItem('prevCategories', JSON.stringify(Array.from(new Set([...prevCategories, newCat]))));
      setCategoryInput('');
    }
  };

  const handleRemoveCategory = (categoryToRemove: string) => {
    const updated = categories.filter((cat) => cat !== categoryToRemove);
    setCategories(updated);
  };

  const refreshName = async () => {
    if (!resolvedId) return;

    setIsResolving(true);
    
    try {
      const resp = await api.get<ResolveResponse>(`/resolve/${encodeURIComponent(resolvedId)}`);
      if (resp.data.success && resp.data.channelId) {
        setResolvedId(resp.data.channelId);
        
        const nameResp = await api.get<UpdateChannelResponse>(`/channel/${resp.data.channelId}`);
        if (nameResp.data.success) {
          setName(nameResp.data.data?.channelName || channel.name);
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsResolving(false);
    }
  };

  const handleUpdate = async () => {
    if (!name.trim()) {
      return;
    }

    setIsUpdating(true);

    try {
      const response = await api.patch<UpdateChannelResponse>(`/channel/${channel.id}`, {
        name: name.trim(),
        categories,
      });

      if (response.data.success) {
        onUpdate(name.trim(), categories);
      } else {
        console.error('Failed to update channel:', response.data.error);
      }
    } catch (error) {
      console.error('Error updating channel:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-lg bg-white p-6">
        <button type="button" onClick={onClose} className="absolute top-2 rtl:left-2 ltr:right-2 text-gray-500">
          <X className="h-5 w-5" />
        </button>
        <h2 className="mb-4 text-xl font-semibold">Edit Channel</h2>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Channel Name</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Channel Name"
              maxLength={100}
            />
            <button
              type="button"
              onClick={refreshName}
              className="rounded-md border border-gray-300 px-3 py-2 text-gray-600 hover:bg-gray-50"
              title="Refresh name"
              disabled={isResolving}
            >
              {isResolving ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <RefreshCcw className="h-5 w-5" />
              )}
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-500">Maximum 100 characters</p>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Categories</label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={categoryInput}
              onChange={(e) => setCategoryInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCategory();
                }
              }}
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Add a category"
            />
            <button
              type="button"
              onClick={handleAddCategory}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {categories.map((category) => (
              <span
                key={category}
                className="flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800"
              >
                {category}
                <button
                  type="button"
                  onClick={() => handleRemoveCategory(category)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={handleUpdate}
          disabled={isUpdating || !name.trim()}
          className="w-full rounded-md bg-green-600 px-4 py-2 font-medium text-white transition hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {isUpdating ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Updating...
            </span>
          ) : (
            'Update Channel'
          )}
        </button>
      </div>
    </div>
  );
}
