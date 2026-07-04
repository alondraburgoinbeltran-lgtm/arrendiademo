import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { api } from '@/lib/api'
import type { AuthResponse } from '@/types'
import { Building2, Lock, ArrowRight, ShieldCheck, TrendingUp, Clock, Smartphone } from 'lucide-react'

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

  const features = [
    { icon: ShieldCheck, title: 'Seguro', desc: 'Protegemos tu información con los más altos estándares.' },
    { icon: TrendingUp, title: 'Eficiente', desc: 'Todo lo que necesitas en un solo lugar.' },
    { icon: Clock, title: 'Confiable', desc: 'Información actualizada siempre disponible.' },
    { icon: Smartphone, title: 'Accesible', desc: 'Desde cualquier dispositivo, en cualquier momento.' },
  ]

  return (
    <div className="min-h-dvh bg-[#FDFBF7] flex flex-col items-center">
      {/* Banner con foto */}
      <div className="relative w-full h-52 md:h-64 overflow-hidden">
        <img
          src="/hero-login.jpg"
          alt="Arrendia"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/40 to-transparent" />
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-4">
          <img src="/logo.png" alt="Arrendia" className="w-20 h-20 object-contain drop-shadow-lg" />
          <h1 className="font-serif text-2xl tracking-wide text-white drop-shadow-lg">ARRENDIA</h1>
          <div className="w-14 h-0.5 bg-accent my-1" />
          <p className="text-sm text-white/90">Control de arrendamientos</p>
        </div>
      </div>

      <div className="relative z-10 w-full max-w-md flex flex-col items-center px-6 -mt-6">
        {/* Card principal */}
        <div className="w-full bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-accent-light flex items-center justify-center">
            <Building2 className="w-7 h-7 text-primary" />
          </div>
          <h2 className="text-xl font-semibold text-primary text-center">Administración de propiedades</h2>
          <p className="text-sm text-primary/60 text-center">
            Accede al sistema para gestionar contratos, pagos, servicios y más.
          </p>

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

        {/* Tarjetas de beneficios */}
        <div className="w-full bg-white rounded-2xl shadow-sm mt-6 p-6 grid grid-cols-2 gap-6">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex flex-col items-center text-center gap-2">
              <div className="w-11 h-11 rounded-full bg-accent-light flex items-center justify-center">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <p className="text-sm font-semibold text-primary">{title}</p>
              <p className="text-xs text-primary/60">{desc}</p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex flex-col items-center gap-1 mt-8 mb-8 text-primary text-center">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-accent" />
            <p className="text-sm font-medium">Sistema de administración de arrendamientos</p>
          </div>
          <p className="text-xs text-primary/60">© 2026 Arrendia. Todos los derechos reservados.</p>
        </div>
      </div>
    </div>
  )
}
