import { register, tsImport } from 'tsx/esm/api'
import type { ImportxModuleInfo, ImportxOptions } from '../types'

const api = new Map<string, ReturnType<typeof register>>()

export async function loader(info: ImportxModuleInfo, options: ImportxOptions) {
  const dependencies: string[] = []
  info.dependencies = dependencies

  // Cached version
  // https://tsx.is/node/esm#scoped-registration
  if (info.cache === true) {
    if (!api.get(info.fullPath)) {
      api.set(info.fullPath, register({
        onImport(url) {
          dependencies.push(url)
        },
        namespace: `importx_${Math.random().toString(36).slice(2)}`,
        ...options.loaderOptions?.tsx,
      }))
    }

    return await (api.get(info.fullPath)! as any).import(
      info.specifier,
      info.parentPath,
    )
  }

  // Uncached version
  // https://tsx.is/node/ts-import
  return await tsImport(
    info.specifier,
    {
      onImport(url) {
        dependencies.push(url)
      },
      ...options.loaderOptions?.tsx,
      parentURL: info.parentPath,
    },
  )
}
