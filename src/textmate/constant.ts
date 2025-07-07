import htmlPackageJson from '../../public/extensions/html/package.json'
import typescriptPackageJson from '../../public/extensions/typescript-basics/package.json'
import angularPackageJson from '../../public/extensions/vscode-ng-language-service/package.json'

// TODO can we read from extension configuration?
export const EXTENSION_GRAMMARS = [
  {
    syntaxesPath: 'public/extensions/html',
    grammars: htmlPackageJson.contributes.grammars,
  },
  {
    syntaxesPath: 'public/extensions/typescript-basics',
    grammars: typescriptPackageJson.contributes.grammars,
  },
  {
    syntaxesPath: 'public/extensions/vscode-ng-language-service',
    grammars: angularPackageJson.contributes.grammars,
  },
] as const

// TODO now only consider html and typescript
export const LANGUAGE_STRING_TO_NUMBER: { [P: string]: number } = {
  html: 2,
  typescript: 3,
} as const  
