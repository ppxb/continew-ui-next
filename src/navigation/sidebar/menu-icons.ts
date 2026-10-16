import {
  AppWindow,
  Bell,
  Blocks,
  Bookmark,
  Boxes,
  CalendarClock,
  ChartBar,
  Clock,
  Code,
  Computer,
  Database,
  FileSearch,
  FileText,
  FolderKanban,
  FolderOpen,
  HardDrive,
  History,
  House,
  LayoutDashboard,
  LayoutGrid,
  ListChecks,
  ListTodo,
  Lock,
  Mail,
  Menu,
  MessageSquare,
  Network,
  Settings,
  ShieldCheck,
  Smartphone,
  UserRound,
  Users,
  Wrench,
  type LucideIcon
} from 'lucide-react'

/**
 * Maps the icon names stored in `sys_menu.icon` to lucide components.
 *
 * The backend keeps iconify-style kebab-case names; the table covers every name the
 * seeded menus use plus the ones the system screens are likely to add.
 */
export const MENU_ICONS: Record<string, LucideIcon> = {
  apps: LayoutGrid,
  box: Boxes,
  bookmark: Bookmark,
  chart: ChartBar,
  clock: Clock,
  code: Code,
  // The backend ships this name with its original typo.
  'code-release-managment': Code,
  common: AppWindow,
  computer: Computer,
  config: Settings,
  dashboard: LayoutDashboard,
  database: Database,
  email: Mail,
  expand: Blocks,
  file: FolderOpen,
  'file-text': FileText,
  'find-replace': FileSearch,
  history: History,
  home: House,
  list: ListTodo,
  lock: Lock,
  menu: Menu,
  message: MessageSquare,
  'mind-mapping': Network,
  mobile: Smartphone,
  notification: Bell,
  project: FolderKanban,
  safe: ShieldCheck,
  schedule: CalendarClock,
  'select-all': ListChecks,
  settings: Settings,
  storage: HardDrive,
  tool: Wrench,
  user: UserRound,
  'user-group': Users,
  'user-management': Users
}

const FALLBACK_ICON = AppWindow

/** Unknown names fall back to a generic page icon instead of leaving a gap. */
export function resolveMenuIcon(name?: string | null): LucideIcon {
  if (!name) {
    return FALLBACK_ICON
  }

  return MENU_ICONS[name] ?? FALLBACK_ICON
}
