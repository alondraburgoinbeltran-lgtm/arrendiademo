import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import type { Env } from '../types'

const app = new Hono<{ Bindings: Env }>()
app.use('*', authMiddleware)

app.get('/', async (c) => {
  try {
    const now      = new Date()
    const month    = Number(c.req.query('month')) || now.getMonth() + 1
    const year     = Number(c.req.query('year'))  || now.getFullYear()
    const monthPad = String(month).padStart(2, '0')
    const yearStr  = String(year)

    const { results: notes } = await c.env.DB.prepare(
      'SELECT * FROM notes ORDER BY created_at DESC'
    ).all()

    const { results: reminders } = await c.env.DB.prepare(`
      SELECT r.id, r.title, r.reminder_date, r.type, r.frequency,
             r.status, r.property_id, r.last_done_at, r.next_date,
             p.name AS property_name, p.number AS property_number
      FROM reminders r
      LEFT JOIN properties p ON p.id = r.property_id
      WHERE strftime('%m', r.reminder_date) = ?
        AND strftime('%Y', r.reminder_date) = ?
      ORDER BY r.reminder_date ASC
    `).bind(monthPad, yearStr).all()

    const reminderEvents = reminders.map((r: any) => ({
      id:        `reminder-${r.id}`,
      ref_id:    r.id,
      ref_type:  'reminder',
      type:      'reminder',
      title:     r.title,
      date:      r.reminder_date,
      status:    r.status,
      frequency: r.frequency,
      property_name:   r.property_name,
      property_number: r.property_number,
    }))

    const { results: rents } = await c.env.DB.prepare(`
      SELECT r.id, r.amount, r.month, r.year, r.status,
             p.name AS property_name, p.number AS property_number, p.payment_day AS prop_payment_day
      FROM rents r JOIN properties p ON p.id = r.property_id
      WHERE r.month = ? AND r.year = ? AND r.status = 'pending'
    `).bind(month, year).all()

    const rentEvents = rents.map((r: any) => ({
      id:        `rent-${r.id}`,
      ref_id:    r.id,
      ref_type:  'rent',
      type:      'rent',
      title:     `Renta pendiente · ${r.property_name}${r.property_number ? ` #${r.property_number}` : ''}`,
      date:      `${yearStr}-${monthPad}-${String(r.prop_payment_day || 1).padStart(2, '0')}`,
      amount:    r.amount,
      status:    'pending',
      property_name:   r.property_name,
      property_number: r.property_number,
    }))

    const { results: invoiceProps } = await c.env.DB.prepare(`
      SELECT p.id, p.name, p.number, p.payment_day,
             i.status AS invoice_status
      FROM properties p
      LEFT JOIN invoices i ON i.property_id = p.id AND i.month = ? AND i.year = ?
      WHERE p.requires_invoice = 1 AND p.active = 1
    `).bind(month, year).all()

    const invoiceEvents = invoiceProps.map((p: any) => {
      const day = Math.max(1, (p.payment_day || 5) - 3)
      return {
        id:        `invoice-${p.id}-${month}-${year}`,
        ref_id:    p.id,
        ref_type:  'invoice',
        type:      'invoice',
        title:     `Factura · ${p.name}${p.number ? ` #${p.number}` : ''}`,
        date:      `${yearStr}-${monthPad}-${String(day).padStart(2, '0')}`,
        status:    p.invoice_status === 'done' ? 'done' : 'pending',
        property_name:   p.name,
        property_number: p.number,
      }
    })

    const firstDay = `${yearStr}-${monthPad}-01`
    const lastDay  = `${yearStr}-${monthPad}-31`
    const { results: contracts } = await c.env.DB.prepare(`
      SELECT ct.id, ct.end_date, ct.tenant_name,
             p.name AS property_name, p.number AS property_number,
             CAST((julianday(ct.end_date) - julianday('now')) AS INTEGER) AS days_remaining
      FROM contracts ct JOIN properties p ON p.id = ct.property_id
      WHERE ct.end_date BETWEEN ? AND ?
    `).bind(firstDay, lastDay).all()

    const contractEvents = contracts.map((ct: any) => ({
      id:        `contract-${ct.id}`,
      ref_id:    ct.id,
      ref_type:  'contract',
      type:      'contract',
      title:     `Contrato vence · ${ct.property_name}${ct.property_number ? ` #${ct.property_number}` : ''}`,
      date:      ct.end_date,
      status:    'pending',
      days_remaining: ct.days_remaining,
      property_name:   ct.property_name,
      property_number: ct.property_number,
    }))

    const allEvents = [...rentEvents, ...invoiceEvents, ...contractEvents, ...reminderEvents]
      .sort((a, b) => a.date.localeCompare(b.date))

    return c.json({ data: { events: allEvents, notes } })
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

// PUT /calendar/invoices/done — marcar factura como hecha (independiente de cobranza)
app.put('/invoices/done', async (c) => {
  const { property_id, month, year } = await c.req.json()
  const today = new Date().toISOString().split('T')[0]

  await c.env.DB.prepare(`
    INSERT INTO invoices (property_id, month, year, status, done_at)
    VALUES (?, ?, ?, 'done', ?)
    ON CONFLICT(property_id, month, year) DO UPDATE SET status = 'done', done_at = excluded.done_at
  `).bind(property_id, month, year, today).run()

  return c.json({ message: 'Factura marcada como hecha' })
})

// PUT /calendar/invoices/undo — revertir a pendiente
app.put('/invoices/undo', async (c) => {
  const { property_id, month, year } = await c.req.json()

  await c.env.DB.prepare(`
    INSERT INTO invoices (property_id, month, year, status, done_at)
    VALUES (?, ?, ?, 'pending', NULL)
    ON CONFLICT(property_id, month, year) DO UPDATE SET status = 'pending', done_at = NULL
  `).bind(property_id, month, year).run()

  return c.json({ message: 'Factura marcada como pendiente' })
})

// POST /calendar/reminders
app.post('/reminders', async (c) => {
  const body = await c.req.json()
  const { title, reminder_date, frequency, property_id } = body

  const { meta } = await c.env.DB.prepare(`
    INSERT INTO reminders (title, reminder_date, type, frequency, status, property_id, next_date)
    VALUES (?, ?, 'reminder', ?, 'pending', ?, ?)
  `).bind(
    title,
    reminder_date,
    frequency ?? null,
    property_id ? Number(property_id) : null,
    reminder_date
  ).run()

  return c.json({ data: { id: meta.last_row_id } }, 201)
})

// PUT /calendar/reminders/:id/done — marcar como hecho y generar siguiente
app.put('/reminders/:id/done', async (c) => {
  const id   = Number(c.req.param('id'))
  const today = new Date().toISOString().split('T')[0]

  const { results } = await c.env.DB.prepare(
    'SELECT * FROM reminders WHERE id = ?'
  ).bind(id).all()

  const reminder = results[0] as any
  if (!reminder) return c.json({ error: 'No encontrado' }, 404)

  await c.env.DB.prepare(
    'UPDATE reminders SET status = ?, last_done_at = ? WHERE id = ?'
  ).bind('done', today, id).run()

  // Generar siguiente si es recurrente
  if (reminder.frequency) {
    const base   = new Date(reminder.reminder_date)
    let nextDate: Date

    if (reminder.frequency === '1m')  nextDate = new Date(base.setMonth(base.getMonth() + 1))
    else if (reminder.frequency === '3m')  nextDate = new Date(base.setMonth(base.getMonth() + 3))
    else if (reminder.frequency === '6m')  nextDate = new Date(base.setMonth(base.getMonth() + 6))
    else if (reminder.frequency === '1y')  nextDate = new Date(base.setFullYear(base.getFullYear() + 1))
    else nextDate = base

    const nextStr = nextDate.toISOString().split('T')[0]

    await c.env.DB.prepare(`
      INSERT INTO reminders (title, reminder_date, type, frequency, status, property_id, next_date)
      VALUES (?, ?, 'reminder', ?, 'pending', ?, ?)
    `).bind(reminder.title, nextStr, reminder.frequency, reminder.property_id ?? null, nextStr).run()
  }

  return c.json({ message: 'Marcado como hecho' })
})

// DELETE /calendar/reminders/:id
app.delete('/reminders/:id', async (c) => {
  const id = Number(c.req.param('id'))
  await c.env.DB.prepare('DELETE FROM reminders WHERE id = ?').bind(id).run()
  return c.json({ message: 'Eliminado' })
})

// POST /calendar/notes
app.post('/notes', async (c) => {
  const { content } = await c.req.json()
  const { meta } = await c.env.DB.prepare(
    'INSERT INTO notes (content) VALUES (?)'
  ).bind(content).run()
  return c.json({ data: { id: meta.last_row_id, content } }, 201)
})

// PUT /calendar/notes/:id
app.put('/notes/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const { content } = await c.req.json()
  await c.env.DB.prepare(
    "UPDATE notes SET content = ?, updated_at = datetime('now') WHERE id = ?"
  ).bind(content, id).run()
  return c.json({ message: 'Actualizado' })
})

// DELETE /calendar/notes/:id
app.delete('/notes/:id', async (c) => {
  const id = Number(c.req.param('id'))
  await c.env.DB.prepare('DELETE FROM notes WHERE id = ?').bind(id).run()
  return c.json({ message: 'Eliminado' })
})

export default app
