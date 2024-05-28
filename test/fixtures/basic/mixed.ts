// @ts-expect-error interop
import cjs from './cjs.cts'

export * from './bar.mts'

export const thousand = cjs.thousand
