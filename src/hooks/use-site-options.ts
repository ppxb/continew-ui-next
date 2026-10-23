import { useQuery } from '@tanstack/react-query'

import { listSiteOptionDict } from '@/lib/api/common'
import { siteOptionKeys } from '@/lib/query-keys'
import { getCachedSiteOptions, setCachedSiteOptions } from '@/lib/site-option-cache'

/** Public site options (`SITE_TITLE`, `SITE_LOGO`, ...) shared by the auth screens and the shell. */
export function useSiteOptions() {
  const query = useQuery({
    queryKey: siteOptionKeys.all,
    queryFn: async ({ signal }) => {
      const options = await listSiteOptionDict(signal)
      setCachedSiteOptions(options)
      return options
    },
    initialData: () => getCachedSiteOptions() ?? undefined,
    staleTime: 5 * 60_000
  })

  const options = new Map((query.data ?? []).map(option => [option.label, option.value]))
  const read = (code: string) => options.get(code)?.trim() || ''

  return {
    title: read('SITE_TITLE'),
    logo: read('SITE_LOGO') || `${import.meta.env.BASE_URL}logo.svg`,
    copyright: read('SITE_COPYRIGHT'),
    beian: read('SITE_BEIAN')
  }
}
