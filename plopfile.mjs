import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const sanitize = (s) => String(s ?? '').trim();

const splitWords = (s) =>
  sanitize(s)
    .split(/[-_:\s]+|(?=[A-Z])/)
    .filter(Boolean)
    .map((w) => w.toLowerCase());

const pcase = (s) =>
  splitWords(s)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');

const ccase = (s) => {
  const p = pcase(s);
  return p.charAt(0).toLowerCase() + p.slice(1);
};

const kcase = (s) => splitWords(s).join('-');

const Ccase = (s) => splitWords(s).join('_').toUpperCase();

// "word-counter" -> "Word Counter" (the Sidebar label)
const tcase = (s) =>
  splitWords(s)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

export default function plopConfig(plop) {
  plop.setHelper('pcase', pcase);
  plop.setHelper('ccase', ccase);
  plop.setHelper('kcase', kcase);
  plop.setHelper('Ccase', Ccase);
  plop.setHelper('tcase', tcase);

  plop.setGenerator('feature', {
    description: 'Scaffold a new feature module + register it in screens-registry.ts',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'Feature name (PascalCase, e.g. MyFeature):',
        validate: (value) =>
          /^[A-Za-z][A-Za-z0-9 _-]*$/.test(sanitize(value)) ||
          'Use letters/digits, start with a letter (e.g., MyFeature, my-feature, my_feature).',
      },
    ],
    actions: [
      {
        type: 'add',
        path: 'src/features/{{kcase name}}/components/{{pcase name}}Screen.tsx',
        templateFile: 'scripts/templates/feature/Screen.tsx.hbs',
      },
      {
        type: 'add',
        path: 'src/features/{{kcase name}}/types.ts',
        templateFile: 'scripts/templates/feature/types.ts.hbs',
      },
      // Add the screen import + registry entry. The Sidebar and the App
      // routing both read from this file.
      {
        type: 'modify',
        path: 'src/renderer/screens-registry.ts',
        pattern: /(\r?\n\r?\nexport type ScreenSection)/,
        template:
          "\nimport { {{pcase name}}Screen } from '@features/{{kcase name}}/components/{{pcase name}}Screen';$1",
      },
      // New screens go in the main section, just above Settings.
      // The entry uses the `Sparkles` icon, which the registry already imports.
      {
        type: 'modify',
        path: 'src/renderer/screens-registry.ts',
        pattern: /(\r?\n {2}\{\s*id: 'settings',)/,
        template:
          "\n  {\n    id: '{{kcase name}}',\n    label: '{{tcase name}}',\n    icon: Sparkles,\n    section: 'main',\n    Component: {{pcase name}}Screen,\n  },$1",
      },
    ],
  });

  plop.setGenerator('ipc', {
    description:
      'Wire up a new IPC channel across all 5 places (lowercase domain:action, e.g. demo:ping)',
    prompts: [
      {
        type: 'input',
        name: 'channel',
        message: 'Channel name (lowercase domain:action, e.g. demo:ping):',
        validate: (value) =>
          /^[a-z][a-z0-9-]*:[a-z][a-z0-9-]*$/.test(sanitize(value)) ||
          'Use lowercase domain:action format (e.g., demo:ping).',
      },
    ],
    actions: (data) => {
      const channel = sanitize(data.channel);
      const [domain, action] = channel.split(':');
      data.domain = domain;
      data.action = action;

      const handlerPath = resolve(`src/main/ipc/${domain}-handlers.ts`);
      const schemaPath = resolve(`src/shared/validation/${domain}-schema.ts`);

      if (existsSync(handlerPath)) {
        throw new Error(
          `${handlerPath} already exists. Pick a different domain or wire the channel manually.`,
        );
      }
      if (existsSync(schemaPath)) {
        throw new Error(
          `${schemaPath} already exists. Pick a different domain or wire the channel manually.`,
        );
      }

      return [
        {
          type: 'modify',
          path: 'src/shared/ipc/channels.ts',
          pattern: /(} as const;)/,
          template: "  {{Ccase channel}}: '{{channel}}',\n$1",
        },
        {
          type: 'append',
          path: 'src/shared/ipc/types.ts',
          template:
            '\n// {{channel}}\n// TODO: replace with real request fields (e.g. interface { id: string })\nexport type {{pcase channel}}Request = Record<string, never>;\n\nexport interface {{pcase channel}}Response {\n  success: boolean;\n  error?: string;\n}\n',
        },
        {
          type: 'add',
          path: 'src/shared/validation/{{domain}}-schema.ts',
          templateFile: 'scripts/templates/ipc/schema.ts.hbs',
        },
        {
          type: 'add',
          path: 'src/main/ipc/{{domain}}-handlers.ts',
          templateFile: 'scripts/templates/ipc/handler.ts.hbs',
        },
        {
          type: 'modify',
          path: 'src/main/ipc/register.ts',
          pattern: /(\r?\nexport function registerAllIPC)/,
          template:
            "\nimport { handle{{pcase channel}} } from './{{domain}}-handlers';\n$1",
        },
        {
          type: 'modify',
          path: 'src/main/ipc/register.ts',
          pattern: /(^}\s*$)/m,
          template: '  ipcMain.handle(IPC.{{Ccase channel}}, handle{{pcase channel}});\n$1',
        },
        {
          type: 'modify',
          path: 'src/preload/preload.ts',
          pattern: /(\r?\n} from '@shared\/ipc\/types';)/,
          template: '\n  {{pcase channel}}Request,\n  {{pcase channel}}Response,$1',
        },
        {
          type: 'modify',
          path: 'src/preload/preload.ts',
          pattern: /(\r?\n};\r?\n\r?\ncontextBridge\.exposeInMainWorld)/,
          template:
            '\n  {{ccase channel}}: (data: {{pcase channel}}Request): Promise<{{pcase channel}}Response> =>\n    ipcRenderer.invoke(IPC.{{Ccase channel}}, data),$1',
        },
        {
          type: 'modify',
          path: 'src/renderer/types/electron.d.ts',
          pattern: /(\r?\n} from '@shared\/ipc\/types';)/,
          template: '\n  {{pcase channel}}Request,\n  {{pcase channel}}Response,$1',
        },
        {
          type: 'modify',
          path: 'src/renderer/types/electron.d.ts',
          pattern: /(\r?\n}\r?\n\r?\ndeclare global)/,
          template:
            '\n  {{ccase channel}}: (data: {{pcase channel}}Request) => Promise<{{pcase channel}}Response>;$1',
        },
      ];
    },
  });
}
