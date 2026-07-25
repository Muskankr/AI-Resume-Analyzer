const CACHE_NAME = 'resume-analyzer-v1'
const ASSETS_TO_CACHE = ['/', '/index.html', '/manifest.json', '/favicon.ico']

// Install Event - Caching the app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE)
    })
  )
  self.skipWaiting()
})

// Activate Event - Clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key)
          }
        })
      )
    })
  )
  self.clients.claim()
})

// Fetch Event - Network first fallback to cache, then offline notice
self.addEventListener('fetch', (event) => {
  // Only handle standard same-origin navigation/assets requests
  if (event.request.mode === 'navigate' || event.request.method === 'GET') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse
          }

          // Custom beautiful offline message fallback shell
          if (event.request.mode === 'navigate') {
            return new Response(
              `
              <!DOCTYPE html>
              <html lang="en">
              <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Offline | AI Resume Analyzer</title>
                <style>
                  body { background: #0f0f19; color: #fff; font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; text-align: center; }
                  .container { padding: 20px; border: 1px solid rgba(255,255,255,0.08); background: #1e1e2f; border-radius: 12px; max-width: 400px; }
                  h1 { font-size: 24px; margin-bottom: 8px; color: #a5b4fc; }
                  p { color: #cbd5e1; font-size: 14px; line-height: 1.5; }
                </style>
              </head>
              <body>
                <div class="container">
                  <h1>📡 You are currently offline</h1>
                  <p>The AI Resume Analyzer requires an active internet network to compute parser weights. Please check your connection and try again.</p>
                </div>
              </body>
              </html>
              `,
              { headers: { 'Content-Type': 'text/html' } }
            )
          }
        })
      })
    )
  }
})
