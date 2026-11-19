// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useAvailableHeight } from '@/hooks/use-available-height'

const variable = '--available-height'
let notifyResize: ResizeObserverCallback
let frame: FrameRequestCallback | undefined

beforeEach(() => {
  vi.stubGlobal('innerHeight', 1000)
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frame = callback
    return 1
  })
  vi.stubGlobal('cancelAnimationFrame', () => {
    frame = undefined
  })
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: ResizeObserverCallback) {
        notifyResize = callback
      }
      observe() {}
      disconnect() {}
    }
  )
})
afterEach(() => {
  cleanup()
  document.body.replaceChildren()
  frame = undefined
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

function fixture() {
  const shell = document.createElement('main')
  shell.style.marginBottom = '8px'
  shell.style.borderBottom = '1px solid black'
  const content = document.createElement('div')
  content.style.paddingBottom = '24px'
  const area = document.createElement('div')
  content.append(area)
  shell.append(content)
  document.body.append(shell)
  let top = 251
  let visible = true
  const rect = () => ({
    top,
    bottom: top + 100,
    left: 0,
    right: 100,
    width: 100,
    height: 100,
    x: 0,
    y: top,
    toJSON: () => ({})
  })
  vi.spyOn(area, 'getBoundingClientRect').mockImplementation(rect)
  vi.spyOn(area, 'getClientRects').mockImplementation(() => (visible ? [rect()] : []) as unknown as DOMRectList)
  return {
    area,
    content,
    shell,
    setTop: (next: number) => {
      top = next
    },
    setVisible: (next: boolean) => {
      visible = next
    }
  }
}
function resize() {
  act(() => {
    notifyResize([], {} as ResizeObserver)
    const callback = frame
    frame = undefined
    callback?.(0)
  })
}

describe('available viewport height', () => {
  it('keeps a list above its ancestor padding, border and bottom margin', () => {
    const { area } = fixture()
    renderHook(() => useAvailableHeight({ current: area }, variable))
    expect(area.style.getPropertyValue(variable)).toBe('716px')
    resize()
    resize()
    expect(area.style.getPropertyValue(variable)).toBe('716px')
  })

  it('recalculates from current geometry when the header and viewport change', () => {
    const { area, content, setTop } = fixture()
    const ref = { current: area }
    const { result } = renderHook(() => useAvailableHeight(ref, variable))
    setTop(300)
    content.style.paddingBottom = '16px'
    act(() => result.current())
    expect(area.style.getPropertyValue(variable)).toBe('675px')
    vi.stubGlobal('innerHeight', 600)
    resize()
    expect(area.style.getPropertyValue(variable)).toBe('275px')
    setTop(700)
    resize()
    expect(area.style.getPropertyValue(variable)).toBe('0px')
  })

  it('retains hidden panel sizing and measures again when the panel becomes visible', () => {
    const { area, setTop, setVisible } = fixture()
    const ref = { current: area }
    renderHook(() => useAvailableHeight(ref, variable))
    setVisible(false)
    setTop(0)
    resize()
    expect(area.style.getPropertyValue(variable)).toBe('716px')
    setVisible(true)
    setTop(200)
    resize()
    expect(area.style.getPropertyValue(variable)).toBe('767px')
  })

  it('does not subtract outer page spacing from a fixed fullscreen container', () => {
    const { area, content, setTop } = fixture()
    content.style.position = 'fixed'
    setTop(40)
    renderHook(() => useAvailableHeight({ current: area }, variable))
    expect(area.style.getPropertyValue(variable)).toBe('936px')
  })
})
