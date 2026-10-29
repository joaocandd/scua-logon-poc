// @ts-check
const eslint = require('@eslint/js');
const { defineConfig } = require('eslint/config');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');
const storybook = require('eslint-plugin-storybook');

module.exports = defineConfig([
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.stylistic,
      angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'app',
          style: 'camelCase',
        },
      ],
      // Atributo só para componentes que precisam ser o elemento nativo, como <button app-button>.
      '@angular-eslint/component-selector': [
        'error',
        {
          type: ['element', 'attribute'],
          prefix: 'app',
          style: 'kebab-case',
        },
      ],
    },
  },
  {
    // @angular/animations só está instalado porque o @storybook/angular-vite o exige (ADR 0003).
    files: ['src/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@angular/animations',
                '@angular/animations/*',
                '@angular/platform-browser/animations',
                '@angular/platform-browser/animations/*',
              ],
              message:
                '@angular/animations está obsoleto no Angular 22. Use animate.enter e animate.leave (ADR 0003).',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.html'],
    extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
    rules: {},
  },
  // Regras para as stories e para a configuração do Storybook.
  storybook.configs['flat/recommended'],
]);
