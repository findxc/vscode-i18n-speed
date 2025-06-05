import * as vscode from 'vscode'
import { sortBy } from 'lodash'
import {
  getFormattedI18nKeyAndText,
  getI18nFilesGlobPattern,
  parseNameSpace,
  updateJsonContent,
} from './util'

let lastSelectedI18nFile = ''

export default async function insertFromSelections() {
  const editor = vscode.window.activeTextEditor
  if (!editor) {
    return
  }

  if (!vscode.workspace.workspaceFolders?.length) {
    vscode.window.showInformationMessage('No workspace folders found')
    return
  }

  const selections = editor.selections
    .map(selection => {
      const originText = editor.document.getText(selection)
      const { key, text } = getFormattedI18nKeyAndText(
        originText,
        editor.document.uri
      )
      return {
        selection,
        text,
        key,
      }
    })
    .filter(item => item.key)

  if (!selections.length) {
    vscode.window.showInformationMessage('No valid text selections found')
    return
  }

  const i18nFilesGlobPattern = getI18nFilesGlobPattern()
  if (!i18nFilesGlobPattern) {
    vscode.window.showInformationMessage(
      'Need configure at least i18nGlobalFilesDir or (i18nNonGlobalFilesDir and i18nNonGlobalFileSuffix)'
    )
    return
  }

  const i18nUris = await vscode.workspace.findFiles(i18nFilesGlobPattern)

  if (!i18nUris.length) {
    vscode.window.showInformationMessage('No i18n files found in the workspace')
    return
  }

  const onlyOneWorkspaceFolder = vscode.workspace.workspaceFolders.length === 1

  let formattedFiles = sortBy(i18nUris, 'path').map(uri => {
    const workspaceFolder = vscode.workspace.workspaceFolders!.find(item =>
      uri.path.startsWith(item.uri.path)
    )!
    const fileRelativePath = uri.path.replace(
      new RegExp(`^${workspaceFolder.uri.path}/`),
      ''
    )
    const fileRelativePathContainWorkspaceFolderName = uri.path.replace(
      new RegExp(
        `^${workspaceFolder.uri.path.split('/').slice(0, -1).join('/')}/`
      ),
      ''
    )
    const label = onlyOneWorkspaceFolder
      ? fileRelativePath
      : fileRelativePathContainWorkspaceFolderName
    const picked = label === lastSelectedI18nFile
    return {
      uri,
      label,
      picked,
      description: picked ? '(last selected)' : '',
      workspaceFolder,
      fileRelativePath,
    }
  })

  formattedFiles = [
    ...formattedFiles.filter(item => item.picked),
    ...formattedFiles.filter(item => !item.picked),
  ]

  const i18nFileSelected = await vscode.window.showQuickPick(formattedFiles, {
    title: 'Please select the i18n file to insert',
  })

  if (!i18nFileSelected) {
    return
  }

  lastSelectedI18nFile = i18nFileSelected.label

  await updateJsonContent(i18nFileSelected.uri, selections)

  const namespace = parseNameSpace(i18nFileSelected.uri.path)

  // TODO need consider react which uses just value; maybe use a configuration to decide
  const isHtmlFile = editor.document.fileName.endsWith('.html')

  editor.edit(editBuilder => {
    selections.forEach(item => {
      // TODO read 't' from configuration?
      let value = `t('${namespace}:${item.key}')`

      value = isHtmlFile ? `{{ ${value} }}` : `this.${value}`
      editBuilder.replace(item.selection, value)
    })
  })
}
