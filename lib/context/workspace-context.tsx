'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { WorkspaceConfig, WorkspaceContextType } from '@/lib/types/workspace'
import { WorkspaceService } from '@/lib/services/workspace-service'

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined)

interface WorkspaceProviderProps {
  children: React.ReactNode
  workspaceId?: string
  initialConfig?: WorkspaceConfig
}

export function WorkspaceProvider({
  children,
  workspaceId,
  initialConfig,
}: WorkspaceProviderProps) {
  const [config, setConfig] = useState<WorkspaceConfig | null>(initialConfig || null)
  const [isLoading, setIsLoading] = useState(!initialConfig)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!workspaceId || initialConfig) {
      return
    }

    const loadConfig = async () => {
      try {
        setIsLoading(true)
        const loadedConfig = await WorkspaceService.getWorkspaceConfig(workspaceId)
        if (loadedConfig) {
          setConfig(loadedConfig)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load workspace')
      } finally {
        setIsLoading(false)
      }
    }

    loadConfig()
  }, [workspaceId, initialConfig])

  const refreshConfig = async () => {
    if (!workspaceId) return

    try {
      setIsLoading(true)
      const loadedConfig = await WorkspaceService.getWorkspaceConfig(workspaceId)
      if (loadedConfig) {
        setConfig(loadedConfig)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh workspace')
    } finally {
      setIsLoading(false)
    }
  }

  const value: WorkspaceContextType = {
    config,
    isLoading,
    error,
    refreshConfig,
  }

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace(): WorkspaceContextType {
  const context = useContext(WorkspaceContext)
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider')
  }
  return context
}

export function useWorkspaceConfig(): WorkspaceConfig | null {
  const { config } = useWorkspace()
  return config
}
