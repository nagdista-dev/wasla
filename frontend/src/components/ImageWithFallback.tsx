import { useState } from 'react';

interface ImageWithFallbackProps {
  src?: string;
  alt: string;
  className?: string;
  fallback?: React.ReactNode;
  aspectRatio?: string;
}

export default function ImageWithFallback({ src, alt, className = '', fallback, aspectRatio }: ImageWithFallbackProps) {
  const [error, setError] = useState(false);

  if (!src || error) {
    if (fallback) return <>{fallback}</>;
    return (
      <div className={`${className} bg-gradient-to-br from-brand-pink via-brand-coral to-brand-yellow flex items-center justify-center`}>
        <span className="text-white/70 text-sm font-medium">{alt.charAt(0).toUpperCase()}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setError(true)}
      style={aspectRatio ? { aspectRatio } : undefined}
    />
  );
}
