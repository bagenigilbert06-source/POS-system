'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useWorkspace } from '@/lib/context/workspace-context';
import { isPharmacyBusiness } from '@/lib/pharmacy/rules';

const LIQUOR_FALLBACK_IMAGE = '/images/inventory/liquor-product-placeholder.png';
const PHARMACY_FALLBACK_IMAGE = '/images/industries/pharmacy.png';

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
  const { config } = useWorkspace();
  const fallbackImage = config && isPharmacyBusiness(config.businessType, config.businessCategory)
    ? PHARMACY_FALLBACK_IMAGE
    : LIQUOR_FALLBACK_IMAGE;
  const [imageSrc, setImageSrc] = useState(src || fallbackImage);

  useEffect(() => {
    setImageSrc(src || fallbackImage);
  }, [src, fallbackImage]);

  return (
    <Image
      src={imageSrc}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      unoptimized
      onError={() => {
        if (imageSrc !== fallbackImage) setImageSrc(fallbackImage);
      }}
      className={cn('object-cover', className)}
    />
  );
}
