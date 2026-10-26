const http = require('http')
const fs = require('fs')
const path = require('path')
const os = require('os')
const ChromecastAPI = require('chromecast-api')
const screenshot = require('screenshot-desktop')

const PORT = 8080
const IMAGE_FILENAME = 'current-screen.jpg'
const IMAGE_PATH = path.join(__dirname, IMAGE_FILENAME)
const CAPTURE_INTERVAL_MS = 1000

let frameCount = 0
let requestCount = 0
let isCapturing = false

// Obtener la dirección IPv4 local del PC
function getLocalIP () {
  const interfaces = os.networkInterfaces()
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address
      }
    }
  }
  return '127.0.0.1'
}

// Función de captura continua de pantalla
async function captureScreen () {
  if (isCapturing) return
  isCapturing = true

  try {
    await screenshot({ filename: IMAGE_PATH })
    frameCount++
    const timestamp = new Date().toLocaleTimeString()
    console.log(`[Frame #${frameCount}] ${timestamp} - Captura actualizada`)
  } catch (err) {
    console.error(`[Frame #${frameCount + 1}] Error en captura:`, err.message)
  } finally {
    isCapturing = false
  }
}

async function startLiveScreen () {
  const localIP = getLocalIP()
  const imageUrl = `http://${localIP}:${PORT}/${IMAGE_FILENAME}`

  console.log(`IP local: ${localIP}`)
  console.log(`URL de transmisión: ${imageUrl}`)

  // Servidor HTTP local con registros detallados de peticiones
  const server = http.createServer((req, res) => {
    requestCount++
    const timestamp = new Date().toLocaleTimeString()
    const clientIP = req.socket.remoteAddress || 'desconocida'
    const userAgent = req.headers['user-agent'] || 'no especificado'

    console.log(`\n[HTTP #${requestCount}] ${timestamp}`)
    console.log(`Método: ${req.method} ${req.url}`)
    console.log(`IP: ${clientIP}`)
    console.log(`User-Agent: ${userAgent}`)

    if (fs.existsSync(IMAGE_PATH)) {
      res.writeHead(200, {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      })
      fs.createReadStream(IMAGE_PATH).pipe(res)
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' })
      res.end('Captura no disponible')
    }
  })

  server.listen(PORT, async () => {
    console.log('Servidor HTTP iniciado.')

    // Captura inicial previa a la conexión
    await captureScreen()

    console.log('Buscando TV en la red local...')
    const client = new ChromecastAPI()

    client.on('device', (device) => {
      const friendlyName = device.friendlyName || device.name

      if (friendlyName && friendlyName.includes('[LG] TV_Home3')) {
        console.log(`\nTV encontrada: ${friendlyName} (${device.host})`)
        console.log('Iniciando transmisión única...')

        // Iniciar sesión Cast única
        device.play({ url: imageUrl, contentType: 'image/jpeg' }, (err) => {
          if (err) {
            console.error('Error al iniciar transmisión:', err.message)
            return
          }

          console.log('Sesión Cast iniciada. Comenzando capturas continuas cada 1s...\n')

          // Bucle de captura continua cada 1 segundo
          setInterval(captureScreen, CAPTURE_INTERVAL_MS)
        })
      }
    })

    client.on('error', (err) => {
      console.error('Error en búsqueda Cast:', err.message)
    })
  })
}

startLiveScreen()
