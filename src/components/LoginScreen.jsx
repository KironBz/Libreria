import { useState } from 'react'
import { Github, Lock, AlertCircle } from 'lucide-react'

export default function LoginScreen({ onLogin, loading }) {
  const [token, setToken] = useState('')
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!token.trim()) {
      setError('El token es requerido')
      return
    }

    try {
      await onLogin(token)
    } catch (err) {
      setError(err.message || 'Error autenticando. Verifica tu token.')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 via-primary-500 to-secondary-600 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary-600 to-secondary-600 px-8 py-12 text-center text-white">
            <Github className="w-16 h-16 mx-auto mb-4 opacity-80" />
            <h1 className="text-3xl font-bold mb-2">Biblioteca Mecatrónica</h1>
            <p className="text-sm opacity-90">Acceso privado con token de GitHub</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-8 py-8 space-y-6">
            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {/* Token Input */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Personal Access Token
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Necesitas un token con permisos de gists. 
                <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline ml-1">
                  Crear token →
                </a>
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-primary-600 to-secondary-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Conectando...
                </>
              ) : (
                <>
                  <Github className="w-5 h-5" />
                  Acceder con GitHub
                </>
              )}
            </button>
          </form>

          {/* Footer Info */}
          <div className="bg-gray-50 px-8 py-6 border-t border-gray-200 text-center text-sm text-gray-600">
            <p className="mb-3">Tu token se guarda localmente en este navegador.</p>
            <p className="text-xs text-gray-500">
              No compartiremos ni guardaremos tu token en servidores.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
