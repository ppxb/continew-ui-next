import { Settings } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'

import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger
} from '@/components/ui/drawer'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  type ContentLayout,
  type NavbarStyle,
  type Radius,
  RADIUS_OPTIONS,
  type SidebarCollapsible,
  type SidebarVariant
} from '@/lib/preferences/layout'
import { THEME_COLOR_OPTIONS, type ThemeColor, type ThemeMode } from '@/lib/preferences/theme'
import { usePreferencesStore } from '@/stores/preferences/preferences-provider'

/** Discrete root font sizes offered in the panel; the underlying preference stays a number. */
const FONT_SIZE_OPTIONS = [
  { label: '小', value: '14' },
  { label: '标准', value: '16' },
  { label: '大', value: '18' }
] as const

function PreferenceField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      {children}
    </div>
  )
}

function PreferenceSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h4 className="text-sm leading-none font-medium">{title}</h4>
      {children}
    </section>
  )
}

function PreferenceToggle({
  label,
  checked,
  disabled,
  onChange
}: {
  label: string
  checked: boolean
  disabled?: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Label className="text-xs font-medium">{label}</Label>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onChange} />
    </div>
  )
}

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
    sidebar_collapsible: collapsible,
    radius,
    font_size: fontSize,
    app_dynamic_title: dynamicTitle,
    app_watermark: watermarkEnabled,
    app_watermark_content: watermarkContent,
    app_enable_check_updates: checkUpdates
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
    <Drawer swipeDirection="right">
      <Tooltip>
        <TooltipTrigger
          render={<DrawerTrigger render={<Button size="icon-sm" variant="outline" aria-label="偏好设置" />} />}
        >
          <Settings />
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={8}>
          偏好设置
        </TooltipContent>
      </Tooltip>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>偏好设置</DrawerTitle>
          <DrawerDescription>自定义仪表盘的外观与布局</DrawerDescription>
        </DrawerHeader>

        <div className="flex-1 space-y-6 overflow-y-auto overscroll-contain px-4 py-4">
          <PreferenceSection title="主题">
            <PreferenceField label="主题模式">
              <ToggleGroup
                size="sm"
                spacing={0}
                variant="outline"
                className="w-full **:data-[slot=toggle-group-item]:flex-1 **:data-[slot=toggle-group-item]:text-xs"
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
            </PreferenceField>

            <PreferenceField label="主题色">
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
            </PreferenceField>

            <PreferenceField label="字号">
              <ToggleGroup
                size="sm"
                spacing={0}
                variant="outline"
                className="w-full **:data-[slot=toggle-group-item]:flex-1 **:data-[slot=toggle-group-item]:text-xs"
                value={[String(fontSize)]}
                onValueChange={([size]) => {
                  if (!size) return
                  setPreference('font_size', Number(size))
                }}
              >
                {FONT_SIZE_OPTIONS.map(option => (
                  <ToggleGroupItem key={option.value} value={option.value}>
                    {option.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </PreferenceField>

            <PreferenceField label="圆角">
              <ToggleGroup
                size="sm"
                spacing={0}
                variant="outline"
                className="w-full **:data-[slot=toggle-group-item]:flex-1 **:data-[slot=toggle-group-item]:text-xs"
                value={[radius]}
                onValueChange={([nextRadius]) => {
                  if (!nextRadius) return
                  setPreference('radius', nextRadius as Radius)
                }}
              >
                {RADIUS_OPTIONS.map(option => (
                  <ToggleGroupItem key={option.value} value={option.value}>
                    {option.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </PreferenceField>
          </PreferenceSection>

          <PreferenceSection title="布局">
            <PreferenceField label="页面布局">
              <ToggleGroup
                size="sm"
                spacing={0}
                variant="outline"
                className="w-full **:data-[slot=toggle-group-item]:flex-1 **:data-[slot=toggle-group-item]:text-xs"
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
            </PreferenceField>

            <PreferenceField label="导航栏行为">
              <ToggleGroup
                size="sm"
                spacing={0}
                variant="outline"
                className="w-full **:data-[slot=toggle-group-item]:flex-1 **:data-[slot=toggle-group-item]:text-xs"
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
            </PreferenceField>

            <PreferenceField label="侧边栏样式">
              <ToggleGroup
                size="sm"
                spacing={0}
                variant="outline"
                className="w-full **:data-[slot=toggle-group-item]:flex-1 **:data-[slot=toggle-group-item]:text-xs"
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
            </PreferenceField>

            <PreferenceField label="侧边栏折叠方式">
              <ToggleGroup
                size="sm"
                spacing={0}
                variant="outline"
                className="w-full **:data-[slot=toggle-group-item]:flex-1 **:data-[slot=toggle-group-item]:text-xs"
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
            </PreferenceField>
          </PreferenceSection>

          <PreferenceSection title="通用">
            <PreferenceToggle
              label="动态标题"
              checked={dynamicTitle}
              onChange={checked => setPreference('app_dynamic_title', checked)}
            />
            <PreferenceToggle
              label="水印"
              checked={watermarkEnabled}
              onChange={checked => setPreference('app_watermark', checked)}
            />
            <PreferenceField label="水印文案">
              <Input
                value={watermarkContent}
                disabled={!watermarkEnabled}
                maxLength={64}
                placeholder="默认使用用户名"
                className="h-8 text-xs"
                onChange={event => setPreference('app_watermark_content', event.target.value)}
              />
            </PreferenceField>
            <PreferenceToggle
              label="定时检查更新"
              checked={checkUpdates}
              onChange={checked => setPreference('app_enable_check_updates', checked)}
            />
          </PreferenceSection>
        </div>

        <DrawerFooter>
          <Button type="button" size="sm" variant="outline" className="w-full text-xs" onClick={resetPreferences}>
            恢复默认
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
