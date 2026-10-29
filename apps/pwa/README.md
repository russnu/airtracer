# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```

You can also install [eslint-plugin-react-x](https://npmx.dev/package/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://npmx.dev/package/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```

## Offline support

AirTracer supports two offline workflows (see `apps/docs/PRD.md` §8.3):

- **Saved passports.** Signed-in users can save a passport from its page. Saved copies are text only and live in IndexedDB.
- **Offline service records.** New records are saved to an IndexedDB outbox first, then uploaded automatically. Pending records are listed at `/sync`.

The offline data layer is in `src/lib/offline/`. Its unit tests run in Node with an in-memory IndexedDB:

```bash
pnpm --filter pwa test
```

### Testing offline behaviour manually

The service worker is only registered in production builds:

```bash
pnpm --filter pwa build
pnpm --filter pwa preview
```

Then in the browser's developer tools:

1. **Application → Service workers:** confirm the worker is active. **Cache storage** should contain the app shell and fonts only, never API responses.
2. **Network → Offline:** reload. You should stay signed in, and an offline banner should appear.
3. Open a saved passport while offline: the saved copy is shown with its last-updated time.
4. Create a service record while offline: it appears on `/sync`. Go back online: it uploads once and disappears from the pending list.
5. **Application → IndexedDB → airtracer:** inspect the `savedPassports`, `outbox`, and `meta` stores.
