/**
 * =============================================================================
 * SERVICIO LOCAL: LANZADOR DEL DASHBOARD EJECUTIVO FIDUCIARIO
 * Inicia el servidor local en puerto 8765 y abre el navegador automáticamente
 * =============================================================================
 */

import { spawn, exec } from 'child_process';
import http from 'http';

const PORT = process.env.PORT || 8765;
const TARGET_URL = 'http://localhost:' + PORT + '/executive-dashboard';

function isServerRunning(port) {
  return new Promise((resolve) => {
    const req = http.get('http://localhost:' + port + '/executive-dashboard', (res) => {
      resolve(true);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function main() {
  console.log('⚡ [SERVICIO LOCAL]: Verificando estado del servidor fiduciario...');
  const running = await isServerRunning(PORT);

  if (!running) {
    console.log('🚀 [SERVICIO LOCAL]: Iniciando servidor Express en puerto ' + PORT + '...');
    const serverProc = spawn('node', ['server.js'], {
      stdio: 'inherit',
      shell: true,
      detached: true
    });
    serverProc.unref();
    // Esperar 1.5 segundos a que levante
    await new Promise((r) => setTimeout(r, 1500));
  } else {
    console.log('✅ [SERVICIO LOCAL]: El servidor ya se encuentra activo en http://localhost:' + PORT);
  }

  console.log('🌐 [SERVICIO LOCAL]: Abriendo Dashboard Ejecutivo en: ' + TARGET_URL);
  const openCmd = process.platform === 'win32' ? 'start ' + TARGET_URL : 'open ' + TARGET_URL;
  exec(openCmd, (err) => {
    if (err) console.warn('Abre manualmente en tu navegador:', TARGET_URL);
    else console.log('✨ [SERVICIO LOCAL]: Dashboard desplegado con éxito.');
  });
}

main();
