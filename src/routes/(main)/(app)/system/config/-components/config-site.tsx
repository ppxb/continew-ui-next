import { z } from 'zod'

import type { ProColumns } from '@/components/pro'
import { usePermission } from '@/hooks/use-permission'

import { OptionSchemaForm } from './option-schema-form'
import { ImageUploadField } from './image-upload-field'
import { SitePreview } from './site-preview'
import { type OptionMap, useOptionForm } from './use-option-form'

const nonBlank = (message: string) => z.string().trim().min(1, message)

const schema = z.object({
  SITE_LOGO: z.string(),
  SITE_FAVICON: z.string(),
  SITE_TITLE: nonBlank('请输入系统名称').max(18, '系统名称最多 18 个字符'),
  SITE_DESCRIPTION: nonBlank('请输入系统描述'),
  SITE_COPYRIGHT: nonBlank('请输入版权声明'),
  SITE_BEIAN: z.string().max(30, '备案号最多 30 个字符')
})

type SiteFormState = z.infer<typeof schema>

function toForm(optionMap: OptionMap): SiteFormState {
  return {
    SITE_LOGO: optionMap.SITE_LOGO?.value || '',
    SITE_FAVICON: optionMap.SITE_FAVICON?.value || '',
    SITE_TITLE: optionMap.SITE_TITLE?.value || '',
    SITE_DESCRIPTION: optionMap.SITE_DESCRIPTION?.value || '',
    SITE_COPYRIGHT: optionMap.SITE_COPYRIGHT?.value || '',
    SITE_BEIAN: optionMap.SITE_BEIAN?.value || ''
  }
}

export function createSiteColumns(optionMap: OptionMap, isEdit: boolean) {
  return [
    {
      title: optionMap.SITE_LOGO?.name, dataIndex: 'SITE_LOGO',
      formItemProps: { rules: schema.shape.SITE_LOGO, description: optionMap.SITE_LOGO?.description },
      formItemRender: (_, control) => <ImageUploadField {...control} value={String(control.value ?? '')} disabled={!isEdit || control.disabled} />
    },
    {
      title: optionMap.SITE_FAVICON?.name, dataIndex: 'SITE_FAVICON',
      formItemProps: { rules: schema.shape.SITE_FAVICON, description: optionMap.SITE_FAVICON?.description },
      formItemRender: (_, control) => (
        <ImageUploadField {...control} value={String(control.value ?? '')} disabled={!isEdit || control.disabled}
          accept="image/*,.ico" previewClassName="size-7 object-contain" invalidFileMessage="请选择有效的图标文件" />
      )
    },
    {
      title: optionMap.SITE_TITLE?.name, dataIndex: 'SITE_TITLE',
      fieldProps: { placeholder: '请输入系统名称', maxLength: 18, disabled: !isEdit },
      formItemProps: { rules: schema.shape.SITE_TITLE, description: optionMap.SITE_TITLE?.description }
    },
    {
      title: optionMap.SITE_BEIAN?.name, dataIndex: 'SITE_BEIAN',
      fieldProps: { placeholder: '请输入备案号', maxLength: 30, disabled: !isEdit },
      formItemProps: { rules: schema.shape.SITE_BEIAN, description: optionMap.SITE_BEIAN?.description }
    },
    {
      title: optionMap.SITE_COPYRIGHT?.name, dataIndex: 'SITE_COPYRIGHT',
      fieldProps: { placeholder: '请输入版权声明', disabled: !isEdit },
      formItemProps: { rules: schema.shape.SITE_COPYRIGHT, description: optionMap.SITE_COPYRIGHT?.description, className: 'sm:col-span-2' }
    },
    {
      title: optionMap.SITE_DESCRIPTION?.name, dataIndex: 'SITE_DESCRIPTION', valueType: 'textarea',
      fieldProps: { placeholder: '请输入系统描述', rows: 2, disabled: !isEdit },
      formItemProps: { rules: schema.shape.SITE_DESCRIPTION, description: optionMap.SITE_DESCRIPTION?.description, className: 'sm:col-span-2' },
      formItemRender: (_, control, form) => (
        <>
          {control.defaultRender()}
          <SitePreview values={form.getFieldsValue() as SiteFormState}
            className="xl:absolute xl:left-[calc(100%+1.25rem)] xl:top-0 xl:h-full xl:w-full" />
        </>
      )
    }
  ] satisfies ProColumns<SiteFormState>[]
}

export function ConfigSite() {
  const { hasPermission } = usePermission()
  const options = useOptionForm({ category: 'SITE', toForm })
  return (
    <OptionSchemaForm
      options={options}
      columns={createSiteColumns(options.optionMap, options.isEdit)}
      title="网站基础配置"
      description="设置系统的名称、Logo、图标与版权等基础信息"
      resetDescription="确认恢复基础配置为系统默认值吗？该操作不可撤销。"
      canUpdate={hasPermission('system:siteConfig:update')}
      variant="card"
      className="relative gap-4 rounded-xl border bg-card p-4 sm:p-5 xl:w-[calc(50%-0.625rem)]"
    />
  )
}
