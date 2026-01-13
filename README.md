# 🏗️ Procesador de Mecánica de Suelos para Tiendas KIOSKO

Script de automatización para procesar reportes de mecánica de suelos y extraer información geotécnica estructurada usando IA.

## 📋 Descripción

Este script recorre una estructura de carpetas organizada por **Año > Ciudad > Tienda**, extrae:
- **Coordenadas geográficas** de archivos `.kmz`
- **Información técnica** de reportes PDF de mecánica de suelos usando la API de OpenAI

## 📁 Estructura de Carpetas Esperada

```
info/
├── 2024/
│   ├── CULIACAN/
│   │   ├── 01) 42056 FELIX CASTRO/
│   │   │   ├── Felix Castro.kmz
│   │   │   └── MECANICA TIENDA KIOSKO FELIX CASTRO.pdf
│   │   ├── 02) 42045 LOS SABINOS/
│   │   │   ├── Los Sabinos.kmz
│   │   │   └── MECANICA TIENDA KIOSKO LOS SABINOS.pdf
│   │   └── ...
│   ├── MAZATLAN/
│   └── ...
└── 2025/
    └── ...
```

## 🚀 Instalación

### 1. Clonar o descargar el proyecto

Asegúrate de que el script `procesar_tiendas.py` esté en la misma carpeta que la carpeta `info/`.

### 2. Crear entorno virtual (recomendado)

```bash
python3 -m venv venv
source venv/bin/activate  # En macOS/Linux
# o
venv\Scripts\activate     # En Windows
```

### 3. Instalar dependencias

```bash
pip install -r requirements.txt
```

### 4. Configurar API Key

Edita el archivo `.env` y reemplaza `sk-tu-api-key-aqui` con tu API Key de OpenAI:

```env
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxx
```

> 💡 Obtén tu API Key en: https://platform.openai.com/api-keys

## ▶️ Uso

```bash
python procesar_tiendas.py
```

El script:
1. Recorrerá todas las carpetas dentro de `info/`
2. Extraerá coordenadas de cada archivo `.kmz`
3. Analizará cada PDF con GPT-4o para extraer información geotécnica
4. Generará archivos de salida con los resultados consolidados

## 📤 Archivos de Salida

| Archivo | Descripción |
|---------|-------------|
| `Consolidado_Tiendas.xlsx` | Excel con todos los datos tabulados |
| `Consolidado_Tiendas.csv` | CSV de respaldo |
| `Consolidado_Tiendas.json` | JSON con estructura completa |
| `Consolidado_Tiendas_errores.csv` | Log de tiendas con errores |
| `procesamiento_YYYYMMDD_HHMMSS.log` | Log detallado de ejecución |

## 📊 Datos Extraídos

### Del archivo KMZ:
- Latitud
- Longitud

### Del reporte PDF (vía IA):
- **Identificación**: Nombre de obra, ubicación, laboratorio, fecha
- **Exploración de campo**: Cantidad de sondeos, metodología, profundidad, NAF
- **Caracterización del suelo**: Tipo predominante, clasificación SUCS, consistencia
- **Propiedades índice**: Límite líquido, índice de plasticidad, contenido de agua
- **Análisis estructural**: Capacidad de carga admisible, zona sísmica
- **Recomendaciones**: Tipo de cimentación, profundidad de desplante, mejoramiento

## ⚠️ Consideraciones

### Costos de API
- Cada PDF consume tokens de la API de OpenAI
- El modelo `gpt-4o` tiene un costo aproximado de $2.50 por millón de tokens de entrada
- Un PDF típico puede consumir entre 5,000 y 50,000 tokens dependiendo de su tamaño

### Rate Limiting
- El script incluye delays automáticos entre llamadas
- Si recibes errores de rate limit, el script esperará y reintentará automáticamente

### Manejo de Errores
- Si un archivo falta o la API falla, el script continuará con la siguiente tienda
- Los errores se registran en el log y en el archivo de errores

## 🔧 Personalización

### Cambiar el modelo de IA

En `procesar_tiendas.py`, línea ~180:
```python
model="gpt-4o"  # Cambiar a "gpt-4-turbo" o "gpt-4o-mini" para menor costo
```

### Modificar el System Prompt

El prompt de extracción está definido en la constante `SYSTEM_PROMPT` al inicio del script. Puedes ajustarlo para extraer campos adicionales o modificar el comportamiento.

---

# 🗺️ Geo-Dashboard: Visualización Interactiva

Una aplicación web moderna para análisis geoespacial de la red de tiendas con enfoque en detección de errores de procesamiento.

## 🚀 Stack Tecnológico

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Framer Motion
- **Mapa:** Leaflet con clustering para optimización
- **Visualización:** Recharts
- **Backend:** FastAPI (Python) con Pandas

## 📦 Instalación del Dashboard

### Backend (FastAPI)

```bash
cd backend
pip install -r requirements.txt

# Procesar datos (con checkpoints)
python data_processor.py

# Iniciar API
python api.py
# o
uvicorn api:app --reload --port 8000
```

### Frontend (Next.js)

```bash
cd frontend
npm install
npm run dev
```

Abre http://localhost:3000 en tu navegador.

## 🎯 Características

### Procesamiento de Datos
- **Checkpoints automáticos:** Guarda progreso en `processing_state.json`
- **Guardado incremental:** Actualiza `Consolidado_Final_Procesado.xlsx` por ciudad
- **Logging completo:** Errores de coordenadas y tipos de datos en `process.log`
- **Validación de coordenadas:** Verifica que estén dentro de México

### Interfaz de Usuario
- **Estilo Glassmorphism:** Fondo `slate-950`, tarjetas con blur
- **Sidebar con filtros:**
  - Multi-select de años
  - Dropdown searchable de ciudades
  - Toggle "Solo tiendas con error"
- **Mapa interactivo:**
  - Pins azules (OK) y rojos (Error)
  - Clustering para optimización
  - Tooltips con información detallada
- **Panel de métricas:**
  - Gráfico de tasa de error por ciudad
  - Histórico de tienda al hacer clic

### API Endpoints

| Endpoint | Descripción |
|----------|-------------|
| `GET /api/stores` | Lista tiendas con filtros |
| `GET /api/stores/{id}/history` | Histórico de una tienda |
| `GET /api/metrics` | Métricas agregadas |
| `GET /api/cities` | Lista de ciudades |
| `GET /api/years` | Lista de años |
| `POST /api/process` | Ejecutar procesamiento |

### Parámetros de Filtrado

```
GET /api/stores?year=2024&year=2025&city=CULIACAN&errors_only=true
```

## 🔧 Configuración

### Variables de Entorno (Frontend)

Crear `.env.local` en `/frontend`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## 📝 Licencia

Uso interno - PT360 / Tiendas KIOSKO
