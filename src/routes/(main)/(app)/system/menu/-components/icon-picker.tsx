import * as React from 'react'

import { Check, Search, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { MENU_ICONS, resolveMenuIcon } from '@/navigation/sidebar/menu-icons'
import { cn } from 'cn'

interface IconPickerProps {
  readonly value?: string | null
  readonly onChange: (value: string | null) => void
  readonly disabled?: boolean
}

export function IconPicker({ value, onChange, disabled }: IconPickerProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState('')

  const iconEntries = React.useMemo(() => {
    const list = Object.entries(MENU_ICONS)
    if (!search.trim()) return list
    const q = search.trim().toLowerCase()
    return list.filter(([name]) => name.toLowerCase().includes(q))
  }, [search])

  const handleSelect = (name: string) => {
    onChange(name)
    setOpen(false)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(null)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div className="flex items-center gap-2">
        <DialogTrigger
          render={
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              className="h-9 w-full justify-between px-3 font-normal"
            />
          }
        >
          <div className="flex items-center gap-2 truncate">
            {value ? (
              <>
                {React.createElement(resolveMenuIcon(value), {
                  className: 'size-4 shrink-0 text-foreground'
                })}
                <span className="font-mono text-xs">{value}</span>
              </>
            ) : (
              <span className="text-xs text-muted-foreground">点击选择图标</span>
            )}
          </div>
          {value && !disabled && (
            <span
              role="button"
              tabIndex={0}
              aria-label="清除图标"
              onClick={handleClear}
              onKeyDown={e => e.key === 'Enter' && handleClear(e as unknown as React.MouseEvent)}
              className="rounded-xs p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="size-3.5" />
            </span>
          )}
        </DialogTrigger>
      </div>

      <DialogContent className="max-w-md sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>选择菜单图标</DialogTitle>
          <DialogDescription>挑选符合菜单语义的 Lucide 图标，支持实时名称搜索。</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-1">
          <InputGroup className="h-9">
            <InputGroupAddon>
              <Search className="size-4 text-muted-foreground" />
            </InputGroupAddon>
            <InputGroupInput
              placeholder="搜索图标名称（如 user, settings, chart...）"
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
            />
            {search && (
              <InputGroupAddon align="inline-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label="清空搜索"
                  onClick={() => setSearch('')}
                >
                  <X className="size-3.5" />
                </Button>
              </InputGroupAddon>
            )}
          </InputGroup>

          <div className="max-h-72 overflow-y-auto rounded-lg border bg-muted/20 p-2">
            {iconEntries.length === 0 ? (
              <div className="flex h-32 flex-col items-center justify-center text-xs text-muted-foreground">
                未找到匹配的图标
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                {iconEntries.map(([name, IconComponent]) => {
                  const isSelected = value === name
                  return (
                    <Tooltip key={name}>
                      <TooltipTrigger
                        render={
                          <button
                            type="button"
                            onClick={() => handleSelect(name)}
                            className={cn(
                              'relative flex flex-col items-center justify-center gap-1.5 rounded-md border p-2 text-xs transition-colors',
                              isSelected
                                ? 'border-primary bg-primary/10 font-medium text-primary'
                                : 'border-border/60 bg-background text-muted-foreground hover:border-foreground/30 hover:bg-muted/50 hover:text-foreground'
                            )}
                          />
                        }
                      >
                        <IconComponent className="size-5 shrink-0" />
                        <span className="w-full truncate text-center font-mono text-[10px] leading-tight">{name}</span>
                        {isSelected && (
                          <span className="absolute top-1 right-1 flex size-3 items-center justify-center rounded-full bg-primary text-primary-foreground">
                            <Check className="size-2" />
                          </span>
                        )}
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        {name}
                      </TooltipContent>
                    </Tooltip>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
