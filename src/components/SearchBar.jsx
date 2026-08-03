import { Search, X } from 'lucide-react'

export default function SearchBar({ 
  searchTerm, 
  onSearchChange, 
  selectedMateria, 
  onMateriaChange,
  materias 
}) {
  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-6 space-y-4">
      {/* Búsqueda */}
      <div className="relative">
        <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por título, autor o ID..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
        />
        {searchTerm && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Filtro por materia */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Filtrar por materia
        </label>
        <select
          value={selectedMateria || ""}
          onChange={(e) => onMateriaChange(e.target.value ? parseInt(e.target.value) : null)}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none bg-white"
        >
          <option value="">Todas las materias ({materias.length})</option>
          {materias.map(materia => (
            <option key={materia.id} value={materia.id}>
              {materia.id}. {materia.nombre}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}