import { useMemo } from 'react'
import { BookOpen, AlertCircle, TrendingUp, Library } from 'lucide-react'

export default function Dashboard({ data, materias }) {
  // Stats memoizadas para evitar re-cálculos innecesarios
  const stats = useMemo(() => calculateStats(data, materias), [data, materias])

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
      {/* Total libros (con desglose) */}
      <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-600 text-sm font-medium">Total de Libros</p>
            <p className="text-3xl font-bold text-gray-900">{stats.totalLibros}</p>
            <p className="text-xs text-gray-400 mt-1">
              {stats.totalCarrera} carrera · {stats.totalTematicos} temáticos
            </p>
          </div>
          <BookOpen className="w-12 h-12 text-blue-500 opacity-20" />
        </div>
      </div>

      {/* Materias cubiertas (solo libros de carrera) */}
      <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-600 text-sm font-medium">Materias Cubiertas</p>
            <p className="text-3xl font-bold text-gray-900">
              {stats.materiasCubiertas}/{stats.totalMaterias}
            </p>
            <p className="text-xs text-gray-400 mt-1">Solo libros de carrera</p>
          </div>
          <Library className="w-12 h-12 text-green-500 opacity-20" />
        </div>
      </div>

      {/* Porcentaje de cobertura */}
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

      {/* Libros sin asignar (solo si es > 0) */}
      {stats.librosSinAsignar > 0 && (
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-amber-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Sin Asignar</p>
              <p className="text-3xl font-bold text-amber-600">
                {stats.librosSinAsignar}
              </p>
              <p className="text-xs text-gray-400 mt-1">Carrera sin materia</p>
            </div>
            <AlertCircle className="w-12 h-12 text-amber-500 opacity-20" />
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Calcula estadísticas a partir de `data.libros` y la lista maestra de `materias`.
 *
 * Reglas:
 * - Solo los libros de tipo 'carrera' (o sin tipo, legacy) cuentan para
 *   cobertura de materias.
 * - Los libros de tipo 'tematica' se cuentan aparte y NO afectan la cobertura.
 * - Los nombres de materia se validan contra la lista maestra para evitar
 *   que un typo infle el porcentaje por encima de 100%.
 */
function calculateStats(data, materias) {
  const empty = {
    totalLibros: 0,
    totalCarrera: 0,
    totalTematicos: 0,
    materiasCubiertas: 0,
    totalMaterias: 0,
    librosSinAsignar: 0,
    porcentajeCobertura: 0
  }

  // Validación de entrada
  if (!data || !Array.isArray(data.libros)) {
    return empty
  }

  const libros = data.libros
  const totalLibros = libros.length

  // 1) Separar por tipo (libros sin tipo se tratan como 'carrera' por compatibilidad)
  const librosCarrera = libros.filter(l => !l.tipo || l.tipo === 'carrera')
  const librosTematicos = libros.filter(l => l.tipo === 'tematica')

  // 2) Libros de carrera con al menos una materia asignada (array no vacío)
  const librosConMateria = librosCarrera.filter(
    l => Array.isArray(l.materias) && l.materias.length > 0
  )
  const librosSinAsignar = librosCarrera.length - librosConMateria.length

  // 3) Materias únicas cubiertas (validadas contra la lista maestra)
  const nombresValidos = new Set(
    (Array.isArray(materias) ? materias : []).map(m => m.nombre)
  )
  const materiaSet = new Set()
  librosConMateria.forEach(libro => {
    libro.materias.forEach(nombre => {
      if (typeof nombre === 'string') {
        const limpio = nombre.trim()
        if (limpio && nombresValidos.has(limpio)) {
          materiaSet.add(limpio)
        }
      }
    })
  })

  const materiasCubiertas = materiaSet.size
  const totalMaterias = Array.isArray(materias) ? materias.length : 0
  const porcentajeCobertura =
    totalMaterias > 0
      ? Math.min(100, Math.round((materiasCubiertas / totalMaterias) * 100))
      : 0

  return {
    totalLibros,
    totalCarrera: librosCarrera.length,
    totalTematicos: librosTematicos.length,
    materiasCubiertas,
    totalMaterias,
    librosSinAsignar,
    porcentajeCobertura
  }
}
