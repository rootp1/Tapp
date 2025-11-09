import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    // Allow cloudflared dev host and auto-resolved hosts for remote WebApp tunnels
    // Allow all hosts (useful for tunnels like cloudflared/ngrok during development)
    // Note: in production prefer locking this down to specific hostnames.
    allowedHosts: true,
  },
  build: {
    outDir: 'dist',
  },
});
