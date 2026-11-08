import ContextMenu from "@/component/contextMenu/layout"
import Shortcut from "../shortcut/layout"
import { ENV_KEY_META_INFO, ENV_KEY_NAME, SUKIN_EXT, SUKIN_PRE } from "@/sukinos/utils/config"
import { createNamespace } from '/utils/js/classcreate'
import style from "../style.module.css"

const bem = createNamespace('deskbook')

// 空格子也保留，作为拖放目标
function DesktopGrid({
  apps, displayPositions, gridSize, dragOverCell, isTouch, shortcutMenus,
  onStartApp, onDragStart, onDragOver, onDragLeave, onDrop
}) {
  const shortcuts = apps.filter(item => item?.[ENV_KEY_META_INFO]?.custom?.hasShortcut);
  const posToAppMap = {};
  Object.keys(displayPositions).forEach(pid => {
    posToAppMap[displayPositions[pid]] = shortcuts.find(app => app.pid === pid);
  });

  const cells = [];
  for (let r = 0; r < gridSize.rows; r++) {
    for (let c = 0; c < gridSize.cols; c++) {
      const posKey = `${r}-${c}`;
      const app = posToAppMap[posKey];
      const isHovered = dragOverCell === posKey;
      cells.push(
        <div
          key={posKey}
          className={[style[bem.e('grid-cell')], style[bem.is('grid-cell-hover', isHovered)]].join(' ')}
          style={{ gridArea: `${r + 1} / ${c + 1} / span 1 / span 1` }}
          onDragOver={(e) => onDragOver(e, r, c)}
          onDragLeave={onDragLeave}
          onDrop={(e) => onDrop(e, r, c)}
        >
          {app && (
            <div
              draggable={!isTouch}
              onDragStart={(e) => onDragStart(e, app.pid)}
              onClick={() => onStartApp(app.pid)}
              className={style[bem.e('shortcut-container')]}
            >
              <ContextMenu menuItems={shortcutMenus} metaInfo={app}>
                <Shortcut app={{
                  label: app?.[ENV_KEY_NAME]?.replace(SUKIN_EXT, '')?.replace(SUKIN_PRE, ''),
                  ...app
                }} />
              </ContextMenu>
            </div>
          )}
        </div>
      );
    }
  }
  return cells;
}

export default DesktopGrid
