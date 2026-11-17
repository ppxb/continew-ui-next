import { vi } from 'vitest'

/** jsdom has no Web Animations API; these tests exercise state, not animation timing. */
export function installBrowserAnimationApis() {
  const animate = Object.getOwnPropertyDescriptor(Element.prototype, 'animate')
  const getAnimations = Object.getOwnPropertyDescriptor(Element.prototype, 'getAnimations')
  vi.stubGlobal('SVGGeometryElement', class extends SVGElement {})
  Object.defineProperty(Element.prototype, 'getAnimations', { configurable: true, value: () => [] })
  Object.defineProperty(Element.prototype, 'animate', {
    configurable: true,
    value: () => ({
      finished: Promise.resolve(), ready: Promise.resolve(), playState: 'finished', currentTime: 0,
      effect: { getComputedTiming: () => ({ endTime: 0 }) },
      cancel() {}, finish() {}, play() {}, pause() {}, addEventListener() {}, removeEventListener() {}
    })
  })
  return () => {
    if (animate) Object.defineProperty(Element.prototype, 'animate', animate)
    else Reflect.deleteProperty(Element.prototype, 'animate')
    if (getAnimations) Object.defineProperty(Element.prototype, 'getAnimations', getAnimations)
    else Reflect.deleteProperty(Element.prototype, 'getAnimations')
  }
}
