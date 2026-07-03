import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'

import authRoutes      from './routes/auth'
import propertiesRoutes from './routes/properties'
import rentsRoutes     from './routes/rents'
import contractsRoutes from './routes/contracts'
import servicesRoutes  from './routes/services'
import dashboardRoutes from './routes/dashboard'
import reportsRoutes   from './routes/reports'
import expensesRoutes  from './routes/expenses'
import calendarRoutes  from './routes/calendar'

import type { Env } from './types'

const app = new Hono<{ Bindings: Env }>()

// ─── Middlewares globales ─────────────────────────────────────
app.use('*', logger())
app.use('*', cors({
  origin: ['http://localhost:5173', 'https://arrendia.pages.dev'],
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
}))

// ─── Rutas ───────────────────────────────────────────────────
app.route('/api/auth',       authRoutes)
app.route('/api/dashboard',  dashboardRoutes)
app.route('/api/properties', propertiesRoutes)
app.route('/api/rents',      rentsRoutes)
app.route('/api/contracts',  contractsRoutes)
app.route('/api/services',   servicesRoutes)
app.route('/api/expenses',   expensesRoutes)
app.route('/api/calendar',   calendarRoutes)
app.route('/api/reports',    reportsRoutes)

// Health check
app.get('/api/health', (c) => c.json({ status: 'ok', ts: Date.now() }))

// ─── Cron: generación automática de rentas ───────────────────
// Se ejecuta el día 1 de cada mes a las 00:00 CST
async function generateMonthlyRents(env: Env): Promise<void> {
  const now   = new Date()
  const month = now.getMonth() + 1
  const year  = now.getFullYear()

  // Obtener todas las propiedades activas
  const { results: properties } = await env.DB.prepare(
    'SELECT id, monthly_rent FROM properties WHERE active = 1'
  ).all()

  if (!properties.length) return

  // Insertar renta para cada propiedad activa (IGNORE si ya existe — idempotente)
  const stmt = env.DB.prepare(`
    INSERT OR IGNORE INTO rents (property_id, month, year, amount, status)
    VALUES (?, ?, ?, ?, 'pending')
  `)

  const batch = properties.map((p: any) =>
    stmt.bind(p.id, month, year, p.monthly_rent)
  )

  await env.DB.batch(batch)

  const { results: recurringExpenses } = await env.DB.prepare(
    'SELECT * FROM expenses WHERE is_recurring = 1'
  ).all()
  if (recurringExpenses.length) {
    const expStmt = env.DB.prepare(`
      INSERT OR IGNORE INTO expenses (type, amount, is_recurring, month, year, status)
      VALUES (?, ?, 1, ?, ?, 'pending')
    `)
    const expBatch = recurringExpenses.map((e: any) =>
      expStmt.bind(e.type, e.amount, month, year)
    )
    await env.DB.batch(expBatch)
  }

  console.log(`[CRON] Generadas rentas ${month}/${year} para ${properties.length} propiedades`)
}

// ─── Export Worker ────────────────────────────────────────────
export default {
  fetch: app.fetch,

  async scheduled(
    _event: ScheduledEvent,
    env: Env,
    _ctx: ExecutionContext
  ): Promise<void> {
    await generateMonthlyRents(env)
  },
}
