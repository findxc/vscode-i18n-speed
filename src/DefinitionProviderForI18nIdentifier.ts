import * as vscode from 'vscode'
import {
  getI18nFilesGlobPatternOfI18nIdentifier,
  parseSymbolFromPath,
} from './util'

export default class DefinitionProviderForI18nIdentifier
  implements vscode.DefinitionProvider
{
  provideDefinition(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.Definition | vscode.DefinitionLink[]> {
    return new Promise((resolve, reject) => {
      const currentLine = position.line

      const currentLineText = document.lineAt(currentLine).text

      // will match below cases:
      // t("namespace:key"
      // t(\n  'namespace:key'
      const i18nIdentifierReg = /(?<=\bt\(\s*)(['"])([^)]+)\1/g
      let i18nIdentifier = [
        ...currentLineText.matchAll(i18nIdentifierReg),
      ].find(item => {
        // 1 is quote length
        const startIndex = item.index + 1
        const endIndex = startIndex + item[2].length
        return (
          position.character >= startIndex && position.character <= endIndex
        )
      })?.[2]

      if (!i18nIdentifier && currentLine > 0) {
        const previousLineText = document.lineAt(currentLine - 1).text
        i18nIdentifier = [
          ...`${previousLineText}${currentLineText}`.matchAll(
            i18nIdentifierReg
          ),
        ].find(item => {
          // 1 is quote length
          const startIndex = item.index + 1 - previousLineText.length
          const endIndex = startIndex + item[2].length
          return (
            position.character >= startIndex && position.character <= endIndex
          )
        })?.[2]
      }

      if (!i18nIdentifier) {
        resolve(undefined)
        return
      }

      const i18nFilesGlobPattern =
        getI18nFilesGlobPatternOfI18nIdentifier(i18nIdentifier)
      if (!i18nFilesGlobPattern) {
        vscode.window.showInformationMessage(
          'Need configure at least i18nGlobalFilesDir or (i18nNonGlobalFilesDir and i18nNonGlobalFileSuffix)'
        )
        resolve(undefined)
        return
      }

      // TODO need handle if file not exist
      // TODO listen to i18n files when extension active and then cache fileUris?

      vscode.workspace
        .findFiles(i18nFilesGlobPattern, undefined, 1)
        .then(([i18nUri]) => {
          if (!i18nUri) {
            throw new Error(`No i18n files found for ${i18nIdentifier}`)
          }
          return vscode.commands
            .executeCommand<vscode.DocumentSymbol[]>(
              'vscode.executeDocumentSymbolProvider',
              i18nUri
            )
            .then(symbols => ({ i18nUri, symbols }))
        })
        .then(({ i18nUri, symbols }) => {
          const symbolPath = i18nIdentifier.split(':').pop()?.split('.')
          const symbol = parseSymbolFromPath(symbols, symbolPath)

          if (!symbol) {
            vscode.window.showInformationMessage(
              `No symbol found for i18n identifier: ${i18nIdentifier}`
            )
            resolve(undefined)
            return
          }

          const location = new vscode.Location(i18nUri, symbol.selectionRange)
          resolve(location)
        })
    })
  }
}
