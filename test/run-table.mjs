/* eslint-disable no-console */
import { fileURLToPath } from 'node:url'
import fs from 'node:fs/promises'
import { execaCommand } from 'execa'
import pkg from '../package.json' with { type: 'json' }

const loaders = ['native', 'tsx', 'jiti', 'bundle-require']
const runtimes = ['node', 'tsx', 'deno', 'bun']

const runtimesMap = {
  node: 'node',
  tsx: 'npx tsx',
  deno: 'deno run --allow-read --allow-env --allow-write --allow-run',
  bun: 'bun',
}

const entry = fileURLToPath(new URL('../fixtures/basic/index.mjs', import.meta.url))

const records = []

for (const loader of loaders) {
  for (const runtime of runtimes) {
    if (runtime !== 'node' && loader !== 'native')
      continue
    console.log(`loading using ${loader} on ${runtime}`)

    const object = {
      loader,
      runtime,
      import: false,
      importNoCache: false,
      importCache: false,
      errors: null,
    }

    const { stdout, stderr } = await execaCommand(`${runtimesMap[runtime]} ${entry}`, {
      env: {
        IMPORTX_LOADER: loader,
      },
      reject: false,
    })

    if (stdout.trim().startsWith('{'))
      Object.assign(object, JSON.parse(stdout))

    if (stderr)
      object.errors = stderr

    console.log(object, { stdout })

    records.push(object)
  }
}

await fs.writeFile('test/table.json', JSON.stringify(records, null, 2), 'utf8')

const table = `
> Generated with version v${pkg.version} at ${new Date().toISOString()}

|  | ${loaders.join(' | ')} |
| ------- | ${loaders.map(() => '---').join(' | ')} |
${runtimes.map(runtime => `| ${runtime} | ${loaders.map((loader) => {
  const record = records.find(x => x.loader === loader && x.runtime === runtime)
  if (!record)
    return 'N/A'
  return [
    `Import: ${record.import ? '✔️' : '❌'}`,
    `Cache: ${record.importCache ? '✔️' : '❌'}`,
    `No cache: ${record.importNoCache ? '✔️' : '❌'}`,
  ].join('<br>')
}).join(' | ')} |`).join('\n')}
`.trim()

let readme = await fs.readFile('README.md', 'utf8')
readme = readme.replace(/(<!-- TABLE_START -->)[\s\S]*(<!-- TABLE_END -->)/m, `$1\n\n${table}\n\n$2`)
await fs.writeFile('README.md', readme, 'utf8')
