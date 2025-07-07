import * as vscode from 'vscode'

import * as vsctm from 'vscode-textmate'
import * as oniguruma from 'vscode-oniguruma'
import {
  IValidEmbeddedLanguagesMap,
  IValidGrammarDefinition,
  TMScopeRegistry,
} from './TMScopeRegistry'
import { EXTENSION_GRAMMARS, LANGUAGE_STRING_TO_NUMBER } from './constant'
import validateGrammarDefinition from './validateGrammarDefinition'

// TODO add cache for grammars?
// const grammarMap: {
//   [P: keyof typeof LANGUAGE_STRING_TO_NUMBER]: vsctm.IGrammar
// } = {}

const _languageToScope = new Map<string, string>()
const _scopeRegistry = new TMScopeRegistry()
const _injectedEmbeddedLanguages: {
  [scopeName: string]: IValidEmbeddedLanguagesMap[]
} = {}

let registry: vsctm.Registry

export async function initTextMate(context: vscode.ExtensionContext) {
  const onigWasmUri = vscode.Uri.joinPath(
    context.extensionUri,
    'public/onig.wasm'
  )
  const onigWasm = await vscode.workspace.fs.readFile(onigWasmUri)

  const vscodeOnigurumaLib = oniguruma.loadWASM(onigWasm).then(() => {
    return {
      createOnigScanner(patterns: string[]) {
        return new oniguruma.OnigScanner(patterns)
      },
      createOnigString(s: string) {
        return new oniguruma.OnigString(s)
      },
    }
  })

  const _injections: { [scopeName: string]: string[] } = {}

  registry = new vsctm.Registry({
    onigLib: vscodeOnigurumaLib,
    loadGrammar: async (scopeName: string) => {
      const grammarDefinition = _scopeRegistry.getGrammarDefinition(scopeName)
      if (!grammarDefinition) {
        console.log(`No grammar found for scope ${scopeName}`)
        return null
      }

      const grammarUri = grammarDefinition.location
      try {
        const content = await vscode.workspace.fs.readFile(grammarUri)
        return vsctm.parseRawGrammar(content.toString(), grammarUri.path)
      } catch (e) {
        console.error(
          `Unable to load and parse grammar for scope ${scopeName} from ${grammarUri.path}`,
          e
        )
        return null
      }
    },
    getInjections: (scopeName: string) => {
      const scopeParts = scopeName.split('.')
      let injections: string[] = []
      for (let i = 1; i <= scopeParts.length; i++) {
        const subScopeName = scopeParts.slice(0, i).join('.')
        injections = [...injections, ...(_injections[subScopeName] || [])]
      }
      return injections
    },
  })

  const grammarDefinitions: IValidGrammarDefinition[] =
    EXTENSION_GRAMMARS.reduce((total, current) => {
      const formattedGrammars = current.grammars.map(item =>
        validateGrammarDefinition({
          ...item,
          path: vscode.Uri.joinPath(
            context.extensionUri,
            current.syntaxesPath,
            item.path
          ),
        })
      )
      // TODO fix ts ignore
      // @ts-ignore
      return total.concat(formattedGrammars)
    }, [])

  for (const validGrammar of grammarDefinitions) {
    _scopeRegistry.register(validGrammar)

    if (validGrammar.injectTo) {
      for (const injectScope of validGrammar.injectTo) {
        let injections = _injections[injectScope]
        if (!injections) {
          _injections[injectScope] = injections = []
        }
        injections.push(validGrammar.scopeName)
      }

      if (validGrammar.embeddedLanguages) {
        for (const injectScope of validGrammar.injectTo) {
          let injectedEmbeddedLanguages =
            _injectedEmbeddedLanguages[injectScope]
          if (!injectedEmbeddedLanguages) {
            _injectedEmbeddedLanguages[injectScope] =
              injectedEmbeddedLanguages = []
          }
          injectedEmbeddedLanguages.push(validGrammar.embeddedLanguages)
        }
      }
    }

    if (validGrammar.language) {
      _languageToScope.set(validGrammar.language, validGrammar.scopeName)
    }
  }
}

export async function selectStringsNeedI18n(context: vscode.ExtensionContext) {
  const editor = vscode.window.activeTextEditor
  if (!editor) {
    return
  }

  const languageId = editor.document.languageId
  const encodedLanguageId = LANGUAGE_STRING_TO_NUMBER[languageId]
  const scopeName = _languageToScope.get(languageId) as string
  const grammarDefinition = _scopeRegistry.getGrammarDefinition(
    scopeName
  ) as IValidGrammarDefinition

  const embeddedLanguages = grammarDefinition.embeddedLanguages
  if (_injectedEmbeddedLanguages[scopeName]) {
    const injectedEmbeddedLanguages = _injectedEmbeddedLanguages[scopeName]
    for (const injected of injectedEmbeddedLanguages) {
      for (const scope of Object.keys(injected)) {
        embeddedLanguages[scope] = injected[scope]
      }
    }
  }

  let grammar

  try {
    grammar = await registry.loadGrammarWithConfiguration(
      scopeName,
      encodedLanguageId,
      {
        embeddedLanguages,
        tokenTypes: <any>grammarDefinition.tokenTypes,
        balancedBracketSelectors: grammarDefinition.balancedBracketSelectors,
        unbalancedBracketSelectors:
          grammarDefinition.unbalancedBracketSelectors,
      }
    )
  } catch (err) {
    throw err
  }

  if (!grammar) {
    return
  }

  const text = editor.document.getText().split('\n')
  let ruleStack = vsctm.INITIAL

  const lineToText = 'Preview Menu'

  for (let i = 0; i < text.length; i++) {
    const line = text[i]
    const lineTokens = grammar.tokenizeLine(line, ruleStack)
    if (line.includes(lineToText)) {
      console.log(`\nTokenizing line: ${line}`)
    }
    for (let j = 0; j < lineTokens.tokens.length; j++) {
      const token = lineTokens.tokens[j]
      if (line.includes(lineToText)) {
        console.log(
          ` - token from ${token.startIndex} to ${token.endIndex} ` +
            `(${line.substring(token.startIndex, token.endIndex)}) ` +
            `with scopes ${token.scopes.join(', ')}`
        )
      }
    }
    ruleStack = lineTokens.ruleStack
  }

  // const options = {
  // 	languageId: languageId,
  // 	grammar: grammar,
  // 	initialState: vsctm.INITIAL,
  // 	containsEmbeddedLanguages: containsEmbeddedLanguages,
  // 	sourceExtensionId: grammarDefinition.sourceExtensionId,
  // }

  console.log('success')
}
