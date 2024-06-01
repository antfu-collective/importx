import type { register as registerESM } from 'tsx/esm/api'
// import type { register as registerCJS } from 'tsx/cjs/api'
import type { ImportxModuleInfo, ImportxOptions } from '../types'

const apiESM = new Map<string, ReturnType<typeof registerESM>>()
// const apiCJS = new Map<string, ReturnType<typeof registerCJS>>()

export async function loader(info: ImportxModuleInfo, options: ImportxOptions) {
  const dependencies: string[] = []
  info.dependencies = dependencies

  let isCJS = options.type === 'commonjs' || !!info.fullPath.match(/\.c[tj]s$/)
  if (!isCJS && info.fullPath.match(/\.[tj]s$/)) {
    const pkg = await import('pkg-types')
      .then(r => r.readPackageJSON(info.fullPath))
      .catch(() => ({ type: 'commonjs' }))
    isCJS = pkg?.type === undefined || pkg?.type === 'commonjs'
  }

  if (isCJS) {
    const { require } = await import('tsx/cjs/api')

    // TODO: support cache
    const collectDependencies = (module: any) => [
      module.filename,
      ...module.children?.flatMap(collectDependencies),
    ]

    const mod = require(info.specifier, info.parentPath)

    if (options.listDependencies) {
      const resolvedPath = require.resolve(info.specifier, info.parentURL)
      const cache = require.cache[resolvedPath]
      if (cache) {
        dependencies.push(...collectDependencies(cache))
      }
    }

    return mod
  }
  else {
    const { register, tsImport } = await import('tsx/esm/api')
    // Cached version
    // https://tsx.is/node/esm#scoped-registration
    if (info.cache === true) {
      if (!apiESM.get(info.fullPath)) {
        apiESM.set(info.fullPath, register({
          onImport(url) {
            dependencies.push(url)
          },
          namespace: `importx_${Math.random().toString(36).slice(2)}`,
          ...options.loaderOptions?.tsx,
        }))
      }

      return await (apiESM.get(info.fullPath)! as any).import(
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
}
