import { Extension } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import { slashCommands, type SlashCommandItem } from './editor-slash-commands';

export let slashCommandProps: {
  items: SlashCommandItem[];
  command: (item: SlashCommandItem) => void;
  clientRect: (() => DOMRect | null) | null;
} | null = null;

let updateCallback: (() => void) | null = null;

export function setSlashCommandUpdater(cb: (() => void) | null) {
  updateCallback = cb;
}

function notify() {
  updateCallback?.();
}

export const SlashCommandExtension = Extension.create({
  name: 'slash-command',

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        char: '/',
        startOfLine: false,
        command: ({ editor, range, props }) => {
          (props as SlashCommandItem).command({ editor, range });
        },
        items: ({ query }) => {
          const q = query.toLowerCase().trim();
          if (!q) return slashCommands;
          return slashCommands.filter((item) =>
            item.title.toLowerCase().includes(q) ||
            item.description.toLowerCase().includes(q)
          );
        },
        render: () => {
          return {
            onStart: (props) => {
              slashCommandProps = {
                items: props.items as SlashCommandItem[],
                command: props.command as (item: SlashCommandItem) => void,
                clientRect: props.clientRect as () => DOMRect | null,
              };
              notify();
            },
            onUpdate: (props) => {
              slashCommandProps = {
                items: props.items as SlashCommandItem[],
                command: props.command as (item: SlashCommandItem) => void,
                clientRect: props.clientRect as () => DOMRect | null,
              };
              notify();
            },
            onKeyDown: () => {
              return false;
            },
            onExit: () => {
              slashCommandProps = null;
              notify();
            },
          };
        },
      }),
    ];
  },
});
