// @ts-nocheck - Tiptap v3 type compatibility issues, needs refactoring
import { useEditor, EditorContent, ReactNodeViewRenderer } from '@tiptap/react';
import BubbleMenu from '@tiptap/extension-bubble-menu';
import FloatingMenu from '@tiptap/extension-floating-menu';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import HorizontalRule from '@tiptap/extension-horizontal-rule';
import Youtube from '@tiptap/extension-youtube';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import { Node, mergeAttributes } from '@tiptap/core';
import { ReactRenderer } from '@tiptap/react';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Link as LinkIcon,
  Image as ImageIcon,
  Undo,
  Redo,
  ChevronRight,
  ChevronDown,
  Info,
  AlertTriangle,
  CheckCircle,
  Lightbulb,
  Table as TableIcon,
  Minus,
  Video,
  FunctionSquare,
  Type,
  Plus,
  X,
  MoreHorizontal,
  Trash2,
  Copy,
  GripVertical,
} from 'lucide-react';
import { useState, useCallback, useRef, useEffect } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

const lowlight = createLowlight(common);

// Custom Toggle List Extension
const ToggleList = Node.create({
  name: 'toggleList',
  group: 'block',
  content: 'block+',
  defining: true,
  addAttributes() {
    return {
      open: {
        default: true,
        parseHTML: (element) => element.getAttribute('data-open') === 'true',
        renderHTML: (attributes) => ({
          'data-open': attributes.open,
        }),
      },
    };
  },
  parseHTML() {
    return [
      {
        tag: 'div[data-type="toggle-list"]',
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'toggle-list' }), 0];
  },
  addNodeView() {
    return ReactNodeViewRenderer(ToggleListComponent);
  },
  addCommands() {
    return {
      setToggleList: () => ({ commands }) => {
        return commands.wrapIn(this.name);
      },
      toggleToggleList: () => ({ commands }) => {
        return commands.toggleWrap(this.name);
      },
    };
  },
  addKeyboardShortcuts() {
    return {
      'Mod-Shift-t': () => this.editor.commands.toggleToggleList(),
    };
  },
});

// Toggle List Component
function ToggleListComponent({ editor, node, getPos }: { editor: any; node: any; getPos: () => number }) {
  const [isOpen, setIsOpen] = useState(node.attrs.open);
  const [summary, setSummary] = useState('Toggle');

  useEffect(() => {
    editor.state.doc.descendants((node: any, pos: number) => {
      if (pos === getPos() && node.type.name === 'toggleList') {
        const firstChild = node.firstChild;
        if (firstChild && firstChild.type.name === 'paragraph') {
          setSummary(firstChild.textContent || 'Toggle');
        }
      }
    });
  }, [editor.state, getPos]);

  const toggle = () => {
    setIsOpen(!isOpen);
    editor.commands.updateAttributes('toggleList', { open: !isOpen });
  };

  return (
    <div className="toggle-list my-2">
      <button
        onClick={toggle}
        className="flex items-center gap-2 w-full text-left p-2 hover:bg-linear-elevated rounded-lg transition-colors group"
      >
        <div className={`transform transition-transform ${isOpen ? 'rotate-90' : ''}`}>
          <ChevronRight className="w-4 h-4 text-linear-text-secondary" />
        </div>
        <span className="font-medium text-linear-text-secondary flex-1">{summary}</span>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              editor.commands.deleteNode('toggleList');
            }}
            className="p-1 hover:bg-red-100 rounded text-red-500"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </button>
      {isOpen && (
        <div className="pl-6 mt-2 border-l-2 border-linear-border">
          <EditorContent editor={editor} />
        </div>
      )}
    </div>
  );
}

// Custom Callout Extension
const Callout = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',
  defining: true,
  addAttributes() {
    return {
      type: {
        default: 'info',
        parseHTML: (element) => element.getAttribute('data-callout-type') || 'info',
        renderHTML: (attributes) => ({
          'data-callout-type': attributes.type,
        }),
      },
    };
  },
  parseHTML() {
    return [
      {
        tag: 'div[data-type="callout"]',
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'callout' }), 0];
  },
  addNodeView() {
    return ReactNodeViewRenderer(CalloutComponent);
  },
  addCommands() {
    return {
      setCallout: (type = 'info') => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: { type },
          content: [{ type: 'paragraph' }],
        });
      },
    };
  },
});

