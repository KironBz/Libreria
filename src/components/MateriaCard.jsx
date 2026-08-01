import { ExternalLink, Edit2, Trash2, BookOpen } from 'lucide-react'

export default function MateriaCard({ 
  materia, 
  libros, 
  onEditLibro, 
  onDeleteLibro,
  loading
}) {
  const librosEnMateria = libros.filter(l => l.materias.includes(materia.id))

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-secondary-600 text-white px-6 py-4">
        <h3 className="text-lg font-semibold">
          <span className="opacity-75 text-sm font-mono mr-2">{materia.id}</span>
          {materia.nombre}
        </h3>
        <p className="text-xs opacity-75 mt-1">
          {librosEnMateria.length} {librosEnMateria.length === 1 ? 'libro' : 'libros'}
        </p>
      </div>

      {/* Content */}
      <div className="p-4">
        {librosEnMateria.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Sin libros asignados</p>
          </div>
        ) : (
          <div className="space-y-3">
            {librosEnMateria.map(libro => (
              <div 
                key={libro.id}
                className="bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Título con link */}
                    {libro.url_drive ? (
                      <a
                        href={libro.url_drive}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:text-primary-700 font-semibold text-sm flex items-center gap-1 group/link mb-1"
                      >
                        <span className="truncate">{libro.titulo}</span>
                        <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                      </a>
                    ) : (
                      <p className="font-semibold text-sm text-gray-900 mb-1">
                        {libro.titulo}
                      </p>
                    )}

                    {/* Meta información */}
                    <div className="text-xs text-gray-600 space-y-1">
                      <p>
                        <span className="font-medium">{libro.autor}</span>
                        {libro.año && <span className="opacity-75 ml-2">({libro.año})</span>}
                      </p>

                      {/* Notas */}
                      {libro.notas && (
                        <p className="text-gray-500 italic">
                          {libro.notas.substring(0, 50)}
                          {libro.notas.length > 50 ? '...' : ''}
                        </p>
                      )}

                      {/* ID Badge */}
                      <div className="pt-1">
                        <span className="inline-block bg-primary-100 text-primary-700 px-2 py-0.5 rounded text-xs font-mono font-semibold">
                          #{libro.id}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button
                      onClick={() => onEditLibro(libro)}
                      disabled={loading}
                      className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Editar"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`¿Eliminar "${libro.titulo}"?`)) {
                          onDeleteLibro(libro.id)
                        }
                      }}
                      disabled={loading}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
