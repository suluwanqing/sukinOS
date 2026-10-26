import { useState, useEffect } from 'react';
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday
} from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const navButtonCls = 'flex size-8 cursor-pointer items-center justify-center rounded-full border-none bg-transparent text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none';

const dayCellCls = 'relative mx-auto flex aspect-square w-full max-w-[48px] cursor-pointer items-center justify-center rounded-md border text-[15px] transition-[background-color,border-color,color] duration-200 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none';
const dayCellHover = 'hover:bg-accent hover:text-accent-foreground';
const dayTone = ({ inMonth, isToday, selected }) => {
  if (!inMonth) return 'border-transparent bg-transparent text-muted-foreground/40';
  if (selected)
    return 'border-transparent bg-primary font-semibold text-primary-foreground shadow-sm';
  if (isToday) return `border-border bg-accent font-bold text-accent-foreground ${dayCellHover}`;
  return `border-transparent ${dayCellHover} text-foreground`;
};

export const DateGoogle = ({ onDateChange, className: classname = '', initialDate = new Date() }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(initialDate);

  useEffect(() => {
    if (onDateChange) {
      onDateChange(selectedDate);
    }
  }, [selectedDate, onDateChange]);

  const handlePrevMonth = () => {
    setCurrentMonth(prev => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => addMonths(prev, 1));
  };

  const handleDateClick = (date) => {
    setSelectedDate(date);
    if (!isSameMonth(date, currentMonth)) {
      setCurrentMonth(date);
    }
  };

  const handleBackToToday = () => {
    const today = new Date();
    setSelectedDate(today);
    setCurrentMonth(today);
  };

  const renderHeader = () => {
    return (
      <div className="mb-5 flex flex-shrink-0 items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold tracking-[-0.5px] text-foreground">
            {format(currentMonth, 'yyyy年MM月', { locale: zhCN })}
          </span>
          <div className="ml-1 flex items-center gap-0.5">
            <button type="button" aria-label="上一月" className={navButtonCls} onClick={handlePrevMonth}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
            </button>
            <button type="button" aria-label="下一月" className={navButtonCls} onClick={handleNextMonth}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </button>
          </div>
        </div>
        {!isToday(selectedDate) && (
          <button
            type="button"
            className="cursor-pointer rounded-md border border-input bg-background px-3.5 py-1.5 text-[13px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
            onClick={handleBackToToday}
          >
            回到今天
          </button>
        )}
      </div>
    );
  };

  const renderDays = () => {
    const weekDays = ['一', '二', '三', '四', '五', '六', '日'];
    return (
      <div className="mb-3 grid flex-shrink-0 grid-cols-7" role="row">
        {weekDays.map(day => (
          <span key={day} role="columnheader" className="py-2 text-center text-[13px] font-semibold text-muted-foreground">{day}</span>
        ))}
      </div>
    );
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const dayList = eachDayOfInterval({ start: startDate, end: endDate });

    return (
      <div className="grid grow auto-rows-fr grid-cols-7 gap-2" role="grid" aria-label="日期选择">
        {dayList.map((dayItem) => {
          const formattedDate = format(dayItem, 'd');
          const isSelected = isSameDay(dayItem, selectedDate);
          const isCurrentMonth = isSameMonth(dayItem, monthStart);
          const isDayToday = isToday(dayItem);

          return (
            <div
              className={cn(dayCellCls, dayTone({ inMonth: isCurrentMonth, isToday: isDayToday, selected: isSelected }))}
              key={dayItem.toString()}
              role="gridcell"
              aria-selected={isSelected ? 'true' : undefined}
              aria-current={isDayToday ? 'date' : undefined}
              aria-label={format(dayItem, 'yyyy年M月d日')}
              onClick={() => handleDateClick(dayItem)}
            >
              <span className="relative z-[2]">{formattedDate}</span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className={cn('relative flex h-full w-full items-center justify-center', classname)}>
      <div className="flex h-full w-full min-h-[380px] min-w-[320px] select-none flex-col rounded-lg border border-border bg-popover p-6 text-popover-foreground shadow-lg">
        {renderHeader()}
        {renderDays()}
        {renderCells()}
      </div>
    </div>
  );
};

export default DateGoogle;
