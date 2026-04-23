import React from 'react';
import style from "./style.module.css";
import { createNamespace } from '/utils/js/classcreate';
import KeyboardIcon from '@mui/icons-material/Keyboard';

const bem = createNamespace('setting-shortcuts');

const Shortcuts = () => {
  const SHORTCUT_LIST = [
    { key: "Ctrl + Alt + C", desc: "唤醒 / 隐藏 窗口调度中心" },
    { key: "Alt + C", desc: "调度中心：循环切换当前活跃应用" },
    { key: "Ctrl + Alt + O", desc: "任务栏：切换显示模式 (Dock/Bar)" },
    { key: "Ctrl + S", desc: "编辑器：快速保存当前文档内容" },
    { key: "Enter", desc: "确认选择 或 执行指令" },
    { key: "Esc", desc: "取消当前视图 或 退出模式" }
  ];

  return (
    <div className={style[bem.b()]}>
      <div className={style[bem.e('section')]}>
        <div className={style[bem.e('section-title')]}>
          <KeyboardIcon style={{ fontSize: 18, marginRight: 8 }} /> 快捷键指南
        </div>
        <div className={style[bem.e('card')]}>
          <div className={style[bem.e('list')]}>
            {SHORTCUT_LIST.map((item, index) => (
              <div key={index} className={style[bem.e('list-item')]}>
                <span className={style[bem.e('description')]}>{item.desc}</span>
                <div className={style[bem.e('key-group')]}>
                  {item.key.split(' + ').map((k, i) => (
                    <React.Fragment key={i}>
                      <kbd className={style[bem.e('kbd')]}>{k}</kbd>
                      {i < item.key.split(' + ').length - 1 && (
                        <span className={style[bem.e('plus')]}>+</span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className={style[bem.e('divider')]}></div>
          <p className={style[bem.e('footer-text')]}>
            注意：组合键在物理键盘按下时生效，部分键位可能受浏览器快捷键冲突影响。
          </p>
        </div>
      </div>
    </div>
  );
};

export default Shortcuts;
