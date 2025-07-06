import { LANGUAGE_STRING_TO_NUMBER } from './constant'
import {
  IValidEmbeddedLanguagesMap,
  IValidGrammarDefinition,
  IValidTokenTypeMap,
} from './TMScopeRegistry'
import { ITMSyntaxExtensionPoint, StandardTokenType } from './type'

// mostly copied from https://github.com/microsoft/vscode/blob/1.101.2/src/vs/workbench/services/textMate/browser/textMateTokenizationFeatureImpl.ts#L143
export default function validateGrammarDefinition(
  grammar: ITMSyntaxExtensionPoint
): IValidGrammarDefinition {
  const embeddedLanguages: IValidEmbeddedLanguagesMap = Object.create(null)
  if (grammar.embeddedLanguages) {
    const scopes = Object.keys(grammar.embeddedLanguages)
    for (let i = 0, len = scopes.length; i < len; i++) {
      const scope = scopes[i]
      const language = grammar.embeddedLanguages[scope]
      if (typeof language !== 'string') {
        // never hurts to be too careful
        continue
      }
      if (LANGUAGE_STRING_TO_NUMBER[language]) {
        embeddedLanguages[scope] = LANGUAGE_STRING_TO_NUMBER[language]
      }
    }
  }

  const tokenTypes: IValidTokenTypeMap = Object.create(null)
  if (grammar.tokenTypes) {
    const scopes = Object.keys(grammar.tokenTypes)
    for (const scope of scopes) {
      const tokenType = grammar.tokenTypes[scope]
      switch (tokenType) {
        case 'string':
          tokenTypes[scope] = StandardTokenType.String
          break
        case 'other':
          tokenTypes[scope] = StandardTokenType.Other
          break
        case 'comment':
          tokenTypes[scope] = StandardTokenType.Comment
          break
      }
    }
  }

  const validLanguageId =
    grammar.language && LANGUAGE_STRING_TO_NUMBER[grammar.language]
      ? grammar.language
      : undefined

  function asStringArray(array: unknown, defaultValue: string[]): string[] {
    if (!Array.isArray(array)) {
      return defaultValue
    }
    if (!array.every(e => typeof e === 'string')) {
      return defaultValue
    }
    return array
  }

  return {
    location: grammar.path,
    language: validLanguageId,
    scopeName: grammar.scopeName,
    embeddedLanguages: embeddedLanguages,
    tokenTypes: tokenTypes,
    injectTo: grammar.injectTo,
    balancedBracketSelectors: asStringArray(grammar.balancedBracketScopes, [
      '*',
    ]),
    unbalancedBracketSelectors: asStringArray(
      grammar.unbalancedBracketScopes,
      []
    ),
  }
}
