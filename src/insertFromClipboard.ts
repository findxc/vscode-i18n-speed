import * as vscode from 'vscode'
import { getFormattedI18nText, isI18nFile, updateJsonContent } from './util'

export default async function insertFromClipboard(
  context: vscode.ExtensionContext,
  forceHashKey: boolean = false
) {
  const editor = vscode.window.activeTextEditor

  if (!editor) {
    return
  }

  if (!isI18nFile(editor.document.uri)) {
    await vscode.window.showInformationMessage(
      'Current file is not an i18n file'
    )
    return
  }

  const clipboard = await vscode.env.clipboard.readText()

  const text = getFormattedI18nText(clipboard)

  if (!text) {
    await vscode.window.showInformationMessage('Clipboard is empty')
    return
  }

  await updateJsonContent(editor.document.uri, [text], forceHashKey)

  // const cursorLine = editor.selection.active.line
  // const position = new vscode.Position(cursorLine + 1, 0)

  // editor.edit(editBuilder => {
  //   editBuilder.insert(position, formattedContent)
  // })
}
