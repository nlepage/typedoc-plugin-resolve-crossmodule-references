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
  if (!isTypedReflection(reflection)) return

  fixTyped(context, reflection, 'type')

  if (reflection instanceof DeclarationReflection) {
    fixTyped(context, reflection, 'extendedTypes')
    fixTyped(context, reflection, 'implementedTypes')
  }

  reflection.type?.visit(
    makeRecursiveVisitor({
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
  )
}

type Typed<F extends string> = { [k in F]?: Type | SomeType | Type[] | undefined }

function fixTyped<F extends string>(context: Context, typed: Typed<F>, f: F) {
  const type = typed[f]
  if (!type) return
  if (Array.isArray(type)) {
    type.forEach((iType, i) => {
      type[i] = fixType(context, iType)
    })
  } else {
    typed[f] = fixType(context, type)
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
