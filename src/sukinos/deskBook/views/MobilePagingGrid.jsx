import ContextMenu from "@/component/contextMenu/layout"
import Shortcut from "../shortcut/layout"
import { ENV_KEY_META_INFO, ENV_KEY_NAME, SUKIN_EXT, SUKIN_PRE } from "@/sukinos/utils/config"
import { MOBILE_CELL_SIZE } from "../constants"
import { createNamespace } from '/utils/js/classcreate'
import style from "../style.module.css"

const bem = createNamespace('deskbook')

function MobilePagingGrid({ apps, displayPositions, gridSize, shortcutMenus, mobileWallpaperScroll, onStartApp }) {
  if (gridSize.rows === 0 || gridSize.cols === 0) return null;

  const shortcuts = apps.filter(item => item?.[ENV_KEY_META_INFO]?.custom?.hasShortcut);
  const posToAppMap = {};
  let maxRow = 0;
  Object.keys(displayPositions).forEach(pid => {
    const pos = displayPositions[pid];
    posToAppMap[pos] = shortcuts.find(a => a.pid === pid);
    const r = parseInt(pos.split('-')[0]);
    if (r > maxRow) maxRow = r;
  });

  const totalPages = Math.max(1, Math.floor(maxRow / gridSize.rows) + 1);
  const pages = [];

  for (let p = 0; p < totalPages; p++) {
    const cells = [];
    for (let r = 0; r < gridSize.rows; r++) {
      for (let c = 0; c < gridSize.cols; c++) {
        const globalRow = p * gridSize.rows + r;
        const posKey = `${globalRow}-${c}`;
        const app = posToAppMap[posKey];
        cells.push(
          <div key={posKey} className={style[bem.e('grid-cell')]}>
            {app && (
              <div
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

    pages.push(
      <div
        key={`page-${p}`}
        className={style[bem.e('mobile-page')]}
        style={{
          flex: '0 0 100%',
          scrollSnapAlign: 'start',
          display: 'grid',
          gridTemplateColumns: `repeat(${gridSize.cols}, 1fr)`,
          gridTemplateRows: `repeat(${gridSize.rows}, ${MOBILE_CELL_SIZE}px)`,
          alignContent: 'start',
        }}
      >
        {cells}
      </div>
    );
  }

  // 翻页进度交给壁纸层做视差位移
  const handleScroll = (e) => {
    if (!mobileWallpaperScroll) return;
    const el = e.currentTarget;
    const maxScrollLeft = el.scrollWidth - el.clientWidth;
    let ratio = 50;
    if (maxScrollLeft > 0) {
      ratio = (el.scrollLeft / maxScrollLeft) * 100;
    }
    const osRoot = document.getElementById('sukin-os');
    if (osRoot) {
      osRoot.style.setProperty('--su-os-bg-scroll-ratio', `${ratio}%`);
    }
  };

  return (
    <div
      className={style[bem.e('mobile-pages-container')]}
      onScroll={handleScroll}
      style={{
        display: 'flex',
        overflowX: 'auto',
        scrollSnapType: 'x mandatory',
        width: '100%',
        height: '100%',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        gridColumn: '1 / -1',
        gridRow: '1 / -1'
      }}
    >
      <style>{`.${style[bem.e('mobile-pages-container')]}::-webkit-scrollbar { display: none; }`}</style>
      {pages}
    </div>
  );
}

export default MobilePagingGrid
