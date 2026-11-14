
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
    plugins: [react()],

    // Docker and backend API proxy configuration
    server: {
        host: '0.0.0.0',
        proxy: {
            '/api': {
                target: process.env.DOCKER_ENV
                    ? 'http://backend:8000'
                    : 'http://localhost:8000',
                changeOrigin: true,
            },
        },
    },

    // CI testing configuration
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: ['./src/tests/setup.ts'],
    },
})
