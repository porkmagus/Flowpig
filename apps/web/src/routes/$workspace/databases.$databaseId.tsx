import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { API_URL } from '~/lib/api';
import { AnimatedPage } from '@flowpigdev/ui';
import {
  ChevronLeft,
  Plus,
  MoreHorizontal,
  Search,
  Filter,
  LayoutGrid,
  List,
  Calendar,
  Kanban,
  ArrowUpDown,
  GripVertical,
  X,
  Check,
  ChevronDown,
  Type,
  Hash,
  CalendarDays,
  User,
  Flag,
  CheckSquare,

  Tags,
} from 'lucide-react';

interface Property {
  id: string;
  name: string;
  type: string;
  options?: string[];
}

interface Row {
  id: string;
  cells: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

interface View {
  id: string;
  name: string;
  type: 'TABLE' | 'BOARD' | 'CALENDAR' | 'LIST';
  config: Record<string, unknown>;
}

interface Database {
  id: string;
  name: string;
  description: string | null;
  emoji: string | null;
  properties: Property[];
  views: View[];
  rows: Row[];
}

const propertyIcons: Record<string, React.ReactNode> = {
  TITLE: <Type className="w-4 h-4" />,
  TEXT: <Type className="w-4 h-4" />,
  NUMBER: <Hash className="w-4 h-4" />,
  DATE: <CalendarDays className="w-4 h-4" />,
  PERSON: <User className="w-4 h-4" />,
  SELECT: <Flag className="w-4 h-4" />,
  MULTI_SELECT: <Tags className="w-4 h-4" />,
  STATUS: <Flag className="w-4 h-4" />,
  CHECKBOX: <CheckSquare className="w-4 h-4" />,
};

export default function DatabaseDetailRoute() {
  const { workspace, databaseId } = useParams();
  const queryClient = useQueryClient();
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showAddRow, setShowAddRow] = useState(false);
  const [showAddProperty, setShowAddProperty] = useState(false);
  const [newPropertyName, setNewPropertyName] = useState('');
  const [newPropertyType, setNewPropertyType] = useState('TEXT');
  const [editingCell, setEditingCell] = useState<{ rowId: string; propertyId: string } | null>(null);
  const [editValue, setEditValue] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['database', workspace, databaseId],
    queryFn: async () => {
      const response = await fetch(
        `${API_URL}/workspaces/${workspace}/databases/${databaseId}`,
        { credentials: 'include' }
      );
      if (!response.ok) throw new Error('Failed to load database');
      return response.json();
    },
  });

  const database: Database | undefined = data?.database;

  const activeView = useMemo(() => {
    if (!database) return null;
    return database.views.find((v) => v.id === activeViewId) || database.views[0];
  }, [database, activeViewId]);

  const createViewMutation = useMutation({
    mutationFn: async (type: string) => {
      const response = await fetch(
        `${API_URL}/workspaces/${workspace}/databases/${databaseId}/views`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            name: `${type.charAt(0) + type.slice(1).toLowerCase()} View`,
            type,
            config: {},
          }),
        }
      );
      if (!response.ok) throw new Error('Failed to create view');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['database', workspace, databaseId] });
    },
  });

  const addRowMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(
        `${API_URL}/workspaces/${workspace}/databases/${databaseId}/rows`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ cells: {} }),
        }
      );
      if (!response.ok) throw new Error('Failed to add row');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['database', workspace, databaseId] });
      setShowAddRow(false);
    },
  });

  const addPropertyMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(
        `${API_URL}/workspaces/${workspace}/databases/${databaseId}/properties`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            name: newPropertyName,
            type: newPropertyType,
          }),
        }
      );
      if (!response.ok) throw new Error('Failed to add property');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['database', workspace, databaseId] });
      setShowAddProperty(false);
      setNewPropertyName('');
    },
  });

  const updateCellMutation = useMutation({
    mutationFn: async ({ rowId, propertyId, value }: { rowId: string; propertyId: string; value: unknown }) => {
      const response = await fetch(
        `${API_URL}/workspaces/${workspace}/databases/${databaseId}/rows/${rowId}/cells/${propertyId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ value }),
        }
      );
      if (!response.ok) throw new Error('Failed to update cell');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['database', workspace, databaseId] });
      setEditingCell(null);
      setEditValue('');
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-linear-accent/30 border-t-primary-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!database) {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-semibold text-linear-text">Database not found</h2>
        <Link to={`/${workspace}/databases`} className="text-linear-accent hover:text-linear-accent mt-4 inline-block">
          Back to databases
        </Link>
      </div>
    );
  }

  const filteredRows = database.rows.filter((row) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return Object.values(row.cells).some((value) =>
      String(value).toLowerCase().includes(searchLower)
    );
  });

  const handleCellClick = (rowId: string, propertyId: string, currentValue: unknown) => {
    setEditingCell({ rowId, propertyId });
    setEditValue(String(currentValue || ''));
  };

  const handleCellSave = () => {
    if (editingCell) {
      updateCellMutation.mutate({
        rowId: editingCell.rowId,
        propertyId: editingCell.propertyId,
        value: editValue,
      });
    }
  };

  const renderCell = (row: Row, property: Property) => {
    const value = row.cells[property.id];
    const isEditing = editingCell?.rowId === row.id && editingCell?.propertyId === property.id;

    if (isEditing) {
      return (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCellSave();
              if (e.key === 'Escape') {
                setEditingCell(null);
                setEditValue('');
              }
            }}
            className="w-full px-2 py-1 border border-linear-accent rounded focus:outline-none text-sm"
            autoFocus
          />
          <button
            onClick={handleCellSave}
            className="p-1 text-green-600 hover:bg-green-50 rounded"
          >
            <Check className="w-4 h-4" />
          </button>
        </div>
      );
    }

    switch (property.type) {
      case 'CHECKBOX':
        return (
          <button
            onClick={() => updateCellMutation.mutate({
              rowId: row.id,
              propertyId: property.id,
              value: !value,
            })}
            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
              value ? 'bg-linear-accent border-linear-accent' : 'border-linear-border hover:border-linear-accent/60'
            }`}
          >
            {value ? <Check className="w-3 h-3 text-white" /> : null}
          </button>
        );

      case 'STATUS':
        const statusColors: Record<string, string> = {
          'Not Started': 'bg-linear-elevated text-linear-text-secondary',
          'In Progress': 'bg-sky-500/10 text-sky-400',
          'Done': 'bg-emerald-500/10 text-emerald-400',
          'Blocked': 'bg-red-500/10 text-red-400',
        };
        return (
          <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[String(value)] || 'bg-linear-elevated'}`}>
            {String(value || 'Not Started')}
          </span>
        );

      case 'SELECT':
      case 'MULTI_SELECT':
        const values = Array.isArray(value) ? value : value ? [value] : [];
        return (
          <div className="flex flex-wrap gap-1">
            {values.map((v, i) => (
              <span key={i} className="px-2 py-0.5 bg-linear-accent/20 text-linear-accent rounded text-xs">
                {String(v)}
              </span>
            ))}
          </div>
        );

      case 'DATE':
        return (
          <span className="text-sm text-linear-text-secondary">
            {value ? new Date(String(value)).toLocaleDateString() : '-'}
          </span>
        );

      default:
        return (
          <span
            onClick={() => handleCellClick(row.id, property.id, value)}
            className="text-sm text-linear-text cursor-pointer hover:text-linear-accent"
          >
            {String(value || '')}
          </span>
        );
    }
  };

  return (
    <AnimatedPage className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          to={`/${workspace}/databases`}
          className="p-2 text-linear-text-secondary hover:text-linear-text-secondary hover:bg-linear-elevated rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{database.emoji || '🗄️'}</span>
            <h1 className="text-2xl font-bold text-linear-text">{database.name}</h1>
          </div>
          {database.description && (
            <p className="text-linear-text-secondary mt-1">{database.description}</p>
          )}
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto">
        {database.views.map((view) => (
          <button
            key={view.id}
            onClick={() => setActiveViewId(view.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeView?.id === view.id
                ? 'bg-linear-bg text-linear-text'
                : 'bg-linear-surface border border-linear-border text-linear-text-secondary hover:bg-linear-elevated/50'
            }`}
          >
            {view.type === 'TABLE' && <LayoutGrid className="w-4 h-4" />}
            {view.type === 'BOARD' && <Kanban className="w-4 h-4" />}
            {view.type === 'CALENDAR' && <Calendar className="w-4 h-4" />}
            {view.type === 'LIST' && <List className="w-4 h-4" />}
            {view.name}
          </button>
        ))}

        <div className="relative group">
          <button className="flex items-center gap-1 px-3 py-2 text-linear-text-secondary hover:text-linear-text-secondary hover:bg-linear-elevated rounded-lg transition-colors">
            <Plus className="w-4 h-4" />
            <ChevronDown className="w-3 h-3" />
          </button>
          <div className="absolute left-0 top-full mt-1 bg-linear-surface shadow-lg rounded-lg border border-linear-border py-1 w-40 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
            <button
              onClick={() => createViewMutation.mutate('TABLE')}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-linear-text-secondary hover:bg-linear-elevated text-left"
            >
              <LayoutGrid className="w-4 h-4" />
              Table View
            </button>
            <button
              onClick={() => createViewMutation.mutate('BOARD')}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-linear-text-secondary hover:bg-linear-elevated text-left"
            >
              <Kanban className="w-4 h-4" />
              Board View
            </button>
            <button
              onClick={() => createViewMutation.mutate('CALENDAR')}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-linear-text-secondary hover:bg-linear-elevated text-left"
            >
              <Calendar className="w-4 h-4" />
              Calendar View
            </button>
            <button
              onClick={() => createViewMutation.mutate('LIST')}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-linear-text-secondary hover:bg-linear-elevated text-left"
            >
              <List className="w-4 h-4" />
              List View
            </button>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-linear-text-tertiary" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search rows..."
            className="w-full pl-10 pr-4 py-2 border border-linear-border rounded-lg focus:ring-2 focus:ring-linear-accent/40 focus:border-transparent text-sm"
          />
        </div>
        <button className="flex items-center gap-2 px-3 py-2 text-sm text-linear-text-secondary hover:bg-linear-elevated rounded-lg transition-colors">
          <Filter className="w-4 h-4" />
          Filter
        </button>
        <button className="flex items-center gap-2 px-3 py-2 text-sm text-linear-text-secondary hover:bg-linear-elevated rounded-lg transition-colors">
          <ArrowUpDown className="w-4 h-4" />
          Sort
        </button>
      </div>

      {/* Content based on view type */}
      {activeView?.type === 'TABLE' && (
        <div className="flex-1 overflow-auto bg-linear-surface rounded-xl border border-linear-border">
          <table className="w-full">
            <thead className="bg-linear-elevated/50 border-b border-linear-border">
              <tr>
                {database.properties.map((property) => (
                  <th
                    key={property.id}
                    className="px-4 py-3 text-left text-xs font-medium text-linear-text-secondary uppercase tracking-wider"
                  >
                    <div className="flex items-center gap-2">
                      {propertyIcons[property.type]}
                      {property.name}
                    </div>
                  </th>
                ))}
                <th className="px-4 py-3 w-10">
                  <button
                    onClick={() => setShowAddProperty(true)}
                    className="p-1 text-linear-text-tertiary hover:text-linear-text-secondary hover:bg-linear-elevated rounded"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-linear-border">
              {filteredRows.map((row) => (
                <tr key={row.id} className="hover:bg-linear-elevated/50">
                  {database.properties.map((property) => (
                    <td key={property.id} className="px-4 py-3">
                      {renderCell(row, property)}
                    </td>
                  ))}
                  <td />
                </tr>
              ))}
              <tr>
                <td colSpan={database.properties.length + 1} className="px-4 py-3">
                  <button
                    onClick={() => addRowMutation.mutate()}
                    disabled={addRowMutation.isPending}
                    className="flex items-center gap-2 text-linear-text-secondary hover:text-linear-text-secondary text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    {addRowMutation.isPending ? 'Adding...' : 'New row'}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {activeView?.type === 'BOARD' && (
        <div className="flex-1 overflow-auto">
          <DatabaseBoardView
            database={database}
            rows={filteredRows}
            onCellUpdate={(rowId, propertyId, value) =>
              updateCellMutation.mutate({ rowId, propertyId, value })
            }
          />
        </div>
      )}

      {activeView?.type === 'CALENDAR' && (
        <div className="flex-1 overflow-auto">
          <DatabaseCalendarView
            database={database}
            rows={filteredRows}
            onCellUpdate={(rowId, propertyId, value) =>
              updateCellMutation.mutate({ rowId, propertyId, value })
            }
          />
        </div>
      )}

      {/* Add Property Modal */}
      <AnimatePresence>
        {showAddProperty && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowAddProperty(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-linear-surface rounded-xl p-6 w-full max-w-md shadow-xl"
            >
              <h2 className="text-xl font-semibold text-linear-text mb-4">Add Property</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-linear-text-secondary mb-1">Name</label>
                  <input
                    type="text"
                    value={newPropertyName}
                    onChange={(e) => setNewPropertyName(e.target.value)}
                    placeholder="e.g., Priority"
                    className="w-full px-3 py-2 border border-linear-border rounded-lg focus:ring-2 focus:ring-linear-accent/40"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-linear-text-secondary mb-1">Type</label>
                  <select
                    value={newPropertyType}
                    onChange={(e) => setNewPropertyType(e.target.value)}
                    className="w-full px-3 py-2 border border-linear-border rounded-lg focus:ring-2 focus:ring-linear-accent/40"
                  >
                    <option value="TEXT">Text</option>
                    <option value="NUMBER">Number</option>
                    <option value="DATE">Date</option>
                    <option value="SELECT">Select</option>
                    <option value="MULTI_SELECT">Multi-select</option>
                    <option value="STATUS">Status</option>
                    <option value="CHECKBOX">Checkbox</option>
                  </select>
                </div>
                <div className="flex items-center justify-end gap-3 pt-4">
                  <button
                    onClick={() => setShowAddProperty(false)}
                    className="px-4 py-2 text-linear-text-secondary hover:text-linear-text"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => addPropertyMutation.mutate()}
                    disabled={!newPropertyName.trim() || addPropertyMutation.isPending}
                    className="bg-linear-accent hover:bg-linear-accent/80 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    {addPropertyMutation.isPending ? 'Adding...' : 'Add Property'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AnimatedPage>
  );
}

