// Sidebar Variant
const SIDEBAR_VARIANT_OPTIONS = [
  { label: 'Sidebar', value: 'sidebar' },
  { label: 'Inset', value: 'inset' },
  { label: 'Floating', value: 'floating' }
] as const
export const SIDEBAR_VARIANT_VALUES = SIDEBAR_VARIANT_OPTIONS.map(v => v.value)
export type SidebarVariant = (typeof SIDEBAR_VARIANT_VALUES)[number]

// Sidebar Collapsible
const SIDEBAR_COLLAPSIBLE_OPTIONS = [
  { label: 'Icon', value: 'icon' },
  { label: 'Offcanvas', value: 'offcanvas' }
] as const
export const SIDEBAR_COLLAPSIBLE_VALUES = SIDEBAR_COLLAPSIBLE_OPTIONS.map(v => v.value)
export type SidebarCollapsible = (typeof SIDEBAR_COLLAPSIBLE_VALUES)[number]

// Content Layout
const CONTENT_LAYOUT_OPTIONS = [
  { label: 'Centered', value: 'centered' },
  { label: 'Full Width', value: 'full-width' }
] as const
export const CONTENT_LAYOUT_VALUES = CONTENT_LAYOUT_OPTIONS.map(v => v.value)
export type ContentLayout = (typeof CONTENT_LAYOUT_VALUES)[number]

// Navbar Style
const NAVBAR_STYLE_OPTIONS = [
  { label: 'Sticky', value: 'sticky' },
  { label: 'Scroll', value: 'scroll' }
] as const
export const NAVBAR_STYLE_VALUES = NAVBAR_STYLE_OPTIONS.map(v => v.value)
export type NavbarStyle = (typeof NAVBAR_STYLE_VALUES)[number]

// Radius, as a share of the default corner token: 0 squares everything, 1 keeps the design default.
export const RADIUS_OPTIONS = [
  { label: '0', value: '0' },
  { label: '25%', value: '0.25' },
  { label: '50%', value: '0.5' },
  { label: '75%', value: '0.75' },
  { label: '100%', value: '1' }
] as const
export const RADIUS_VALUES = RADIUS_OPTIONS.map(v => v.value)
export type Radius = (typeof RADIUS_VALUES)[number]
