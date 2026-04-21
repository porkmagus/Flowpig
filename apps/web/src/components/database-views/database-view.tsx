import { useState } from 'react';
import { 
  Table, 
  Calendar, 
  LayoutGrid, 
  Clock, 
  List,
  ChevronDown,
  Settings,
  Plus,
  Search
} from 'lucide-react';
import { CalendarView } from './calendar-view';
import { TimelineView } from './timeline-view';
import { GalleryView } from './gallery-view';

export type DatabaseViewType = 'table' | 'board' | 'list' | 'calendar' | 'timeline' | 'gallery';

interface DatabaseViewProps {
  view: {
    id: string;
    name: string;
    type: DatabaseViewType;
    config?: {
      datePropertyId?: string;
      startDatePropertyId?: string;
      endDatePropertyId?: string;
      titlePropertyId?: string;
      imagePropertyId?: string;
      visibleProperties?: string[];
      groupBy?: string;
      sortBy?: string;
      filters?: any[];
    };
  };
  database: {
    id: string;
    name: string;
    properties: Array<{
      id: string;
      name: string;
      type: string;
      config?: any;
    }>;
    rows: Array<{
      id: string;
      cells: Record<string, any>;
    }>;
  };
  onRowClick?: (rowId: string) => void;
  onAddRow?: () => void;
  onViewChange?: (viewType: DatabaseViewType) => void;
}

const viewIcons: Record<DatabaseViewType, React.ElementType> = {
  table: Table,
  board: LayoutGrid,
  list: List,
  calendar: Calendar,
  timeline: Clock,
  gallery: LayoutGrid,
};

const viewLabels: Record<DatabaseViewType, string> = {
  table: 'Table',
  board: 'Board',
  list: 'List',
  calendar: 'Calendar',
  timeline: 'Timeline',
  gallery: 'Gallery',
};

