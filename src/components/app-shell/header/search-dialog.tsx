import * as React from 'react'

import { useNavigate } from '@tanstack/react-router'

import { Search } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator
} from '@/components/ui/command'
import { useMenuGroups } from '@/hooks/use-menu'
import type { MenuGroup, MenuItem } from '@/navigation/menu'

interface SearchItem {
  id: string
  group: string
  label: string
  url: string
  icon?: MenuItem['icon']
  external?: boolean
}

function toSearchItems(groups: readonly MenuGroup[]): SearchItem[] {
  return groups.flatMap(group =>
    group.items.flatMap(item => {
      if (item.subItems?.length) {
        return item.subItems.map(subItem => ({
          id: subItem.id,
          group: item.title,
          label: subItem.title,
          url: subItem.url,
          icon: subItem.icon ?? item.icon,
          external: subItem.external
        }))
      }

      return [
        {
          id: item.id,
          group: group.label ?? '其他',
          label: item.title,
          url: item.url,
          icon: item.icon,
          external: item.external
        }
      ]
    })
  )
}

function groupBy(items: SearchItem[]) {
  const groups = [...new Set(items.map(item => item.group))]
  return groups.map(group => ({
    group,
    items: items.filter(item => item.group === group)
  }))
}

export function SearchDialog() {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const navigate = useNavigate()
  const { groups } = useMenuGroups()
  const searchItems = React.useMemo(() => toSearchItems(groups), [groups])

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'j' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen(prev => !prev)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  const handleOpenChange = (value: boolean) => {
    setOpen(value)
    if (!value) setQuery('')
  }

  const handleSelect = (item: SearchItem) => {
    handleOpenChange(false)

    if (item.external) {
      window.open(item.url, '_blank', 'noopener,noreferrer')
      return
    }

    // `href` accepts the backend path verbatim, including any query string.
    void navigate({ href: item.url })
  }

  const renderGroups = (items: SearchItem[]) =>
    groupBy(items).map(({ group, items: groupItems }, index) => (
      <React.Fragment key={group}>
        {index > 0 && <CommandSeparator />}
        <CommandGroup heading={group}>
          {groupItems.map(item => (
            <CommandItem
              key={`${group}-${item.id}`}
              value={`${item.group} ${item.label}`}
              onSelect={() => handleSelect(item)}
            >
              <span className="flex min-w-0 items-center gap-2">
                {item.icon && <item.icon />}
                <span className="truncate">{item.label}</span>
              </span>
            </CommandItem>
          ))}
        </CommandGroup>
      </React.Fragment>
    ))

  return (
    <>
      <Button
        onClick={() => handleOpenChange(true)}
        variant="link"
        className="px-0! font-normal text-muted-foreground hover:no-underline"
      >
        <Search data-icon="inline-start" />
        搜索
        <kbd className="inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 text-[10px] font-medium select-none">
          <span className="text-xs">⌘</span>J
        </kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={handleOpenChange}>
        <Command>
          <CommandInput placeholder="搜索目录" value={query} onValueChange={setQuery} />
          <CommandList>
            <CommandEmpty>没有找到结果</CommandEmpty>
            {renderGroups(searchItems)}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  )
}
