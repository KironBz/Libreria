import { useState } from 'react'
import { Github, Eye, EyeOff, AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react'

export default function LoginScreen({ onLogin, loading }) {
  const [token, setToken] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [uiState, setUiState] = useState({
    error: null,
    errorType: null,
    loginStep: 'idle'
  })

  // Validar formato de token GitHub
  const isValidTokenFormat = (t) => {
    return t && (t.startsWith('ghp_') || t.startsWith('github_pat_')) && t.length > 20
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setUiState({ error: null, errorType: null, loginStep: 'idle' })

    // Validar entrada
    if (!token.trim()) {
      setUiState({
        error: 'El token es requerido',
        errorType: 'invalid_token',
        loginStep: 'idle'
      })
      return
    }

    if (!isValidTokenFormat(token)) {
      setUiState({
        error: 'Formato de token incorrecto. Debe empezar con ghp_ o github_pat_',
        errorType: 'invalid_token',
        loginStep: 'idle'
      })
      return
    }

    try {
      // Paso 1: Autenticar
      setUiState({
        error: null,
        errorType: null,
        loginStep: 'authenticating'
      })

      // onLogin ahora coordina: auth -> ensureGistExists -> smartSync -> loadLocalData
      await onLogin(token)
    } catch (err) {
      // Categorizar error
      let errorType = 'auth'
      let errorMsg = 'Error de autenticación'

      if (err.message.includes('Token')) {
        errorType = 'invalid_token'
        errorMsg = 'Token inválido o expirado'
      } else if (err.message.includes('network') || err.message.includes('fetch')) {
        errorType = 'network'
        errorMsg = 'Error de conexión. Verifica tu internet.'
      } else if (err.message.includes('Gist')) {
        errorType = 'gist'
        errorMsg = 'Error configurando biblioteca en GitHub'
      }

      setUiState({
        error: errorMsg,
        errorType,
        loginStep: 'idle'
      })
    }
  }

  // Texto dinámico del botón
  const getButtonText = () => {
    switch (uiState.loginStep) {
      case 'authenticating':
        return 'Verificando token...'
      case 'creating_gist':
        return 'Preparando biblioteca...'
      case 'loading':
        return 'Cargando datos...'
      default:
        return 'Acceder con GitHub'
    }
  }

  // Estilos de error según tipo
  const getErrorStyles = () => {
    if (uiState.errorType === 'network') {
      return 'bg-yellow-50 border-yellow-200'
    }
    return 'bg-red-50 border-red-200'
  }

  const getErrorTextStyles = () => {
    if (uiState.errorType === 'network') {
      return 'text-yellow-700'
    }
    return 'text-red-700'
  }

  const isLoading = loading || uiState.loginStep !== 'idle'
  const isButtonDisabled = isLoading || !token.trim()

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

          {/* Form Container */}
          <form onSubmit={handleSubmit} className="px-8 py-8 space-y-6">
            {/* Error Alert */}
            {uiState.error && (
              <div className={`border rounded-lg p-4 flex gap-3 ${getErrorStyles()}`}>
                {uiState.errorType === 'network' ? (
                  <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className={`text-sm font-medium ${getErrorTextStyles()}`}>
                    {uiState.error}
                  </p>
                  {uiState.errorType === 'invalid_token' && (
                    <p className="text-xs text-gray-600 mt-1">
                      Crea un token en GitHub Settings con permisos de gists.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Token Input */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Personal Access Token
              </label>
              <div className="relative">
                <Github className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none disabled:bg-gray-100"
                  disabled={isLoading}
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 transition-colors p-1"
                  title={showPassword ? 'Ocultar token' : 'Mostrar token'}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <Eye className="w-5 h-5" />
                  ) : (
                    <EyeOff className="w-5 h-5" />
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Necesitas permisos para crear y editar gists privados.
              </p>
            </div>

            {/* Progress Indicator */}
            {uiState.loginStep !== 'idle' && (
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                <div className="w-5 h-5 border-2 border-blue-200 border-t-primary-600 rounded-full animate-spin" />
                <p className="text-sm text-blue-700 font-medium">
                  {getButtonText()}
                </p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isButtonDisabled}
              className="w-full bg-gradient-to-r from-primary-600 to-secondary-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {getButtonText()}
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
            <div className="flex items-center justify-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <p className="text-sm">Tu token se guarda localmente en este navegador.</p>
            </div>
            <p className="text-xs text-gray-500">
              No compartiremos ni guardaremos tu token en servidores externos.
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Tu biblioteca se sincroniza de forma privada con GitHub Gist.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}