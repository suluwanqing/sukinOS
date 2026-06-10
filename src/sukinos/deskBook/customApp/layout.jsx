import React, { useState, useEffect, useRef } from 'react'
import style from "./style.module.css"
import { createNamespace } from '/utils/js/classcreate'
import { appCustomMapper, appCustom } from "@/sukinos/utils/config"
import useFileKernel from '@/sukinos/hooks/useFileKernel'
import { dataToBase64Mapper } from "/utils/js/func/data/exChangeBase64"
import { confirm } from '@/component/confirm/layout'

import CloseIcon from '@mui/icons-material/Close'
import FileUploadIcon from '@mui/icons-material/FileUpload'
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary'

const bem = createNamespace('customapp')

const DEFAULT_CUSTOM_FALLBACK = {
  hideHeaderHover: false,
  hasShortcut: true
}

const localAppCustomMapper = {
  ...appCustomMapper,
  hideHeaderHover: '无悬浮时隐藏标题栏'
}

const CustomCheckIcon = () => (
  <svg
    viewBox="0 0 24 24"
    width="16"
    height="16"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

const CustomDeleteIcon = () => (
  <svg
    viewBox="0 0 24 24"
    width="14"
    height="14"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </svg>
)

function CustomApp({ initialCustom = {}, onUpdateConfig, onClose, editingAppName }) {
  const [config, setConfig] = useState({
    ...appCustom,
    ...DEFAULT_CUSTOM_FALLBACK,
    icon: '',
    ...initialCustom
  })
  const { images, readFile, writeFile, deleteFile } = useFileKernel('root')
  const [iconPreview, setIconPreview] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef(null)

  const isDirectResource = (str) => {
    if (!str || typeof str !== 'string') return false;
    return str.startsWith('http') || str.startsWith('/') || str.startsWith('data:');
  };

  useEffect(() => {
    const loadPreview = async () => {
      const icon = config.icon;
      if (!icon) return setIconPreview(null);

      if (isDirectResource(icon)) {
        setIconPreview(icon);
      } else {
        const data = await readFile(icon);
        setIconPreview(data);
      }
    };
    loadPreview();
  }, [config.icon, readFile]);

  const update = (newConfig) => {
    setConfig(newConfig)
    if (onUpdateConfig) onUpdateConfig(newConfig)
  }

  const handleToggle = (key) => update({ ...config, [key]: !config[key] })

  const handleLocalUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploading(true)

    try {
      const buffer = await file.arrayBuffer()
      const pureBase64 = await dataToBase64Mapper(buffer, 'Image')
      const finalContent = `data:${file.type};base64,${pureBase64}`

      const fileName = `icon_${Date.now()}_${file.name}`;
      const newNode = await writeFile(fileName, finalContent)

      if (newNode && newNode.id) {
        update({ ...config, icon: newNode.id })
      }
    } catch (err) {
      // 异常处理
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDeleteClick = (e, fileId) => {
    e.stopPropagation()
    confirm.show({
      title: '确认删除',
      content: '您确定要从资源库中删除这张图标吗？删除后将无法恢复。',
      onConfirm: () => {
        deleteFile(fileId)
      }
    })
  }

  return (
    <div className={style[bem.b()]}>
      <div className={style[bem.e('modal')]}>
        <div className={style[bem.e('header')]}>
          <span className={style[bem.e('header-title')]}>设置: {editingAppName || '应用详情'}</span>
          <button className={style[bem.e('close-btn')]} onClick={onClose}><CloseIcon fontSize="small" /></button>
        </div>

        <div className={style[bem.e('content')]}>
          <div className={style[bem.e('left')]}>
            <div className={style[bem.e('pane-label')]}>PREFERENCES / 偏好设置</div>
            <div className={style[bem.e('config-list')]}>
              {Object.entries(localAppCustomMapper).map(([key, label]) => (
                <div key={key} className={style[bem.e('config-item')]} onClick={() => handleToggle(key)}>
                  <span className={style[bem.e('config-name')]}>{label}</span>
                  <div className={`${style[bem.e('toggle')]} ${config[key] ? style[bem.is('active', true)] : ''}`}>
                    <div className={style[bem.e('toggle-knob')]} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={style[bem.e('right')]}>
            <div className={style[bem.e('pane-label')]}>VISUAL IDENTITY / 视觉识别</div>
            <div className={style[bem.e('identity-box')]}>
              <div className={style[bem.e('preview-wrapper')]}>
                <div className={style[bem.e('icon-preview')]}>
                  {iconPreview ? <img src={iconPreview} alt="Icon" /> : <div className={style[bem.e('none-img')]} />}
                </div>
                <div className={style[bem.e('preview-info')]}>
                  <div className={style[bem.e('icon-title')]}>应用当前图标</div>
                  <button className={style[bem.e('upload-trigger')]} onClick={() => fileInputRef.current?.click()}>
                    <FileUploadIcon fontSize="inherit" style={{marginRight: 6}} />
                    <span>{isUploading ? '正在处理...' : '上传本地图片'}</span>
                  </button>
                  <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*" onChange={handleLocalUpload} />
                </div>
              </div>

              <div className={style[bem.e('gallery-section')]}>
                <div className={style[bem.e('gallery-head')]}>
                  <PhotoLibraryIcon fontSize="inherit" style={{marginRight: 6}} />
                  资源库 ({images.length})
                </div>
                <div className={style[bem.e('grid')]}>
                  {images.map(img => (
                    <div
                      key={img.id}
                      className={`${style[bem.e('grid-item')]} ${config.icon === img.id ? style[bem.is('selected', true)] : ''}`}
                      onClick={() => {
                        update({ ...config, icon: img.id });
                      }}
                    >
                      <Thumb fileId={img.id} readFile={readFile} />
                      <div className={style[bem.e('grid-mask')]}>
                        <div className={style[bem.e('check')]}>
                          <CustomCheckIcon />
                        </div>
                        <div className={style[bem.e('del')]} onClick={(e) => handleDeleteClick(e, img.id)}>
                          <CustomDeleteIcon />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const Thumb = ({ fileId, readFile }) => {
  const [s, setS] = useState(null)
  useEffect(() => { readFile(fileId).then(setS) }, [fileId, readFile])
  return s ? <img src={s} alt="" /> : <div className={style[bem.e('skeleton')]} />
}

export default CustomApp
