import * as vscode from 'vscode'
import { isI18nFile } from './util'
import { EXTENSION_NAME } from './constant'

export default async function insert() {
  const editor = vscode.window.activeTextEditor

  if (!editor) {
    return
  }

  const command = isI18nFile(editor.document.uri)
    ? `${EXTENSION_NAME}.insertFromClipboard`
    : `${EXTENSION_NAME}.insertFromSelections`

  await vscode.commands.executeCommand(command)
}
