import { useEffect, useState } from 'react';
import { Smartphone, Download } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function MobileAppBanner() {
  const { t } = useLanguage();
  const [visible, setVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [installResolved, setInstallResolved] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem('wasla_install_dismissed');
    const installed = localStorage.getItem('wasla_installed');
    if (dismissed || installed) return;

    const isMobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (!isMobile) return;

    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    if (isStandalone) {
      localStorage.setItem('wasla_installed', 'true');
      return;
    }

    let promptFired = false;

    const handler = (e: Event) => {
      e.preventDefault();
      if (promptFired) return;
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);

    const timer = setTimeout(() => setVisible(true), 500);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (installResolved || !deferredPrompt) return;
    setInstallResolved(true);

    const promptEvent = deferredPrompt as any;
    promptEvent.prompt();
    const result = await promptEvent.userChoice;
    setDeferredPrompt(null);
    setVisible(false);

    if (result.outcome === 'accepted') {
      localStorage.setItem('wasla_installed', 'true');
    } else {
      localStorage.setItem('wasla_install_dismissed', 'true');
    }
  };

  const handleNotNow = () => {
    setVisible(false);
    localStorage.setItem('wasla_install_dismissed', 'true');
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={handleNotNow} />
      <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-dark-navy dark:ring-1 dark:ring-gray-700">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-brand-coral/10 text-brand-coral">
            <Smartphone className="h-6 w-6" />
          </span>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('appBanner.installTitle')}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('appBanner.installDesc')}</p>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <button
            onClick={handleInstall}
            className="w-full rounded-xl bg-brand-coral px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-brand-pink"
          >
            <Download className="mr-1.5 inline-block h-4 w-4" />
            {t('appBanner.install')}
          </button>
          <button
            onClick={handleNotNow}
            className="w-full rounded-xl px-4 py-2.5 text-center text-sm font-medium text-gray-600 transition hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/10"
          >
            {t('appBanner.notNow')}
          </button>
        </div>
      </div>
    </div>
  );
}
