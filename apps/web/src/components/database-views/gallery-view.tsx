import { useState } from 'react';
import { ImageIcon, FileText, MoreHorizontal, Plus } from 'lucide-react';

interface GalleryViewProps {
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
    config?: any;
  }>;
  titlePropertyId: string;
  imagePropertyId?: string;
  visibleProperties: string[];
  onRowClick?: (rowId: string) => void;
  onAddClick?: () => void;
}

export function GalleryView({
  rows,
  properties,
  titlePropertyId,
  imagePropertyId,
  visibleProperties,
  onRowClick,
  onAddClick,
}: GalleryViewProps) {
  const getCellValue = (row: any, propertyId: string) => {
    const cell = row.cells.find((c: any) => c.propertyId === propertyId);
    return cell?.value;
  };

  const getProperty = (propertyId: string) => {
    return properties.find(p => p.id === propertyId);
  };

  const formatPropertyValue = (value: any, property: any) => {
    if (value === null || value === undefined) return null;
    
    switch (property.type) {
      case 'SELECT':
        const option = property.config?.options?.find((o: any) => o.id === value);
        return option ? { label: option.name, color: option.color } : value;
      case 'MULTI_SELECT':
        if (!Array.isArray(value)) return null;
        return value.map((v: string) => {
          const opt = property.config?.options?.find((o: any) => o.id === v);
          return opt ? { label: opt.name, color: opt.color } : { label: v };
        });
      case 'CHECKBOX':
        return value ? 'Yes' : 'No';
      case 'DATE':
        return new Date(value).toLocaleDateString();
      case 'PERSON':
        return value;
      case 'NUMBER':
        return value;
      default:
        return String(value);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {/* Add new card */}
        {onAddClick && (
          <button
            onClick={onAddClick}
            className="aspect-4/5 rounded-xl border-2 border-dashed border-linear-border hover:border-linear-accent/60 hover:bg-linear-surface transition-all flex flex-col items-center justify-center gap-3 group"
          >
            <div className="w-12 h-12 rounded-full bg-linear-surface group-hover:bg-linear-accent-light flex items-center justify-center transition-colors">
              <Plus className="w-6 h-6 text-linear-text-tertiary group-hover:text-linear-accent" />
            </div>
            <span className="text-sm text-linear-text-secondary group-hover:text-linear-accent font-medium">
              New
            </span>
          </button>
        )}

        {/* Card items */}
        {rows.map((row) => {
          const title = getCellValue(row, titlePropertyId) || 'Untitled';
          const imageUrl = imagePropertyId ? getCellValue(row, imagePropertyId) : null;
          
          return (
            <div
              key={row.id}
              onClick={() => onRowClick?.(row.id)}
              className="group bg-linear-elevated rounded-xl border border-linear-border hover:border-linear-accent/50 hover:shadow-elevation-1 transition-all cursor-pointer overflow-hidden"
            >
              {/* Card Image/Placeholder */}
              <div className="aspect-4/3 bg-linear-surface relative overflow-hidden">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-10 h-10 text-linear-text-tertiary" />
                  </div>
                )}
                
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
              </div>

              {/* Card Content */}
              <div className="p-4">
                {/* Title */}
                <div className="flex items-start gap-2 mb-3">
                  <FileText className="w-4 h-4 text-linear-text-tertiary shrink-0 mt-0.5" />
                  <h3 className="text-sm font-medium text-linear-text line-clamp-2 flex-1">
                    {title}
                  </h3>
                </div>

                {/* Properties */}
                <div className="space-y-1.5">
                  {visibleProperties
                    .filter(propId => propId !== titlePropertyId && propId !== imagePropertyId)
                    .slice(0, 3)
                    .map((propId) => {
                      const property = getProperty(propId);
                      if (!property) return null;
                      
                      const rawValue = getCellValue(row, propId);
                      const formatted = formatPropertyValue(rawValue, property);
                      
                      if (!formatted) return null;

                      // Handle multi-select badges
                      if (property.type === 'MULTI_SELECT' && Array.isArray(formatted)) {
                        return (
                          <div key={propId} className="flex flex-wrap gap-1">
                            {formatted.slice(0, 2).map((item: any, idx: number) => (
                              <span
                                key={idx}
                                className="px-1.5 py-0.5 text-xs rounded-md"
                                style={{ 
                                  backgroundColor: item.color ? `${item.color}20` : '#e5e7eb',
                                  color: item.color || '#374151'
                                }}
                              >
                                {item.label}
                              </span>
                            ))}
                            {formatted.length > 2 && (
                              <span className="text-xs text-linear-text-tertiary">+{formatted.length - 2}</span>
                            )}
                          </div>
                        );
                      }

                      // Handle single select badge
                      if (property.type === 'SELECT' && typeof formatted === 'object') {
                        return (
                          <div key={propId}>
                            <span
                              className="px-1.5 py-0.5 text-xs rounded-md"
                              style={{ 
                                backgroundColor: formatted.color ? `${formatted.color}20` : '#e5e7eb',
                                color: formatted.color || '#374151'
                              }}
                            >
                              {formatted.label}
                            </span>
                          </div>
                        );
                      }

                      return (
                        <div key={propId} className="flex items-center gap-2 text-xs">
                          <span className="text-linear-text-tertiary">{property.name}:</span>
                          <span className="text-linear-text truncate">{formatted}</span>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {rows.length === 0 && (
        <div className="text-center py-16">
          <ImageIcon className="w-12 h-12 text-linear-text-tertiary mx-auto mb-3" />
          <p className="text-linear-text-secondary">No items to display</p>
          <p className="text-sm text-linear-text-tertiary mt-1">Add items to see them in gallery view</p>
        </div>
      )}
    </div>
  );
}
