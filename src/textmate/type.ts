import * as vscode from 'vscode'

export const enum LanguageId {
  Null = 0,
  PlainText = 1,
}

export const enum StandardTokenType {
  Other = 0,
  Comment = 1,
  String = 2,
  RegEx = 3,
}

// TODO fix: no need to add undefined
export interface IEmbeddedLanguagesMap {
  [scopeName: string]: string | undefined
}

export interface TokenTypesContribution {
  [scopeName: string]: string
}

export interface ITMSyntaxExtensionPoint {
  language?: string
  scopeName: string
  path: vscode.Uri
  embeddedLanguages?: IEmbeddedLanguagesMap
  tokenTypes?: TokenTypesContribution
  injectTo?: string[]
  balancedBracketScopes?: string[]
  unbalancedBracketScopes?: string[]
}
