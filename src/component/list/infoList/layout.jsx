import { useState } from 'react';
import { createNamespace } from '/utils/js/classcreate';
import style from './style.module.css';

const bem = createNamespace('infolist');

export const InfoList=({
  menuData = [],
  onItemClick = () => {},
  onMouseLeave = () => {},
  style: customStyle = {},
})=>{
  const [activeIndex, setActiveIndex] = useState(() => {
    const initialIndex = menuData.findIndex(item => item.nav.active);
    return initialIndex !== -1 ? initialIndex : 0;
  });

  const handleLeftNavClick = (index) => {
    setActiveIndex(index);
  };

  const handleContentItemClick = (item) => {
    onItemClick(item);
  };

  const leftNavItems = menuData.map(item => item.nav);
  const activeRightContent = menuData[activeIndex]?.content;

  return (
    <div
      className={style[bem.b()]}
      style={{ ...customStyle }}
      onMouseLeave={onMouseLeave}
    >
      <div className={style[bem.e('left')]}>
        {leftNavItems.map((item, index) => (
          <div
            key={index}
            onClick={() => handleLeftNavClick(index)}
            className={`${style[bem.e('left-item')]} ${index === activeIndex ? style[bem.is('active', true)] : ''}`}
          >
            {item.text}
            {item.hot && <span className={`${style[bem.e('badge')]} ${style[bem.em('badge', 'hot')]}`}>HOT</span>}
          </div>
        ))}
      </div>
      <div className={style[bem.e('right')]}>
        {activeRightContent && activeRightContent.map((group, groupIndex) => (
          <div key={groupIndex} className={style[bem.e('group')]}>
            <div className={style[bem.e('group-title')]}>{group.title}</div>
            {group.items.map((item, itemIndex) => (
              <div
                key={itemIndex}
                onClick={() => handleContentItemClick(item)}
                className={item.sub ? style[bem.e('sub-item')] : style[bem.e('group-item')]}
              >
                {item.text}
                {item.isNew && <span className={`${style[bem.e('badge')]} ${style[bem.em('badge', 'new')]}`}>NEW</span>}
              </div>
            ))}
            {group.subGroup && (
              <>
                <div className={`${style[bem.e('group-title')]} ${style[bem.em('group-title', 'sub')]}`}>{group.subGroup.title}</div>
                {group.subGroup.items.map((item, subItemIndex) => (
                  <div
                    key={subItemIndex}
                    onClick={() => handleContentItemClick(item)}
                    className={item.sub ? style[bem.e('sub-item')] : style[bem.e('group-item')]}
                  >
                    {item.text}
                  </div>
                ))}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default InfoList;
