import { createJiti } from 'jiti'
import type { ImportxModuleInfo, ImportxOptions } from '../types'

export async function loader(info: ImportxModuleInfo, options: ImportxOptions): Promise<any> {
  const jiti = createJiti(info.parentPath, {
    interopDefault: true,
    ...(info.cache === false
      ? {
          cache: false,
          requireCache: false,
        }
      : {}),
    ...options.loaderOptions?.jiti,
  })
  const mod = await jiti.import(info.specifier)
  info.dependencies = Object
    .values(jiti.cache || {})
    .map((i: any) => i.filename)
    .filter(Boolean)
  return mod
}
