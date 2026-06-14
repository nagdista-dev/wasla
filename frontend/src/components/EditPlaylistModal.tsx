import { useState } from 'react';
import { X } from 'lucide-react';
import type { Playlist } from '../types';

interface EditPlaylistModalProps {
  playlist: Playlist;
  onClose: () => void;
  onUpdate: (name: string, description: string | undefined, categories: string[]) => void;
  existingCategories?: string[];
}

export default function EditPlaylistModal({ playlist, onClose, onUpdate, existingCategories = [] }: EditPlaylistModalProps) {
  const [name, setName] = useState(playlist.name);
  const [description, setDescription] = useState(playlist.description || '');
  const [categories, setCategories] = useState<string[]>(playlist.categories);
  const [categoryInput, setCategoryInput] = useState('');

  const handleAddCategory = () => {
    if (categoryInput.trim()) {
      const newCat = categoryInput.trim();
      setCategories((prev) => Array.from(new Set([...prev, newCat])));
      setCategoryInput('');
    }
  };

  const handleRemoveCategory = (cat: string) => {
    setCategories((prev) => prev.filter((c) => c !== cat));
  };

  const handleUpdate = () => {
    if (!name.trim()) return;
    onUpdate(name.trim(), description.trim() || undefined, categories);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-xl bg-white p-6 shadow-2xl dark:bg-dark-navy dark:ring-1 dark:ring-gray-700">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 rtl:left-3 ltr:right-3 rounded-full bg-gray-100 p-1.5 text-gray-500 hover:bg-gray-200 dark:bg-white/10 dark:text-gray-400 dark:hover:bg-white/20"
        >
          <X className="h-4 w-4" />
        </button>
        <h2 className="mb-4 text-xl font-semibold dark:text-white">Edit Playlist</h2>
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Playlist Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-brand-coral focus:ring-brand-coral dark:border-gray-600 dark:bg-dark-navy dark:text-gray-100"
            placeholder="Playlist Name"
            maxLength={100}
          />
        </div>
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-brand-coral focus:ring-brand-coral dark:border-gray-600 dark:bg-dark-navy dark:text-gray-100 dark:placeholder-gray-400 resize-none"
            placeholder="Description (optional)"
          />
        </div>
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Categories</label>
          <div className="mb-2 flex gap-2">
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
              className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-brand-coral focus:ring-brand-coral dark:border-gray-600 dark:bg-dark-navy dark:text-gray-100"
              placeholder="Add a category"
            />
            <button
              type="button"
              onClick={handleAddCategory}
              className="flex-shrink-0 rounded-md bg-brand-coral px-4 py-2 text-sm font-medium text-white hover:bg-brand-pink"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {categories.map((category) => (
              <span
                key={category}
                className="flex items-center gap-1 rounded-full bg-brand-coral/10 px-3 py-1 text-sm font-medium text-brand-coral"
              >
                {category}
                <button
                  type="button"
                  onClick={() => handleRemoveCategory(category)}
                  className="text-brand-coral hover:text-brand-pink"
                >
                  x
                </button>
              </span>
            ))}
          </div>
          {existingCategories.length > 0 && (
            <div className="mb-4">
              <p className="mb-1 text-sm text-gray-600 dark:text-gray-400">All categories:</p>
              <div className="modal-scroll flex max-h-28 min-w-0 flex-wrap gap-1">
                {existingCategories.map((cat) => {
                  const active = categories.includes(cat);
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        if (active) {
                          setCategories((prev) => prev.filter((c) => c !== cat));
                        } else {
                          setCategories((prev) => [...prev, cat]);
                        }
                      }}
                      className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                        active
                          ? 'bg-brand-coral text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-white/10 dark:text-gray-300 dark:hover:bg-white/20'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={handleUpdate}
          disabled={!name.trim()}
          className="w-full rounded-md bg-brand-coral px-4 py-2 font-medium text-white transition hover:bg-brand-pink disabled:cursor-not-allowed disabled:bg-gray-300 dark:disabled:bg-gray-700"
        >
          Update Playlist
        </button>
      </div>
    </div>
  );
}