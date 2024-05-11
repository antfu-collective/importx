/* eslint-disable node/prefer-global/process */

import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'
import Debug from 'debug'

const debug = Debug('importx')

type ArgumentTypes<T> = T extends (...args: infer U) => any ? U : never

export type SupportedLoader = 'tsx' | 'jiti' | 'bundle-require' | 'native'

export interface ImportxOptions {
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
   *
   * Setting to `null` means it doesn't matter for you.
   *
   * By the spec of ESM, modules are always cached.
   *
   * Meaning that if you want to re-import a module without cache,
   * you can't use native ESM import.
   *
   * `cache: false` does not compatible with following loaders:
   *  - `native`
   *
   * `cache: true` does not compatible with following loaders:
   *  - `tsx`
   *  - `bundle-require`
   *
   * When `false` is passed, the `auto` mode will fallback to `tsx`
   * for all files include non-TypeScript files.
   *
   * @default null
   */
  cache?: boolean | null
  /**
   * Bypass the `importx` options validation and import anyway.
   *
   * The final behavior is determined by the loader and might not always work as your configuration.
   *
   * @default false
   */
  ignoreImportxWarning?: boolean
  /**
   * The URL of the parent module.
   * Usually you pass `import.meta.url` or `__filename` of the module you are doing the importing.
   */
  parentURL: string | URL
  /**
   * The `with` option for native `import()` call.
   *
   * @see https://github.com/tc39/proposal-import-attributes#dynamic-import
   */
  with?: ImportCallOptions['with']
}

export interface ImportxModuleInfo {
  /**
   * Resolved loader used to import the module.
   */
  loader: SupportedLoader
  /**
   * User passed import specifier.
   */
  specifier: string
  /**
   * User passed parent URL.
   */
  parentURL: string
  /**
   * Timestamp when import is initialized.
   */
  timestampInit: number
  /**
   * Timestamp when import is completed.
   */
  timestampLoad: number
  /**
   * List of dependencies of the module, presented as full file URLs.
   * Only available for `tsx` and `bundle-require` loader.
   * Will be `undefined` for other loaders.
   */
  dependencies?: string[]
  /**
   * If an single module instance is imported multiple times, this will be the previous import info.
   */
  previousImportInfo?: ImportxModuleInfo
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

const nodeVersionNumbers = globalThis?.process?.versions?.node?.split('.').map(Number)

/**
 * Detect the 'auto' loader to use for importing the file.
 */
async function detectLoader(cache: boolean | null, isTsFile: boolean): Promise<SupportedLoader> {
  if (cache === false)
    return tsxOrJiti()

  if (!isTsFile || await isNativeTsImportSupported())
    return 'native'

  if (cache === true)
    return 'jiti'

  return tsxOrJiti()
}

async function tsxOrJiti() {
  if (!nodeVersionNumbers)
    return 'tsx'

  /**
   * tsx is supported in Node.js 18.19.0+ and 20.8.0+
   * Otherwise we fallback to jiti
   *
   * @see https://nodejs.org/api/module.html#moduleregisterspecifier-parenturl-options
   */
  if (
    nodeVersionNumbers[0] < 18
    || (nodeVersionNumbers[0] === 18 && nodeVersionNumbers[1] < 19)
    || (nodeVersionNumbers[0] === 20 && nodeVersionNumbers[1] < 8)
  )
    return 'jiti'

  return 'tsx'
}

const reIsTypeScriptFile = /\.[mc]?tsx?$/

export function isTypeScriptFile(path: string) {
  return reIsTypeScriptFile.test(path)
}

const _moduleInfoMap = new WeakMap<any, ImportxModuleInfo>()

/**
 * Get the importx module info from a module instance.
 * Returns `undefined` if the module is not imported by `importx`.
 */
export function getModuleInfo(mod: any): ImportxModuleInfo | undefined {
  return _moduleInfoMap.get(mod)
}

/**
 * Import a TypeScript module at runtime.
 *
 * @param specifier The path to the file to import.
 * @param parentURL The URL of the parent module, usually `import.meta.url` or `__filename`.
 */
export async function importx<T = any>(specifier: string, parentURL: string | URL): Promise<T>
/**
 * Import a TypeScript module at runtime.
 *
 * @param specifier The path to the file to import.
 * @param options Options
 */
export async function importx<T = any>(specifier: string, options: ImportxOptions): Promise<T>
export async function importx<T = any>(specifier: string, options: string | URL | ImportxOptions): Promise<T> {
  if (typeof options === 'string' || options instanceof URL)
    options = { parentURL: options }

  const {
    loaderOptions = {},
    parentURL,
    cache = null,
    ignoreImportxWarning = false,
    ...otherOptions
  } = options

  let loader = options.loader || 'auto'
  if (loader === 'auto')
    loader = await detectLoader(cache, isTypeScriptFile(specifier))

  const parentPath = fileURLToPath(parentURL)

  const info: ImportxModuleInfo = {
    loader,
    specifier,
    parentURL: parentPath,
    timestampInit: Date.now(),
    timestampLoad: -1,
  }

  debug(`[${loader}]`, 'Importing', specifier, 'from', parentURL)

  async function run() {
    switch (loader) {
      case 'native': {
        if (cache === false && !ignoreImportxWarning)
          throw new Error('`cache: false` is not compatible with `native` loader')

        return import(
          specifier[0] === '.'
            ? fileURLToPath(new URL(specifier, parentURL))
            : specifier,
          otherOptions
        )
      }

      case 'tsx': {
        if (cache === true && !ignoreImportxWarning)
          throw new Error('`cache: true` is not compatible with `tsx` loader')

        const dependencies: string[] = []
        info.dependencies = dependencies

        return import('tsx/esm/api')
          .then(r => r.tsImport(
            specifier,
            {
              onImport(url) {
                dependencies.push(url)
              },
              ...loaderOptions.tsx,
              parentURL: parentPath,
            },
          ))
      }

      case 'jiti': {
        return import('jiti')
          .then(r => r.default(parentPath, {
            esmResolve: true,
            ...(cache === false
              ? {
                  cache: false,
                  requireCache: false,
                }
              : {}),
            ...loaderOptions.jiti,
          })(specifier))
      }

      case 'bundle-require': {
        if (cache === true && !ignoreImportxWarning)
          throw new Error('`cache: true` is not compatible with `native` loader')

        const cwd = dirname(parentPath)
        return import('bundle-require')
          .then(r => r.bundleRequire({
            ...loaderOptions.bundleRequire,
            filepath: specifier[0] === '.'
              ? fileURLToPath(new URL(specifier, parentURL))
              : specifier,
            cwd,
          }))
          .then((r) => {
            info.dependencies = r.dependencies
              .map(d => pathToFileURL(join(cwd, d)).href)
            return r.mod
          })
      }
      default: {
        throw new Error(`Unknown loader: ${loader}`)
      }
    }
  }

  const mod = await run()
  info.timestampLoad = Date.now()
  const previous = _moduleInfoMap.get(mod)
  if (previous)
    info.previousImportInfo = previous
  _moduleInfoMap.set(mod, info)
  return mod
}

// Alias for easier import
export { importx as import }
