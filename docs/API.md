# API del panel esign

El frontend **no** implementa la lógica SIFEN: consume dos bases HTTP documentadas en el repo **`firmador`**.

## Documentación de referencia

| Recurso | Ubicación | Uso |
|---|---|---|
| Guía práctica (URLs, tokens, JSON) | [`firmador/docs/guia-integracion-api.md`](../../firmador/docs/guia-integracion-api.md) | Integradores y desarrollo del panel |
| OpenAPI panel | [`firmador/docs/openapi-panel.yaml`](../../firmador/docs/openapi-panel.yaml) | Spec del panel — fuente de tipos TS |
| OpenAPI emisión | [`firmador/docs/openapi-emision.yaml`](../../firmador/docs/openapi-emision.yaml) | Spec para integradores externos |
| Índice OpenAPI | [`firmador/docs/openapi/README.md`](../../firmador/docs/openapi/README.md) | Qué spec usar según audiencia |
| Contrato narrativo | [`firmador/docs/api-contract.md`](../../firmador/docs/api-contract.md) | Detalle por plano y estados del DE |

## Bases URL (`.env` / Vite)

```env
VITE_ORDS_BASE=https://…/ords/esign
VITE_GO_BASE=http://localhost:8080
```

| Base | Prefijo en código | Auth | Qué resuelve |
|---|---|---|---|
| `VITE_ORDS_BASE` | `/api/v1` | JWT del panel | Auth, cliente, establecimientos, API keys, documentos (lectura), kude-config |
| `VITE_GO_BASE` | `/v1` | JWT (`/panel/*`) o API key (`/documents`) | Emisión SIFEN + mediación de certificado/CSC |

Implementación en código:

- [`src/lib/api.ts`](../src/lib/api.ts) — cliente genérico con envelope `{ success, data, error }` y refresh JWT.
- [`src/lib/clients.ts`](../src/lib/clients.ts) — clientes `openapi-fetch` tipados.
- [`src/lib/config.ts`](../src/lib/config.ts), [`secrets.ts`](../src/lib/secrets.ts), [`documents.ts`](../src/lib/documents.ts) — wrappers por dominio.

## OpenAPI → TypeScript

Los tipos del panel se generan desde `openapi-panel.yaml` del backend:

```bash
npm run generate:api
```

Eso ejecuta:

```bash
openapi-typescript ../../firmador/docs/openapi-panel.yaml -o src/lib/api-schema.d.ts
```

Tras cambiar endpoints en `firmador`, regenerar tipos y commitear `api-schema.d.ts` si aplica.

## Autenticación del panel

1. `POST /api/v1/auth/login` con `{ email, password }`.
2. Si el usuario tiene varios negocios: `POST /api/v1/auth/select-client` con `{ user_id, client_id }`.
3. Enviar `Authorization: Bearer <access_token>` en ORDS y en Go `/v1/panel/*`.

El JWT transporta `client_id` y `role`. VPD en Oracle aísla datos por tenant.

## Ejemplos de llamadas desde el panel

**Config emisor (ORDS):**

```http
PUT {ORDS}/api/v1/client
Authorization: Bearer …
Content-Type: application/json

{ "tipo_contribuyente": 1, "nombre_fantasia": "HASEL", "actividades": […] }
```

**Ambiente TEST — lectura (ORDS):**

```http
GET {ORDS}/api/v1/environments/test
Authorization: Bearer …
```

**Ambiente TEST — guardar timbrado + CSC (Go cifra el CSC):**

```http
PUT {GO}/v1/panel/environments
Authorization: Bearer …

{ "environment": "TEST", "num_timbrado": "…", "fecha_inicio_vigencia": "…", "id_csc": "0001", "csc": "…" }
```

**Diseño KuDE (ORDS, owner):**

```http
PUT {ORDS}/api/v1/kude-config

{ "template_id": "minimalista", "color_primario": "#0f172a", "mostrar_fantasia": 1 }
```

## Emisión (integradores externos)

Los comercios integran directamente contra **Go**, no contra el panel:

```http
POST {GO}/v1/documents
Authorization: Bearer sk_test_…
```

Ver ejemplos completos de payload en [`guia-integracion-api.md`](../../firmador/docs/guia-integracion-api.md) §3.
