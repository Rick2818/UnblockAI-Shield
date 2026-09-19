---
name: microsaas-growth-engine
description: Habilidad operativa para el despliegue técnico, scaffolding y monetización desatendida de MicroSaaS con microsaas-builder-mcp y pasarelas fiduciarias (Wompi, Stripe, Strike).
---

# Skill: MicroSaaS Growth & Technical Scaffolding Engine

Esta habilidad dota al equipo de agentes de procedimientos estandarizados para desplegar soluciones de software sin intervención humana utilizando **`microsaas-builder-mcp`**.

## 🛠️ Herramientas MCP Operativas

1. **`scaffold_project_structure`**:
   - Genera la estructura dual en Node.js/Express (`/api`, `/lib`, `server.js`, `vercel.json`).
   - Aplica cabeceras HTTP de nivel bancario (Content-Security-Policy, HSTS, X-Frame-Options).
2. **`generate_supabase_schema`**:
   - Despliega esquemas relacionales en PostgreSQL en Supabase.
   - Aplica políticas RLS (Row-Level Security) de aislamiento total por tenant corporativo.
3. **`inject_security_middleware`**:
   - Inyecta limitador de tasa (rate-limiting) en memoria RAM para neutralizar abusos.
   - Aplica validación de sesiones criptográficamente seguras (timing-safe).
4. **`configure_payment_gateway`**:
   - Configura routers de pago fiduciario para Wompi SV (tarjetas y transferencias), Stripe (global) y Strike Lightning (micropagos en satoshis).
   - Genera listeners de webhooks con verificación de firma criptográfica SHA-256.

## 🔄 Protocolo de Invocación
- **Disparador:** Confirmación de pago recibido de un nuevo cliente (\$19 Flash / \$69 Pro / \$490 Enterprise).
- **Tiempo de Ejecución:** Menor a 15 segundos.
- **Salida:** Credenciales de acceso emitidas automáticamente al cliente y registro fiduciario en la base de datos.
