import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, Play, Pause, Volume2, VolumeX, Clock, Headphones, SkipBack, SkipForward, Rewind, FastForward, Timer } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAudio } from '../context/AudioContext';
import { usePlayer } from '../context/PlayerContext';
import { extractVideoId } from '../utils/videoUtils';
import { useToast } from '../components/Toast';
import { useMeta } from '../hooks/useMeta';
import { findCachedHomeVideoById } from '../services/videoCacheService';
import type { LatestVideo } from '../types';

const SLEEP_TIMER_OPTIONS = [10, 20, 30, 60] as const;

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function AudioPage() {
  const { videoId } = useParams<{ videoId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, isRTL } = useLanguage();
  const { showToast } = useToast();
  const { currentVideo: playerVideo } = usePlayer();
  const {
    currentVideo,
    isPlaying,
    currentTime,
    duration,
    volume,
    sleepTimerMinutes,
    sleepTimerRemaining,
    playAudio,
    pauseAudio,
    resumeAudio,
    seekAudio,
    setVolume,
    setSleepTimer,
  } = useAudio();

  const [video, setVideo] = useState<(LatestVideo & { channelId?: string }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSleepMenu, setShowSleepMenu] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [showStartTimeInput, setShowStartTimeInput] = useState(false);
  const [startTimeValue, setStartTimeValue] = useState('');
  const progressRef = useRef<HTMLDivElement>(null);

  useMeta({ title: video ? `${video.title} - ${t('audioPage.title')}` : t('audioPage.title') });

  useEffect(() => {
    let cancelled = false;
    let found: (LatestVideo & { channelId?: string }) | null = null;

    const resolveVideo = async () => {
      const stateData = location.state as { video?: LatestVideo; channelId?: string } | undefined;
      if (stateData?.video) {
        const extractedId = extractVideoId(stateData.video.link);
        if (extractedId === videoId) {
          found = { ...stateData.video, channelId: stateData.channelId };
        }
      }

      if (!found && currentVideo && currentVideo._videoId === videoId) {
        found = { ...currentVideo };
      }

      if (!found && playerVideo && playerVideo._videoId === videoId) {
        found = { ...playerVideo };
      }

      if (!found && videoId) {
        found = await findCachedHomeVideoById(videoId);
      }

      if (cancelled) return;
      if (found) {
        setVideo(found);
        if (!currentVideo || currentVideo._videoId !== videoId) {
          playAudio(found, found.channelId);
        }
      }
      setLoading(false);
    };

    void resolveVideo();

    return () => {
      cancelled = true;
    };
  }, [videoId, currentVideo, playerVideo, location.state, playAudio]);

  const handleBack = useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  }, [navigate]);

  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      pauseAudio();
    } else {
      resumeAudio();
    }
  }, [isPlaying, pauseAudio, resumeAudio]);

  const handleProgressClick = useCallback((e: React.MouseEvent) => {
    if (!progressRef.current || !duration) return;
    const rect = progressRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = isRTL ? 1 - x / rect.width : x / rect.width;
    seekAudio(Math.max(0, Math.min(duration, ratio * duration)));
  }, [duration, seekAudio, isRTL]);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(parseFloat(e.target.value));
  }, [setVolume]);

  const handleSleepTimer = useCallback((minutes: number) => {
    if (sleepTimerMinutes === minutes) {
      setSleepTimer(null);
    } else {
      setSleepTimer(minutes);
      showToast(t('audioPage.sleepTimerSet', { minutes: minutes.toString() }), 'info');
    }
    setShowSleepMenu(false);
  }, [sleepTimerMinutes, setSleepTimer, showToast, t]);

  const clearSleepTimer = useCallback(() => {
    setSleepTimer(null);
    setShowSleepMenu(false);
  }, [setSleepTimer]);

  const handleStartTimeSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = startTimeValue.trim();
    if (!trimmed || !duration) return;
    let seconds: number;
    if (/^\d+$/.test(trimmed)) {
      seconds = parseInt(trimmed, 10);
    } else if (/^(\d+):(\d{1,2})$/.test(trimmed)) {
      const [, m, s] = trimmed.match(/^(\d+):(\d{1,2})$/)!;
      seconds = parseInt(m, 10) * 60 + parseInt(s, 10);
    } else {
      return;
    }
    seekAudio(Math.max(0, Math.min(duration, seconds)));
    setShowStartTimeInput(false);
    setStartTimeValue('');
  }, [startTimeValue, duration, seekAudio]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const sleepTimerLabel = sleepTimerRemaining !== null ? formatTime(sleepTimerRemaining) : null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-dark-navy">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 border-4 border-gray-200 dark:border-white/20 rounded-full" />
            <div className="absolute inset-0 border-4 border-brand-coral rounded-full animate-spin border-t-transparent" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('miniPlayer.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 dark:from-dark-navy dark:to-[#0a1628]">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-4 sm:py-8">
        <button
          onClick={handleBack}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors rounded-lg px-2 py-1.5 -ml-2 hover:bg-gray-100 dark:hover:bg-white/10"
        >
          <ChevronLeft className="h-4 w-4" />
          {t('audioPage.back')}
        </button>

        <div className="mt-8 sm:mt-12 flex flex-col items-center text-center">
          <div className="w-32 h-32 sm:w-48 sm:h-48 rounded-full bg-gradient-to-br from-brand-coral to-brand-orange flex items-center justify-center shadow-2xl mb-6 sm:mb-8">
            <Headphones className="w-16 h-16 sm:w-24 sm:h-24 text-white" />
          </div>

          {video ? (
            <>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white line-clamp-2 mb-2">
                {video.title}
              </h1>
              <p className="text-sm sm:text-base text-brand-coral font-medium mb-8 sm:mb-12">
                {video.channelName}
              </p>

              <div className="w-full max-w-md space-y-4">
                <div
                  ref={progressRef}
                  className="w-full h-2 bg-gray-200 dark:bg-white/20 rounded-full cursor-pointer group relative"
                  onClick={handleProgressClick}
                  role="slider"
                  aria-label={t('audioPage.seek')}
                  aria-valuemin={0}
                  aria-valuemax={duration}
                  aria-valuenow={currentTime}
                  tabIndex={0}
                >
                  <div
                    className="h-full bg-gradient-to-r from-brand-coral to-brand-orange rounded-full relative transition-all duration-100"
                    style={{ width: `${progress}%` }}
                  >
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-5 h-5 bg-white rounded-full shadow-md border-2 border-brand-coral opacity-100 transition-opacity" />
                  </div>
                </div>

                <div className="flex justify-between text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>

                <div className="flex items-center justify-center gap-2 sm:gap-4 pt-4">
                  <button
                    onClick={() => seekAudio(Math.max(0, currentTime - 10))}
                    className="flex flex-col items-center gap-0.5 p-1.5 sm:p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white transition-colors group"
                    aria-label={t('audioPage.skipBack10')}
                  >
                    <SkipBack className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="text-[10px] leading-none font-medium">10</span>
                  </button>

                  <button
                    onClick={() => seekAudio(Math.max(0, currentTime - 5))}
                    className="flex flex-col items-center gap-0.5 p-1.5 sm:p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white transition-colors group"
                    aria-label={t('audioPage.skipBack5')}
                  >
                    <Rewind className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="text-[10px] leading-none font-medium">5</span>
                  </button>

                  <button
                    onClick={handlePlayPause}
                    className="w-14 h-14 sm:w-20 sm:h-20 rounded-full bg-gradient-to-r from-brand-coral to-brand-orange flex items-center justify-center text-white shadow-lg hover:shadow-xl transition-all active:scale-95"
                    aria-label={isPlaying ? t('audioPage.pause') : t('audioPage.play')}
                  >
                    {isPlaying ? (
                      <Pause className="w-6 h-6 sm:w-8 sm:h-8" />
                    ) : (
                      <Play className="w-6 h-6 sm:w-8 sm:h-8 ml-0.5" />
                    )}
                  </button>

                  <button
                    onClick={() => seekAudio(Math.min(duration, currentTime + 5))}
                    className="flex flex-col items-center gap-0.5 p-1.5 sm:p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white transition-colors group"
                    aria-label={t('audioPage.skipForward5')}
                  >
                    <FastForward className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="text-[10px] leading-none font-medium">5</span>
                  </button>

                  <button
                    onClick={() => seekAudio(Math.min(duration, currentTime + 10))}
                    className="flex flex-col items-center gap-0.5 p-1.5 sm:p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white transition-colors group"
                    aria-label={t('audioPage.skipForward10')}
                  >
                    <SkipForward className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="text-[10px] leading-none font-medium">10</span>
                  </button>
                </div>

                <div className="flex items-center justify-center gap-4 pt-6 sm:pt-8">
                  <div className="relative">
                    <button
                      onClick={() => setShowStartTimeInput(!showStartTimeInput)}
                      className="p-2 sm:p-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white transition-colors"
                      aria-label={t('audioPage.jumpToTime')}
                    >
                      <Timer className="w-5 h-5" />
                    </button>
                    {showStartTimeInput && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-3 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700">
                        <form onSubmit={handleStartTimeSubmit} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={startTimeValue}
                            onChange={(e) => setStartTimeValue(e.target.value)}
                            placeholder="MM:SS"
                            className="w-20 px-2 py-1 text-sm bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-coral"
                            autoFocus
                          />
                          <button
                            type="submit"
                            className="px-2.5 py-1 text-sm font-medium text-white bg-brand-coral rounded-lg hover:bg-brand-orange transition-colors"
                          >
                            {t('audioPage.go')}
                          </button>
                        </form>
                      </div>
                    )}
                  </div>

                  <div className="relative">
                    <button
                      onClick={() => setShowVolumeSlider(!showVolumeSlider)}
                      className="p-2 sm:p-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white transition-colors"
                      aria-label={t('audioPage.volume')}
                    >
                      {volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                    </button>
                    {showVolumeSlider && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-3 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700">
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={volume}
                          onChange={handleVolumeChange}
                          className="w-24 h-1.5 accent-brand-coral"
                          aria-label={t('audioPage.volumeSlider')}
                        />
                      </div>
                    )}
                  </div>

                  <div className="relative">
                    <button
                      onClick={() => setShowSleepMenu(!showSleepMenu)}
                      className={`p-2 sm:p-3 transition-colors ${
                        sleepTimerMinutes
                          ? 'text-brand-coral'
                          : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white'
                      }`}
                      aria-label={t('audioPage.sleepTimer')}
                    >
                      <Clock className="w-5 h-5" />
                    </button>
                    {sleepTimerMinutes && sleepTimerLabel && (
                      <span className="absolute -top-1 -right-1 text-[10px] font-bold bg-brand-coral text-white rounded-full px-1.5 py-0.5 leading-none">
                        {sleepTimerLabel}
                      </span>
                    )}
                    {showSleepMenu && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 min-w-[160px]">
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 px-3 py-1.5">
                          {t('audioPage.sleepTimer')}
                        </p>
                        {SLEEP_TIMER_OPTIONS.map((mins) => (
                          <button
                            key={mins}
                            onClick={() => handleSleepTimer(mins)}
                            className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${
                              sleepTimerMinutes === mins
                                ? 'bg-brand-coral/10 text-brand-coral'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10'
                            }`}
                          >
                            {mins} {t('audioPage.minutes')}
                          </button>
                        ))}
                        {sleepTimerMinutes && (
                          <button
                            onClick={clearSleepTimer}
                            className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                          >
                            {t('audioPage.clearTimer')}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="py-8 text-center">
              <p className="text-gray-500 dark:text-gray-400">{t('videoPage.notFound')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(AudioPage);
