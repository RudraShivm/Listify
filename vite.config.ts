import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Use (process as any).cwd() to resolve the type error in environments where Node.js types are not fully defined in the config context
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    base: '/Listify/',
    plugins: [react()],
    define: {
      'process.env.VITE_BACKEND_URL': JSON.stringify(env.VITE_BACKEND_URL),
      'process.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL),
      'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY),
    },
    server: {
      host: true,
      watch: {
        usePolling: true,
      },
    },
  };
});