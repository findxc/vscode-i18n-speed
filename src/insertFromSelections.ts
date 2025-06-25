import * as vscode from 'vscode'
import { sortBy } from 'lodash'
import {
  getFormattedI18nText,
  getI18nFilesGlobPattern,
  parseNameSpace,
  updateJsonContent,
} from './util'
import { I18N_URIS_CACHE_KEY } from './constant'

let lastSelectedI18nFile = ''

export default async function insertFromSelections(
  context: vscode.ExtensionContext
) {
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
      const text = getFormattedI18nText(originText, editor.document.uri)
      return {
        selection,
        text,
      }
    })
    .filter(item => item.text)

  if (!selections.length) {
    vscode.window.showInformationMessage('No valid text selections found')
    return
  }

  const i18nFilesGlobPattern = getI18nFilesGlobPattern()
  if (!i18nFilesGlobPattern) {
    vscode.window.showInformationMessage(
      'Need configure i18nGlobalFilesDir at first'
    )
    return
  }

  const i18nUriStrings =
    context.workspaceState.get<string[]>(I18N_URIS_CACHE_KEY) || []
  const i18nUris = i18nUriStrings.map(item => vscode.Uri.parse(item))

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

  const keys = await updateJsonContent(
    i18nFileSelected.uri,
    selections.map(item => item.text)
  )

  const namespace = parseNameSpace(i18nFileSelected.uri.path)

  // TODO need consider react which uses just value; maybe use a configuration to decide
  const isHtmlFile = editor.document.fileName.endsWith('.html')

  editor.edit(editBuilder => {
    selections.forEach((item, index) => {
      // TODO read 't' from configuration?
      let value = `t('${namespace}:${keys[index]}')`

      value = isHtmlFile ? `{{ ${value} }}` : `this.${value}`
      editBuilder.replace(item.selection, value)
    })
  })
}
