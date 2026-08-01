# 📚 Biblioteca Mecatrónica

Web app moderna para gestionar tu biblioteca digital de libros por materia.

**Stack:** React + Vite + Tailwind + GitHub Gist API + Netlify

---

## ✨ Características

✅ **Interfaz bonita y responsiva** — Diseño limpio tipo dashboard  
✅ **Agregar/Editar/Eliminar libros** — Modal completo con validaciones  
✅ **Búsqueda y filtro** — Por título, autor, ID o materia  
✅ **Sincronización automática** — GitHub Gist como backend  
✅ **Estadísticas** — Total libros, materias cubiertas, promedio  
✅ **Notas por libro** — Anotaciones opcionales  
✅ **Links directos a Drive** — Abre PDFs con un clic  
✅ **Autenticación con token** — Solo tú accedes con tu token  

---

## 🚀 Setup Inicial

### 1. Clonar el repo

```bash
git clone https://github.com/TU_USUARIO/biblioteca-mecatronica.git
cd biblioteca-mecatronica
npm install
```

### 2. Crear Personal Access Token en GitHub

1. Ve a [GitHub Settings → Tokens](https://github.com/settings/tokens)
2. Click en "Generate new token (classic)"
3. Dale un nombre (ej: "biblioteca-app")
4. Selecciona scopes: `gist`
5. Genera y **copia el token** (lo usarás en la app)

### 3. Ejecutar localmente

```bash
npm run dev
```

Abre `http://localhost:3000` en tu navegador.

### 4. Primera vez

1. Pega tu token en la pantalla de login
2. La app crea automáticamente un Gist privado
3. ¡Listo! Ya puedes empezar a agregar libros

---

## 📝 Cómo usar

### Agregar un libro

1. Click en botón "Agregar Libro"
2. Completa:
   - **ID** (único, ej: 01, 02, 03)
   - **Título** (nombre del libro)
   - **Autor**
   - **Año**
   - **Materias** (selecciona 1 o más)
   - **Link Drive** (opcional)
   - **Notas** (opcional)
3. Click "Agregar libro"

### Editar un libro

1. Hover sobre el libro
2. Click en icono de lápiz
3. Haz cambios
4. Click "Guardar cambios"

### Eliminar un libro

1. Hover sobre el libro
2. Click en icono de tacho
3. Confirma

### Buscar/Filtrar

- **Buscador**: Busca por título, autor, ID o notas
- **Filtro materia**: Ver solo libros de una materia específica

---

## 🔧 Desplegar en Netlify

### Opción A: GitHub + Netlify (automático)

1. Sube el repo a GitHub
2. Ve a [Netlify](https://netlify.com)
3. "New site from Git"
4. Selecciona tu repo
5. Deja los defaults (build: `npm run build`, output: `dist`)
6. Deploy
7. ¡Listo! Tu app está en vivo

### Opción B: Manual

```bash
npm run build
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

---

## 📊 Estructura del Gist

Tu app almacena los datos así en GitHub Gist:

```json
{
  "metadata": {
    "version": "1.0",
    "lastUpdate": "2026-07-31T12:00:00Z"
  },
  "materias": [
    {"id": 1, "nombre": "Álgebra"},
    {"id": 2, "nombre": "Cálculo y Geometría Analítica"},
    ...
  ],
  "libros": [
    {
      "id": "01",
      "titulo": "Calculus",
      "autor": "Stewart",
      "año": 2012,
      "url_drive": "https://drive.google.com/file/d/XXXXX/view",
      "materias": [1, 2, 7, 12],
      "notas": "Excelente para límites"
    },
    ...
  ]
}
```

---

## 🔒 Seguridad

- ✅ Tu token se guarda **localmente** en `localStorage`
- ✅ No se envía a ningún servidor (excepto GitHub)
- ✅ El Gist es **privado** (solo visible con tu token)
- ✅ Puedes revocar el token en GitHub en cualquier momento

---

## 🐛 Troubleshooting

### "Token inválido"

- Verifica que el token tenga permisos de `gist`
- Revoca y genera uno nuevo

### No sincroniza

- Verifica conexión a internet
- Revisa que el token siga siendo válido

### Quiero cambiar de token

- Abre DevTools (F12)
- En Console: `localStorage.clear()`
- Recarga la página
- Ingresa el nuevo token

### Borrar todo

```js
// En DevTools Console:
localStorage.clear()
// Luego recarga
```

---

## 📈 Próximas mejoras

- [ ] Exportar/Importar CSV
- [ ] Tags por tema (no solo materia)
- [ ] Historial de cambios
- [ ] Sincronización automática en tiempo real
- [ ] Dark mode
- [ ] Compartir biblioteca (read-only)

---

## 🤝 Contribuir

Este es un proyecto personal, pero siéntete libre de hacer fork y adaptarlo.

---

## 📄 Licencia

MIT

---

**Hecho con ❤️ por Ku**
