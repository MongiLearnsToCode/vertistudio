import { defineConfig } from 'electron-vite'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'
import { execFileSync } from 'child_process'

function gitShortHash() {
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim() || 'dev'
  } catch {
    return 'dev'
  }
}

const buildHash = gitShortHash()
const buildDate = new Date().toISOString()
const buildDefines = {
  __BUILD_HASH__: JSON.stringify(buildHash),
  __BUILD_DATE__: JSON.stringify(buildDate),
}

// Optional: Sentry source map upload.
// Only active when SENTRY_AUTH_TOKEN is set (typically in CI).
// Install @sentry/vite-plugin to use: npm install @sentry/vite-plugin
async function loadSentryPlugin() {
  if (!process.env.SENTRY_AUTH_TOKEN) return null
  try {
    const { sentryVitePlugin } = await import('@sentry/vite-plugin')
    return sentryVitePlugin({
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
    })
  } catch {
    return null
  }
}

const sentryPlugin = await loadSentryPlugin()

// Source maps reveal the original TypeScript source if shipped inside the
// asar — anyone who runs `npx asar extract` gets the entire codebase.
// Default OFF for shipped builds. Buyers who want Sentry symbolication
// flip INCLUDE_SOURCEMAPS=1 in their build env AND configure the Sentry
// plugin to upload + delete the maps post-build.
const includeSourceMaps =
  process.env.INCLUDE_SOURCEMAPS === '1' || process.env.NODE_ENV !== 'production'

export default defineConfig({
  main: {
    build: {
      outDir: 'out/main',
      sourcemap: includeSourceMaps,
      rollupOptions: {
        external: ['@sentry/electron/main', '@sentry/vite-plugin'],
      },
    },
    define: buildDefines,
    plugins: [sentryPlugin].filter(Boolean),
    resolve: {
      alias: {
        '@shared': resolve('src/shared'),
        '@main': resolve('src/main'),
        '@logging': resolve('src/logging'),
      }
    }
  },
  preload: {
    build: {
      outDir: 'out/preload'
    },
    resolve: {
      alias: {
        '@shared': resolve('src/shared'),
      }
    }
  },
  renderer: {
    build: {
      outDir: 'out/renderer',
      sourcemap: includeSourceMaps,
      rollupOptions: {
        // motion ships "use client" directives for React Server Components; they mean
        // nothing in Electron and only produce warnings when bundled.
        onwarn(warning, warn) {
          if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return
          warn(warning)
        },
      },
    },
    esbuild: {
      jsx: 'automatic'
    },
    plugins: [tailwindcss(), sentryPlugin].filter(Boolean),
    resolve: {
      alias: {
        '@shared': resolve('src/shared'),
        '@renderer': resolve('src/renderer'),
        '@features': resolve('src/features')
      }
    }
  }
})
