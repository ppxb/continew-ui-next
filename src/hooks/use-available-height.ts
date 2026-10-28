import { type RefObject, useLayoutEffect } from 'react'

/**
 * Measures the vertical space left below `ref` and exposes it as a CSS variable, so a descendant can
 * fill the viewport instead of hard-coding how tall the surrounding chrome is.
 *
 * The cap starts at the distance to the viewport bottom. Whatever the document then overflows by is
 * the chrome below the measured element (borders, paddings), which is folded into `bottomChrome` so
 * later runs keep the page exactly at the viewport height instead of growing a scrollbar.
 */
export function useAvailableHeight<T extends HTMLElement>(ref: RefObject<T | null>, variable: string) {
  // Layout effect, so the first paint already has the cap instead of flashing an uncapped table.
  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return

    const root = document.documentElement
    let bottomChrome = 0

    const update = () => {
      // Document coordinates, so scrolling never changes the result.
      const top = element.getBoundingClientRect().top + window.scrollY
      const available = Math.max(0, Math.round(window.innerHeight - top - bottomChrome))
      element.style.setProperty(variable, `${available}px`)

      const overflow = root.scrollHeight - root.clientHeight
      if (overflow > 0) {
        bottomChrome += overflow
        element.style.setProperty(variable, `${Math.max(0, available - overflow)}px`)
      }
    }

    update()

    // The document box changes on viewport resize and whenever chrome above the table reflows.
    const observer = new ResizeObserver(update)
    observer.observe(root)

    return () => {
      observer.disconnect()
      element.style.removeProperty(variable)
    }
  }, [ref, variable])
}
