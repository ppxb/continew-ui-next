import { createContext, useContext, useMemo, type ReactNode } from 'react'

import type { ProValueTypeMap } from './typing'
import { valueTypeMap as builtins } from './field/value-type-map'

const ProConfigContext = createContext<ProValueTypeMap>(builtins)

export function ProConfigProvider({ valueTypeMap, children }: { valueTypeMap?: ProValueTypeMap; children: ReactNode }) {
  const parent = useContext(ProConfigContext)
  const merged = useMemo(() => ({ ...parent, ...valueTypeMap }), [parent, valueTypeMap])
  return <ProConfigContext.Provider value={merged}>{children}</ProConfigContext.Provider>
}

export function useProConfig() {
  return useContext(ProConfigContext)
}
