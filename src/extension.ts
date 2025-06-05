import * as vscode from 'vscode'
import insert from './insert'
import insertFromSelections from './insertFromSelections'
import insertFromClipboard from './insertFromClipboard'
import DefinitionProviderForI18nIdentifier from './DefinitionProviderForI18nIdentifier'
import ReferenceProviderForI18nFile from './ReferenceProviderForI18nFile'
import { EXTENSION_NAME } from './constant'

export function activate(context: vscode.ExtensionContext) {
  const disposables = [
    vscode.commands.registerCommand(`${EXTENSION_NAME}.insert`, insert),
    vscode.commands.registerCommand(
      `${EXTENSION_NAME}.insertFromSelections`,
      insertFromSelections
    ),
    vscode.commands.registerCommand(
      `${EXTENSION_NAME}.insertFromClipboard`,
      insertFromClipboard
    ),
    vscode.languages.registerDefinitionProvider(
      [{ language: 'html' }, { language: 'typescript' }],
      new DefinitionProviderForI18nIdentifier()
    ),
    vscode.languages.registerReferenceProvider(
      [{ language: 'json' }],
      new ReferenceProviderForI18nFile()
    ),
  ]

  context.subscriptions.push(...disposables)
}

export function deactivate() {}
