import * as React from 'react'

import { X } from 'lucide-react'

import { cn } from 'cn'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Drawer, DrawerClose, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'

/** The drawer widths the screens use; the Tailwind class must stay a literal to be generated. */
type EntityDrawerWidth = 30 | 32 | 36 | 38 | 40 | 42 | 44 | 46 | 48

const WIDTH_CLASSES: Record<EntityDrawerWidth, string> = {
  30: 'data-[swipe-axis=x]:sm:[--drawer-content-width:30rem]',
  32: 'data-[swipe-axis=x]:sm:[--drawer-content-width:32rem]',
  36: 'data-[swipe-axis=x]:sm:[--drawer-content-width:36rem]',
  38: 'data-[swipe-axis=x]:sm:[--drawer-content-width:38rem]',
  40: 'data-[swipe-axis=x]:sm:[--drawer-content-width:40rem]',
  42: 'data-[swipe-axis=x]:sm:[--drawer-content-width:42rem]',
  44: 'data-[swipe-axis=x]:sm:[--drawer-content-width:44rem]',
  46: 'data-[swipe-axis=x]:sm:[--drawer-content-width:46rem]',
  48: 'data-[swipe-axis=x]:sm:[--drawer-content-width:48rem]'
}

interface EntityDrawerProps {
  readonly open: boolean
  readonly onClose: () => void
  readonly title: string
  readonly icon?: React.ReactNode
  /** A short tag next to the title, such as the selected record's name. */
  readonly badge?: React.ReactNode
  /** A secondary line under the title. */
  readonly description?: string
  readonly width?: EntityDrawerWidth
  /** Extra classes for the drawer panel, such as a mobile width override. */
  readonly contentClassName?: string
  /** Disables the close button outright, for states that re-render while saving. */
  readonly closeDisabled?: boolean
  /** Return false to keep the drawer open, such as while a save is in flight. */
  readonly canClose?: () => boolean
  /**
   * Unsaved input is on screen. Every user close (outside press, Esc, swipe, ✕, a `DrawerClose`
   * cancel button) then asks before discarding it; closing by setting `open` (after a save) does not.
   */
  readonly dirty?: boolean
  readonly children: React.ReactNode
}

/**
 * The right-side drawer shell shared by the entity screens: width variable, header with the
 * record icon and title, and a labelled close button. The body and any footer stay with the screen
 * because forms need to submit from their own footer.
 */
export function EntityDrawer({
  open,
  onClose,
  title,
  icon,
  badge,
  description,
  width = 32,
  contentClassName,
  closeDisabled = false,
  canClose,
  dirty = false,
  children
}: EntityDrawerProps) {
  const [confirming, setConfirming] = React.useState(false)

  return (
    <Drawer
      open={open}
      onOpenChange={nextOpen => {
        if (nextOpen || closeDisabled || !(canClose?.() ?? true)) return
        if (dirty) setConfirming(true)
        else onClose()
      }}
      swipeDirection="right"
    >
      <DrawerContent className={cn(WIDTH_CLASSES[width], contentClassName)}>
        <DrawerHeader
          className={cn(
            'flex-row justify-between gap-2 border-b p-4 md:gap-2',
            description ? 'items-start' : 'items-center'
          )}
        >
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              {icon}
              <DrawerTitle>{title}</DrawerTitle>
              {badge}
            </div>
            {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
          </div>

          <DrawerClose render={<Button variant="ghost" size="icon-sm" disabled={closeDisabled} />}>
            <X />
            <span className="sr-only">关闭</span>
          </DrawerClose>
        </DrawerHeader>

        {children}

        {/* Nested in the drawer, so pressing its backdrop never counts as a press outside the drawer. */}
        <AlertDialog open={confirming} onOpenChange={setConfirming}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>放弃未保存的修改？</AlertDialogTitle>
              <AlertDialogDescription>关闭后，本次填写的内容将丢失。</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>继续编辑</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={() => {
                  setConfirming(false)
                  onClose()
                }}
              >
                放弃修改
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DrawerContent>
    </Drawer>
  )
}
