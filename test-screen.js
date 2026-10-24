const http = require('http')
const fs = require('fs')
const path = require('path')
const os = require('os')
const ChromecastAPI = require('chromecast-api')
const screenshot = require('screenshot-desktop')

const PORT = 8080
const IMAGE_FILENAME = 'current-screen.jpg'
const IMAGE_PATH = path.join(__dirname, IMAGE_FILENAME)

// Obtener dirección IPv4 local del PC en la red
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

async function startScreenCast () {
  try {
    // 1. Obtener información de resolución de pantalla
    const displays = await screenshot.listDisplays()
    const mainDisplay = displays[0] || { width: 'desconocida', height: 'desconocida' }
    console.log(`Resolución capturada: ${mainDisplay.width}x${mainDisplay.height}`)

    // 2. Tomar captura de pantalla del escritorio principal
    const imgPath = await screenshot({ filename: IMAGE_PATH })
    console.log(`Ruta de la imagen generada: ${imgPath}`)

    // 3. Obtener IP local del PC y construir la URL HTTP de acceso
    const localIP = getLocalIP()
    const imageUrl = `http://${localIP}:${PORT}/${IMAGE_FILENAME}`
    console.log(`IP local detectada: ${localIP}`)
    console.log(`URL enviada al televisor: ${imageUrl}`)

    // 4. Crear servidor HTTP local para servir la imagen capturada
    const server = http.createServer((req, res) => {
      if (fs.existsSync(IMAGE_PATH)) {
        res.writeHead(200, { 'Content-Type': 'image/jpeg' })
        fs.createReadStream(IMAGE_PATH).pipe(res)
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' })
        res.end('Captura no encontrada')
      }
    })

    server.listen(PORT, () => {
      console.log('Servidor HTTP iniciado.')
      console.log('Buscando TV en la red local...')

      // 5. Iniciar cliente Cast y transmitir captura al televisor
      const client = new ChromecastAPI()

      client.on('device', (device) => {
        const friendlyName = device.friendlyName || device.name

        if (friendlyName && friendlyName.includes('[LG] TV_Home3')) {
          console.log(`\nTV encontrada: ${friendlyName} (${device.host})`)
          console.log('Conexión establecida.')
          console.log('Iniciando receptor y enviando captura...')

          device.play({ url: imageUrl, contentType: 'image/jpeg' }, (err) => {
            if (err) {
              console.error('Error al enviar la captura:', err.message)
              return
            }

            console.log('Captura enviada correctamente al televisor')
          })
        }
      })

      client.on('error', (err) => {
        console.error('Error en la búsqueda:', err.message)
      })
    })
  } catch (err) {
    console.error('Error al procesar la captura:', err.message)
  }
}

startScreenCast()
