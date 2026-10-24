const http = require('http')
const fs = require('fs')
const path = require('path')
const os = require('os')
const ChromecastAPI = require('chromecast-api')

const PORT = 8080
const IMAGE_FILENAME = 'test-image.jpg'
const IMAGE_PATH = path.join(__dirname, IMAGE_FILENAME)

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

const localIP = getLocalIP()
const imageUrl = `http://${localIP}:${PORT}/${IMAGE_FILENAME}`

console.log(`IP local detectada: ${localIP}`)
console.log(`URL de la imagen: ${imageUrl}`)

// Crear servidor HTTP local para servir la imagen al televisor
const server = http.createServer((req, res) => {
  if (fs.existsSync(IMAGE_PATH)) {
    res.writeHead(200, { 'Content-Type': 'image/jpeg' })
    fs.createReadStream(IMAGE_PATH).pipe(res)
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end('test-image.jpg no encontrada')
  }
})

server.listen(PORT, () => {
  console.log('Servidor HTTP local iniciado.')
  console.log('Buscando TV en la red local...')

  try {
    const client = new ChromecastAPI()

    client.on('device', (device) => {
      const friendlyName = device.friendlyName || device.name

      if (friendlyName && friendlyName.includes('[LG] TV_Home3')) {
        console.log(`\nTV encontrada: ${friendlyName} (${device.host})`)
        console.log('Conexión establecida.')
        console.log('Iniciando receptor...')

        device.play({ url: imageUrl, contentType: 'image/jpeg' }, (err) => {
          if (err) {
            console.error('Error al enviar la imagen:', err.message)
            return
          }

          console.log('Receptor iniciado.')
          console.log('Imagen enviada correctamente al televisor')
        })
      }
    })

    client.on('error', (err) => {
      console.error('Error en la búsqueda:', err.message)
    })
  } catch (error) {
    console.error('Error al iniciar:', error.message)
  }
})
