/* eslint-disable antfu/no-import-dist */
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, it } from 'vitest'
import { getModuleInfo, importx } from '../dist/index.mjs'

it('should work with cts', async () => {
  const _dirname = dirname(fileURLToPath(import.meta.url))
  const specifier = join(_dirname, './fixtures/cts/index.ts')
  const mod = await importx(specifier, {
    parentURL: _dirname,
    loader: 'jiti', // TODO: test for tsx as well
  })
  const info = getModuleInfo(mod)

  expect(mod).toEqual({
    thousand: 1000,
  })

  expect(info).toBeDefined()
  expect(info?.loader).toBe('jiti')
})
