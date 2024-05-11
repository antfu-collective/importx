/* eslint-disable node/prefer-global/process */
/* eslint-disable no-console */

const LOADER = process.env.IMPORTX_LOADER || 'auto'

console.log('loading using', LOADER)

const result = await import('../../dist/index.mjs')
  .then(x => x.import('./foo.mts', {
    loader: LOADER,
    parentURL: import.meta.url,
  }))

if (result.default !== 'Foo4242')
  throw new Error(`unexpected result: ${result.default}`)

console.log('ok')
