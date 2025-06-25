/**
 * camelCase: fooBar
 * kebabCase: foo-bar
 * snakeCase: foo_bar
 * upperSnakeCase: FOO_BAR
 */
export type NamingStyle =
  | 'camelCase'
  | 'kebabCase'
  | 'snakeCase'
  | 'upperSnakeCase'

export interface Configuration {
  i18nGlobalFilesDir: string
  i18nFileNamingStyle: NamingStyle
  i18nNamespaceNamingStyle: NamingStyle
  i18nKeyNamingStyle: NamingStyle | 'hash'
}
