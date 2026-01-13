'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Mail, Lock, User, Eye, EyeOff, AlertCircle, Loader2, CheckCircle } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  
  const { signUp } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      setIsLoading(false)
      return
    }

    const { error } = await signUp(email, password, fullName)
    
    if (error) {
      setError(error.message)
      setIsLoading(false)
    } else {
      setSuccess(true)
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md text-center"
        >
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 mb-4">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">¡Cuenta Creada!</h2>
            <p className="text-slate-400 mb-6">
              Revisa tu correo electrónico para confirmar tu cuenta antes de iniciar sesión.
            </p>
            <Link
              href="/login"
              className={cn(
                'inline-block w-full py-3 rounded-xl font-medium',
                'bg-gradient-to-r from-blue-500 to-cyan-500',
                'hover:from-blue-600 hover:to-cyan-600',
                'text-white shadow-lg shadow-blue-500/25',
                'transition-all duration-200'
              )}
            >
              Ir a Iniciar Sesión
            </Link>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 mb-4">
            <span className="text-2xl font-bold text-white">MK</span>
          </div>
          <h1 className="text-2xl font-bold text-white">MecánicaKIOSKO</h1>
          <p className="text-slate-400 mt-2">Crea tu cuenta</p>
        </div>

        {/* Signup Form */}
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-8">
          <h2 className="text-xl font-semibold text-white mb-6">Registro</h2>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Full Name Field */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Nombre completo
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={cn(
                    'w-full pl-11 pr-4 py-3 rounded-xl',
                    'bg-slate-900/50 border border-slate-600/50',
                    'text-white placeholder-slate-500',
                    'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50',
                    'transition-all duration-200'
                  )}
                  placeholder="Juan Pérez"
                  required
                  autoComplete="name"
                />
              </div>
            </div>

            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Correo electrónico
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={cn(
                    'w-full pl-11 pr-4 py-3 rounded-xl',
                    'bg-slate-900/50 border border-slate-600/50',
                    'text-white placeholder-slate-500',
                    'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50',
                    'transition-all duration-200'
                  )}
                  placeholder="tu@correo.com"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={cn(
                    'w-full pl-11 pr-12 py-3 rounded-xl',
                    'bg-slate-900/50 border border-slate-600/50',
                    'text-white placeholder-slate-500',
                    'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50',
                    'transition-all duration-200'
                  )}
                  placeholder="Mínimo 6 caracteres"
                  required
                  autoComplete="new-password"
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </motion.div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className={cn(
                'w-full py-3 rounded-xl font-medium',
                'bg-gradient-to-r from-blue-500 to-cyan-500',
                'hover:from-blue-600 hover:to-cyan-600',
                'text-white shadow-lg shadow-blue-500/25',
                'focus:outline-none focus:ring-2 focus:ring-blue-500/50',
                'transition-all duration-200',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'flex items-center justify-center gap-2'
              )}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creando cuenta...
                </>
              ) : (
                'Crear Cuenta'
              )}
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-slate-400 text-sm">
              ¿Ya tienes cuenta?{' '}
              <Link 
                href="/login" 
                className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
              >
                Inicia sesión
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-slate-500 text-xs mt-6">
          © 2026 MecánicaKIOSKO. Todos los derechos reservados.
        </p>
      </motion.div>
    </div>
  )
}
