/* eslint-disable antfu/no-import-dist */
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'pathe'
import { expect, it } from 'vitest'
// @ts-expect-error - no types
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

it('should get module info with parent filepath', async () => {
  const mod = await importx('./fixtures/basic/foo.mts', __filename)
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
  expect(info?.dependencies?.map(i => i.slice(cwd.length)).filter(i => !i.includes('node_modules')))
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

it('importing absolute paths should work', async () => {
  const _dirname = dirname(fileURLToPath(import.meta.url))
  const specifier = join(_dirname, './fixtures/basic/foo.mts')
  const mod = await importx(specifier, _dirname)
  const info = getModuleInfo(mod)

  expect(mod.default).toBe(MOD_EXPORT)

  expect(info).toBeDefined()
  expect(info?.loader).toBe('native')
  expect(info?.specifier?.match(/^[a-z]:/i) ? `file:///${specifier}`.replace(/\\/g, '/') : specifier).toBe(specifier)
  // expect(info).toMatchObject({
  //   loader: 'native', // because Vitest supports importing TypeScript files
  //   specifier: './fixtures/basic/foo.mts',
  // })
  expect(info?.dependencies).not.toBeDefined()
})
