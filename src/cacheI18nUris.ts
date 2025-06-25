import * as vscode from 'vscode'
import { getI18nFilesGlobPattern } from './util'
import AsyncActions from './AsyncActions'
import { I18N_URIS_CACHE_KEY } from './constant'

export default function cacheI18nUris(context: vscode.ExtensionContext) {
  // TODO now only support one workspace folder and will not listen workspace folder changes
  if (vscode.workspace.workspaceFolders?.length !== 1) {
    return
  }

  const asyncActions = new AsyncActions()

  asyncActions.push(() =>
    vscode.workspace.findFiles(getI18nFilesGlobPattern()).then(uris =>
      context.workspaceState.update(
        I18N_URIS_CACHE_KEY,
        uris.map(item => item.toString())
      )
    )
  )

  const watcher = vscode.workspace.createFileSystemWatcher(
    new vscode.RelativePattern(
      vscode.workspace.workspaceFolders[0],
      getI18nFilesGlobPattern()
    ),
    false,
    true,
    false
  )

  watcher.onDidCreate(uri => {
    asyncActions.push(() => {
      const i18nUriStrings =
        context.workspaceState.get<string[]>(I18N_URIS_CACHE_KEY) || []
      return context.workspaceState.update(
        I18N_URIS_CACHE_KEY,
        i18nUriStrings.concat(uri.toString())
      )
    })
  })

  watcher.onDidDelete(uri => {
    asyncActions.push(() => {
      const i18nUriStrings =
        context.workspaceState.get<string[]>(I18N_URIS_CACHE_KEY) || []
      const uriString = uri.toString()
      return context.workspaceState.update(
        I18N_URIS_CACHE_KEY,
        i18nUriStrings.filter(item => item !== uriString)
      )
    })
  })

  context.subscriptions.push(watcher)
  context.subscriptions.push(asyncActions)
}
