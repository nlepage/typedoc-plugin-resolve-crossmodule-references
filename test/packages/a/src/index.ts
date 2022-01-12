import { B } from '@typedoc-plugin-resolve-crossmodule-references/b'

export const b: B = {}
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
