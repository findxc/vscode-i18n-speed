import { Configuration } from './src/type'

declare module 'vscode' {
  // WorkspaceConfiguration can not pass exact type, so manually define it here
  interface WorkspaceConfiguration extends Configuration {}
}
