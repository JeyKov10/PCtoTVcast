const ChromecastAPI = require('chromecast-api')

// Mensaje al iniciar la búsqueda
console.log('Buscando dispositivos Chromecast en la red local...')

try {
  // Inicializar cliente para la búsqueda de dispositivos
  const client = new ChromecastAPI()

  // Evento que se ejecuta al detectar un dispositivo
  client.on('device', (device) => {
    const name = device.friendlyName || device.name || 'Desconocido'
    const ip = device.host || 'No disponible'

    console.log('\nDispositivo encontrado:')
    console.log(`- Nombre: ${name}`)
    console.log(`- IP: ${ip}`)
  })

  // Manejo de errores del cliente
  client.on('error', (err) => {
    console.error('Error en la búsqueda:', err.message)
  })
} catch (error) {
  console.error('Error al inicializar la detección:', error.message)
}
