/* eslint-disable no-console */
import process from 'node:process'
import fs from 'node:fs/promises'

const LOADER = process.env.IMPORTX_LOADER || 'auto'
const barPath = new URL('./bar.mts', import.meta.url)
const barContent = await fs.readFile(barPath, 'utf8')

const output = {
  loader: LOADER,
  imports: false,
  reimports: false,
}

try {
  const result1 = await import('../../dist/index.mjs')
    .then(x => x.import('./foo.mts', {
      loader: LOADER,
      cache: false,
      parentURL: import.meta.url,
    }))

  await fs.writeFile(barPath, 'export const bar = "newBar"', 'utf8')

  output.imports = result1.default === 'Foo42bar42'

  const result2 = await import('../../dist/index.mjs')
    .then(x => x.import('./foo.mts', {
      loader: LOADER,
      cache: false,
      parentURL: import.meta.url,
    }))

  output.reimports = result2.default !== result1.default
}
finally {
  await fs.writeFile(barPath, barContent, 'utf8')
}

console.log(JSON.stringify(output, null, 2))

if (!output.imports)
  process.exitCode = 1
