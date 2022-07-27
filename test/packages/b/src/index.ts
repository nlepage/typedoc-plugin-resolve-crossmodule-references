export type B = { b: boolean }

export interface IB { b: boolean }

export class CB implements IB {
  b = false
}

export type PB<T> = { v: T }
