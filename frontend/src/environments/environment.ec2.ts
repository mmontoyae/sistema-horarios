// Despliegue en la instancia EC2: Nginx sirve el frontend y redirige /api al backend,
// por lo que la ruta es relativa y funciona con cualquier IP o dominio.
export const environment = {
  produccion: true,
  modoDemo: false,
  urlApi: '/api'
};
