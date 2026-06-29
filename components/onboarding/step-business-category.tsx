'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { getCategoryGroupsByType } from '@/lib/config/business-categories';
import { BusinessTypeEnum, BusinessCategoryEnum } from '@/lib/types';

interface StepBusinessCategoryProps {
  businessType: string;
  value: string;
  onChange: (value: string) => void;
}

export function StepBusinessCategory({
  businessType,
  value,
  onChange,
}: StepBusinessCategoryProps) {
  // Get categories for the selected business type
  const categoryGroup = useMemo(() => {
    if (!businessType) return null;
    const groups = getCategoryGroupsByType();
    return groups[businessType as BusinessTypeEnum] || null;
  }, [businessType]);

  if (!categoryGroup) {
    return (
      <div className="text-center">
        <p className="text-muted-foreground">Please select a business type first</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900">
          What type of {categoryGroup.typeName.toLowerCase()} do you operate?
        </h2>
        <p className="mt-2 text-lg text-gray-600">
          We&apos;ll customize features and defaults for your specific business
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {categoryGroup.categories.map((category) => (
          <button
            key={category.id}
            onClick={() => onChange(category.id)}
            className={cn(
              'p-4 rounded-lg border-2 transition-all duration-200 text-left',
              'hover:border-primary/50 hover:bg-primary/5',
              value === category.id
                ? 'border-primary bg-primary/10 shadow-md'
                : 'border-border'
            )}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground text-sm">
                  {category.name}
                </h3>
              </div>
              <div
                className={cn(
                  'h-5 w-5 rounded-full border-2 transition-all flex items-center justify-center',
                  value === category.id
                    ? 'border-primary bg-primary'
                    : 'border-muted-foreground/30'
                )}
              >
                {value === category.id && (
                  <div className="h-2 w-2 bg-white rounded-full" />
                )}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Additional Info */}
      <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
        <p className="text-sm text-blue-900">
          <span className="font-semibold">Why does this matter?</span> Your
          category selection helps us configure default features, product
          categories, and workflows that match your business. You can always
          change these settings later.
        </p>
      </div>
    </div>
  );
}
