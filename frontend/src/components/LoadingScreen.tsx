import { memo, useState, useEffect } from "react";
import { useLanguage } from "../context/LanguageContext";

interface LoadingScreenProps {
  fadeOut?: boolean;
}

const LoadingScreen = memo(function LoadingScreen({ fadeOut }: LoadingScreenProps) {
  const { t, isRTL } = useLanguage();
  const appName = isRTL ? "\u0648\u0635\u0644\u0629" : "Wasla";
  const benefitKeys = [
    'loadingScreen.benefit1',
    'loadingScreen.benefit2',
    'loadingScreen.benefit3',
    'loadingScreen.benefit4',
    'loadingScreen.benefit5',
    'loadingScreen.benefit6',
    'loadingScreen.benefit7',
    'loadingScreen.benefit8',
    'loadingScreen.benefit9',
    'loadingScreen.benefit10',
    'loadingScreen.benefit11',
    'loadingScreen.benefit12',
    'loadingScreen.benefit13',
    'loadingScreen.benefit14',
    'loadingScreen.benefit15',
    'loadingScreen.benefit16',
    'loadingScreen.benefit17',
    'loadingScreen.benefit18',
    'loadingScreen.benefit19',
    'loadingScreen.benefit20',
    'loadingScreen.benefit21',
    'loadingScreen.benefit22',
    'loadingScreen.benefit23',
    'loadingScreen.benefit24',
    'loadingScreen.benefit25',
    'loadingScreen.benefit26',
    'loadingScreen.benefit27',
    'loadingScreen.benefit28',
    'loadingScreen.benefit29',
    'loadingScreen.benefit30',
  ];

  const [currentBenefit, setCurrentBenefit] = useState(() => {
    return t(benefitKeys[Math.floor(Math.random() * benefitKeys.length)]);
  });

  useEffect(() => {
    if (fadeOut) return;

    const interval = setInterval(() => {
      setCurrentBenefit(t(benefitKeys[Math.floor(Math.random() * benefitKeys.length)]));
    }, 8000);

    return () => clearInterval(interval);
  }, [fadeOut, benefitKeys, t]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-dark-navy ${
        fadeOut ? "splash-fade-out pointer-events-none" : ""
      }`}
      style={{ minHeight: "100dvh" }}
    >
      <div className="flex flex-col items-center gap-6 px-6 w-full max-w-sm mx-auto">
        <img
          src="/logo.png"
          alt={appName}
          className="w-28 h-28 md:w-36 md:h-36 object-contain splash-logo-pulse max-w-[70vw]"
        />
        <h1
          className="text-3xl md:text-4xl font-bold text-white tracking-wide text-center"
          style={isRTL ? { fontFamily: "'Tajawal', sans-serif" } : undefined}
        >
          {appName}
        </h1>
        <div className="relative flex flex-col items-center">
          <div
            className="text-white/90 text-sm md:text-base text-center max-w-xs transition-all duration-700 ease-in-out relative"
            style={isRTL ? { fontFamily: "'Tajawal', sans-serif" } : undefined}
          >
            <span className={`absolute ${isRTL ? 'right-0' : 'left-0'} -top-3 text-5xl text-white/20 font-serif select-none`}>
              {isRTL ? '\u00AB' : '\u201c'}
            </span>
            <span className="relative px-6 py-2">
              {currentBenefit}
            </span>
            <span className={`absolute ${isRTL ? 'left-0' : 'right-0'} -bottom-3 text-5xl text-white/20 font-serif select-none`}>
              {isRTL ? '\u00BB' : '\u201d'}
            </span>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-white/40 text-xs">●</span>
            <span className="text-white/40 text-xs">●</span>
            <span className="text-white/40 text-xs">●</span>
          </div>
        </div>
        <div className="flex gap-3">
          <span className="w-3.5 h-3.5 md:w-4 md:h-4 rounded-full bg-brand-coral splash-dot" style={{ animationDelay: "0ms" }} />
          <span className="w-3.5 h-3.5 md:w-4 md:h-4 rounded-full bg-brand-orange splash-dot" style={{ animationDelay: "150ms" }} />
          <span className="w-3.5 h-3.5 md:w-4 md:h-4 rounded-full bg-brand-yellow splash-dot" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  );
});

export default LoadingScreen;
