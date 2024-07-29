import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'pathe'
import Debug from 'debug'
import type { ImportxModuleInfo, ImportxOptions, SupportedLoader } from './types'
import type { LoaderDetectionContext } from './detect'
import { detectLoader, isTypeScriptFile } from './detect'

const debug = Debug('importx')
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
export async function importx<T = any>(specifier: string | URL, parentURL: string | URL): Promise<T>
/**
 * Import a TypeScript module at runtime.
 *
 * @param specifier The path to the file to import.
 * @param options Options
 */
export async function importx<T = any>(specifier: string | URL, options: ImportxOptions): Promise<T>
export async function importx<T = any>(_specifier: string | URL, _options: string | URL | ImportxOptions): Promise<T> {
  const options = (typeof _options === 'string' || _options instanceof URL)
    ? { parentURL: _options }
    : _options

  const {
    loaderOptions = {},
    parentURL: inputUserUrl,
    cache = null,
    type = null,
    excludeLoaders = [],
    listDependencies = null,
    ignoreImportxWarning = false,
    fallbackLoaders = ['jiti'],
    ...otherOptions
  } = options

  let specifier = (_specifier instanceof URL)
    ? fileURLToPath(_specifier)
    : _specifier

  // Normalize Windows path
  specifier = specifier.match(/^[a-z]:/i)
    ? pathToFileURL(specifier).href
    : specifier

  let loader = options.loader || getLoaderFromEnv() || 'auto'
  if (loader === 'auto') {
    const context: LoaderDetectionContext = {
      cache,
      listDependencies,
      type,
      isTs: isTypeScriptFile(specifier),
      excludeLoaders,
    }
    const _loader = await detectLoader(context)
    if (!_loader)
      throw new Error(`[importx] Cannot find a suitable loader for given requirements ${JSON.stringify(context)}`)
    loader = _loader
  }

  const parentPath = (typeof inputUserUrl === 'string' && !inputUserUrl.includes('://'))
    ? inputUserUrl
    : fileURLToPath(inputUserUrl)
  const parentURL = pathToFileURL(parentPath)
  const fullPath = specifier[0] === '.'
    ? fileURLToPath(new URL(specifier, parentURL))
    : specifier

  const info: ImportxModuleInfo = {
    loader,
    cache,
    specifier,
    fullPath,
    parentURL,
    parentPath,
    timestampInit: Date.now(),
    timestampLoad: -1,
  }

  async function run(loader: SupportedLoader) {
    info.loader = loader
    debug(`[${loader}]`, 'Importing', fullPath, 'from', parentPath)

    switch (loader) {
      case 'native': {
        if (cache === false && !ignoreImportxWarning)
          throw new Error('`cache: false` is not compatible with `native` loader')

        return import(fullPath, otherOptions)
      }

      case 'tsx': {
        return import('./loaders/tsx')
          .then(r => r.loader(info, options))
      }

      case 'jiti': {
        return import('./loaders/jiti')
          .then(r => r.loader(info, options))
      }

      case 'bundle-require': {
        if (cache === true && !ignoreImportxWarning)
          throw new Error('`cache: true` is not compatible with `native` loader')

        const cwd = dirname(parentPath)
        return import('bundle-require')
          .then(r => r.bundleRequire({
            format: type === 'commonjs' ? 'cjs' : 'esm',
            ...loaderOptions.bundleRequire,
            filepath: fullPath,
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

  const loaders = new Set([
    loader,
    ...fallbackLoaders || [],
  ])

  let error: unknown | undefined

  for (const loader of loaders) {
    try {
      const mod = await run(loader)
      info.timestampLoad = Date.now()
      const previous = _moduleInfoMap.get(mod)
      if (previous)
        info.previousImportInfo = previous
      _moduleInfoMap.set(mod, info)
      return mod
    }
    catch (err) {
      error = err
      debug(`[${loader}]`, err)
    }
  }

  throw error
}

function getLoaderFromEnv(): SupportedLoader | undefined {
  // eslint-disable-next-line node/prefer-global/process
  if (typeof process !== 'undefined' && process.env)
    // eslint-disable-next-line node/prefer-global/process
    return (process.env.IMPORTX_LOADER as SupportedLoader) || undefined
  return undefined
}

// Alias for easier import
export { importx as import }
