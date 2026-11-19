import { Eye, FileText, Pen, Trash2 } from 'lucide-react'

import { FlagBadge } from '@/components/data-badge'
import { type ProColumns } from '@/components/pro'
import { RichTextContent, RichTextEditor } from '@/components/rich-text-editor'
import { RowActionsMenu } from '@/components/row-actions-menu'
import { TextCell } from '@/components/text-cell'
import { Badge } from '@/components/ui/badge'
import { DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { usePermission } from '@/hooks/use-permission'
import type { NoticeDetailResp, NoticeResp } from '@/lib/api/notice'
import { EMPTY_PLACEHOLDER } from '@/lib/constants'

import { NoticeMethodTags, NoticeStatusBadge, NoticeTypeBadge, noticeOptionLabel } from './notice-display'
import type { NoticeDicts } from './use-notice-dicts'
import { noticeFormRules } from './notice-form-values'
import { NoticePublishTimePicker } from './notice-publish-time-picker'
import { NoticeUsersField } from './notice-users-field'

export type NoticeAction = 'detail' | 'view' | 'edit' | 'delete'

export const HIDDEN_BY_DEFAULT = { isTop: { show: false } }

/** Every code the row menu can show; the menu is dropped when the user has none of them. */
const ROW_ACTION_PERMISSIONS = [
  'system:notice:get',
  'system:notice:view',
  'system:notice:update',
  'system:notice:delete'
]

function RowActions({
  notice,
  onAction
}: {
  notice: NoticeResp
  onAction: (action: NoticeAction, notice: NoticeResp) => void
}) {
  const { hasPermission, hasAnyPermission } = usePermission()

  if (!hasAnyPermission(ROW_ACTION_PERMISSIONS)) {
    return null
  }

  return (
    <div className="flex items-center justify-center">
      <RowActionsMenu>
        <DropdownMenuGroup>
          {hasPermission('system:notice:get') && (
            <DropdownMenuItem onClick={() => onAction('detail', notice)}>
              <FileText />
              详情
            </DropdownMenuItem>
          )}
          {hasPermission('system:notice:view') && (
            <DropdownMenuItem onClick={() => onAction('view', notice)}>
              <Eye />
              查看
            </DropdownMenuItem>
          )}
          {hasPermission('system:notice:update') && (
            <DropdownMenuItem onClick={() => onAction('edit', notice)}>
              <Pen />
              修改
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
        {hasPermission('system:notice:delete') && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem variant="destructive" onClick={() => onAction('delete', notice)}>
                <Trash2 />
                删除
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </>
        )}
      </RowActionsMenu>
    </div>
  )
}

export type NoticeRecord = NoticeResp & Partial<Omit<NoticeDetailResp, keyof NoticeResp>>

export function noticeColumns(dicts: NoticeDicts, readerView = false): ProColumns<NoticeRecord>[] {
  return [
    { title: '序号', valueType: 'index' },
    { title: 'ID', dataIndex: 'id', hideInTable: true, hideInForm: true, span: 2 },
    {
      title: (_, type) => (type === 'table' ? '公告标题' : '标题'),
      dataIndex: 'title',
      span: 2,
      fieldProps: { maxLength: 150, placeholder: '请输入公告标题' },
      formItemProps: { rules: noticeFormRules.title, className: 'sm:col-span-2' },
      render: (dom, notice, _index, _action, schema) =>
        schema.type === 'table' ? (
          <TextCell value={notice.title} className="max-w-72 font-medium" />
        ) : readerView ? (
          <div className="flex items-start gap-2">
            <h2 className="min-w-0 flex-1 text-xl leading-snug font-semibold">{notice.title}</h2>
            {notice.isTop ? (
              <Badge variant="secondary" className="shrink-0 font-normal">
                置顶
              </Badge>
            ) : null}
          </div>
        ) : (
          dom
        )
    },
    {
      title: (_, type) => (type === 'table' || readerView ? '发布人' : '创建人'),
      dataIndex: 'createUserString',
      hideInForm: true
    },
    {
      title: '通知范围',
      dataIndex: 'noticeScope',
      valueType: 'select',
      initialValue: '1',
      convertValue: value => String(value),
      valueEnum: new Map(dicts.scopeOptions.map(item => [item.value, item.label])),
      fieldProps: (_form, schema) => ({ placeholder: '请选择通知范围', disabled: schema.entity?.status === 3 }),
      formItemProps: { rules: noticeFormRules.noticeScope },
      render: (_, notice) => noticeOptionLabel(dicts.scopeOptions, notice.noticeScope)
    },
    {
      valueType: 'dependency',
      name: ['noticeScope'],
      columns: values =>
        String(values.noticeScope) === '2'
          ? [
              {
                title: '指定用户',
                dataIndex: 'noticeUsers',
                hideInTable: true,
                hideInDescriptions: true,
                initialValue: [],
                convertValue: value => ((value ?? []) as readonly (string | number)[]).map(String),
                formItemProps: (_form, schema) => ({
                  rules: noticeFormRules.noticeUsers,
                  className: 'sm:col-span-2',
                  description:
                    schema.entity?.status === 3 ? '公告已发布，通知用户不可修改' : '只有选中的用户能收到该公告'
                }),
                formItemRender: (schema, control) => (
                  <NoticeUsersField
                    id={control.id}
                    value={(control.value ?? []) as string[]}
                    onChange={control.onChange}
                    onBlur={control.onBlur}
                    invalid={control.invalid}
                    disabled={Boolean(control.disabled) || schema.entity?.status === 3}
                  />
                )
              }
            ]
          : []
    },
    {
      title: '通知方式',
      dataIndex: 'noticeMethods',
      valueType: 'select',
      initialValue: ['1'],
      convertValue: value => (value === null ? null : (value as number[]).map(String)),
      valueEnum: new Map(dicts.methodOptions.map(item => [item.value, item.label])),
      fieldProps: (_form, schema) => ({
        mode: 'multiple',
        placeholder: '请选择通知方式',
        disabled: schema.entity?.status === 3
      }),
      formItemProps: {
        rules: noticeFormRules.noticeMethods,
        required: false,
        description: '可多选；不选则只保存公告，不推送消息',
        className: 'sm:col-span-2'
      },
      render: (_, notice) => <NoticeMethodTags methods={notice.noticeMethods} options={dicts.methodOptions} />
    },
    {
      title: '分类',
      dataIndex: 'type',
      valueType: 'select',
      search: true,
      initialValue: '',
      valueEnum: new Map(dicts.typeOptions.map(item => [item.value, item.label])),
      fieldProps: { placeholder: '请选择分类' },
      formItemProps: { rules: noticeFormRules.type },
      render: (_, notice) => <NoticeTypeBadge type={notice.type} options={dicts.typeOptions} />
    },
    {
      title: '状态',
      dataIndex: 'status',
      hideInForm: true,
      render: (_, notice) => <NoticeStatusBadge status={notice.status} options={dicts.statusOptions} />
    },
    {
      title: (_, type) => (type === 'form' ? '定时发布' : '是否定时'),
      dataIndex: 'isTiming',
      valueType: 'switch',
      initialValue: false,
      fieldProps: (_form, schema) => ({
        checkedValue: true,
        uncheckedValue: false,
        disabled: schema.entity?.status === 3
      }),
      formItemProps: form => ({
        rules: noticeFormRules.isTiming,
        required: false,
        className: 'sm:col-span-2',
        description: form.getFieldValue('isTiming') ? '到达发布时间后自动发布' : '保存或发布时立即生效'
      }),
      render: (_, notice, _index, _action, schema) =>
        schema.type === 'table' ? (
          <FlagBadge active={notice.isTiming} activeLabel="是" inactiveLabel="否" />
        ) : notice.isTiming ? (
          '是'
        ) : (
          '否'
        )
    },
    { title: '发布时间', dataIndex: 'publishTime', valueType: 'dateTime', hideInForm: true },
    {
      valueType: 'dependency',
      name: ['isTiming'],
      columns: values =>
        values.isTiming
          ? [
              {
                title: '发布时间',
                dataIndex: 'publishTime',
                hideInTable: true,
                hideInDescriptions: true,
                initialValue: null,
                formItemProps: { rules: noticeFormRules.publishTime, className: 'sm:col-span-2' },
                formItemRender: (schema, control) => (
                  <NoticePublishTimePicker
                    value={control.value as string | null}
                    disabled={Boolean(control.disabled) || schema.entity?.status === 3}
                    invalid={control.invalid}
                    onChange={control.onChange}
                  />
                )
              }
            ]
          : []
    },
    {
      title: (_, type) => (type === 'form' ? '置顶' : '是否置顶'),
      dataIndex: 'isTop',
      valueType: 'switch',
      initialValue: false,
      fieldProps: { checkedValue: true, uncheckedValue: false },
      formItemProps: {
        rules: noticeFormRules.isTop,
        required: false,
        description: '置顶公告在列表和通知中优先展示',
        className: 'sm:col-span-2'
      },
      render: (_, notice, _index, _action, schema) =>
        schema.type === 'table' ? (
          <FlagBadge active={notice.isTop} activeLabel="是" inactiveLabel="否" />
        ) : notice.isTop ? (
          '是'
        ) : (
          '否'
        )
    },
    {
      title: '发布时间',
      dataIndex: 'createTime',
      valueType: 'dateTime',
      hideInTable: true,
      hideInForm: true,
      render: (dom, notice) => (readerView ? notice.publishTime || notice.createTime || EMPTY_PLACEHOLDER : dom)
    },
    { title: '修改人', dataIndex: 'updateUserString', hideInTable: true, hideInForm: true },
    { title: '修改时间', dataIndex: 'updateTime', valueType: 'dateTime', hideInTable: true, hideInForm: true },
    {
      title: '内容',
      dataIndex: 'content',
      hideInTable: true,
      initialValue: '',
      span: 2,
      formItemProps: { rules: noticeFormRules.content, className: 'sm:col-span-2' },
      formItemRender: (_, control) => (
        <RichTextEditor
          value={String(control.value ?? '')}
          disabled={control.disabled}
          invalid={control.invalid}
          onChange={control.onChange}
        />
      ),
      render: (_, notice) => <RichTextContent html={notice.content ?? ''} />
    }
  ]
}

export function createNoticeColumns(
  dicts: NoticeDicts,
  onAction: (action: NoticeAction, notice: NoticeResp) => void
): ProColumns<NoticeRecord>[] {
  return [
    ...noticeColumns(dicts),
    { title: '操作', valueType: 'option', render: (_, notice) => <RowActions notice={notice} onAction={onAction} /> }
  ]
}
