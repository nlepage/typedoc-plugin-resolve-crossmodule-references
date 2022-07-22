import test from 'ava'
import fs from 'fs/promises'
import path from 'path'

let project: any
let moduleA: any
let typeBId: any

test.before(async (t) => {
  const json = await fs.readFile(path.resolve(__dirname, 'test.json'))
  project = JSON.parse(json.toString('utf8'))
  moduleA = getChildByName(project, '@typedoc-plugin-resolve-crossmodule-references/a')
  typeBId = getChildByName(getChildByName(project, '@typedoc-plugin-resolve-crossmodule-references/b'), 'B').id
})

test('should resolve references on variables', (t) => {
  t.is(getChildByName(moduleA, 'b')?.type?.id, typeBId, 'variable b refers to B')
  t.is(getChildByName(moduleA, 'bArray')?.type?.elementType?.id, typeBId, 'variable bArray refers to B')
  t.is(getChildByName(moduleA, 'nestedBArray')?.type?.elementType?.elementType?.id, typeBId, 'variable nestedBArray refers to B')
})

test('should resolve references on type alias A', (t) => {
  const typeA = getChildByName(moduleA, 'A')?.type?.declaration
   
  t.is(getChildByName(typeA, 'b')?.type?.id, typeBId, 'property b refers to B')
  t.is(getChildByName(typeA, 'bArray')?.type?.elementType?.id, typeBId, 'property bArray refers to B')
  t.is(getChildByName(typeA, 'getB')?.signatures?.[0]?.type?.id, typeBId, 'method getB refers to B')
  t.is(getChildByName(typeA, 'getBArray')?.signatures?.[0]?.type?.elementType?.id, typeBId, 'method getBArray refers to B')
})

test('should resolve references on interface IA', (t) => {
  const interfaceIA = getChildByName(moduleA, 'IA')

  t.is(getChildByName(interfaceIA, 'b')?.type?.id, typeBId, 'property b refers to B')
  t.is(getChildByName(interfaceIA, 'bArray')?.type?.elementType?.id, typeBId, 'property bArray refers to B')
  t.is(getChildByName(interfaceIA, 'getB')?.signatures?.[0]?.type?.id, typeBId, 'method getB refers to B')
  t.is(getChildByName(interfaceIA, 'getBArray')?.signatures?.[0]?.type?.elementType?.id, typeBId, 'method getBArray refers to B')
})

test('should resolve references on class CA', (t) => {
  const classCA = getChildByName(moduleA, 'CA')

  const constructor = getChildByName(classCA, 'constructor')?.signatures?.[0]
  t.is(constructor?.parameters?.[0]?.type?.id, typeBId, 'parameter b of constructor refers to B')
  t.is(constructor?.parameters?.[1]?.type?.elementType?.id, typeBId, 'parameter bArray of constructor refers to B')

  t.is(getChildByName(classCA, 'b')?.type?.id, typeBId, 'property b refers to B')
  t.is(getChildByName(classCA, 'bArray')?.type?.elementType?.id, typeBId, 'property bArray refers to B')

  t.is(getChildByName(classCA, 'getB')?.signatures?.[0]?.type?.id, typeBId, 'method getB refers to B')
  t.is(getChildByName(classCA, 'getBArray')?.signatures?.[0]?.type?.elementType?.id, typeBId, 'method getBArray refers to B')

  t.is(getChildByName(classCA, 'setB')?.signatures?.[0]?.parameters[0]?.type?.id, typeBId, 'parameter of method setB refers to B')
  t.is(getChildByName(classCA, 'setBArray')?.signatures?.[0]?.parameters[0]?.type?.elementType?.id, typeBId, 'parameter of method setBArray refers to B')

  const privateB = getChildByName(classCA, 'privateB')
  t.is(privateB.getSignature?.type?.id, typeBId, 'privateB getter refers to B')
  t.is(privateB.setSignature?.parameters[0]?.type?.id, typeBId, 'privateB setter refers to B')

  const privateBArray = getChildByName(classCA, 'privateBArray')
  t.is(privateBArray.getSignature?.type?.elementType?.id, typeBId, 'privateBArray getter refers to B')
  t.is(privateBArray.setSignature?.parameters[0]?.type?.elementType?.id, typeBId, 'privateBArray setter refers to B')
})

function getChildByName(container: any, name: string) {
  return container?.children?.find((child: any) => child.name === name)
}
