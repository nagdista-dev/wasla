import { useState } from 'react';
import { Plus, ListVideo, Users } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface FloatingButtonProps {
  onAddChannel: () => void;
  onAddPlaylist: () => void;
}

export default function FloatingButton({ onAddChannel, onAddPlaylist }: FloatingButtonProps) {
  const { isRTL } = useLanguage();
  const [open, setOpen] = useState(false);

  const side = isRTL ? 'left-6' : 'right-6';

  return (
    <div className={`fixed bottom-6 ${side} z-40 flex flex-col items-end gap-3`}>
      {open && (
        <>
          <button
            onClick={() => { setOpen(false); onAddPlaylist(); }}
            className="flex items-center gap-2 rounded-full bg-brand-orange px-4 py-2 text-sm font-medium text-white shadow-lg transition-all hover:bg-brand-yellow hover:text-gray-900"
          >
            <ListVideo className="h-4 w-4" />
            Playlist
          </button>
          <button
            onClick={() => { setOpen(false); onAddChannel(); }}
            className="flex items-center gap-2 rounded-full bg-brand-coral px-4 py-2 text-sm font-medium text-white shadow-lg transition-all hover:bg-brand-pink"
          >
            <Users className="h-4 w-4" />
            Channel
          </button>
        </>
      )}
      <button
        onClick={() => setOpen((prev) => !prev)}
        className={`bg-brand-coral text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg hover:bg-brand-pink transition-all ${open ? 'rotate-45' : ''}`}
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}