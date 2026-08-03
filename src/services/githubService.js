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
        'Authorization': `Bearer ${this.token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    })

    if (!response.ok) throw new Error('Token inválido')
    return await response.json()
  }

  async syncToGist(data) {
    if (!this.token) return
    if (!this.gistId) return

    try {
      const response = await fetch(`https://api.github.com/gists/${this.gistId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          files: {
            'biblioteca-mecatronica.json': {
              content: JSON.stringify(data, null, 2)
            }
          }
        })
      })

      if (response.ok) {
        console.log('✓ Sincronizado al Gist')
        return true
      }
    } catch (err) {
      console.warn('Sync fallido (offline ok):', err.message)
    }
    return false
  }

  async createGist(data) {
    if (!this.token) throw new Error('No token')

    console.log('🔄 Creando Gist...')

    const response = await fetch('https://api.github.com/user/gists', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        description: 'Biblioteca Digital Mecatrónica UNAM',
        public: false,
        files: {
          'biblioteca-mecatronica.json': {
            content: JSON.stringify(data, null, 2)
          }
        }
      })
    })

    console.log(`Respuesta del servidor: ${response.status}`)

    if (!response.ok) {
      const error = await response.text()
      console.error('Error creando Gist:', error)
      throw new Error(`Error ${response.status}: ${error}`)
    }

    const gist = await response.json()
    this.gistId = gist.id
    localStorage.setItem('gist_id', this.gistId)
    console.log('✓ Gist creado:', this.gistId)
    return gist
  }

  async downloadFromGist() {
    if (!this.gistId) throw new Error('No Gist ID')

    const response = await fetch(`https://api.github.com/gists/${this.gistId}`, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    })

    if (!response.ok) throw new Error('Error descargando Gist')

    const gist = await response.json()
    const file = gist.files['biblioteca-mecatronica.json']
    if (!file) throw new Error('Archivo no encontrado en Gist')

    return JSON.parse(file.content)
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