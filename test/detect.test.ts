import { expect, it } from 'vitest'

const cache = [null, true, false] as const
const deps = [false, true] as const
const isTS = [true, false] as const
const type = [null, 'module', 'commonjs'] as const
const isNativeTsImportSupported = [false, true] as const
const isRuntimeSupportsTsx = [true, false] as const

function f(v: boolean | string | null) {
  if (typeof v === 'string')
    return v
  return v == null ? '❓' : v ? '✅' : '❌'
}

for (const r of isRuntimeSupportsTsx) {
  for (const c of cache) {
    for (const d of deps) {
      for (const i of isTS) {
        for (const t of type) {
          for (const n of isNativeTsImportSupported) {
            it(`tsx=${f(r)} | cache=${f(c)} | deps=${f(d)} | type=${f(t)} | isTS=${f(i)} | nativeTS=${f(n)}`, async () => {
              const { detectLoader, _createLoaderMatrix } = await import('../src/detect')

              const result = await detectLoader(
                {
                  cache: c,
                  listDependencies: d,
                  type: t,
                  isTs: i,
                  excludeLoaders: [],
                },
                await _createLoaderMatrix({
                  isNativeTsImportSupported: n,
                  isRuntimeSupportsTsx: r,
                }),
              )

              expect(result).toMatchSnapshot()
            })
          }
        }
      }
    }
  }
}
