import { type RefObject, useLayoutEffect } from 'react'

/**
 * Measures the vertical space left below `ref` and exposes it as a CSS variable, so a descendant can
 * fill the viewport instead of hard-coding how tall the surrounding chrome is.
 *
 * The measurement is idempotent and re-runs when the element's box changes (for example a tab panel
 * that mounts hidden then becomes visible), not only on viewport resize.
 */
export function useAvailableHeight<T extends HTMLElement>(ref: RefObject<T | null>, variable: string) {
  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return

    const root = document.documentElement
    let frame = 0
    let bottomChrome = 0

    const apply = () => {
      frame = 0
      // Viewport coordinates: the space to the viewport bottom is innerHeight - rect.top. (Adding
      // scrollY to `top` while subtracting from innerHeight undercounts by the scroll offset, which
      // collapses the table to 0 once the page has scrolled.)
      const top = element.getBoundingClientRect().top
      let available = Math.max(0, Math.round(window.innerHeight - top - bottomChrome))
      element.style.setProperty(variable, `${available}px`)

      // Whatever the document overflows by is the chrome below the element (paddings, borders). A
      // delta correction makes the page end exactly at the viewport and converges in one step, so
      // repeated runs (from the element's own resize) stop instead of drifting.
      const overflow = root.scrollHeight - root.clientHeight
      if (overflow !== 0) {
        bottomChrome = Math.max(0, bottomChrome + overflow)
        available = Math.max(0, Math.round(window.innerHeight - top - bottomChrome))
        element.style.setProperty(variable, `${available}px`)
      }
    }

    const schedule = () => {
      if (frame) return
      frame = requestAnimationFrame(apply)
    }

    apply()
    const observer = new ResizeObserver(schedule)
    observer.observe(root)
    observer.observe(element)
    window.addEventListener('resize', schedule)
    window.addEventListener('scroll', schedule, { passive: true })

    return () => {
      if (frame) cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener('resize', schedule)
      window.removeEventListener('scroll', schedule)
      element.style.removeProperty(variable)
    }
  }, [ref, variable])
}
