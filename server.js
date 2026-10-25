// ==============================================================================
// Kazi Canvas Gallery — cPanel Production Server Startup File
// ==============================================================================
// In cPanel "Setup Node.js App", point "Application startup file" to: server.js
// This boots Next.js with Phusion Passenger or standalone reverse-proxy on cPanel.
// ==============================================================================

const { createServer } = require('http')
const { parse } = require('url')
const path = require('path')
const next = require('next')

const dev = process.env.NODE_ENV !== 'production'
const hostname = process.env.HOSTNAME || '0.0.0.0'
const port = parseInt(process.env.PORT, 10) || 3000

// Initialize Next.js app in production mode with explicit project root directory
const app = next({
  dev,
  dir: path.resolve(__dirname),
  hostname,
  port,
})
const handle = app.getRequestHandler()

app
  .prepare()
  .then(() => {
    createServer(async (req, res) => {
      try {
        const parsedUrl = parse(req.url, true)
        await handle(req, res, parsedUrl)
      } catch (err) {
        console.error('Error handling request:', req.url, err)
        res.statusCode = 500
        res.end('Internal Server Error')
      }
    })
      .once('error', (err) => {
        console.error('Server failed to start:', err)
        process.exit(1)
      })
      .listen(port, () => {
        console.log(`> Kazi Canvas Gallery running on http://${hostname}:${port} (NODE_ENV: ${process.env.NODE_ENV || 'production'})`)
      })
  })
  .catch((err) => {
    console.error('Next.js failed to initialize:', err)
    process.exit(1)
  })
