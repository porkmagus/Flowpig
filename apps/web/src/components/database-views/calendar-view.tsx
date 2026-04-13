import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus } from 'lucide-react';

interface CalendarViewProps {
  rows: Array<{
    id: string;
    cells: Array<{
      propertyId: string;
      value: any;
    }>;
  }>;
  properties: Array<{
    id: string;
    name: string;
    type: string;
  }>;
  datePropertyId: string;
  titlePropertyId: string;
  onRowClick?: (rowId: string) => void;
  onAddClick?: (date: Date) => void;
}

export function CalendarView({ 
  rows, 
  properties, 
  datePropertyId, 
  titlePropertyId,
  onRowClick,
  onAddClick 
}: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const getCellValue = (row: any, propertyId: string) => {
    const cell = row.cells.find((c: any) => c.propertyId === propertyId);
    return cell?.value;
  };

  // Filter rows that have a date value
  const datedRows = useMemo(() => {
    return rows.filter(row => {
      const dateValue = getCellValue(row, datePropertyId);
      return dateValue && !isNaN(new Date(dateValue).getTime());
    });
  }, [rows, datePropertyId]);

  // Group rows by date
  const rowsByDate = useMemo(() => {
    const map = new Map<string, typeof rows>();
    datedRows.forEach(row => {
      const dateValue = getCellValue(row, datePropertyId);
      const date = new Date(dateValue);
      const dateKey = format(date, 'yyyy-MM-dd');
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(row);
    });
    return map;
  }, [datedRows, datePropertyId]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const days: Date[] = [];
  let day = calendarStart;
  while (day <= calendarEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="h-full flex flex-col bg-linear-elevated rounded-md border border-linear-border">
      {/* Calendar Header */}
      <div className="flex items-center justify-between p-4 border-b border-linear-border">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold text-linear-text">
            {format(currentMonth, 'MMMM yyyy')}
          </h3>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-1.5 hover:bg-linear-surface rounded-md transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-linear-text-secondary" />
            </button>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-1.5 hover:bg-linear-surface rounded-md transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-linear-text-secondary" />
            </button>
          </div>
        </div>
        <button
          onClick={() => setCurrentMonth(new Date())}
          className="px-3 py-1.5 text-sm text-linear-text-secondary hover:bg-linear-surface rounded-md transition-colors"
        >
          Today
        </button>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 border-b border-linear-border">
        {weekDays.map((weekDay) => (
          <div key={weekDay} className="py-2 text-center text-sm font-medium text-linear-text-secondary">
            {weekDay}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 grid grid-cols-7 auto-rows-fr">
        {days.map((date, index) => {
          const dateKey = format(date, 'yyyy-MM-dd');
          const dayRows = rowsByDate.get(dateKey) || [];
          const isCurrentMonth = isSameMonth(date, currentMonth);
          const isToday = isSameDay(date, new Date());

          return (
            <div
              key={date.toISOString()}
              className={`
                min-h-25 p-2 border-r border-b border-linear-border/50
                ${!isCurrentMonth ? 'bg-linear-surface/30' : 'bg-linear-elevated'}
                ${index % 7 === 6 ? 'border-r-0' : ''}
              `}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`
                  text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full
                  ${isToday ? 'bg-linear-accent text-white' : 'text-linear-text'}
                  ${!isCurrentMonth ? 'text-linear-text-tertiary' : ''}
                `}>
                  {format(date, 'd')}
                </span>
                {isCurrentMonth && onAddClick && (
                  <button
                    onClick={() => onAddClick(date)}
                    className="opacity-0 hover:opacity-100 transition-opacity p-1 hover:bg-linear-surface rounded"
                  >
                    <Plus className="w-3.5 h-3.5 text-linear-text-tertiary" />
                  </button>
                )}
              </div>

              {/* Day's rows */}
              <div className="space-y-1">
                {dayRows.slice(0, 3).map((row) => {
                  const title = getCellValue(row, titlePropertyId) || 'Untitled';
                  return (
                    <button
                      key={row.id}
                      onClick={() => onRowClick?.(row.id)}
                      className="w-full text-left px-2 py-1 text-xs bg-linear-accent-light text-linear-accent rounded hover:bg-linear-accent/20 transition-colors truncate"
                    >
                      {title}
                    </button>
                  );
                })}
                {dayRows.length > 3 && (
                  <div className="text-xs text-linear-text-tertiary px-2">
                    +{dayRows.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
