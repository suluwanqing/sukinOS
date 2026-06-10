import React, { useState, useEffect, useRef } from 'react'
import style from './style.module.css'
import { createNamespace } from '/utils/js/classcreate'
import * as echarts from 'echarts'

import Button from '@/component/button/layout'
import { alert } from '@/component/alert/layout'
import { confirm } from '@/component/confirm/layout'
import Select from '@/component/select/drowSelection/layout'

import {
  getSystemUpdates,
  createSystemUpdate,
  editSystemUpdate,
  deleteSystemUpdate
} from '@/apis/system/updateLog'

import { updateTypes } from '/utils/js/logInfo'

import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import CloseIcon from '@mui/icons-material/Close'

const bem = createNamespace('system-update')
const formBem = createNamespace('update-form')

const SvgTrashIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </svg>
)

function UpdateForm({ visible, onClose, onSubmit, initialData }) {
  const [newVersion, setNewVersion] = useState(false)
  const [version, setVersion] = useState('')
  const [title, setTitle] = useState('')
  const [updateType, setUpdateType] = useState('feature')
  const [content, setContent] = useState('')
  const [items, setItems] = useState([])

  useEffect(() => {
    if (initialData) {
      setNewVersion(false)
      setVersion(initialData.version || '')
      setTitle(initialData.title || '')
      setItems(
        initialData.items && initialData.items.length > 0
          ? initialData.items.map((it, idx) => ({ ...it, id: Date.now() + idx }))
          : []
      )
      setUpdateType('feature')
      setContent('')
    } else {
      setNewVersion(false)
      setVersion('')
      setTitle('')
      setItems([])
      setUpdateType('feature')
      setContent('')
    }
  }, [initialData, visible])

  if (!visible) return null

  const handleAddItem = () => {
    setItems([...items, { id: Date.now(), updateType: 'feature', content: '' }])
  }

  const handleRemoveItem = (id) => {
    setItems(items.filter((item) => item.id !== id))
  }

  const handleItemFieldChange = (id, field, value) => {
    setItems(
      items.map((it) => {
        if (it.id === id) {
          return { ...it, [field]: value }
        }
        return it
      })
    )
  }

  const handleConfirm = () => {
    if (initialData) {
      if (items.length === 0) {
        alert.failure('明细列表不能为空')
        return
      }
      const invalid = items.some((it) => !it.content.trim())
      if (invalid) {
        alert.failure('明细描述不能为空')
        return
      }
      onSubmit({
        version,
        title: title.trim(),
        items: items.map(({ updateType: itemType, content: itemContent }) => ({
          updateType: itemType,
          content: itemContent.trim()
        }))
      })
    } else {
      if (!content.trim()) {
        alert.failure('描述内容不能为空')
        return
      }
      onSubmit({
        newVersion,
        title: title.trim() || undefined,
        items: [{ updateType, content: content.trim() }]
      })
    }
  }

  return (
    <div className={style[formBem.b('overlay')]}>
      <div className={style[formBem.b('container')]}>
        <div className={style[formBem.e('header')]}>
          <span className={style[formBem.e('title')]}>
            {initialData ? '修改版本历史' : '提交系统更新'}
          </span>
          <button className={style[formBem.e('close-btn')]} onClick={onClose}>
            <CloseIcon fontSize="small" />
          </button>
        </div>

        <div className={style[formBem.e('body')]}>
          {!initialData ? (
            <>
              <div className={style[formBem.e('form-item')]}>
                <label className={style[formBem.e('checkbox-label')]}>
                  <input
                    type="checkbox"
                    className={style[formBem.e('checkbox')]}
                    checked={newVersion}
                    onChange={(e) => setNewVersion(e.target.checked)}
                  />
                  作为新版本发布
                </label>
              </div>

              {newVersion && (
                <div className={style[formBem.e('form-item')]}>
                  <label className={style[formBem.e('label')]}>版本标题</label>
                  <input
                    type="text"
                    className={style[formBem.e('input')]}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="例如：主控台基础功能升级"
                  />
                </div>
              )}

              <div className={style[formBem.e('form-item')]}>
                <label className={style[formBem.e('label')]}>更新类型</label>
                <Select
                  value={updateType}
                  onChange={setUpdateType}
                  options={updateTypes}
                  placeholder="选择类型"
                  direction="bottom"
                />
              </div>

              <div className={style[formBem.e('form-item')]}>
                <label className={style[formBem.e('label')]}>描述内容</label>
                <textarea
                  className={style[formBem.e('textarea')]}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="具体改动描述..."
                  rows={5}
                />
              </div>
            </>
          ) : (
            <>
              <div className={style[formBem.e('form-item')]}>
                <label className={style[formBem.e('label')]}>版本号</label>
                <input
                  type="text"
                  className={style[formBem.e('input')]}
                  value={version}
                  disabled={true}
                  onChange={(e) => setVersion(e.target.value)}
                />
              </div>

              <div className={style[formBem.e('form-item')]}>
                <label className={style[formBem.e('label')]}>版本标题</label>
                <input
                  type="text"
                  className={style[formBem.e('input')]}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className={style[formBem.e('sub-items')]}>
                <div className={style[formBem.e('sub-header')]}>
                  <span className={style[formBem.e('label')]}>改动细节管理</span>
                  <button className={style[formBem.e('add-btn')]} onClick={handleAddItem}>
                    <AddIcon fontSize="inherit" /> 增加明细条目
                  </button>
                </div>

                {items.map((item) => (
                  <div key={item.id} className={style[formBem.e('item-card')]}>
                    <div className={style[formBem.e('item-row')]}>
                      <div style={{ width: 140 }}>
                        <Select
                          value={item.updateType}
                          onChange={(val) => handleItemFieldChange(item.id, 'updateType', val)}
                          options={updateTypes}
                          placeholder="选择类型"
                          direction="bottom"
                        />
                      </div>
                      <button
                        className={style[formBem.e('close-btn')]}
                        style={{ color: '#ef4444' }}
                        onClick={() => handleRemoveItem(item.id)}
                      >
                        <SvgTrashIcon />
                      </button>
                    </div>
                    <textarea
                      className={style[formBem.e('textarea')]}
                      value={item.content}
                      onChange={(e) => handleItemFieldChange(item.id, 'content', e.target.value)}
                      placeholder="细节内容..."
                      rows={3}
                    />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className={style[formBem.e('footer')]}>
          <Button type="default" size="medium" onClick={onClose}>
            取消
          </Button>
          <Button type="primary" size="medium" onClick={handleConfirm}>
            保存
          </Button>
        </div>
      </div>
    </div>
  )
}

function SystemUpdate({ user }) {
  const [updates, setUpdates] = useState([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const chartRefType = useRef(null)
  const isRoot = user?.root || false

  const fetchUpdates = async () => {
    setLoading(true)
    try {
      const res = await getSystemUpdates()
      if (res.code === 200) {
        setUpdates(res.data || [])
      } else {
        alert.failure(res.message || '获取记录失败')
      }
    } catch (error) {
      alert.failure(error.message || '网络连接异常')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUpdates()
  }, [])

  useEffect(() => {
    if (!updates || updates.length === 0 || !chartRefType.current) return

    const countMap = {}
    updateTypes.forEach((t) => {
      countMap[t.value] = 0
    })

    updates.forEach((group) => {
      if (group.items) {
        group.items.forEach((item) => {
          const rawType = item.updateType || item.update_type
          const type = rawType === 'feat' ? 'feature' : rawType
          if (countMap[type] !== undefined) {
            countMap[type]++
          } else {
            countMap[type] = (countMap[type] || 0) + 1
          }
        })
      }
    })

    const chartData = updateTypes
      .map((t) => ({
        value: countMap[t.value] || 0,
        name: t.text
      }))
      .filter((item) => item.value > 0)

    const chartColors = updateTypes
      .filter((t) => (countMap[t.value] || 0) > 0)
      .map((t) => t.color)

    const chartType = echarts.init(chartRefType.current)
    chartType.setOption({
      title: { text: '系统改动占比', textStyle: { fontSize: 12, fontWeight: '700', color: '#1e293b' }, left: 'left' },
      tooltip: { trigger: 'item', backgroundColor: 'rgba(255, 255, 255, 0.96)', textStyle: { color: '#334155', fontSize: 11 } },
      legend: { bottom: '0%', left: 'center', itemWidth: 6, itemHeight: 6, textStyle: { fontSize: 9, color: '#64748b' } },
      color: chartColors.length > 0 ? chartColors : ['#3b82f6'],
      series: [{
        name: '更新类型',
        type: 'pie',
        radius: ['40%', '65%'],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 },
        label: { show: false },
        data: chartData.length > 0 ? chartData : [{ value: 0, name: '暂无更新' }]
      }]
    })

    const handleResize = () => {
      chartType.resize()
    }
    window.addEventListener('resize', handleResize)

    return () => {
      chartType.dispose()
      window.removeEventListener('resize', handleResize)
    }
  }, [updates])

  const handleFormSubmit = async (formData) => {
    try {
      let res
      if (editingItem) {
        res = await editSystemUpdate({
          id: editingItem.id,
          version: formData.version,
          title: formData.title,
          items: formData.items
        })
      } else {
        res = await createSystemUpdate(formData)
      }

      if (res.code === 200) {
        alert.success(editingItem ? '修改成功' : '发布成功')
        setModalVisible(false)
        setEditingItem(null)
        fetchUpdates()
      } else {
        alert.failure(res.message || '操作失败')
      }
    } catch (err) {
      alert.failure(err.message || '请求处理失败')
    }
  }

  const handleDelete = (id) => {
    confirm.show({
      title: '确认删除',
      content: '您确定要删除这条记录吗？删除后将无法恢复。',
      onConfirm: async () => {
        try {
          const res = await deleteSystemUpdate({ id })
          if (res.code === 200) {
            alert.success('删除成功')
            fetchUpdates()
          } else {
            alert.failure(res.message || '删除失败')
          }
        } catch (err) {
          alert.failure(err.message || '网络请求异常')
        }
      },
      onCancel: () => {}
    })
  }

  const openCreateModal = () => {
    setEditingItem(null)
    setModalVisible(true)
  }

  const openEditModal = (item) => {
    setEditingItem(item)
    setModalVisible(true)
  }

  const formatTag = (type) => {
    const rawType = type === 'feat' ? 'feature' : type
    const found = updateTypes.find((t) => t.value === rawType)
    return found || { text: '更新', color: '#64748b' }
  }

  const formatTime = (timeStr) => {
    if (!timeStr) return ''
    const date = new Date(timeStr)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  }

  return (
    <div className={style[bem.b()]}>
      <div className={style[bem.e('sidebar')]}>
        <div className={style[bem.e('sidebar-title')]}>版本历史路线</div>

        <div className={style[bem.e('flow-container')]}>
          <div className={style[bem.e('flow')]}>
            <div className={style[bem.e('flow-line')]} />
            {updates.map((g) => (
              <div key={g.id} className={style[bem.e('flow-node')]}>
                <div className={style[bem.e('flow-dot')]} />
                <span className={style[bem.e('flow-ver')]}>{g.version || '日常热更'}</span>
                <span className={style[bem.e('flow-date')]}>{formatTime(g.createdAt)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={style[bem.e('chart-box')]}>
          <div ref={chartRefType} className={style[bem.e('chart')]} />
        </div>
      </div>

      <div className={style[bem.e('main')]}>
        <div className={[
          style[bem.e('toolbar')],
          style[bem.is('hidden', !isRoot)]
        ].filter(Boolean).join(' ')}>
          <Button type="primary" size="small" onClick={openCreateModal}>
            <div className={style[bem.e('btn-inner')]}>
              <AddIcon fontSize="inherit" style={{ marginRight: 4 }} />
              新增版本状态
            </div>
          </Button>
        </div>

        <div className={style[bem.e('scroll-area')]}>
          <div className={style[bem.e('content')]}>
            {loading && <div className={style[bem.e('loading')]}>读取状态中...</div>}

            {!loading && updates.length === 0 && (
              <div className={style[bem.e('empty')]}>暂无发布的状态更新</div>
            )}

            {!loading && updates.map((group) => (
              <div key={group.id} className={style[bem.e('group')]}>
                <div className={style[bem.e('card')]}>
                  <div className={style[bem.e('card-header')]}>
                    <div className={style[bem.e('card-meta')]}>
                      <span className={style[bem.e('version-badge')]}>
                        {group.version || '日常更新'}
                      </span>
                      {group.title && (
                        <span className={style[bem.e('version-title')]}>
                          {group.title}
                        </span>
                      )}
                      <span className={style[bem.e('time')]}>
                        <AccessTimeIcon fontSize="inherit" style={{ marginRight: 4, verticalAlign: 'middle' }} />
                        {formatTime(group.createdAt)}
                      </span>
                    </div>

                    {isRoot && (
                      <div className={style[bem.e('operations')]}>
                        <button className={style[bem.e('op-btn')]} onClick={() => openEditModal(group)}>
                          <EditIcon fontSize="inherit" />
                        </button>
                        <button className={[style[bem.e('op-btn')], style[bem.e('op-btn-danger')]].join(' ')} onClick={() => handleDelete(group.id)}>
                          <SvgTrashIcon />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className={style[bem.e('card-body')]}>
                    {group.items && group.items.map((item, idx) => {
                      const tagInfo = formatTag(item.updateType || item.update_type)
                      return (
                        <div key={idx} className={style[bem.e('item')]}>
                          <span
                            className={style[bem.e('tag')]}
                            style={{ backgroundColor: tagInfo.color }}
                          >
                            {tagInfo.text}
                          </span>
                          <p className={style[bem.e('text-content')]}>
                            {item.content}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <UpdateForm
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSubmit={handleFormSubmit}
        initialData={editingItem}
      />
    </div>
  )
}

export default SystemUpdate
