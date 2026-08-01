const GIST_FILENAME = 'biblioteca-mecatronica.json'
const GIST_DESCRIPTION = 'Biblioteca Digital Mecatrónica UNAM'

class GitHubService {
  constructor() {
    this.token = localStorage.getItem('github_token') || null
    this.gistId = localStorage.getItem('gist_id') || null
  }

  setToken(token) {
    this.token = token
    localStorage.setItem('github_token', token)
  }

  async getAuthenticatedUser() {
    if (!this.token) throw new Error('No token')
    
    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `token ${this.token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    })

    if (!response.ok) throw new Error('Token inválido')
    return await response.json()
  }

  async getOrCreateGist() {
    if (this.gistId) {
      try {
        return await this.getGist(this.gistId)
      } catch (e) {
        console.warn('Gist previo no accesible, creando uno nuevo...')
        this.gistId = null
      }
    }

    // Buscar gist existente por descripción
    try {
      const existingGist = await this.findGistByDescription()
      if (existingGist) {
        this.gistId = existingGist.id
        localStorage.setItem('gist_id', this.gistId)
        return existingGist
      }
    } catch (e) {
      console.warn('No se pudo buscar gists existentes, creando uno nuevo...')
    }

    // Crear gist nuevo
    return await this.createGist()
  }

  async findGistByDescription() {
    const response = await fetch('https://api.github.com/user/gists', {
      headers: {
        'Authorization': `token ${this.token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    })

    if (!response.ok) throw new Error('Error obteniendo gists')
    const gists = await response.json()
    
    return gists.find(g => g.description === GIST_DESCRIPTION)
  }

  async createGist() {
    const initialData = {
      metadata: {
        version: '1.0',
        lastUpdate: new Date().toISOString()
      },
      materias: this.getMaterias(),
      libros: []
    }

    const response = await fetch('https://api.github.com/user/gists', {
      method: 'POST',
      headers: {
        'Authorization': `token ${this.token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        description: GIST_DESCRIPTION,
        public: false,
        files: {
          [GIST_FILENAME]: {
            content: JSON.stringify(initialData, null, 2)
          }
        }
      })
    })

    if (!response.ok) throw new Error('Error creando gist')
    
    const gist = await response.json()
    this.gistId = gist.id
    localStorage.setItem('gist_id', this.gistId)
    
    return gist
  }

  async getGist(gistId) {
    const response = await fetch(`https://api.github.com/gists/${gistId}`, {
      headers: {
        'Authorization': `token ${this.token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    })

    if (!response.ok) throw new Error('Error obteniendo gist')
    return await response.json()
  }

  async getData() {
    const gist = await this.getOrCreateGist()
    const file = gist.files[GIST_FILENAME]
    
    if (!file) throw new Error('Archivo no encontrado en gist')
    
    return JSON.parse(file.content)
  }

  async updateData(data) {
    const response = await fetch(`https://api.github.com/gists/${this.gistId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `token ${this.token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        files: {
          [GIST_FILENAME]: {
            content: JSON.stringify({
              ...data,
              metadata: {
                ...data.metadata,
                lastUpdate: new Date().toISOString()
              }
            }, null, 2)
          }
        }
      })
    })

    if (!response.ok) throw new Error('Error actualizando gist')
    return await response.json()
  }

  getMaterias() {
    return [
      { id: 1, nombre: "Álgebra" },
      { id: 2, nombre: "Cálculo y Geometría Analítica" },
      { id: 3, nombre: "Redacción y Exposición de Temas de Ingeniería" },
      { id: 4, nombre: "Química" },
      { id: 5, nombre: "Fundamentos de Programación" },
      { id: 6, nombre: "Álgebra Lineal" },
      { id: 7, nombre: "Cálculo Integral" },
      { id: 8, nombre: "Física Experimental" },
      { id: 9, nombre: "Estática" },
      { id: 10, nombre: "Dibujo Mecánico e Industrial" },
      { id: 11, nombre: "Probabilidad" },
      { id: 12, nombre: "Cálculo Vectorial" },
      { id: 13, nombre: "Ecuaciones Diferenciales" },
      { id: 14, nombre: "Cinemática y Dinámica" },
      { id: 15, nombre: "Manufactura I" },
      { id: 16, nombre: "Cultura y Comunicación" },
      { id: 17, nombre: "Estadística" },
      { id: 18, nombre: "Matemáticas Avanzadas" },
      { id: 19, nombre: "Electricidad y Magnetismo" },
      { id: 20, nombre: "Análisis Numérico" },
      { id: 21, nombre: "Termodinámica" },
      { id: 22, nombre: "Taller Sociohumanístico" },
      { id: 23, nombre: "Análisis de Circuitos" },
      { id: 24, nombre: "Termofluidos" },
      { id: 25, nombre: "Ingeniería de Materiales" },
      { id: 26, nombre: "Mecánica de Sólidos" },
      { id: 27, nombre: "Técnicas de Programación" },
      { id: 28, nombre: "Electrónica Básica" },
      { id: 29, nombre: "Modelado de Sistemas Físicos" },
      { id: 30, nombre: "Ingeniería de Manufactura" },
      { id: 31, nombre: "Mecanismos" },
      { id: 32, nombre: "Temas Selectos de Programación I" },
      { id: 33, nombre: "Optativa Ciencias Sociales y Humanidades" },
      { id: 34, nombre: "Circuitos Digitales" },
      { id: 35, nombre: "Sistemas Electrónicos Lineales" },
      { id: 36, nombre: "Introducción a la Economía" },
      { id: 37, nombre: "Diseño de Elementos de Máquinas" },
      { id: 38, nombre: "Ingeniería Económica" },
      { id: 39, nombre: "Máquinas Eléctricas" },
      { id: 40, nombre: "Instrumentación" },
      { id: 41, nombre: "Control Automático" },
      { id: 42, nombre: "Asignatura Optativa" },
      { id: 43, nombre: "Desarrollo Empresarial" },
      { id: 44, nombre: "Optativa Ciencias Sociales y Humanidades" },
      { id: 45, nombre: "Diseño Mecatrónico" },
      { id: 46, nombre: "Automatización Industrial" },
      { id: 47, nombre: "Diseño y Manufactura Asistidos por Computadora" },
      { id: 48, nombre: "Robótica" },
      { id: 49, nombre: "Ética Profesional" },
      { id: 50, nombre: "Asignatura Optativa" },
      { id: 51, nombre: "Asignatura Optativa" },
      { id: 52, nombre: "Asignatura Optativa" },
      { id: 53, nombre: "Asignatura Optativa" },
      { id: 54, nombre: "Asignatura Optativa" },
      { id: 55, nombre: "Recursos y Necesidades de México" }
    ]
  }

  clearAuth() {
    this.token = null
    this.gistId = null
    localStorage.removeItem('github_token')
    localStorage.removeItem('gist_id')
  }
}

export default new GitHubService()