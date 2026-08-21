'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

const FALLBACK_IMAGE = '/images/inventory/liquor-product-placeholder.png';

export function ProductImage({
  src,
  alt,
  sizes,
  className,
  priority = false,
}: {
  src?: string | null;
  alt: string;
  sizes: string;
  className?: string;
  priority?: boolean;
}) {
  const [imageSrc, setImageSrc] = useState(src || FALLBACK_IMAGE);

  useEffect(() => {
    setImageSrc(src || FALLBACK_IMAGE);
  }, [src]);

  return (
    <Image
      src={imageSrc}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      unoptimized
      onError={() => {
        if (imageSrc !== FALLBACK_IMAGE) setImageSrc(FALLBACK_IMAGE);
      }}
      className={cn('object-cover', className)}
    />
  );
}
