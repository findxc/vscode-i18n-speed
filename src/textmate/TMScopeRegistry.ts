// mostly copied from https://github.com/microsoft/vscode/blob/1.101.2/src/vs/workbench/services/textMate/common/TMScopeRegistry.ts

import * as vscode from 'vscode'
import { LanguageId, StandardTokenType } from './type.js'

export interface IValidGrammarDefinition {
  location: vscode.Uri
  language?: string
  scopeName: string
  embeddedLanguages: IValidEmbeddedLanguagesMap
  tokenTypes: IValidTokenTypeMap
  injectTo?: string[]
  balancedBracketSelectors: string[]
  unbalancedBracketSelectors: string[]
  sourceExtensionId?: string
}

export interface IValidTokenTypeMap {
  [selector: string]: StandardTokenType
}

export interface IValidEmbeddedLanguagesMap {
  [scopeName: string]: LanguageId
}

export class TMScopeRegistry {
  private _scopeNameToLanguageRegistration: {
    [scopeName: string]: IValidGrammarDefinition
  }

  constructor() {
    this._scopeNameToLanguageRegistration = Object.create(null)
  }

  public reset(): void {
    this._scopeNameToLanguageRegistration = Object.create(null)
  }

  public register(def: IValidGrammarDefinition): void {
    if (this._scopeNameToLanguageRegistration[def.scopeName]) {
      const existingRegistration =
        this._scopeNameToLanguageRegistration[def.scopeName]
      if (existingRegistration.location !== def.location) {
        console.warn(
          `Overwriting grammar scope name to file mapping for scope ${def.scopeName}.\n` +
            `Old grammar file: ${existingRegistration.location}.\n` +
            `New grammar file: ${def.location}`
        )
      }
    }
    this._scopeNameToLanguageRegistration[def.scopeName] = def
  }

  public getGrammarDefinition(
    scopeName: string
  ): IValidGrammarDefinition | null {
    return this._scopeNameToLanguageRegistration[scopeName] || null
  }
}
