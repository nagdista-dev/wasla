import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import type { Channel } from '../types';
import { decodeSharePayload } from '../utils/shareUtils';

export default function ImportCategoryPage({ 
  onImport 
}: { 
  onImport: (categoryName: string, channels: Partial<Channel>[]) => void 
}) {
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    try {
      const dataParam = searchParams.get('data');
      if (!dataParam) throw new Error('No import data provided');

      const payload = decodeSharePayload(dataParam);

      if (!payload.c || !Array.isArray(payload.ch)) {
        throw new Error('Invalid payload format');
      }

      const categoryName = payload.c;
      const channels = payload.ch;

      // Import the category and its channels
      onImport(categoryName, channels);
      
      setStatus('success');
      setTimeout(() => {
        navigate(`/category/${encodeURIComponent(categoryName)}`, { replace: true });
      }, 1500);

    } catch (err) {
      console.error(err);
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [searchParams, navigate, onImport]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 dark:bg-dark-navy">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="w-12 h-12 animate-spin text-brand-coral mx-auto mb-4" />
            <h2 className="text-xl font-bold dark:text-white mb-2">{t('import.processing')}</h2>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold dark:text-white mb-2">{t('import.success')}</h2>
            <p className="text-gray-500 dark:text-gray-400">{t('import.redirecting')}</p>
          </>
        )}
        {status === 'error' && (
          <>
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold dark:text-white mb-2">{t('import.error')}</h2>
            <p className="text-red-400 text-sm mb-6">{errorMsg}</p>
            <button 
              onClick={() => navigate('/', { replace: true })}
              className="px-6 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white rounded-lg transition"
            >
              {t('nav.home')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
