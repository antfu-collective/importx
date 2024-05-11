import type { SupportedLoader } from './types'

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

// eslint-disable-next-line node/prefer-global/process
const nodeVersionNumbers = globalThis?.process?.versions?.node?.split('.').map(Number)

/**
 * Detect the 'auto' loader to use for importing the file.
 * @private
 */
export async function detectLoader(
  cache: boolean | null,
  listDependencies: boolean,
  isTsFile: boolean,
): Promise<SupportedLoader> {
  return detectLoaderLogic(
    cache,
    listDependencies,
    isTsFile,
    await isNativeTsImportSupported(),
    isRuntimeSupportsTsx(),
  )
}

export function detectLoaderLogic(
  cache: boolean | null,
  listDependencies: boolean,
  isTsFile: boolean,
  isNativeTsImportSupported: boolean,
  isTsxSupported: boolean,
): SupportedLoader {
  function getLoader() {
    if (isTsxSupported)
      return 'tsx'
    if (listDependencies)
      return 'bundle-require'
    return 'jiti'
  }

  if (cache === false || listDependencies)
    return getLoader()

  if (!isTsFile || isNativeTsImportSupported)
    return 'native'

  return getLoader()
}

/**
 * tsx is supported in Node.js 18.19.0+ and 20.8.0+
 * Otherwise we fallback to jiti
 *
 * @see https://nodejs.org/api/module.html#moduleregisterspecifier-parenturl-options
 */
function isRuntimeSupportsTsx() {
  if (
    !nodeVersionNumbers
    || nodeVersionNumbers[0] < 18
    || (nodeVersionNumbers[0] === 18 && nodeVersionNumbers[1] < 19)
    || (nodeVersionNumbers[0] === 20 && nodeVersionNumbers[1] < 8)
  )
    return false
  return true
}

const reIsTypeScriptFile = /\.[mc]?tsx?$/

export function isTypeScriptFile(path: string) {
  return reIsTypeScriptFile.test(path)
}
