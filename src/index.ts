import {
  Application,
  Converter,
  Context,
  Reflection,
  DeclarationReflection,
  ReferenceType,
  ProjectReflection,
  makeRecursiveVisitor,
  ParameterReflection,
  Type,
  SomeType,
  SignatureReflection,
  TypeParameterReflection,
  ReflectionKind,
} from 'typedoc'
import { dirname, join } from 'path'
import { existsSync, readFileSync } from 'fs'

export function load(app: Application) {
  const fileNameToModule = new Map<string, DeclarationReflection | undefined>()

  app.converter.on(Converter.EVENT_RESOLVE, (context: Context, reflection: Reflection) =>
    visitReflection(context.project, reflection, fileNameToModule)
  )
}

function visitReflection(
  project: ProjectReflection,
  reflection: Reflection,
  fileNameToModule: Map<string, DeclarationReflection | undefined>
) {
  if (isTypedReflection(reflection)) {
    recursivelyFixTyped(project, reflection, 'type', fileNameToModule)
  }

  if (reflection instanceof DeclarationReflection) {
    recursivelyFixTyped(project, reflection, 'extendedTypes', fileNameToModule)
    recursivelyFixTyped(project, reflection, 'implementedTypes', fileNameToModule)
  }

  if (reflection instanceof TypeParameterReflection) {
    recursivelyFixTyped(project, reflection, 'default', fileNameToModule)
  }
}

type Typed<F extends string> = { [k in F]?: Type | SomeType | Type[] | undefined }

function recursivelyFixTyped<F extends string>(
  project: ProjectReflection,
  typed: Typed<F>,
  f: F,
  fileNameToModule: Map<string, DeclarationReflection | undefined>
) {
  fixTyped(project, typed, f, fileNameToModule)

  const typedField = typed[f]
  if (!typedField) return

  const visitor = makeRecursiveVisitor({
    array(type) {
      fixTyped(project, type, 'elementType', fileNameToModule)
    },
    conditional(type) {
      fixTyped(project, type, 'checkType', fileNameToModule)
      fixTyped(project, type, 'trueType', fileNameToModule)
      fixTyped(project, type, 'falseType', fileNameToModule)
      fixTyped(project, type, 'extendsType', fileNameToModule)
    },
    indexedAccess(type) {
      fixTyped(project, type, 'indexType', fileNameToModule)
      fixTyped(project, type, 'objectType', fileNameToModule)
    },
    intersection(type) {
      fixTyped(project, type, 'types', fileNameToModule)
    },
    mapped(type) {
      fixTyped(project, type, 'nameType', fileNameToModule)
      fixTyped(project, type, 'parameterType', fileNameToModule)
      fixTyped(project, type, 'templateType', fileNameToModule)
    },
    'named-tuple-member'(type) {
      fixTyped(project, type, 'element', fileNameToModule)
    },
    optional(type) {
      fixTyped(project, type, 'elementType', fileNameToModule)
    },
    predicate(type) {
      fixTyped(project, type, 'targetType', fileNameToModule)
    },
    query(type) {
      fixTyped(project, type, 'queryType', fileNameToModule)
    },
    reference(type) {
      fixTyped(project, type, 'typeArguments', fileNameToModule)
    },
    reflection(type) {
      fixTyped(project, type.declaration, 'type', fileNameToModule)
    },
    rest(type) {
      fixTyped(project, type, 'elementType', fileNameToModule)
    },
    tuple(type) {
      fixTyped(project, type, 'elements', fileNameToModule)
    },
    // FIXME template-literal?
    typeOperator(type) {
      fixTyped(project, type, 'target', fileNameToModule)
    },
    union(type) {
      fixTyped(project, type, 'types', fileNameToModule)
    },
  })

  if (Array.isArray(typedField)) {
    typedField.forEach((type) => type.visit(visitor))
  } else {
    typedField.visit(visitor)
  }
}

function fixTyped<F extends string>(
  project: ProjectReflection,
  typed: Typed<F>,
  field: F,
  fileNameToModule: Map<string, DeclarationReflection | undefined>
) {
  const typedField = typed[field]
  if (!typedField) return

  if (Array.isArray(typedField)) {
    typedField.forEach((iType, i) => {
      typedField[i] = fixType(project, iType, fileNameToModule)
    })
  } else {
    typed[field] = fixType(project, typedField, fileNameToModule)
  }
}

function fixType(
  project: ProjectReflection,
  type: Type,
  fileNameToModule: Map<string, DeclarationReflection | undefined>
) {
  if (isReferenceType(type) && isReferenceTypeBroken(type)) return findReferenceType(type, project, fileNameToModule)
  return type
}

function findReferenceType(
  type: ReferenceType,
  project: ProjectReflection,
  fileNameToModule: Map<string, DeclarationReflection | undefined>
) {
  const fileName = type.getSymbol()?.getDeclarations()?.[0].getSourceFile().fileName
  if (!fileName) return type

  let module: DeclarationReflection | undefined

  if (fileNameToModule.has(fileName)) {
    module = fileNameToModule.get(fileName)
  } else {
    const moduleFilePath = findModuleFilePath(fileName)
    if (!moduleFilePath) return type

    const moduleConfig = JSON.parse(readFileSync(moduleFilePath).toString('utf8'))
    // Ideally we wouldn't use typedoc's displayName and look for the module by originalName
    // But typedoc sets originalName to the same value as displayName...
    const moduleName = moduleConfig?.typedoc?.displayName ?? moduleConfig.name

    module = project.getChildrenByKind(ReflectionKind.Module).find(({ name }) => moduleName === name)

    fileNameToModule.set(fileName, module)
  }

  if (!module) return type

  const newTarget = module.getChildByName(type.qualifiedName)
  if (!newTarget) return type

  const newType = ReferenceType.createResolvedReference(type.name, newTarget, project)
  newType.typeArguments = type.typeArguments
  return newType
}

function findModuleFilePath(path: string): string | undefined {
  const dir = dirname(path)
  if (dir === path) return undefined
  const moduleFilePath = join(dir, 'package.json')
  if (existsSync(moduleFilePath)) return moduleFilePath
  return findModuleFilePath(dir)
}

function isReferenceType(type: Type): type is ReferenceType {
  return type.type === 'reference'
}

function isReferenceTypeBroken(type: ReferenceType) {
  return type.reflection == null && type.getSymbol() != null
}

function isTypedReflection(
  reflection: Reflection
): reflection is DeclarationReflection | ParameterReflection | SignatureReflection | TypeParameterReflection {
  return (
    reflection instanceof DeclarationReflection ||
    reflection instanceof SignatureReflection ||
    reflection instanceof ParameterReflection ||
    reflection instanceof TypeParameterReflection
  )
}
