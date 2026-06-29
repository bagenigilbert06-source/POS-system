/**
 * Business Registry Service
 * Centralized registry for all business types and their configurations
 * Enables dynamic registration of new business types without modifying core code
 */

import { BusinessTypeEnum, BUSINESS_TYPE_METADATA, BUSINESS_TYPES } from '../types';
import { getBusinessConfig, supportsModule, hasFeature } from '../config/business-types';
import type { BusinessTypeConfig } from '../config/business-types';

interface BusinessTypeModule {
  name: string;
  enabled: boolean;
  config?: Record<string, any>;
}

interface BusinessRegistry {
  businessType: BusinessTypeEnum;
  metadata: any;
  config: BusinessTypeConfig;
  modules: Map<string, BusinessTypeModule>;
  features: Set<string>;
}

class BusinessRegistryService {
  private registry: Map<BusinessTypeEnum, BusinessRegistry> = new Map();
  private initialized = false;

  /**
   * Initialize the registry with all default business types
   */
  initialize(): void {
    if (this.initialized) return;

    for (const businessType of BUSINESS_TYPES) {
      this.registerBusinessType(businessType.id);
    }

    this.initialized = true;
  }

  /**
   * Register a business type
   */
  registerBusinessType(businessType: BusinessTypeEnum): void {
    if (this.registry.has(businessType)) {
      console.warn(`Business type ${businessType} is already registered`);
      return;
    }

    const config = getBusinessConfig(businessType);
    const metadata = BUSINESS_TYPE_METADATA[businessType];

    const registry: BusinessRegistry = {
      businessType,
      metadata,
      config,
      modules: new Map(),
      features: new Set(config.features),
    };

    // Initialize modules
    for (const moduleName of config.modules) {
      registry.modules.set(moduleName, {
        name: moduleName,
        enabled: config.requiredModules.includes(moduleName),
      });
    }

    this.registry.set(businessType, registry);
  }

  /**
   * Get business type registry
   */
  getRegistry(businessType: BusinessTypeEnum): BusinessRegistry | null {
    return this.registry.get(businessType) || null;
  }

  /**
   * Get all registered business types
   */
  getAllBusinessTypes(): BusinessTypeEnum[] {
    return Array.from(this.registry.keys());
  }

  /**
   * Check if business type is registered
   */
  isRegistered(businessType: BusinessTypeEnum): boolean {
    return this.registry.has(businessType);
  }

  /**
   * Check if business type has a module enabled
   */
  hasModule(businessType: BusinessTypeEnum, moduleName: string): boolean {
    const registry = this.getRegistry(businessType);
    if (!registry) return false;
    const module = registry.modules.get(moduleName);
    return module?.enabled || false;
  }

  /**
   * Enable a module for a business type
   */
  enableModule(businessType: BusinessTypeEnum, moduleName: string, config?: Record<string, any>): void {
    const registry = this.getRegistry(businessType);
    if (!registry) return;

    const module = registry.modules.get(moduleName);
    if (!module) {
      registry.modules.set(moduleName, {
        name: moduleName,
        enabled: true,
        config,
      });
    } else {
      module.enabled = true;
      if (config) module.config = config;
    }
  }

  /**
   * Disable a module for a business type
   */
  disableModule(businessType: BusinessTypeEnum, moduleName: string): void {
    const registry = this.getRegistry(businessType);
    if (!registry) return;

    const module = registry.modules.get(moduleName);
    if (module) {
      module.enabled = false;
    }
  }

  /**
   * Get all enabled modules for a business type
   */
  getEnabledModules(businessType: BusinessTypeEnum): string[] {
    const registry = this.getRegistry(businessType);
    if (!registry) return [];
    return Array.from(registry.modules.values())
      .filter((m) => m.enabled)
      .map((m) => m.name);
  }

  /**
   * Get all available modules for a business type
   */
  getAvailableModules(businessType: BusinessTypeEnum): string[] {
    const registry = this.getRegistry(businessType);
    if (!registry) return [];
    return Array.from(registry.modules.keys());
  }

  /**
   * Check if business type has a feature
   */
  hasFeature(businessType: BusinessTypeEnum, featureName: string): boolean {
    const registry = this.getRegistry(businessType);
    if (!registry) return false;
    return registry.features.has(featureName);
  }

  /**
   * Get business type configuration
   */
  getConfig(businessType: BusinessTypeEnum): BusinessTypeConfig | null {
    const registry = this.getRegistry(businessType);
    return registry?.config || null;
  }

  /**
   * Get dashboard layout for a business type
   */
  getDashboardLayout(businessType: BusinessTypeEnum) {
    const registry = this.getRegistry(businessType);
    return registry?.config.dashboardLayout || [];
  }

  /**
   * Get navigation items for a business type
   */
  getNavigation(businessType: BusinessTypeEnum) {
    const registry = this.getRegistry(businessType);
    return registry?.config.navigation || [];
  }

  /**
   * Check if a specific module and feature are available
   */
  isFeatureAvailable(businessType: BusinessTypeEnum, moduleName: string, featureName: string): boolean {
    return this.hasModule(businessType, moduleName) && this.hasFeature(businessType, featureName);
  }
}

// Singleton instance
const businessRegistryService = new BusinessRegistryService();
businessRegistryService.initialize();

export default businessRegistryService;
