import type { FeaturesOptions, SupportedLoader } from './types'

export interface LoaderMatrix {
  name: SupportedLoader
  supported?: boolean
  cache: boolean[]
  listDependencies: boolean[]
  type: ('module' | 'commonjs')[]
  importTS: boolean[]
}

export interface LoaderDetectionContext extends Required<FeaturesOptions> {
  isTs: boolean
}

let _loaderMatrix: LoaderMatrix[]

/**
 * Internal function for tests
 */
export async function _createLoaderMatrix(options: {
  isNativeTsImportSupported: boolean
  isRuntimeSupportsTsx: boolean
}) {
  const matrix: LoaderMatrix[] = [
    {
      name: 'native',
      cache: [true],
      listDependencies: [false],
      type: ['module', 'commonjs'],
      importTS: options.isNativeTsImportSupported
        ? [true, false]
        : [false],
    },
    {
      name: 'tsx',
      supported: options.isRuntimeSupportsTsx,
      type: ['module', 'commonjs'],
      cache: [true, false],
      listDependencies: [true, false],
      importTS: [true, false],
    },
    {
      name: 'jiti',
      type: ['commonjs'],
      cache: [true, false],
      listDependencies: [true, false],
      importTS: [true, false],
    },
    {
      name: 'bundle-require',
      type: ['module', 'commonjs'],
      cache: [false],
      listDependencies: [true],
      importTS: [true, false],
    },
  ]

  return matrix
    .filter(i => i.supported !== false)
}

export async function getLoaderMatrix(): Promise<LoaderMatrix[]> {
  if (_loaderMatrix)
    return _loaderMatrix

  _loaderMatrix = await _createLoaderMatrix({
    isNativeTsImportSupported: await isNativeTsImportSupported(),
    isRuntimeSupportsTsx: isRuntimeSupportsTsx(),
  })

  return _loaderMatrix
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

// eslint-disable-next-line node/prefer-global/process
const nodeVersionNumbers = globalThis?.process?.versions?.node?.split('.').map(Number)

/**
 * Detect the 'auto' loader to use for importing the file.
 * @private
 */
export async function detectLoader(
  context: LoaderDetectionContext,
  matrix?: LoaderMatrix[],
): Promise<SupportedLoader | null> {
  matrix = matrix || await getLoaderMatrix()

  for (const loader of matrix) {
    if (context.excludeLoaders?.includes(loader.name))
      continue
    if (
      (context.cache === null || loader.cache.includes(context.cache))
      && (context.listDependencies === null || loader.listDependencies.includes(context.listDependencies))
      && (context.type === null || loader.type.includes(context.type))
      && loader.importTS.includes(context.isTs)
    ) {
      return loader.name
    }
  }

  return null
}

/**
 * tsx is supported in 20.8.0+
 * Otherwise we fallback to jiti
 *
 * @see https://nodejs.org/api/module.html#moduleregisterspecifier-parenturl-options
 */
function isRuntimeSupportsTsx() {
  if (
    !nodeVersionNumbers
    // || nodeVersionNumbers[0] < 18
    // || (nodeVersionNumbers[0] === 18 && nodeVersionNumbers[1] < 19)
    || nodeVersionNumbers[0] < 20
    || (nodeVersionNumbers[0] === 20 && nodeVersionNumbers[1] < 8)
  ) {
    return false
  }
  return true
}

const reIsTypeScriptFile = /\.[mc]?tsx?$/

export function isTypeScriptFile(path: string) {
  return reIsTypeScriptFile.test(path)
}
