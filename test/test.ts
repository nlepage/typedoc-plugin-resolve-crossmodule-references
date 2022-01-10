import test from 'ava'
import fs from 'fs/promises'
import path from 'path'
import { JSONOutput, ReflectionKind } from 'typedoc'

let project: JSONOutput.ProjectReflection | undefined
let moduleA: JSONOutput.DeclarationReflection | undefined
let typeA: JSONOutput.DeclarationReflection | undefined

test.before(async (t) => {
  const json = await fs.readFile(path.resolve(__dirname, 'test.json'))

  project = JSON.parse(json.toString('utf8')) as JSONOutput.ProjectReflection
  t.true(project != null, 'project is defined')

  moduleA = getChildByName(project, '@typedoc-plugin-resolve-crossmodule-references/a')
  t.true(moduleA != null, 'module A is defined')

  const typeAliasA = getChildByName(moduleA, 'A')
  t.true(typeAliasA != null, 'type alias A is defined')
  t.is(typeAliasA?.kind, ReflectionKind.TypeAlias)
  t.is(typeAliasA?.type?.type, 'reflection')

  typeA = (typeAliasA?.type as JSONOutput.ReflectionType).declaration
  t.true(typeAliasA != null, 'type A is defined')
})

test('property A.b should have a type reference id', (t) => {
  const propertyB = getChildByName(typeA, 'b')
  t.true(propertyB != null, 'property b is defined')
  t.true((propertyB?.type as JSONOutput.ReferenceType).id != null, 'property b has a type reference id')
})

function getChildByName(container: JSONOutput.ContainerReflection | undefined, name: string) {
  return container?.children?.find((child) => child.name === name)
}
