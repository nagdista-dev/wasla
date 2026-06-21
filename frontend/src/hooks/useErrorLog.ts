import { useEffect } from 'react';

interface ErrorLogEntry {
  message: string;
  source: string;
  stack?: string;
  timestamp: number;
}

const MAX_LOG = 50;
const log: ErrorLogEntry[] = [];

export function useErrorLog() {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      const entry: ErrorLogEntry = {
        message: event.message,
        source: 'unhandled',
        stack: event.error?.stack,
        timestamp: Date.now(),
      };
      log.push(entry);
      if (log.length > MAX_LOG) log.shift();
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      const entry: ErrorLogEntry = {
        message: event.reason?.message ?? String(event.reason),
        source: 'promise',
        stack: event.reason?.stack,
        timestamp: Date.now(),
      };
      log.push(entry);
      if (log.length > MAX_LOG) log.shift();
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);
}

export function getErrorLog(): ErrorLogEntry[] {
  return [...log];
}
