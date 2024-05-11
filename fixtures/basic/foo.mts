import { capitalize } from '@antfu/utils'
import { bar } from './bar.mts'

const str: string | number = 'foo'

class A {
  c = 42

  constructor(
    public a: string,
    public b: number,
  ) {
  }
}

const obj = new A(str, 42)

export default capitalize(`${obj.a}${obj.b}${bar}${obj.c}`)
