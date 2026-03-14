import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { nodePolyfills } from 'vite-plugin-node-polyfills'; // Provides polyfills for Node.js modules (buffer, process, etc) to support simple-peer that expects Node.js globals
// https://vite.dev/config/
export default defineConfig({
    // Plugins
    plugins: [
        react(),
        nodePolyfills({
            protocolImports: true, // Allows imports like import fs from 'node:fs' to be polyfilled in browser
        }),
    ],
    // Define global variables
    define: {
        "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV || "development"), // For development/production checks
        "global": "window", // Simple-peer requires global object
    },
    // Resolve aliases
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            '@in-aspired/shared': path.resolve(__dirname, '../shared/src/index.ts'),
        },
    },
    server: {
        headers: {
            "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
        },
        proxy: {
            '/api': {
                target: 'http://localhost:5000', // Express backend
                changeOrigin: true,
                secure: false,
                // REWRITE tells Vite which requests to proxy
                rewrite: (path) => {
                    console.log('Proxying path:', path);
                    return path; // Keep the path as-is
                },
            },
        },
    },
});
