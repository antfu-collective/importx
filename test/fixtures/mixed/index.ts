import * as cjs from './cjs.cts'

export * from '../basic/bar.mts'

// @ts-expect-error missing types
export const thousand = cjs.thousand
