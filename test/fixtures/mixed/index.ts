// @ts-expect-error interop
import cjs from './cjs.cts'

export * from '../basic/bar.mts'

export const thousand = cjs.thousand
