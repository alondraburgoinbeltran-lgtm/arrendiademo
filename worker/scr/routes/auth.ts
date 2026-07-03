import { Hono } from 'hono'
import { createToken } from '../middleware/auth'
import type { Env } from '../types'

const app = new Hono<{ Bindings: Env }>()

// POST /api/auth/login — sin usuario ni contraseña, solo genera token
app.post('/login', async (c) => {
  const token = await createToken('socio', c.env.JWT_SECRET)
  return c.json({ token })
})

export default app

