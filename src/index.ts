/* eslint-disable node/prefer-global/process */

import { fileURLToPath } from 'node:url'
import Debug from 'debug'

const debug = Debug('importx')

type ArgumentTypes<T> = T extends (...args: infer U) => any ? U : never

export type SupportedLoader = 'tsx' | 'jiti' | 'bundle-require' | 'native'

export interface ImportTsOptions {
  /**
   * Loader to use for importing the file.
   * @default 'auto'
   */
  loader?: SupportedLoader | 'auto'
  /**
   * Options for each loader
   * Only the loader that is used will be applied.
   */
  loaderOptions?: {
    /**
     * Options for `tsx` loader.
     *
     * @see https://tsx.is/node#tsimport
     */
    tsx?: Omit<Partial<Exclude<ArgumentTypes<typeof import('tsx/esm/api').tsImport>['1'], string>>, 'parentURL'>
    /**
     * Options for `jiti` loader.
     *
     * @default { esmResolve: true }
     * @see https://github.com/unjs/jiti#options
     */
    jiti?: import('jiti').JITIOptions
    /**
     * Options for `bundle-require` loader.
     *
     * @see https://github.com/egoist/bundle-require
     * @see https://www.jsdocs.io/package/bundle-require#Options
     */
    bundleRequire?: Omit<Partial<import('bundle-require').Options>, 'filepath' | 'cwd'>
  }
  /**
   * Whether to cache the imported module.
   * By the spec of ESM, modules are always cached.
   *
   * Meaning that if you want to re-import a module without cache,
   * you can't use native ESM import.
   *
   * Currently mode `native` and `tsx` does not support disabling cache.
   *
   * When `false` is passed, the `auto` mode will fallback to `bundle-require`
   * for all files include non-TypeScript files.
   *
   * @default true
   */
  cache?: boolean
  /**
   * The URL of the parent module.
   * Usually you pass `import.meta.url` or `__filename` of the module you are doing the importing.
   */
  parentURL: string
  /**
   * The `with` option for native `import()` call.
   *
   * @see https://github.com/tc39/proposal-import-attributes#dynamic-import
   */
  with?: ImportCallOptions['with']
}

let _isNativeTsImportSupported: boolean | undefined

/**
 * Import a tiny TypeScript module to verify if native TypeScript import is supported.
 */
export async function isNativeTsImportSupported(): Promise<boolean> {
  if (_isNativeTsImportSupported === undefined) {
    try {
      const modName = 'dummy.mts'
      const mod = await import(`../${modName}`)
      _isNativeTsImportSupported = mod.default === 'dummy'
    }
    catch {
      _isNativeTsImportSupported = false
    }
  }
  return _isNativeTsImportSupported
}

async function _detectLoaderImpl(): Promise<SupportedLoader> {
  if (await isNativeTsImportSupported())
    return 'native'

  const nodeVersion = globalThis?.process?.versions?.node?.split('.').map(Number)
  if (!nodeVersion)
    return 'tsx'

  /**
   * tsx is supported in Node.js 18.19.0+ and 20.8.0+
   * Otherwise we fallback to jiti
   *
   * @see https://nodejs.org/api/module.html#moduleregisterspecifier-parenturl-options
   */
  if (
    nodeVersion[0] < 18
    || (nodeVersion[0] === 18 && nodeVersion[1] < 19)
    || (nodeVersion[0] === 20 && nodeVersion[1] < 8)
  )
    return 'jiti'

  return 'tsx'
}

let _loader: Promise<SupportedLoader>

/**
 * Detect the 'auto' loader to use for importing the file.
 */
export async function detectLoader() {
  if (!_loader)
    _loader = _detectLoaderImpl()
  return _loader
}

const reIsTypeScriptFile = /\.[mc]?tsx?$/

export function isTypeScriptFile(path: string) {
  return path.match(reIsTypeScriptFile)
}

/**
 * Import a TypeScript module at runtime.
 *
 * @param path The path to the file to import.
 * @param parentURL The URL of the parent module, usually `import.meta.url` or `__filename`.
 */
export async function importTs<T = any>(path: string, parentURL: string): Promise<T>
/**
 * Import a TypeScript module at runtime.
 *
 * @param path The path to the file to import.
 * @param options Options
 */
export async function importTs<T = any>(path: string, options: ImportTsOptions): Promise<T>
export async function importTs<T = any>(path: string, options: string | ImportTsOptions): Promise<T> {
  if (typeof options === 'string')
    options = { parentURL: options }

  const {
    loaderOptions = {},
    parentURL,
    cache = true,
    ...otherOptions
  } = options

  let loader = options.loader || 'auto'
  if (loader === 'auto') {
    if (cache === false) {
      loader = 'bundle-require'
    }
    else {
      loader = isTypeScriptFile(path)
        ? await detectLoader()
        : 'native'
    }
  }

  debug(`[${loader}]`, 'Importing', path, 'from', parentURL)

  switch (loader) {
    case 'native': {
      return import(
        path[0] === '.'
          ? fileURLToPath(new URL(path, parentURL))
          : path,
        otherOptions
      )
    }

    case 'tsx': {
      return import('tsx/esm/api')
        .then(r => r.tsImport(
          path,
          {
            ...loaderOptions.tsx,
            parentURL: fileURLToPath(parentURL),
          },
        ))
    }

    case 'jiti': {
      return import('jiti')
        .then(r => r.default(fileURLToPath(parentURL), {
          esmResolve: true,
          ...loaderOptions.jiti,
        })(path))
    }

    case 'bundle-require': {
      return import('bundle-require')
        .then(r => r.bundleRequire({
          ...loaderOptions.bundleRequire,
          filepath: path,
          cwd: fileURLToPath(parentURL),
        }))
        .then(r => r.mod)
    }
    default: {
      throw new Error(`Unknown loader: ${loader}`)
    }
  }
}

// Alias for easier import
export { importTs as import }