const calloutConfig = {
  info: { icon: Info, color: 'bg-blue-50 border-blue-200 text-blue-700', label: 'Info' },
  warning: { icon: AlertTriangle, color: 'bg-yellow-50 border-yellow-200 text-yellow-700', label: 'Warning' },
  success: { icon: CheckCircle, color: 'bg-green-50 border-green-200 text-green-700', label: 'Success' },
  tip: { icon: Lightbulb, color: 'bg-purple-50 border-purple-200 text-purple-700', label: 'Tip' },
};

function CalloutComponent({ editor, node, updateAttributes }: { editor: any; node: any; updateAttributes: (attrs: any) => void }) {
  const type = node.attrs.type as keyof typeof calloutConfig;
  const config = calloutConfig[type] || calloutConfig.info;
  const Icon = config.icon;
  const [showTypeMenu, setShowTypeMenu] = useState(false);

  return (
    <div className={`callout my-3 p-4 rounded-lg border ${config.color}`}>
      <div className="flex items-start gap-3">
        <div className="shrink-0 relative">
          <button
            onClick={() => setShowTypeMenu(!showTypeMenu)}
            className="p-1 hover:bg-black/5 rounded transition-colors"
          >
            <Icon className="w-5 h-5" />
          </button>
          
          {showTypeMenu && (
            <div className="absolute top-full left-0 mt-1 w-32 bg-linear-surface border border-linear-border rounded-lg shadow-lg z-50 py-1">
              {Object.entries(calloutConfig).map(([key, cfg]) => {
                const CfgIcon = cfg.icon;
                return (
                  <button
                    key={key}
                    onClick={() => {
                      updateAttributes({ type: key });
                      setShowTypeMenu(false);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-linear-elevated/50 ${
                      type === key ? 'bg-blue-50 text-blue-700' : 'text-linear-text-secondary'
                    }`}
                  >
                    <CfgIcon className="w-4 h-4" />
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}

// Math Block Extension
const MathBlock = Node.create({
  name: 'mathBlock',
  group: 'block',
  atom: true,
  addAttributes() {
    return {
      formula: {
        default: '',
      },
    };
  },
  parseHTML() {
    return [
      {
        tag: 'div[data-type="math-block"]',
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'math-block' }), 0];
  },
  addNodeView() {
    return ReactNodeViewRenderer(MathBlockComponent);
  },
  addCommands() {
    return {
      setMathBlock: (formula = '') => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: { formula },
        });
      },
    };
  },
});

function MathBlockComponent({ node, updateAttributes }: { node: any; updateAttributes: (attrs: any) => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formula, setFormula] = useState(node.attrs.formula);

  const renderMath = () => {
    if (!formula) return <span className="text-linear-text-tertiary italic">Empty equation</span>;
    try {
      return (
        <span
          dangerouslySetInnerHTML={{
            __html: katex.renderToString(formula, {
              throwOnError: false,
              displayMode: true,
            }),
          }}
        />
      );
    } catch (e) {
      return <span className="text-red-500">Invalid equation</span>;
    }
  };

  if (isEditing) {
    return (
      <div className="my-3 p-4 bg-linear-elevated/50 rounded-lg border border-linear-border">
        <textarea
          value={formula}
          onChange={(e) => setFormula(e.target.value)}
          placeholder="Enter LaTeX formula..."
          className="w-full p-2 border border-linear-border rounded font-mono text-sm bg-linear-elevated text-linear-text"
          rows={3}
          autoFocus
        />
        <div className="flex justify-end gap-2 mt-2">
          <button
            onClick={() => setIsEditing(false)}
            className="px-3 py-1.5 text-sm text-linear-text-secondary hover:bg-linear-elevated rounded"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              updateAttributes({ formula });
              setIsEditing(false);
            }}
            className="px-3 py-1.5 text-sm bg-linear-accent text-white rounded hover:bg-linear-accent/80"
          >
            Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className="my-3 p-4 bg-linear-elevated/50 rounded-lg border border-linear-border cursor-pointer hover:border-linear-accent/40 transition-colors group"
    >
      <div className="text-center overflow-x-auto">
        {renderMath()}
      </div>
      <div className="opacity-0 group-hover:opacity-100 transition-opacity text-center mt-2 text-xs text-linear-text-tertiary">
        Click to edit
      </div>
    </div>
  );
}

interface RichBlockEditorProps {
  content?: object;
  onChange?: (content: object) => void;
  placeholder?: string;
  editable?: boolean;
}

// Slash command menu items
const slashCommands = [
  { 
    id: 'heading1', 
    label: 'Heading 1', 
    icon: Heading1, 
    action: (editor: any) => editor.chain().focus().setHeading({ level: 1 }).run(),
    shortcut: '# '
  },
  { 
    id: 'heading2', 
    label: 'Heading 2', 
    icon: Heading2, 
    action: (editor: any) => editor.chain().focus().setHeading({ level: 2 }).run(),
    shortcut: '## '
  },
  { 
    id: 'heading3', 
    label: 'Heading 3', 
    icon: Heading3, 
    action: (editor: any) => editor.chain().focus().setHeading({ level: 3 }).run(),
    shortcut: '### '
  },
  { 
    id: 'bulletList', 
    label: 'Bulleted list', 
    icon: List, 
    action: (editor: any) => editor.chain().focus().toggleBulletList().run(),
    shortcut: '- '
  },
  { 
    id: 'orderedList', 
    label: 'Numbered list', 
    icon: ListOrdered, 
    action: (editor: any) => editor.chain().focus().toggleOrderedList().run(),
    shortcut: '1. '
  },
  { 
    id: 'taskList', 
    label: 'To-do list', 
    icon: CheckSquare, 
    action: (editor: any) => editor.chain().focus().toggleTaskList().run(),
    shortcut: '[] '
  },
  { 
    id: 'toggleList', 
    label: 'Toggle list', 
    icon: ChevronRight, 
    action: (editor: any) => editor.commands.setToggleList(),
    shortcut: '> '
  },
  { 
    id: 'callout', 
    label: 'Callout', 
    icon: Info, 
    action: (editor: any) => editor.commands.setCallout('info'),
    shortcut: '!> '
  },
  { 
    id: 'blockquote', 
    label: 'Quote', 
    icon: Quote, 
    action: (editor: any) => editor.chain().focus().toggleBlockquote().run(),
    shortcut: '> '
  },
  { 
    id: 'codeBlock', 
    label: 'Code block', 
    icon: Code, 
    action: (editor: any) => editor.chain().focus().setCodeBlock().run(),
    shortcut: '```'
  },
  { 
    id: 'mathBlock', 
    label: 'Math equation', 
    icon: FunctionSquare, 
    action: (editor: any) => editor.commands.setMathBlock(),
    shortcut: '$$'
  },
  { 
    id: 'table', 
    label: 'Table', 
    icon: TableIcon, 
    action: (editor: any) => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
    shortcut: '| '
  },
  { 
    id: 'divider', 
    label: 'Divider', 
    icon: Minus, 
    action: (editor: any) => editor.chain().focus().setHorizontalRule().run(),
    shortcut: '---'
  },
  { 
    id: 'image', 
    label: 'Image', 
    icon: ImageIcon, 
    action: (editor: any) => {
      const url = window.prompt('Enter image URL:');
      if (url) editor.chain().focus().setImage({ src: url }).run();
    },
    shortcut: '![]'
  },
  { 
    id: 'youtube', 
    label: 'YouTube video', 
    icon: Video, 
    action: (editor: any) => {
      const url = window.prompt('Enter YouTube URL:');
      if (url) editor.chain().focus().setYoutubeVideo({ src: url }).run();
    },
    shortcut: 'yt '
  },
];

export function RichBlockEditor({
  content,
  onChange,
  placeholder = "Type '/' for commands...",
  editable = true,
}: RichBlockEditorProps) {
  const [slashMenuOpen, setSlashMenuOpen] = useState(false);
  const [slashMenuQuery, setSlashMenuQuery] = useState('');
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
  const slashMenuRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        codeBlock: false,
      }),
      Image.configure({
        allowBase64: true,
      }),
      Link.configure({
        openOnClick: false,
      }),
      Placeholder.configure({
        placeholder,
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableCell,
      TableHeader,
      HorizontalRule,
      Youtube.configure({
        width: 640,
        height: 360,
      }),
      CodeBlockLowlight.configure({
        lowlight,
        defaultLanguage: 'javascript',
      }),
      ToggleList,
      Callout,
      MathBlock,
    ],
    content: content || { type: 'doc', content: [{ type: 'paragraph' }] },
    editable,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getJSON());
    },
    onKeyDown: ({ event }) => {
      if (slashMenuOpen) {
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          setSelectedCommandIndex((prev) => 
            prev < filteredCommands.length - 1 ? prev + 1 : prev
          );
          return true;
        }
        if (event.key === 'ArrowUp') {
          event.preventDefault();
          setSelectedCommandIndex((prev) => prev > 0 ? prev - 1 : 0);
          return true;
        }
        if (event.key === 'Enter') {
          event.preventDefault();
          const command = filteredCommands[selectedCommandIndex];
          if (command) {
            command.action(editor);
            setSlashMenuOpen(false);
            setSlashMenuQuery('');
          }
          return true;
        }
        if (event.key === 'Escape') {
          setSlashMenuOpen(false);
          setSlashMenuQuery('');
          return true;
        }
      }
      return false;
    },
  });

  // Handle slash command trigger
  useEffect(() => {
    if (!editor) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === '/' && !slashMenuOpen) {
        const { state } = editor;
        const { selection } = state;
        const { $from } = selection;
        const textBefore = $from.parent.textContent.slice(0, $from.parentOffset);
        
        // Only open if / is at start of line or after space
        if (textBefore === '' || textBefore.endsWith(' ')) {
          setSlashMenuOpen(true);
          setSlashMenuQuery('');
          setSelectedCommandIndex(0);
        }
      }
    };

    editor.on('keydown', handleKeyDown);
    return () => {
      editor.off('keydown', handleKeyDown);
    };
  }, [editor, slashMenuOpen]);

  // Update query as user types after /
  useEffect(() => {
    if (!editor || !slashMenuOpen) return;

    const updateQuery = () => {
      const { state } = editor;
      const { selection } = state;
      const { $from } = selection;
      const textBefore = $from.parent.textContent.slice(0, $from.parentOffset);
      
      if (textBefore.includes('/')) {
        const query = textBefore.slice(textBefore.lastIndexOf('/') + 1);
        setSlashMenuQuery(query);
      }
    };

    editor.on('update', updateQuery);
    return () => {
      editor.off('update', updateQuery);
    };
  }, [editor, slashMenuOpen]);

  const filteredCommands = slashCommands.filter((cmd) =>
    cmd.label.toLowerCase().includes(slashMenuQuery.toLowerCase())
  );

  if (!editor) {
    return null;
  }

  const ToolbarButton = ({
    onClick,
    isActive = false,
    disabled = false,
    children,
    title,
  }: {
    onClick: () => void;
    isActive?: boolean;
    disabled?: boolean;
    children: React.ReactNode;
    title?: string;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`
        p-2 rounded transition-colors
        ${isActive ? 'bg-linear-elevated text-linear-text' : 'text-linear-text-secondary hover:bg-linear-elevated'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      {children}
    </button>
  );

  return (
    <div className="border border-linear-border rounded-lg overflow-hidden bg-linear-surface">
      {/* Toolbar */}
      {editable && (
        <div className="flex items-center gap-1 p-2 border-b border-linear-border bg-linear-elevated/50 flex-wrap">
          <div className="flex items-center gap-1">
            <ToolbarButton
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              title="Undo"
            >
              <Undo className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              title="Redo"
            >
              <Redo className="w-4 h-4" />
            </ToolbarButton>
          </div>

          <div className="w-px h-6 bg-linear-elevated mx-1" />

          <div className="flex items-center gap-1">
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBold().run()}
              isActive={editor.isActive('bold')}
              title="Bold"
            >
              <Bold className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleItalic().run()}
              isActive={editor.isActive('italic')}
              title="Italic"
            >
              <Italic className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleStrike().run()}
              isActive={editor.isActive('strike')}
              title="Strikethrough"
            >
              <Strikethrough className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleCode().run()}
              isActive={editor.isActive('code')}
              title="Inline code"
            >
              <Code className="w-4 h-4" />
            </ToolbarButton>
          </div>

          <div className="w-px h-6 bg-linear-elevated mx-1" />

          <div className="flex items-center gap-1">
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              isActive={editor.isActive('heading', { level: 1 })}
              title="Heading 1"
            >
              <Heading1 className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              isActive={editor.isActive('heading', { level: 2 })}
              title="Heading 2"
            >
              <Heading2 className="w-4 h-4" />
            </ToolbarButton>
          </div>

          <div className="w-px h-6 bg-linear-elevated mx-1" />

          <div className="flex items-center gap-1">
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              isActive={editor.isActive('bulletList')}
              title="Bullet list"
            >
              <List className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              isActive={editor.isActive('orderedList')}
              title="Numbered list"
            >
              <ListOrdered className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleTaskList().run()}
              isActive={editor.isActive('taskList')}
              title="To-do list"
            >
              <CheckSquare className="w-4 h-4" />
            </ToolbarButton>
          </div>

          <div className="w-px h-6 bg-linear-elevated mx-1" />

          <div className="flex items-center gap-1">
            <ToolbarButton
              onClick={() => editor.commands.setCallout()}
              isActive={editor.isActive('callout')}
              title="Callout"
            >
              <Info className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              isActive={editor.isActive('blockquote')}
              title="Quote"
            >
              <Quote className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().setCodeBlock().run()}
              isActive={editor.isActive('codeBlock')}
              title="Code block"
            >
              <Code className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.commands.setMathBlock()}
              isActive={editor.isActive('mathBlock')}
              title="Math equation"
            >
              <FunctionSquare className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
              title="Table"
            >
              <TableIcon className="w-4 h-4" />
            </ToolbarButton>
          </div>

          <div className="w-px h-6 bg-linear-elevated mx-1" />

          <div className="flex items-center gap-1">
            <ToolbarButton
              onClick={() => {
                const url = window.prompt('Enter URL:');
                if (url) editor.chain().focus().setLink({ href: url }).run();
              }}
              isActive={editor.isActive('link')}
              title="Link"
            >
              <LinkIcon className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => {
                const url = window.prompt('Enter image URL:');
                if (url) editor.chain().focus().setImage({ src: url }).run();
              }}
              title="Image"
            >
              <ImageIcon className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => {
                const url = window.prompt('Enter YouTube URL:');
                if (url) editor.chain().focus().setYoutubeVideo({ src: url }).run();
              }}
              title="YouTube"
            >
              <Video className="w-4 h-4" />
            </ToolbarButton>
          </div>
        </div>
      )}

      {/* Slash Command Menu */}
      {slashMenuOpen && editable && (
        <div
          ref={slashMenuRef}
          className="absolute z-50 w-72 bg-linear-surface rounded-lg shadow-xl border border-linear-border overflow-hidden"
          style={{ top: '100px', left: '50px' }} // Position should be dynamic
        >
          <div className="p-2 border-b border-linear-border">
            <p className="text-xs font-medium text-linear-text-secondary uppercase tracking-wider">Basic blocks</p>
          </div>
          <div className="max-h-80 overflow-y-auto py-1">
            {filteredCommands.map((command, index) => {
              const Icon = command.icon;
              return (
                <button
                  key={command.id}
                  onClick={() => {
                    command.action(editor);
                    setSlashMenuOpen(false);
                    setSlashMenuQuery('');
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-linear-elevated/50 transition-colors ${
                    index === selectedCommandIndex ? 'bg-blue-50 text-blue-700' : 'text-linear-text-secondary'
                  }`}
                >
                  <div className="w-8 h-8 rounded bg-linear-elevated flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-linear-text-secondary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{command.label}</p>
                    <p className="text-xs text-linear-text-tertiary">{command.shortcut}</p>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="p-2 border-t border-linear-border bg-linear-elevated/50 text-xs text-linear-text-secondary">
            <span className="font-medium">↑↓</span> to navigate, <span className="font-medium">Enter</span> to select
          </div>
        </div>
      )}

      {/* Bubble Menu (appears on text selection) */}
      {editable && (
        <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }}>
          <div className="flex items-center gap-1 p-1 bg-linear-elevated border border-linear-border rounded-lg shadow-lg shadow-black/40">
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBold().run()}
              isActive={editor.isActive('bold')}
            >
              <Bold className="w-4 h-4 text-white" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleItalic().run()}
              isActive={editor.isActive('italic')}
            >
              <Italic className="w-4 h-4 text-white" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleStrike().run()}
              isActive={editor.isActive('strike')}
            >
              <Strikethrough className="w-4 h-4 text-white" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => {
                const url = window.prompt('Enter URL:');
                if (url) editor.chain().focus().setLink({ href: url }).run();
              }}
              isActive={editor.isActive('link')}
            >
              <LinkIcon className="w-4 h-4 text-white" />
            </ToolbarButton>
          </div>
        </BubbleMenu>
      )}

      {/* Editor Content */}
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none p-4 min-h-75 focus:outline-none [&_.ProseMirror:focus]:outline-none"
      />

      {/* Custom Styles for Blocks */}
      <style>{`
        .ProseMirror {
          outline: none;
        }
        
        .ProseMirror ul[data-type="taskList"] {
          list-style: none;
          padding: 0;
        }
        
        .ProseMirror ul[data-type="taskList"] li {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
        }
        
        .ProseMirror ul[data-type="taskList"] li > label {
          flex-shrink: 0;
          margin-top: 0.25rem;
        }
        
        .ProseMirror ul[data-type="taskList"] li > div {
          flex: 1;
        }
        
        .ProseMirror ul[data-type="taskList"] input[type="checkbox"] {
          width: 1rem;
          height: 1rem;
          cursor: pointer;
        }
        
        .ProseMirror table {
          border-collapse: collapse;
          width: 100%;
          margin: 1rem 0;
        }
        
        .ProseMirror table td,
        .ProseMirror table th {
          border: 1px solid #e5e7eb;
          padding: 0.5rem;
          min-width: 100px;
        }
        
        .ProseMirror table th {
          background-color: #f9fafb;
          font-weight: 600;
        }
        
        .ProseMirror pre {
          background-color: #1f2937;
          color: #f9fafb;
          padding: 1rem;
          border-radius: 0.5rem;
          overflow-x: auto;
        }
        
        .ProseMirror pre code {
          background: none;
          color: inherit;
          font-size: 0.875rem;
          padding: 0;
        }
        
        .ProseMirror blockquote {
          border-left: 4px solid #e5e7eb;
          padding-left: 1rem;
          font-style: italic;
          color: #6b7280;
        }
        
        .ProseMirror hr {
          border: none;
          border-top: 2px solid #e5e7eb;
          margin: 1.5rem 0;
        }
        
        .ProseMirror iframe {
          border-radius: 0.5rem;
          max-width: 100%;
        }
        
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #9ca3af;
          pointer-events: none;
          height: 0;
        }
        
        /* Callout specific styles */
        .callout p {
          margin: 0.25rem 0;
        }
        
        .callout p:first-child {
          margin-top: 0;
        }
        
        .callout p:last-child {
          margin-bottom: 0;
        }
        
        /* Math block styles */
        .katex-display {
          margin: 0.5rem 0;
          overflow-x: auto;
          overflow-y: hidden;
        }
        
        /* Toggle list styles */
        .toggle-list .ProseMirror {
          min-height: auto;
          padding: 0;
        }
      `}</style>
    </div>
  );
}
