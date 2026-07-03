# Arrendia

Control de contratos, pagos y vencimientos.

---

## Deploy sin instalación local — todo desde el navegador

### Paso 1 — Subir el código a GitHub

1. Entra a [github.com](https://github.com) → **New repository**
2. Nombre: `arrendia` · Privado · Sin README
3. Sube todos los archivos del ZIP directamente desde la interfaz web de GitHub
   (arrastra la carpeta `arrendia/` al explorador de archivos del repo)

---

### Paso 2 — Crear la base de datos D1 en Cloudflare

1. Entra a [dash.cloudflare.com](https://dash.cloudflare.com)
2. Menú izquierdo → **Workers & Pages** → **D1**
3. Clic en **Create database**
4. Nombre: `arrendia-db` → **Create**
5. Copia el **Database ID** que aparece (algo como `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)
6. Abre el archivo `worker/wrangler.toml` en GitHub y reemplaza `REEMPLAZAR_CON_ID_REAL` con ese ID

---

### Paso 3 — Ejecutar el schema SQL en D1

1. En la página de tu base de datos D1 → pestaña **Console**
2. Copia y pega todo el contenido de `worker/migrations/0001_initial_schema.sql`
3. Clic en **Execute**

---

### Paso 4 — Crear el bucket R2

1. Menú izquierdo → **R2**
2. **Create bucket** → nombre: `arrendia-files` → **Create**

---

### Paso 5 — Crear y configurar el Worker

1. Menú izquierdo → **Workers & Pages** → **Create**
2. Selecciona **Import a Worker from GitHub** (o conecta tu repo)
3. Nombre: `arrendia-worker`
4. **Root directory:** `worker`
5. **Build command:** `npm install`
6. **Deploy**

Después del primer deploy, configura los secrets:
→ Tu Worker → **Settings** → **Variables and Secrets** → agrega cada uno:

| Nombre | Valor |
|--------|-------|
| `JWT_SECRET` | Una cadena aleatoria larga (ej: `arrendia2025_clave_super_secreta_abc123`) |
| `AUTH_USER_1` | tu usuario (ej: `socio1`) |
| `AUTH_PASS_1` | tu contraseña segura |
| `AUTH_USER_2` | usuario del otro socio |
| `AUTH_PASS_2` | contraseña del otro socio |

Luego ve a **Settings** → **Bindings** → agrega:
- **D1 Database** → Variable: `DB` → Base de datos: `arrendia-db`
- **R2 Bucket** → Variable: `BUCKET` → Bucket: `arrendia-files`

---

### Paso 6 — Desplegar el Frontend en Cloudflare Pages

1. **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. Selecciona tu repo `arrendia`
3. Configuración del build:
   - **Project name:** `arrendia`
   - **Root directory:** `frontend`
   - **Framework preset:** `Vite`
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
4. **Environment Variables** → agrega:
   - `VITE_API_URL` = `https://arrendia-worker.TU-SUBDOMINIO.workers.dev`
     (la URL de tu Worker del paso anterior)
5. **Save and Deploy**

---

### Paso 7 — Probar

Tu app estará en: `https://arrendia.pages.dev`

---

## Estructura del proyecto

```
arrendia/
├── frontend/          ← React app (Cloudflare Pages)
│   ├── src/
│   │   ├── routes/    ← Páginas (TanStack Router)
│   │   ├── components/← Layout, Nav, Header
│   │   ├── lib/       ← API client, utilidades
│   │   └── types/     ← Tipos TypeScript
│   └── tailwind.config.ts
├── worker/            ← API (Cloudflare Workers)
│   ├── src/
│   │   ├── routes/    ← auth, propiedades, rentas, contratos...
│   │   └── middleware/← JWT
│   └── migrations/    ← Schema SQL
└── .env.example
```
