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
} from 'typedoc'
import { Symbol as TSSymbol } from 'typescript'

export function load(app: Application) {
  app.converter.on(Converter.EVENT_RESOLVE, (_: Context, reflection: Reflection) =>
    resolveCrossModuleReference(reflection)
  )
}

function resolveCrossModuleReference(reflection: Reflection) {
  if (!(reflection instanceof DeclarationReflection)) return

  const type = reflection.type
  if (!(type instanceof ReferenceType)) return

  const symbol = type.getSymbol()
  if (type.reflection || !symbol) return

  const project = reflection.project

  const srcFile = findSymbolSourceFile(symbol, project)
  if (!srcFile) return

  const newTargetReflection = srcFile.reflections.find(({ name }) => name === type.name)
  if (!newTargetReflection) return

  const newTargetSymbol = project.getSymbolFromReflection(newTargetReflection)
  if (!newTargetSymbol) return

  reflection.type = new ReferenceType(type.name, newTargetSymbol, project)
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
