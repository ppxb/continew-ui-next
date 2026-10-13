import {
  AppWindow,
  Bell,
  Bookmark,
  Boxes,
  ChartBar,
  Clock,
  Computer,
  Database,
  FileText,
  FolderOpen,
  HardDrive,
  History,
  House,
  LayoutDashboard,
  LayoutGrid,
  ListTodo,
  Lock,
  Mail,
  Menu,
  MessageSquare,
  Network,
  Settings,
  ShieldCheck,
  Smartphone,
  Users,
  UserRound,
  Wrench,
  type LucideIcon
} from 'lucide-react'

/**
 * Maps the icon names stored in `sys_menu.icon` to lucide components.
 *
 * The backend keeps iconify-style kebab-case names, so the table covers the names
 * shipped with the seed data plus the ones the system screens use.
 */
const MENU_ICONS: Record<string, LucideIcon> = {
  apps: LayoutGrid,
  box: Boxes,
  bookmark: Bookmark,
  chart: ChartBar,
  clock: Clock,
  computer: Computer,
  config: Settings,
  dashboard: LayoutDashboard,
  database: Database,
  email: Mail,
  file: FolderOpen,
  'file-text': FileText,
  history: History,
  home: House,
  list: ListTodo,
  lock: Lock,
  menu: Menu,
  message: MessageSquare,
  'mind-mapping': Network,
  mobile: Smartphone,
  notification: Bell,
  safe: ShieldCheck,
  settings: Settings,
  storage: HardDrive,
  tool: Wrench,
  user: UserRound,
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
