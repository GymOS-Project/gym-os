import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'

export default defineConfig(() => ({
  root: __dirname,
  server: {
    host: '0.0.0.0',
    port: 8089,
  },
  plugins: [react()].filter(Boolean),
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
  },
  rollupOptions: {
    output: {
      manualChunks: {
        react: ['react', 'react-dom'],
      },
    },
  },
}))
