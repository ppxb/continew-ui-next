import { Settings } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { ContentLayout, NavbarStyle, SidebarCollapsible, SidebarVariant } from '@/lib/preferences/layout'
import { THEME_COLOR_OPTIONS, type ThemeColor, type ThemeMode } from '@/lib/preferences/theme'
import { usePreferencesStore } from '@/stores/preferences/preferences-provider'

export function LayoutControls() {
  const { values, resolvedThemeMode, setPreference, resetPreferences } = usePreferencesStore(
    useShallow(state => ({
      values: state.values,
      resolvedThemeMode: state.resolvedThemeMode,
      setPreference: state.setPreference,
      resetPreferences: state.resetPreferences
    }))
  )

  const {
    theme_mode: themeMode,
    theme_color: themeColor,
    content_layout: contentLayout,
    navbar_style: navbarStyle,
    sidebar_variant: variant,
    sidebar_collapsible: collapsible
  } = values

  const themeColorItems = THEME_COLOR_OPTIONS.map(color => ({
    value: color.value,
    label: (
      <span className="flex items-center gap-1.5">
        <span
          className="size-2.5 rounded-full"
          style={{ backgroundColor: resolvedThemeMode === 'dark' ? color.primary.dark : color.primary.light }}
        />
        {color.label}
      </span>
    )
  }))

  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger render={<PopoverTrigger render={<Button size="icon-sm" variant="outline" />} />}>
          <Settings />
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={8}>
          偏好设置
        </TooltipContent>
      </Tooltip>
      <PopoverContent align="end">
        <div className="flex flex-col gap-5">
          <div className="space-y-1.5">
            <h4 className="text-sm leading-none font-medium">偏好设置</h4>
            <p className="text-xs text-muted-foreground">自定义仪表盘的外观与布局。</p>
          </div>
          <div className="space-y-3 **:data-[slot=toggle-group]:w-full **:data-[slot=toggle-group-item]:flex-1 **:data-[slot=toggle-group-item]:text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-medium">主题色</Label>
              <Select
                items={themeColorItems}
                value={themeColor}
                onValueChange={value => {
                  if (!value) return
                  setPreference('theme_color', value as ThemeColor)
                }}
              >
                <SelectTrigger size="sm" className="w-full text-xs">
                  <SelectValue className="items-center" placeholder="选择颜色" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {THEME_COLOR_OPTIONS.map(color => (
                      <SelectItem key={color.value} className="text-xs" value={color.value}>
                        <span className="flex items-center gap-2">
                          <span
                            className="size-2.5 rounded-full"
                            style={{
                              backgroundColor: resolvedThemeMode === 'dark' ? color.primary.dark : color.primary.light
                            }}
                          />
                          {color.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">主题模式</Label>
              <ToggleGroup
                size="sm"
                spacing={0}
                variant="outline"
                value={[themeMode]}
                onValueChange={([mode]) => {
                  if (!mode) return
                  setPreference('theme_mode', mode as ThemeMode)
                }}
              >
                <ToggleGroupItem value="light" aria-label="切换浅色">
                  浅色
                </ToggleGroupItem>
                <ToggleGroupItem value="dark" aria-label="切换深色">
                  深色
                </ToggleGroupItem>
                <ToggleGroupItem value="system" aria-label="跟随系统">
                  跟随系统
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">页面布局</Label>
              <ToggleGroup
                size="sm"
                spacing={0}
                variant="outline"
                value={[contentLayout]}
                onValueChange={([layout]) => {
                  if (!layout) return
                  setPreference('content_layout', layout as ContentLayout)
                }}
              >
                <ToggleGroupItem value="centered" aria-label="居中布局">
                  居中
                </ToggleGroupItem>
                <ToggleGroupItem value="full-width" aria-label="全宽布局">
                  全宽
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">导航栏行为</Label>
              <ToggleGroup
                size="sm"
                spacing={0}
                variant="outline"
                value={[navbarStyle]}
                onValueChange={([style]) => {
                  if (!style) return
                  setPreference('navbar_style', style as NavbarStyle)
                }}
              >
                <ToggleGroupItem value="sticky" aria-label="吸顶导航">
                  吸顶
                </ToggleGroupItem>
                <ToggleGroupItem value="scroll" aria-label="滚动导航">
                  跟随滚动
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">侧边栏样式</Label>
              <ToggleGroup
                size="sm"
                spacing={0}
                variant="outline"
                value={[variant]}
                onValueChange={([nextVariant]) => {
                  if (!nextVariant) return
                  setPreference('sidebar_variant', nextVariant as SidebarVariant)
                }}
              >
                <ToggleGroupItem value="inset" aria-label="内嵌侧边栏">
                  内嵌
                </ToggleGroupItem>
                <ToggleGroupItem value="sidebar" aria-label="侧边栏">
                  侧边
                </ToggleGroupItem>
                <ToggleGroupItem value="floating" aria-label="悬浮侧边栏">
                  悬浮
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">侧边栏折叠方式</Label>
              <ToggleGroup
                size="sm"
                spacing={0}
                variant="outline"
                value={[collapsible]}
                onValueChange={([nextCollapsible]) => {
                  if (!nextCollapsible) return
                  setPreference('sidebar_collapsible', nextCollapsible as SidebarCollapsible)
                }}
              >
                <ToggleGroupItem value="icon" aria-label="图标折叠">
                  图标
                </ToggleGroupItem>
                <ToggleGroupItem value="offcanvas" aria-label="抽屉折叠">
                  抽屉
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            <Button type="button" size="sm" variant="outline" className="w-full text-xs" onClick={resetPreferences}>
              恢复默认
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
