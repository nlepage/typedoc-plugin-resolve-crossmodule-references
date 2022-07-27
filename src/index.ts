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

export function load(app: Application) {
  app.converter.on(Converter.EVENT_RESOLVE, visitReflection)
}

function visitReflection(context: Context, reflection: Reflection) {
  if (isTypedReflection(reflection)) {
    recursivelyFixTyped(context, reflection, 'type')
  }

  if (reflection instanceof DeclarationReflection) {
    recursivelyFixTyped(context, reflection, 'extendedTypes')
    recursivelyFixTyped(context, reflection, 'implementedTypes')
  }
}

type Typed<F extends string> = { [k in F]?: Type | SomeType | Type[] | undefined }

function recursivelyFixTyped<F extends string>(context: Context, typed: Typed<F>, f: F) {
  fixTyped(context, typed, f)

  const typedField = typed[f]
  if (!typedField) return

  const visitor = makeRecursiveVisitor({
    array(type) {
      fixTyped(context, type, 'elementType')
    },
    conditional(type) {
      fixTyped(context, type, 'checkType')
      fixTyped(context, type, 'trueType')
      fixTyped(context, type, 'falseType')
      fixTyped(context, type, 'extendsType')
    },
    indexedAccess(type) {
      fixTyped(context, type, 'indexType')
      fixTyped(context, type, 'objectType')
    },
    intersection(type) {
      fixTyped(context, type, 'types')
    },
    mapped(type) {
      fixTyped(context, type, 'nameType')
      fixTyped(context, type, 'parameterType')
      fixTyped(context, type, 'templateType')
    },
    'named-tuple-member'(type) {
      fixTyped(context, type, 'element')
    },
    optional(type) {
      fixTyped(context, type, 'elementType')
    },
    predicate(type) {
      fixTyped(context, type, 'targetType')
    },
    query(type) {
      fixTyped(context, type, 'queryType')
    },
    reference(type) {
      fixTyped(context, type, 'typeArguments')
    },
    reflection(type) {
      fixTyped(context, type.declaration, 'type')
    },
    rest(type) {
      fixTyped(context, type, 'elementType')
    },
    tuple(type) {
      fixTyped(context, type, 'elements')
    },
    // FIXME template-literal?
    typeOperator(type) {
      fixTyped(context, type, 'target')
    },
    union(type) {
      fixTyped(context, type, 'types')
    },
  })

  if (Array.isArray(typedField)) {
    typedField.forEach((type) => type.visit(visitor))
  } else {
    typedField.visit(visitor)
  }
}

function fixTyped<F extends string>(context: Context, typed: Typed<F>, field: F) {
  const typedField = typed[field]
  if (!typedField) return

  if (Array.isArray(typedField)) {
    typedField.forEach((iType, i) => {
      typedField[i] = fixType(context, iType)
    })
  } else {
    typed[field] = fixType(context, typedField)
  }
}

function fixType(context: Context, type: Type) {
  if (isReferenceType(type) && isReferenceTypeBroken(type)) return findReferenceType(type, context.project)
  return type
}

function findReferenceType(type: ReferenceType, project: ProjectReflection) {
  const newTargetReflection = project.getReflectionsByKind(ReflectionKind.All).find(({ name }) => name === type.name)
  if (!newTargetReflection) return type
  return ReferenceType.createResolvedReference(type.name, newTargetReflection, project)
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
