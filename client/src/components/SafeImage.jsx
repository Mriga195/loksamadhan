import React, { useState } from 'react';
import Icon from './Icon';

/**
 * SafeImage component that gracefully falls back to a neat placeholder
 * if an image fails to load (404, network failure, or bad URL).
 */
export default function SafeImage({
  src,
  alt = '',
  className = 'size-full object-cover',
  fallbackText = 'Photo unavailable',
  iconClassName = 'size-6',
  ...props
}) {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <div
        className={`flex size-full flex-col items-center justify-center bg-slate-100 p-2 text-center text-slate-400 select-none ${className}`}
        title={fallbackText}
      >
        <Icon name="photo" className={`${iconClassName} mb-1 text-slate-400 shrink-0`} />
        {fallbackText && (
          <span className="text-[10px] font-medium leading-tight text-slate-500 line-clamp-2">
            {fallbackText}
          </span>
        )}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className={className}
      onError={() => setFailed(true)}
      {...props}
    />
  );
}
