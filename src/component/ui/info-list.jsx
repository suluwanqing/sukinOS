import { useState } from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const navItemVariants = cva(
  'flex cursor-pointer items-center justify-between px-5 py-2 text-sm transition-colors hover:text-primary max-md:m-0 max-md:flex-none max-md:whitespace-nowrap max-md:rounded-md max-md:bg-muted max-md:px-3 max-md:py-1.5 max-md:text-sm',
  {
    variants: {
      active: { true: 'bg-accent font-bold text-primary', false: '' },
    },
  }
);

const rowVariants = cva(
  'mb-3 flex cursor-pointer items-center text-sm transition-colors hover:text-primary max-md:min-h-7 max-md:text-sm max-md:mb-0',
  {
    variants: {
      tone: { body: 'text-foreground', muted: 'text-muted-foreground' },
    },
    defaultVariants: { tone: 'body' },
  }
);

const badgeCls = 'ml-2 inline-flex items-center justify-center rounded-sm border border-destructive px-1 py-0.5 text-xs leading-none font-normal text-destructive';
const groupTitleCls = 'mb-4 text-base font-bold text-foreground max-md:mb-1 max-md:border-b max-md:border-border max-md:pb-0.5 max-md:text-sm';

export const InfoList = ({
  menuData = [],
  onItemClick = () => {},
  onMouseLeave = () => {},
  className,
  style: customStyle = {},
}) => {
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
      className={cn(
        'flex max-h-screen items-start overflow-y-auto bg-muted text-foreground max-md:max-h-none max-md:flex-col',
        className
      )}
      style={{ ...customStyle }}
      onMouseLeave={onMouseLeave}
    >
      <div className="w-[200px] shrink-0 py-3 max-md:flex max-md:w-full max-md:flex-nowrap max-md:gap-1 max-md:overflow-x-auto max-md:border-b max-md:border-border max-md:p-2">
        {leftNavItems.map((item, index) => (
          <div
            key={index}
            onClick={() => handleLeftNavClick(index)}
            className={navItemVariants({ active: index === activeIndex })}
          >
            {item.text}
            {item.hot && <span className={badgeCls}>HOT</span>}
          </div>
        ))}
      </div>
      <div className="flex w-full grow gap-10 bg-card px-8 py-5 max-md:flex-col max-md:gap-6 max-md:p-4">
        {activeRightContent && activeRightContent.map((group, groupIndex) => (
          <div key={groupIndex} className="flex flex-col max-md:p-0">
            <div className={groupTitleCls}>{group.title}</div>
            {group.items.map((item, itemIndex) => (
              <div
                key={itemIndex}
                onClick={() => handleContentItemClick(item)}
                className={rowVariants({ tone: item.sub ? 'muted' : 'body' })}
              >
                {item.text}
                {item.isNew && <span className={badgeCls}>NEW</span>}
              </div>
            ))}
            {group.subGroup && (
              <>
                <div className={cn(groupTitleCls, 'mt-4')}>{group.subGroup.title}</div>
                {group.subGroup.items.map((item, subItemIndex) => (
                  <div
                    key={subItemIndex}
                    onClick={() => handleContentItemClick(item)}
                    className={rowVariants({ tone: 'muted' })}
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
};

export default InfoList;
