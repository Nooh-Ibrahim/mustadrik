'use strict';
// ESLint flat config.
//
// The renderer is ~36 classic <script> files sharing one global scope. To keep `no-undef` — the rule
// that catches calls to functions that do not exist — the shared globals are computed from the source
// (scripts/renderer-globals.js). Inline onclick="…" handlers are checked by tests/handlers.test.js.

const js = require('@eslint/js');
const globals = require('globals');
const { sharedRendererGlobals } = require('./scripts/renderer-globals');

const common = {
  ...js.configs.recommended.rules,
  'no-empty': ['error', { allowEmptyCatch: true }],
  'no-unused-vars': 'off',          // many functions are only referenced from index.html onclick attributes
  'no-redeclare': 'off',            // a module's own declarations are also listed as shared globals
  'no-inner-declarations': 'off',
  'no-useless-escape': 'off',
  'no-prototype-builtins': 'off',
  'no-cond-assign': ['error', 'except-parens'],
  'no-control-regex': 'off',
  'no-useless-assignment': 'off',  // «var body='',foot='';» then filled per branch — intentional style here
};

module.exports = [
  { ignores: ['node_modules/**', 'dist/**', 'web/**', 'src/assets/**', 'noah_dashboard_v10.html'] },
  {
    files: ['src/js/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: { ...globals.browser, lucide: 'readonly', noahAPI: 'readonly', ...sharedRendererGlobals() },
    },
    rules: common,
  },
  {
    files: ['main.js', 'preload.js', 'lib/**/*.js', 'scripts/**/*.js', 'tests/**/*.js', 'eslint.config.js'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'commonjs', globals: { ...globals.node } },
    rules: common,
  },
];
