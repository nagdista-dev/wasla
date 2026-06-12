import { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { X, RefreshCcw, Loader2 } from 'lucide-react';
import { useToast } from './Toast';

interface ChannelEntry {
  id: string;
  name: string;
  handle?: string;
  categories: string[];
}

type ChannelLookupResponse = {
  success: boolean;
  data?: {
    channelName?: string;
  };
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

  // Handle plain username/handle (ASCII alphanumeric, dashes, underscores only - not Arabic/Unicode)
  const plainHandleMatch = trimmed.match(/^[a-zA-Z0-9._-]+$/);
  if (plainHandleMatch && trimmed.length > 0) return trimmed;

  return null;
};

export default function AddChannelModal({ onClose, onAdd }: { onClose: () => void; onAdd: (ch: ChannelEntry) => void }) {
  const { showToast } = useToast();
  const [input, setInput] = useState('');
  const [customName, setCustomName] = useState('');
  const [categoryInput, setCategoryInput] = useState('');
  const [prevCategories, setPrevCategories] = useState<string[]>(() => {
    const stored = localStorage.getItem('prevCategories');
    return stored ? JSON.parse(stored) : [];
  });
  const [resolvedId, setResolvedId] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      const identifier = extractHandle(input);
      if (!identifier) {
        setCustomName('');
        setResolvedId(null);
        return;
      }

      setIsResolving(true);
      
      try {
        const resp = await api.get<ResolveResponse>(`/resolve/${encodeURIComponent(identifier)}`);
        if (resp.data.success && resp.data.channelId) {
          setResolvedId(resp.data.channelId);
          
          const nameResp = await api.get<ChannelLookupResponse>(`/channel/${resp.data.channelId}`);
          if (nameResp.data.success) {
            setCustomName(nameResp.data.data?.channelName || identifier);
          }
        } else {
          setResolvedId(null);
          setCustomName('');
        }
      } catch (error) {
        console.error(error);
        setResolvedId(null);
        setCustomName('');
      } finally {
        setIsResolving(false);
      }
    }, 500);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [input]);

  const refreshName = async () => {
    const identifier = extractHandle(input);
    if (!identifier) return;

    setIsResolving(true);
    
    try {
      const resp = await api.get<ResolveResponse>(`/resolve/${encodeURIComponent(identifier)}`);
      if (resp.data.success && resp.data.channelId) {
        setResolvedId(resp.data.channelId);
        
        const nameResp = await api.get<ChannelLookupResponse>(`/channel/${resp.data.channelId}`);
        if (nameResp.data.success) {
          setCustomName(nameResp.data.data?.channelName || identifier);
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsResolving(false);
    }
  };

  const handleAdd = () => {
    const identifier = extractHandle(input);
    if (!identifier || !resolvedId) return;

    const entry: ChannelEntry = {
      id: resolvedId,
      name: customName || identifier,
      handle: identifier.startsWith('UC') ? undefined : identifier,
      categories: categoryInput ? categoryInput.split(',').map((category) => category.trim()).filter(Boolean) : [],
    };

    const updatedPrev = Array.from(new Set([...prevCategories, ...entry.categories]));
    localStorage.setItem('prevCategories', JSON.stringify(updatedPrev));
    onAdd(entry);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-lg bg-white p-6">
        <button type="button" onClick={onClose} className="absolute top-2 rtl:left-2 ltr:right-2 text-gray-500">
          <X className="h-5 w-5" />
        </button>
        <h2 className="mb-4 text-xl font-semibold">Add Channel</h2>
        <input
          placeholder="Channel URL, @handle, or ID"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          className="mb-2 w-full border p-2"
        />
        <div className="mb-2 flex items-center">
          <input
            placeholder="Channel Name"
            value={customName}
            onChange={(event) => setCustomName(event.target.value)}
            className="flex-1 border p-2"
          />
          <button type="button" onClick={refreshName} className="rtl:mr-2 ltr:ml-2 text-gray-600" title="Refresh name" disabled={isResolving}>
            {isResolving ? <Loader2 className="h-5 w-5 animate-spin" /> : <RefreshCcw className="h-5 w-5" />}
          </button>
        </div>
        {resolvedId && (
          <p className="mb-2 text-xs text-green-600">Resolved to channel ID: {resolvedId}</p>
        )}
        <input
          placeholder="Categories (press Enter)"
          value={categoryInput}
          onChange={(event) => setCategoryInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && categoryInput.trim()) {
              event.preventDefault();
              const newCat = categoryInput.trim();
              setPrevCategories((prev) => Array.from(new Set([...prev, newCat])));
              setCategoryInput('');
            }
          }}
          className="mb-2 w-full border p-2"
        />
        {prevCategories.length > 0 && (
          <div className="mb-2">
            <p className="mb-1 text-sm text-gray-600">Quick categories:</p>
            <div className="flex flex-wrap gap-1">
              {prevCategories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setCategoryInput((prev) => (prev ? `${prev} ${category}` : category))}
                  className="rounded bg-gray-200 px-2 py-1 text-sm"
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        )}
        <button type="button" onClick={handleAdd} className="mt-4 w-full rounded bg-green-600 py-2 text-white">
          Add Channel
        </button>
      </div>
    </div>
  );
}
