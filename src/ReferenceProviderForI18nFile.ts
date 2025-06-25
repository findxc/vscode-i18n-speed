import * as vscode from 'vscode'
import {
  getFormattedName,
  isI18nFile,
  parseNameSpace,
  parseSymbolPathAtPosition,
} from './util'

export default class ReferenceProviderForI18nFile
  implements vscode.ReferenceProvider
{
  provideReferences(
    document: vscode.TextDocument,
    position: vscode.Position,
    context: vscode.ReferenceContext,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.Location[]> {
    return new Promise((resolve, reject) => {
      if (!isI18nFile(document.uri)) {
        resolve(undefined)
        return
      }

      vscode.commands
        .executeCommand<vscode.DocumentSymbol[]>(
          'vscode.executeDocumentSymbolProvider',
          document.uri
        )
        .then(symbols => {
          const symbolPath = parseSymbolPathAtPosition(symbols, position)
          if (!symbolPath.length) {
            resolve(undefined)
            return
          }

          const translationKey = symbolPath
            // .map(item => getFormattedName('i18nKeyNamingStyle', item))
            .join('.')
          const namespace = parseNameSpace(document.fileName)
          const identifier = `${namespace}:${translationKey}`

          vscode.commands
            .executeCommand('workbench.action.findInFiles', {
              query: identifier,
              // replace: "that's $1 swell",
              triggerSearch: true,
              // filesToInclude: '${relativeFileDirname}', // no variables
              // preserveCase: true,
              // useExcludeSettingsAndIgnoreFiles: false,
              // isRegex: true,
              isCaseSensitive: true,
              matchWholeWord: true,
              // filesToExclude: './*.css',
            })
            .then(() => {
              resolve(undefined)
            })
        })
    })
  }
}
