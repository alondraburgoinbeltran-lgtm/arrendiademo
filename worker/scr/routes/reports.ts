import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import type { Env } from '../types'

const app = new Hono<{ Bindings: Env }>()
app.use('*', authMiddleware)

// GET /reports?year=
app.get('/', async (c) => {
  const year = c.req.query('year') ?? String(new Date().getFullYear())

  // Ingresos por mes del año
  const { results: byMonth } = await c.env.DB.prepare(`
    SELECT
      month, year,
      SUM(amount)                                    AS total,
      SUM(CASE WHEN bank_account='bbva'    THEN amount ELSE 0 END) AS bbva,
      SUM(CASE WHEN bank_account='banorte' THEN amount ELSE 0 END) AS banorte
    FROM rents
    WHERE year = ? AND status = 'paid'
    GROUP BY year, month
    ORDER BY month ASC
  `).bind(Number(year)).all()

  // Ingresos por propiedad del año
  const { results: byProperty } = await c.env.DB.prepare(`
    SELECT
      r.property_id,
      p.name AS property_name,
      SUM(r.amount)  AS total,
      COUNT(*)       AS months_paid
    FROM rents r JOIN properties p ON p.id = r.property_id
    WHERE r.year = ? AND r.status = 'paid'
    GROUP BY r.property_id
    ORDER BY total DESC
  `).bind(Number(year)).all()

  return c.json({ data: { by_month: byMonth, by_property: byProperty } })
})

export default app
