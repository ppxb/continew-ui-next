import * as React from 'react'

import { ImagePlus, Upload } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/toast'
import { cn } from 'cn'

/** The image is stored inline as a data URL in the config value, so it has to stay small. */
const MAX_IMAGE_BYTES = 1024 * 1024

const PREVIEW_BOX_CLASS =
  'group relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/20 transition-all'

interface ImageUploadFieldProps {
  value: string
  onChange: (value: string) => void
  id: string
  invalid: boolean
  onBlur: () => void
  accept?: string
  previewClassName?: string
  invalidFileMessage?: string
  disabled?: boolean
}

export function ImageUploadField({
  value,
  onChange,
  id,
  invalid,
  onBlur,
  accept = 'image/*',
  previewClassName = 'size-full object-contain p-1.5',
  invalidFileMessage = '请选择有效的图片文件',
  disabled = false
}: ImageUploadFieldProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.add({ title: invalidFileMessage, type: 'error' })
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.add({ title: '图片不能超过 1 MB', type: 'error' })
      return
    }
    const reader = new FileReader()
    reader.onload = evt => onChange(String(evt.target?.result || ''))
    reader.readAsDataURL(file)
  }

  const preview = value ? (
    <img src={value} className={previewClassName} />
  ) : (
    <ImagePlus
      className={cn('size-5 text-muted-foreground/50 transition-colors', 'group-hover:text-muted-foreground')}
    />
  )

  return (
    <div className="flex items-center">
      <Input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled}
      />
      {disabled ? (
        <div id={id} className={PREVIEW_BOX_CLASS} aria-invalid={invalid}>
          {preview}
        </div>
      ) : (
        <Button
          type="button"
          size="icon-lg"
          id={id}
          onBlur={onBlur}
          aria-invalid={invalid}
          className={cn(PREVIEW_BOX_CLASS, 'hover:bg-muted/40')}
          onClick={() => inputRef.current?.click()}
        >
          {preview}
          <span
            className={cn(
              'absolute inset-0 flex flex-col items-center justify-center',
              'bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100'
            )}
          >
            <Upload />
          </span>
        </Button>
      )}
    </div>
  )
}
