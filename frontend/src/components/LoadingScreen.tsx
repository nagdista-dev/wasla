import { memo } from "react";

interface LoadingScreenProps {
  fadeOut?: boolean;
}

const LoadingScreen = memo(function LoadingScreen({ fadeOut }: LoadingScreenProps) {
  const isRTL = document.documentElement.dir === "rtl";
  const appName = isRTL ? "\u0648\u0635\u0644\u0629" : "Wasla";

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
