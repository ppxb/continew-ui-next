/** Titles for the app's static dashboard routes, shared by the header tabs and the breadcrumb. */
export const STATIC_ROUTE_TITLES: Record<string, string> = {
  '/dashboard': '仪表盘',
  '/dashboard/profile': '个人中心',
  '/dashboard/analytics': '分析中心',
  '/dashboard/ecommerce': '电子商务',
  '/dashboard/crm': '客户关系',
  '/dashboard/finance': '财务管理',
  '/dashboard/logistics': '物流看板',
  '/dashboard/kanban': '任务看板',
  '/dashboard/calendar': '日程日历',
  '/dashboard/file-manager': '文件管理',
  '/dashboard/mail': '邮件中心',
  '/dashboard/chat': '消息沟通',
  '/dashboard/tasks': '任务清单',
  '/dashboard/users': '用户管理',
  '/dashboard/roles': '角色管理',
  '/dashboard/infrastructure': '基础设施',
  '/dashboard/invoice': '发票管理',
  '/dashboard/productivity': '生产力看板',
  '/dashboard/patient-monitoring': '健康监测',
  '/dashboard/academy': '培训学院',
  '/dashboard/coming-soon': '即将推出'
}

/** Menu icon names for the same static routes, used by the header tabs. */
export const STATIC_ROUTE_ICONS: Record<string, string> = {
  '/dashboard': 'dashboard',
  '/dashboard/profile': 'user',
  '/dashboard/analytics': 'chart',
  '/dashboard/ecommerce': 'box',
  '/dashboard/crm': 'user-group',
  '/dashboard/finance': 'database',
  '/dashboard/logistics': 'project',
  '/dashboard/kanban': 'list',
  '/dashboard/calendar': 'schedule',
  '/dashboard/file-manager': 'file',
  '/dashboard/mail': 'email',
  '/dashboard/chat': 'message',
  '/dashboard/tasks': 'list',
  '/dashboard/users': 'user-management',
  '/dashboard/roles': 'safe',
  '/dashboard/infrastructure': 'computer',
  '/dashboard/invoice': 'file-text',
  '/dashboard/productivity': 'chart',
  '/dashboard/patient-monitoring': 'safe',
  '/dashboard/academy': 'bookmark',
  '/dashboard/coming-soon': 'clock'
}

/** `user-management` becomes `User Management`, for routes with no static or backend title. */
export function formatSegmentTitle(segment: string) {
  return segment
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
