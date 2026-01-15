'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Users, UserPlus, Shield, ArrowLeft, Loader2, 
  Mail, Lock, User, AlertCircle, CheckCircle, Trash2, Edit3, X
} from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { UserRole } from '@/lib/supabase/types'

interface UserProfile {
  id: string
  email: string | null
  full_name: string | null
  role: UserRole
  created_at: string
}

export default function AdminPage() {
  const { isAdmin, profile } = useAuth()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  
  const [users, setUsers] = useState<UserProfile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createSuccess, setCreateSuccess] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  
  // Form state
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newFullName, setNewFullName] = useState('')
  const [newRole, setNewRole] = useState<UserRole>('read')
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null)
  const [updateError, setUpdateError] = useState<string | null>(null)
  
  // Role change confirmation modal state
  const [roleChangeConfirm, setRoleChangeConfirm] = useState<{
    userId: string
    userName: string
    currentRole: UserRole
    newRole: UserRole
  } | null>(null)
  
  const supabase = createClient()

  const fetchUsers = useCallback(async () => {
    setIsLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (data && !error) {
      setUsers(data as UserProfile[])
    }
    setIsLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateError(null)
    setCreateSuccess(null)
    setIsCreating(true)

    try {
      // Create user using Supabase Admin API through Edge Function
      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: newEmail,
          password: newPassword,
          fullName: newFullName,
          role: newRole,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error al crear usuario')
      }

      setCreateSuccess(`Usuario ${newEmail} creado exitosamente`)
      setNewEmail('')
      setNewPassword('')
      setNewFullName('')
      setNewRole('read')
      setShowCreateForm(false)
      fetchUsers()
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Error desconocido')
    } finally {
      setIsCreating(false)
    }
  }

  // Open confirmation modal before updating role
  const handleRoleChangeRequest = (user: UserProfile, newRole: UserRole) => {
    if (user.role === newRole) return
    setRoleChangeConfirm({
      userId: user.id,
      userName: user.full_name || user.email || 'Usuario',
      currentRole: user.role,
      newRole
    })
  }

  // Actually update the role after confirmation
  const handleUpdateRole = async () => {
    if (!roleChangeConfirm) return
    
    const { userId, newRole } = roleChangeConfirm
    setUpdatingUserId(userId)
    setUpdateError(null)
    setRoleChangeConfirm(null)
    
    try {
      const { error } = await (supabase
        .from('profiles') as any)
        .update({ role: newRole })
        .eq('id', userId)

      if (error) {
        console.error('Error updating role:', error)
        setUpdateError(`Error al actualizar rol: ${error.message}`)
        setTimeout(() => setUpdateError(null), 4000)
      } else {
        setCreateSuccess(`Rol actualizado exitosamente`)
        setTimeout(() => setCreateSuccess(null), 3000)
        await fetchUsers()
      }
    } catch (err) {
      console.error('Error updating role:', err)
      setUpdateError('Error al actualizar el rol')
      setTimeout(() => setUpdateError(null), 4000)
    } finally {
      setUpdatingUserId(null)
    }
  }

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'bg-purple-500/20 text-purple-400 border-purple-500/30'
      case 'write': 
      case 'editor': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      case 'read': 
      case 'viewer': return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'admin': return '👑 Admin'
      case 'write': 
      case 'editor': return '✏️ Editor'
      case 'read': 
      case 'viewer': return '👁️ Lectura'
      default: return role
    }
  }
  
  // Normalize legacy role values to new values
  const normalizeRole = (role: UserRole): 'admin' | 'write' | 'read' => {
    if (role === 'editor') return 'write'
    if (role === 'viewer') return 'read'
    if (role === 'admin' || role === 'write' || role === 'read') return role
    return 'read' // default
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <Shield className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Acceso Denegado</h1>
          <p className="text-slate-400 mb-4">Solo los administradores pueden acceder a esta página.</p>
          <Link href="/" className="text-blue-400 hover:text-blue-300">
            Volver al Dashboard
          </Link>
        </div>
      </div>
    )
  }

  const bgPrimary = isDark ? 'rgb(2, 6, 23)' : 'rgb(248, 250, 252)'
  const bgSecondary = isDark ? 'rgba(15, 23, 42, 0.8)' : 'rgba(255, 255, 255, 0.95)'
  const textPrimary = isDark ? '#ffffff' : '#0f172a'
  const textSecondary = isDark ? '#cbd5e1' : '#334155'
  const textMuted = isDark ? '#64748b' : '#94a3b8'
  const borderColor = isDark ? 'rgb(30, 41, 59)' : 'rgb(226, 232, 240)'

  return (
    <div className="min-h-screen" style={{ background: bgPrimary }}>
      {/* Header */}
      <header className="backdrop-blur-sm border-b" style={{ borderColor, background: bgSecondary }}>
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href="/"
                className="flex items-center gap-2 transition-colors"
                style={{ color: textMuted }}
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="text-sm">Volver</span>
              </Link>
              <div className="w-px h-6" style={{ background: borderColor }} />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold" style={{ color: textPrimary }}>
                    Gestión de Usuarios
                  </h1>
                  <p className="text-xs" style={{ color: textMuted }}>
                    Panel de Administración
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowCreateForm(true)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg',
                'bg-gradient-to-r from-purple-500 to-pink-500',
                'hover:from-purple-600 hover:to-pink-600',
                'text-white font-medium transition-all'
              )}
            >
              <UserPlus className="w-4 h-4" />
              Crear Usuario
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Success/Error Messages */}
        <AnimatePresence>
          {createSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 p-4 rounded-lg bg-green-500/10 border border-green-500/30 flex items-center gap-3"
            >
              <CheckCircle className="w-5 h-5 text-green-400" />
              <p className="text-green-400">{createSuccess}</p>
              <button onClick={() => setCreateSuccess(null)} className="ml-auto">
                <X className="w-4 h-4 text-green-400" />
              </button>
            </motion.div>
          )}
          {updateError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-3"
            >
              <AlertCircle className="w-5 h-5 text-red-400" />
              <p className="text-red-400">{updateError}</p>
              <button onClick={() => setUpdateError(null)} className="ml-auto">
                <X className="w-4 h-4 text-red-400" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Users Table */}
        <div 
          className="rounded-xl border overflow-hidden"
          style={{ borderColor, background: bgSecondary }}
        >
          <div className="p-4 border-b" style={{ borderColor }}>
            <h2 className="font-semibold" style={{ color: textPrimary }}>
              Usuarios Registrados ({users.length})
            </h2>
          </div>

          {isLoading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-400" />
              <p className="mt-2" style={{ color: textMuted }}>Cargando usuarios...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b" style={{ borderColor }}>
                    <th className="text-left p-4 text-sm font-medium" style={{ color: textSecondary }}>Usuario</th>
                    <th className="text-left p-4 text-sm font-medium" style={{ color: textSecondary }}>Email</th>
                    <th className="text-left p-4 text-sm font-medium" style={{ color: textSecondary }}>Rol</th>
                    <th className="text-left p-4 text-sm font-medium" style={{ color: textSecondary }}>Fecha Registro</th>
                    <th className="text-right p-4 text-sm font-medium" style={{ color: textSecondary }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr 
                      key={user.id} 
                      className="border-b last:border-0 hover:bg-[rgba(var(--glass-bg))] transition-colors"
                      style={{ borderColor }}
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                            <User className="w-4 h-4 text-white" />
                          </div>
                          <span className="font-medium" style={{ color: textPrimary }}>
                            {user.full_name || 'Sin nombre'}
                          </span>
                        </div>
                      </td>
                      <td className="p-4" style={{ color: textSecondary }}>
                        {user.email}
                      </td>
                      <td className="p-4">
                        <div className="relative inline-block">
                          <select
                            value={normalizeRole(user.role)}
                            onChange={(e) => handleRoleChangeRequest(user, e.target.value as UserRole)}
                            disabled={user.id === profile?.id || updatingUserId === user.id}
                            className={cn(
                              'px-3 py-1 rounded-lg border text-sm font-medium',
                              'bg-transparent cursor-pointer appearance-none pr-8',
                              getRoleBadgeColor(user.role),
                              (user.id === profile?.id || updatingUserId === user.id) && 'opacity-50 cursor-not-allowed'
                            )}
                          >
                            <option value="admin">👑 Admin</option>
                            <option value="write">✏️ Editor</option>
                            <option value="read">👁️ Lectura</option>
                          </select>
                          {updatingUserId === user.id && (
                            <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-purple-400" />
                          )}
                        </div>
                      </td>
                      <td className="p-4" style={{ color: textMuted }}>
                        {new Date(user.created_at).toLocaleDateString('es-MX')}
                      </td>
                      <td className="p-4 text-right">
                        {user.id !== profile?.id && (
                          <span className="text-xs" style={{ color: textMuted }}>
                            —
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Create User Modal */}
      <AnimatePresence>
        {showCreateForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowCreateForm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl border p-6"
              style={{ background: bgSecondary, borderColor }}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold" style={{ color: textPrimary }}>
                  Crear Nuevo Usuario
                </h3>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="p-2 rounded-lg hover:bg-[rgba(var(--glass-bg))] transition-colors"
                >
                  <X className="w-5 h-5" style={{ color: textMuted }} />
                </button>
              </div>

              <form onSubmit={handleCreateUser} className="space-y-4">
                {createError && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400" />
                    <p className="text-sm text-red-400">{createError}</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: textSecondary }}>
                    Nombre completo
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: textMuted }} />
                    <input
                      type="text"
                      value={newFullName}
                      onChange={(e) => setNewFullName(e.target.value)}
                      required
                      className={cn(
                        'w-full pl-10 pr-4 py-3 rounded-xl',
                        'bg-[rgba(var(--glass-bg))] border',
                        'focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500'
                      )}
                      style={{ borderColor, color: textPrimary }}
                      placeholder="Juan Pérez"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: textSecondary }}>
                    Correo electrónico
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: textMuted }} />
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      required
                      className={cn(
                        'w-full pl-10 pr-4 py-3 rounded-xl',
                        'bg-[rgba(var(--glass-bg))] border',
                        'focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500'
                      )}
                      style={{ borderColor, color: textPrimary }}
                      placeholder="usuario@empresa.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: textSecondary }}>
                    Contraseña
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: textMuted }} />
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={6}
                      className={cn(
                        'w-full pl-10 pr-4 py-3 rounded-xl',
                        'bg-[rgba(var(--glass-bg))] border',
                        'focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500'
                      )}
                      style={{ borderColor, color: textPrimary }}
                      placeholder="Mínimo 6 caracteres"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: textSecondary }}>
                    Rol
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as UserRole)}
                    className={cn(
                      'w-full px-4 py-3 rounded-xl',
                      'bg-[rgba(var(--glass-bg))] border',
                      'focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500'
                    )}
                    style={{ borderColor, color: textPrimary }}
                  >
                    <option value="read">👁️ Solo lectura - Solo puede visualizar datos</option>
                    <option value="write">✏️ Editor - Puede agregar tiendas</option>
                    <option value="admin">👑 Administrador - Acceso total</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className={cn(
                      'flex-1 py-3 rounded-xl font-medium',
                      'bg-[rgba(var(--glass-bg))] border',
                      'hover:bg-[rgba(var(--card-bg))] transition-colors'
                    )}
                    style={{ borderColor, color: textPrimary }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating}
                    className={cn(
                      'flex-1 py-3 rounded-xl font-medium',
                      'bg-gradient-to-r from-purple-500 to-pink-500',
                      'hover:from-purple-600 hover:to-pink-600',
                      'text-white transition-all',
                      'disabled:opacity-50 disabled:cursor-not-allowed',
                      'flex items-center justify-center gap-2'
                    )}
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Creando...
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        Crear Usuario
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Role Change Confirmation Modal */}
      <AnimatePresence>
        {roleChangeConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setRoleChangeConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl border p-6"
              style={{ background: bgSecondary, borderColor }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-amber-400" />
                </div>
                <h3 className="text-lg font-semibold" style={{ color: textPrimary }}>
                  Confirmar cambio de rol
                </h3>
              </div>

              <p className="mb-6" style={{ color: textSecondary }}>
                ¿Estás seguro de cambiar el rol de <strong style={{ color: textPrimary }}>{roleChangeConfirm.userName}</strong> de{' '}
                <span className={cn('px-2 py-0.5 rounded text-sm', getRoleBadgeColor(roleChangeConfirm.currentRole))}>
                  {getRoleLabel(roleChangeConfirm.currentRole)}
                </span>{' '}
                a{' '}
                <span className={cn('px-2 py-0.5 rounded text-sm', getRoleBadgeColor(roleChangeConfirm.newRole))}>
                  {getRoleLabel(roleChangeConfirm.newRole)}
                </span>?
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setRoleChangeConfirm(null)}
                  className={cn(
                    'flex-1 py-2.5 rounded-xl font-medium',
                    'bg-[rgba(var(--glass-bg))] border',
                    'hover:bg-[rgba(var(--card-bg))] transition-colors'
                  )}
                  style={{ borderColor, color: textPrimary }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleUpdateRole}
                  className={cn(
                    'flex-1 py-2.5 rounded-xl font-medium',
                    'bg-gradient-to-r from-purple-500 to-pink-500',
                    'hover:from-purple-600 hover:to-pink-600',
                    'text-white transition-all'
                  )}
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
