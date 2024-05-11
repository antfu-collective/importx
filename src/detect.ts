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
  if (cache === false || listDependencies) {
    return listDependencies
      ? tsxOrBundleRequire ()
      : tsxOrJiti()
  }

  if (!isTsFile || await isNativeTsImportSupported())
    return 'native'

  return listDependencies
    ? tsxOrBundleRequire()
    : tsxOrJiti()
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

async function tsxOrJiti() {
  if (isRuntimeSupportsTsx())
    return 'tsx'
  return 'jiti'
}

async function tsxOrBundleRequire() {
  if (isRuntimeSupportsTsx())
    return 'tsx'
  return 'bundle-require'
}

const reIsTypeScriptFile = /\.[mc]?tsx?$/

export function isTypeScriptFile(path: string) {
  return reIsTypeScriptFile.test(path)
}
