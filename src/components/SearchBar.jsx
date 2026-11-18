import { Search, X, ChevronDown } from 'lucide-react'

export default function SearchBar({
  searchTerm = '',
  onSearchChange,
  selectedMateria = null,
  onMateriaChange,
  selectedTematica = null,
  onTematicaChange,
  materias = [],
  tematicas = []
}) {
  // Catálogos a prueba de undefined
  const listaMaterias = Array.isArray(materias) ? materias : []
  const listaTematicas = Array.isArray(tematicas) ? tematicas : []

  // Objetos actuales (para mostrar chips)
  const materiaActual = listaMaterias.find(m => m.id === selectedMateria) || null
  const tematicaActual = listaTematicas.find(t => t.id === selectedTematica) || null
  const hayFiltros = !!(searchTerm || selectedMateria || selectedTematica)

  // Handlers
  const handleClearSearch = () => onSearchChange?.('')
  const handleClearMateria = () => onMateriaChange?.(null)
  const handleClearTematica = () => onTematicaChange?.(null)
  const handleClearAll = () => {
    onSearchChange?.('')
    onMateriaChange?.(null)
    onTematicaChange?.(null)
  }

  // Al cambiar un select, buscamos el ID real en el array para preservar
  // el tipo original (number o string) y que el filtrado estricto funcione.
  const handleMateriaSelect = (e) => {
    const value = e.target.value
    if (!value) {
      onMateriaChange?.(null)
      return
    }
    const found = listaMaterias.find(m => String(m.id) === value)
    onMateriaChange?.(found ? found.id : null)
  }

  const handleTematicaSelect = (e) => {
    const value = e.target.value
    if (!value) {
      onTematicaChange?.(null)
      return
    }
    const found = listaTematicas.find(t => String(t.id) === value)
    onTematicaChange?.(found ? found.id : null)
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-6">
      <div className="flex flex-col md:flex-row gap-4">
        {/* Buscador */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder="Buscar por título, autor, ID, ISBN o notas..."
            className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
          />
          {searchTerm && (
            <button
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
              aria-label="Limpiar búsqueda"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Filtro de materia */}
        <div className="md:w-64 relative">
          <select
            value={selectedMateria != null ? String(selectedMateria) : ''}
            onChange={handleMateriaSelect}
            className="w-full pl-4 pr-16 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none appearance-none bg-white"
            aria-label="Filtrar por materia"
          >
            <option value="">📚 Todas las materias</option>
            {listaMaterias.map(materia => (
              <option key={materia.id} value={String(materia.id)}>
                {materia.id}. {materia.nombre}
              </option>
            ))}
          </select>
          {selectedMateria != null && (
            <button
              onClick={handleClearMateria}
              className="absolute right-8 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
              aria-label="Limpiar materia"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>

        {/* Filtro de temática */}
        <div className="md:w-64 relative">
          <select
            value={selectedTematica != null ? String(selectedTematica) : ''}
            onChange={handleTematicaSelect}
            className="w-full pl-4 pr-16 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none appearance-none bg-white"
            aria-label="Filtrar por temática"
          >
            <option value="">📖 Todas las temáticas</option>
            {listaTematicas.map(tematica => (
              <option key={tematica.id} value={String(tematica.id)}>
                {tematica.icono || '📖'} {tematica.nombre}
              </option>
            ))}
          </select>
          {selectedTematica != null && (
            <button
              onClick={handleClearTematica}
              className="absolute right-8 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
              aria-label="Limpiar temática"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Chips de filtros activos */}
      {hayFiltros && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 flex-wrap">
          <span className="text-xs text-gray-500 font-medium">Filtros activos:</span>

          {searchTerm && (
            <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs">
              🔍 "{searchTerm}"
              <button
                onClick={handleClearSearch}
                className="hover:text-blue-900"
                aria-label="Quitar filtro de búsqueda"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {materiaActual && (
            <span className="inline-flex items-center gap-1 bg-primary-100 text-primary-700 px-2 py-1 rounded-full text-xs">
              📚 {materiaActual.id}. {materiaActual.nombre}
              <button
                onClick={handleClearMateria}
                className="hover:text-primary-900"
                aria-label="Quitar filtro de materia"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {tematicaActual && (
            <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs">
              {tematicaActual.icono || '📖'} {tematicaActual.nombre}
              <button
                onClick={handleClearTematica}
                className="hover:text-purple-900"
                aria-label="Quitar filtro de temática"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          <button
            onClick={handleClearAll}
            className="ml-auto text-xs text-gray-500 hover:text-red-600 font-medium underline"
          >
            Limpiar todo
          </button>
        </div>
      )}
    </div>
  )
}
