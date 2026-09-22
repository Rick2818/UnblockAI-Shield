/**
 * =============================================================================
 * ESCÁNER REAL DE CABECERAS HTTP Y CERTIFICADO TLS (SOLO LECTURA PÚBLICA)
 * =============================================================================
 * Hace UNA petición GET / por HTTPS al dominio indicado (siguiendo hasta 3
 * redirecciones) y analiza únicamente lo que el servidor responde de forma
 * pública: cabeceras de seguridad y datos básicos del certificado.
 *
 * NO evalúa vulnerabilidades de aplicación, NO hace pruebas de intrusión y NO
 * mide nada relacionado con ventas o atención comercial.
 *
 * Protecciones SSRF (el servidor hace la petición, así que es superficie de riesgo):
 *  - Solo nombres de dominio (se rechazan IPs literales, localhost, TLD internos).
 *  - Se resuelve el DNS y TODAS las IPs deben ser públicas (se bloquean rangos
 *    privados, loopback, link-local, CGNAT, metadata cloud, multicast, etc.).
 *  - La conexión se "ancla" a la IP ya validada (evita DNS rebinding).
 *  - Cada redirección se revalida desde cero. Solo HTTPS, solo puerto 443.
 *  - Timeouts por petición y presupuesto total; solo se leen cabeceras.
 * =============================================================================
 */

import https from 'node:https';
import dns from 'node:dns/promises';
import net from 'node:net';

const MAX_REDIRECTS = 3;
const REQUEST_TIMEOUT_MS = 5000;
const TOTAL_BUDGET_MS = 8000;
const HSTS_MIN_MAX_AGE = 15552000; // 180 días

const FORBIDDEN_TLDS = new Set([
  'localhost', 'local', 'internal', 'intranet', 'lan', 'home', 'corp', 'private',
  'localdomain', 'test', 'invalid', 'example', 'onion', 'arpa'
]);

export class ScanError extends Error {
  constructor(code, publicMessage, detail) {
    super(publicMessage);
    this.code = code;
    this.publicMessage = publicMessage;
    this.detail = detail;
  }
}

// ---------------------------------------------------------------------------
// 1. VALIDACIÓN DE DOMINIO E IP
// ---------------------------------------------------------------------------

const DOMAIN_REGEX = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/;

/**
 * Devuelve el dominio normalizado o null si no es un nombre de dominio público válido.
 * No "limpia" caracteres raros en silencio: si algo no cuadra, se rechaza.
 */
