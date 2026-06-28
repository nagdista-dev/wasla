import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Download } from 'lucide-react';
import type { VideoNote } from '../types';
import { getItem, putItem } from '../services/indexedDbService';

type VideoNotesProps = {
  videoId: string;
  videoTitle?: string;
  videoLink?: string;
  currentTime: number;
  onSeek: (seconds: number) => void;
  t: (key: string) => string;
  showToast: (message: string, type: 'success' | 'info' | 'error') => void;
};

const SETTINGS_STORE = 'appSettings';

async function loadNotes<T>(key: string): Promise<T | undefined> {
  try {
    const entry = await getItem<{ key: string; value: T }>(SETTINGS_STORE, key);
    if (entry) return entry.value;
  } catch {}
  return undefined;
}

async function saveNotesToIDB<T>(key: string, value: T): Promise<void> {
  await putItem(SETTINGS_STORE, { key, value });
}

const VideoNotes: React.FC<VideoNotesProps> = ({
  videoId,
  videoTitle,
  videoLink,
  t,
  showToast,
}) => {
  const [notes, setNotes] = useState<VideoNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const STORAGE_KEY = `wasla_video_notes_${videoId}`;

  useEffect(() => {
    const loadNotesData = async () => {
      setIsLoading(true);
      try {
        const storedNotes = await loadNotes<VideoNote[]>(STORAGE_KEY);
        if (storedNotes) {
          setNotes(storedNotes);
        }
      } catch (error) {
        console.error('Failed to load notes:', error);
        showToast('Failed to load notes', 'error');
      } finally {
        setIsLoading(false);
      }
    };
    loadNotesData();
  }, [videoId, STORAGE_KEY, showToast]);

  const saveNotes = async (updatedNotes: VideoNote[]) => {
    try {
      await saveNotesToIDB(STORAGE_KEY, updatedNotes);
      setNotes(updatedNotes);
    } catch (error) {
      console.error('Failed to save notes:', error);
      showToast('Failed to save notes', 'error');
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    const note: VideoNote = {
      id: `note_${Date.now()}`,
      timestamp: 0,
      content: newNote.trim(),
      createdAt: Date.now(),
    };

    const updatedNotes = [...notes, note].sort((a, b) => b.createdAt - a.createdAt);
    await saveNotes(updatedNotes);
    setNewNote('');
    requestAnimationFrame(() => textareaRef.current?.focus());
    showToast('Note added', 'success');
  };

  const handleDeleteNote = async (id: string) => {
    const updatedNotes = notes.filter((note) => note.id !== id);
    await saveNotes(updatedNotes);
    showToast('Note deleted', 'info');
  };

  const handleDeleteAll = async () => {
    if (!window.confirm('Delete all notes?')) return;
    await saveNotes([]);
    showToast('All notes deleted', 'info');
  };

  const sanitizeFileName = (name: string) => name.replace(/[<>:"/\\|?*]/g, '_').trim() || 'notes';

  const handleDownloadMD = () => {
    if (!notes.length) {
      showToast('No notes to download', 'info');
      return;
    }

    const header = videoTitle ? `# ${videoTitle}\n\n` : '';
    const link = videoLink ? `🔗 ${videoLink}\n\n` : '';
    const notesContent = notes
      .slice()
      .reverse()
      .map((note) => `- ${note.content}`)
      .join('\n');

    const mdContent = `${header}${link}${notesContent}`;
    const fileName = videoTitle ? `${sanitizeFileName(videoTitle)}.md` : `notes-${videoId}.md`;

    const blob = new Blob([mdContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-200/60 bg-gray-50/80 p-5 text-center dark:border-white/10 dark:bg-white/[0.04]">
        <div className="animate-pulse h-4 w-24 bg-gray-200 dark:bg-white/10 mx-auto rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 sm:px-0">
      <section className="rounded-xl border border-gray-200/60 bg-gray-50/80 p-4 sm:p-5 dark:border-white/10 dark:bg-white/[0.04]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">{t('videoPage.notes')}</h2>
          {notes.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadMD}
                className="inline-flex items-center gap-1.5 rounded-lg bg-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-300 dark:bg-white/10 dark:text-gray-300 dark:hover:bg-white/15 transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                .md
              </button>
              <button
                onClick={handleDeleteAll}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {t('videoPage.deleteAll')}
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col w-full rounded-xl border border-gray-200 bg-white dark:border-white/10 dark:bg-white/5 overflow-hidden focus-within:ring-1 focus-within:ring-brand-coral">
            <textarea
              ref={textareaRef}
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAddNote();
                }
              }}
              placeholder={t('videoPage.addNotePlaceholder')}
              className="w-full min-h-[80px] bg-transparent px-3 py-2 text-sm text-gray-900 dark:text-white outline-none resize-none"
            />
            <div className="flex items-center justify-end gap-2 px-2 pb-2">
              <button
                onClick={handleAddNote}
                disabled={!newNote.trim()}
                className="inline-flex items-center justify-center rounded-lg bg-brand-coral px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-pink disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Plus className="mr-1 h-4 w-4" />
                {t('videoPage.addNote')}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {notes.length === 0 ? (
            <p className="text-center text-sm text-gray-500 dark:text-gray-400">
              {t('videoPage.noNotes')}
            </p>
          ) : (
            notes.map((note) => (
              <div
                key={note.id}
                className="group flex items-start justify-between gap-3 rounded-lg border border-gray-200 bg-white p-3 transition-colors hover:border-brand-coral/30 dark:border-white/10 dark:bg-white/5"
              >
                <p className="text-sm text-gray-700 dark:text-gray-200 break-words min-w-0">
                  {note.content}
                </p>
                <button
                  onClick={() => handleDeleteNote(note.id)}
                  className="shrink-0 rounded-md p-1 text-gray-400 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 group-hover:opacity-100"
                  aria-label={t('videoPage.deleteNote')}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};

export default VideoNotes;
