const http = require('http')
const fs = require('fs')
const path = require('path')
const os = require('os')
const ChromecastAPI = require('chromecast-api')
const DefaultMediaReceiver = require('castv2-client').DefaultMediaReceiver
const screenshot = require('screenshot-desktop')

const PORT = 8080
const IMAGE_FILENAME = 'current-screen.jpg'
const IMAGE_PATH = path.join(__dirname, IMAGE_FILENAME)
const REFRESH_INTERVAL_MS = 2000

let isUpdating = false
let frameCount = 0
let httpRequestCount = 0

// Obtener dirección IPv4 local del PC
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

async function startCastMVP () {
  const localIP = getLocalIP()
  const baseUrl = `http://${localIP}:${PORT}/${IMAGE_FILENAME}`

  if (baseUrl.includes('<') || baseUrl.includes('>')) {
    throw new Error('baseUrl contiene HTML')
  }

  // 1. Captura de pantalla inicial
  await screenshot({ filename: IMAGE_PATH })

  // 2. Servidor HTTP local instrumentado
  const server = http.createServer((req, res) => {
    httpRequestCount++
    const clientIp = req.socket.remoteAddress || 'desconocida'
    console.log(`[HTTP #${httpRequestCount}] ${req.method} ${req.url} (IP: ${clientIp})`)

    if (req.url.startsWith('/' + IMAGE_FILENAME)) {
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
        res.end('Frame no encontrado')
      }
    } else {
      res.writeHead(404)
      res.end()
    }
  })

  server.listen(PORT, () => {
    console.log('Servidor HTTP activo en puerto ' + PORT)
    console.log('Buscando televisor [LG] TV_Home3...')

    const client = new ChromecastAPI()

    client.on('device', (device) => {
      const friendlyName = device.friendlyName || device.name

      if (friendlyName && friendlyName.includes('[LG] TV_Home3')) {
        console.log('\nTelevisor detectado: ' + friendlyName + ' (' + device.host + ')')
        console.log('Estableciendo conexión Cast y obteniendo instancia del receptor...')

        // Conexión Cast directa
        device._connect((err) => {
          if (err) {
            console.error('Error al conectar:', err.message)
            return
          }

          // Lanzar DefaultMediaReceiver para obtener la referencia activa 'player'
          device._launch(DefaultMediaReceiver, (err, player) => {
            if (err) {
              console.error('Error al lanzar receptor:', err.message)
              return
            }

            console.log('Receptor iniciado con éxito. Comenzando bucle de actualización activa con player.load()...')

            // Bucle de actualización activa usando player.load() sobre la misma sesión
            setInterval(async () => {
              if (isUpdating) return
              isUpdating = true

              try {
                // Capturar pantalla del escritorio
                await screenshot({ filename: IMAGE_PATH })
                frameCount++

                // Construcción de la URL de frame con timestamp
                const frameUrl = baseUrl + '?t=' + Date.now()

                // Objeto media corregido con contentId para el protocolo Cast
                const mediaObject = {
                  contentId: frameUrl,
                  contentType: 'image/jpeg',
                  streamType: 'NONE'
                }

                if (frameCount === 1) {
                  console.log('Objeto media en Frame #1:', JSON.stringify(mediaObject))
                }

                // Enviar orden LOAD explícita a la TV
                player.load(mediaObject, (err) => {
                  if (err) {
                    console.error('[Frame #' + frameCount + '] Error en player.load():', err.message)
                  } else {
                    console.log('[Frame #' + frameCount + '] ' + new Date().toLocaleTimeString() + ' - Orden player.load() enviada a la TV')
                  }
                  isUpdating = false
                })
              } catch (err) {
                console.error('Error en captura de pantalla:', err.message)
                isUpdating = false
              }
            }, REFRESH_INTERVAL_MS)
          })
        })
      }
    })

    client.on('error', (err) => {
      console.error('Error en búsqueda Cast:', err.message)
    })
  })
}

startCastMVP()
