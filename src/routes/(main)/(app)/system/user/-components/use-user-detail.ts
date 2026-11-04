import { useDetailQuery, type DetailQueryOptions } from '@/hooks/use-detail-query'
import { getUser, userKeys } from '@/lib/api/user'

/** One user's record shared by the detail, edit and role flows; a null id skips the query. */
export function useUserDetail(userId: string | number | null, options: DetailQueryOptions = {}) {
  return useDetailQuery(userKeys.detail(userId), getUser, userId, options)
}
