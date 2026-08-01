import { useState, useEffect } from 'react'
import { X, AlertCircle } from 'lucide-react'

export default function LibroModal({ 
  isOpen, 
  onClose, 
  onSave, 
  libro, 
  materias,
  loading
}) {
  const [formData, setFormData] = useState({
    id: '',
    titulo: '',
    autor: '',
    año: new Date().getFullYear(),
    url_drive: '',
    materias: [],
    notas: ''
  })
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (libro) {
      setFormData(libro)
    } else {
      setFormData({
        id: '',
        titulo: '',
        autor: '',
        año: new Date().getFullYear(),
        url_drive: '',
        materias: [],
        notas: ''
      })
    }
    setErrors({})
  }, [libro, isOpen])

  const handleChange = (e) => {
    const { name, value } = e.target
    if (name === 'año') {
      setFormData(prev => ({ ...prev, [name]: parseInt(value) || new Date().getFullYear() }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  const handleMateriaToggle = (materiaId) => {
    setFormData(prev => ({
      ...prev,
      materias: prev.materias.includes(materiaId)
        ? prev.materias.filter(m => m !== materiaId)
        : [...prev.materias, materiaId]
    }))
  }

  const validate = () => {
    const newErrors = {}
    
    if (!formData.titulo.trim()) newErrors.titulo = 'El título es requerido'
    if (!formData.autor.trim()) newErrors.autor = 'El autor es requerido'
    if (formData.materias.length === 0) newErrors.materias = 'Selecciona al menos una materia'
    if (formData.url_drive && !isValidUrl(formData.url_drive)) {
      newErrors.url_drive = 'URL inválida'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const isValidUrl = (url) => {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (validate()) {
      onSave(formData)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full my-8">
        {/* Header */}
        <div className="flex items-center justify-between bg-gradient-to-r from-primary-600 to-secondary-600 text-white px-6 py-4">
          <h2 className="text-xl font-bold">
            {libro ? 'Editar Libro' : 'Agregar Nuevo Libro'}
          </h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="hover:bg-white hover:bg-opacity-20 p-1 rounded transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* ID y Título */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ID *
              </label>
              <input
                type="text"
                name="id"
                value={formData.id}
                onChange={handleChange}
                placeholder="01, 02, 03..."
                disabled={!!libro}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">Único identificador</p>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Título *
              </label>
              <input
                type="text"
                name="titulo"
                value={formData.titulo}
                onChange={handleChange}
                placeholder="Calculus, Álgebra Lineal..."
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

          {/* Autor y Año */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Autor *
              </label>
              <input
                type="text"
                name="autor"
                value={formData.autor}
                onChange={handleChange}
                placeholder="Stewart, Grossman..."
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none ${
                  errors.autor ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.autor && (
                <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" /> {errors.autor}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Año
              </label>
              <input
                type="number"
                name="año"
                value={formData.año}
                onChange={handleChange}
                min="1900"
                max={new Date().getFullYear() + 5}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              />
            </div>
          </div>

          {/* URL Drive */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Link en Drive
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
              <p className="text-sm text-red-600 mt-1">{errors.url_drive}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">Opcional</p>
          </div>

          {/* Materias */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Materias donde aplica *
            </label>
            {errors.materias && (
              <p className="text-sm text-red-600 mb-3 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" /> {errors.materias}
              </p>
            )}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
              {materias.map(materia => (
                <label key={materia.id} className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.materias.includes(materia.id)}
                    onChange={() => handleMateriaToggle(materia.id)}
                    className="w-4 h-4 text-primary-600 rounded focus:ring-2 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">
                    {materia.id}. {materia.nombre.substring(0, 30)}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notas
            </label>
            <textarea
              name="notas"
              value={formData.notas}
              onChange={handleChange}
              placeholder="Ej: Excelente para límites y continuidad..."
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none resize-none"
            />
          </div>

          {/* Botones */}
          <div className="flex gap-3 justify-end pt-4">
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
              className="px-6 py-2 bg-gradient-to-r from-primary-600 to-secondary-600 text-white rounded-lg hover:shadow-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {libro ? 'Guardar cambios' : 'Agregar libro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
