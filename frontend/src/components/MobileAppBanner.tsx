import { useEffect, useState } from 'react';
import { X, Smartphone, Download } from 'lucide-react';

export default function MobileAppBanner() {
  const [visible, setVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);

  useEffect(() => {
    const dismissed = localStorage.getItem('wasla_app_banner_dismissed');
    if (dismissed) return;

    const isMobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (!isMobile) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);

    const timer = setTimeout(() => setVisible(true), 500);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleDownload = async () => {
    if (deferredPrompt) {
      (deferredPrompt as any).prompt();
      const result = await (deferredPrompt as any).userChoice;
      if (result.outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
      if (isSafari) {
        alert('Tap the Share button and select "Add to Home Screen" to install Wasla.');
      } else {
        alert('Open the browser menu and tap "Add to Home Screen" or "Install app" to install Wasla.');
      }
    }
    setVisible(false);
    localStorage.setItem('wasla_app_banner_dismissed', 'true');
  };

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem('wasla_app_banner_dismissed', 'true');
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-4 px-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={dismiss} />
      <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl dark:bg-dark-navy dark:ring-1 dark:ring-gray-700">
        <button
          onClick={dismiss}
          className="absolute right-3 top-3 rounded-md p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="mb-5 mt-1 flex items-center gap-3">
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-brand-coral/10 text-brand-coral">
            <Smartphone className="h-5 w-5" />
          </span>
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Get the app</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Install Wasla on your device</p>
          </div>
        </div>
        <button
          onClick={handleDownload}
          className="w-full rounded-xl bg-brand-coral px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-brand-pink"
        >
          <Download className="mr-1.5 inline-block h-4 w-4" />
          Download
        </button>
      </div>
    </div>
  );
}
