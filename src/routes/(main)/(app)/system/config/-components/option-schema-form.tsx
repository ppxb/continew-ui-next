import { BetaSchemaForm, type ProColumns, type ProValues } from '@/components/pro'

import { ConfigPanelHeader } from './config-panel-header'
import { ConfigPanelError, ConfigPanelSkeleton } from './config-panel-states'
import { ConfigResetDialog } from './config-reset-dialog'
import type { OptionFormController } from './use-option-form'

interface OptionSchemaFormProps<T extends ProValues> {
  options: OptionFormController<T>
  columns: readonly ProColumns<T>[]
  title: string
  description: string
  resetDescription: string
  canUpdate: boolean
  grid?: boolean
  className?: string
  variant?: 'panel' | 'card'
  skeletonFields?: number
}

export function OptionSchemaForm<T extends ProValues>({
  options,
  columns,
  title,
  description,
  resetDescription,
  canUpdate,
  grid = true,
  className,
  variant = 'panel',
  skeletonFields
}: OptionSchemaFormProps<T>) {
  if (options.isLoading) return <ConfigPanelSkeleton variant={variant === 'card' ? 'card' : 'form'} fields={skeletonFields} />
  if (options.isError) return <ConfigPanelError onRetry={() => void options.refetch()} />

  return (
    <>
      <BetaSchemaForm<T>
        layoutType="Form"
        grid={grid}
        className={className}
        columns={columns}
        initialValues={options.initialValues}
        formRef={options.formRef}
        onFinish={options.save}
        submitter={{
          render: ({ isSubmitting }) => (
            <div className="order-first">
              <ConfigPanelHeader
                title={title}
                description={description}
                variant={variant}
                canUpdate={canUpdate}
                isEdit={options.isEdit}
                isSubmitting={isSubmitting}
                onEdit={options.startEdit}
                onResetDefault={() => options.setResetDialogOpen(true)}
                onResetForm={options.resetForm}
                onCancel={options.cancelEdit}
              />
            </div>
          )
        }}
      />
      <ConfigResetDialog
        open={options.resetDialogOpen}
        onOpenChange={options.setResetDialogOpen}
        onConfirm={options.resetToDefault}
        isResetting={options.isResetting}
        description={resetDescription}
      />
    </>
  )
}
