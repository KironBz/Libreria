import { Search, X } from 'lucide-react'

export default function SearchBar({
  searchTerm = '',
  onSearchChange,
  selectedMateria = null,
  onMateriaChange,
  materias = []
}) {
  const handleClearSearch = () => {
    if (onSearchChange) {
      onSearchChange('')
    }
  }

  const handleClearMateria = () => {
    if (onMateriaChange) {
      onMateriaChange(null)
    }
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
            onChange={(e) => {
              if (onSearchChange) {
                onSearchChange(e.target.value)
              }
            }}
            placeholder="Buscar por título, autor, ID o notas..."
            className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
          />
          {searchTerm && (
            <button
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Filtro de materia */}
        <div className="md:w-64 relative">
          <select
            value={selectedMateria || ''}
            onChange={(e) => {
              const value = e.target.value
              if (onMateriaChange) {
                onMateriaChange(value ? parseInt(value) : null)
              }
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none appearance-none bg-white"
          >
            <option value="">Todas las materias</option>
            {materias.map(materia => (
              <option key={materia.id} value={materia.id}>
                {materia.id}. {materia.nombre}
              </option>
            ))}
          </select>
          {selectedMateria && (
            <button
              onClick={handleClearMateria}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Resultados */}
        <div className="flex items-center text-sm text-gray-500 whitespace-nowrap">
          {searchTerm && <span>🔍 Buscando: <strong>{searchTerm}</strong></span>}
          {selectedMateria && materias.find(m => m.id === selectedMateria) && (
            <span className="ml-2">
              📚 {materias.find(m => m.id === selectedMateria)?.nombre}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}