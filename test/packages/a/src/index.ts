import { B, IB, CB } from '@typedoc-plugin-resolve-crossmodule-references/b'

export const b: B = { b: true }
export const bArray: B[] = []
export const nestedBArray: B[][] = []

export type A = {
  b: B
  bArray: B[]
  getB(): B
  getBArray(): B[]
}

export interface IA {
  b: B
  bArray: B[]
  getB(): B
  getBArray(): B[]
}

export class CA {
  b: B
  bArray: B[]
  private _b: B
  private _bArray: B[]

  constructor(b: B, bArray: B[]) {
    this.b = b
    this.bArray = bArray
    this._b = b
    this._bArray = bArray
  }

  getB() {
    return this.b
  }

  setB(b: B) {
    this.b = b
  }

  getBArray() {
    return this.bArray
  }

  setBArray(bArray: B[]) {
    this.bArray = bArray
  }

  get privateB() {
    return this._b
  }

  set privateB(b: B) {
    this._b = b
  }

  get privateBArray() {
    return this._bArray
  }

  set privateBArray(bArray: B[]) {
    this._bArray = bArray
  }
}

export type Union = A | B

export type Conditional<T> = T extends A ? A : B

export type Indexed = B['b']

export type Inferred<T> = T extends (infer I)[] ? I : B

export type Intersection = A & B

export type Intrinsic = number

export type Literal = 'value'

export type Mapped = { -readonly [K in keyof CA as `mapped_${K}`]?: B }

export type Optional = [B, B?]

export type Predicate = (x: any, b: B) => x is B

export type PredicateAsserts = (condition: boolean, b: B) => asserts condition

export type Query = typeof b

export const value: { a: string, b: B } = { a: 'a', b }

export type Tuple = [B,B,B]

export type Rest = [1, ...[B,B,B]]

export type TemplateLiteral = `${'a' | 'b'}${'a' | 'b'}`

export type NamedTuple = [name: B]

export class TypeOperator<T extends keyof CA> {}

export class ImplementsIB implements IB {
  b = false
}

export interface ExtendsIB extends IB {}

export class ExtendsCB extends CB {}
