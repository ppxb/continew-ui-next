import { Monitor, Moon, Sun } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'

import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { usePreferencesStore } from '@/stores/preferences/preferences-provider'

const THEME_CYCLE = ['light', 'dark', 'system'] as const

export function ThemeSwitcher({ showTooltip = true }: { readonly showTooltip?: boolean }) {
  const { themeMode, setPreference } = usePreferencesStore(
    useShallow(state => ({
      themeMode: state.values.theme_mode,
      setPreference: state.setPreference
    }))
  )

  const cycleTheme = () => {
    const currentIndex = THEME_CYCLE.indexOf(themeMode)
    const nextTheme = THEME_CYCLE[(currentIndex + 1) % THEME_CYCLE.length]

    setPreference('theme_mode', nextTheme)
  }

  const trigger = (
    <Button variant="outline" size="icon-sm" onClick={cycleTheme}>
      <Monitor className="hidden [html[data-theme-mode=system]_&]:block" />
      <Sun className="hidden dark:block [html[data-theme-mode=system]_&]:hidden" />
      <Moon className="block dark:hidden [html[data-theme-mode=system]_&]:hidden" />
      {showTooltip ? null : <span className="sr-only">切换主题</span>}
    </Button>
  )

  if (!showTooltip) {
    return trigger
  }

  return (
    <Tooltip>
      <TooltipTrigger render={trigger} />
      <TooltipContent side="bottom" sideOffset={8}>
        切换主题
      </TooltipContent>
    </Tooltip>
  )
}
