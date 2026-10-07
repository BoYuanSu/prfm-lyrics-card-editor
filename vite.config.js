import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/prfm-lyrics-card-editor/',
  plugins: [react()],
});
