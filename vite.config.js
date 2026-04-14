import restart from 'vite-plugin-restart'
import glsl from 'vite-plugin-glsl'

export default {
    root: 'src/', // Sources files (typically where index.html is)
    publicDir: '../static/', // Path from "root" to static assets (files that are served as they are)
    server:
    {
        host: true,
        open: !('SANDBOX_URL' in process.env || 'CODESANDBOX_HOST' in process.env),
        proxy:
        {
            '/api/brief': {
                target: 'http://localhost:8001',
                rewrite: () => '/brief-snapshot'
            },
            '/api/ask': {
                target: 'https://mit-expression-brain-production.up.railway.app',
                changeOrigin: true,
                rewrite: () => '/ask'
            },
            '/api/rotation': {
                target: 'http://localhost:8001',
                rewrite: (path) => path.replace('/api/rotation', '/rotation')
            }
        }
    },
    build:
    {
        outDir: '../dist', // Output in the dist/ folder
        emptyOutDir: true, // Empty the folder first
        sourcemap: true // Add sourcemap
    },
    plugins:
    [
        restart({ restart: [ '../static/**', ] }), // Restart server on static file change
        glsl()                                      // Transform .glsl files into JS string exports
    ],
}