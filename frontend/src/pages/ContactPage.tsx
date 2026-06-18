import { useState, useEffect, useCallback } from 'react';
import { MessageCircle, Send, Check } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useMeta } from '../hooks/useMeta';
import { saveSetting, loadSetting } from '../storage';

const DRAFT_KEY = 'wasla_contact_draft';
const WHATSAPP_NUMBER = '201143044699';

export default function ContactPage() {
  const { t } = useLanguage();
  const [message, setMessage] = useState(() => {
    try { return localStorage.getItem(DRAFT_KEY) || ''; } catch { return ''; }
  });
  const [saved, setSaved] = useState(false);

  useMeta({ title: t('contact.title') });

  useEffect(() => {
    loadSetting<string>(DRAFT_KEY).then((v) => { if (v) setMessage(v); });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      saveSetting(DRAFT_KEY, message);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }, 1000);
    return () => clearTimeout(timer);
  }, [message]);

  const handleSend = useCallback(() => {
    const trimmed = message.trim();
    if (!trimmed) return;
    const encoded = encodeURIComponent(trimmed);
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encoded}`, '_blank', 'noopener');
  }, [message]);

  return (
    <div className="min-h-screen dark:bg-dark-navy">
      <div className="mx-auto max-w-2xl px-6 py-6">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10 text-green-500">
            <MessageCircle className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('contact.title')}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('contact.subtitle')}
            </p>
          </div>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200 dark:bg-dark-navy dark:ring-gray-700">
          <p className="mb-4 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            {t('contact.description')}
          </p>

          <div className="mb-2">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-green-500 focus:ring-green-500 dark:border-gray-600 dark:bg-dark-navy dark:text-gray-100 dark:placeholder-gray-500 resize-none transition"
              placeholder={t('contact.placeholder')}
              maxLength={2000}
            />
          </div>

          <div className="mb-4 flex items-center justify-between text-xs">
            <span className="text-gray-400 dark:text-gray-500">
              {message.length}/2000
              {saved && (
                <span className="ml-2 inline-flex items-center gap-1 text-green-500">
                  <Check className="h-3 w-3" />
                  {t('contact.draftSaved')}
                </span>
              )}
            </span>
          </div>

          <button
            onClick={handleSend}
            disabled={!message.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-green-600 disabled:cursor-not-allowed disabled:bg-gray-300 dark:disabled:bg-gray-700"
          >
            <Send className="h-4 w-4" />
            {t('contact.sendButton')}
          </button>

          <p className="mt-3 text-center text-xs text-gray-400 dark:text-gray-500">
            {t('contact.fallback', { number: `+${WHATSAPP_NUMBER}` })}
          </p>
        </div>
      </div>
    </div>
  );
}
