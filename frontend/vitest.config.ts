import { defineConfig } from 'vitest/config'
import { svelte } from '@sveltejs/vite-plugin-svelte'

// https://vite.dev/config/
export default defineConfig({
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: ['./setupTests.ts'],
        exclude: ['src/**/*.svelte', 'node_modules', 'dist'],
    },
    plugins: [svelte()],
})
