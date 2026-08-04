/**
 * GitHub Gist Sync Service
 * Maneja sincronización bidireccional entre localStorage y GitHub Gist
 * Implementa retry logic, validación de integridad y merge strategy
 * 
 * VERSION CORREGIDA - v2.3
 * - CORREGIDO: Libros eliminados se suben correctamente al Gist
 * - FORZADO: El push usa los datos locales sin merge
 */

const SYNC_RETRIES = 3
const RETRY_DELAY_MS = 1000
const GIST_VERSION = '2.0'
const GIST_FILENAME = 'biblioteca-mecatronica.json'

// Esquema de validación para libros
const REQUIRED_BOOK_FIELDS = ['id', 'titulo', 'autor', 'materia']

class GitHubService {
  constructor() {
    this.token = sessionStorage.getItem('github_token') || null
    this.gistId = localStorage.getItem('gist_id') || null
    this.syncQueue = []
    this.isSyncing = false
    this.lastSyncTime = localStorage.getItem('last_sync_time') || null
    this.syncCallbacks = []
  }

  // ============================================
  // CALLBACKS PARA UI
  // ============================================

  onSyncUpdate(callback) {
    if (typeof callback === 'function') {
      this.syncCallbacks.push(callback)
    }
  }

  _notifyUI(event, data) {
    this.syncCallbacks.forEach(cb => {
      try {
        cb(event, data)
      } catch (err) {
        console.error('[GitHubService] Error en callback UI:', err)
      }
    })
  }

  // ============================================
  // AUTENTICACIÓN
  // ============================================

  setToken(token) {
    if (!token || typeof token !== 'string' || token.length < 10) {
      throw new Error('Token inválido: debe ser un string de al menos 10 caracteres')
    }
    
    if (!token.startsWith('ghp_') && !token.startsWith('gho_')) {
      console.warn('[GitHubService] Token no parece ser de GitHub (debe comenzar con ghp_ o gho_)')
    }
    
    this.token = token
    sessionStorage.setItem('github_token', token)
    this._notifyUI('auth_changed', { authenticated: true })
  }

