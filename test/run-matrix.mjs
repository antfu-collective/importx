import fs from 'node:fs/promises'
import process from 'node:process'
/* eslint-disable no-console */
import { fileURLToPath } from 'node:url'
import c from 'ansis'
import { execaCommand } from 'execa'

const pkg = JSON.parse(await fs.readFile(new URL('../package.json', import.meta.url), 'utf8'))

const loaders = ['native', 'tsx', 'jiti', 'bundle-require']
const runtimes = ['node', 'tsx', 'deno', 'bun']

const runtimesMap = {
  node: 'node',
  tsx: 'npx tsx',
  deno: 'deno run --allow-read --allow-env --allow-write --allow-run --allow-sys',
  bun: 'bun',
}

const entry = fileURLToPath(new URL('./fixtures/matrix.mjs', import.meta.url))

const records = []

for (const runtime of runtimes) {
  for (const loader of loaders) {
    // if (runtime !== 'node' && loader !== 'native')
    //   continue
    console.log(`loading using ${loader} on ${runtime}`)

    const object = {
      loader,
      runtime,
      import: false,
      importNoCache: false,
      importCache: false,
      importEsmDep: false,
      dependencies: false,
      constEnum: false,
      cts: false,
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

    console.log(object)

    records.push(object)
  }
}

await fs.writeFile('test/table.json', JSON.stringify(records, null, 2), 'utf8')

const list = []
for (const record of records) {
  list.push(
    '===========',
    `runtime: ${c.green(record.runtime)}`,
    `loader:  ${c.yellow(record.loader)}`,
    `-----------`,
    `Import:           ${record.import ? c.green('✅') : c.red('❌')}`,
    `Cache:            ${record.importCache ? c.green('✅') : c.red('❌')}`,
    `No cache:         ${record.importNoCache ? c.green('✅') : c.red('❌')}`,
    `Deps:             ${record.dependencies ? c.green('✅') : c.red('❌')}`,
    `CTS:              ${record.cts ? c.green('✅') : c.red('❌')}`,
    `CJS & ESM Mixed:  ${record.mixed ? c.green('✅') : c.red('❌')}`,
    `Const enum:       ${record.constEnum ? c.green('✅') : c.red('❌')}`,
    `Import ESM Dep:   ${record.importEsmDep ? c.green('✅') : c.red('❌')}`,
    '',
  )
}

if (process.env.CI) {
  // TODO: send this to action output: https://github.com/vitejs/vite-benchmark/blob/fed7d313e66b95fd4bc288cde93d69b3dffdbec4/runner/src/cli.ts#L107-L113
  console.log(list.join('\n'))

  if (
    records
      .filter(x => (x.runtime === 'node' && x.loader !== 'native'))
      .some(x => !x.import)
  ) {
    process.exit(1)
  }
}
else {
  const table = `
> Generated with version \`v${pkg.version}\` at ${new Date().toISOString()}

|  | ${loaders.join(' | ')} |
| ------- | ${loaders.map(() => '---').join(' | ')} |
${runtimes.map(runtime => `| ${runtime} | ${loaders.map((loader) => {
  const record = records.find(x => x.loader === loader && x.runtime === runtime)
  if (!record)
    return 'N/A'
  return [
    `Import: ${record.import ? '✅' : '❌'}`,
    `Cache: ${record.importCache ? '✅' : '❌'}`,
    `No cache: ${record.importNoCache ? '✅' : '❌'}`,
    `Deps: ${record.dependencies ? '✅' : '❌'}`,
    `CTS Import: ${record.cts ? '✅' : '❌'}`,
    `ESM/CJS Mixed: ${record.mixed ? '✅' : '❌'}`,
    `Const Enum: ${record.constEnum ? '✅' : '❌'}`,
    `Import ESM Dep: ${record.importEsmDep ? '✅' : '❌'}`,
  ].join('<br>')
}).join(' | ')} |`).join('\n')}
`.trim()

  let readme = await fs.readFile('README.md', 'utf8')
  readme = readme.replace(/(<!-- TABLE_START -->)[\s\S]*(<!-- TABLE_END -->)/, `$1\n\n${table}\n\n$2`)
  await fs.writeFile('README.md', readme, 'utf8')

  await fs.writeFile('test/matrix-output.txt', c.strip(list.join('\n')), 'utf-8')
}
