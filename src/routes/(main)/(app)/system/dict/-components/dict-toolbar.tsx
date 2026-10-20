import { Maximize, Minimize, Plus, RefreshCw, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'

interface DictToolbarProps {
  readonly canCreate: boolean
  readonly canClearCache: boolean
  readonly isClearingCache: boolean
  readonly isRefreshing: boolean
  readonly isFullscreen: boolean
  readonly onCreate: () => void
  readonly onClearCache: () => void
  readonly onRefresh: () => void
  readonly onToggleFullscreen: () => void
}

/** Actions on the left, table tools on the right, mirroring the menu and storage screens. */
export function DictToolbar({
  canCreate,
  canClearCache,
  isClearingCache,
  isRefreshing,
  isFullscreen,
  onCreate,
  onClearCache,
  onRefresh,
  onToggleFullscreen
}: DictToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4">
      <div className="flex flex-wrap items-center gap-2">
        {canCreate ? (
          <Button type="button" size="sm" onClick={onCreate}>
            <Plus />
            新增字典
          </Button>
        ) : null}

        {canClearCache ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isClearingCache}
            onClick={onClearCache}
            className="text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
          >
            {isClearingCache ? <Spinner /> : <Trash2 />}
            清除缓存
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" variant="outline" disabled={isRefreshing} onClick={onRefresh}>
          {isRefreshing ? <Spinner /> : <RefreshCw />}
          刷新
        </Button>

        <Button type="button" size="sm" variant="outline" onClick={onToggleFullscreen}>
          {isFullscreen ? <Minimize /> : <Maximize />}
          表格全屏
        </Button>
      </div>
    </div>
  )
}
