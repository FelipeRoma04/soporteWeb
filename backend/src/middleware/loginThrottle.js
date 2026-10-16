// Límite de intentos de inicio de sesión. Protege cada cuenta sin bloquear a toda una oficina:
//  - por correo + IP:  pocos intentos desde un mismo equipo (quien ataca no puede dejar fuera a la víctima desde otra IP)
//  - por correo (cualquier IP): tope mayor contra ataques distribuidos
// Cada intento se cuenta al recibirlo (así una ráfaga en paralelo no se cuela antes de que se registre el primer fallo)
// y se devuelve si el inicio de sesión resulta correcto. Detrás de un proxy hay que configurar TRUST_PROXY para ver la IP real.
// Contadores en memoria: para varias instancias del servidor conviene un almacén compartido (p. ej. Redis).
export function loginThrottle({ windowMs = 15 * 60_000, maxPerIpEmail = 5, maxPerEmail = 20, maxKeys = 20_000 } = {}) {
  const byIpEmail = new Map();
  const byEmail = new Map();

  const recent = (map, key, now) => (map.get(key) || []).filter((time) => now - time < windowMs);
  const store = (map, key, list) => {
    map.delete(key); // se reinserta al final: al superar maxKeys se descartan las claves más antiguas
    map.set(key, list);
    while (map.size > maxKeys) map.delete(map.keys().next().value);
  };

  setInterval(() => {
    const now = Date.now();
    for (const map of [byIpEmail, byEmail]) for (const [key, times] of map) if (!times.some((time) => now - time < windowMs)) map.delete(key);
  }, Math.max(windowMs, 60_000)).unref();

  return (req, res, next) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase().slice(0, 254) : '';
    if (!email) return next(); // sin correo el inicio de sesión se rechaza antes de comprobar ninguna contraseña
    const now = Date.now();
    const ipKey = `${req.ip || 'unknown'}|${email}`;
    const ipList = recent(byIpEmail, ipKey, now);
    const emailList = recent(byEmail, email, now);

    if (ipList.length >= maxPerIpEmail || emailList.length >= maxPerEmail) {
      const oldest = ipList.length >= maxPerIpEmail ? ipList[0] : emailList[0];
      const retryAfter = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({ message: `Demasiados intentos de inicio de sesión. Inténtalo de nuevo en ${Math.ceil(retryAfter / 60)} minuto(s).` });
    }

    store(byIpEmail, ipKey, [...ipList, now]);
    store(byEmail, email, [...emailList, now]);
    res.on('finish', () => {
      if (res.statusCode !== 200) return;
      byIpEmail.delete(ipKey);
      const list = byEmail.get(email) || [];
      const index = list.indexOf(now);
      if (index !== -1) list.splice(index, 1);
    });
    next();
  };
}