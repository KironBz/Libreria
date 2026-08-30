import { ExternalLink, Edit2, Trash2, BookOpen, Grid } from 'lucide-react'

export default function TematicaCard({ 
  tematica, 
  libros, 
  onEditLibro, 
  onDeleteLibro,
  loading
}) {
  const librosEnTematica = (libros || []).filter(l => 
    l.tematicas && l.tematicas.includes(tematica.nombre)
  )

  const handleDelete = (libro) => {
    console.log('[TematicaCard] Intentando eliminar:', libro.titulo, libro.id)
    
    const confirmado = window.confirm(`¿Eliminar "${libro.titulo}"?`)
    
    if (confirmado) {
      console.log('[TematicaCard] Confirmado, llamando a onDeleteLibro')
      onDeleteLibro(libro.id)
    } else {
      console.log('[TematicaCard] Eliminación cancelada')
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden border-t-4 border-purple-500">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <span className="text-xl">{tematica.icono || '📖'}</span>
          {tematica.nombre}
        </h3>
        <p className="text-xs opacity-75 mt-1">
          {librosEnTematica.length} {librosEnTematica.length === 1 ? 'libro' : 'libros'}
        </p>
      </div>

      {/* Content */}
      <div className="p-4">
        {librosEnTematica.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Sin libros asignados</p>
          </div>
        ) : (
          <div className="space-y-3">
            {librosEnTematica.map(libro => (
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
                        className="text-purple-600 hover:text-purple-700 font-semibold text-sm flex items-center gap-1 group/link mb-1"
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

                      {/* Editorial si existe */}
                      {libro.editorial && (
                        <p className="text-gray-500">
                          {libro.editorial}
                          {libro.edicion && <span className="ml-1">• {libro.edicion} ed.</span>}
                        </p>
                      )}

                      {/* Notas */}
                      {libro.notas && (
                        <p className="text-gray-500 italic">
                          {libro.notas.substring(0, 50)}
                          {libro.notas.length > 50 ? '...' : ''}
                        </p>
                      )}

                      {/* Badge de tipo y ID */}
                      <div className="pt-1 flex gap-2 flex-wrap">
                        <span className="inline-block bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs font-medium">
                          📖 Temático
                        </span>
                        <span className="inline-block bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs font-mono">
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
                      className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Editar"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(libro)}
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