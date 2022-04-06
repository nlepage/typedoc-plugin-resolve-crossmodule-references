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
  t.is(privateB.getSignature[0]?.type?.id, typeBId, 'privateB getter refers to B')
  t.is(privateB.setSignature[0]?.parameters[0]?.type?.id, typeBId, 'privateB setter refers to B')

  const privateBArray = getChildByName(classCA, 'privateBArray')
  t.is(privateBArray.getSignature[0]?.type?.elementType?.id, typeBId, 'privateBArray getter refers to B')
  t.is(privateBArray.setSignature[0]?.parameters[0]?.type?.elementType?.id, typeBId, 'privateBArray setter refers to B')
})

test('should resolve references in type conditions', (t) => {
  const conditional = getChildByName(moduleA, 'Conditional')
  t.is(conditional?.type?.falseType?.id, typeBId, 'false type of Conditional refers to B')

  const inferred = getChildByName(moduleA, 'Inferred')
  t.is(inferred?.type?.falseType?.id, typeBId, 'false type of Inferred refers to B')
})

test('should resolve references in indexed types', (t) => {
  const indexed = getChildByName(moduleA, 'Indexed')
  t.is(indexed?.type?.objectType?.id, typeBId, 'object type of Indexed refers to B')
})

test('should resolve references in type intersections', (t) => {
  const intersection = getChildByName(moduleA, 'Intersection')
  t.is(findByName(intersection?.type?.types, 'B')?.id, typeBId, 'object type of Intersection refers to B')
})

test('should resolve references in mapped types', (t) => {
  const mapped = getChildByName(moduleA, 'Mapped')
  t.is(mapped?.type?.templateType?.id, typeBId, 'template type of Mapped refers to B')
})

test('should resolve references in tuple types', (t) => {
  const namedTuple = getChildByName(moduleA, 'NamedTuple')
  t.is(namedTuple?.type?.elements?.[0]?.element?.id, typeBId, 'element type of NamedTuple refers to B')

  const tuple = getChildByName(moduleA, 'Tuple')
  t.is(tuple?.type?.elements?.[0]?.id, typeBId, 'element type of Tuple refers to B')
  t.is(tuple?.type?.elements?.[1]?.id, typeBId, 'element type of Tuple refers to B')
  t.is(tuple?.type?.elements?.[2]?.id, typeBId, 'element type of Tuple refers to B')

  const rest = getChildByName(moduleA, 'Rest')
  t.is(rest?.type?.elements?.[1]?.elementType?.elements?.[0]?.id, typeBId, 'rest element type in Rest refers to B')
  t.is(rest?.type?.elements?.[1]?.elementType?.elements?.[1]?.id, typeBId, 'rest element type in Rest refers to B')
  t.is(rest?.type?.elements?.[1]?.elementType?.elements?.[2]?.id, typeBId, 'rest element type in Rest refers to B')
})

test('should resolve references in predicate types', (t) => {
  const predicate = getChildByName(moduleA, 'Predicate')
  t.is(findByName(predicate?.type?.declaration?.signatures?.[0]?.parameters, 'b')?.type?.id, typeBId, 'parameter type of Predicate refers to B')
  t.is(predicate?.type?.declaration?.signatures?.[0]?.type?.targetType?.id, typeBId, 'return type of Predicate refers to B')
})

test('should resolve references in type unions', (t) => {
  const union = getChildByName(moduleA, 'Union')
  t.is(findByName(union?.type?.types, 'B')?.id, typeBId, 'object type of Union refers to B')
})

function getChildByName(container: any, name: string) {
  return findByName(container?.children, name)
}

function findByName(elements: any, name: string) {
  return elements?.find((element: any) => element?.name === name)
}
