import React from 'react';
import { Settings } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import type { Channel } from '../types';

interface SettingsPageProps {
  channels: Channel[];
  onUpdate: (channels: Channel[]) => void;
}

export default function SettingsPage({ channels, onUpdate }: SettingsPageProps) {
  const { language, setLanguage, isRTL } = useLanguage();

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

  const importUsernames = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const usernames = JSON.parse(event.target?.result as string);
        if (Array.isArray(usernames)) {
          const newChannels = usernames.map((u) => ({
            id: crypto.randomUUID(),
            name: u,
            handle: u,
            categories: [],
          }));
          onUpdate([...channels, ...newChannels]);
        } else {
          console.error('Usernames JSON should be an array');
        }
      } catch {
        console.error('Invalid JSON file');
      }
    };
    reader.readAsText(file);
  };

  const importChannels = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        onUpdate(json);
      } catch {
        console.error('Invalid JSON file');
      }
    };
    reader.readAsText(file);
  };
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 text-center">
          <h1 className="mb-4 flex items-center justify-center gap-2 text-4xl font-bold text-gray-900">
            <Settings className="h-8 w-8" />
            Settings
          </h1>
        </div>
        <div className="rounded-lg bg-white p-6 shadow-md space-y-6">
          <div>
            <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-2">
              Language
            </label>
            <select
              id="language"
              value={language}
              onChange={(e) => setLanguage(e.target.value as 'en' | 'ar')}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="en">English</option>
              <option value="ar">العربية</option>
            </select>
          </div>
          <div>
            <p className="text-sm text-gray-600">
              Current direction: <span className="font-medium">{isRTL ? 'RTL (Right-to-Left)' : 'LTR (Left-to-Right)'}</span>
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Current language: <span className="font-medium">{language === 'ar' ? 'Arabic' : 'English'}</span>
            </p>
          </div>
          <div className="border-t pt-6">
            <div className="mb-4 flex space-x-2 rtl:space-x-reverse">
              <button onClick={exportChannels} className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
                Export Channels
              </button>
              <label className="cursor-pointer rounded bg-gray-200 px-4 py-2 hover:bg-gray-300">
                Import Channels
                <input type="file" accept="application/json" className="hidden" onChange={importChannels} />
              </label>
            </div>
            <div className="mt-8">
              <h2 className="mb-2 text-lg font-semibold">Import Usernames</h2>
              <p className="mb-2 text-sm text-gray-600">
                Upload a JSON file containing an array of usernames (e.g., ['alice','bob']). Each username will be converted into a channel object with a generated name and default classification.
              </p>
              <label className="cursor-pointer rounded bg-gray-200 px-4 py-2 hover:bg-gray-300">
                Upload Usernames
                <input type="file" accept="application/json" className="hidden" onChange={importUsernames} />
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}