/* eslint-disable antfu/no-import-dist */
import { expect, it } from 'vitest'
import { getModuleInfo, importx } from '../dist/index.mjs'

const MOD_EXPORT = 'Foo42bar42'

it('should get module info', async () => {
  const mod = await importx('./fixtures/basic/foo.mts', import.meta.url)
  const info = getModuleInfo(mod)

  expect(mod.default).toBe(MOD_EXPORT)

  expect(info).toBeDefined()
  expect(info).toMatchObject({
    loader: 'native', // because Vitest supports importing TypeScript files
    specifier: './fixtures/basic/foo.mts',
  })
  expect(info?.dependencies).not.toBeDefined()
})

it('should get dependencies with tsx', async () => {
  const mod = await importx('./fixtures/basic/foo.mts', {
    loader: 'tsx',
    parentURL: import.meta.url,
  })
  const info = getModuleInfo(mod)

  expect(mod.default).toBe(MOD_EXPORT)

  expect(info).toBeDefined()
  expect(info).toMatchObject({
    loader: 'tsx',
    specifier: './fixtures/basic/foo.mts',
  })

  const cwd = new URL('..', import.meta.url).href
  expect(info?.dependencies?.map(i => i.slice(cwd.length)))
    .toMatchInlineSnapshot(`
      [
        "test/fixtures/basic/foo.mts",
        "test/fixtures/basic/bar.mts",
      ]
    `)
})

it('should get dependencies with bundle-require', async () => {
  const mod = await importx('./fixtures/basic/foo.mts', {
    loader: 'bundle-require',
    parentURL: import.meta.url,
  })
  const info = getModuleInfo(mod)

  expect(mod.default).toBe(MOD_EXPORT)

  expect(mod.default)
    .toMatchInlineSnapshot(`"Foo42bar42"`)
  expect(info).toBeDefined()
  expect(info).toMatchObject({
    loader: 'bundle-require',
    specifier: './fixtures/basic/foo.mts',
  })

  const cwd = new URL('..', import.meta.url).href
  expect(info?.dependencies?.map(i => i.slice(cwd.length)))
    .toMatchInlineSnapshot(`
      [
        "test/fixtures/basic/bar.mts",
        "test/fixtures/basic/foo.mts",
      ]
    `)
})
