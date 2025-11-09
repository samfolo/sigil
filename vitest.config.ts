import {resolve} from 'path';

import react from '@vitejs/plugin-react';
import {defineConfig} from 'vitest/config';

export default defineConfig({
	plugins: [react()],
	test: {
		globals: true,
		environment: 'jsdom',
		env: {
			NODE_ENV: 'test',
		},
		include: ['**/*.{test,spec}.{ts,tsx}'],
		exclude: ['node_modules', 'dist', '.next'],
		setupFiles: ['./vitest.setup.ts'],
		typecheck: {
			enabled: true,
			tsconfig: './tsconfig.json',
		},
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
			exclude: [
				'node_modules/',
				'**/*.{test,spec}.{ts,tsx}',
				'**/*.config.ts',
				'**/*.fixtures.{ts,tsx}',
				'dist/',
				'.next/',
			],
		},
	},
	resolve: {
		alias: {
			'@sigil': resolve(__dirname, './'),
		},
	},
});
