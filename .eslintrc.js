module.exports = {
  env: {
    node: true,
    es2022: true,
  },
  extends: ['airbnb-base'],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  rules: {
    'import/extensions': ['error', 'ignorePackages', { js: 'never' }],
    'no-console': ['warn', { allow: ['error', 'warn'] }],
    'no-underscore-dangle': 'off',
    'no-param-reassign': ['error', { props: false }],
    'consistent-return': 'off',
    'no-restricted-syntax': 'off',
    'no-await-in-loop': 'off',
  },
}
