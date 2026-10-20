import { useQuery } from '@tanstack/react-query'

import { APP_CONFIG } from '@/config/app-config'
import { listSiteOptionDict } from '@/lib/api/common'
import { siteOptionKeys } from '@/lib/query-keys'

const FALLBACK_DESCRIPTION = '持续迭代优化的前后端分离中后台管理系统框架'

/** Public site options (`SITE_TITLE`, `SITE_LOGO`, ...) shared by the auth screens. */
export function useSiteOptions() {
  const query = useQuery({
    queryKey: siteOptionKeys.all,
    queryFn: () => listSiteOptionDict().catch(() => []),
    staleTime: 5 * 60_000
  })

  const options = new Map((query.data ?? []).map(option => [option.label, option.value]))
  const read = (code: string) => options.get(code)?.trim() || ''

  return {
    title: read('SITE_TITLE') || APP_CONFIG.name,
    description: read('SITE_DESCRIPTION') || FALLBACK_DESCRIPTION,
    logo: read('SITE_LOGO') || '/logo.svg',
    copyright: read('SITE_COPYRIGHT') || APP_CONFIG.copyright,
    beian: read('SITE_BEIAN')
  }
}
