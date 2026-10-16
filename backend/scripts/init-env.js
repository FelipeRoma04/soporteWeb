// Crea backend/.env a partir de .env.example con un JWT_SECRET aleatorio. No sobrescribe un .env existente.
import { randomBytes } from 'node:crypto';
import { access, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = path.join(backendDir, '.env');

try {
  await access(target);
  console.log('• backend/.env ya existe: no se modifica.');
} catch {
  const example = await readFile(path.join(backendDir, '.env.example'), 'utf8');
  await writeFile(target, example.replace(/^JWT_SECRET=.*$/m, `JWT_SECRET=${randomBytes(32).toString('hex')}`));
  console.log('✔ backend/.env creado con una clave JWT aleatoria.');
}
console.log('  Ábrelo y completa ADMIN_PASSWORD (y DB_PASSWORD si no usas el docker-compose incluido).');