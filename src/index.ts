import { fromMapFileSource, fromSource } from 'convert-source-map'
import path from 'path'
import {
  Application,
  Context,
  Converter,
  DeclarationReflection,
  ParameterReflection,
  ProjectReflection,
  ReferenceType,
  Reflection,
  SignatureReflection,
  SomeType,
  Type,
  TypeKindMap,
  TypeParameterReflection,
} from 'typedoc'
import { Symbol as TSSymbol } from 'typescript'
import { TypeKind } from 'typedoc/dist/lib/models/types'

export function load(app: Application) {
  app.converter.on(Converter.EVENT_RESOLVE, visitReflection)
}

function visitReflection(context: Context, reflection: Reflection) {
  if (!isTypedReflection(reflection)) return

  const reflectionType = reflection.type
  if (!reflectionType) return

  const visitor = makeRecursiveMutatingVisitor({
    reference(type) {
      return fixType(context, type)
    },
  })

  reflection.type = (visitor[reflectionType.type]?.(reflectionType as never) ?? reflectionType) as any
}

type Typed<F extends string> = { [k in F]?: Type | SomeType | Type[] | undefined }

type MutatingTypeVisitor = {
  [K in TypeKind]: (type: TypeKindMap[K]) => TypeKindMap[K]
}

type InnerTypeMembers<T extends Type> = {
  [K in keyof T as T[K] extends Type | undefined ? K : never]: T[K]
}

type InnerTypesMembers<T extends Type> = {
  [K in keyof T as T[K] extends (infer IT)[] | undefined
    ? IT extends Type | undefined
      ? K
      : never
    : never]: T[K] extends (infer IT)[] ? IT : never
}

function makeRecursiveMutatingVisitor(visitor: Partial<MutatingTypeVisitor>): MutatingTypeVisitor {
  // visit a Type member
  const memberVisit = <T extends keyof TypeKindMap, TT extends TypeKindMap[T], K extends keyof InnerTypeMembers<TT>>(
    type: TT,
    memberName: K
  ) => {
    const innerType = type[memberName] as never as Type
    if (innerType) {
      type[memberName] = (recursiveVisitor[innerType.type]?.(innerType as never) ?? innerType) as never as TT[K]
    }
  }
  // visit a Type[] member
  const membersVisit = <T extends keyof TypeKindMap, TT extends TypeKindMap[T], K extends keyof InnerTypesMembers<TT>>(
    type: TT,
    memberName: K
  ) => {
    const innerTypes = type[memberName] as never as Type[]
    innerTypes?.forEach((innerType, i) => {
      if (innerType) {
        innerTypes[i] = (recursiveVisitor[innerType.type]?.(innerType as never) ?? innerTypes[i]) as never as Type
      }
    })
  }
  const recursiveVisitor: MutatingTypeVisitor = {
    'named-tuple-member'(type) {
      const mutated = visitor['named-tuple-member']?.(type) ?? type
      memberVisit(mutated, 'element')
      return mutated
    },
    'template-literal'(type) {
      const mutated = visitor['template-literal']?.(type) ?? type
      mutated.tail.forEach(([innerType], i) => {
        mutated.tail[i][0] =
          recursiveVisitor[mutated.tail[i][0].type]?.(mutated.tail[i][0] as never) ?? mutated.tail[i][0]
      })
      return mutated
    },
    array(type) {
      const mutated = visitor.array?.(type) ?? type
      memberVisit(mutated, 'elementType')
      return mutated
    },
    conditional(type) {
      const mutated = visitor.conditional?.(type) ?? type
      memberVisit(mutated, 'checkType')
      memberVisit(mutated, 'extendsType')
      memberVisit(mutated, 'trueType')
      memberVisit(mutated, 'falseType')
      return mutated
    },
    indexedAccess(type) {
      const mutated = visitor.indexedAccess?.(type) ?? type
      memberVisit(mutated, 'indexType')
      memberVisit(mutated, 'objectType')
      return mutated
    },
    inferred(type) {
      return visitor.inferred?.(type) ?? type
    },
    intersection(type) {
      const mutated = visitor.intersection?.(type) ?? type
      membersVisit(mutated, 'types')
      return mutated
    },
    intrinsic(type) {
      return visitor.intrinsic?.(type) ?? type
    },
    literal(type) {
      return visitor.literal?.(type) ?? type
    },
    mapped(type) {
      const mutated = visitor.mapped?.(type) ?? type
      memberVisit(mutated, 'nameType')
      memberVisit(mutated, 'parameterType')
      memberVisit(mutated, 'templateType')
      return mutated
    },
    optional(type) {
      const mutated = visitor.optional?.(type) ?? type
      memberVisit(mutated, 'elementType')
      return mutated
    },
    predicate(type) {
      const mutated = visitor.predicate?.(type) ?? type
      memberVisit(mutated, 'targetType')
      return mutated
    },
    query(type) {
      const mutated = visitor.query?.(type) ?? type
      memberVisit(mutated, 'queryType')
      return mutated
    },
    reference(type) {
      const mutated = visitor.reference?.(type) ?? type
      membersVisit(mutated, 'typeArguments')
      return mutated
    },
    reflection(type) {
      const mutated = visitor.reflection?.(type) ?? type
      // Note: The below comment is from the original typedoc visitor function
      // Future: This should maybe recurse too?
      // See the validator in exports.ts for how to do it.
      return mutated
    },
    rest(type) {
      const mutated = visitor.rest?.(type) ?? type
      memberVisit(mutated, 'elementType')
      return mutated
    },
    tuple(type) {
      const mutated = visitor.tuple?.(type) ?? type
      membersVisit(mutated, 'elements')
      return mutated
    },
    typeOperator(type) {
      const mutated = visitor.typeOperator?.(type) ?? type
      memberVisit(mutated, 'target')
      return mutated
    },
    union(type) {
      const mutated = visitor.union?.(type) ?? type
      membersVisit(mutated, 'types')
      return mutated
    },
    unknown(type) {
      return visitor.unknown?.(type) ?? type
    },
  }
  return recursiveVisitor
}

