import { type RefObject, useCallback, useLayoutEffect, useRef } from 'react'

/**
 * Measures the vertical space left below `ref` and exposes it as a CSS variable, so a descendant can
 * fill the viewport instead of hard-coding how tall the surrounding chrome is.
 *
 * The measurement is idempotent and re-runs when the element's box changes (for example a tab panel
 * that mounts hidden then becomes visible), not only on viewport resize.
 *
 * Reads geometry and ancestor bottom spacing before writing the height. Keeping the reads together
 * avoids repeated synchronous layout passes while a page mounts or its rows change.
 * Returns a callback for callers that need to remeasure after a content change.
 */
export function useAvailableHeight<T extends HTMLElement>(ref: RefObject<T | null>, variable: string) {
  const applyRef = useRef<() => void>(() => {})

  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return

    let frame = 0

    const apply = () => {
      frame = 0
      // A hidden panel (for example an inactive tab) has no client rects. Measuring it would write
      // an innerHeight-sized value into the variable; keep the last good value instead and let the
      // ResizeObserver re-measure the moment the panel becomes visible (its box goes 0 -> real).
      if (element.getClientRects().length === 0) {
        return
      }
      let top = element.getBoundingClientRect().top
      let bottomSpacing = 0
      let fixed = false
      for (let ancestor: HTMLElement | null = element; ancestor; ancestor = ancestor.parentElement) {
        const style = getComputedStyle(ancestor)
        bottomSpacing +=
          (Number.parseFloat(style.paddingBottom) || 0) +
          (Number.parseFloat(style.borderBottomWidth) || 0) +
          (Number.parseFloat(style.marginBottom) || 0)
        // A fullscreen container is positioned against the viewport, not its DOM ancestors.
        if (style.position === 'fixed') {
          fixed = true
          break
        }
      }
      if (!fixed) {
        // chrome = documentHeight - elementHeight covers everything the shell adds around the
        // element (header, tabbar, paddings, footer, and any future chrome), so the element fills
        // the viewport exactly: available = innerHeight - chrome. Growing the element grows the
        // document, so overshooting shrinks the result back to fit — it converges instead of
        // feeding back like a viewport-relative top would (a shrinking top grew the element, made
        // the page taller, and kept it scrollable).
        // Invariant this relies on: the element's own content must never overflow its box (the
        // table/dict areas scroll inside). Overflow counts toward chrome and would shrink the
        // element further every frame.
        top = document.documentElement.scrollHeight - element.offsetHeight
        bottomSpacing = 0
      }
      const available = `${Math.max(0, Math.round(window.innerHeight - top - bottomSpacing))}px`
      if (element.style.getPropertyValue(variable) !== available) {
        element.style.setProperty(variable, available)
      }
    }

    const schedule = () => {
      if (frame) return
      frame = requestAnimationFrame(apply)
    }

    applyRef.current = apply
    apply()
    const observer = new ResizeObserver(schedule)
    observer.observe(document.documentElement)
    observer.observe(element)
    window.addEventListener('resize', schedule)

    return () => {
      if (frame) cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener('resize', schedule)
      element.style.removeProperty(variable)
      applyRef.current = () => {}
    }
  }, [ref, variable])

  return useCallback(() => applyRef.current(), [])
}
