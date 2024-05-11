# importx

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![bundle][bundle-src]][bundle-href]
[![JSDocs][jsdocs-src]][jsdocs-href]
[![License][license-src]][license-href]

Unified tool for importing TypeScript modules at runtime.

- [`tsx`](#tsx)
- [`jiti`](#jiti)
- [`bundle-require`](#bundle-require)
- [`native`](#native)

## Motivation

It's a common need for tools to support importing TypeScript modules at runtime. For example, to support configure files written in TypeScript.

There are so many ways to do that, each with its own trade-offs and limitations. This library aims to provide a simple, unified API for importing TypeScript modules and swap loaders as ease.

By default, it also provides a smart "auto" mode that decides the best loader based on the environment:

- Use native `import()` for runtimes that support directly importing TypeScript modules (Deno, Bun, or `ts-node`, `tsx` CLI).
- Use `tsx` for modern module environments.
- Use `jiti` for older Node.js that don't support `tsx`.
- Use `bundle-require` when you want to import a module without the ESM cache.

## Usage

```bash
npm i importx
```

```ts
const mod = await import('importx').then(x => x.import('./path/to/module.ts', import.meta.url))
```

## Loaders

### `auto`

Automatically choose the best loader based on the environment.

```mermaid
graph TD
  A[Auto] --> IsTS{{"Is importing TypeScript file?"}}
  IsTS --> |No| Cache{{"Import cache?"}}
  Cache --> |Yes| B([native import])
  Cache --> |No| tsx1[tsx]

  IsTS --> |Yes| Cache2{{"Import cache?"}}
  Cache2 --> |Yes| D{{"Supports native TypeScript?"}}
  Cache2 --> |No| tsx2[tsx]
  D --> |Yes| E([native import])
  D --> |No| F{{"Is Node.js version range supports tsx?"}}
  F --> |Yes| G[tsx]
  F --> |No| H[jiti]
```

### `native`

Use the native `import()` to import the module.

### `tsx`

Use [`tsx`](https://github.com/privatenumber/tsx)'s [`tsImport` API](https://tsx.is/node#tsimport) to import the module. Under the hood, it registers [Node.js loader API](https://nodejs.org/api/module.html#moduleregisterspecifier-parenturl-options) and uses [esbuild](https://esbuild.github.io/) to transpile TypeScript to JavaScript.

#### Pros

- Native Node.js loader API, consistent and future-proof.

#### Limitations

- Requires Node.js `^18.18.0`, `^20.6.0` or above.

### `jiti`

Use [`jiti`](https://github.com/unjs/jiti) to import the module. It uses a bundled Babel parser to transpile modules. It runs in CJS mode and has its own cache and module runner.

#### Pros

- Self-contained, does not dependents on esbuild.
- Own cache and module runner, better and flexible cache control.

#### Limitations

- [Does not support top-level await yet](https://github.com/unjs/jiti/issues/72)
- Runs in CJS mode (transpiles all TS/ESM to CJS)

### `bundle-require`

Use [`bundle-require`](https://github.com/egoist/bundle-require) to import the module. It uses `esbuild` to bundle the entry module, saves it to a temporary file, and then imports it.

#### Pros

- Get the file list of module dependencies. Helpful for hot-reloading or manifest generation.

#### Limitations

- It creates a temporary bundle file on importing (will external `node_modules`).
- Can be inefficient where there are many TypeScript modules in the import tree.
- Always import a new module, does not support module cache.

## Cache

By definition, ESM modules are always cached by the runtime, which means you will get the same module instance when importing the same module multiple times. In some scenarios, like a dev server watching for config file changes, the cache may not be desired as you want to get the new module with the latest code on your disk.

`importx` allows you to specify if you want to have the module cache or not, by providing the `cache` option:)

```ts
const mod = await import('importx')
  .then(x => x.import('./path/to/module.ts', {
    cache: false, // <-- this
    parentURL: import.meta.url,
  }))
```

Setting `cache: null` (default) means you don't care about the cache (if you only import the module once).

Note that some loaders always have a cache, and some loaders always have no cache. With the `auto` loader, we will choose the best loader based on your need. Otherwise, an unsupported combination will throw an error. For example:

```ts
// This will throw an error because `bundle-require` does not support cache.
const mod = await import('importx')
  .then(x => x.import('./path/to/module.ts', {
    cache: true,
    loader: 'bundle-require',
    parentURL: import.meta.url,
    // ignoreImportxWarning: true // unless you have this
  }))
```

## Runtime-Loader Compatibility Table

Importing a TypeScript module with `importx`:

<!-- TABLE_START -->

> Generated with version v0.0.2 at 2024-05-11T04:17:16.249Z

|  | native | tsx | jiti | bundle-require |
| ------- | --- | --- | --- | --- |
| node | Import: ❌<br>Cache: ❌<br>No cache: ❌ | Import: ✅<br>Cache: ❌<br>No cache: ✅ | Import: ✅<br>Cache: ✅<br>No cache: ✅ | Import: ✅<br>Cache: ❌<br>No cache: ✅ |
| tsx | Import: ✅<br>Cache: ✅<br>No cache: ❌ | N/A | N/A | N/A |
| deno | Import: ✅<br>Cache: ✅<br>No cache: ❌ | N/A | N/A | N/A |
| bun | Import: ✅<br>Cache: ✅<br>No cache: ❌ | N/A | N/A | N/A |

<!-- TABLE_END -->

## Sponsors

<p align="center">
  <a href="https://cdn.jsdelivr.net/gh/antfu/static/sponsors.svg">
    <img src='https://cdn.jsdelivr.net/gh/antfu/static/sponsors.svg'/>
  </a>
</p>

## License

[MIT](./LICENSE) License © 2023-PRESENT [Anthony Fu](https://github.com/antfu)

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/importx?style=flat&colorA=080f12&colorB=1fa669
[npm-version-href]: https://npmjs.com/package/importx
[npm-downloads-src]: https://img.shields.io/npm/dm/importx?style=flat&colorA=080f12&colorB=1fa669
[npm-downloads-href]: https://npmjs.com/package/importx
[bundle-src]: https://img.shields.io/bundlephobia/minzip/importx?style=flat&colorA=080f12&colorB=1fa669&label=minzip
[bundle-href]: https://bundlephobia.com/result?p=importx
[license-src]: https://img.shields.io/github/license/antfu/importx.svg?style=flat&colorA=080f12&colorB=1fa669
[license-href]: https://github.com/antfu/importx/blob/main/LICENSE
[jsdocs-src]: https://img.shields.io/badge/jsdocs-reference-080f12?style=flat&colorA=080f12&colorB=1fa669
[jsdocs-href]: https://www.jsdocs.io/package/importx
