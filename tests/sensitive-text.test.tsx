// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { SensitiveText } from '@/components/sensitive-text'
import { TooltipProvider } from '@/components/ui/tooltip'

afterEach(cleanup)

function renderText(value: string) {
  return render(
    <TooltipProvider>
      <SensitiveText value={value} type="phone" />
    </TooltipProvider>
  )
}

describe('SensitiveText', () => {
  it('reveals and hides the raw value from the eye button', () => {
    renderText('13812345678')
    expect(screen.getByText('138****5678')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: '显示敏感信息' }))
    expect(screen.getByText('13812345678')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: '隐藏敏感信息' }))
    expect(screen.getByText('138****5678')).toBeTruthy()
  })

  it('masks again when the same instance receives another value', () => {
    const { rerender } = renderText('13812345678')
    fireEvent.click(screen.getByRole('button', { name: '显示敏感信息' }))

    rerender(
      <TooltipProvider>
        <SensitiveText value="13900001111" type="phone" />
      </TooltipProvider>
    )
    expect(screen.queryByText('13900001111')).toBeNull()
    expect(screen.getByText('139****1111')).toBeTruthy()
  })
})
