# Assets - Iconos de la Aplicación

## 📁 Coloca aquí los iconos para la aplicación

### Archivos necesarios:

1. **icon.ico** (Windows)
   - Tamaño recomendado: 256x256 o 512x512 píxeles
   - Formato: .ico
   - Usado para: Instalador, ejecutable, barra de tareas

2. **icon.png** (Electron)
   - Tamaño recomendado: 512x512 píxeles
   - Formato: .png
   - Usado para: Ventana de la aplicación

### 🎨 Cómo crear los iconos:

#### Opción 1: Usar un convertidor online
1. Ve a: https://www.icoconverter.com/
2. Sube tu imagen (logo de tu empresa)
3. Selecciona tamaño: 256x256 o 512x512
4. Descarga como .ico
5. Guarda también una copia como .png

#### Opción 2: Usar GIMP (gratuito)
1. Descarga GIMP: https://www.gimp.org/
2. Abre tu imagen
3. Escala a 512x512 píxeles
4. Exporta como PNG: `icon.png`
5. Exporta como ICO: `icon.ico`

### 📝 Ejemplos de nombres:
```
assets/
├── icon.ico       (REQUERIDO para Windows)
├── icon.png       (REQUERIDO para Electron)
```

### ⚠️ Importante:
- Sin estos archivos, el instalador usará el icono predeterminado de Electron
- Los nombres deben ser exactamente: `icon.ico` e `icon.png`
- Ambos archivos deben estar en esta carpeta `assets/`

### 🎯 Recomendaciones de diseño:
- Usa colores relacionados con tu marca
- Asegúrate de que el icono sea reconocible en tamaño pequeño (16x16)
- Evita detalles muy finos que no se vean bien
- Fondo transparente para el PNG
