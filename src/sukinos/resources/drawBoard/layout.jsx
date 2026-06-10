import React, { useCallback, useState } from 'react'
import style from './style.module.css'
import { createNamespace } from '/utils/js/classcreate'
import Canvas from './canvas/layout'
import Gallery from './gallery/layout'
import Mindmap from './mindmap/layout'

const bem = createNamespace('draw-board')

const HelpModal = ({ onClose }) => {
  return (
    <div className={style[bem.e('modal-mask')]} onClick={onClose}>
      <div className={style[bem.e('modal')]} onClick={(e) => e.stopPropagation()}>
        <div className={style[bem.e('modal-header')]}>
          <span>功能与快捷键说明</span>
          <button className={style[bem.e('modal-close')]} onClick={onClose}>&times;</button>
        </div>
        <div className={style[bem.e('modal-body')]}>
          <div className={style[bem.e('help-section')]}>
            <div className={style[bem.e('help-title')]}>画板 </div>
            <div className={style[bem.e('help-list')]}>
              <div className={style[bem.e('help-item')]}><span>拖拽画布视图</span><kbd className={style[bem.e('kbd')]}>Space + 拖拽</kbd></div>
              <div className={style[bem.e('help-item')]}><span>复制选中项</span><kbd className={style[bem.e('kbd')]}>Ctrl + C</kbd></div>
              <div className={style[bem.e('help-item')]}><span>粘贴元素</span><kbd className={style[bem.e('kbd')]}>Ctrl + V</kbd></div>
              <div className={style[bem.e('help-item')]}><span>原地复制副本</span><kbd className={style[bem.e('kbd')]}>Ctrl + D</kbd></div>
              <div className={style[bem.e('help-item')]}><span>全选元素</span><kbd className={style[bem.e('kbd')]}>Ctrl + A</kbd></div>
              <div className={style[bem.e('help-item')]}><span>撤销 / 重做</span><kbd className={style[bem.e('kbd')]}>Ctrl + Z / Y</kbd></div>
              <div className={style[bem.e('help-item')]}><span>层级上移/下移</span><kbd className={style[bem.e('kbd')]}>] / [</kbd></div>
              <div className={style[bem.e('help-item')]}><span>拖动时复制</span><kbd className={style[bem.e('kbd')]}>Alt + 拖拽</kbd></div>
              <div className={style[bem.e('help-item')]}><span>删除选中元素</span><kbd className={style[bem.e('kbd')]}>Delete</kbd></div>
              <div className={style[bem.e('help-item')]}><span>切换选择工具</span><kbd className={style[bem.e('kbd')]}>V</kbd></div>
              <div className={style[bem.e('help-item')]}><span>切换手形工具</span><kbd className={style[bem.e('kbd')]}>H</kbd></div>
            </div>
          </div>
          <div className={style[bem.e('help-section')]}>
            <div className={style[bem.e('help-title')]}>思维导图</div>
            <div className={style[bem.e('help-list')]}>
              <div className={style[bem.e('help-item')]}><span>添加子节点</span><kbd className={style[bem.e('kbd')]}>Tab</kbd></div>
              <div className={style[bem.e('help-item')]}><span>添加同级节点</span><kbd className={style[bem.e('kbd')]}>Enter</kbd></div>
              <div className={style[bem.e('help-item')]}><span>编辑文本</span><kbd className={style[bem.e('kbd')]}>F2 / 双击</kbd></div>
              <div className={style[bem.e('help-item')]}><span>拖拽画布视图</span><kbd className={style[bem.e('kbd')]}>Space + 拖拽</kbd></div>
              <div className={style[bem.e('help-item')]}><span>复制/粘贴节点</span><kbd className={style[bem.e('kbd')]}>Ctrl + C / V</kbd></div>
              <div className={style[bem.e('help-item')]}><span>锁定/解锁节点</span><kbd className={style[bem.e('kbd')]}>Ctrl + L</kbd></div>
              <div className={style[bem.e('help-item')]}><span>删除选中节点</span><kbd className={style[bem.e('kbd')]}>Delete</kbd></div>
              <div className={style[bem.e('help-item')]}><span>多选节点</span><kbd className={style[bem.e('kbd')]}>Shift + 点击</kbd></div>
              <div className={style[bem.e('help-item')]}><span>结构重组</span><kbd className={style[bem.e('kbd')]}>拖拽节点到新父级</kbd></div>
              <div className={style[bem.e('help-item')]}><span>框选节点</span><kbd className={style[bem.e('kbd')]}>空白处拖拽</kbd></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const DrawBoard = ({ state, dispatch, navigate: _sdkNavigate, pid }) => {
  const [showHelp, setShowHelp] = useState(false)
  const path = state.router?.path || 'gallery'
  const showTopbar = path === 'gallery' || (path === 'mindmap' && !state.activeMindmapId)

  const navigate = useCallback((p) => dispatch({ type: 'NAV', payload: p }), [dispatch])

  const renderPage = () => {
    switch (path) {
      case 'canvas':
        return <Canvas state={state} dispatch={dispatch} navigate={navigate} />
      case 'mindmap':
        return <Mindmap state={state} dispatch={dispatch} navigate={navigate} />
      case 'gallery':
      default:
        return <Gallery state={state} dispatch={dispatch} navigate={navigate} />
    }
  }

  return (
    <div className={style[bem.b()]}>
      {showTopbar && (
        <div className={style[bem.e('topbar')]}>
          <div className={style[bem.e('brand')]}>
            <svg className={style[bem.e('brand-svg')]} viewBox="0 0 28 28" fill="none">
              <path d="M5 24c1-3 3-8 6-10s6-1 7 1c1 2-1 5-4 6s-7 1-9 3z" fill="#a5d8ff" stroke="#1b1b1f" strokeWidth="1.5" strokeLinejoin="round" />
              <path d="M18 5c2-1 5 0 6 2s0 5-2 6" stroke="#6965db" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              <path d="M21 2c3-1 6 1 7 4" stroke="#6965db" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.5" />
              <circle cx="9" cy="16" r="1.2" fill="#1b1b1f" opacity="0.3" />
            </svg>
            SukinDraw
          </div>
          <div className={style[bem.e('nav')]}>
            <button
              className={[style[bem.e('nav-btn')], path === 'gallery' ? style[bem.is('active', true)] : ''].filter(Boolean).join(' ')}
              onClick={() => navigate('gallery')}
            >
              全部画板
            </button>
            <button
              className={[style[bem.e('nav-btn')], path === 'mindmap' ? style[bem.is('active', true)] : ''].filter(Boolean).join(' ')}
              onClick={() => navigate('mindmap')}
            >
              思维导图
            </button>
            <div style={{width: '1px', height: '16px', background: '#dee2e6', margin: '0 8px'}}></div>
            <button
              className={style[bem.e('nav-btn')]}
              onClick={() => setShowHelp(true)}
              style={{color: '#6965db', display: 'flex', alignItems: 'center', gap: '4px'}}
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/></svg>
              快捷键说明
            </button>
          </div>
        </div>
      )}
      <div className={style[bem.e('body')]}>
        {renderPage()}
      </div>
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
    </div>
  )
}

export default React.memo(DrawBoard)
