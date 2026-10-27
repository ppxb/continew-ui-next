import { ThemeToggler, type ThemeSelection } from '@animate-ui/react/primitives/effects/theme-toggler'
import { Monitor, Moon, Sun } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'

import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { usePreferencesStore } from '@/stores/preferences/preferences-provider'

const THEME_CYCLE: readonly ThemeSelection[] = ['light', 'dark', 'system']

export function ThemeSwitcher({ showTooltip = true }: { readonly showTooltip?: boolean }) {
  const { themeMode, resolvedThemeMode, setPreference } = usePreferencesStore(
    useShallow(state => ({
      themeMode: state.values.theme_mode,
      resolvedThemeMode: state.resolvedThemeMode,
      setPreference: state.setPreference
    }))
  )

  return (
    <ThemeToggler
      theme={themeMode}
      resolvedTheme={resolvedThemeMode}
      setTheme={mode => setPreference('theme_mode', mode)}
    >
      {({ effective, resolved, toggleTheme }) => {
        const nextTheme = THEME_CYCLE[(THEME_CYCLE.indexOf(effective) + 1) % THEME_CYCLE.length]

        const changeTheme = () => {
          if (nextTheme !== 'system' && nextTheme === resolved) {
            setPreference('theme_mode', nextTheme)
            return
          }

          toggleTheme(nextTheme)
        }

        const trigger = (
          <Button variant="outline" size="icon-sm" onClick={changeTheme}>
            {effective === 'system' ? <Monitor /> : resolved === 'dark' ? <Sun /> : <Moon />}
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
      }}
    </ThemeToggler>
  )
}
