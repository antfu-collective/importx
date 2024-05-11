import { expect, it } from 'vitest'

const cache = [null, true, false] as const
const deps = [false, true] as const
const isTS = [true, false] as const
const isNativeTsImportSupported = [false, true] as const
const isRuntimeSupportsTsx = [true, false] as const

function f(v: boolean | null) {
  return v == null ? '❓' : v ? '✅' : '❌'
}

for (const r of isRuntimeSupportsTsx) {
  for (const c of cache) {
    for (const d of deps) {
      for (const t of isTS) {
        for (const n of isNativeTsImportSupported) {
          it(
            `tsx=${f(r)} | cache=${f(c)} | deps=${f(d)} | isTS=${f(t)} | nativeTS=${f(n)}`,
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