function fixType(context: Context, type: ReferenceType) {
  if (!isReferenceTypeBroken(type)) return type

  return getSourcesReferenceType(type, context.project) ?? type
}

function getSourcesReferenceType(type: ReferenceType, project: ProjectReflection) {
  const srcFile = findSymbolSourceFile(type.getSymbol() as TSSymbol, project)
  if (!srcFile) return null

  const newTargetReflection = srcFile.reflections.find(({ name }) => name === type.name)
  if (!newTargetReflection) return null

  return ReferenceType.createResolvedReference(type.name, newTargetReflection, project)
}

function findSymbolSourceFile(symbol: TSSymbol, project: ProjectReflection) {
  const declarations = symbol.getDeclarations()
  if (!declarations) return undefined

  for (const declaration of declarations) {
    const declSrcFile = declaration.getSourceFile()
    const declSrcFileName = declSrcFile.fileName

    // Find without using source maps
    const directSrcFile = project.files.find(({ fullFileName }) => fullFileName === declSrcFileName)
    if (directSrcFile) return directSrcFile

    // Find using source map
    const srcDirPath = path.dirname(declSrcFileName)

    const srcMapConverter = fromSource(declSrcFile.text) ?? fromMapFileSource(declSrcFile.text, srcDirPath)
    if (!srcMapConverter) continue

    const sources = srcMapConverter.toObject().sources as string[]

    for (const source of sources) {
      const srcFileName = path.resolve(srcDirPath, source).replace(/\\/g, '/')

      const srcFile = project.files.find(({ fullFileName }) => fullFileName.replace(/\\/g, '/') === srcFileName)
      if (!srcFile) continue

      return srcFile
    }
  }

  return undefined
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
