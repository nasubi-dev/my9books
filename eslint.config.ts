import antfu from '@antfu/eslint-config'

export default antfu({
  typescript: {
    overrides: {
      // React Router の loader / action / meta / ページコンポーネントは戻り値型を不要に
      'ts/explicit-function-return-type': [
        'error',
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
          allowHigherOrderFunctions: true,
          allowedNames: [
            'loader',
            'action',
            'clientLoader',
            'clientAction',
            'meta',
            'links',
          ],
        },
      ],
      // process はグローバルで使用可（Node.js 環境）
      'node/prefer-global/process': ['error', 'always'],
    },
  },
  react: true,
  ignores: [
    'build/**',
    '.react-router/**',
    'drizzle/**',
    'node_modules/**',
    'public/**',
    'docs/**',
    'app/welcome/**',
    'README.md',
  ],
})
