// Force Rebuild
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      sourcemap: false,
    },
    base: './',
    server: {
      proxy: {
        '/functions': {
          target: env.VITE_SUPABASE_URL,
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path,
        },
      },
    },
  };
});