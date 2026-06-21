import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, WifiOff, ShieldAlert, Home, ArrowLeft, RefreshCw, Bug, Copy, Check, ExternalLink } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import logo from '../assets/logo.png';

export type ErrorType = 'NOT_FOUND' | 'NETWORK' | 'APPLICATION' | 'PERMISSION';

interface ErrorPageProps {
  type?: ErrorType;
  title?: string;
  description?: string;
  error?: Error | null;
  onRetry?: () => void;
}

const ERROR_ICONS: Record<ErrorType, typeof AlertTriangle> = {
  NOT_FOUND: AlertTriangle,
  NETWORK: WifiOff,
  APPLICATION: AlertTriangle,
  PERMISSION: ShieldAlert,
};

function getDefaultMessages(type: ErrorType, t: (key: string, params?: Record<string, string | number>) => string) {
  switch (type) {
    case 'NOT_FOUND':
      return {
        title: t('error.notFound.title'),
        description: t('error.notFound.description'),
      };
    case 'NETWORK':
      return {
        title: t('error.network.title'),
        description: t('error.network.description'),
      };
    case 'PERMISSION':
      return {
        title: t('error.permission.title'),
        description: t('error.permission.description'),
      };
    default:
      return {
        title: t('error.application.title'),
        description: t('error.application.description'),
      };
  }
}

function isNetworkError(error?: Error | null): boolean {
  if (!error) return false;
  const msg = error.message.toLowerCase();
  return msg.includes('network') || msg.includes('fetch') || msg.includes('networkerror') ||
    msg.includes('failed to fetch') || msg.includes('offline') || msg.includes('econnaborted');
}

function inferErrorType(error?: Error | null): ErrorType {
  if (!error) return 'APPLICATION';
  if (isNetworkError(error)) return 'NETWORK';
  return 'APPLICATION';
}

export default function ErrorPage({ type: forcedType, title, description, error, onRetry }: ErrorPageProps) {
  const { t, isRTL } = useLanguage();
  const navigate = useNavigate();
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);

  const resolvedType = forcedType || inferErrorType(error);
  const Icon = ERROR_ICONS[resolvedType];
  const messages = getDefaultMessages(resolvedType, t);

  const displayTitle = title || messages.title;
  const displayDescription = description || messages.description;

  const errorDetails = error ? `${error.name}: ${error.message}\n${error.stack || ''}` : '';

  const handleCopyDetails = async () => {
    if (!errorDetails) return;
    try {
      await navigator.clipboard.writeText(
        `Error: ${displayTitle}\n${displayDescription}\n\n${errorDetails}`
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard write failed
    }
  };

  const handleReport = () => {
    const subject = encodeURIComponent(`Wasla Error: ${displayTitle}`);
    const body = encodeURIComponent(
      `Error: ${displayTitle}\n${displayDescription}\n\n${errorDetails}\n\nURL: ${window.location.href}`
    );
    window.open(`mailto:support@wasla.app?subject=${subject}&body=${body}`, '_blank', 'noopener');
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-white px-4 dark:bg-dark-navy">
      {/* Background decoration */}
      <div
        className={`pointer-events-none absolute -top-24 ${isRTL ? '-left-24' : '-right-24'} h-80 w-80 rounded-full opacity-[0.08] dark:opacity-[0.12]`}
        style={{ background: 'linear-gradient(135deg, #f37345, #feb144)' }}
      />
      <div
        className={`pointer-events-none absolute -bottom-20 ${isRTL ? '-right-20' : '-left-20'} h-64 w-64 rounded-full opacity-[0.08] dark:opacity-[0.12]`}
        style={{ background: 'linear-gradient(135deg, #b51762, #e2436a)' }}
      />

      <div className="flex w-full max-w-md flex-col items-center text-center">
        {/* Icon */}
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl shadow-lg"
          style={{ background: resolvedType === 'NETWORK'
            ? 'linear-gradient(135deg, #feb144, #f37345)'
            : 'linear-gradient(135deg, #b51762, #e2436a)' }}
        >
          <Icon className="h-10 w-10 text-white" />
        </div>

        {/* Title */}
        <h1 className="mb-2 text-2xl font-extrabold text-gray-900 dark:text-white sm:text-3xl">
          {displayTitle}
        </h1>

        {/* Description */}
        <p className="mb-8 max-w-sm text-sm leading-relaxed text-gray-500 dark:text-gray-400 sm:text-base">
          {displayDescription}
        </p>

        {/* Actions */}
        <div className="flex w-full flex-col gap-2.5">
          {onRetry && (
            <button
              onClick={onRetry}
              className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-all active:scale-95"
              style={{ background: 'linear-gradient(135deg, #e2436a, #f37345)' }}
            >
              <RefreshCw className="h-4 w-4" />
              {t('error.tryAgain')}
            </button>
          )}
          <button
            onClick={() => navigate('/', { replace: true })}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:ring-gray-600 dark:hover:bg-gray-700 transition-all active:scale-95"
          >
            <Home className="h-4 w-4" />
            {t('error.goHome')}
          </button>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:ring-gray-600 dark:hover:bg-gray-700 transition-all active:scale-95"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('error.goBack')}
          </button>
        </div>

        {/* Technical Details */}
        {errorDetails && (
          <div className="mt-8 w-full">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
            >
              <Bug className="h-3.5 w-3.5" />
              {t('error.technicalDetails')}
            </button>
            {showDetails && (
              <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
                <pre className="max-h-48 overflow-auto text-left text-xs leading-relaxed text-gray-600 dark:text-gray-400 whitespace-pre-wrap break-all font-mono">
                  {errorDetails}
                </pre>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={handleCopyDetails}
                    className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-200 hover:bg-gray-100 dark:text-gray-400 dark:ring-gray-600 dark:hover:bg-gray-700 transition-all"
                  >
                    {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {copied ? t('error.detailsCopied') : t('error.copyDetails')}
                  </button>
                  <button
                    onClick={handleReport}
                    className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-200 hover:bg-gray-100 dark:text-gray-400 dark:ring-gray-600 dark:hover:bg-gray-700 transition-all"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {t('error.reportIssue')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Branding */}
        <div className="mt-10 flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
          <img src={logo} alt="" className="h-5 w-5 object-contain opacity-60" />
          <span className="font-medium">Wasla</span>
        </div>
      </div>
    </div>
  );
}
