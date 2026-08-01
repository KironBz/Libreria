import { useEffect, useState } from 'react'
import { LogOut, Plus, AlertCircle, BookOpen } from 'lucide-react'
import githubService from './services/githubService'
import LoginScreen from './components/LoginScreen'
import Dashboard from './components/Dashboard'
import SearchBar from './components/SearchBar'
import MateriaCard from './components/MateriaCard'
import LibroModal from './components/LibroModal'

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState({ materias: [], libros: [] })
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedMateria, setSelectedMateria] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingLibro, setEditingLibro] = useState(null)
  const [error, setError] = useState('')
  const [user, setUser] = useState(null)

  // Verificar autenticación al cargar
  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (githubService.token) {
          const userInfo = await githubService.getAuthenticatedUser()
          setUser(userInfo)
          await loadData()
          setIsAuthenticated(true)
        }
      } catch (err) {
        githubService.clearAuth()
        setIsAuthenticated(false)
      }
    }

    checkAuth()
  }, [])

  // Cargar datos del Gist
  const loadData = async () => {
    try {
      setLoading(true)
      setError('')
      const gistData = await githubService.getData()
      setData(gistData)
    } catch (err) {
      // Inicializar con datos vacíos si falla
      console.warn('Error cargando datos, inicializando vacío:', err)
      setData({
        metadata: {
          version: '1.0',
          lastUpdate: new Date().toISOString()
        },
        materias: githubService.getMaterias(),
        libros: []
      })
      setError('Nota: Tu biblioteca se iniciará vacía. Los cambios se guardarán automáticamente.')
    } finally {
      setLoading(false)
    }
  }

  // Login
  const handleLogin = async (token) => {
    try {
      setLoading(true)
      setError('')
      githubService.setToken(token)
      
      const userInfo = await githubService.getAuthenticatedUser()
      setUser(userInfo)
      
      await loadData()
      setIsAuthenticated(true)
    } catch (err) {
      githubService.clearAuth()
      setError(err.message || 'Error al autenticarse')
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Logout
  const handleLogout = () => {
    if (confirm('¿Estás seguro de que quieres salir?')) {
      githubService.clearAuth()
      setIsAuthenticated(false)
      setUser(null)
      setData({ materias: [], libros: [] })
    }
  }

  // Agregar/Editar libro
  const handleSaveLibro = async (formData) => {
    try {
      setLoading(true)
      setError('')

      let updatedLibros = [...data.libros]

      if (editingLibro) {
        // Editar
        updatedLibros = updatedLibros.map(l =>
          l.id === editingLibro.id ? formData : l
        )
      } else {
        // Agregar
        if (updatedLibros.some(l => l.id === formData.id)) {
          setError('Ya existe un libro con ese ID')
          setLoading(false)
          return
        }
        updatedLibros.push(formData)
      }

      const updatedData = { ...data, libros: updatedLibros }
      await githubService.updateData(updatedData)
      setData(updatedData)
      
      setModalOpen(false)
      setEditingLibro(null)
    } catch (err) {
      setError(err.message || 'Error guardando libro')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Eliminar libro
  const handleDeleteLibro = async (libroId) => {
    try {
      setLoading(true)
      setError('')

      const updatedLibros = data.libros.filter(l => l.id !== libroId)
      const updatedData = { ...data, libros: updatedLibros }
      
      await githubService.updateData(updatedData)
      setData(updatedData)
    } catch (err) {
      setError(err.message || 'Error eliminando libro')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Filtrar materias
  const materiasAMostrar = selectedMateria
    ? data.materias.filter(m => m.id === selectedMateria)
    : data.materias

  // Filtrar libros por búsqueda
  const librosFiltered = data.libros.filter(libro => {
    const searchLower = searchTerm.toLowerCase()
    return (
      libro.titulo.toLowerCase().includes(searchLower) ||
      libro.autor.toLowerCase().includes(searchLower) ||
      libro.id.includes(searchTerm) ||
      libro.notas.toLowerCase().includes(searchLower)
    )
  })

  if (!isAuthenticated) {
    return <LoginScreen onLogin={handleLogin} loading={loading} />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-primary-600 via-primary-500 to-secondary-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">📚 Biblioteca Mecatrónica</h1>
              <p className="text-sm opacity-90 mt-1">UNAM • {user?.login}</p>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  setModalOpen(true)
                  setEditingLibro(null)
                }}
                disabled={loading}
                className="bg-white text-primary-600 hover:bg-gray-100 px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-5 h-5" />
                Agregar Libro
              </button>

              <button
                onClick={handleLogout}
                className="text-white hover:bg-white hover:bg-opacity-20 px-3 py-2 rounded-lg transition-colors"
                title="Salir"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-700 font-medium">Error</p>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
            <button
              onClick={() => setError('')}
              className="text-red-600 hover:text-red-700 font-semibold text-sm"
            >
              Cerrar
            </button>
          </div>
        )}

        {/* Dashboard */}
        {!loading && data.libros.length > 0 && (
          <Dashboard data={data} materias={data.materias} />
        )}

        {/* Search & Filter */}
        <SearchBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          selectedMateria={selectedMateria}
          onMateriaChange={setSelectedMateria}
          materias={data.materias}
        />

        {/* Loading */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block">
              <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mb-4" />
              <p className="text-gray-600 font-medium">Cargando...</p>
            </div>
          </div>
        )}

        {/* No results */}
        {!loading && librosFiltered.length === 0 && data.libros.length > 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No se encontraron libros</p>
            <p className="text-gray-400 text-sm mt-2">Intenta con otros términos de búsqueda</p>
          </div>
        )}

        {/* Materias Grid */}
        {!loading && librosFiltered.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {materiasAMostrar.map(materia => (
              <MateriaCard
                key={materia.id}
                materia={materia}
                libros={librosFiltered}
                onEditLibro={(libro) => {
                  setEditingLibro(libro)
                  setModalOpen(true)
                }}
                onDeleteLibro={handleDeleteLibro}
                loading={loading}
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && data.libros.length === 0 && (
          <div className="text-center py-12">
            <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg font-medium">Tu biblioteca está vacía</p>
            <p className="text-gray-400 text-sm mt-2 mb-6">Agrega tu primer libro para comenzar</p>
            <button
              onClick={() => setModalOpen(true)}
              className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 font-semibold transition-colors"
            >
              Agregar primer libro
            </button>
          </div>
        )}
      </main>

      {/* Modal */}
      <LibroModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditingLibro(null)
        }}
        onSave={handleSaveLibro}
        libro={editingLibro}
        materias={data.materias}
        loading={loading}
      />
    </div>
  )
}