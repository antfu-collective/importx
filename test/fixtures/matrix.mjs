/* eslint-disable no-console */
import process from 'node:process'
import fs from 'node:fs/promises'

const LOADER = process.env.IMPORTX_LOADER || 'auto'
const barPath = new URL('./basic/bar.mts', import.meta.url)
const barContent = await fs.readFile(barPath, 'utf8')

const output = {
  loader: LOADER,
  import: false,
  importNoCache: false,
  importCache: false,
  dependencies: false,
  mixed: false,
  constEnum: false,
}

async function runMain() {
  const importx = await import('../../dist/index.mjs')
  try {
    const run1noCache = await importx.import('./basic/foo.mts', {
      loader: LOADER,
      cache: false,
      parentURL: import.meta.url,
      ignoreImportxWarning: true,
    })

    const run1cache = await importx.import('./basic/foo.mts', {
      loader: LOADER,
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
      cache: false,
      parentURL: import.meta.url,
      ignoreImportxWarning: true,
    })

    const run2cache = await importx.import('./basic/foo.mts', {
      loader: LOADER,
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
}

async function runMixed() {
  const importx = await import('../../dist/index.mjs')
  await importx.import('./mixed/index.ts', {
    loader: LOADER,
    cache: true,
    parentURL: import.meta.url,
    ignoreImportxWarning: true,
  })
    .then((mod) => {
      if (mod && mod.thousand === 1000) {
        output.mixed = true
      }
      else {
        console.error(`Mixed import mismatch ${JSON.stringify(mod, null, 2)}`)
      }
    })
}

async function runConstEnum() {
  const importx = await import('../../dist/index.mjs')
  await importx.import('./ts-const-enum/index.ts', {
    loader: LOADER,
    parentURL: import.meta.url,
    ignoreImportxWarning: true,
  })
    .then((mod) => {
      if (mod && mod.sum === 3) {
        output.constEnum = true
      }
      else {
        console.error(`Const enum import mismatch ${JSON.stringify(mod, null, 2)}`)
      }
    })
}

try {
  await runMain()
    .catch((e) => {
      console.error(e)
    })
  await runConstEnum()
    .catch((e) => {
      console.error(e)
      output.constEnum = false
    })
  await runMixed()
    .catch((e) => {
      console.error(e)
      output.mixed = false
    })
}
catch (e) {
  console.error(e)
}
finally {
  console.log(JSON.stringify(output, null, 2))
}

if (!output.import)
  process.exitCode = 1
