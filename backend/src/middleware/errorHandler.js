export function errorHandler(error, req, res, _next) {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const isDuplicate = error.code === '23505' || error.code === 'ER_DUP_ENTRY';
  const status = isDuplicate ? 409 : error.status || 500;
  const code = typeof error.code === 'string' && /^[A-Z0-9]{5}$/.test(error.code) ? error.code : undefined;
  const route = req.route?.path ? `${req.baseUrl}${req.route.path}` : req.baseUrl || '/api';

  console.error('[API error]', { method: req.method, route, status, ...(code ? { code } : {}) });

  const message = isDuplicate
    ? 'Ya existe un registro con esos datos'
    : error.status ? error.message : 'Error interno del servidor';
  res.status(status).json({ message, ...(isDevelopment && code ? { code } : {}) });
}
