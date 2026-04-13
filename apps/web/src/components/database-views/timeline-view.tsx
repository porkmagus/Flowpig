import { useState, useMemo, useRef, useEffect } from 'react';
import { format, addDays, startOfWeek, differenceInDays, isSameDay, isWithinInterval } from 'date-fns';
import { ChevronLeft, ChevronRight, GripVertical } from 'lucide-react';

interface TimelineViewProps {
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
  startDatePropertyId: string;
  endDatePropertyId?: string;
  titlePropertyId: string;
  onRowClick?: (rowId: string) => void;
}

const DAY_WIDTH = 60;
const HEADER_HEIGHT = 50;
const ROW_HEIGHT = 48;
const SIDEBAR_WIDTH = 200;

export function TimelineView({
  rows,
  properties,
  startDatePropertyId,
  endDatePropertyId,
  titlePropertyId,
  onRowClick,
}: TimelineViewProps) {
  const [startDate, setStartDate] = useState(() => startOfWeek(new Date()));
  const [scrollLeft, setScrollLeft] = useState(0);
  const timelineRef = useRef<HTMLDivElement>(null);

  const getCellValue = (row: any, propertyId: string) => {
    const cell = row.cells.find((c: any) => c.propertyId === propertyId);
    return cell?.value;
  };

  // Show 4 weeks of data
  const daysToShow = 28;
  const days = useMemo(() => {
    const days: Date[] = [];
    for (let i = 0; i < daysToShow; i++) {
      days.push(addDays(startDate, i));
    }
    return days;
  }, [startDate]);

  const timelineWidth = daysToShow * DAY_WIDTH;

  // Filter rows with dates
  const datedRows = useMemo(() => {
    return rows.filter(row => {
      const startValue = getCellValue(row, startDatePropertyId);
      return startValue && !isNaN(new Date(startValue).getTime());
    });
  }, [rows, startDatePropertyId]);

  const navigateWeeks = (direction: number) => {
    setStartDate(addDays(startDate, direction * 7));
  };

  return (
    <div className="h-full flex flex-col bg-linear-elevated rounded-md border border-linear-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-linear-border bg-linear-surface">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-medium text-linear-text">Timeline</h3>
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigateWeeks(-1)}
              className="p-1.5 hover:bg-linear-border rounded-md transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-linear-text-secondary" />
            </button>
            <span className="text-sm text-linear-text-secondary min-w-35 text-center">
              {format(startDate, 'MMM d')} - {format(addDays(startDate, 27), 'MMM d, yyyy')}
            </span>
            <button
              onClick={() => navigateWeeks(1)}
              className="p-1.5 hover:bg-linear-border rounded-md transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-linear-text-secondary" />
            </button>
          </div>
        </div>
        <button
          onClick={() => setStartDate(startOfWeek(new Date()))}
          className="px-3 py-1.5 text-sm text-linear-text-secondary hover:bg-linear-border rounded-md transition-colors"
        >
          Today
        </button>
      </div>

      {/* Timeline Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Row titles */}
        <div 
          className="shrink-0 border-r border-linear-border bg-linear-surface"
          style={{ width: SIDEBAR_WIDTH }}
        >
          <div style={{ height: HEADER_HEIGHT }} className="border-b border-linear-border" />
          <div className="overflow-hidden">
            {datedRows.map((row) => (
              <div
                key={row.id}
                className="flex items-center gap-2 px-3 border-b border-linear-border/50 hover:bg-linear-surface cursor-pointer"
                style={{ height: ROW_HEIGHT }}
                onClick={() => onRowClick?.(row.id)}
              >
                <GripVertical className="w-4 h-4 text-linear-text-tertiary shrink-0" />
                <span className="text-sm text-linear-text truncate">
                  {getCellValue(row, titlePropertyId) || 'Untitled'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline */}
        <div 
          ref={timelineRef}
          className="flex-1 overflow-auto"
          onScroll={(e) => setScrollLeft(e.currentTarget.scrollLeft)}
        >
          <div style={{ width: timelineWidth }}>
            {/* Day Headers */}
            <div 
              className="flex border-b border-linear-border bg-linear-surface sticky top-0"
              style={{ height: HEADER_HEIGHT }}
            >
              {days.map((date, index) => (
                <div
                  key={date.toISOString()}
                  className={`
                    shrink-0 border-r border-linear-border flex flex-col items-center justify-center
                    ${isSameDay(date, new Date()) ? 'bg-linear-accent-light' : ''}
                    ${date.getDay() === 0 || date.getDay() === 6 ? 'bg-linear-surface' : ''}
                  `}
                  style={{ width: DAY_WIDTH }}
                >
                  <span className="text-xs text-linear-text-secondary">{format(date, 'EEE')}</span>
                  <span className={`
                    text-sm font-medium
                    ${isSameDay(date, new Date()) ? 'text-linear-accent' : 'text-linear-text'}
                  `}>
                    {format(date, 'd')}
                  </span>
                </div>
              ))}
            </div>

            {/* Timeline Grid & Bars */}
            <div className="relative">
              {/* Grid lines */}
              <div className="absolute inset-0 flex">
                {days.map((date) => (
                  <div
                    key={date.toISOString()}
                    className={`
                      shrink-0 border-r border-linear-border/50
                      ${date.getDay() === 0 || date.getDay() === 6 ? 'bg-linear-surface/30' : ''}
                    `}
                    style={{ width: DAY_WIDTH, height: datedRows.length * ROW_HEIGHT }}
                  />
                ))}
              </div>

              {/* Row bars */}
              {datedRows.map((row, rowIndex) => {
                const startValue = getCellValue(row, startDatePropertyId);
                const endValue = endDatePropertyId 
                  ? getCellValue(row, endDatePropertyId) 
                  : null;
                
                const itemStart = new Date(startValue);
                const itemEnd = endValue ? new Date(endValue) : addDays(itemStart, 1);
                
                // Calculate position
                const daysFromStart = differenceInDays(itemStart, startDate);
                const duration = Math.max(1, differenceInDays(itemEnd, itemStart) + 1);
                
                const left = daysFromStart * DAY_WIDTH + 4;
                const width = duration * DAY_WIDTH - 8;
                const top = rowIndex * ROW_HEIGHT + 8;

                // Skip if outside visible range
                if (daysFromStart + duration < 0 || daysFromStart > daysToShow) {
                  return null;
                }

                const title = getCellValue(row, titlePropertyId) || 'Untitled';

                return (
                  <div
                    key={row.id}
                    className="absolute"
                    style={{
                      left: Math.max(0, left),
                      top,
                      width: Math.max(20, width),
                      height: ROW_HEIGHT - 16,
                    }}
                  >
                    <button
                      onClick={() => onRowClick?.(row.id)}
                      className="w-full h-full px-2 bg-linear-accent hover:bg-linear-accent-hover text-white text-xs rounded-md shadow-sm transition-colors flex items-center"
                    >
                      <span className="truncate">{title}</span>
                    </button>
                  </div>
                );
              })}

              {/* Empty rows for spacing */}
              {datedRows.map((row) => (
                <div
                  key={`spacer-${row.id}`}
                  style={{ height: ROW_HEIGHT }}
                  className="border-b border-linear-border/50"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
