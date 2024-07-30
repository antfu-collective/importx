type ArgumentTypes<T> = T extends (...args: infer U) => any ? U : never

export type SupportedLoader = 'tsx' | 'jiti' | 'bundle-require' | 'native' | 'jiti-v1'

export interface FeaturesOptions {
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
   *  - `bundle-require`
   *
   * Affects `auto` resolution:
   * - When set to `false`, `native` will be fallback to `tsx` or `jiti`
   *
   * @default null
   */
  cache?: boolean | null
  /**
   * List dependencies of the module.
   *
   * Only available for `tsx` and `bundle-require` loader.
   *
   * Affects `auto` resolution:
   * - When set to `true`, `jiti` will be fallback to `bundle-require`
   *
   * Setting to `null` means it doesn't matter for you.
   *
   * @default null
   */
  listDependencies?: boolean | null
  /**
   * Whether module resolution and evaluation type
   *
   * Setting to `null` means it doesn't matter for you.
   *
   * @default null
   */
  type?: 'module' | 'commonjs' | null

  /**
   * Exclude loaders from being used.
   *
   * Only affects `auto` resolution.
   */
  excludeLoaders?: SupportedLoader[]
}

export interface ImportxOptions extends FeaturesOptions {
  /**
   * Loader to use for importing the file.
   * @default 'auto'
   */
  loader?: SupportedLoader | 'auto'
  /**
   * Fallback loaders used to import the module.
   *
   * @default ['jiti']
   */
  fallbackLoaders?: SupportedLoader[] | false
  /**
   * Options for each loader
   * Only the loader that is used will be applied.
   */
  loaderOptions?: {
    /**
     * Options for `tsx` loader.
     *
     * @see https://tsx.is/node/ts-import
     */
    tsx?: Omit<Partial<Exclude<ArgumentTypes<typeof import('tsx/esm/api').tsImport>['1'], string>>, 'parentURL'>
    /**
     * Options for `jiti` loader.
     *
     * @see https://github.com/unjs/jiti#options
     */
    jiti?: import('jiti').JitiOptions
    /**
     * Options for `jiti-v1` loader.
     *
     * @default { esmResolve: true }
     */
    jitiV1?: import('jiti-v1').JITIOptions
    /**
     * Options for `bundle-require` loader.
     *
     * @see https://github.com/egoist/bundle-require
     * @see https://www.jsdocs.io/package/bundle-require#Options
     */
    bundleRequire?: Omit<Partial<import('bundle-require').Options>, 'filepath' | 'cwd'>
  }
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
   * Resolved full path the specifier points to.
   */
  fullPath: string
  /**
   * Enable module cache or not
   */
  cache: boolean | null
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
