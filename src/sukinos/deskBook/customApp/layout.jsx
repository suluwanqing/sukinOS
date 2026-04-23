import React, { useState, useEffect, useRef } from 'react'
import style from "./style.module.css"
import { createNamespace } from '/utils/js/classcreate'
import { appCustomMapper, appCustom } from "@/sukinos/utils/config"
import useFileKernel from '@/sukinos/hooks/useFileKernel'
import { dataToBase64Mapper } from "/utils/js/func/data/exChangeBase64"

import CloseIcon from '@mui/icons-material/Close'
import CheckIcon from '@mui/icons-material/Check'
import FileUploadIcon from '@mui/icons-material/FileUpload'
import DeleteIcon from '@mui/icons-material/Delete'
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary'

const bem = createNamespace('customapp')

function CustomApp({ initialCustom = {}, onUpdateConfig, onClose, editingAppName }) {
  const [config, setConfig] = useState({ ...appCustom, icon: '', ...initialCustom })
  const { images, readFile, writeFile, deleteFile } = useFileKernel('root')
  const [iconPreview, setIconPreview] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef(null)

  const isDirectResource = (str) => {
    if (!str || typeof str !== 'string') return false;
    return str.startsWith('http') || str.startsWith('/') || str.startsWith('data:');
  };

  // 预览图加载日志
  useEffect(() => {
    const loadPreview = async () => {
      const icon = config.icon;
      if (!icon) return setIconPreview(null);

      // console.log("[CustomApp] 正在更新预览:", icon);
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
    // console.log("[CustomApp] 触发配置更新:", newConfig);
    setConfig(newConfig)
    if (onUpdateConfig) onUpdateConfig(newConfig)
  }

  const handleToggle = (key) => update({ ...config, [key]: !config[key] })

  const handleLocalUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploading(true)
    // console.log("[CustomApp] 开始处理本地上传:", file.name);

    try {
      const buffer = await file.arrayBuffer()
      const pureBase64 = await dataToBase64Mapper(buffer, 'Image')
      const finalContent = `data:${file.type};base64,${pureBase64}`

      const fileName = `icon_${Date.now()}_${file.name}`;
      // console.log("[CustomApp] 准备写入 VFS:", fileName);

      const newNode = await writeFile(fileName, finalContent)

      if (newNode && newNode.id) {
        // console.log("[CustomApp] VFS 写入成功, 新 ID:", newNode.id);
        update({ ...config, icon: newNode.id })
      } else {
        // console.error("[CustomApp] VFS 写入返回空节点");
      }
    } catch (err) {
      // console.error("[CustomApp] 上传/写入过程崩溃:", err);
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
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
              {Object.entries(appCustomMapper).map(([key, label]) => (
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
                        console.log("[CustomApp] 手动切换库图标:", img.id);
                        update({ ...config, icon: img.id });
                      }}
                    >
                      <Thumb fileId={img.id} readFile={readFile} />
                      <div className={style[bem.e('grid-mask')]}>
                        <CheckIcon className={style[bem.e('check')]} />
                        <div className={style[bem.e('del')]} onClick={(e) => { e.stopPropagation(); deleteFile(img.id); }}>
                          <DeleteIcon fontSize="inherit" />
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
