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

/** The dictionary page's actions, rendered in the list card's toolbar slot. */
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
    <>
      {canCreate && (
        <Button className="w-full sm:w-auto" onClick={onCreate}>
          <Plus />
          新增字典
        </Button>
      )}

      {canClearCache && (
        <Button
          variant="outline"
          disabled={isClearingCache}
          onClick={onClearCache}
          className="text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
        >
          {isClearingCache ? <Spinner /> : <Trash2 />}
          清除缓存
        </Button>
      )}

      <Button variant="outline" disabled={isRefreshing} onClick={onRefresh}>
        {isRefreshing ? <Spinner /> : <RefreshCw />}
        刷新
      </Button>

      <Button variant="outline" onClick={onToggleFullscreen}>
        {isFullscreen ? <Minimize /> : <Maximize />}
        表格全屏
      </Button>
    </>
  )
}