export function DatabaseView({ 
  view, 
  database, 
  onRowClick, 
  onAddRow,
  onViewChange 
}: DatabaseViewProps) {
  const [showViewMenu, setShowViewMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter rows based on search
  const filteredRows = database.rows.filter(row => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return Object.values(row.cells).some(value => {
      if (value === null || value === undefined) return false;
      return String(value).toLowerCase().includes(searchLower);
    });
  });

  const renderView = () => {
    const config = view.config || {};
    
    switch (view.type) {
      case 'calendar':
        if (!config.datePropertyId) {
          return (
            <div className="flex items-center justify-center h-64 text-linear-text-secondary">
              Please configure a date property for calendar view
            </div>
          );
        }
        return (
          <CalendarView
            rows={filteredRows}
            properties={database.properties}
            datePropertyId={config.datePropertyId}
            titlePropertyId={config.titlePropertyId || database.properties[0]?.id}
            onRowClick={onRowClick}
            onAddClick={onAddRow ? (date) => onAddRow() : undefined}
          />
        );
      
      case 'timeline':
        if (!config.startDatePropertyId) {
          return (
            <div className="flex items-center justify-center h-64 text-linear-text-secondary">
              Please configure start and end date properties for timeline view
            </div>
          );
        }
        return (
          <TimelineView
            rows={filteredRows}
            properties={database.properties}
            startDatePropertyId={config.startDatePropertyId}
            endDatePropertyId={config.endDatePropertyId}
            titlePropertyId={config.titlePropertyId || database.properties[0]?.id}
            onRowClick={onRowClick}
          />
        );
      
      case 'gallery':
        return (
          <GalleryView
            rows={filteredRows}
            properties={database.properties}
            titlePropertyId={config.titlePropertyId || database.properties[0]?.id}
            imagePropertyId={config.imagePropertyId}
            visibleProperties={config.visibleProperties || database.properties.map(p => p.id)}
            onRowClick={onRowClick}
            onAddClick={onAddRow}
          />
        );
      
      case 'table':
      case 'list':
      default:
        // Use existing table view
        return (
          <div className="h-full overflow-auto">
            <table className="w-full">
              <thead className="bg-linear-surface sticky top-0">
                <tr>
                  {database.properties.map(prop => (
                    <th 
                      key={prop.id}
                      className="px-4 py-3 text-left text-xs font-medium text-linear-text-secondary uppercase tracking-wider border-b border-linear-border"
                    >
                      {prop.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-linear-border/50">
                {filteredRows.map(row => (
                  <tr 
                    key={row.id}
                    onClick={() => onRowClick?.(row.id)}
                    className="hover:bg-linear-surface cursor-pointer"
                  >
                    {database.properties.map(prop => {
                      const value = row.cells[prop.id];
                      
                      return (
                        <td 
                          key={prop.id}
                          className="px-4 py-3 text-sm text-linear-text"
                        >
                          {formatCellValue(value, prop)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
    }
  };

  const formatCellValue = (value: any, property: any) => {
    if (value === null || value === undefined) {
      return <span className="text-linear-text-tertiary">-</span>;
    }

    switch (property.type) {
      case 'SELECT':
        const option = property.config?.options?.find((o: any) => o.id === value);
        if (option) {
          return (
            <span 
              className="px-2 py-1 rounded text-xs font-medium"
              style={{ 
                backgroundColor: `${option.color}20`,
                color: option.color
              }}
            >
              {option.name}
            </span>
          );
        }
        return value;
      
      case 'MULTI_SELECT':
        if (!Array.isArray(value)) return null;
        return (
          <div className="flex flex-wrap gap-1">
            {value.map((v: string, idx: number) => {
              const opt = property.config?.options?.find((o: any) => o.id === v);
              return opt ? (
                <span 
                  key={idx}
                  className="px-2 py-0.5 rounded text-xs"
                  style={{ 
                    backgroundColor: `${opt.color}20`,
                    color: opt.color
                  }}
                >
                  {opt.name}
                </span>
              ) : v;
            })}
          </div>
        );
      
      case 'CHECKBOX':
        return value ? '✓' : '-';
      
      case 'DATE':
        return new Date(value).toLocaleDateString();
      
      case 'URL':
        return (
          <a 
            href={value} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-linear-accent hover:underline"
            onClick={e => e.stopPropagation()}
          >
            {value}
          </a>
        );
      
      default:
        return String(value);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* View Toolbar */}
      <div className="flex items-center justify-between p-4 border-b border-linear-border bg-linear-elevated">
        <div className="flex items-center gap-4">
          {/* View Switcher */}
          <div className="relative">
            <button
              onClick={() => setShowViewMenu(!showViewMenu)}
              className="flex items-center gap-2 px-3 py-1.5 bg-linear-surface hover:bg-linear-border rounded-md text-sm font-medium text-linear-text transition-colors"
            >
              {(() => {
                const Icon = viewIcons[view.type];
                return <Icon className="w-4 h-4" />;
              })()}
              <span>{viewLabels[view.type]}</span>
              <ChevronDown className="w-4 h-4" />
            </button>

            {showViewMenu && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-linear-elevated border border-linear-border rounded-md shadow-elevation-2 z-50 py-1">
                {(Object.keys(viewLabels) as DatabaseViewType[]).map((viewType) => {
                  const Icon = viewIcons[viewType];
                  return (
                    <button
                      key={viewType}
                      onClick={() => {
                        onViewChange?.(viewType);
                        setShowViewMenu(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-linear-surface ${
                        view.type === viewType ? 'bg-linear-accent-light text-linear-accent' : 'text-linear-text'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {viewLabels[viewType]}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-linear-text-tertiary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="pl-9 pr-4 py-1.5 bg-linear-surface rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-linear-accent w-48"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View Settings */}
          <button className="p-2 hover:bg-linear-surface rounded-md transition-colors text-linear-text-secondary">
            <Settings className="w-4 h-4" />
          </button>

          {/* Add Button */}
          {onAddRow && (
            <button
              onClick={onAddRow}
              className="flex items-center gap-2 px-3 py-1.5 bg-linear-accent text-white rounded-md text-sm font-medium hover:bg-linear-accent-hover transition-colors"
            >
              <Plus className="w-4 h-4" />
              New
            </button>
          )}
        </div>
      </div>

      {/* View Content */}
      <div className="flex-1 overflow-hidden">
        {renderView()}
      </div>
    </div>
  );
}
