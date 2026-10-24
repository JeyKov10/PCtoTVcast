const ChromecastAPI = require('chromecast-api')
const DefaultMediaReceiver = require('castv2-client').DefaultMediaReceiver

console.log('Buscando dispositivo Chromecast en la red local...')

try {
  const client = new ChromecastAPI()

  client.on('device', (device) => {
    const friendlyName = device.friendlyName || device.name

    if (friendlyName && friendlyName.includes('[LG] TV_Home3')) {
      console.log('\nDispositivo encontrado:')
      console.log(`- friendlyName: ${friendlyName}`)
      console.log(`- host: ${device.host}`)

      // Establecer conexión con el televisor
      device._connect((err) => {
        if (err) {
          console.error(`Error de conexión con ${friendlyName}:`, err.message)
          return
        }

        console.log(`Conexión establecida con ${friendlyName} (${device.host})`)

        console.log('Iniciando Default Media Receiver...')

        // Lanzar la aplicación Default Media Receiver
        device._launch(DefaultMediaReceiver, (err, player) => {
          if (err) {
            console.error('Error al iniciar receptor:', err.message)
            return
          }

          console.log('Receptor iniciado correctamente en el televisor')
        })
      })
    }
  })

  client.on('error', (err) => {
    console.error('Error en la búsqueda:', err.message)
  })
} catch (error) {
  console.error('Error al iniciar:', error.message)
}
