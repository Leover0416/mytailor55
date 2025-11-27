import React, { useState, useEffect } from 'react';
import { getImageUrl } from '../services/db';

interface Props {
  src: string;
  alt?: string;
  className?: string;
}

export const ImageDisplay: React.FC<Props> = ({ src, alt, className }) => {
  const [imageUrl, setImageUrl] = useState<string>(src);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUrl = async () => {
      try {
        // 如果是 base64 或完整 URL，直接使用
        if (src.startsWith('data:image') || src.startsWith('http://') || src.startsWith('https://')) {
          setImageUrl(src);
          setLoading(false);
          return;
        }
        
        // 如果是 Storage 路径，获取签名 URL
        const url = await getImageUrl(src);
        setImageUrl(url);
      } catch (error) {
        console.error('加载图片失败:', error);
        setImageUrl(src); // 失败时使用原路径
      } finally {
        setLoading(false);
      }
    };

    loadUrl();
  }, [src]);

  if (loading) {
    return (
      <div className={`bg-gray-200 animate-pulse ${className}`}>
        <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
          加载中...
        </div>
      </div>
    );
  }

  return (
    <img 
      src={imageUrl} 
      alt={alt || 'Image'} 
      className={className}
      onError={(e) => {
        console.error('图片加载错误:', imageUrl);
        // 如果加载失败，显示占位符
        (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2U1ZTdlYiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5Y2EzYWYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj7lm77niYfliqDovb3lpLHotKU8L3RleHQ+PC9zdmc+';
      }}
    />
  );
};

