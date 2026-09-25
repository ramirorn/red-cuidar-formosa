import { execSync } from 'node:child_process';
import { rmSync } from 'node:fs';

// Se ejecuta una vez antes de todas las pruebas de integración.
export default function preparar() {
    const url = process.env.DATABASE_URL_PRUEBAS ?? 'postgresql://rol_api:clave_api@localhost:5432/red_cuidar_pruebas';
    const base = new URL(url).pathname.slice(1);

    // Resguardo: estas pruebas borran todas las tablas. Nunca deben apuntar a una base real.
    if (!base.includes('pruebas')) {
        throw new Error(`La base "${base}" no parece de pruebas: su nombre debe contener "pruebas"`);
    }

    execSync('npx prisma migrate deploy', { env: { ...process.env, DATABASE_URL: url }, stdio: 'pipe' });
    rmSync('/tmp/red-cuidar-integracion', { recursive: true, force: true });
}
