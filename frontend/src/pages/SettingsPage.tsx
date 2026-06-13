import React, { useState } from 'react';
import { Settings, Download, Upload } from 'lucide-react';
import { api } from '../api';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../components/Toast';
import type { Channel } from '../types';

interface SettingsPageProps {
  channels: Channel[];
  onUpdate: (channels: Channel[]) => void;
}

type ResolveResponse = {
  success: boolean;
  channelId?: string;
  error?: string;
};

type ChannelLookupResponse = {
  success: boolean;
  data?: {
    channelName?: string;
  };
};

function extractHandle(value: string): string | null {
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
}

function isChannelObject(obj: unknown): obj is Channel {
  return typeof obj === 'object' && obj !== null && 'id' in obj && 'name' in obj;
}

export default function SettingsPage({ channels, onUpdate }: SettingsPageProps) {
  const { language, setLanguage, isRTL } = useLanguage();
  const { showToast } = useToast();
  const [resolving, setResolving] = useState(false);
  const [progress, setProgress] = useState('');

  const exportChannels = () => {
    const dataStr = JSON.stringify(channels, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'wasla_channels.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const importChannels = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || resolving) return;
    setResolving(true);
    setProgress('Reading file...');
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (!Array.isArray(data)) {
          showToast('File must contain a JSON array', 'error');
          setResolving(false);
          setProgress('');
          e.target.value = '';
          return;
        }

        if (data.length === 0) {
          showToast('File is empty', 'error');
          setResolving(false);
          setProgress('');
          e.target.value = '';
          return;
        }

        if (isChannelObject(data[0])) {
          const valid = data.filter((item): item is Channel => item.id && item.name);
          onUpdate(valid);
          showToast(`Imported ${valid.length} channel${valid.length !== 1 ? 's' : ''}`, 'success');
          setResolving(false);
          setProgress('');
          e.target.value = '';
          return;
        }

        const resolved: Channel[] = [];
        let failed = 0;
        for (let i = 0; i < data.length; i++) {
          const raw = String(data[i]);
          const identifier = extractHandle(raw);
          if (!identifier) {
            failed++;
            continue;
          }
          setProgress(`${i + 1}/${data.length}: ${raw}`);
          try {
            const resolveResp = await api.get<ResolveResponse>(`/resolve/${encodeURIComponent(identifier)}`);
            if (!resolveResp.data.success || !resolveResp.data.channelId) {
              failed++;
              continue;
            }
            const channelId = resolveResp.data.channelId;
            const nameResp = await api.get<ChannelLookupResponse>(`/channel/${channelId}`);
            const channelName = nameResp.data.success ? (nameResp.data.data?.channelName || raw) : raw;
            resolved.push({
              id: channelId,
              name: channelName,
              handle: identifier.startsWith('UC') ? undefined : identifier,
              categories: [],
            });
          } catch {
            failed++;
          }
        }
        if (resolved.length > 0) {
          onUpdate([...channels, ...resolved]);
          showToast(`Added ${resolved.length} channel${resolved.length > 1 ? 's' : ''}${failed > 0 ? ` (${failed} failed)` : ''}`, 'success');
        } else {
          showToast('No channels could be resolved', 'error');
        }
      } catch {
        showToast('Invalid JSON file', 'error');
      }
      setResolving(false);
      setProgress('');
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <h1 className="flex items-center gap-3 text-4xl font-bold text-gray-900 dark:text-white">
            <Settings className="h-8 w-8 text-brand-coral" />
            Settings
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Manage your app preferences and channel data.
          </p>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200 dark:bg-dark-navy dark:ring-gray-700">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Language & Direction</h2>
            <div className="flex items-center gap-4">
              <select
                id="language"
                value={language}
                onChange={(e) => setLanguage(e.target.value as 'en' | 'ar')}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-brand-coral focus:ring-brand-coral dark:border-gray-600 dark:bg-dark-navy dark:text-gray-300"
              >
                <option value="en">English</option>
                <option value="ar">العربية</option>
              </select>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {isRTL ? 'RTL' : 'LTR'} — {language === 'ar' ? 'Arabic' : 'English'}
              </span>
            </div>
          </div>

          <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200 dark:bg-dark-navy dark:ring-gray-700">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Channel Data</h2>
            <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
              {channels.length} channel{channels.length !== 1 ? 's' : ''} in your feed.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={exportChannels}
                className="flex items-center gap-2 rounded-lg bg-brand-coral px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-pink"
              >
                <Download className="h-4 w-4" />
                Export
              </button>
              <label className={`flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
                resolving
                  ? 'bg-gray-300 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                  : 'bg-white text-gray-700 ring-1 ring-gray-300 hover:bg-gray-50 dark:bg-dark-navy dark:text-gray-300 dark:ring-gray-600 dark:hover:bg-white/10'
              }`}>
                <Upload className="h-4 w-4" />
                {resolving ? progress || 'Processing...' : 'Import'}
                <input type="file" accept="application/json" className="hidden" onChange={importChannels} disabled={resolving} />
              </label>
            </div>
            <div className="mt-4 rounded-lg bg-gray-50 p-4 dark:bg-white/5">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Accepted formats</p>
              <ul className="mt-1 space-y-1 text-xs text-gray-500 dark:text-gray-400">
                <li>• <strong>Channel objects</strong> — exported JSON from this app</li>
                <li>• <strong>Handles/URLs</strong> — <code className="rounded bg-gray-200 px-1 dark:bg-white/10">@handle</code>, <code className="rounded bg-gray-200 px-1 dark:bg-white/10">youtube.com/@handle</code>, or channel IDs</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
