// Límite simple en memoria por usuario autenticado (ventana deslizante). Cada llamada crea su propio contador.
// Para varias instancias del servidor conviene usar un almacén compartido (p. ej. Redis).
export function rateLimit({ windowMs = 60_000, max = 20 } = {}) {
  const buckets = new Map();

  setInterval(() => {
    const now = Date.now();
    for (const [key, times] of buckets) if (!times.some((time) => now - time < windowMs)) buckets.delete(key);
  }, Math.max(windowMs, 60_000)).unref();

  return (req, res, next) => {
    const key = req.user?.id ?? req.ip;
    const now = Date.now();
    const recent = (buckets.get(key) || []).filter((time) => now - time < windowMs);
    if (recent.length >= max) {
      res.set('Retry-After', String(Math.ceil((recent[0] + windowMs - now) / 1000)));
      return res.status(429).json({ message: 'Demasiadas solicitudes. Espera un momento e inténtalo de nuevo.' });
    }
    recent.push(now);
    buckets.set(key, recent);
    next();
  };
}