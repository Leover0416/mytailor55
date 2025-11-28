import React, { useState, useEffect, useRef } from 'react';
import { getImageUrl } from '../services/db';

interface Props {
  src: string;
  alt?: string;
  className?: string;
  variant?: 'thumb' | 'full';
}

export const ImageDisplay: React.FC<Props> = ({ src, alt, className, variant = 'thumb' }) => {
  const [imageUrl, setImageUrl] = useState<string>(src);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setShouldLoad(true);
            observer.disconnect();
          }
        });
      },
      { rootMargin: '120px' }
    );

    if (wrapperRef.current) {
      observer.observe(wrapperRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!shouldLoad) return;
    let cancelled = false;

    const loadUrl = async () => {
      setLoading(true);
      setHasError(false);
      try {
        if (src.startsWith('data:image') || src.startsWith('http://') || src.startsWith('https://')) {
          if (!cancelled) {
            setImageUrl(src);
          }
        } else {
          const url = await getImageUrl(
            src,
            variant === 'thumb' ? { width: 600, quality: 75 } : undefined
          );
          if (!cancelled) {
            setImageUrl(url);
          }
        }
      } catch (error) {
        console.error('加载图片失败:', error);
        if (!cancelled) {
          setImageUrl(src);
          setHasError(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadUrl();

    return () => {
      cancelled = true;
    };
  }, [src, shouldLoad, variant]);

  const handleRetry = () => {
    setHasError(false);
    setShouldLoad(false);
    setTimeout(() => setShouldLoad(true), 50);
  };

  if (loading) {
    return (
      <div ref={wrapperRef} className={`bg-gray-200 animate-pulse ${className}`}>
        <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
          加载中...
        </div>
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className="relative w-full h-full">
      <img 
        src={imageUrl} 
        alt={alt || 'Image'} 
        className={className}
        loading="lazy"
        onError={() => setHasError(true)}
      />
      {hasError && (
        <div className="absolute inset-0 bg-black/40 text-white text-xs flex flex-col items-center justify-center gap-1">
          <span>图片加载失败</span>
          <button
            onClick={handleRetry}
            className="px-2 py-1 bg-white/80 text-red-600 rounded-full"
          >
            重试
          </button>
        </div>
      )}
    </div>
  );
};

