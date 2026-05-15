// Anti-pattern definitions for the module-scope init-call scanner.
//
// The scanner walks every .ts/.tsx file that imports the given `module` with
// `binding` (named or default per `importKind`). For each rule it then
// searches for module-scope calls and reports their line numbers.
//
// Rule shape:
//   name             string  unique id used in reports/baselines
//   module           string  npm package name (or path) to match in `from`
//   binding          string  identifier to look for in the import clause
//   importKind       'named' | 'default'
//   matchCall        boolean detect `binding(...)` calls at module scope
//   matchMethodCall  string[]? detect `binding.method(...)` calls at module
//                              scope (only methods in the array count)
//
// At least one of `matchCall` or `matchMethodCall` must be set.
//
// Adding patterns: append a new entry. The scanner is data-driven, so you
// only need to touch this file.

export default [
  {
    name: 'i18next-t-call',
    module: 'i18next',
    binding: 't',
    importKind: 'named',
    matchCall: true,
  },
  // Examples for future use (uncomment and adjust as needed):
  //
  // {
  //   name: 'sentry-init',
  //   module: '@sentry/react',
  //   binding: 'init',
  //   importKind: 'named',
  //   matchCall: true,
  // },
  // {
  //   name: 'dayjs-locale',
  //   module: 'dayjs',
  //   binding: 'dayjs',
  //   importKind: 'default',
  //   matchMethodCall: ['locale', 'tz'],
  // },
];
