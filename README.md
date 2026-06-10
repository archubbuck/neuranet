# TopicVisualizer

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.2.11.

## Active frontend: standalone prototype

The served frontend is currently the standalone React prototype from `TopicNet Prototype (standalone).html`, not the Angular app under `src/app/`. The Angular code remains in the repo for reference but is no longer bootstrapped.

How it's wired:

- Prototype assets (React, ReactDOM, Babel standalone, JSX modules, fonts) live in [public/prototype/](public/prototype/) and are served at `/prototype/*`.
- [src/index.html](src/index.html) is the unpacked prototype HTML with asset paths rewritten to `prototype/...`.
- [src/main.ts](src/main.ts) is a no-op so Angular CLI produces an empty `main.js` and no Angular bootstrap runs.
- Backups of the original Angular entry points live next to the originals as `src/index.html.angular.bak` and `src/main.ts.angular.bak`.

To re-extract/refresh the prototype from the source HTML (`TopicNet Prototype (standalone).html`):

```bash
node scripts/extract-prototype.mjs        # decompresses bundle into extracted_prototype/
node scripts/install-prototype-index.mjs  # rewrites paths and installs src/index.html
# then copy *.js and *.woff2 from extracted_prototype/ into public/prototype/
```

To roll back to the Angular app:

1. Restore `src/main.ts` from `src/main.ts.angular.bak`.
2. Restore `src/index.html` from `src/index.html.angular.bak`.
3. Remove `public/prototype/`.

## Development server

Run the API and Angular dev server together with one command:

```bash
npm start
```

This launches both processes via `concurrently` (prefixed `api` and `ui` in the output) and shuts them down together if either exits.

If you need to run them independently — for example, to attach a debugger to just one — use:

```bash
npm run start:api   # Express + SQLite on http://localhost:3000
npm run start:ui    # Angular dev server on http://localhost:4200
```

Once both are running, open `http://localhost:4200/`. The Angular dev server proxies `/api/*` to `http://localhost:3000` via `proxy.conf.json`, and data is persisted to `data/topic-visualizer.db`.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
