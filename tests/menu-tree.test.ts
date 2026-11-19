import { describe, expect, it } from 'vitest'

import { toMenuTree, type MenuGroup } from '@/navigation/menu'

const groups: MenuGroup[] = [
  { id: 'root', items: [{ id: 'app-dashboard', title: '仪表盘', url: '/dashboard' }] },
  {
    id: '1',
    label: '系统管理',
    items: [
      { id: '2', title: '用户管理', url: '/system/user' },
      {
        id: '3',
        title: '日志',
        url: '/system/log',
        subItems: [
          { id: '4', title: '登录日志', url: '/system/log/login' },
          { id: '5', title: '操作日志', url: '/system/log/operation' }
        ]
      }
    ]
  }
]

describe('toMenuTree', () => {
  it('turns labelled groups into collapsible parents and keeps loose pages on top', () => {
    const [tree] = toMenuTree(groups)

    expect(toMenuTree(groups)).toHaveLength(1)
    expect(tree.label).toBeUndefined()
    expect(tree.items.map(item => item.title)).toEqual(['仪表盘', '系统管理'])
    expect(tree.items[0].subItems).toBeUndefined()
  })

  it('lifts nested pages into the parent because the sidebar renders one sub level', () => {
    const parent = toMenuTree(groups)[0].items[1]

    expect(parent.subItems?.map(item => item.title)).toEqual(['用户管理', '登录日志', '操作日志'])
  })
})
