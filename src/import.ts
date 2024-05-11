import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'
import Debug from 'debug'
import type { ImportxModuleInfo, ImportxOptions } from './types'
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
    parentURL: inputUserUrl,
    cache = null,
    ignoreImportxWarning = false,
    ...otherOptions
  } = options

  let loader = options.loader || 'auto'
  if (loader === 'auto')
    loader = await detectLoader(cache, isTypeScriptFile(specifier))

  const parentPath = (typeof inputUserUrl === 'string' && !inputUserUrl.includes('://'))
    ? inputUserUrl
    : fileURLToPath(inputUserUrl)
  const parentURL = pathToFileURL(parentPath)

  const info: ImportxModuleInfo = {
    loader,
    specifier,
    parentURL,
    parentPath,
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
