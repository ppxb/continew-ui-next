import { create } from 'zustand'

/**
 * Transient shell state shared by the tabbar and the page surface.
 *
 * None of it is persisted, so it lives in its own store rather than the preference store.
 */
interface ShellState {
  /** Bumped by a per-tab refresh; the page surface is keyed on it so the page remounts. */
  refreshKey: number
  refresh: () => void
}

export const useShellStore = create<ShellState>()(set => ({
  refreshKey: 0,
  refresh: () => set(state => ({ refreshKey: state.refreshKey + 1 }))
}))
