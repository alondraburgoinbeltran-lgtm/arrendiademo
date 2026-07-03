import { createMiddleware } from 'hono/factory'
import { SignJWT, jwtVerify } from 'jose'
import type { Env } from '../types'

export const authMiddleware = createMiddleware<{ Bindings: Env }>(
  async (c, next) => {
    const authHeader = c.req.header('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return c.json({ message: 'No autorizado' }, 401)
    }

    const token = authHeader.slice(7)
    try {
      const secret = new TextEncoder().encode(c.env.JWT_SECRET)
      await jwtVerify(token, secret)
      await next()
    } catch {
      return c.json({ message: 'Token inválido o expirado' }, 401)
    }
  }
)

export async function createToken(
  username: string,
  secret: string
): Promise<string> {
  const key = new TextEncoder().encode(secret)
  return new SignJWT({ sub: username })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(key)
}
