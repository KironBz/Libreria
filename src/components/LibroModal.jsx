import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { X, AlertCircle, Search, Book, Hash, Calendar, Building, Tag, Layers, FileText, Plus, BookOpen, Grid } from 'lucide-react'
import githubService from '../services/githubService'

export default function LibroModal({ 
  isOpen, 
  onClose, 
  onSave, 
  libro, 
  materias,
  loading: externalLoading,
  tipo = 'carrera'
}) {
  // Estados del formulario
  const [formData, setFormData] = useState({
    id: '',
    titulo: '',
    autor: '',
    editorial: '',
    isbn: '',
    edicion: '',
    año: new Date().getFullYear(),
    paginas: '',
    url_drive: '',
    materias: [],
    tematicas: [],
    semestre: '',
    palabras_clave: '',
    notas: '',
    tipo: 'carrera'
  })
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const submitLockRef = useRef(false)
  const loading = externalLoading || isSubmitting

  // Obtener temáticas del servicio
  const tematicasDisponibles = useMemo(() => {
    return githubService.getTematicas() || []
  }, [])

  // Resetear formulario al abrir/cerrar
  useEffect(() => {
    if (isOpen) {
      if (libro) {
        // Edición: cargar datos del libro
        setFormData({
          id: libro.id || '',
          titulo: libro.titulo || '',
          autor: libro.autor || '',
          editorial: libro.editorial || '',
          isbn: libro.isbn || '',
          edicion: libro.edicion || '',
          año: libro.año || new Date().getFullYear(),
          paginas: libro.paginas || '',
          url_drive: libro.url_drive || '',
          materias: libro.materias || [],
          tematicas: libro.tematicas || [],
          semestre: libro.semestre || '',
          palabras_clave: libro.palabras_clave || '',
          notas: libro.notas || '',
          tipo: libro.tipo || 'carrera'
        })
      } else {
        // Nuevo: generar ID automático
        setFormData({
          id: crypto.randomUUID().substring(0, 8),
          titulo: '',
          autor: '',
          editorial: '',
          isbn: '',
          edicion: '',
          año: new Date().getFullYear(),
          paginas: '',
          url_drive: '',
          materias: [],
          tematicas: [],
          semestre: '',
          palabras_clave: '',
          notas: '',
          tipo: tipo || 'carrera'
        })
      }
      setErrors({})
      submitLockRef.current = false
      setIsSubmitting(false)
    }
  }, [libro, isOpen, tipo])

  const handleChange = useCallback((e) => {
    const { name, value } = e.target
    
    setFormData(prev => {
      let newValue = value
      
      if (name === 'año' || name === 'paginas' || name === 'semestre') {
        const numValue = parseInt(value)
        newValue = isNaN(numValue) ? '' : numValue
      }
      
      return { ...prev, [name]: newValue }
    })
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }))
    }
  }, [errors])

  // CORREGIDO: Manejo de materias con logs
  const handleMateriaToggle = useCallback((materiaNombre) => {
    setFormData(prev => {
      const currentMaterias = prev.materias || []
      const exists = currentMaterias.includes(materiaNombre)
      
      let newMaterias
      if (exists) {
        newMaterias = currentMaterias.filter(m => m !== materiaNombre)
      } else {
        newMaterias = [...currentMaterias, materiaNombre]
      }
      
      console.log('[LibroModal] Materias seleccionadas:', newMaterias)
      
      if (errors.materias && newMaterias.length > 0) {
        setErrors(prev => ({ ...prev, materias: null }))
      }
      
      return { ...prev, materias: newMaterias }
    })
  }, [errors.materias])

  const handleTematicaToggle = useCallback((tematicaNombre) => {
    setFormData(prev => {
      const currentTematicas = prev.tematicas || []
      const exists = currentTematicas.includes(tematicaNombre)
      
      let newTematicas
      if (exists) {
        newTematicas = currentTematicas.filter(t => t !== tematicaNombre)
      } else {
        newTematicas = [...currentTematicas, tematicaNombre]
      }
      
      console.log('[LibroModal] Temáticas seleccionadas:', newTematicas)
      
      if (errors.tematicas && newTematicas.length > 0) {
        setErrors(prev => ({ ...prev, tematicas: null }))
      }
      
      return { ...prev, tematicas: newTematicas }
    })
  }, [errors.tematicas])

  // CORREGIDO: Validación con logs
  const validate = useCallback(() => {
    const newErrors = {}
    
    console.log('[LibroModal] Validando formulario...')
    console.log('[LibroModal] Datos:', formData)
    
    if (!formData.titulo?.trim()) {
      newErrors.titulo = 'El título es requerido'
    } else if (formData.titulo.length < 3) {
      newErrors.titulo = 'El título debe tener al menos 3 caracteres'
    }
    
    if (!formData.autor?.trim()) {
      newErrors.autor = 'El autor es requerido'
    } else if (formData.autor.length < 2) {
      newErrors.autor = 'El autor debe tener al menos 2 caracteres'
    }
    
    if (!formData.url_drive?.trim()) {
      newErrors.url_drive = 'El link de Drive es obligatorio'
    } else if (!isValidUrl(formData.url_drive)) {
      newErrors.url_drive = 'URL inválida (ej: https://drive.google.com/...)'
    }
    
    // Validación según tipo
    if (formData.tipo === 'carrera') {
      if (!formData.materias || formData.materias.length === 0) {
        newErrors.materias = 'Selecciona al menos una materia'
        console.log('[LibroModal] ❌ Error: No hay materias seleccionadas')
      } else {
        console.log('[LibroModal] ✅ Materias seleccionadas:', formData.materias)
      }
    } else {
      if (!formData.tematicas || formData.tematicas.length === 0) {
        newErrors.tematicas = 'Selecciona al menos una temática'
      }
    }
    
    if (formData.isbn && !/^[0-9]{10}|[0-9]{13}$/.test(formData.isbn.replace(/-/g, ''))) {
      newErrors.isbn = 'ISBN inválido (debe ser 10 o 13 dígitos)'
    }
    
    if (formData.año) {
      const yearNum = parseInt(formData.año)
      if (isNaN(yearNum) || yearNum < 1900 || yearNum > new Date().getFullYear() + 5) {
        newErrors.año = `Año inválido (1900-${new Date().getFullYear() + 5})`
      }
    }
    
    if (formData.semestre) {
      const sem = parseInt(formData.semestre)
      if (isNaN(sem) || sem < 1 || sem > 10) {
        newErrors.semestre = 'Semestre inválido (1-10)'
      }
    }
    
    if (formData.paginas) {
      const pag = parseInt(formData.paginas)
      if (isNaN(pag) || pag < 1) {
        newErrors.paginas = 'Número de páginas inválido'
      }
    }
    
    setErrors(newErrors)
    const isValid = Object.keys(newErrors).length === 0
    console.log('[LibroModal] Validación:', isValid ? '✅ Exitosa' : '❌ Falló', newErrors)
    return isValid
  }, [formData])

  // CORREGIDO: Envío con logs
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault()
    
    if (submitLockRef.current || loading) return
    
    if (!validate()) return
    
    submitLockRef.current = true
    setIsSubmitting(true)
    
    try {
      console.log('[LibroModal] Preparando datos para guardar...')
      console.log('[LibroModal] formData.materias:', formData.materias)
      
      const dataToSave = {
        id: formData.id,
        titulo: formData.titulo.trim(),
        autor: formData.autor.trim(),
        editorial: formData.editorial?.trim() || '',
        isbn: formData.isbn?.trim() || '',
        edicion: formData.edicion?.trim() || '',
        año: parseInt(formData.año) || new Date().getFullYear(),
        paginas: parseInt(formData.paginas) || '',
        url_drive: formData.url_drive?.trim() || '',
        materias: formData.tipo === 'carrera' ? formData.materias : [],
        tematicas: formData.tipo === 'tematica' ? formData.tematicas : [],
        semestre: formData.tipo === 'carrera' ? (parseInt(formData.semestre) || '') : '',
        palabras_clave: formData.palabras_clave?.trim() || '',
        notas: formData.notas?.trim() || '',
        tipo: formData.tipo
      }
      
      console.log('[LibroModal] 📦 Datos a guardar:', dataToSave)
      
      await onSave(dataToSave)
      
      console.log('[LibroModal] ✅ Libro guardado exitosamente')
      
      submitLockRef.current = false
      setIsSubmitting(false)
      
    } catch (err) {
      console.error('[LibroModal] ❌ Error guardando:', err)
      submitLockRef.current = false
      setIsSubmitting(false)
      setErrors(prev => ({
        ...prev,
        submit: err.message || 'Error al guardar el libro'
      }))
    }
  }, [formData, validate, onSave, loading])

  const isValidUrl = (url) => {
    try {
      const parsed = new URL(url)
      return parsed.protocol === 'http:' || parsed.protocol === 'https:'
    } catch {
      return false
    }
  }

  const [searchMateria, setSearchMateria] = useState('')
  const [searchTematica, setSearchTematica] = useState('')
  
  const materiasFiltradas = useMemo(() => {
    if (!searchMateria.trim()) return materias || []
    const search = searchMateria.toLowerCase()
    return (materias || []).filter(m => 
      m.nombre.toLowerCase().includes(search) ||
      m.id.toString().includes(search)
    )
  }, [materias, searchMateria])

  const tematicasFiltradas = useMemo(() => {
    if (!searchTematica.trim()) return tematicasDisponibles || []
    const search = searchTematica.toLowerCase()
    return (tematicasDisponibles || []).filter(t => 
      t.nombre.toLowerCase().includes(search) ||
      t.id.toString().includes(search)
    )
  }, [tematicasDisponibles, searchTematica])

  const semestres = [
    { id: 1, nombre: '1er Semestre' },
    { id: 2, nombre: '2do Semestre' },
    { id: 3, nombre: '3er Semestre' },
    { id: 4, nombre: '4to Semestre' },
    { id: 5, nombre: '5to Semestre' },
    { id: 6, nombre: '6to Semestre' },
    { id: 7, nombre: '7mo Semestre' },
    { id: 8, nombre: '8vo Semestre' },
    { id: 9, nombre: '9no Semestre' },
    { id: 10, nombre: '10mo Semestre' }
  ]

  if (!isOpen) return null

  const esCarrera = formData.tipo === 'carrera'
  const tituloModal = libro 
    ? (esCarrera ? '✏️ Editar Libro de Carrera' : '✏️ Editar Libro Temático')
    : (esCarrera ? '📚 Agregar Nuevo Libro de Carrera' : '📖 Agregar Nuevo Libro Temático')

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[95vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between bg-gradient-to-r from-primary-600 to-secondary-600 text-white px-6 py-4 rounded-t-lg flex-shrink-0">
          <h2 className="text-xl font-bold flex items-center gap-2">
            {esCarrera ? <Book className="w-6 h-6" /> : <BookOpen className="w-6 h-6" />}
            {tituloModal}
          </h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="hover:bg-white hover:bg-opacity-20 p-1 rounded transition-colors disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          
          {/* Error general de envío */}
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{errors.submit}</p>
            </div>
          )}

          {/* Indicador de tipo */}
          <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 p-2 rounded-lg">
            <span className="font-medium">Tipo:</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${esCarrera ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
              {esCarrera ? '📚 Carrera' : '📖 Temático'}
            </span>
            {esCarrera && (
              <span className="text-xs text-gray-400 ml-2">
                (Libros de las 55 materias de la carrera)
              </span>
            )}
            {!esCarrera && (
              <span className="text-xs text-gray-400 ml-2">
                (Libros de humanidades, hábitos, etc.)
              </span>
            )}
          </div>

          {/* ============================================ */}
          {/* SECCIÓN 1: IDENTIFICACIÓN BÁSICA */}
          {/* ============================================ */}
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ID *
              </label>
              <input
                type="text"
                name="id"
                value={formData.id}
                onChange={handleChange}
                placeholder="lib-abc123"
                disabled={!!libro}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none disabled:bg-gray-100 disabled:cursor-not-allowed font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">Auto-generado si se deja vacío</p>
            </div>

            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Título *
              </label>
              <input
                type="text"
                name="titulo"
                value={formData.titulo}
                onChange={handleChange}
                placeholder={esCarrera ? "Ej: Cálculo Diferencial e Integral" : "Ej: Hábitos Atómicos"}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none ${
                  errors.titulo ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.titulo && (
                <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" /> {errors.titulo}
                </p>
              )}
            </div>
          </div>

          {/* ============================================ */}
          {/* SECCIÓN 2: AUTOR Y PUBLICACIÓN */}
          {/* ============================================ */}
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Autor(es) *
              </label>
              <input
                type="text"
                name="autor"
                value={formData.autor}
                onChange={handleChange}
                placeholder="Ej: Stewart, James"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none ${
                  errors.autor ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.autor && (
                <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" /> {errors.autor}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">Apellido, Nombre (separar múltiples con comas)</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Año
              </label>
              <input
                type="number"
                name="año"
                value={formData.año || ''}
                onChange={handleChange}
                placeholder="2024"
                min="1900"
                max={new Date().getFullYear() + 5}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none ${
                  errors.año ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.año && (
                <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" /> {errors.año}
                </p>
              )}
            </div>
          </div>

          {/* ============================================ */}
          {/* SECCIÓN 3: EDITORIAL Y EDICIÓN */}
          {/* ============================================ */}
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Editorial
              </label>
              <input
                type="text"
                name="editorial"
                value={formData.editorial}
                onChange={handleChange}
                placeholder="Ej: Pearson, McGraw-Hill"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Edición
              </label>
              <input
                type="text"
                name="edicion"
                value={formData.edicion}
                onChange={handleChange}
                placeholder="Ej: 3ra, 2da"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ISBN
              </label>
              <input
                type="text"
                name="isbn"
                value={formData.isbn}
                onChange={handleChange}
                placeholder="978-3-16-148410-0"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none ${
                  errors.isbn ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.isbn && (
                <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" /> {errors.isbn}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">10 o 13 dígitos (sin guiones opcional)</p>
            </div>
          </div>

          {/* ============================================ */}
          {/* SECCIÓN 4: PÁGINAS Y URL */}
          {/* ============================================ */}
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Páginas
              </label>
              <input
                type="number"
                name="paginas"
                value={formData.paginas || ''}
                onChange={handleChange}
                placeholder="350"
                min="1"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none ${
                  errors.paginas ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.paginas && (
                <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" /> {errors.paginas}
                </p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Link en Drive *
              </label>
              <input
                type="url"
                name="url_drive"
                value={formData.url_drive}
                onChange={handleChange}
                placeholder="https://drive.google.com/file/d/XXXXX/view"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none ${
                  errors.url_drive ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.url_drive && (
                <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" /> {errors.url_drive}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                <span className="text-red-500 font-medium">* Obligatorio</span> - Enlace al libro en Google Drive
              </p>
            </div>
          </div>

          {/* ============================================ */}
          {/* SECCIÓN 5: MATERIAS (solo carrera) - CORREGIDO */}
          {/* ============================================ */}
          
          {esCarrera && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Materias donde aplica *
              </label>
              
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar materia..."
                  value={searchMateria}
                  onChange={(e) => setSearchMateria(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                />
              </div>

              {errors.materias && (
                <p className="text-sm text-red-600 mb-3 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" /> {errors.materias}
                </p>
              )}

              <div className="text-xs text-gray-500 mb-2">
                {formData.materias && formData.materias.length > 0 ? (
                  <span className="text-primary-600 font-medium">
                    {formData.materias.length} materia(s) seleccionada(s): {formData.materias.join(', ')}
                  </span>
                ) : (
                  <span>Selecciona una o más materias</span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2">
                {materiasFiltradas.length === 0 ? (
                  <div className="col-span-full text-center py-4 text-gray-500 text-sm">
                    No se encontraron materias
                  </div>
                ) : (
                  materiasFiltradas.map(materia => (
                    <label 
                      key={materia.id} 
                      className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors text-sm ${
                        formData.materias && formData.materias.includes(materia.nombre)
                          ? 'bg-primary-50 border-primary-200' 
                          : 'hover:bg-gray-50'
                      } border ${
                        formData.materias && formData.materias.includes(materia.nombre)
                          ? 'border-primary-300' 
                          : 'border-transparent'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.materias && formData.materias.includes(materia.nombre)}
                        onChange={() => handleMateriaToggle(materia.nombre)}
                        className="w-4 h-4 text-primary-600 rounded focus:ring-2 focus:ring-primary-500 flex-shrink-0"
                      />
                      <span className="truncate">
                        <span className="font-medium text-gray-500">{materia.id}.</span> {materia.nombre}
                      </span>
                    </label>
                  ))
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">Selecciona una o más materias para este libro</p>
            </div>
          )}

          {/* ============================================ */}
          {/* SECCIÓN 5B: TEMÁTICAS (solo temático) */}
          {/* ============================================ */}
          
          {!esCarrera && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Temáticas donde aplica *
              </label>
              
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar temática..."
                  value={searchTematica}
                  onChange={(e) => setSearchTematica(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                />
              </div>

              {errors.tematicas && (
                <p className="text-sm text-red-600 mb-3 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" /> {errors.tematicas}
                </p>
              )}

              <div className="text-xs text-gray-500 mb-2">
                {formData.tematicas && formData.tematicas.length > 0 ? (
                  <span className="text-purple-600 font-medium">
                    {formData.tematicas.length} temática(s) seleccionada(s): {formData.tematicas.join(', ')}
                  </span>
                ) : (
                  <span>Selecciona una o más temáticas</span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2">
                {tematicasFiltradas.length === 0 ? (
                  <div className="col-span-full text-center py-4 text-gray-500 text-sm">
                    No se encontraron temáticas
                  </div>
                ) : (
                  tematicasFiltradas.map(tematica => (
                    <label 
                      key={tematica.id} 
                      className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors text-sm ${
                        formData.tematicas && formData.tematicas.includes(tematica.nombre)
                          ? 'bg-purple-50 border-purple-200' 
                          : 'hover:bg-gray-50'
                      } border ${
                        formData.tematicas && formData.tematicas.includes(tematica.nombre)
                          ? 'border-purple-300' 
                          : 'border-transparent'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.tematicas && formData.tematicas.includes(tematica.nombre)}
                        onChange={() => handleTematicaToggle(tematica.nombre)}
                        className="w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500 flex-shrink-0"
                      />
                      <span className="truncate">
                        <span className="font-medium text-gray-500">{tematica.icono}</span> {tematica.nombre}
                      </span>
                    </label>
                  ))
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">Selecciona una o más temáticas para este libro</p>
            </div>
          )}

          {/* ============================================ */}
          {/* SECCIÓN 6: SEMESTRE (solo carrera) */}
          {/* ============================================ */}
          
          {esCarrera && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Semestre recomendado
              </label>
              <select
                name="semestre"
                value={formData.semestre || ''}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none ${
                  errors.semestre ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Seleccionar semestre</option>
                {semestres.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
                ))}
              </select>
              {errors.semestre && (
                <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" /> {errors.semestre}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">Opcional - útil para planificación</p>
            </div>
          )}

          {/* ============================================ */}
          {/* SECCIÓN 7: PALABRAS CLAVE Y NOTAS */}
          {/* ============================================ */}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Palabras clave
            </label>
            <input
              type="text"
              name="palabras_clave"
              value={formData.palabras_clave}
              onChange={handleChange}
              placeholder="Ej: cálculo, derivadas, integrales, límites"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            />
            <p className="text-xs text-gray-500 mt-1">Separar con comas - útil para búsqueda avanzada</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notas
            </label>
            <textarea
              name="notas"
              value={formData.notas}
              onChange={handleChange}
              placeholder={esCarrera 
                ? "Ej: Excelente para límites y continuidad, recomendado por el Dr. Pérez..."
                : "Ej: Recomendado para todos los semestres, útil para desarrollar hábitos..."
              }
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">Comentarios adicionales sobre el libro</p>
          </div>

          {/* Botones */}
          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-gradient-to-r from-primary-600 to-secondary-600 text-white rounded-lg hover:shadow-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-w-[140px] justify-center"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Guardando...
                </>
              ) : (
                libro ? '💾 Guardar cambios' : '➕ Agregar libro'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}