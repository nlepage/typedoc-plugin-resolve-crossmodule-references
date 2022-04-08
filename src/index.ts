import { fromSource, fromMapFileSource } from 'convert-source-map'
import path from 'path'
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
} from 'typedoc'
import { Symbol as TSSymbol } from 'typescript'

export function load(app: Application) {
  app.converter.on(Converter.EVENT_RESOLVE, visitReflection)
}

function visitReflection(context: Context, reflection: Reflection) {
  if (!isTypedReflection(reflection)) return

  checkTyped(context, reflection, 'type')

  reflection.type?.visit(
    makeRecursiveVisitor({
      array(type) {
        checkTyped(context, type, 'elementType')
      },
      conditional(type) {
        checkTyped(context, type, 'checkType')
        checkTyped(context, type, 'trueType')
        checkTyped(context, type, 'falseType')
        checkTyped(context, type, 'extendsType')
      },
      indexedAccess(type) {
        checkTyped(context, type, 'indexType')
        checkTyped(context, type, 'objectType')
      },
      intersection(type) {
        checkTyped(context, type, 'types')
      },
      mapped(type) {
        checkTyped(context, type, 'nameType')
        checkTyped(context, type, 'parameterType')
        checkTyped(context, type, 'templateType')
      },
      'named-tuple-member'(type) {
        checkTyped(context, type, 'element')
      },
      optional(type) {
        checkTyped(context, type, 'elementType')
      },
      predicate(type) {
        checkTyped(context, type, 'targetType')
      },
      query(type) {
        checkTyped(context, type, 'queryType')
      },
      reference(type) {
        checkTyped(context, type, 'typeArguments')
      },
      reflection(type) {
        checkTyped(context, type.declaration, 'type')
      },
      rest(type) {
        checkTyped(context, type, 'elementType')
      },
      tuple(type) {
        checkTyped(context, type, 'elements')
      },
      // FIXME template-literal?
      typeOperator(type) {
        checkTyped(context, type, 'target')
      },
      union(type) {
        checkTyped(context, type, 'types')
      },
    })
  )
}

type Typed<F extends string> = { [k in F]?: Type | SomeType | Type[] | undefined }

function checkTyped<F extends string>(context: Context, typed: Typed<F>, f: F) {
  const type = typed[f]

  if (Array.isArray(type)) {
    type.forEach((iType, i) => {
      if (!isReferenceType(iType)) return

      type[i] = fixType(context, iType)
    })
  } else {
    if (!isReferenceType(type)) return

    typed[f] = fixType(context, type)
  }
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

    const srcDirPath = path.dirname(declSrcFile.fileName)

    const srcMapConverter = fromSource(declSrcFile.text) ?? fromMapFileSource(declSrcFile.text, srcDirPath)
    if (!srcMapConverter) continue

    const sources = srcMapConverter.toObject().sources as string[]

    for (const source of sources) {
      const srcFileName = path.resolve(srcDirPath, source)

      const srcFile = project.files.find(({ fullFileName }) => fullFileName === srcFileName)
      if (!srcFile) continue

      return srcFile
    }
  }

  return undefined
}

function isReferenceType(type?: Type | SomeType): type is ReferenceType {
  return type?.type === 'reference'
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
