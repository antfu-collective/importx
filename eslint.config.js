// @ts-check
import antfu from '@antfu/eslint-config'

export default antfu()
  .append({
    files: ['test/**/*.ts', 'test/**/*.mjs'],
    rules: {
      'antfu/no-top-level-await': 'off',
    },
  })
