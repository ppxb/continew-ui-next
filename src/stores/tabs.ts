import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export interface TabItem {
  id: string
  title: string
  path: string
  closable: boolean
  icon?: string | null
}

export const MAX_HEADER_TABS = 5

export const DEFAULT_PINNED_TAB: TabItem = {
  id: '/dashboard',
  title: '仪表盘',
  path: '/dashboard',
  closable: false,
  icon: 'dashboard'
}

interface TabsState {
  tabs: TabItem[]
  addTab: (tab: { title: string; path: string; closable?: boolean; icon?: string | null }) => void
  closeTab: (path: string) => string | undefined
  closeOtherTabs: (keepPath: string) => void
  closeAllTabs: () => void
  resetTabs: () => void
}

export const useTabsStore = create<TabsState>()(
  persist(
    (set, get) => ({
      tabs: [DEFAULT_PINNED_TAB],

      addTab: ({ title, path, closable = true, icon = null }) => {
        // Do not record authentication or error pages as tabs
        if (!path || path.startsWith('/auth') || path === '/unauthorized') {
          return
        }

        const { tabs } = get()
        const existingIndex = tabs.findIndex(t => t.path === path)

        if (existingIndex !== -1) {
          const existing = tabs[existingIndex]
          if ((title && existing.title !== title) || (icon && existing.icon !== icon)) {
            set({
              tabs: tabs.map((t, idx) =>
                idx === existingIndex ? { ...t, title: title || t.title, icon: icon ?? t.icon } : t
              )
            })
          }
          return
        }

        const newTab: TabItem = {
          id: path,
          title: title || '新标签页',
          path,
          closable: path === '/dashboard' ? false : closable,
          icon: icon ?? null
        }

        let nextTabs = [...tabs]

        // When exceeding max tabs, evict the earliest closable tab (FIFO)
        if (nextTabs.length >= MAX_HEADER_TABS) {
          const firstClosableIndex = nextTabs.findIndex(t => t.closable)
          if (firstClosableIndex !== -1) {
            nextTabs.splice(firstClosableIndex, 1)
          } else {
            // All were somehow unclosable, pop the oldest non-dashboard
            nextTabs = nextTabs.slice(0, MAX_HEADER_TABS - 1)
          }
        }

        set({ tabs: [...nextTabs, newTab] })
      },

      closeTab: (path: string) => {
        const { tabs } = get()
        const targetIndex = tabs.findIndex(t => t.path === path)
        if (targetIndex === -1 || !tabs[targetIndex].closable) {
          return undefined
        }

        const nextTabs = tabs.filter(t => t.path !== path)
        set({ tabs: nextTabs })

        // Determine fallback tab if active
        const fallback = nextTabs[targetIndex] ?? nextTabs[targetIndex - 1] ?? DEFAULT_PINNED_TAB
        return fallback.path
      },

      closeOtherTabs: (keepPath: string) => {
        const { tabs } = get()
        set({
          tabs: tabs.filter(t => !t.closable || t.path === keepPath)
        })
      },

      closeAllTabs: () => {
        set({
          tabs: [DEFAULT_PINNED_TAB]
        })
      },

      resetTabs: () => {
        set({ tabs: [DEFAULT_PINNED_TAB] })
      }
    }),
    {
      name: 'continew_in_header_tabs',
      storage: createJSONStorage(() => sessionStorage)
    }
  )
)
