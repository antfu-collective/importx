import { expect, it } from 'vitest'

const cache = [null, true, false] as const
const deps = [true, false] as const
const isTS = [true, false] as const
const isNativeTsImportSupported = [true, false] as const
const isRuntimeSupportsTsx = [true, false] as const

function f(v: boolean | null) {
  return v == null ? '?' : v ? 'T' : 'F'
}

for (const c of cache) {
  for (const d of deps) {
    for (const t of isTS) {
      for (const n of isNativeTsImportSupported) {
        for (const r of isRuntimeSupportsTsx) {
          it(
            `cache=${f(c)} | deps=${f(d)} | isTS=${f(t)} | nativeTS=${f(n)} | tsx=${f(r)}`,
            async () => {
              const { detectLoaderLogic } = await import('../src/detect')
              const result = detectLoaderLogic(c, d, t, n, r)
              expect(result).toMatchSnapshot()
            },
          )
        }
      }
    }
  }
}
