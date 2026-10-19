import { defineConfig } from 'electron-vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  main: {},
  preload: {
    build: {
      rollupOptions: {
        output: {
          format: 'cjs'
        }
      }
    }
  },
  renderer: {
    plugins: [
      react(),
      {
        name: 'production-content-security-policy',
        apply: 'build',
        transformIndexHtml(html) {
          return html.replace(
            '<head>',
            `<head>\n    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; connect-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; form-action 'none'">`
          );
        }
      }
    ],
    server: {
      host: '127.0.0.1'
    }
  }
});
