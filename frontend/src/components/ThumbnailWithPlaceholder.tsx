import { memo, useState, useCallback } from 'react';

interface ThumbnailWithPlaceholderProps {
  src?: string;
  alt: string;
  className?: string;
}

const ThumbnailWithPlaceholder = memo(function ThumbnailWithPlaceholder({
  src,
  alt,
  className = '',
}: ThumbnailWithPlaceholderProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const handleLoad = useCallback(() => setLoaded(true), []);
  const handleError = useCallback(() => setError(true), []);

  return (
    <>
      <div
        className={`absolute inset-0 bg-gradient-to-br from-brand-pink via-brand-coral to-brand-yellow transition-opacity duration-500 ${
          loaded ? 'opacity-0' : 'opacity-100'
        }`}
      />
      {src && !error && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onLoad={handleLoad}
          onError={handleError}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${className} ${
            loaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}
    </>
  );
});

export default ThumbnailWithPlaceholder;
