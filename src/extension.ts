import * as vscode from 'vscode'
import insert from './insert'
import insertFromSelections from './insertFromSelections'
import insertFromClipboard from './insertFromClipboard'
import DefinitionProviderForI18nIdentifier from './DefinitionProviderForI18nIdentifier'
import ReferenceProviderForI18nFile from './ReferenceProviderForI18nFile'
import { EXTENSION_NAME } from './constant'
import cacheI18nUris from './cacheI18nUris'

export function activate(context: vscode.ExtensionContext) {
  cacheI18nUris(context)

  const disposables = [
    vscode.commands.registerCommand(`${EXTENSION_NAME}.insert`, () =>
      insert(context)
    ),
    vscode.commands.registerCommand(
      `${EXTENSION_NAME}.insertForceHashKey`,
      () => insert(context, true)
    ),
    vscode.commands.registerCommand(
      `${EXTENSION_NAME}.insertFromSelections`,
      (forceHashKey) => insertFromSelections(context, forceHashKey)
    ),
    vscode.commands.registerCommand(
      `${EXTENSION_NAME}.insertFromClipboard`,
      (forceHashKey) => insertFromClipboard(context, forceHashKey)
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
