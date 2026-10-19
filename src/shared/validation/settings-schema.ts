import { z } from 'zod';
import { DEFAULT_MODEL } from '@shared/ai/models';

export const themeSchema = z.enum(['system', 'light', 'dark', 'slate', 'midnight', 'hc']);

// Free-text user-facing display name. Bounded so UI that renders it in
// chrome (sidebar, title bar, greeting) never has to guard against huge strings.
export const displayNameSchema = z
  .string()
  .min(1, 'Display name is required')
  .max(40, 'Display name must be 40 characters or fewer');

// UI density. Compact rescales the Tailwind 4 --spacing token via a
// [data-density="compact"] block in global.css, which propagates to every
// p-*/m-*/gap-* utility. Default 'comfortable' matches the original layout.
export const densitySchema = z.enum(['comfortable', 'compact']);

// Anthropic model used by askClaude()/streamClaude() when a call does not pass
// one. Any model id string is accepted so new models work without a code change;
// the AI screen offers the current ones from src/shared/ai/models.ts.
export const aiModelSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z0-9_.:-]+$/, 'model contains invalid characters');

export const appSettingsSchema = z.object({
  theme: themeSchema,
  displayName: displayNameSchema,
  density: densitySchema,
  aiModel: aiModelSchema,
  videoPreset: z.enum(['balanced', 'quality', 'master']),
  videoFit: z.enum(['auto', 'keep', 'crop', 'pad', 'blur']),
  videoEncoder: z.enum(['libx264', 'h264_nvenc', 'h264_qsv', 'h264_vaapi']),
  videoKeepFps: z.boolean(),
  videoBoth: z.boolean(),
  automaticUpdates: z.boolean(),
  videoOutputDirectory: z.string().max(32768),
});

export type AppSettings = z.infer<typeof appSettingsSchema>;
export type AppSettingKey = keyof AppSettings;

export const APP_SETTINGS_DEFAULTS: AppSettings = {
  theme: 'system',
  displayName: 'User',
  density: 'comfortable',
  aiModel: DEFAULT_MODEL,
  videoPreset: 'quality',
  videoFit: 'auto',
  videoEncoder: 'libx264',
  videoKeepFps: true,
  videoBoth: false,
  automaticUpdates: false,
  videoOutputDirectory: '',
};

const settingValueSchemas = {
  theme: themeSchema,
  displayName: displayNameSchema,
  density: densitySchema,
  aiModel: aiModelSchema,
  videoPreset: appSettingsSchema.shape.videoPreset,
  videoFit: appSettingsSchema.shape.videoFit,
  videoEncoder: appSettingsSchema.shape.videoEncoder,
  videoKeepFps: appSettingsSchema.shape.videoKeepFps,
  videoBoth: appSettingsSchema.shape.videoBoth,
  automaticUpdates: appSettingsSchema.shape.automaticUpdates,
  videoOutputDirectory: appSettingsSchema.shape.videoOutputDirectory,
} as const satisfies { [K in AppSettingKey]: z.ZodType<AppSettings[K]> };

export const settingsGetRequestSchema = z.object({
  key: appSettingsSchema.keyof(),
});

export const settingsSetRequestSchema = z
  .object({
    key: appSettingsSchema.keyof(),
    value: z.unknown(),
  })
  .superRefine((data, ctx) => {
    const schema = settingValueSchemas[data.key as AppSettingKey];
    const result = schema.safeParse(data.value);
    if (!result.success) {
      for (const issue of result.error.issues) {
        ctx.addIssue({ ...issue, path: ['value', ...issue.path] });
      }
    }
  });
