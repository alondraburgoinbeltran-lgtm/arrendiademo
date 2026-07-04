import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { api } from '@/lib/api'
import type { AuthResponse } from '@/types'
import { Building2, Lock, ArrowRight } from 'lucide-react'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleIngresar() {
    setError('')
    setLoading(true)
    try {
      const res = await api.post<AuthResponse>('/auth/login', {})
      sessionStorage.setItem('arrendia_token', res.token)
      navigate({ to: '/dashboard' })
    } catch {
      setError('No se pudo conectar. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="relative min-h-dvh flex flex-col items-center bg-cover bg-center px-6"
      style={{ backgroundImage: "url('/login-bg.jpg')" }}
    >
      {/* Logo grande */}
      <div className="flex flex-col items-center pt-16">
        <img src="/logo.png" alt="Arrendia" className="w-32 h-32 object-contain drop-shadow-md" />
        <p className="text-sm font-medium text-primary mt-2">Control de arrendamientos</p>
      </div>

      {/* Espaciador flexible para empujar la card hacia la franja azul */}
      <div className="flex-1" />

      {/* Card */}
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center gap-4 mb-24">
        <div className="w-14 h-14 rounded-full bg-accent-light flex items-center justify-center">
          <Building2 className="w-7 h-7 text-primary" />
        </div>
        <h2 className="text-lg font-semibold text-primary text-center">Administración de propiedades</h2>

        {error && (
          <p className="text-xs text-[#C62828] bg-red-50 px-3 py-2 rounded-lg w-full text-center">
            {error}
          </p>
        )}

        <button
          onClick={handleIngresar}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-primary text-white rounded-xl py-3 text-base font-medium disabled:opacity-50"
        >
          <Lock className="w-4 h-4 text-accent" />
          {loading ? 'Ingresando...' : 'Ingresar'}
          {!loading && <ArrowRight className="w-4 h-4" />}
        </button>
      </div>

      {/* Footer sobre la franja azul de la imagen */}
      <p className="absolute bottom-6 text-xs text-accent-light/90">
        © 2026 Arrendia. Todos los derechos reservados.
      </p>
    </div>
  )
}
