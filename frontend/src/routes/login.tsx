import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { api } from '@/lib/api'
import type { AuthResponse } from '@/types'

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
    <div className="min-h-dvh flex flex-col items-center justify-center bg-[#FDFBF7] px-6">
      {/* Logo */}
      <div className="flex flex-col items-center mb-14">
        <img src="/logo.png" alt="Arrendia" className="w-96 h-96 object-contain mb-6" />
<p className="text-xl text-gray-500">Control de arrendamientos</p>
      </div>

      {/* Card */}
     <div className="w-full max-w-sm bg-white border border-[#E8E5DF] rounded-2xl p-10 flex flex-col items-center gap-6">
        <p className="text-lg text-gray-600 text-center">
          Administración de propiedades
        </p>

        {error && (
          <p className="text-xs text-[#C62828] bg-red-50 px-3 py-2 rounded-lg w-full text-center">
            {error}
          </p>
        )}

        <button
          onClick={handleIngresar}
          disabled={loading}
          className="btn-primary w-full text-base py-3 disabled:opacity-50"
        >
          {loading ? 'Ingresando...' : 'Ingresar'}
        </button>
      </div>
    </div>
  )
}
