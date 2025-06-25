import * as vscode from 'vscode'
import { camelCase, kebabCase, snakeCase } from 'lodash'
import { EXTENSION_NAME, TAB_WIDTH } from './constant'
import { Configuration, NamingStyle } from './type'

export function getI18nFilesGlobPattern(): string {
  const configuration = vscode.workspace.getConfiguration(EXTENSION_NAME)
  const { i18nGlobalFilesDir } = configuration
  return i18nGlobalFilesDir ? `${i18nGlobalFilesDir}/*.json` : ''
}

export function parseFilePathFromI18nIdentifier(
  i18nIdentifier: string
): string {
  const configuration = vscode.workspace.getConfiguration(EXTENSION_NAME)
  const { i18nGlobalFilesDir } = configuration

  const [namespace] = i18nIdentifier.split(':')
  if (!namespace) {
    return ''
  }

  return `${i18nGlobalFilesDir}/${getFormattedName(
    'i18nFileNamingStyle',
    namespace
  )}.json`
}

export function isI18nFile(uri: vscode.Uri): boolean {
  const filePath = uri.path
  const configuration = vscode.workspace.getConfiguration(EXTENSION_NAME)
  const { i18nGlobalFilesDir } = configuration

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

  if (
    i18nGlobalFilesDir &&
    fileRelativePath.startsWith(i18nGlobalFilesDir) &&
    fileRelativePath.endsWith('.json')
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
  const { i18nGlobalFilesDir } = configuration

  return fileRelativePath
    .replace(new RegExp(`${i18nGlobalFilesDir}/`), '')
    .replace(/\.json$/, '')
    .split('/')
    .map(item => getFormattedName('i18nNamespaceNamingStyle', item))
    .join(':')
}

export function getFormattedI18nText(
  text: string | undefined,
  uri?: vscode.Uri
): string {
  text = (text || '').replace(/\n+ */g, ' ').trim()
  // TODO actually we need to consider whether text is wrapped by html tag or not
  if (uri?.path.endsWith('.ts')) {
    text = text.replace(/^(['"`])(.+)\1$/, '$2') // Remove quotes
  }
  return text
}

const parseKeyMap: {
  [P in NamingStyle | 'hash']: (v: string) => string
} = {
  camelCase: (v: string): string => camelCase(v),
  kebabCase: (v: string): string => kebabCase(v),
  snakeCase: (v: string): string => snakeCase(v),
  upperSnakeCase: (v: string): string => snakeCase(v).toUpperCase(),
  hash: (v: string): string => generateHash(),
}

export function getFormattedName(
  type: Extract<keyof Configuration, `${string}NamingStyle`>,
  text: string
): string {
  const configuration = vscode.workspace.getConfiguration(EXTENSION_NAME)
  const value = configuration[type]
  return parseKeyMap[value](text)
}

function generateUniqKey(json: object, generator: () => string): string {
  let key = undefined
  while (!key) {
    key = generator()
    if (key in json) {
      key = undefined
    }
  }
  return key
}

export async function updateJsonContent(
  uri: vscode.Uri,
  texts: string[],
  forceHashKey = false
): Promise<string[]> {
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

  const keys: string[] = []

  texts.forEach(text => {
    let textExist = false

    for (const k in jsonContent) {
      if (jsonContent[k] === text) {
        textExist = true
        keys.push(k)
        break
      }
    }

    if (!textExist) {
      const i18nKeyNamingStyle = forceHashKey
        ? 'hash'
        : vscode.workspace.getConfiguration(EXTENSION_NAME).i18nKeyNamingStyle

      let key: string

      if (i18nKeyNamingStyle === 'hash') {
        key = generateUniqKey(jsonContent, () => generateHash())
      } else {
        key = getFormattedName('i18nKeyNamingStyle', text)
        if (key in jsonContent) {
          key = generateUniqKey(jsonContent, () => `${key}_${generateHash()}`)
        }
      }

      keys.push(key)
      jsonContent[key] = text
    }
  })

  await vscode.workspace.fs.writeFile(
    uri,
    Buffer.from(`${JSON.stringify(jsonContent, null, TAB_WIDTH)}\n`, 'utf8')
  )

  return keys
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

export function generateHash(): string {
  // TODO may be need to use a better hash function
  return (+new Date() * Math.random()).toString(36).substring(0, 4)
}
