import test from 'ava'
import fs from 'fs/promises'
import path from 'path'

let project: any
let moduleA: any
let moduleB: any
let moduleC: any
let typeBId: any
let interfaceIBId: any

test.before(async (t) => {
  const json = await fs.readFile(path.resolve(__dirname, 'test.json'))
  project = JSON.parse(json.toString('utf8'))
  moduleA = getChildByName(project, '@typedoc-plugin-resolve-crossmodule-references/a')
  moduleB = getChildByName(project, 'Project B')
  moduleC = getChildByName(project, '@typedoc-plugin-resolve-crossmodule-references/c')
  typeBId = getChildByName(moduleB, 'B').id
  interfaceIBId = getChildByName(moduleB, 'IB').id
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

test('should resolve references in implements', (t) => {
  const classImplementsIB = getChildByName(moduleA, 'ImplementsIB')
  t.is(classImplementsIB.implementedTypes[0].id, interfaceIBId, 'implements of class refers to interface IB')
})

test('should resolve references in interface extends', (t) => {
  const interfaceExtendsIB = getChildByName(moduleA, 'ExtendsIB')
  t.is(interfaceExtendsIB.extendedTypes[0].id, interfaceIBId, 'extends of interface refers to interface IB')
})

test('should resolve references in class extends', (t) => {
  const classCBId = getChildByName(moduleB, 'CB').id
  const classExtendsCB = getChildByName(moduleA, 'ExtendsCB')
  t.is(classExtendsCB.extendedTypes[0].id, classCBId, 'extends of class refers to class CB')
})

test('should keep type arguments', (t) => {
  const typePBId = getChildByName(moduleB, 'PB').id
  const variablePb = getChildByName(moduleA, 'pb')
  t.is(variablePb.type.id, typePBId, 'variable pb refers to type PB')
  t.deepEqual(variablePb.type.typeArguments, [{ type: 'intrinsic', name: 'string' }], 'variable pb has type arguments')
})

test('should resolve extends in type parameters', (t) => {
  const functionF = getChildByName(moduleA, 'f')
  t.is(functionF.signatures[0].typeParameter[0].type.id, interfaceIBId, 'type parameter extends referers to IB')
  t.is(functionF.signatures[0].typeParameter[0].default.id, interfaceIBId, 'type parameter extends default referers to IB')
})

test('should resolve references to import alias', (t) => {
  t.is(getChildByName(moduleA, 'aliasedB').type.id, typeBId, 'variable aliasedB refers to B')
})

test('should resolve ambiguous type names', (t) => {
  const ambiguousTypeBId = getChildByName(moduleB, 'Ambiguous').id
  const variableAmbiguousFromB = getChildByName(moduleA, 'ambiguousFromB')
  t.is(variableAmbiguousFromB.type.id, ambiguousTypeBId, 'variable ambiguousFromB refers to type Ambiguous from package b')

  const ambiguousTypeCId = getChildByName(moduleC, 'Ambiguous').id
  const variableAmbiguousFromC = getChildByName(moduleA, 'ambiguousFromC')
  t.is(variableAmbiguousFromC.type.id, ambiguousTypeCId, 'variable ambiguousFromC refers to type Ambiguous from package c')

  const anotherAmbiguousTypeCId = getChildByName(moduleC, 'AnotherAmbiguous').id
  const variableAnotherAmbiguousFromC = getChildByName(moduleA, 'anotherAmbiguousFromC')
  t.is(variableAnotherAmbiguousFromC.type.id, anotherAmbiguousTypeCId, 'variable anotherAmbiguousFromC refers to type AnotherAmbiguous from package c')

  const variableAnotherAmbiguousFromD = getChildByName(moduleA, 'anotherAmbiguousFromD')
  t.is(variableAnotherAmbiguousFromD.type.id, undefined, 'variable anotherAmbiguousFromD has a broken reference to type AnotherAmbiguous from package d')
})

function getChildByName(container: any, name: string) {
  return findByName(container?.children, name)
}

function findByName(elements: any, name: string) {
  return elements?.find((element: any) => element?.name === name)
}
