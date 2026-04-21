import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu, FloatingMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Link as LinkIcon,
  Image as ImageIcon,
  Undo,
  Redo,
} from 'lucide-react';
import { SlashCommandExtension, slashCommandProps, setSlashCommandUpdater } from './editor-slash-extension';
import { SlashCommandList, type SlashCommandRef } from './editor-slash-commands';

interface RichTextEditorProps {
  content?: object;
  onChange?: (content: object) => void;
  placeholder?: string;
  editable?: boolean;
}

export function RichTextEditor({
  content,
  onChange,
  placeholder = 'Start typing...',
  editable = true,
}: RichTextEditorProps) {
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const slashMenuRef = useRef<HTMLDivElement>(null);
  const slashListRef = useRef<SlashCommandRef>(null);
  const [, forceUpdate] = useState({});

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Image,
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
      SlashCommandExtension,
    ],
    content: content || { type: 'doc', content: [] },
    editable,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getJSON());
    },
  });

  useEffect(() => {
    setSlashCommandUpdater(() => {
      const hasProps = slashCommandProps !== null;
      setShowSlashMenu(hasProps);
      forceUpdate({});
    });
    return () => setSlashCommandUpdater(null);
  }, []);

  useEffect(() => {
    if (!editor) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!showSlashMenu || !slashCommandProps) return;
      if (slashListRef.current) {
        const handled = slashListRef.current.onKeyDown({ event });
        if (handled) {
          event.preventDefault();
        }
      }
    };

    const view = editor.view;
    view.dom.addEventListener('keydown', handleKeyDown);
    return () => {
      view.dom.removeEventListener('keydown', handleKeyDown);
    };
  }, [editor, showSlashMenu]);

  const slashMenuPosition = useCallback(() => {
    if (!slashCommandProps?.clientRect) return { top: 0, left: 0 };
    const rect = slashCommandProps.clientRect();
    if (!rect) return { top: 0, left: 0 };
    const editorRect = editor?.view.dom.getBoundingClientRect();
    if (!editorRect) return { top: rect.bottom + 8, left: rect.left };
    return {
      top: rect.bottom - editorRect.top + 8,
      left: rect.left - editorRect.left,
    };
  }, [editor]);

  if (!editor) {
    return null;
  }

  const ToolbarButton = ({
    onClick,
    isActive = false,
    disabled = false,
    children,
  }: {
    onClick: () => void;
    isActive?: boolean;
    disabled?: boolean;
    children: React.ReactNode;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        p-2 rounded transition-colors
        ${isActive ? 'bg-linear-elevated text-linear-text' : 'text-linear-text-secondary hover:bg-linear-elevated'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      {children}
    </button>
  );

  const pos = slashMenuPosition();

  return (
    <div className="border border-linear-border rounded-lg overflow-hidden relative">
      {/* Toolbar */}
      {editable && (
        <div className="flex items-center gap-1 p-2 border-b border-linear-border bg-linear-elevated/50">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive('bold')}
          >
            <Bold className="w-4 h-4" />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive('italic')}
          >
            <Italic className="w-4 h-4" />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            isActive={editor.isActive('strike')}
          >
            <Strikethrough className="w-4 h-4" />
          </ToolbarButton>

          <div className="w-px h-6 bg-linear-elevated mx-1" />

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            isActive={editor.isActive('heading', { level: 1 })}
          >
            <Heading1 className="w-4 h-4" />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            isActive={editor.isActive('heading', { level: 2 })}
          >
            <Heading2 className="w-4 h-4" />
          </ToolbarButton>

          <div className="w-px h-6 bg-linear-elevated mx-1" />

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive('bulletList')}
          >
            <List className="w-4 h-4" />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive('orderedList')}
          >
            <ListOrdered className="w-4 h-4" />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            isActive={editor.isActive('taskList')}
          >
            <CheckSquare className="w-4 h-4" />
          </ToolbarButton>

          <div className="w-px h-6 bg-linear-elevated mx-1" />

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            isActive={editor.isActive('blockquote')}
          >
            <Quote className="w-4 h-4" />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCode().run()}
            isActive={editor.isActive('code')}
          >
            <Code className="w-4 h-4" />
          </ToolbarButton>

          <div className="w-px h-6 bg-linear-elevated mx-1" />

          <ToolbarButton
            onClick={() => {
              const url = window.prompt('Enter URL:');
              if (url) {
                editor.chain().focus().setLink({ href: url }).run();
              }
            }}
            isActive={editor.isActive('link')}
          >
            <LinkIcon className="w-4 h-4" />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => {
              const url = window.prompt('Enter image URL:');
              if (url) {
                editor.chain().focus().setImage({ src: url }).run();
              }
            }}
          >
            <ImageIcon className="w-4 h-4" />
          </ToolbarButton>

          <div className="flex-1" />

          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
          >
            <Undo className="w-4 h-4" />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
          >
            <Redo className="w-4 h-4" />
          </ToolbarButton>
        </div>
      )}

      {/* Bubble Menu (appears on selection) */}
      {editable && (
        <BubbleMenu editor={editor}>
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
              onClick={() => editor.chain().focus().toggleLink({ href: '' }).run()}
              isActive={editor.isActive('link')}
            >
              <LinkIcon className="w-4 h-4 text-white" />
            </ToolbarButton>
          </div>
        </BubbleMenu>
      )}

      {/* Floating Menu (appears on empty line) */}
      {editable && (
        <FloatingMenu editor={editor}>
          <div className="flex items-center gap-1 p-1 bg-linear-elevated border border-linear-border rounded-lg shadow-lg shadow-black/40">
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              isActive={editor.isActive('heading', { level: 1 })}
            >
              <Heading1 className="w-4 h-4 text-white" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              isActive={editor.isActive('bulletList')}
            >
              <List className="w-4 h-4 text-white" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleTaskList().run()}
              isActive={editor.isActive('taskList')}
            >
              <CheckSquare className="w-4 h-4 text-white" />
            </ToolbarButton>
          </div>
        </FloatingMenu>
      )}

      {/* Editor Content */}
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none p-4 min-h-50 focus:outline-none"
      />

      {/* Slash Command Menu */}
      {showSlashMenu && slashCommandProps && (
        <div
          ref={slashMenuRef}
          className="absolute z-50"
          style={{ top: pos.top, left: pos.left }}
        >
          <SlashCommandList
            ref={slashListRef}
            items={slashCommandProps.items}
            command={slashCommandProps.command}
          />
        </div>
      )}
    </div>
  );
}