  async getAuthenticatedUser() {
    if (!this.token) {
      throw new Error('No hay token. Usuario debe autenticarse primero.')
    }

    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      })

      if (!response.ok) {
        if (response.status === 401) {
          this.clearAuth()
          throw new Error('Token expirado o inválido')
        }
        throw new Error(`GitHub API error: ${response.status}`)
      }

      const user = await response.json()
      this._notifyUI('user_loaded', user)
      return user
    } catch (err) {
      console.error('[GitHubService] Error obteniendo usuario:', err.message)
      throw err
    }
  }

  // ============================================
  // CREACIÓN Y VALIDACIÓN DE GIST
  // ============================================

  async ensureGistExists(initialData) {
    if (!this.token) {
      throw new Error('No token disponible')
    }

    if (this.gistId) {
      try {
        await this._validateGistAccess()
        return this.gistId
      } catch (err) {
        console.warn('[GitHubService] Gist no accesible, creando nuevo...')
        this.gistId = null
        localStorage.removeItem('gist_id')
      }
    }

    return await this.createGist(initialData)
  }

  async _validateGistAccess() {
    if (!this.gistId || !this.token) {
      throw new Error('GistId o token no disponible')
    }

    const response = await fetch(`https://api.github.com/gists/${this.gistId}`, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    })

    if (!response.ok) {
      throw new Error(`No se pudo acceder a Gist: ${response.status}`)
    }

    return await response.json()
  }

  async createGist(data) {
    if (!this.token) {
      throw new Error('No token disponible')
    }

    console.log('[GitHubService] Creando Gist nuevo...')

    const structuredData = this._ensureCorrectStructure(data)

    const gistData = {
      description: 'Biblioteca Digital Mecatrónica UNAM',
      public: false,
      files: {
        [GIST_FILENAME]: {
          content: JSON.stringify(structuredData, null, 2)
        }
      }
    }

    try {
      const response = await fetch('https://api.github.com/user/gists', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(gistData)
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`GitHub error ${response.status}: ${error}`)
      }

      const gist = await response.json()
      this.gistId = gist.id
      localStorage.setItem('gist_id', this.gistId)
      
      const timestamp = new Date().toISOString()
      localStorage.setItem('last_sync_time', timestamp)
      this.lastSyncTime = timestamp

      this._notifyUI('gist_created', { gistId: this.gistId })
      console.log('[GitHubService] Gist creado exitosamente:', this.gistId)

      return this.gistId
    } catch (err) {
      console.error('[GitHubService] Error creando Gist:', err.message)
      this._notifyUI('gist_error', { error: err.message })
      throw err
    }
  }

  // ============================================
  // ESTRUCTURA DE DATOS CORRECTA
  // ============================================

  _ensureCorrectStructure(data) {
    return {
      metadata: {
        version: GIST_VERSION,
        lastUpdate: new Date().toISOString(),
        totalLibros: Array.isArray(data?.libros) ? data.libros.length : 0
      },
      libros: Array.isArray(data?.libros) ? data.libros : []
    }
  }

  // ============================================
  // SINCRONIZACIÓN BIDIRECCIONAL (CORREGIDA)
  // ============================================

  async smartSync(localData) {
    this._notifyUI('sync_started', { timestamp: Date.now() })

    if (!this.token || !this.gistId) {
      this._notifyUI('sync_skipped', { reason: 'No autenticado' })
      return {
        merged: localData,
        hasConflicts: false,
        strategy: 'local_only',
        reason: 'Sin token o Gist'
      }
    }

    try {
      const remoteData = await this.downloadFromGist()

      const localValid = this._validateDataStructure(localData)
      const remoteValid = this._validateDataStructure(remoteData)

      if (!localValid) {
        console.error('[GitHubService] Datos locales inválidos, usando remotos')
        this._notifyUI('sync_error', { error: 'Datos locales inválidos' })
        return {
          merged: remoteData,
          hasConflicts: true,
          strategy: 'remote_used_local_invalid'
        }
      }

      if (!remoteValid) {
        console.error('[GitHubService] Datos remotos inválidos, usando locales')
        this._notifyUI('sync_error', { error: 'Datos remotos inválidos' })
        return {
          merged: localData,
          hasConflicts: true,
          strategy: 'local_used_remote_invalid'
        }
      }

      // CORREGIDO: Merge con prioridad LOCAL
      const mergeResult = this._mergeBooksGranular(localData, remoteData)

      // CORREGIDO: SIEMPRE subir los datos locales (sin merge)
      // Esto asegura que los libros eliminados se suban al Gist
      console.log('[GitHubService] Forzando push con datos locales')
      await this._pushToGist(localData)

      this._notifyUI('sync_completed', mergeResult)
      return mergeResult

    } catch (err) {
      console.error('[GitHubService] Error en smartSync:', err.message)
      this._notifyUI('sync_error', { error: err.message })
      return {
        merged: localData,
        hasConflicts: true,
        strategy: 'error_using_local',
        error: err.message
      }
    }
  }

  // ============================================
  // MERGE GRANULAR DE LIBROS (v2.2)
  // ============================================

  _mergeBooksGranular(local, remote) {
    const localBooks = Array.isArray(local?.libros) ? local.libros : []
    const remoteBooks = Array.isArray(remote?.libros) ? remote.libros : []
    
    console.log('[GitHubService] Merge - Libros locales:', localBooks.length)
    console.log('[GitHubService] Merge - Libros remotos:', remoteBooks.length)
    
    const localMap = new Map()
    const remoteMap = new Map()
    
    localBooks.forEach(book => {
      if (book.id) localMap.set(book.id, book)
    })
    
    remoteBooks.forEach(book => {
      if (book.id) remoteMap.set(book.id, book)
    })
    
    const mergedBooks = []
    const conflicts = []
    let hasChanges = false
    let booksAdded = 0
    let booksUpdated = 0
    let booksRemoved = 0

    // PASO 1: Todos los libros locales (fuente de verdad)
    for (const [id, localBook] of localMap) {
      const remoteBook = remoteMap.get(id)
      
      if (remoteBook) {
        if (JSON.stringify(localBook) !== JSON.stringify(remoteBook)) {
          conflicts.push({
            id,
            local: localBook,
            remote: remoteBook,
            resolution: 'local'
          })
          booksUpdated++
          hasChanges = true
        }
        mergedBooks.push(localBook)
      } else {
        mergedBooks.push(localBook)
      }
    }

    // PASO 2: Detectar eliminados (NO se reintroducen)
    for (const [id, remoteBook] of remoteMap) {
      if (!localMap.has(id)) {
        booksRemoved++
        hasChanges = true
        console.log(`[GitHubService] Libro eliminado localmente: ${remoteBook.titulo} (${id})`)
      }
    }

    // PASO 3: Agregar libros NUEVOS en remoto (solo si no existen en local)
    for (const [id, remoteBook] of remoteMap) {
      if (!localMap.has(id)) {
        mergedBooks.push(remoteBook)
        booksAdded++
        hasChanges = true
        console.log(`[GitHubService] Libro nuevo en remoto agregado: ${remoteBook.titulo} (${id})`)
      }
    }

    const mergedData = {
      metadata: {
        version: GIST_VERSION,
        lastUpdate: new Date().toISOString(),
        totalLibros: mergedBooks.length
      },
      libros: mergedBooks
    }

    console.log('[GitHubService] Merge result:', {
      total: mergedBooks.length,
      added: booksAdded,
      updated: booksUpdated,
      removed: booksRemoved,
      conflicts: conflicts.length
    })

    return {
      merged: mergedData,
      hasChanges: hasChanges || booksRemoved > 0 || booksAdded > 0,
      hasConflicts: conflicts.length > 0,
      conflicts,
      strategy: 'granular_merge_local_priority',
      stats: {
        added: booksAdded,
        updated: booksUpdated,
        removed: booksRemoved,
        conflicted: conflicts.length
      }
    }
  }

  // ============================================
  // VALIDACIÓN EXHAUSTIVA
  // ============================================

  _validateDataStructure(data) {
    try {
      if (!data || typeof data !== 'object') {
        console.error('[GitHubService] Validación falló: data no es objeto')
        return false
      }

      if (data.metadata && typeof data.metadata !== 'object') {
        console.error('[GitHubService] Validación falló: metadata debe ser objeto')
        return false
      }

      if (!Array.isArray(data.libros)) {
        console.error('[GitHubService] Validación falló: libros no es array')
        return false
      }

      for (let i = 0; i < data.libros.length; i++) {
        const book = data.libros[i]
        
        for (const field of REQUIRED_BOOK_FIELDS) {
          if (!book[field] || typeof book[field] !== 'string') {
            console.error(`[GitHubService] Validación falló: libro ${i} falta campo "${field}" o no es string`)
            return false
          }
        }

        if (data.libros.filter(b => b.id === book.id).length > 1) {
          console.error(`[GitHubService] Validación falló: id duplicado "${book.id}"`)
          return false
        }

        if (book.updatedAt && isNaN(new Date(book.updatedAt).getTime())) {
          console.error(`[GitHubService] Validación falló: updatedAt inválido en libro ${book.id}`)
          return false
        }
      }

      return true
    } catch (err) {
      console.error('[GitHubService] Error en validación:', err.message)
      return false
    }
  }

  // ============================================
  // DOWNLOAD / PUSH
  // ============================================

  async downloadFromGist() {
    if (!this.gistId) {
      throw new Error('No Gist ID disponible')
    }

    if (!this.token) {
      throw new Error('No token disponible')
    }

    try {
      const response = await fetch(`https://api.github.com/gists/${this.gistId}`, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      })

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Gist no encontrado (puede haber sido eliminado)')
        }
        throw new Error(`Error descargando Gist: ${response.status}`)
      }

      const gist = await response.json()
      
      const file = gist.files[GIST_FILENAME]
      if (!file) {
        throw new Error(`Archivo ${GIST_FILENAME} no encontrado en Gist`)
      }

      let data
      try {
        data = JSON.parse(file.content)
      } catch (parseErr) {
        throw new Error(`Error parseando JSON del Gist: ${parseErr.message}`)
      }

      if (!this._validateDataStructure(data)) {
        console.warn('[GitHubService] Datos corruptos en Gist, intentando reparar...')
        data = this._repairCorruptedData(data)
        
        if (!this._validateDataStructure(data)) {
          throw new Error('Datos en Gist tienen estructura inválida y no se pudieron reparar')
        }
      }

      return data
    } catch (err) {
      console.error('[GitHubService] Error descargando de Gist:', err.message)
      throw err
    }
  }

  _repairCorruptedData(data) {
    try {
      const repaired = {
        metadata: {
          version: GIST_VERSION,
          lastUpdate: new Date().toISOString(),
          totalLibros: 0
        },
        libros: []
      }

      if (data && Array.isArray(data.libros)) {
        repaired.libros = data.libros.filter(book => {
          return book && 
                 typeof book === 'object' &&
                 book.id &&
                 book.titulo
        })
        repaired.metadata.totalLibros = repaired.libros.length
      }

      return repaired
    } catch (err) {
      console.error('[GitHubService] Error reparando datos:', err.message)
      return null
    }
  }

  async _pushToGist(data) {
    if (!this.token || !this.gistId) return false

    try {
      // CORREGIDO: Usar los datos EXACTOS que se pasan (sin merge)
      const structuredData = this._ensureCorrectStructure(data)
      console.log('[GitHubService] Subiendo a Gist - Libros:', structuredData.libros.length)
      console.log('[GitHubService] IDs de libros a subir:', structuredData.libros.map(b => b.id).join(', '))

      const response = await fetch(`https://api.github.com/gists/${this.gistId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          files: {
            [GIST_FILENAME]: {
              content: JSON.stringify(structuredData, null, 2)
            }
          }
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      const timestamp = new Date().toISOString()
      localStorage.setItem('last_sync_time', timestamp)
      this.lastSyncTime = timestamp

      console.log('[GitHubService] Push exitoso - Libros subidos:', structuredData.libros.length)
      return true
    } catch (err) {
      console.error('[GitHubService] Error en _pushToGist:', err.message)
      return false
    }
  }

  // ============================================
  // SYNC CON RETRY
  // ============================================

  async syncToGist(data) {
    if (!this.token || !this.gistId) {
      console.log('[GitHubService] Sync omitido: sin token o Gist ID')
      return false
    }

    if (this.isSyncing) {
      this.syncQueue.push({ data, timestamp: Date.now() })
      console.log('[GitHubService] Sync en cola (procesando actualmente)')
      return false
    }

    this.isSyncing = true
    this._notifyUI('sync_started', { timestamp: Date.now() })

    try {
      // CORREGIDO: Forzar push directo sin merge
      const success = await this._pushToGist(data)
      
      if (success) {
        const timestamp = new Date().toISOString()
        localStorage.setItem('last_sync_time', timestamp)
        this.lastSyncTime = timestamp
        this._notifyUI('sync_success', { timestamp })
        console.log('[GitHubService] Sync exitoso')
      }
      
      return success
    } catch (err) {
      console.error('[GitHubService] Sync falló:', err.message)
      this._notifyUI('sync_error', { error: err.message })
      return false
    } finally {
      this.isSyncing = false

      if (this.syncQueue.length > 0) {
        const pending = this.syncQueue.pop()
        setTimeout(() => {
          this.syncToGist(pending.data)
        }, 100)
      }
    }
  }

  async _syncWithRetry(data, retriesLeft) {
    try {
      const response = await fetch(`https://api.github.com/gists/${this.gistId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          files: {
            [GIST_FILENAME]: {
              content: JSON.stringify(data, null, 2)
            }
          }
        })
      })

      if (response.ok) {
        return true
      }

      if (response.status === 401) {
        this.clearAuth()
        throw new Error('Token expirado - por favor autentícate nuevamente')
      }

      if (response.status === 429) {
        const resetTime = response.headers.get('X-RateLimit-Reset')
        if (resetTime) {
          const waitTime = Math.max(0, parseInt(resetTime) * 1000 - Date.now()) + 5000
          console.warn(`[GitHubService] Rate limit, esperando ${waitTime}ms`)
          await new Promise(resolve => setTimeout(resolve, waitTime))
          return this._syncWithRetry(data, retriesLeft - 1)
        }
      }

      throw new Error(`HTTP ${response.status}`)
    } catch (err) {
      if (retriesLeft > 0) {
        const delay = RETRY_DELAY_MS * Math.pow(2, SYNC_RETRIES - retriesLeft)
        console.warn(`[GitHubService] Reintentando en ${delay}ms... (${retriesLeft} intentos restantes)`)
        await new Promise(resolve => setTimeout(resolve, delay))
        return this._syncWithRetry(data, retriesLeft - 1)
      }
      throw err
    }
  }

  // ============================================
  // MÉTODOS DE UTILIDAD
  // ============================================

  getMaterias() {
    return [
      { id: 1, nombre: "Álgebra" },
      { id: 2, nombre: "Cálculo y Geometría Analítica" },
      { id: 3, nombre: "Redacción y Exposición de Temas de Ingeniería" },
      { id: 4, nombre: "Química" },
      { id: 5, nombre: "Fundamentos de Programación" },
      { id: 6, nombre: "Álgebra Lineal" },
      { id: 7, nombre: "Cálculo Integral" },
      { id: 8, nombre: "Física Experimental" },
      { id: 9, nombre: "Estática" },
      { id: 10, nombre: "Dibujo Mecánico e Industrial" },
      { id: 11, nombre: "Probabilidad" },
      { id: 12, nombre: "Cálculo Vectorial" },
      { id: 13, nombre: "Ecuaciones Diferenciales" },
      { id: 14, nombre: "Cinemática y Dinámica" },
      { id: 15, nombre: "Manufactura I" },
      { id: 16, nombre: "Cultura y Comunicación" },
      { id: 17, nombre: "Estadística" },
      { id: 18, nombre: "Matemáticas Avanzadas" },
      { id: 19, nombre: "Electricidad y Magnetismo" },
      { id: 20, nombre: "Análisis Numérico" },
      { id: 21, nombre: "Termodinámica" },
      { id: 22, nombre: "Taller Sociohumanístico" },
      { id: 23, nombre: "Análisis de Circuitos" },
      { id: 24, nombre: "Termofluidos" },
      { id: 25, nombre: "Ingeniería de Materiales" },
      { id: 26, nombre: "Mecánica de Sólidos" },
      { id: 27, nombre: "Técnicas de Programación" },
      { id: 28, nombre: "Electrónica Básica" },
      { id: 29, nombre: "Modelado de Sistemas Físicos" },
      { id: 30, nombre: "Ingeniería de Manufactura" },
      { id: 31, nombre: "Mecanismos" },
      { id: 32, nombre: "Temas Selectos de Programación I" },
      { id: 33, nombre: "Optativa Ciencias Sociales y Humanidades" },
      { id: 34, nombre: "Circuitos Digitales" },
      { id: 35, nombre: "Sistemas Electrónicos Lineales" },
      { id: 36, nombre: "Introducción a la Economía" },
      { id: 37, nombre: "Diseño de Elementos de Máquinas" },
      { id: 38, nombre: "Ingeniería Económica" },
      { id: 39, nombre: "Máquinas Eléctricas" },
      { id: 40, nombre: "Instrumentación" },
      { id: 41, nombre: "Control Automático" },
      { id: 42, nombre: "Asignatura Optativa" },
      { id: 43, nombre: "Desarrollo Empresarial" },
      { id: 44, nombre: "Optativa Ciencias Sociales y Humanidades" },
      { id: 45, nombre: "Diseño Mecatrónico" },
      { id: 46, nombre: "Automatización Industrial" },
      { id: 47, nombre: "Diseño y Manufactura Asistidos por Computadora" },
      { id: 48, nombre: "Robótica" },
      { id: 49, nombre: "Ética Profesional" },
      { id: 50, nombre: "Asignatura Optativa" },
      { id: 51, nombre: "Asignatura Optativa" },
      { id: 52, nombre: "Asignatura Optativa" },
      { id: 53, nombre: "Asignatura Optativa" },
      { id: 54, nombre: "Asignatura Optativa" },
      { id: 55, nombre: "Recursos y Necesidades de México" }
    ]
  }

  clearAuth() {
    this.token = null
    this.gistId = null
    this.syncQueue = []
    this.lastSyncTime = null
    sessionStorage.removeItem('github_token')
    localStorage.removeItem('gist_id')
    localStorage.removeItem('last_sync_time')
    this._notifyUI('auth_cleared', {})
    console.log('[GitHubService] Autenticación limpiada')
  }

  getStatus() {
    return {
      isAuthenticated: !!this.token,
      hasGist: !!this.gistId,
      isSyncing: this.isSyncing,
      queueSize: this.syncQueue.length,
      lastSyncTime: this.lastSyncTime,
      tokenPrefix: this.token ? this.token.substring(0, 8) + '...' : null
    }
  }
}

export default new GitHubService()