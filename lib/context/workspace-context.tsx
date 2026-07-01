'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import type { WorkspaceConfig, WorkspaceContextType } from '@/lib/types/workspace'

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined)

async function fetchWorkspaceConfig(workspaceId: string): Promise<WorkspaceConfig | null> {
  const response = await fetch(`/api/workspace/${workspaceId}`, {
    credentials: 'include',
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    throw new Error(payload?.message ?? 'Failed to load workspace')
  }

  const payload = await response.json()
  return payload.workspaceConfig ?? null
}

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
        const loadedConfig = await fetchWorkspaceConfig(workspaceId)
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
      const loadedConfig = await fetchWorkspaceConfig(workspaceId)
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
