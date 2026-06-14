import { memo, useEffect, useState } from 'react';
import { Plus, ListVideo, Users } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface FloatingButtonProps {
  onAddChannel: () => void;
  onAddPlaylist: () => void;
}

const FloatingButton = memo(function FloatingButton({ onAddChannel, onAddPlaylist }: FloatingButtonProps) {
  const { isRTL, t } = useLanguage();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [open]);

  const handleChannel = () => {
    setOpen(false);
    onAddChannel();
  };

  const handlePlaylist = () => {
    setOpen(false);
    onAddPlaylist();
  };

  const side = isRTL ? 'left-6' : 'right-6';

  return (
    <>
      <div className={`fixed bottom-6 ${side} z-40`}>
        <button
          onClick={() => setOpen(true)}
          className="floating-btn bg-brand-coral text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg hover:bg-brand-pink transition-all hover:shadow-xl active:scale-95"
          aria-label={t('floatingButton.add')}
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      <div
        className={`fixed inset-0 z-50 transition-all duration-300 ${
          open ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
      >
        <div
          className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
            open ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={() => setOpen(false)}
        />

        <div
          className={`absolute bottom-0 left-0 right-0 transition-transform duration-300 ease-out ${
            open ? 'translate-y-0' : 'translate-y-full'
          }`}
        >
          <div className="rounded-t-2xl bg-white dark:bg-dark-navy shadow-2xl">
            <div className="flex items-center justify-center pt-3 pb-1">
              <span className="h-1 w-10 rounded-full bg-gray-300 dark:bg-gray-600" />
            </div>

            <div className="px-6 pb-2 pt-2">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white text-center">
                {t('floatingButton.addNew')}
              </h2>
            </div>

            <div className="px-6 pb-8 pt-2 space-y-3">
              <button
                onClick={handleChannel}
                className="w-full flex items-center gap-4 rounded-xl bg-brand-coral/10 p-4 text-left transition hover:bg-brand-coral/20 active:scale-[0.98]"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-coral text-white">
                  <Users className="h-6 w-6" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-semibold text-gray-900 dark:text-white">
                    {t('floatingButton.channel')}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('floatingButton.channelDesc')}
                  </p>
                </div>
              </button>

              <button
                onClick={handlePlaylist}
                className="w-full flex items-center gap-4 rounded-xl bg-brand-orange/10 p-4 text-left transition hover:bg-brand-orange/20 active:scale-[0.98]"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-orange text-white">
                  <ListVideo className="h-6 w-6" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-semibold text-gray-900 dark:text-white">
                    {t('floatingButton.playlist')}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('floatingButton.playlistDesc')}
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
});

export default FloatingButton;