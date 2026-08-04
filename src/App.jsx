import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { LogOut, Plus, AlertCircle, BookOpen, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react'
import githubService from './services/githubService'
import LoginScreen from './components/LoginScreen'
import Dashboard from './components/Dashboard'
import SearchBar from './components/SearchBar'
import MateriaCard from './components/MateriaCard'
import LibroModal from './components/LibroModal'

const STORAGE_KEY = 'biblioteca_data'
const SYNC_DEBOUNCE_MS = 1500

// Estado inicial con materias fijas
const getInitialData = () => ({
  metadata: {
    version: '1.0',
    lastUpdate: new Date().toISOString(),
    lastSyncTime: null,
    syncStatus: 'idle'
  },
  materias: githubService.getMaterias(),
  libros: []
})

export default function App() {
  // Estado de Autenticación
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState(null)

  // Estado de Datos (núcleo) - SIEMPRE tiene materias
  const [data, setData] = useState(getInitialData)

  // Estado de UI
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedMateria, setSelectedMateria] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingLibro, setEditingLibro] = useState(null)
  const [mostrarVacias, setMostrarVacias] = useState(false)

  // Estado de Carga y Errores
  const [uiState, setUiState] = useState({
    loading: false,
    saving: false,
    syncing: false,
    error: null,
    errorType: null,
    conflictCount: 0
  })

  // useRef para debounce persistente
  const syncTimeoutRef = useRef(null)
  const isMountedRef = useRef(true)

  // Limpiar timeouts en unmount
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current)
      }
    }
  }, [])

  // Debounce con useRef
  const debouncedSync = useCallback((callback) => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current)
    }
    syncTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        callback()
      }
      syncTimeoutRef.current = null
    }, SYNC_DEBOUNCE_MS)
  }, [])

  // Validación de datos
  const validateDataIntegrity = useCallback((dataToValidate) => {
    try {
      if (!dataToValidate || typeof dataToValidate !== 'object') {
        throw new Error('Datos inválidos: estructura no es objeto')
      }

      if (!Array.isArray(dataToValidate.libros)) {
        throw new Error('Estructura inválida: libros no es array')
      }

      // Validar que materias exista o crearla
      if (!Array.isArray(dataToValidate.materias)) {
        dataToValidate.materias = githubService.getMaterias()
      }

      for (let i = 0; i < dataToValidate.libros.length; i++) {
        const libro = dataToValidate.libros[i]
        
        if (!libro.id || typeof libro.id !== 'string') {
          throw new Error(`Libro ${i}: id requerido (string)`)
        }
        if (!libro.titulo || typeof libro.titulo !== 'string') {
          throw new Error(`Libro ${i}: título requerido (string)`)
        }
        if (!libro.autor || typeof libro.autor !== 'string') {
          throw new Error(`Libro ${i}: autor requerido (string)`)
        }
        
        // Validar materia
        if (libro.materia && typeof libro.materia !== 'string') {
          throw new Error(`Libro ${i}: materia debe ser string`)
        }
        
        // Convertir formato antiguo si existe
        if (libro.materias && Array.isArray(libro.materias)) {
          libro.materia = libro.materias[0] || ''
          delete libro.materias
        }
      }

      return { valid: true, error: null }
    } catch (err) {
      return { valid: false, error: err.message }
    }
  }, [])

  // Cargar datos de localStorage
  const loadLocalData = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)

      if (stored) {
        let parsed = JSON.parse(stored)
        
        // Asegurar que materias existe
        if (!parsed.materias || !Array.isArray(parsed.materias)) {
          parsed.materias = githubService.getMaterias()
        }
        
        // Convertir libros antiguos
        if (parsed.libros && Array.isArray(parsed.libros)) {
          parsed.libros = parsed.libros.map(libro => {
            if (libro.materias && Array.isArray(libro.materias) && !libro.materia) {
              return {
                ...libro,
                materia: libro.materias[0] || '',
                materias: undefined
              }
            }
            return libro
          })
        }
        
        const validation = validateDataIntegrity(parsed)

        if (!validation.valid) {
          console.error('[App] Datos corruptos en localStorage:', validation.error)
          return getInitialData()
        }

        return parsed
      }
      return getInitialData()
    } catch (err) {
      console.error('[App] Error parsing localStorage:', err)
      return getInitialData()
    }
  }, [validateDataIntegrity])

  // Inicializar autenticación
  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (githubService.token) {
          const userInfo = await githubService.getAuthenticatedUser()
          setUser(userInfo)

          const loadedData = loadLocalData()
          setData(loadedData)
          setIsAuthenticated(true)
        }
      } catch (err) {
        console.error('[App] Auth check failed:', err)
        githubService.clearAuth()
        setIsAuthenticated(false)
        setUiState(prev => ({
          ...prev,
          error: 'Error de autenticación',
          errorType: 'auth'
        }))
      }
    }

    checkAuth()
  }, [loadLocalData])

  // Guardar datos
  const saveData = useCallback(
    async (newData, options = { skipSync: false }) => {
      try {
        // Asegurar que materias siempre exista
        const dataWithMaterias = {
          ...newData,
          materias: newData.materias || githubService.getMaterias()
        }
        
        const validation = validateDataIntegrity(dataWithMaterias)
        if (!validation.valid) {
          setUiState(prev => ({
            ...prev,
            error: `No se pudo guardar: ${validation.error}`,
            errorType: 'validation'
          }))
          return false
        }

        const timestamp = new Date().toISOString()
        const dataWithMetadata = {
          ...dataWithMaterias,
          metadata: {
            ...dataWithMaterias.metadata,
            lastUpdate: timestamp,
            syncStatus: options.skipSync ? 'idle' : 'syncing'
          }
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify(dataWithMetadata))
        setData(dataWithMetadata)
        setUiState(prev => ({ ...prev, error: null, saving: true }))

        if (githubService.token && !options.skipSync) {
          setUiState(prev => ({ ...prev, syncing: true, saving: false }))

          await new Promise((resolve, reject) => {
            debouncedSync(async () => {
              try {
                const syncResult = await githubService.smartSync(dataWithMetadata)
                
                if (isMountedRef.current) {
                  const mergedWithMaterias = {
                    ...syncResult.merged,
                    materias: syncResult.merged.materias || githubService.getMaterias(),
                    metadata: {
                      ...syncResult.merged.metadata,
                      lastSyncTime: new Date().toISOString(),
                      syncStatus: syncResult.hasConflicts ? 'conflict' : 'success'
                    }
                  }
                  
                  setData(mergedWithMaterias)

                  if (syncResult.hasConflicts && syncResult.conflicts) {
                    setUiState(prev => ({
                      ...prev,
                      syncing: false,
                      conflictCount: syncResult.conflicts.length,
                      error: `⚠️ ${syncResult.conflicts.length} conflicto(s) detectados. Se usó versión local.`,
                      errorType: 'conflict'
                    }))
                  } else {
                    setUiState(prev => ({ ...prev, syncing: false, error: null }))
                  }
                }
                resolve()
              } catch (syncErr) {
                console.error('[App] Sync failed:', syncErr)
                if (isMountedRef.current) {
                  setUiState(prev => ({
                    ...prev,
                    syncing: false,
                    error: 'No se pudo sincronizar con GitHub (datos guardados localmente)',
                    errorType: 'sync'
                  }))
                }
                reject(syncErr)
              }
            })
          })
        } else {
          setUiState(prev => ({ ...prev, saving: false }))
        }

        return true
      } catch (err) {
        console.error('[App] Error guardando datos:', err)
        setUiState(prev => ({
          ...prev,
          saving: false,
          syncing: false,
          error: 'Error guardar datos: ' + err.message,
          errorType: 'save'
        }))
        return false
      }
    },
    [validateDataIntegrity, debouncedSync]
  )

  // Login
  const handleLogin = useCallback(
    async (token) => {
      try {
        setUiState(prev => ({ ...prev, loading: true, error: null }))

        console.log('[App] Login PASO 1: Autenticando...')
        githubService.setToken(token)
        const userInfo = await githubService.getAuthenticatedUser()
        setUser(userInfo)

        console.log('[App] Login PASO 2: Asegurando Gist...')
        const initialData = getInitialData()
        await githubService.ensureGistExists(initialData)

        console.log('[App] Login PASO 3: Sincronizando con Gist...')
        const localData = loadLocalData()
        const syncResult = await githubService.smartSync(localData)
        console.log('[App] Merge strategy:', syncResult.strategy)

        console.log('[App] Login PASO 4: Cargando datos finales...')
        
        const mergedData = {
          ...syncResult.merged,
          materias: githubService.getMaterias(),
          metadata: {
            ...syncResult.merged.metadata,
            lastSyncTime: new Date().toISOString(),
            syncStatus: syncResult.hasConflicts ? 'conflict' : 'success'
          }
        }
        
        console.log('[App] Materias cargadas:', mergedData.materias.length)
        
        setData(mergedData)
        setIsAuthenticated(true)

        setUiState(prev => ({ ...prev, loading: false }))
      } catch (err) {
        console.error('[App] Login failed:', err)
        githubService.clearAuth()
        setUiState(prev => ({
          ...prev,
          loading: false,
          error: err.message || 'Error al autenticarse',
          errorType: 'auth'
        }))
        throw err
      }
    },
    [loadLocalData]
  )

  // Logout
  const handleLogout = useCallback(() => {
    if (confirm('¿Estás seguro de que quieres salir?')) {
      githubService.clearAuth()
      setIsAuthenticated(false)
      setUser(null)
      setData(getInitialData())
      setUiState({
        loading: false,
        saving: false,
        syncing: false,
        error: null,
        errorType: null,
        conflictCount: 0
      })
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current)
        syncTimeoutRef.current = null
      }
    }
  }, [])

  // Guardar libro
  const handleSaveLibro = useCallback(
    async (formData) => {
      try {
        setUiState(prev => ({ ...prev, loading: true, error: null }))

        let updatedLibros = [...data.libros]
        let libroToSave = { ...formData }

        if (!libroToSave.id || libroToSave.id.trim() === '') {
          libroToSave.id = crypto.randomUUID()
        } else {
          const id = libroToSave.id.trim()
          if (!/^[a-zA-Z0-9\-_]+$/.test(id)) {
            setUiState(prev => ({
              ...prev,
              loading: false,
              error: 'ID inválido: solo letras, números, guiones y guión bajo',
              errorType: 'validation'
            }))
            return
          }
          libroToSave.id = id
        }

        if (editingLibro) {
          updatedLibros = updatedLibros.map(l =>
            l.id === editingLibro.id 
              ? { ...libroToSave, id: editingLibro.id } 
              : l
          )
        } else {
          const idExists = updatedLibros.some(l => 
            l.id.toLowerCase() === libroToSave.id.toLowerCase()
          )
          
          if (idExists) {
            setUiState(prev => ({
              ...prev,
              loading: false,
              error: `Ya existe un libro con el ID "${libroToSave.id}"`,
              errorType: 'validation'
            }))
            return
          }
          updatedLibros.push(libroToSave)
        }

        const updatedData = { ...data, libros: updatedLibros }
        const saved = await saveData(updatedData)

        if (saved) {
          setModalOpen(false)
          setEditingLibro(null)
          setUiState(prev => ({ ...prev, error: null }))
        }
      } catch (err) {
        console.error('[App] Error en handleSaveLibro:', err)
        setUiState(prev => ({
          ...prev,
          loading: false,
          error: err.message || 'Error guardando libro',
          errorType: 'save'
        }))
      } finally {
        setUiState(prev => ({ ...prev, loading: false }))
      }
    },
    [data, editingLibro, saveData]
  )

  // Eliminar libro
  const handleDeleteLibro = useCallback(
    async (libroId) => {
      try {
        console.log('[App] Eliminando libro:', libroId)
        setUiState(prev => ({ ...prev, loading: true, error: null }))

        const updatedLibros = data.libros.filter(l => l.id !== libroId)
        console.log('[App] Libros después de filtrar:', updatedLibros.length)
        
        const updatedData = { 
          ...data, 
          libros: updatedLibros,
          metadata: {
            ...data.metadata,
            lastUpdate: new Date().toISOString()
          }
        }

        const saved = await saveData(updatedData)
        
        if (saved) {
          console.log('[App] Libro eliminado exitosamente')
          setData(updatedData)
        } else {
          console.error('[App] Error al guardar después de eliminar')
          setUiState(prev => ({
            ...prev,
            error: 'Error al eliminar el libro',
            errorType: 'delete'
          }))
        }
      } catch (err) {
        console.error('[App] Error en handleDeleteLibro:', err)
        setUiState(prev => ({
          ...prev,
          error: err.message || 'Error eliminando libro',
          errorType: 'delete'
        }))
      } finally {
        setUiState(prev => ({ ...prev, loading: false }))
      }
    },
    [data, saveData]
  )

  // ============================================
  // FILTRADO MEJORADO - OCULTAR MATERIAS VACÍAS
  // ============================================

  // 1. Filtrar libros por término de búsqueda
  const librosFiltered = useMemo(() => {
    if (!searchTerm.trim()) {
      return data.libros
    }
    const searchLower = searchTerm.toLowerCase()
    return data.libros.filter(libro => {
      return (
        libro.titulo.toLowerCase().includes(searchLower) ||
        libro.autor.toLowerCase().includes(searchLower) ||
        libro.id.toLowerCase().includes(searchLower) ||
        (libro.notas || '').toLowerCase().includes(searchLower)
      )
    })
  }, [data.libros, searchTerm])

  // 2. Agrupar libros por materia (con filtro de búsqueda y materia seleccionada)
  const librosPorMateriaFiltrados = useMemo(() => {
    let librosBase = librosFiltered
    
    // Filtrar por materia seleccionada
    if (selectedMateria) {
      const materiaSeleccionada = data.materias.find(m => m.id === selectedMateria)
      if (materiaSeleccionada) {
        librosBase = librosBase.filter(libro => libro.materia === materiaSeleccionada.nombre)
      }
    }
    
    // Agrupar por materia
    const grupos = {}
    data.materias.forEach(materia => {
      grupos[materia.id] = librosBase.filter(libro => libro.materia === materia.nombre)
    })
    return grupos
  }, [data.materias, librosFiltered, selectedMateria])

  // 3. Materias a mostrar - SOLO CON LIBROS (a menos que sea filtro explícito)
  const materiasAMostrar = useMemo(() => {
    // Si hay una materia seleccionada, mostrarla siempre
    if (selectedMateria) {
      return data.materias.filter(m => m.id === selectedMateria)
    }
    
    // Si el usuario activó "mostrar vacías", mostrar todas
    if (mostrarVacias) {
      return data.materias
    }
    
    // NORMAL: solo materias con libros
    // Si hay búsqueda, solo materias con resultados
    if (searchTerm.trim()) {
      return data.materias.filter(m => 
        librosPorMateriaFiltrados[m.id] && librosPorMateriaFiltrados[m.id].length > 0
      )
    }
    
    // Sin búsqueda: solo materias con al menos 1 libro
    return data.materias.filter(m => 
      (librosPorMateriaFiltrados[m.id] || []).length > 0
    )
  }, [data.materias, selectedMateria, searchTerm, librosPorMateriaFiltrados, mostrarVacias])

  // Backup
  const handleDownloadBackup = useCallback(() => {
    const element = document.createElement('a')
    const backupData = localStorage.getItem(STORAGE_KEY)
    element.setAttribute(
      'href',
      'data:text/plain;charset=utf-8,' + encodeURIComponent(backupData)
    )
    element.setAttribute(
      'download',
      `biblioteca-backup-${new Date().toISOString().split('T')[0]}.json`
    )
    element.style.display = 'none'
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }, [])

  const handleRestoreBackup = useCallback(
    async (importedData) => {
      try {
        const validation = validateDataIntegrity(importedData)
        if (!validation.valid) {
          setUiState(prev => ({
            ...prev,
            error: 'Archivo de backup inválido: ' + validation.error,
            errorType: 'import'
          }))
          return
        }

        await saveData(importedData, { skipSync: false })
        setUiState(prev => ({
          ...prev,
          error: null
        }))
      } catch (err) {
        setUiState(prev => ({
          ...prev,
          error: 'Archivo JSON inválido: ' + err.message,
          errorType: 'import'
        }))
      }
    },
    [validateDataIntegrity, saveData]
  )

  const handleResolveConflicts = useCallback(async () => {
    try {
      const localData = loadLocalData()
      const syncResult = await githubService.smartSync(localData)
      
      const mergedData = {
        ...syncResult.merged,
        materias: githubService.getMaterias(),
        metadata: {
          ...syncResult.merged.metadata,
          syncStatus: syncResult.hasConflicts ? 'conflict' : 'success'
        }
      }
      
      setData(mergedData)

      setUiState(prev => ({
        ...prev,
        conflictCount: syncResult.hasConflicts ? syncResult.conflicts?.length || 0 : 0,
        error: syncResult.hasConflicts 
          ? `⚠️ Aún hay ${syncResult.conflicts?.length || 0} conflicto(s)` 
          : null,
        errorType: syncResult.hasConflicts ? 'conflict' : null
      }))
    } catch (err) {
      console.error('[App] Error resolviendo conflictos:', err)
      setUiState(prev => ({
        ...prev,
        error: 'Error al resolver conflictos: ' + err.message,
        errorType: 'sync'
      }))
    }
  }, [loadLocalData])

  if (!isAuthenticated) {
    return <LoginScreen onLogin={handleLogin} loading={uiState.loading} />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gradient-to-r from-primary-600 via-primary-500 to-secondary-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">📚 Biblioteca Mecatrónica</h1>
              <div className="flex items-center gap-2 mt-1 text-sm opacity-90 flex-wrap">
                <span>UNAM • {user?.login}</span>
                {uiState.syncing && (
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-yellow-300 rounded-full animate-pulse" />
                    Sincronizando...
                  </span>
                )}
                {uiState.saving && (
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-blue-300 rounded-full animate-pulse" />
                    Guardando...
                  </span>
                )}
                {data.metadata.syncStatus === 'success' && data.metadata.lastSyncTime && (
                  <span className="flex items-center gap-1 text-green-200">
                    <CheckCircle className="w-4 h-4" />
                    Sincronizado
                  </span>
                )}
                {data.metadata.syncStatus === 'conflict' && (
                  <span className="flex items-center gap-1 text-yellow-200">
                    <AlertTriangle className="w-4 h-4" />
                    {uiState.conflictCount} conflicto(s)
                  </span>
                )}
                {data.metadata.lastSyncTime && (
                  <span className="text-xs opacity-75">
                    {new Date(data.metadata.lastSyncTime).toLocaleTimeString()}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4 flex-wrap">
              {data.metadata.syncStatus === 'conflict' && (
                <button
                  onClick={handleResolveConflicts}
                  disabled={uiState.loading || uiState.syncing}
                  className="bg-yellow-500 text-white hover:bg-yellow-600 px-3 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className="w-4 h-4" />
                  Resolver Conflictos
                </button>
              )}

              {/* CHECKBOX: Mostrar materias vacías */}
              <label className="flex items-center gap-2 text-white text-sm cursor-pointer hover:bg-white hover:bg-opacity-10 px-3 py-2 rounded-lg transition-colors">
                <input
                  type="checkbox"
                  checked={mostrarVacias}
                  onChange={(e) => setMostrarVacias(e.target.checked)}
                  className="w-4 h-4 text-primary-600 rounded focus:ring-2 focus:ring-primary-500"
                />
                Mostrar vacías
              </label>

              <button
                onClick={() => {
                  setModalOpen(true)
                  setEditingLibro(null)
                }}
                disabled={uiState.loading || uiState.saving || uiState.syncing}
                className="bg-white text-primary-600 hover:bg-gray-100 px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-5 h-5" />
                Agregar Libro
              </button>

              <button
                onClick={handleLogout}
                className="text-white hover:bg-white hover:bg-opacity-20 px-3 py-2 rounded-lg transition-colors"
                title="Salir"
              >
                <LogOut className="w-5 h-5" />
              </button>

              <button
                onClick={handleDownloadBackup}
                className="text-white hover:bg-white hover:bg-opacity-20 px-3 py-2 rounded-lg transition-colors text-sm"
                title="Descargar backup"
              >
                📥
              </button>

              <button
                onClick={() => {
                  const input = document.createElement('input')
                  input.type = 'file'
                  input.accept = '.json'
                  input.onchange = (e) => {
                    const file = e.target.files[0]
                    const reader = new FileReader()
                    reader.onload = (event) => {
                      try {
                        const imported = JSON.parse(event.target.result)
                        handleRestoreBackup(imported)
                      } catch (err) {
                        setUiState(prev => ({
                          ...prev,
                          error: 'Archivo JSON inválido',
                          errorType: 'import'
                        }))
                      }
                    }
                    reader.readAsText(file)
                  }
                  input.click()
                }}
                className="text-white hover:bg-white hover:bg-opacity-20 px-3 py-2 rounded-lg transition-colors text-sm"
                title="Restaurar desde backup"
              >
                📤
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {uiState.error && (
          <div
            className={`mb-6 border rounded-lg p-4 flex gap-3 ${
              uiState.errorType === 'sync' || uiState.errorType === 'conflict'
                ? 'bg-yellow-50 border-yellow-200'
                : 'bg-red-50 border-red-200'
            }`}
          >
            {uiState.errorType === 'sync' || uiState.errorType === 'conflict' ? (
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <p
                className={`font-medium ${
                  uiState.errorType === 'sync' || uiState.errorType === 'conflict'
                    ? 'text-yellow-700'
                    : 'text-red-700'
                }`}
              >
                {uiState.errorType === 'conflict' ? '⚠️ Conflictos de Sincronización' :
                 uiState.errorType === 'sync' ? 'Advertencia de Sincronización' : 'Error'}
              </p>
              <p
                className={`text-sm ${
                  uiState.errorType === 'sync' || uiState.errorType === 'conflict'
                    ? 'text-yellow-600'
                    : 'text-red-600'
                }`}
              >
                {uiState.error}
              </p>
              {uiState.errorType === 'conflict' && (
                <button
                  onClick={handleResolveConflicts}
                  className="mt-2 bg-yellow-500 text-white px-4 py-1 rounded-lg text-sm font-semibold hover:bg-yellow-600 transition-colors"
                >
                  Reintentar sincronización
                </button>
              )}
            </div>
            <button
              onClick={() => setUiState(prev => ({ ...prev, error: null }))}
              className={`font-semibold text-sm ${
                uiState.errorType === 'sync' || uiState.errorType === 'conflict'
                  ? 'text-yellow-600 hover:text-yellow-700'
                  : 'text-red-600 hover:text-red-700'
              }`}
            >
              Cerrar
            </button>
          </div>
        )}

        {!uiState.loading && data.libros.length > 0 && (
          <Dashboard data={data} materias={data.materias} />
        )}

        <SearchBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          selectedMateria={selectedMateria}
          onMateriaChange={setSelectedMateria}
          materias={data.materias}
        />

        {uiState.loading && (
          <div className="text-center py-12">
            <div className="inline-block">
              <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mb-4" />
              <p className="text-gray-600 font-medium">Cargando...</p>
            </div>
          </div>
        )}

        {!uiState.loading && librosFiltered.length === 0 && data.libros.length > 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No se encontraron libros</p>
            <p className="text-gray-400 text-sm mt-2">Intenta con otros términos de búsqueda</p>
          </div>
        )}

        {!uiState.loading && librosFiltered.length > 0 && materiasAMostrar.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {materiasAMostrar.map(materia => (
              <MateriaCard
                key={materia.id}
                materia={materia}
                libros={librosPorMateriaFiltrados[materia.id] || []}
                onEditLibro={(libro) => {
                  setEditingLibro(libro)
                  setModalOpen(true)
                }}
                onDeleteLibro={handleDeleteLibro}
                loading={uiState.loading || uiState.saving}
              />
            ))}
          </div>
        )}

        {!uiState.loading && data.libros.length > 0 && materiasAMostrar.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No hay materias con libros</p>
            <p className="text-gray-400 text-sm mt-2">Agrega libros para empezar a verlas</p>
          </div>
        )}

        {!uiState.loading && data.libros.length === 0 && (
          <div className="text-center py-12">
            <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg font-medium">Tu biblioteca está vacía</p>
            <p className="text-gray-400 text-sm mt-2 mb-6">Agrega tu primer libro para comenzar</p>
            <button
              onClick={() => setModalOpen(true)}
              className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 font-semibold transition-colors"
            >
              Agregar primer libro
            </button>
          </div>
        )}
      </main>

      <LibroModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditingLibro(null)
        }}
        onSave={handleSaveLibro}
        libro={editingLibro}
        materias={data.materias}
        loading={uiState.loading || uiState.saving}
      />
    </div>
  )
}