// Board View Component
function DatabaseBoardView({
  database,
  rows,
  onCellUpdate,
}: {
  database: Database;
  rows: Row[];
  onCellUpdate: (rowId: string, propertyId: string, value: unknown) => void;
}) {
  // Find status property or use first select property
  const statusProperty = database.properties.find(
    (p) => p.type === 'STATUS' || p.type === 'SELECT'
  );

  const statusValues = statusProperty?.options || ['Not Started', 'In Progress', 'Done'];

  // Group rows by status
  const rowsByStatus = rows.reduce((acc, row) => {
    const status = String(row.cells[statusProperty?.id || ''] || 'Not Started');
    if (!acc[status]) acc[status] = [];
    acc[status].push(row);
    return acc;
  }, {} as Record<string, Row[]>);

  return (
    <div className="flex gap-4 h-full overflow-x-auto pb-4">
      {statusValues.map((status) => (
        <div
          key={status}
          className="shrink-0 w-72 bg-linear-elevated/50 rounded-xl p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  status === 'Done'
                    ? 'bg-green-500'
                    : status === 'In Progress'
                    ? 'bg-blue-500'
                    : status === 'Blocked'
                    ? 'bg-red-500'
                    : 'bg-linear-text-tertiary'
                }`}
              />
              <span className="font-medium text-linear-text">{status}</span>
            </div>
            <span className="text-sm text-linear-text-secondary bg-linear-surface px-2 py-0.5 rounded-full">
              {(rowsByStatus[status] || []).length}
            </span>
          </div>

          <div className="space-y-2">
            {(rowsByStatus[status] || []).map((row) => (
              <motion.div
                key={row.id}
                layoutId={row.id}
                className="bg-linear-surface p-3 rounded-lg border border-linear-border shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              >
                {database.properties
                  .filter((p) => p.type === 'TITLE')
                  .map((property) => (
                    <p key={property.id} className="font-medium text-linear-text mb-2">
                      {String(row.cells[property.id] || 'Untitled')}
                    </p>
                  ))}
                <div className="flex flex-wrap gap-2">
                  {database.properties
                    .filter((p) => p.type !== 'TITLE' && p.id !== statusProperty?.id)
                    .slice(0, 3)
                    .map((property) => {
                      const value = row.cells[property.id];
                      if (!value) return null;
                      return (
                        <span
                          key={property.id}
                          className="px-2 py-0.5 bg-linear-elevated text-linear-text-secondary rounded text-xs"
                        >
                          {property.name}: {String(value)}
                        </span>
                      );
                    })}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Calendar View Component
function DatabaseCalendarView({
  database,
  rows,
  onCellUpdate,
}: {
  database: Database;
  rows: Row[];
  onCellUpdate: (rowId: string, propertyId: string, value: unknown) => void;
}) {
  const [currentDate, setCurrentDate] = useState(new Date());

  // Find date property
  const dateProperty = database.properties.find((p) => p.type === 'DATE');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  const days: (Date | null)[] = [];
  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(year, month, i));
  }

  // Find rows with dates
  const rowsByDate = rows.reduce((acc, row) => {
    const dateValue = row.cells[dateProperty?.id || ''];
    if (dateValue) {
      const date = new Date(String(dateValue));
      const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(row);
    }
    return acc;
  }, {} as Record<string, Row[]>);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-linear-text">
            {monthNames[month]} {year}
          </h2>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
              className="p-1 hover:bg-linear-elevated rounded"
            >
              ←
            </button>
            <button
              onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
              className="p-1 hover:bg-linear-elevated rounded"
            >
              →
            </button>
          </div>
        </div>
        <button
          onClick={() => setCurrentDate(new Date())}
          className="text-sm text-linear-accent hover:text-linear-accent"
        >
          Today
        </button>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="text-center text-sm font-medium text-linear-text-secondary py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1 flex-1">
        {days.map((day, index) => {
          if (!day) {
            return <div key={`empty-${index}`} className="bg-linear-elevated/50 rounded-lg" />;
          }

          const key = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
          const dayRows = rowsByDate[key] || [];
          const isToday = new Date().toDateString() === day.toDateString();

          return (
            <div
              key={key}
              className={`bg-linear-surface rounded-lg border border-linear-border p-2 min-h-24 ${
                isToday ? 'ring-2 ring-primary-500' : ''
              }`}
            >
              <div className={`text-sm font-medium mb-1 ${isToday ? 'text-linear-accent' : 'text-linear-text-secondary'}`}>
                {day.getDate()}
              </div>
              <div className="space-y-1">
                {dayRows.slice(0, 3).map((row) => {
                  const titleProperty = database.properties.find((p) => p.type === 'TITLE');
                  const title = String(row.cells[titleProperty?.id || ''] || 'Untitled');
                  return (
                    <div
                      key={row.id}
                      className="text-xs bg-linear-accent/20 text-linear-accent px-2 py-1 rounded truncate"
                    >
                      {title}
                    </div>
                  );
                })}
                {dayRows.length > 3 && (
                  <div className="text-xs text-linear-text-secondary px-2">
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
