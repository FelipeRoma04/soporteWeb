export function errorHandler(error, _req, res, _next) {
  console.error(error);
  if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Ya existe un registro con esos datos' });
  res.status(error.status || 500).json({ message: error.status ? error.message : 'Error interno del servidor' });
}