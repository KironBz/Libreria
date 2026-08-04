import { useMemo } from 'react'
import { BarChart3, BookOpen, AlertCircle, TrendingUp, Library } from 'lucide-react'

export default function Dashboard({ data, materias }) {
  // CORREGIDO: Stats memoizadas para evitar re-cálculos innecesarios
  const stats = useMemo(() => calculateStats(data, materias), [data, materias])

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
      {/* Total libros */}
      <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-600 text-sm font-medium">Total de Libros</p>
            <p className="text-3xl font-bold text-gray-900">{stats.totalLibros}</p>
          </div>
          <BookOpen className="w-12 h-12 text-blue-500 opacity-20" />
        </div>
      </div>

      {/* Materias cubiertas */}
      <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-600 text-sm font-medium">Materias Cubiertas</p>
            <p className="text-3xl font-bold text-gray-900">
              {stats.materiasCubiertas}/{materias?.length || 55}
            </p>
          </div>
          <Library className="w-12 h-12 text-green-500 opacity-20" />
        </div>
      </div>

      {/* Porcentaje de cobertura (NUEVA METRICA ÚTIL) */}
      <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-600 text-sm font-medium">Cobertura</p>
            <p className="text-3xl font-bold text-gray-900">
              {stats.porcentajeCobertura}%
            </p>
          </div>
          <TrendingUp className="w-12 h-12 text-purple-500 opacity-20" />
        </div>
      </div>

      {/* Libros sin asignar (SOLO si es > 0) */}
      {stats.librosSinAsignar > 0 && (
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-amber-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Sin Asignar</p>
              <p className="text-3xl font-bold text-amber-600">{stats.librosSinAsignar}</p>
            </div>
            <AlertCircle className="w-12 h-12 text-amber-500 opacity-20" />
          </div>
        </div>
      )}
    </div>
  )
}

// CORREGIDO: Función de cálculo con validaciones
function calculateStats(data, materias) {
  // Validación de entrada
  if (!data || !data.libros) {
    return {
      totalLibros: 0,
      materiasCubiertas: 0,
      librosSinAsignar: 0,
      porcentajeCobertura: 0
    }
  }

  const libros = data.libros
  const totalLibros = libros.length
  
  // CORREGIDO: Usar 'materia' (string) NO 'materias' (array)
  const librosConMateria = libros.filter(l => l.materia && l.materia.trim() !== '')
  const librosSinAsignar = totalLibros - librosConMateria.length

  // Materias únicas cubiertas
  const materiaSet = new Set()
  librosConMateria.forEach(libro => {
    if (libro.materia) {
      materiaSet.add(libro.materia)
    }
  })
  
  const materiasCubiertas = materiaSet.size
  const totalMaterias = materias?.length || 55
  const porcentajeCobertura = totalMaterias > 0 
    ? Math.round((materiasCubiertas / totalMaterias) * 100)
    : 0

  return {
    totalLibros,
    materiasCubiertas,
    librosSinAsignar,
    porcentajeCobertura
  }
}