type ArgumentTypes<T> = T extends (...args: infer U) => any ? U : never

export type SupportedLoader = 'tsx' | 'jiti' | 'bundle-require' | 'native'

export interface ImportxOptions {
  /**
   * Loader to use for importing the file.
   * @default 'auto'
   */
  loader?: SupportedLoader | 'auto'
  /**
   * Options for each loader
   * Only the loader that is used will be applied.
   */
  loaderOptions?: {
    /**
     * Options for `tsx` loader.
     *
     * @see https://tsx.is/node#tsimport
     */
    tsx?: Omit<Partial<Exclude<ArgumentTypes<typeof import('tsx/esm/api').tsImport>['1'], string>>, 'parentURL'>
    /**
     * Options for `jiti` loader.
     *
     * @default { esmResolve: true }
     * @see https://github.com/unjs/jiti#options
     */
    jiti?: import('jiti').JITIOptions
    /**
     * Options for `bundle-require` loader.
     *
     * @see https://github.com/egoist/bundle-require
     * @see https://www.jsdocs.io/package/bundle-require#Options
     */
    bundleRequire?: Omit<Partial<import('bundle-require').Options>, 'filepath' | 'cwd'>
  }
  /**
   * Whether to cache the imported module.
   *
   * Setting to `null` means it doesn't matter for you.
   *
   * By the spec of ESM, modules are always cached.
   *
   * Meaning that if you want to re-import a module without cache,
   * you can't use native ESM import.
   *
   * `cache: false` does not compatible with following loaders:
   *  - `native`
   *
   * `cache: true` does not compatible with following loaders:
   *  - `tsx`
   *  - `bundle-require`
   *
   * When `false` is passed, the `auto` mode will fallback to `tsx`
   * for all files include non-TypeScript files.
   *
   * @default null
   */
  cache?: boolean | null
  /**
   * Bypass the `importx` options validation and import anyway.
   *
   * The final behavior is determined by the loader and might not always work as your configuration.
   *
   * @default false
   */
  ignoreImportxWarning?: boolean
  /**
   * The URL of the parent module.
   * Usually you pass `import.meta.url` or `__filename` of the module you are doing the importing.
   */
  parentURL: string | URL
  /**
   * The `with` option for native `import()` call.
   *
   * @see https://github.com/tc39/proposal-import-attributes#dynamic-import
   */
  with?: ImportCallOptions['with']
}

/**
 * Additional information about the imported module from `importx`.
 */
export interface ImportxModuleInfo {
  /**
   * Resolved loader used to import the module.
   */
  loader: SupportedLoader
  /**
   * User passed import specifier.
   */
  specifier: string
  /**
   * Parent URL, normalized to file URL.
   */
  parentURL: URL
  /**
   * Parent path, normalized to file path.
   */
  parentPath: string
  /**
   * Timestamp when import is initialized.
   */
  timestampInit: number
  /**
   * Timestamp when import is completed.
   */
  timestampLoad: number
  /**
   * List of dependencies of the module, presented as full file URLs.
   * Only available for `tsx` and `bundle-require` loader.
   * Will be `undefined` for other loaders.
   */
  dependencies?: string[]
  /**
   * If an single module instance is imported multiple times, this will be the previous import info.
   */
  previousImportInfo?: ImportxModuleInfo
}