export function normalizeDomain(raw) {
  if (typeof raw !== 'string') return null;
  let s = raw.trim().toLowerCase();
  if (!s || s.length > 300) return null;
  s = s.replace(/^https?:\/\//, '');
  s = s.replace(/[/?#].*$/, '');
  s = s.replace(/\.$/, '');
  if (s.length > 253) return null;
  if (s.includes('@') || s.includes(':')) return null; // credenciales, puertos, IPv6
  if (net.isIP(s)) return null;
  if (!DOMAIN_REGEX.test(s)) return null;
  const tld = s.slice(s.lastIndexOf('.') + 1);
  if (FORBIDDEN_TLDS.has(tld)) return null;
  if (/^\d+$/.test(tld)) return null; // 1.2.3.4 y variantes numéricas
  return s;
}

const blockedRanges = new net.BlockList();
[
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8],
  ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24],
  ['192.88.99.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24],
  ['203.0.113.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4]
].forEach(([addr, prefix]) => blockedRanges.addSubnet(addr, prefix, 'ipv4'));
[
  // OJO: no añadir ::ffff:0:0/96 aquí: BlockList lo aplica también a IPv4 y bloquearía todo. Las direcciones
  // IPv4-mapeadas ya se rechazan porque IPv6 solo se acepta dentro de 2000::/3 (unicast global).
  ['::', 128], ['::1', 128], ['64:ff9b::', 96], ['100::', 64],
  ['2001::', 32], ['2001:db8::', 32], ['2002::', 16], ['fc00::', 7], ['fe80::', 10], ['ff00::', 8]
].forEach(([addr, prefix]) => blockedRanges.addSubnet(addr, prefix, 'ipv6'));

// IPv6 solo se acepta si es unicast global (2000::/3)
const globalV6 = new net.BlockList();
globalV6.addSubnet('2000::', 3, 'ipv6');

export function isPublicIp(ip) {
  try {
    if (typeof ip !== 'string' || ip.includes('%')) return false;
    const family = net.isIP(ip);
    if (family === 4) return !blockedRanges.check(ip, 'ipv4');
    if (family === 6) return globalV6.check(ip, 'ipv6') && !blockedRanges.check(ip, 'ipv6');
    return false;
  } catch {
    return false;
  }
}

function withTimeout(promise, ms, makeError) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(makeError()), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/**
 * Resuelve el host y exige que TODAS las direcciones sean públicas.
 * Devuelve la dirección validada a la que se anclará la conexión.
 */
async function resolvePublic(hostname, deps, budgetMs) {
  const lookup = deps.lookup || ((h) => dns.lookup(h, { all: true, verbatim: true }));
  const allowed = deps.isAllowedIp || isPublicIp;
  let addrs;
  let resolvedHost = hostname;

  try {
    addrs = await withTimeout(lookup(hostname), Math.min(3000, budgetMs), () => new ScanError('dns_failed', 'El DNS no respondió a tiempo.'));
  } catch (err) {
    if (err instanceof ScanError && err.code === 'dns_failed' && err.detail === 'ETIMEDOUT') throw err;

    // Fallback inteligente para dominios sin registro A en apex o con migración territorial (.com.sv -> .sv)
    const candidates = [];
    if (hostname.endsWith('.com.sv')) {
      candidates.push(hostname.replace(/\.com\.sv$/, '.sv'));
      candidates.push('www.' + hostname.replace(/\.com\.sv$/, '.sv'));
    }
    if (!hostname.startsWith('www.')) {
      candidates.push('www.' + hostname);
    }

    let resolved = false;
    for (const alt of candidates) {
      try {
        const altAddrs = await withTimeout(lookup(alt), Math.min(2000, budgetMs), () => null);
        if (Array.isArray(altAddrs) && altAddrs.length > 0) {
          addrs = altAddrs;
          resolvedHost = alt;
          resolved = true;
          break;
        }
      } catch {}
    }

    if (!resolved) {
      if (err instanceof ScanError) throw err;
      throw new ScanError('dns_failed', 'No pudimos resolver ese dominio (no existe o no tiene registros públicos).', err?.code);
    }
  }

  if (!Array.isArray(addrs) || addrs.length === 0) {
    throw new ScanError('dns_failed', 'No pudimos resolver ese dominio (no existe o no tiene registros públicos).');
  }
  if (!addrs.every((a) => allowed(a.address))) {
    throw new ScanError('blocked', 'Ese dominio apunta a una dirección no pública; por seguridad no se puede analizar.');
  }
  // Preferimos IPv4 por compatibilidad con entornos serverless
  const chosen = addrs.find((a) => a.family === 4) || addrs[0];
  return { address: chosen.address, family: chosen.family, resolvedHost };
}

// ---------------------------------------------------------------------------
// 2. PETICIÓN HTTPS ANCLADA A LA IP VALIDADA (SOLO CABECERAS)
// ---------------------------------------------------------------------------

function mapNetworkError(err) {
  if (err instanceof ScanError) return err;
  const code = err && err.code ? String(err.code) : '';
  const tlsCodes = [
    'CERT_HAS_EXPIRED', 'DEPTH_ZERO_SELF_SIGNED_CERT', 'SELF_SIGNED_CERT_IN_CHAIN',
    'UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY', 'ERR_TLS_CERT_ALTNAME_INVALID',
    'CERT_NOT_YET_VALID', 'ERR_SSL_WRONG_VERSION_NUMBER', 'ERR_SSL_TLSV1_ALERT_PROTOCOL_VERSION',
    'UNABLE_TO_CHECK_REVOCATION', 'CERT_REVOKED'
  ];
  if (tlsCodes.includes(code) || /certificate|ssl|tls/i.test(err?.message || '')) {
    return new ScanError('tls_error', 'El certificado TLS/HTTPS de ese sitio no superó la verificación.', code);
  }
  if (code === 'ETIMEDOUT' || code === 'ESOCKETTIMEDOUT') {
    return new ScanError('timeout', 'El servidor tardó demasiado en responder.', code);
  }
  if (code === 'ECONNREFUSED') {
    return new ScanError('connection_refused', 'El servidor rechazó la conexión HTTPS en el puerto 443.', code);
  }
  if (code === 'ECONNRESET' || code === 'EPIPE') {
    return new ScanError('connection_reset', 'La conexión se cerró antes de recibir respuesta.', code);
  }
  return new ScanError('network', 'No pudimos conectar con el servidor por HTTPS.', code);
}

function requestOnce(hostname, pinned, deps, timeoutMs) {
  return new Promise((resolve, reject) => {
    const started = process.hrtime.bigint();
    let settled = false;
    const done = (fn, value) => { if (!settled) { settled = true; fn(value); } };

    const req = https.request({
      host: hostname,
      port: deps.port || 443, // `deps.port` solo lo usan las pruebas locales
      method: 'GET',
      path: '/',
      servername: hostname, // SNI y verificación de certificado contra el nombre real
      agent: false,
      timeout: timeoutMs,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
        'Connection': 'close'
      },
      // Ancla la conexión a la IP ya validada (anti DNS-rebinding)
      lookup: (_host, opts, cb) => {
        if (opts && opts.all) cb(null, [{ address: pinned.address, family: pinned.family }]);
        else cb(null, pinned.address, pinned.family);
      },
      ...(deps.tlsOptions || {})
    }, (res) => {
      const ttfbMs = Math.round(Number(process.hrtime.bigint() - started) / 1e6);
      let tls = null;
      try {
        const sock = res.socket;
        const cert = sock.getPeerCertificate();
        tls = {
          protocol: sock.getProtocol ? sock.getProtocol() : null,
          validTo: cert && cert.valid_to ? new Date(cert.valid_to).toISOString() : null,
          issuer: (cert && cert.issuer && (cert.issuer.O || cert.issuer.CN)) || null
        };
      } catch { /* TLS info es opcional */ }
      const result = { status: res.statusCode, headers: res.headers, ttfbMs, tls };
      res.destroy(); // solo necesitamos las cabeceras
      done(resolve, result);
    });

    req.on('timeout', () => req.destroy(new ScanError('timeout', 'El servidor tardó demasiado en responder.')));
    req.on('error', (err) => done(reject, mapNetworkError(err)));
    req.end();
  });
}

async function fetchHeaders(startHost, deps) {
  const deadline = Date.now() + TOTAL_BUDGET_MS;
  let host = startHost;
  let redirects = 0;
  let downgradedToHttp = false;

  for (;;) {
    const remaining = deadline - Date.now();
    if (remaining <= 500) throw new ScanError('timeout', 'El análisis excedió el tiempo máximo permitido.');

    const pinned = await resolvePublic(host, deps, remaining);
    const activeHost = pinned.resolvedHost || host;
    const res = await requestOnce(activeHost, pinned, deps, Math.min(REQUEST_TIMEOUT_MS, deadline - Date.now()));

    const isRedirect = [301, 302, 303, 307, 308].includes(res.status) && res.headers.location;
    if (!isRedirect) return { ...res, host, redirects, downgradedToHttp };

    if (redirects >= MAX_REDIRECTS) {
      // Devolvemos lo que tenemos, indicando que hubo demasiadas redirecciones
      return { ...res, host, redirects, downgradedToHttp, redirectLimit: true };
    }

    let next;
    try {
      next = new URL(res.headers.location, `https://${host}/`);
    } catch {
      return { ...res, host, redirects, downgradedToHttp };
    }
    if (next.protocol === 'http:') {
      downgradedToHttp = true;
      return { ...res, host, redirects, downgradedToHttp };
    }
    if (next.protocol !== 'https:' || (next.port && next.port !== '443')) {
      return { ...res, host, redirects, downgradedToHttp };
    }
    const nextHost = normalizeDomain(next.hostname);
    if (!nextHost) return { ...res, host, redirects, downgradedToHttp };

    host = nextHost;
    redirects++;
  }
}

// ---------------------------------------------------------------------------
// 3. ANÁLISIS DE CABECERAS (FUNCIONES PURAS, FÁCILES DE PROBAR)
// ---------------------------------------------------------------------------

export function parseCsp(value) {
  const directives = {};
  String(value || '').split(';').forEach((part) => {
    const tokens = part.trim().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return;
    const name = tokens.shift().toLowerCase();
    if (!(name in directives)) directives[name] = tokens;
  });
  return directives;
}

function truncate(v, n = 300) {
  const s = String(v == null ? '' : v);
  return s.length > n ? s.slice(0, n) + '…' : s;
}

function checkCsp(headers) {
  const raw = headers['content-security-policy'];
  const reportOnly = headers['content-security-policy-report-only'];
  const base = { id: 'csp', label: 'Content-Security-Policy (CSP)', fix: ['csp'], weight: 30 };

  if (!raw) {
    if (reportOnly) {
      return { ...base, status: 'warn', severity: 'media', value: truncate(reportOnly),
        detail: 'Existe una CSP, pero solo en modo reporte (Report-Only): observa, pero no bloquea nada.' };
    }
    return { ...base, status: 'fail', severity: 'media', value: null,
      detail: 'No se envía ninguna CSP. Si algún día se inyecta un script (XSS), el navegador no tiene una segunda barrera que lo detenga.' };
  }

  const d = parseCsp(raw);
  const scriptSrc = d['script-src'] || d['script-src-elem'] || d['default-src'];
  const reasons = [];
  if (!scriptSrc) {
    reasons.push('no restringe de dónde pueden cargarse scripts (falta script-src y default-src)');
  } else {
    const t = scriptSrc.map((x) => x.toLowerCase());
    const hasNonceOrHash = t.some((x) => x.startsWith("'nonce-") || x.startsWith("'sha256-") || x.startsWith("'sha384-") || x.startsWith("'sha512-"));
    if (t.includes("'unsafe-inline'") && !hasNonceOrHash && !t.includes("'strict-dynamic'")) {
      reasons.push("permite scripts inline ('unsafe-inline'), lo que anula gran parte de la protección contra XSS");
    }
    if (t.includes("'unsafe-eval'")) reasons.push("permite eval() ('unsafe-eval')");
    if (t.includes('*') || t.includes('https:') || t.includes('http:') || t.includes('data:')) {
      reasons.push('acepta scripts desde cualquier origen (comodín o esquema completo como https:)');
    }
  }
  if (reasons.length) {
    return { ...base, status: 'warn', severity: 'baja', value: truncate(raw),
      detail: 'Hay CSP, pero es débil: ' + reasons.join('; ') + '.' };
  }
  return { ...base, status: 'ok', severity: null, value: truncate(raw),
    detail: 'CSP presente y sin las debilidades más comunes en script-src.' };
}

function checkHsts(headers) {
  const raw = headers['strict-transport-security'];
  const base = { id: 'hsts', label: 'Strict-Transport-Security (HSTS)', fix: ['hsts'], weight: 25 };
  if (!raw) {
    return { ...base, status: 'fail', severity: 'media', value: null,
      detail: 'No se envía HSTS. Un navegador que entre por http:// en una red hostil (por ejemplo WiFi pública) podría ser degradado antes de llegar a HTTPS.' };
  }
  const m = /max-age\s*=\s*"?(\d+)"?/i.exec(raw);
  const maxAge = m ? parseInt(m[1], 10) : 0;
  if (!m || maxAge < HSTS_MIN_MAX_AGE) {
    return { ...base, status: 'warn', severity: 'baja', value: truncate(raw),
      detail: `HSTS presente pero con max-age corto (${maxAge} s). Se recomienda al menos 15552000 s (180 días), idealmente 1–2 años.` };
  }
  return { ...base, status: 'ok', severity: null, value: truncate(raw),
    detail: `HSTS activo (max-age ${maxAge} s${/includesubdomains/i.test(raw) ? ', incluye subdominios' : ''}${/preload/i.test(raw) ? ', con preload' : ''}).` };
}

function checkClickjacking(headers) {
  const xfo = headers['x-frame-options'];
  const csp = headers['content-security-policy'];
  const fa = csp ? parseCsp(csp)['frame-ancestors'] : null;
  const base = { id: 'clickjacking', label: 'Protección anti-clickjacking (X-Frame-Options / frame-ancestors)', fix: ['xfo'], weight: 20 };
  const faOk = fa && !fa.includes('*') && fa.length > 0;
  const xfoOk = xfo && /^(deny|sameorigin)\b/i.test(String(xfo).trim());
  if (faOk || xfoOk) {
    return { ...base, status: 'ok', severity: null, value: truncate(xfoOk ? xfo : `frame-ancestors ${fa.join(' ')}`),
      detail: 'El sitio restringe quién puede incrustarlo en un iframe.' };
  }
  if (xfo || (fa && fa.includes('*'))) {
    return { ...base, status: 'warn', severity: 'baja', value: truncate(xfo || `frame-ancestors ${fa.join(' ')}`),
      detail: 'Hay una directiva anti-iframe, pero es permisiva o no reconocida por los navegadores modernos.' };
  }
  return { ...base, status: 'fail', severity: 'media', value: null,
    detail: 'Cualquier sitio puede incrustar este dominio en un iframe. Es relevante si hay acciones sensibles (login, pagos, botones de confirmación).' };
}

function checkNosniff(headers) {
  const v = headers['x-content-type-options'];
  const base = { id: 'xcto', label: 'X-Content-Type-Options', fix: ['xcto'], weight: 10 };
  if (v && /nosniff/i.test(v)) return { ...base, status: 'ok', severity: null, value: truncate(v), detail: 'nosniff activo.' };
  return { ...base, status: 'warn', severity: 'baja', value: v ? truncate(v) : null,
    detail: 'Falta nosniff: el navegador puede "adivinar" el tipo de archivo y ejecutar contenido que no debería.' };
}

function checkReferrer(headers) {
  const v = headers['referrer-policy'];
  const base = { id: 'referrer', label: 'Referrer-Policy', fix: ['referrer'], weight: 8 };
  if (v && !/unsafe-url|no-referrer-when-downgrade/i.test(v)) {
    return { ...base, status: 'ok', severity: null, value: truncate(v), detail: 'Política de referer definida.' };
  }
  return { ...base, status: 'warn', severity: 'baja', value: v ? truncate(v) : null,
    detail: v ? 'La política de referer es permisiva (puede filtrar URLs completas a terceros).'
              : 'No se define Referrer-Policy (los navegadores modernos aplican un valor razonable por defecto, pero conviene fijarlo).' };
}

function checkPermissions(headers) {
  const v = headers['permissions-policy'];
  const base = { id: 'permissions', label: 'Permissions-Policy', fix: ['permissions'], weight: 7 };
  if (v) return { ...base, status: 'ok', severity: null, value: truncate(v), detail: 'Permissions-Policy definida.' };
  return { ...base, status: 'warn', severity: 'baja', value: null,
    detail: 'No se limita el acceso a cámara, micrófono o geolocalización para el sitio y los scripts que carga.' };
}

export function analyzeHeaders(headers) {
  const h = headers || {};
  const checks = [checkCsp(h), checkHsts(h), checkClickjacking(h), checkNosniff(h), checkReferrer(h), checkPermissions(h)];
  let score = 0;
  for (const c of checks) score += c.status === 'ok' ? c.weight : c.status === 'warn' ? Math.round(c.weight / 2) : 0;
  const grade = score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : score >= 40 ? 'D' : 'F';
  return {
    checks,
    score,
    grade,
    summary: {
      passed: checks.filter((c) => c.status === 'ok').length,
      warned: checks.filter((c) => c.status === 'warn').length,
      failed: checks.filter((c) => c.status === 'fail').length
    }
  };
}

// ---------------------------------------------------------------------------
// 4. PARCHES A MEDIDA (SOLO PARA LO QUE REALMENTE FALTA)
// ---------------------------------------------------------------------------

const HEADER_DEFS = {
  hsts: ['Strict-Transport-Security', 'max-age=63072000; includeSubDomains'],
  xfo: ['X-Frame-Options', 'DENY'],
  xcto: ['X-Content-Type-Options', 'nosniff'],
  referrer: ['Referrer-Policy', 'strict-origin-when-cross-origin'],
  permissions: ['Permissions-Policy', 'camera=(), microphone=(), geolocation=()'],
  // La CSP se entrega en modo SOLO-REPORTE a propósito: una CSP genérica rompe sitios reales
  // si se aplica sin probar. Se prueba, se ajusta a los dominios propios y luego se activa.
  csp: ['Content-Security-Policy-Report-Only',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; object-src 'none'; base-uri 'self'"]
};

const HEADER_ORDER = ['hsts', 'xfo', 'xcto', 'referrer', 'permissions', 'csp'];

export function buildPatches(checks) {
  const need = new Set();
  for (const c of checks) if (c.status !== 'ok') (c.fix || []).forEach((k) => need.add(k));
  const keys = HEADER_ORDER.filter((k) => need.has(k));
  if (keys.length === 0) return null;
  const pairs = keys.map((k) => HEADER_DEFS[k]);
  const hasCsp = need.has('csp');

  const cspNote = hasCsp
    ? '# CSP: se entrega en modo Report-Only. 1) Despliégala, 2) revisa la consola del navegador y ajusta a tus dominios reales,\n# 3) cuando no haya avisos, renombra la cabecera a Content-Security-Policy.\n'
    : '';

  const nginx = '# Dentro del bloque server { } de tu configuración de Nginx\n' + cspNote +
    pairs.map(([k, v]) => `add_header ${k} "${v}" always;`).join('\n');

  const apache = '# .htaccess o VirtualHost de Apache (requiere mod_headers)\n' + cspNote +
    '<IfModule mod_headers.c>\n' + pairs.map(([k, v]) => `  Header always set ${k} "${v}"`).join('\n') + '\n</IfModule>';

  const vercel = JSON.stringify({
    headers: [{ source: '/(.*)', headers: pairs.map(([key, value]) => ({ key, value })) }]
  }, null, 2);

  const cloudflare = '// Cloudflare Worker (alternativa: Rules > Transform Rules > Modify Response Header)\n' + cspNote.replace(/^# /gm, '// ') +
    'export default {\n  async fetch(request) {\n    const response = await fetch(request);\n    const headers = new Headers(response.headers);\n' +
    pairs.map(([k, v]) => `    headers.set(${JSON.stringify(k)}, ${JSON.stringify(v)});`).join('\n') +
    '\n    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });\n  }\n};';

  return { nginx, vercel, apache, cloudflare };
}

// ---------------------------------------------------------------------------
// 5. API PRINCIPAL
// ---------------------------------------------------------------------------

/**
 * Escanea un dominio. Nunca lanza por fallos "esperables" (DNS, TLS, timeout...):
 * devuelve { ok:false, error:{ code, message } }.
 * `deps` existe solo para pruebas (lookup / isAllowedIp / tlsOptions); la API pública no lo usa.
 */
export async function scanDomain(rawDomain, deps = {}) {
  const domain = normalizeDomain(rawDomain);
  if (!domain) {
    return { ok: false, error: { code: 'invalid_domain', message: 'Ingresa un nombre de dominio público válido (ejemplo: tuempresa.com).' } };
  }

  const scannedAt = new Date().toISOString();
  try {
    const res = await fetchHeaders(domain, deps);
    const analysis = analyzeHeaders(res.headers);

    const caveats = [];
    if (res.status >= 400) {
      caveats.push(`El servidor respondió ${res.status}. Si hay un firewall o un desafío anti-bots, estas cabeceras podrían no representar las de su sitio real.`);
    }
    if (res.downgradedToHttp) {
      caveats.push('El sitio redirige de HTTPS a HTTP, lo cual es un problema por sí mismo.');
    }
    if (res.redirectLimit) {
      caveats.push('Se alcanzó el límite de redirecciones; se analizó la última respuesta obtenida.');
    }

    let tls = null;
    if (res.tls) {
      const daysLeft = res.tls.validTo ? Math.floor((new Date(res.tls.validTo).getTime() - Date.now()) / 86400000) : null;
      tls = { protocol: res.tls.protocol, issuer: res.tls.issuer, validTo: res.tls.validTo, daysLeft };
      if (daysLeft !== null && daysLeft < 14) {
        caveats.push(`El certificado TLS vence en ${daysLeft} día(s).`);
      }
    }

    return {
      ok: true,
      domain,
      finalHost: res.host,
      scannedAt,
      statusCode: res.status,
      redirects: res.redirects,
      ttfbMs: res.ttfbMs,
      tls,
      caveats,
      ...analysis,
      patches: buildPatches(analysis.checks)
    };
  } catch (err) {
    if (err instanceof ScanError) {
      return { ok: false, domain, scannedAt, error: { code: err.code, message: err.publicMessage, detail: err.detail || null } };
    }
    console.error('[HEADER SCANNER UNEXPECTED ERROR]', err);
    return { ok: false, domain, scannedAt, error: { code: 'internal', message: 'Error interno al analizar el dominio.' } };
  }
}
