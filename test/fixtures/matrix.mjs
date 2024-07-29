/* eslint-disable no-console */
import process from 'node:process'
import fs from 'node:fs/promises'

const LOADER = process.env.IMPORTX_LOADER || 'auto'
const barPath = new URL('./basic/bar.mts', import.meta.url)
const barContent = await fs.readFile(barPath, 'utf8')

const fallbackLoaders = false

const output = {
  loader: LOADER,
}

const promises = []

/**
 * @param {string} key
 * @param {() => void} fn
 */
function it(key, fn) {
  promises.push(async () => {
    try {
      const result = await fn()
      if (result === false)
        output[key] = false
      else
        output[key] = true
    }
    catch (e) {
      console.error(e)
      output[key] = false
    }
  })
}

it('main', async () => {
  const importx = await import('../../dist/index.mjs')
  try {
    const run1noCache = await importx.import('./basic/foo.mts', {
      loader: LOADER,
      fallbackLoaders,
      cache: false,
      parentURL: import.meta.url,
      ignoreImportxWarning: true,
    })

    const run1cache = await importx.import('./basic/foo.mts', {
      loader: LOADER,
      fallbackLoaders,
      cache: true,
      parentURL: import.meta.url,
      ignoreImportxWarning: true,
    })

    const info = importx.getModuleInfo(run1cache)
    output.dependencies = !!info.dependencies?.length

    if (run1noCache.default === 'Foo42bar42') {
      output.import = true
    }
    else {
      console.error(`Import mismatch ${JSON.stringify(run1noCache, null, 2)}`)
    }

    await fs.writeFile(barPath, 'export const bar = "newBar"', 'utf8')

    const run2noCache = await importx.import('./basic/foo.mts', {
      loader: LOADER,
      fallbackLoaders,
      cache: false,
      parentURL: import.meta.url,
      ignoreImportxWarning: true,
    })

    const run2cache = await importx.import('./basic/foo.mts', {
      loader: LOADER,
      fallbackLoaders,
      cache: true,
      parentURL: import.meta.url,
      ignoreImportxWarning: true,
    })

    output.importNoCache = run2noCache.default !== run1noCache.default
    output.importCache = run2cache === run1cache
  }
  finally {
    await fs.writeFile(barPath, barContent, 'utf8')
  }
})

it('mixed', async () => {
  const importx = await import('../../dist/index.mjs')
  const mod = await importx.import('./mixed/index.ts', {
    loader: LOADER,
    fallbackLoaders,
    parentURL: import.meta.url,
    ignoreImportxWarning: true,
  })
  if (mod && mod.thousand === 1000) {
    return true
  }
  else {
    console.error(`Mixed import mismatch ${JSON.stringify(mod, null, 2)}`)
    return false
  }
})

it('cts', async () => {
  const importx = await import('../../dist/index.mjs')
  const mod = await importx.import('./cts/index.cts', {
    loader: LOADER,
    fallbackLoaders,
    parentURL: import.meta.url,
    ignoreImportxWarning: true,
  })
  if (mod && mod.thousand === 1000) {
    return true
  }
  else {
    console.error(`CTS import mismatch ${JSON.stringify(mod, null, 2)}`)
    return false
  }
})

it('constEnum', async () => {
  const importx = await import('../../dist/index.mjs')
  const mod = await importx.import('./ts-const-enum/index.ts', {
    loader: LOADER,
    fallbackLoaders,
    parentURL: import.meta.url,
    ignoreImportxWarning: true,
  })
  if (mod && mod.sum === 3) {
    return true
  }
  else {
    console.error(`Const enum import mismatch ${JSON.stringify(mod, null, 2)}`)
    return false
  }
})

it('importEsmDep', async () => {
  const importx = await import('../../dist/index.mjs')
  const mod = await importx.import('./import-esm-dep/index.ts', {
    loader: LOADER,
    fallbackLoaders,
    parentURL: import.meta.url,
    ignoreImportxWarning: true,
    cache: false,
  })
  return mod && mod.default === true
})

for (const promise of promises) {
  await promise()
}

console.log(JSON.stringify(output, null, 2))

if (!output.import)
  process.exitCode = 1
