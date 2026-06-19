import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';
import { Home } from 'lucide-react';

function NotFoundPage() {
  const { t, isRTL } = useLanguage();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/', { replace: true });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [navigate]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.12, delayChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 14 } },
  };

  return (
    <div className="relative flex min-h-[80dvh] flex-col items-center justify-center overflow-hidden px-4">
      {/* Background floating circles */}
      <motion.div
        className={`pointer-events-none absolute -top-20 ${isRTL ? '-left-20' : '-right-20'} h-72 w-72 rounded-full opacity-10`}
        style={{ background: 'linear-gradient(135deg, #f37345, #feb144)' }}
        animate={{ y: [0, -20, 0], scale: [1, 1.05, 1] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className={`pointer-events-none absolute -bottom-16 ${isRTL ? '-right-16' : '-left-16'} h-56 w-56 rounded-full opacity-10`}
        style={{ background: 'linear-gradient(135deg, #b51762, #e2436a)' }}
        animate={{ y: [0, 24, 0], scale: [1, 1.08, 1] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className={`pointer-events-none absolute top-1/3 ${isRTL ? 'right-1/4' : 'left-1/4'} h-32 w-32 rounded-full opacity-5`}
        style={{ background: 'linear-gradient(135deg, #e2436a, #f37345)' }}
        animate={{ y: [0, -16, 0], x: [0, 12, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex flex-col items-center gap-6 text-center"
      >
        {/* Abstract 404 graphic */}
        <motion.div variants={itemVariants} className="relative flex items-center gap-3">
          <div className="relative">
            <div
              className="flex h-28 w-24 items-center justify-center rounded-2xl shadow-lg sm:h-32 sm:w-28"
              style={{ background: 'linear-gradient(135deg, #b51762, #e2436a)' }}
            >
              <span className="text-6xl font-bold text-white/90 sm:text-7xl">4</span>
            </div>
            <motion.div
              className="absolute -top-2 -right-2 h-4 w-4 rounded-full"
              style={{ background: '#feb144' }}
              animate={{ scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>

          <motion.div
            className="flex h-24 w-24 items-center justify-center rounded-full shadow-lg sm:h-28 sm:w-28"
            style={{ background: 'linear-gradient(135deg, #f37345, #feb144)' }}
            animate={{ rotate: [0, 6, 0, -6, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <span className="text-5xl font-bold text-white/90 sm:text-6xl">0</span>
          </motion.div>

          <div className="relative">
            <div
              className="flex h-28 w-24 items-center justify-center rounded-2xl shadow-lg sm:h-32 sm:w-28"
              style={{ background: 'linear-gradient(135deg, #e2436a, #f37345)' }}
            >
              <span className="text-6xl font-bold text-white/90 sm:text-7xl">4</span>
            </div>
            <motion.div
              className="absolute -bottom-2 -left-2 h-4 w-4 rounded-full"
              style={{ background: '#b51762' }}
              animate={{ scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
        </motion.div>

        {/* Message */}
        <motion.div variants={itemVariants} className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
            {t('notFound.title')}
          </h1>
          <p className="mx-auto max-w-sm text-sm leading-relaxed text-gray-500 dark:text-gray-400 sm:text-base">
            {t('notFound.description')}
          </p>
        </motion.div>

        {/* Actions */}
        <motion.div variants={itemVariants} className="flex flex-col items-center gap-3">
          <button
            onClick={() => navigate('/', { replace: true })}
            className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all active:scale-95"
            style={{ background: 'linear-gradient(135deg, #e2436a, #f37345)' }}
          >
            <Home className="h-4 w-4" />
            {t('notFound.goHome')}
          </button>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {t('notFound.redirecting', { countdown })}
          </span>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default NotFoundPage;
