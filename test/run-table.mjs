/* eslint-disable no-console */
import { fileURLToPath } from 'node:url'
import fs from 'node:fs/promises'
import { execaCommand } from 'execa'

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
      imports: false,
      reimports: false,
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

const md = `

| runtime/loader | ${loaders.join(' | ')} |
| ------- | ${loaders.map(() => '---').join(' | ')} |
${runtimes.map(runtime => `| ${runtime} | ${loaders.map((loader) => {
  const record = records.find(x => x.loader === loader && x.runtime === runtime)
  if (!record)
    return 'N/A'
  return `Import: ${record.imports ? '✔️' : '❌'}<br>Cache Disable: ${record.reimports ? '✔️' : '❌'}`
}).join(' | ')} |`).join('\n')}
`

await fs.writeFile('test/table.md', md, 'utf8')
