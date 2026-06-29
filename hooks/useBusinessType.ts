/**
 * useBusinessType Hook
 * Get business type specific configuration and metadata
 */

'use client';

import { useMemo } from 'react';
import { useOrganization } from './useOrganization';
import { getBusinessConfig, supportsModule, hasFeature } from '@/lib/config/business-types';
import { BUSINESS_TYPE_METADATA } from '@/lib/types';
import type { BusinessTypeEnum, BusinessTypeMetadata } from '@/lib/types';
import type { BusinessTypeConfig } from '@/lib/config/business-types';

export function useBusinessType() {
  const { organization, isLoading } = useOrganization();

  const businessType = useMemo(() => {
    if (!organization) return null;
    return organization.businessType as BusinessTypeEnum;
  }, [organization]);

  const config = useMemo<BusinessTypeConfig | null>(() => {
    if (!businessType) return null;
    return getBusinessConfig(businessType);
  }, [businessType]);

  const metadata = useMemo<BusinessTypeMetadata | null>(() => {
    if (!businessType) return null;
    return BUSINESS_TYPE_METADATA[businessType] || null;
  }, [businessType]);

  const checkModule = (moduleName: string): boolean => {
    if (!businessType) return false;
    return supportsModule(businessType, moduleName);
  };

  const checkFeature = (featureName: string): boolean => {
    if (!businessType) return false;
    return hasFeature(businessType, featureName);
  };

  return {
    businessType,
    config,
    metadata,
    isLoading,
    checkModule,
    checkFeature,
    navigation: config?.navigation || [],
    dashboardLayout: config?.dashboardLayout || [],
    modules: config?.modules || [],
    features: config?.features || [],
  };
}
