# Sistema de Inventario - Aplicación Electron

Sistema de gestión de inventario construido con Electron que utiliza Google Sheets como backend.

## 📋 Características

- ✅ Dashboard con gráficos financieros (Chart.js)
- ✅ Gestión de inventario en tiempo real
- ✅ Registro de productos con categorías
- ✅ Control de compras y ventas
- ✅ Resúmenes y reportes históricos
- ✅ Sincronización con Google Sheets

## 🚀 Instalación

### Requisitos Previos
- Node.js (v16 o superior)
- npm (incluido con Node.js)

### Pasos

1. **Navegar al directorio del proyecto**:
   ```bash
   cd "c:\Users\Desktop\Desktop\Nueva carpeta (2)"
   ```

2. **Instalar dependencias** (ya ejecutado):
   ```bash
   npm install
   ```

## 🎯 Uso

### Ejecutar en modo desarrollo

Para iniciar la aplicación en modo desarrollo:

```bash
npm start
```

Esto abrirá la aplicación Electron con tu sistema de inventario.

### Crear ejecutable para Windows

Para generar un instalador `.exe`:

```bash
npm run build
```

El instalador se generará en la carpeta `dist/` con el nombre:
```
dist/Sistema de Inventario Setup.exe
```

## 📁 Estructura del Proyecto

```
Nueva carpeta (2)/
├── main.js              # Proceso principal de Electron
├── preload.js          # Script de precarga (seguridad)
├── package.json        # Configuración del proyecto
├── index.html          # Interfaz principal
├── script.js           # Lógica de la aplicación
├── estilo.css         # Estilos CSS
├── sg.js              # Scripts adicionales
├── node_modules/      # Dependencias (generado)
└── dist/              # Ejecutables compilados (generado)
```

## 🔧 Configuración

### Google Sheets API

La aplicación se conecta a Google Sheets a través de la URL configurada en `script.js`:

```javascript
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw.../exec';
```

Asegúrate de que esta URL esté correctamente configurada antes de ejecutar la aplicación.

## 🛠️ Desarrollo

### Activar DevTools

Para habilitar las herramientas de desarrollo de Chrome, descomenta esta línea en `main.js`:

```javascript
// mainWindow.webContents.openDevTools();
```

### Personalización

- **Icono de la aplicación**: Coloca tu icono en `build/icon.ico` (Windows) o `build/icon.png`
- **Dimensiones de ventana**: Modifica en `main.js` las propiedades `width` y `height`
- **Color de fondo**: Cambia `backgroundColor` en `main.js`

## 📦 Distribución

Después de ejecutar `npm run build`, encontrarás:

- **Instalador NSIS**: `dist/Sistema de Inventario Setup.exe`
- **Archivos desempaquetados**: `dist/win-unpacked/`

El instalador incluye:
- ✅ Opción de instalación personalizada
- ✅ Acceso directo en el escritorio
- ✅ Acceso directo en el menú inicio
- ✅ Desinstalador automático

## ⚠️ Notas Importantes

- La aplicación requiere **conexión a internet** para comunicarse con Google Sheets
- Los CDN externos (Font Awesome, Chart.js) requieren conectividad
- Se recomienda ejecutar `npm audit fix` para resolver vulnerabilidades menores

## 🐛 Solución de Problemas

### La aplicación no inicia
1. Verifica que Node.js esté instalado: `node --version`
2. Reinstala dependencias: `npm install`
3. Revisa la consola de errores

### Error de conexión con Google Sheets
1. Verifica la URL del script en `script.js`
2. Confirma que tienes conexión a internet
3. Asegúrate de que el script de Google Apps esté publicado

### El build falla
1. Asegúrate de tener permisos de escritura en la carpeta
2. Cierra la aplicación si está ejecutándose
3. Limpia y vuelve a intentar: `npm run build`

## 📝 Licencia

MIT

## 👨‍💻 Autor

Sistema de Inventario - 2026
