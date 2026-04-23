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
import { createNamespace } from '/utils/js/classcreate';
import style from './style.module.css';

const bem = createNamespace('date-goole');

export const DateGoogle = ({ onDateChange, className:classname='',initialDate = new Date() }) => {
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
      <div className={style[bem.e('header')]}>
        <div className={style[bem.e('month-selector')]}>
          <span className={style[bem.e('current-month')]}>
            {format(currentMonth, 'yyyy年MM月', { locale: zhCN })}
          </span>
          <div className={style[bem.e('actions')]}>
            <button className={style[bem.e('nav-btn')]} onClick={handlePrevMonth}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
            </button>
            <button className={style[bem.e('nav-btn')]} onClick={handleNextMonth}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </button>
          </div>
        </div>
        {!isToday(selectedDate) && (
          <button className={style[bem.e('today-btn')]} onClick={handleBackToToday}>
            回到今天
          </button>
        )}
      </div>
    );
  };

  const renderDays = () => {
    const weekDays = ['一', '二', '三', '四', '五', '六', '日'];
    return (
      <div className={style[bem.e('weekdays')]}>
        {weekDays.map(day => (
          <span key={day} className={style[bem.e('weekday')]}>{day}</span>
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
      <div className={style[bem.e('grid')]}>
        {dayList.map((dayItem) => {
          const formattedDate = format(dayItem, 'd');
          const isSelected = isSameDay(dayItem, selectedDate);
          const isCurrentMonth = isSameMonth(dayItem, monthStart);
          const isDayToday = isToday(dayItem);

          let classNames = style[bem.e('cell')];
          if (!isCurrentMonth) classNames += ` ${style[bem.em('cell', 'disabled')]}`;
          if (isSelected) classNames += ` ${style[bem.em('cell', 'selected')]}`;
          if (isDayToday) classNames += ` ${style[bem.em('cell', 'today')]}`;

          return (
            <div
              className={classNames}
              key={dayItem.toString()}
              onClick={() => handleDateClick(dayItem)}
            >
              <span className={style[bem.e('day-number')]}>{formattedDate}</span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className={[style[bem.b()],'su-glass',classname].join(' ')}>
      <div className={style[bem.e('container')]}>
        {renderHeader()}
        {renderDays()}
        {renderCells()}
      </div>
    </div>
  );
};

export default DateGoogle;
