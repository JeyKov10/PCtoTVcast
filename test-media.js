const ChromecastAPI = require('chromecast-api')

// Vídeo de prueba accesible de forma pública
const MEDIA_URL = 'http://commondatastorage.googleapis.com/gtv-videos-bucket/big_buck_bunny_1080p.mp4'

console.log('Buscando dispositivo Chromecast en la red local...')

try {
  const client = new ChromecastAPI()

  client.on('device', (device) => {
    const friendlyName = device.friendlyName || device.name

    if (friendlyName && friendlyName.includes('[LG] TV_Home3')) {
      console.log('\nDispositivo detectado:')
      console.log(`- friendlyName: ${friendlyName}`)
      console.log(`- host: ${device.host}`)

      console.log('Conexión establecida.')
      console.log('Iniciando receptor y enviando contenido...')

      // Conectar, lanzar Default Media Receiver y reproducer vídeo MP4
      device.play(MEDIA_URL, (err) => {
        if (err) {
          console.error('Error al reproducir contenido:', err.message)
          return
        }

        console.log('Receptor iniciado.')
        console.log('Contenido enviado correctamente al televisor:', MEDIA_URL)
      })
    }
  })

  client.on('error', (err) => {
    console.error('Error en la búsqueda:', err.message)
  })
} catch (error) {
  console.error('Error al iniciar:', error.message)
}
