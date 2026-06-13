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

export default function AddChannelModal({ onClose, onAdd, existingCategories = [] }: { onClose: () => void; onAdd: (ch: ChannelEntry) => void; existingCategories?: string[] }) {
  const { showToast } = useToast();
  const [input, setInput] = useState('');
  const [customName, setCustomName] = useState('');
  const [categoryInput, setCategoryInput] = useState('');
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
        showToast('Failed to resolve channel. Check the URL or handle.', 'error');
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
      showToast('Failed to refresh channel name.', 'error');
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

    onAdd(entry);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-xl bg-white p-6 shadow-2xl dark:bg-dark-navy dark:ring-1 dark:ring-gray-700">
        <button type="button" onClick={onClose} className="absolute top-3 rtl:left-3 ltr:right-3 rounded-full bg-gray-100 p-1.5 text-gray-500 hover:bg-gray-200 dark:bg-white/10 dark:text-gray-400 dark:hover:bg-white/20">
          <X className="h-4 w-4" />
        </button>
        <h2 className="mb-4 text-xl font-semibold dark:text-white">Add Channel</h2>
        <input
          placeholder="Channel URL, @handle, or ID"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          className="mb-2 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-brand-coral focus:ring-brand-coral dark:border-gray-600 dark:bg-dark-navy dark:text-gray-100 dark:placeholder-gray-400"
        />
        <div className="mb-2 relative">
          <input
            placeholder="Channel Name"
            value={customName}
            onChange={(event) => setCustomName(event.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 pr-10 text-gray-900 placeholder-gray-500 focus:border-brand-coral focus:ring-brand-coral dark:border-gray-600 dark:bg-dark-navy dark:text-gray-100 dark:placeholder-gray-400"
          />
          <button
            type="button"
            onClick={refreshName}
            disabled={isResolving}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50"
            title="Refresh name"
          >
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
              setCategoryInput((prev) => prev + (prev ? ', ' : '') + categoryInput.trim());
            }
          }}
          className="mb-2 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-brand-coral focus:ring-brand-coral dark:border-gray-600 dark:bg-dark-navy dark:text-gray-100 dark:placeholder-gray-400"
        />
        {existingCategories.length > 0 && (
          <div className="mb-2">
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
              {existingCategories.map((cat) => {
                const active = categoryInput.split(',').map(c => c.trim()).includes(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      const current = categoryInput ? categoryInput.split(',').map(c => c.trim()).filter(Boolean) : [];
                      if (current.includes(cat)) {
                        setCategoryInput(current.filter(c => c !== cat).join(', '));
                      } else {
                        setCategoryInput([...current, cat].join(', '));
                      }
                    }}
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition ${
                      active
                        ? 'bg-brand-coral text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-white/10 dark:text-gray-300 dark:hover:bg-white/20'
                    }`}
                  >
                    {active ? null : <span className="text-base leading-none">+</span>}
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <button type="button" onClick={handleAdd} className="mt-4 w-full rounded bg-brand-coral py-2 text-white hover:bg-brand-pink">
          Add Channel
        </button>
      </div>
    </div>
  );
}
