import * as React from 'react'

import { Search, X } from 'lucide-react'

import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group'
import { cn } from 'cn'

const DEFAULT_DELAY_MS = 300

interface TableSearchProps {
  onSearch: (keyword: string) => void
  placeholder?: string
  delay?: number
  clearable?: boolean
  className?: string
}

export function TableSearch({
  onSearch,
  placeholder = '搜索',
  delay = DEFAULT_DELAY_MS,
  clearable = false,
  className
}: TableSearchProps) {
  const [value, setValue] = React.useState('')
  const reportedRef = React.useRef('')
  const onSearchRef = React.useRef(onSearch)

  React.useEffect(() => {
    onSearchRef.current = onSearch
  })

  React.useEffect(() => {
    const timer = setTimeout(() => {
      const next = value.trim()
      if (next === reportedRef.current) return
      reportedRef.current = next
      onSearchRef.current(next)
    }, delay)

    return () => clearTimeout(timer)
  }, [value, delay])

  const clear = () => {
    setValue('')
    reportedRef.current = ''
    onSearchRef.current('')
  }

  return (
    <InputGroup className={cn('h-7 w-full md:w-64', className)}>
      <InputGroupAddon align="inline-start">
        <Search className="size-3.5" />
      </InputGroupAddon>
      <InputGroupInput
        className="h-full"
        placeholder={placeholder}
        value={value}
        onChange={event => setValue(event.target.value)}
      />
      {clearable && value ? (
        <InputGroupAddon align="inline-end">
          <InputGroupButton size="icon-xs" onClick={clear}>
            <X />
            <span className="sr-only">清空搜索</span>
          </InputGroupButton>
        </InputGroupAddon>
      ) : null}
    </InputGroup>
  )
}
