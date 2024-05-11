import { capitalize } from '@antfu/utils'

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

export default capitalize(`${obj.a}${obj.b}${obj.c}`)
