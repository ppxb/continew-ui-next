import * as React from 'react'

import type { PaginationState } from '@tanstack/react-table'

/** Moves the page index back when the current page no longer has rows. */
export function usePageClamp(
  total: number,
  pagination: PaginationState,
  setPagination: React.Dispatch<React.SetStateAction<PaginationState>>
) {
  React.useEffect(() => {
    if (total > 0 && pagination.pageIndex * pagination.pageSize >= total) {
      const maxPageIndex = Math.max(0, Math.ceil(total / pagination.pageSize) - 1)
      setPagination(current => ({ ...current, pageIndex: maxPageIndex }))
    }
  }, [total, pagination.pageIndex, pagination.pageSize, setPagination])
}
