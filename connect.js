const ChromecastAPI = require('chromecast-api')

console.log('Buscando dispositivos Chromecast en la red local...')

try {
  const client = new ChromecastAPI()

  client.on('device', (device) => {
    const friendlyName = device.friendlyName || device.name

    if (friendlyName && friendlyName.includes('[LG] TV_Home3')) {
      console.log('\nDispositivo objetivo detectado:')
      console.log(`- friendlyName: ${friendlyName}`)
      console.log(`- Host final: ${device.host}`)

      console.log('Estableciendo conexión...')

      device._connect((err) => {
        if (err) {
          console.error(`Error al conectar con ${friendlyName}:`, err.message)
          return
        }

        console.log(`Conexión exitosa con ${friendlyName} (${device.host})`)
      })
    }
  })

  client.on('error', (err) => {
    console.error('Error en la búsqueda:', err.message)
  })
} catch (error) {
  console.error('Error al iniciar la conexión:', error.message)
}
