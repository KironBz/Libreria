import { BarChart3, BookOpen, AlertCircle, TrendingUp } from 'lucide-react'

export default function Dashboard({ data, materias }) {
  const stats = calculateStats(data, materias)

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
            <p className="text-3xl font-bold text-gray-900">{stats.materiasCubiertas}/55</p>
          </div>
          <BarChart3 className="w-12 h-12 text-green-500 opacity-20" />
        </div>
      </div>

      {/* Promedio */}
      <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-600 text-sm font-medium">Promedio/Materia</p>
            <p className="text-3xl font-bold text-gray-900">{stats.promedio.toFixed(1)}</p>
          </div>
          <TrendingUp className="w-12 h-12 text-purple-500 opacity-20" />
        </div>
      </div>

      {/* Libros sin asignar */}
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

function calculateStats(data, materias) {
  const totalLibros = data.libros?.length || 0
  const librosConMateria = data.libros?.filter(l => l.materias?.length > 0) || []
  const librosSinAsignar = totalLibros - librosConMateria.length

  const materiaIds = new Set()
  librosConMateria.forEach(libro => {
    libro.materias.forEach(mid => materiaIds.add(mid))
  })

  const materiasCubiertas = materiaIds.size
  const promedio = materiasCubiertas > 0 ? librosConMateria.length / materiasCubiertas : 0

  return {
    totalLibros,
    materiasCubiertas,
    librosSinAsignar,
    promedio
  }
}
