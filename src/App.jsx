import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { LogOut, Plus, AlertCircle, BookOpen, CheckCircle, AlertTriangle, RefreshCw, Book, Grid } from 'lucide-react'
import githubService from './services/githubService'
import LoginScreen from './components/LoginScreen'
import Dashboard from './components/Dashboard'
import SearchBar from './components/SearchBar'
import MateriaCard from './components/MateriaCard'
import TematicaCard from './components/TematicaCard'
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
  tematicas: githubService.getTematicas(),
  libros: []
})

export default function App() {
  // Estado de Autenticación
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState(null)

  // Estado de Datos (núcleo) - SIEMPRE tiene materias y temáticas
  const [data, setData] = useState(getInitialData)

  // Estado de UI
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedMateria, setSelectedMateria] = useState(null)
  const [selectedTematica, setSelectedTematica] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalTipo, setModalTipo] = useState('carrera')
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

  const syncTimeoutRef = useRef(null)
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current)
      }
    }
  }, [])

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

      if (!Array.isArray(dataToValidate.materias)) {
        dataToValidate.materias = githubService.getMaterias()
      }

      if (!Array.isArray(dataToValidate.tematicas)) {
        dataToValidate.tematicas = githubService.getTematicas()
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
        
        if (libro.tipo && !['carrera', 'tematica'].includes(libro.tipo)) {
          libro.tipo = 'carrera'
        }
        
        // Asegurar que materias sea array
        if (!libro.materias) {
          libro.materias = []
        }
        
        // Asegurar que tematicas sea array
        if (!libro.tematicas) {
          libro.tematicas = []
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
        
        if (!parsed.materias || !Array.isArray(parsed.materias)) {
          parsed.materias = githubService.getMaterias()
        }
        
        if (!parsed.tematicas || !Array.isArray(parsed.tematicas)) {
          parsed.tematicas = githubService.getTematicas()
        }
        
        if (parsed.libros && Array.isArray(parsed.libros)) {
          parsed.libros = parsed.libros.map(libro => {
            if (!libro.tipo) {
              libro.tipo = 'carrera'
            }
            if (!libro.materias) {
              libro.materias = []
            }
            if (!libro.tematicas) {
              libro.tematicas = []
            }
            // Si el libro tiene tematicas pero no tipo, asignar tematica
            if (libro.tematicas && libro.tematicas.length > 0 && libro.tipo === 'carrera') {
              libro.tipo = 'tematica'
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
        const dataWithCatalogos = {
          ...newData,
          materias: newData.materias || githubService.getMaterias(),
          tematicas: newData.tematicas || githubService.getTematicas()
        }
        
        const validation = validateDataIntegrity(dataWithCatalogos)
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
          ...dataWithCatalogos,
          metadata: {
            ...dataWithCatalogos.metadata,
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
                  const mergedWithCatalogos = {
                    ...syncResult.merged,
                    materias: syncResult.merged.materias || githubService.getMaterias(),
                    tematicas: syncResult.merged.tematicas || githubService.getTematicas(),
                    metadata: {
                      ...syncResult.merged.metadata,
                      lastSyncTime: new Date().toISOString(),
                      syncStatus: syncResult.hasConflicts ? 'conflict' : 'success'
                    }
                  }
                  
                  setData(mergedWithCatalogos)

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
          tematicas: githubService.getTematicas(),
          metadata: {
            ...syncResult.merged.metadata,
            lastSyncTime: new Date().toISOString(),
            syncStatus: syncResult.hasConflicts ? 'conflict' : 'success'
          }
        }
        
        console.log('[App] Materias cargadas:', mergedData.materias.length)
        console.log('[App] Temáticas cargadas:', mergedData.tematicas.length)
        console.log('[App] Libros cargados:', mergedData.libros.length)
        
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

        // Asegurar que materias y tematicas sean arrays
        if (!libroToSave.materias) libroToSave.materias = []
        if (!libroToSave.tematicas) libroToSave.tematicas = []

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
  // FILTRADO MEJORADO - CORREGIDO
  // ============================================


  // ============================================
// FILTRADO CON LOGS PARA DEPURACIÓN
// ============================================

// 1. Filtrar libros por término de búsqueda
const librosFiltered = useMemo(() => {
  console.log('[App] 🔍 Filtrando libros con searchTerm:', searchTerm)
  if (!searchTerm.trim()) {
    return data.libros
  }
  const searchLower = searchTerm.toLowerCase()
  const filtered = data.libros.filter(libro => {
    return (
      libro.titulo.toLowerCase().includes(searchLower) ||
      libro.autor.toLowerCase().includes(searchLower) ||
      libro.id.toLowerCase().includes(searchLower) ||
      (libro.isbn || '').toLowerCase().includes(searchLower) ||
      (libro.editorial || '').toLowerCase().includes(searchLower) ||
      (libro.palabras_clave || '').toLowerCase().includes(searchLower) ||
      (libro.notas || '').toLowerCase().includes(searchLower)
    )
  })
  console.log('[App] ✅ librosFiltered:', filtered.length, 'libros')
  return filtered
}, [data.libros, searchTerm])

// 2. Libros de carrera vs temáticos
const librosCarrera = useMemo(() => {
  const filtered = librosFiltered.filter(libro => libro.tipo === 'carrera' || !libro.tipo)
  console.log('[App] 📚 librosCarrera:', filtered.length)
  return filtered
}, [librosFiltered])

const librosTematicos = useMemo(() => {
  const filtered = librosFiltered.filter(libro => libro.tipo === 'tematica')
  console.log('[App] 📖 librosTematicos:', filtered.length)
  return filtered
}, [librosFiltered])

// 3. CORREGIDO: Agrupar libros de carrera por materia
const librosPorMateria = useMemo(() => {
  console.log('[App] 📊 Calculando librosPorMateria...')
  console.log('[App] librosCarrera:', librosCarrera.length)
  
  if (librosCarrera.length === 0) {
    console.log('[App] ⚠️ No hay libros de carrera')
    const grupos = {}
    data.materias.forEach(materia => {
      grupos[materia.id] = []
    })
    return grupos
  }
  
  console.log('[App] librosCarrera data:', librosCarrera.map(l => ({ 
    titulo: l.titulo, 
    materias: l.materias,
    tipo: l.tipo 
  })))
  
  let librosBase = librosCarrera
  
  if (selectedMateria) {
    const materiaSeleccionada = data.materias.find(m => m.id === selectedMateria)
    if (materiaSeleccionada) {
      librosBase = librosBase.filter(libro => 
        libro.materias && libro.materias.includes(materiaSeleccionada.nombre)
      )
      console.log(`[App] 🔍 Filtrado por materia: ${materiaSeleccionada.nombre}, quedan ${librosBase.length} libros`)
    }
  }
  
  const grupos = {}
  data.materias.forEach(materia => {
    const librosEnMateria = librosBase.filter(libro => 
      libro.materias && libro.materias.includes(materia.nombre)
    )
    grupos[materia.id] = librosEnMateria
    if (librosEnMateria.length > 0) {
      console.log(`[App] 📚 Materia "${materia.nombre}" tiene ${librosEnMateria.length} libros:`, 
        librosEnMateria.map(l => l.titulo))
    }
  })
  
  console.log('[App] ✅ librosPorMateria calculado')
  return grupos
}, [data.materias, librosCarrera, selectedMateria])



  // 4. CORREGIDO: Agrupar libros temáticos por temática
  const librosPorTematica = useMemo(() => {
    let librosBase = librosTematicos
    
    // Filtrar por temática seleccionada
    if (selectedTematica) {
      const tematicaSeleccionada = data.tematicas.find(t => t.id === selectedTematica)
      if (tematicaSeleccionada) {
        librosBase = librosBase.filter(libro => 
          libro.tematicas && libro.tematicas.includes(tematicaSeleccionada.nombre)
        )
      }
    }
    
    // Agrupar por temática
    const grupos = {}
    data.tematicas.forEach(tematica => {
      grupos[tematica.id] = librosBase.filter(libro => 
        libro.tematicas && libro.tematicas.includes(tematica.nombre)
      )
    })
    return grupos
  }, [data.tematicas, librosTematicos, selectedTematica])

  // 5. Materias a mostrar
  const materiasAMostrar = useMemo(() => {
    if (selectedMateria) {
      return data.materias.filter(m => m.id === selectedMateria)
    }
    
    if (mostrarVacias) {
      return data.materias
    }
    
    if (searchTerm.trim()) {
      return data.materias.filter(m => 
        librosPorMateria[m.id] && librosPorMateria[m.id].length > 0
      )
    }
    
    return data.materias.filter(m => 
      (librosPorMateria[m.id] || []).length > 0
    )
  }, [data.materias, selectedMateria, searchTerm, librosPorMateria, mostrarVacias])

  // 6. Temáticas a mostrar
  const tematicasAMostrar = useMemo(() => {
    if (selectedTematica) {
      return data.tematicas.filter(t => t.id === selectedTematica)
    }
    
    if (mostrarVacias) {
      return data.tematicas
    }
    
    if (searchTerm.trim()) {
      return data.tematicas.filter(t => 
        librosPorTematica[t.id] && librosPorTematica[t.id].length > 0
      )
    }
    
    return data.tematicas.filter(t => 
      (librosPorTematica[t.id] || []).length > 0
    )
  }, [data.tematicas, selectedTematica, searchTerm, librosPorTematica, mostrarVacias])

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
        tematicas: githubService.getTematicas(),
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

  const totalCarrera = data.libros.filter(l => l.tipo === 'carrera' || !l.tipo).length
  const totalTematicos = data.libros.filter(l => l.tipo === 'tematica').length
  const totalLibros = data.libros.length

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gradient-to-r from-primary-600 via-primary-500 to-secondary-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">📚 Biblioteca Mecatrónica</h1>
              <div className="flex items-center gap-2 mt-1 text-sm opacity-90 flex-wrap">
                <span> • {user?.login}</span>
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
                <span className="text-xs opacity-75">
                  {totalLibros} libros ({totalCarrera} carrera, {totalTematicos} temáticos)
                </span>
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
                  setModalTipo('carrera')
                  setModalOpen(true)
                  setEditingLibro(null)
                }}
                disabled={uiState.loading || uiState.saving || uiState.syncing}
                className="bg-white text-primary-600 hover:bg-gray-100 px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Book className="w-4 h-4" />
                Agregar Libro
              </button>

              <button
                onClick={() => {
                  setModalTipo('tematica')
                  setModalOpen(true)
                  setEditingLibro(null)
                }}
                disabled={uiState.loading || uiState.saving || uiState.syncing}
                className="bg-white text-purple-600 hover:bg-gray-100 px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Grid className="w-4 h-4" />
                Agregar Temático
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
          selectedTematica={selectedTematica}
          onTematicaChange={setSelectedTematica}
          materias={data.materias}
          tematicas={data.tematicas}
        />

        {uiState.loading && (
          <div className="text-center py-12">
            <div className="inline-block">
              <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mb-4" />
              <p className="text-gray-600 font-medium">Cargando...</p>
            </div>
          </div>
        )}

        {/* ============================================ */}
        {/* BLOQUE DE MATERIAS (CARRERA) */}
        {/* ============================================ */}
        
        {!uiState.loading && librosCarrera.length > 0 && (
          <>
            <div className="flex items-center gap-2 mb-4">
              <Book className="w-5 h-5 text-primary-600" />
              <h2 className="text-xl font-bold text-gray-800">Materias de Carrera</h2>
              <span className="text-sm text-gray-500">({librosCarrera.length} libros)</span>
            </div>
            
            {materiasAMostrar.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {materiasAMostrar.map(materia => (
                  <MateriaCard
                    key={materia.id}
                    materia={materia}
                    libros={librosPorMateria[materia.id] || []}
                    onEditLibro={(libro) => {
                      setEditingLibro(libro)
                      setModalTipo('carrera')
                      setModalOpen(true)
                    }}
                    onDeleteLibro={handleDeleteLibro}
                    loading={uiState.loading || uiState.saving}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg mb-8">
                <p>No hay materias con libros que coincidan con tu búsqueda</p>
              </div>
            )}
          </>
        )}

        {/* ============================================ */}
        {/* BLOQUE DE TEMÁTICAS */}
        {/* ============================================ */}
        
        {!uiState.loading && librosTematicos.length > 0 && (
          <>
            <div className="flex items-center gap-2 mb-4 mt-6">
              <Grid className="w-5 h-5 text-purple-600" />
              <h2 className="text-xl font-bold text-gray-800">Temáticas</h2>
              <span className="text-sm text-gray-500">({librosTematicos.length} libros)</span>
            </div>
            
            {tematicasAMostrar.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tematicasAMostrar.map(tematica => (
                  <TematicaCard
                    key={tematica.id}
                    tematica={tematica}
                    libros={librosPorTematica[tematica.id] || []}
                    onEditLibro={(libro) => {
                      setEditingLibro(libro)
                      setModalTipo('tematica')
                      setModalOpen(true)
                    }}
                    onDeleteLibro={handleDeleteLibro}
                    loading={uiState.loading || uiState.saving}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                <p>No hay temáticas con libros que coincidan con tu búsqueda</p>
              </div>
            )}
          </>
        )}

        {/* ============================================ */}
        {/* MENSAJES CUANDO NO HAY LIBROS */}
        {/* ============================================ */}
        
        {!uiState.loading && data.libros.length === 0 && (
          <div className="text-center py-12">
            <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg font-medium">Tu biblioteca está vacía</p>
            <p className="text-gray-400 text-sm mt-2 mb-6">Agrega tu primer libro para comenzar</p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => {
                  setModalTipo('carrera')
                  setModalOpen(true)
                  setEditingLibro(null)
                }}
                className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 font-semibold transition-colors flex items-center gap-2"
              >
                <Book className="w-4 h-4" />
                Agregar libro de carrera
              </button>
              <button
                onClick={() => {
                  setModalTipo('tematica')
                  setModalOpen(true)
                  setEditingLibro(null)
                }}
                className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 font-semibold transition-colors flex items-center gap-2"
              >
                <Grid className="w-4 h-4" />
                Agregar libro temático
              </button>
            </div>
          </div>
        )}

        {/* Cuando hay libros pero no hay resultados de búsqueda */}
        {!uiState.loading && data.libros.length > 0 && librosFiltered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No se encontraron libros</p>
            <p className="text-gray-400 text-sm mt-2">Intenta con otros términos de búsqueda</p>
          </div>
        )}

        {/* Cuando hay libros de carrera pero no temáticos */}
        {!uiState.loading && librosCarrera.length === 0 && librosTematicos.length > 0 && (
          <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg mb-8">
            <p>No hay libros de carrera aún. Agrega uno desde el botón <strong>"Agregar Libro"</strong></p>
          </div>
        )}
        
        {/* Cuando hay libros temáticos pero no de carrera */}
        {!uiState.loading && librosTematicos.length === 0 && librosCarrera.length > 0 && (
          <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
            <p>No hay libros temáticos aún. Agrega uno desde el botón <strong>"Agregar Temático"</strong></p>
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
        tipo={modalTipo}
        loading={uiState.loading || uiState.saving}
      />
    </div>
  )
}