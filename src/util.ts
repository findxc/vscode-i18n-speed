import * as vscode from 'vscode'
import { camelCase, kebabCase, snakeCase } from 'lodash'
import { EXTENSION_NAME, TAB_WIDTH } from './constant'
import { Configuration, NamingStyle } from './type'

export function getI18nFilesGlobPattern(): string {
  const configuration = vscode.workspace.getConfiguration(EXTENSION_NAME)
  const { i18nGlobalFilesDir, i18nNonGlobalFilesDir, i18nNonGlobalFileSuffix } =
    configuration

  const globPatterns = [
    i18nGlobalFilesDir ? `${i18nGlobalFilesDir}/**/*.json` : '',
    i18nNonGlobalFilesDir && i18nNonGlobalFileSuffix
      ? `${i18nNonGlobalFilesDir}/**/*${i18nNonGlobalFileSuffix}`
      : '',
  ].filter(item => item)

  if (!globPatterns.length) {
    return ''
  }

  if (globPatterns.length === 1) {
    return globPatterns[0]
  }

  return `{${globPatterns.join(',')}}`
}

export function getI18nFilesGlobPatternOfI18nIdentifier(
  i18nIdentifier: string
): string {
  const configuration = vscode.workspace.getConfiguration(EXTENSION_NAME)
  const { i18nGlobalFilesDir, i18nNonGlobalFilesDir, i18nNonGlobalFileSuffix } =
    configuration

  const namespaceList = i18nIdentifier.split(':').slice(0, -1)

  const globPatterns = []

  if (i18nGlobalFilesDir) {
    const globalFilePath = [
      ...namespaceList
        .slice(0, -1)
        .map(item => getFormattedName('i18nFolderNamingStyle', item)),
      ...namespaceList
        .slice(-1)
        .map(item => getFormattedName('i18nFileNamingStyle', item)),
    ].join('/')
    globPatterns.push(`${i18nGlobalFilesDir}/${globalFilePath}.json`)
  }

  if (i18nNonGlobalFilesDir && i18nNonGlobalFileSuffix) {
    const nonGlobalFilePath = getFormattedName(
      'i18nFileNamingStyle',
      namespaceList.join('_')
    )
    globPatterns.push(
      `${i18nNonGlobalFilesDir}/**/${nonGlobalFilePath}${i18nNonGlobalFileSuffix}`
    )
  }

  if (!globPatterns.length) {
    return ''
  }

  if (globPatterns.length === 1) {
    return globPatterns[0]
  }

  return `{${globPatterns.join(',')}}`
}

export function isI18nFile(uri: vscode.Uri): boolean {
  const filePath = uri.path
  const configuration = vscode.workspace.getConfiguration(EXTENSION_NAME)
  const { i18nGlobalFilesDir, i18nNonGlobalFilesDir, i18nNonGlobalFileSuffix } =
    configuration

  const workspaceFolder = vscode.workspace.workspaceFolders?.find(item =>
    filePath.startsWith(item.uri.path)
  )

  if (!workspaceFolder) {
    return false
  }

  const fileRelativePath = filePath.replace(
    new RegExp(`^${workspaceFolder.uri.path}/`),
    ''
  )
  if (fileRelativePath.startsWith(i18nGlobalFilesDir)) {
    return true
  }

  if (
    fileRelativePath.startsWith(i18nNonGlobalFilesDir) &&
    fileRelativePath.endsWith(i18nNonGlobalFileSuffix)
  ) {
    return true
  }

  return false
}

export function parseNameSpace(filePath: string): string {
  const workspaceFolder = vscode.workspace.workspaceFolders?.find(item =>
    filePath.startsWith(item.uri.path)
  )
  if (!workspaceFolder) {
    throw new Error(
      `No workspace folder found for the given file path: ${filePath}`
    )
  }

  const fileRelativePath = filePath.replace(
    new RegExp(`^${workspaceFolder.uri.path}/`),
    ''
  )

  const configuration = vscode.workspace.getConfiguration(EXTENSION_NAME)

  if (fileRelativePath.endsWith(configuration.i18nNonGlobalFileSuffix)) {
    return getFormattedName(
      'i18nNamespaceNamingStyle',
      fileRelativePath
        .split('/')
        .pop()!
        .replace(new RegExp(`${configuration.i18nNonGlobalFileSuffix}$`), '')
    )
  }

  return fileRelativePath
    .replace(/\.json$/, '')
    .split('/')
    .map(item => getFormattedName('i18nNamespaceNamingStyle', item))
    .join(':')
}

export function getFormattedI18nKeyAndText(
  text: string | undefined,
  uri?: vscode.Uri
): {
  key: string
  text: string
} {
  text = (text || '').replace(/\n+ */g, ' ').trim()
  // TODO need test react or to consider tsx or jsx?
  if (uri?.path.endsWith('.ts')) {
    text = text.replace(/^(['"`])(.+)\1$/, '$2') // Remove quotes from TypeScript strings
  }
  const key = getFormattedName('i18nKeyNamingStyle', text)
  return { key, text }
}

const parseKeyMap: {
  [P in NamingStyle]: (v: string) => string
} = {
  camelCase: (v: string): string => camelCase(v),
  kebabCase: (v: string): string => kebabCase(v),
  snakeCase: (v: string): string => snakeCase(v),
  upperSnakeCase: (v: string): string => snakeCase(v).toUpperCase(),
}

export function getFormattedName(
  type: Extract<keyof Configuration, `${string}NamingStyle`>,
  text: string
): string {
  const configuration = vscode.workspace.getConfiguration(EXTENSION_NAME)
  const value = configuration[type]
  return parseKeyMap[value](text)
}

export async function updateJsonContent(
  uri: vscode.Uri,
  values: { key: string; text: string }[]
) {
  let fileContent = (await vscode.workspace.fs.readFile(uri)).toString()

  if (isfileEmpty(fileContent)) {
    fileContent = '{}\n'
  }

  let jsonContent

  try {
    jsonContent = JSON.parse(fileContent)
  } catch (error) {
    throw new Error(`Not a valid JSON file: ${uri.path}. Error: ${error}`)
  }

  values.forEach(item => {
    jsonContent[item.key] = item.text
  })

  await vscode.workspace.fs.writeFile(
    uri,
    Buffer.from(`${JSON.stringify(jsonContent, null, TAB_WIDTH)}\n`, 'utf8')
  )
}

function isfileEmpty(content: string): boolean {
  return /^\s*$/.test(content)
}

export function parseSymbolPathAtPosition(
  symbols: vscode.DocumentSymbol[],
  cursorPosition: vscode.Position,
  parentPath: string[] = []
): string[] {
  for (const symbol of symbols || []) {
    const currentPath = parentPath.concat(symbol.name)
    if (symbol.range.contains(cursorPosition)) {
      // has detail meaning this is a leaf node
      if (symbol.detail) {
        return currentPath
      }
      return parseSymbolPathAtPosition(
        symbol.children,
        cursorPosition,
        currentPath
      )
    }
  }
  return []
}

export function parseSymbolFromPath(
  symbols: vscode.DocumentSymbol[],
  symbolPath: string[] = []
): vscode.DocumentSymbol | undefined {
  for (const symbol of symbols || []) {
    if (symbol.name === symbolPath[0]) {
      if (symbolPath.length === 1) {
        return symbol
      } else if (symbol.children.length) {
        return parseSymbolFromPath(symbol.children, symbolPath.slice(1))
      }
    }
  }
  return undefined
}
