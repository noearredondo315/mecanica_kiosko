#!/usr/bin/env python3
"""
Script de Automatización para Procesamiento de Datos de Tiendas
Extrae coordenadas de archivos KMZ y analiza reportes de mecánica de suelos con IA.
"""

import os
import re
import json
import zipfile
import logging
import base64
import time
from pathlib import Path
from datetime import datetime
import xml.etree.ElementTree as ET

import pandas as pd
from tqdm import tqdm
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn, TaskProgressColumn
from rich.live import Live
from rich import print as rprint
from dotenv import load_dotenv
from openai import OpenAI, RateLimitError, APIError
from pypdf import PdfReader

# =============================================================================
# CONFIGURACIÓN DE LOGGING
# =============================================================================
log_filename = f"procesamiento_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_filename, encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# =============================================================================
# CARGAR VARIABLES DE ENTORNO
# =============================================================================
load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

if not OPENAI_API_KEY:
    logger.error("No se encontró OPENAI_API_KEY en el archivo .env")
    raise ValueError("Configura tu API Key en el archivo .env")

client = OpenAI(api_key=OPENAI_API_KEY)

# =============================================================================
# CONSTANTES DE COSTOS (GPT-5.2)
# Precios según platform.openai.com/docs/pricing
# =============================================================================
COSTO_INPUT_1M = 1.75   # USD
COSTO_OUTPUT_1M = 14.00 # USD

console = Console()

# =============================================================================
# SYSTEM PROMPT PARA EXTRACCIÓN GEOTÉCNICA
# =============================================================================
SYSTEM_PROMPT = """
### Prompt Maestro: Extractor de Inteligencia Geotécnica

**Role:** Eres un Ingeniero Geotécnico Senior con 20 años de experiencia en interpretación de informes de mecánica de suelos. Tu objetivo es procesar reportes heterogéneos (de distintos laboratorios y zonas) y normalizar la información en un esquema de datos estructurado.

**Contexto de Entrada:**
Analizarás documentos que pueden variar en formato y terminología. Debes identificar conceptos equivalentes (ej. "Nivel de Aguas Freáticas", "NAF", "Nivel Freático") y consolidarlos.

**PROBLEMA CRÍTICO A EVITAR:**
Los reportes de mecánica de suelos típicamente presentan MÚLTIPLES alternativas de cimentación, cada una con su propia capacidad de carga admisible. Por ejemplo:
- Sección "9.2.1) Capacidad de Carga para Zapata Aislada y Corrida" → Q adm = 14.2 ton/m²
- Sección "9.2.2) Capacidad de Carga para Losa de Cimentación" → Q adm = 27.5 ton/m²

**NUNCA** mezcles estos valores. Cada tipo de cimentación tiene su propio valor de capacidad de carga. Debes capturar TODAS las alternativas analizadas en el reporte.

**Instrucciones de Extracción (Prioridad Alta):**
Extrae la información y devuélvela estrictamente en formato JSON. Si un dato no existe, usa `null`. No inventes valores.

#### Esquema de Salida Requerido:

```json
{
  "identificacion_proyecto": {
    "nombre_obra": "Nombre del proyecto o tienda",
    "ubicacion_detallada": "Dirección completa mencionada",
    "coordenadas": {
      "lat_long": "Si aparecen en formato decimal o grados",
      "utm": "Si aparecen (ej. 13 Q 512787...)"
    },
    "laboratorio": "Nombre de la empresa que firma el reporte",
    "fecha_reporte": "YYYY-MM-DD"
  },
  "exploracion_campo": {
    "cantidad_sondeos": "Número total de pozos/perforaciones",
    "metodologia": "Ej: SPT (Penetración Estándar), Pozo a Cielo Abierto, etc.",
    "profundidad_maxima_explorada_m": "Valor numérico en metros",
    "presencia_naf": "Booleano (true/false)",
    "profundidad_naf_m": "Profundidad del agua si se encontró (valor numérico)"
  },
  "caracterizacion_suelo": {
    "tipo_suelo_predominante": "Descripción breve (ej. Limo de alta plasticidad)",
    "clasificacion_sucs": "Código SUCS (ej. MH, ML, CL, GP)",
    "consistencia_densidad": "Cualitativo (ej. Blanda, Firme, Dura, Media)",
    "propiedades_indice": {
      "limite_liquido_ll": "Valor numérico %",
      "indice_plasticidad_ip": "Valor numérico %",
      "contenido_agua_promedio": "Valor numérico %"
    }
  },
  "alternativas_cimentacion_analizadas": [
    {
      "tipo_cimentacion": "Zapata Aislada / Zapata Corrida / Losa / Pilotes / Otro",
      "capacidad_carga_admisible_ton_m2": "Valor numérico (Q adm)",
      "profundidad_desplante_m": "Valor numérico (Df)",
      "ancho_cimentacion_m": "Valor numérico (B) si aplica",
      "condiciones_calculo": "Resumen de parámetros usados (cohesión, ángulo fricción, etc.)",
      "requiere_mejoramiento": "Booleano",
      "descripcion_mejoramiento": "Si requiere mejoramiento, describir capas y espesores"
    }
  ],
  "cimentacion_recomendada": {
    "tipo": "El tipo específico que el laboratorio RECOMIENDA usar",
    "capacidad_carga_admisible_ton_m2": "El Q adm correspondiente a ESTE tipo recomendado",
    "profundidad_desplante_m": "Valor numérico sugerido para la opción recomendada",
    "justificacion": "Por qué se recomienda esta opción sobre las otras",
    "requiere_mejoramiento": "Booleano",
    "descripcion_mejoramiento": "Detalle de capas necesarias (ej. pedraplén 0.60m, suelo-cemento, compactación al 95%)"
  },
  "analisis_sismico": {
    "zona_sismica": "Categoría según CFE o norma local (ej. Zona B, Zona D)",
    "coeficiente_sismico": "Valor si se menciona",
    "clasificacion_sitio": "Tipo I, II, III según norma aplicable"
  },
  "observaciones_criticas": "Alertas especiales: riesgo de colapso, escurrimientos, necesidad de bombeo, restricciones por lluvia, asentamientos esperados, etc."
}
```

**Reglas de Robustez:**

1. **CAPTURA TODAS LAS ALTERNATIVAS:** Si el reporte analiza múltiples tipos de cimentación (zapatas, losas, pilotes), extrae CADA UNA con su respectiva capacidad de carga en el array `alternativas_cimentacion_analizadas`.

2. **ASOCIA CORRECTAMENTE LOS VALORES:** La capacidad de carga en `cimentacion_recomendada` DEBE corresponder al tipo de cimentación recomendado. Si recomiendan Losa, usa el Q adm de Losa, NO el de Zapata.

3. **Normalización de Unidades:** Convierte todas las capacidades de carga a ton/m² y profundidades a metros (m).

4. **Detección de "Mejoramiento":** Si mencionan capas de "material de banco", "Sub-Base", "Suelo-Cemento", "Pedraplén", "Filtros" o compactación especial, márcalo como `requiere_mejoramiento: true` y describe los detalles.

5. **Factor de Seguridad:** Si el reporte menciona que el Q adm ya incluye un Factor de Seguridad (FS), no lo modifiques. Solo reporta el valor final admisible.

6. **Múltiples Sondeos:** Si hay varios sondeos con datos distintos, extrae valores representativos o el más conservador (desfavorable).

7. **Validación NAF:** Si el reporte menciona "No se encontró NAF" o "No se detectó nivel freático", `presencia_naf` debe ser `false`, NO `null`.

8. **Identificación de Secciones:** Los valores de capacidad de carga suelen estar en secciones como:
   - "Capacidad de Carga Admisible"
   - "Análisis de Capacidad de Carga"
   - "Cálculo de Q admisible"
   - Subsecciones numeradas (9.2.1, 9.2.2, etc.) para cada tipo de cimentación

Responde ÚNICAMENTE con el JSON válido, sin texto adicional ni explicaciones.
"""

# =============================================================================
# CLASE PRINCIPAL: TiendaProcessor
# =============================================================================
class TiendaProcessor:
    """Procesa la estructura de carpetas de tiendas y extrae información geotécnica."""
    
    def __init__(self, root_path: str, output_filename: str = "Consolidado_Tiendas"):
        self.root_path = Path(root_path)
        self.output_filename = output_filename
        self.json_path = Path(f"{self.output_filename}.json")
        self.excel_path = Path(f"{self.output_filename}.xlsx")
        
        # Cargar resultados previos si existen (Checkpointing)
        self.resultados = self._cargar_checkpoint()
        
        # Usar la ruta relativa de la carpeta como identificador único para evitar colisiones de IDs genéricos (01, 02, etc.)
        self.tiendas_procesadas_paths = set()
        for r in self.resultados:
            # Intentar obtener la ruta desde los metadatos guardados
            pdf_path = r.get("Archivo_PDF")
            kmz_path = r.get("Archivo_KMZ")
            path_str = None
            
            if pdf_path:
                path_str = str(Path(pdf_path).parent)
            elif kmz_path:
                path_str = str(Path(kmz_path).parent)
            
            if path_str:
                # Normalizar a ruta relativa desde root_path si es posible
                try:
                    rel_path = str(Path(path_str).relative_to(self.root_path.parent))
                    self.tiendas_procesadas_paths.add(rel_path)
                except ValueError:
                    self.tiendas_procesadas_paths.add(path_str)
        
        self.errores = []
        
        # Estadísticas de uso
        self.total_input_tokens = 0
        self.total_output_tokens = 0
        self.total_cost = 0.0
        self.start_time = None

    def _cargar_checkpoint(self) -> list:
        """Carga resultados previos desde el archivo JSON si existe."""
        if self.json_path.exists():
            try:
                with open(self.json_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    if isinstance(data, list):
                        logger.info(f"Checkpoint cargado: {len(data)} tiendas recuperadas.")
                        return data
            except Exception as e:
                logger.warning(f"No se pudo cargar el checkpoint: {e}")
        return []
        
    def extraer_coordenadas_kmz(self, kmz_path: Path) -> tuple:
        """
        Extrae latitud y longitud de un archivo KMZ con lógica refinada.
        
        Args:
            kmz_path: Ruta al archivo .kmz
            
        Returns:
            Tupla (latitud, longitud) o (None, None) si falla
        """
        try:
            with zipfile.ZipFile(kmz_path, 'r') as z:
                # Buscar archivos KML (insensible a mayúsculas/minúsculas)
                kml_files = [f for f in z.namelist() if f.lower().endswith('.kml')]
                if not kml_files:
                    logger.warning(f"No se encontró archivo KML dentro de {kmz_path}")
                    return None, None
                
                # Procesar el primer KML (usualmente doc.kml)
                with z.open(kml_files[0]) as f:
                    content = f.read()
                    root = ET.fromstring(content)
                    
                    # Extraer namespace del root dinámicamente
                    ns = ""
                    if root.tag.startswith("{"):
                        ns = root.tag.split("}")[0] + "}"
                    
                    # Buscar coordenadas de forma recursiva (todas las posibilidades)
                    all_coords = root.findall(f".//{ns}coordinates")
                    if not all_coords:
                        all_coords = root.findall(".//coordinates")
                    
                    if all_coords:
                        for coord_elem in all_coords:
                            if coord_elem.text and coord_elem.text.strip():
                                coords_text = coord_elem.text.strip()
                                # Tomar el primer punto (KML puede tener varios separados por espacio)
                                first_point = coords_text.split()[0]
                                parts = first_point.split(',')
                                
                                if len(parts) >= 2:
                                    try:
                                        lon = float(parts[0].strip())
                                        lat = float(parts[1].strip())
                                        logger.info(f"Coordenadas extraídas de {kmz_path.name}: lat={lat}, lon={lon}")
                                        return lat, lon
                                    except ValueError:
                                        continue
                    
                    logger.warning(f"No se encontraron coordenadas válidas en {kmz_path.name}")
                    return None, None
                    
        except zipfile.BadZipFile:
            logger.error(f"Archivo KMZ corrupto o inválido: {kmz_path}")
        except ET.ParseError as e:
            logger.error(f"Error parseando KML en {kmz_path}: {e}")
        except Exception as e:
            logger.error(f"Error inesperado procesando KMZ {kmz_path}: {e}")
        
        return None, None
    
    def analizar_pdf_con_ia(self, pdf_path: Path, max_retries: int = 3) -> dict:
        """
        Envía el PDF a la API de OpenAI para análisis geotécnico usando base64.
        Para archivos muy grandes (>30MB), extrae el texto como fallback.
        
        Args:
            pdf_path: Ruta al archivo PDF
            max_retries: Número máximo de reintentos en caso de error
            
        Returns:
            Diccionario con la información extraída
        """
        resultado_vacio = {
            "identificacion_proyecto": None,
            "exploracion_campo": None,
            "caracterizacion_suelo": None,
            "analisis_estructural": None,
            "recomendaciones_cimentacion": None,
            "observaciones_criticas": None,
            "error": None
        }
        
        file_size_mb = pdf_path.stat().st_size / (1024 * 1024)
        use_text_fallback = file_size_mb > 30  # Margen de seguridad

        for intento in range(max_retries):
            try:
                if use_text_fallback:
                    logger.info(f"Archivo grande ({file_size_mb:.1f}MB). Extrayendo texto como fallback...")
                    reader = PdfReader(pdf_path)
                    text_content = ""
                    for i, page in enumerate(reader.pages[:50]):
                        text_content += f"--- PÁGINA {i+1} ---\n{page.extract_text()}\n"
                    
                    user_content = [
                        {
                            "type": "text",
                            "text": f"A continuación presento el texto extraído de un reporte de mecánica de suelos:\n\n{text_content}"
                        },
                        {
                            "type": "text",
                            "text": "Analiza este reporte y extrae toda la información según el esquema JSON especificado."
                        }
                    ]
                else:
                    # Método base64 según documentación de OpenAI
                    logger.info(f"Codificando PDF en base64: {pdf_path.name} (intento {intento + 1})")
                    with open(pdf_path, "rb") as f:
                        pdf_data = f.read()
                    base64_string = base64.b64encode(pdf_data).decode("utf-8")
                    
                    user_content = [
                        {
                            "type": "file",
                            "file": {
                                "filename": pdf_path.name,
                                "file_data": f"data:application/pdf;base64,{base64_string}"
                            }
                        },
                        {
                            "type": "text",
                            "text": "Analiza este reporte de mecánica de suelos y extrae toda la información según el esquema JSON especificado."
                        }
                    ]

                # Realizar la consulta con GPT-5.2
                response = client.chat.completions.create(
                    model="gpt-5.2",
                    messages=[
                        {
                            "role": "system",
                            "content": SYSTEM_PROMPT
                        },
                        {
                            "role": "user",
                            "content": user_content
                        }
                    ],
                    response_format={"type": "json_object"},
                    temperature=0.1,
                    max_completion_tokens=4000
                )
                
                # Parsear respuesta JSON e incluir métricas
                content = response.choices[0].message.content
                usage = response.usage
                
                # Actualizar contadores globales
                self.total_input_tokens += usage.prompt_tokens
                self.total_output_tokens += usage.completion_tokens
                
                costo_llamada = (usage.prompt_tokens * COSTO_INPUT_1M / 1_000_000) + \
                                (usage.completion_tokens * COSTO_OUTPUT_1M / 1_000_000)
                self.total_cost += costo_llamada

                resultado = json.loads(content)
                resultado["_usage"] = {
                    "prompt_tokens": usage.prompt_tokens,
                    "completion_tokens": usage.completion_tokens,
                    "cost_usd": costo_llamada,
                    "model": "gpt-5.2"
                }
                
                logger.info(f"Análisis completado para {pdf_path.name} | Tokens: {usage.total_tokens} | Costo: ${costo_llamada:.4f}")
                return resultado
                
            except RateLimitError as e:
                wait_time = (intento + 1) * 30
                logger.warning(f"Rate limit alcanzado. Esperando {wait_time}s antes de reintentar...")
                time.sleep(wait_time)
                
            except APIError as e:
                logger.error(f"Error de API OpenAI: {e}")
                if intento < max_retries - 1:
                    time.sleep(5)
                else:
                    resultado_vacio["error"] = str(e)
                    return resultado_vacio
                    
            except json.JSONDecodeError as e:
                logger.error(f"Respuesta no es JSON válido: {e}")
                logger.debug(f"Contenido de la respuesta: {content}")
                # Si el contenido está vacío o no es JSON, intentamos un último recurso:
                # Pedirle a la IA que solo devuelva el JSON si es que hubo texto previo
                if content and "{" in content:
                    try:
                        # Intentar limpiar la respuesta si tiene markdown
                        clean_content = re.search(r'(\{.*\})', content, re.DOTALL)
                        if clean_content:
                            resultado = json.loads(clean_content.group(1))
                            resultado["_usage"] = {
                                "prompt_tokens": usage.prompt_tokens,
                                "completion_tokens": usage.completion_tokens,
                                "cost_usd": costo_llamada,
                                "model": "gpt-5.2"
                            }
                            return resultado
                    except:
                        pass
                
                resultado_vacio["error"] = f"Respuesta inválida de la IA (JSON Error). Raw: {content[:100]}..."
                return resultado_vacio
                
            except Exception as e:
                logger.error(f"Error inesperado analizando PDF {pdf_path}: {e}")
                resultado_vacio["error"] = str(e)
                return resultado_vacio
        
        resultado_vacio["error"] = "Máximo de reintentos alcanzado"
        return resultado_vacio
    
    def parsear_nombre_tienda(self, nombre_carpeta: str) -> tuple:
        """
        Extrae ID y nombre de tienda del nombre de carpeta.
        Formato esperado: "01) 42056 FELIX CASTRO"
        
        Returns:
            Tupla (id_tienda, nombre_tienda)
        """
        # Patrón: número) ID_NUMERICO NOMBRE
        match = re.match(r'^\d+\)\s*(\d+)\s+(.+)$', nombre_carpeta)
        if match:
            return match.group(1), match.group(2).strip()
        
        # Fallback: intentar extraer cualquier número como ID
        numeros = re.findall(r'\d+', nombre_carpeta)
        if len(numeros) >= 2:
            return numeros[1], nombre_carpeta
        elif len(numeros) == 1:
            return numeros[0], nombre_carpeta
        
        return "N/A", nombre_carpeta
    
    def procesar(self):
        """Recorre la estructura de carpetas y procesa cada tienda con feedback visual."""
        self.start_time = time.time()
        
        if not self.root_path.exists():
            console.print(f"[bold red]Error:[/bold red] La ruta no existe: {self.root_path}")
            return

        # 1. Escaneo inicial para contar tiendas
        tiendas_a_procesar = []
        for anio_dir in sorted(self.root_path.iterdir()):
            if not anio_dir.is_dir(): continue
            for ciudad_dir in sorted(anio_dir.iterdir()):
                if not ciudad_dir.is_dir(): continue
                for tienda_dir in sorted(ciudad_dir.iterdir()):
                    if not tienda_dir.is_dir(): continue
                    tiendas_a_procesar.append({
                        "path": tienda_dir,
                        "anio": anio_dir.name,
                        "ciudad": ciudad_dir.name
                    })

        total_tiendas = len(tiendas_a_procesar)
        
        console.print(Panel.fit(
            f"[bold blue]Mecánica KIOSKO - Procesador Inteligente[/bold blue]\n"
            f"Se encontraron [bold green]{total_tiendas}[/bold green] tiendas para procesar.",
            border_style="blue"
        ))

        # 2. Bucle principal con barra de progreso
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            BarColumn(),
            TaskProgressColumn(),
            TextColumn("({task.completed}/{task.total})"),
            console=console
        ) as progress:
            
            main_task = progress.add_task("[cyan]Procesando tiendas...", total=total_tiendas)
            
            for item in tiendas_a_procesar:
                tienda_dir = item["path"]
                anio = item["anio"]
                ciudad = item["ciudad"]
                nombre_carpeta = tienda_dir.name
                
                id_tienda, nombre_tienda = self.parsear_nombre_tienda(nombre_carpeta)
                
                # Identificador único basado en la ruta relativa
                rel_path = str(tienda_dir.relative_to(self.root_path.parent))

                # Verificar si ya fue procesada (Checkpoint basado en ruta única)
                if rel_path in self.tiendas_procesadas_paths:
                    progress.advance(main_task)
                    continue

                progress.update(main_task, description=f"[cyan]Tienda: [bold]{nombre_carpeta}[/bold]")
                
                # Buscar archivos
                kmz_files = list(tienda_dir.glob("*.kmz")) + list(tienda_dir.glob("*.KMZ"))
                pdf_files = list(tienda_dir.glob("*.pdf")) + list(tienda_dir.glob("*.PDF"))
                
                kmz_file = kmz_files[0] if kmz_files else None
                pdf_file = pdf_files[0] if pdf_files else None
                
                # Extraer coordenadas
                lat, lon = (None, None)
                if kmz_file:
                    lat, lon = self.extraer_coordenadas_kmz(kmz_file)
                else:
                    self.errores.append({"tienda": nombre_carpeta, "error": "KMZ faltante"})
                
                # Analizar PDF con IA
                ia_data = {}
                if pdf_file:
                    ia_data = self.analizar_pdf_con_ia(pdf_file)
                    time.sleep(1) # Pequeña pausa
                else:
                    ia_data = {"error": "PDF no encontrado"}
                    self.errores.append({"tienda": nombre_carpeta, "error": "PDF faltante"})
                
                # Mostrar resumen de la tienda en consola de forma estructurada
                self._imprimir_resumen_tienda(nombre_tienda, lat, lon, ia_data)
                
                # Consolidar resultado
                resultado = self._construir_resultado(
                    anio, ciudad, id_tienda, nombre_tienda,
                    lat, lon, ia_data, kmz_file, pdf_file
                )
                self.resultados.append(resultado)
                self.tiendas_procesadas_paths.add(rel_path)
                
                # Guardado incremental
                self._guardar_resultados()
                
                progress.advance(main_task)

        self._mostrar_resumen_final()
        self._guardar_resultados()

    def _imprimir_resumen_tienda(self, nombre, lat, lon, ia_data):
        """Muestra una tabla compacta con el resultado de la tienda actual."""
        table = Table(show_header=False, box=None, padding=(0, 2))
        table.add_column("Key", style="dim")
        table.add_column("Value")
        
        status_kmz = f"[green]OK ({lat}, {lon})[/green]" if lat else "[red]Error/Faltante[/red]"
        
        usage = ia_data.get("_usage", {})
        tokens = usage.get("total_tokens", usage.get("prompt_tokens", 0) + usage.get("completion_tokens", 0))
        cost = usage.get("cost_usd", 0)
        
        status_ia = "[green]Completado[/green]" if not ia_data.get("error") else f"[red]Falló: {ia_data.get('error')}[/red]"
        
        table.add_row("KMZ Coords:", status_kmz)
        table.add_row("Análisis IA:", status_ia)
        if tokens:
            table.add_row("Consumo:", f"{tokens} tokens (${cost:.4f})")
        
        rprint(Panel(table, title=f"[bold]{nombre}[/bold]", border_style="gray30", expand=False))

    def _mostrar_resumen_final(self):
        """Muestra estadísticas finales de ejecución."""
        total_time = time.time() - self.start_time
        
        summary_table = Table(title="[bold blue]Resumen de Ejecución[/bold blue]", show_header=True)
        summary_table.add_column("Métrica", style="cyan")
        summary_table.add_column("Valor", style="magenta")
        
        summary_table.add_row("Tiendas procesadas", str(len(self.resultados)))
        summary_table.add_row("Errores detectados", str(len(self.errores)))
        summary_table.add_row("Tiempo total", f"{total_time:.2f} segundos")
        summary_table.add_row("Total Input Tokens", f"{self.total_input_tokens:,}")
        summary_table.add_row("Total Output Tokens", f"{self.total_output_tokens:,}")
        summary_table.add_row("Costo Total Estimado", f"[bold green]${self.total_cost:.4f} USD[/bold green]")
        
        console.print("\n")
        console.print(summary_table)
        console.print("\n")
    
    def _construir_resultado(self, anio, ciudad, id_tienda, nombre_tienda,
                             lat, lon, ia_data, kmz_file, pdf_file) -> dict:
        """Construye el diccionario de resultado para una tienda."""
        
        # Extraer datos anidados de forma segura
        identificacion = ia_data.get("identificacion_proyecto") or {}
        exploracion = ia_data.get("exploracion_campo") or {}
        caracterizacion = ia_data.get("caracterizacion_suelo") or {}
        propiedades = caracterizacion.get("propiedades_indice") or {}
        
        # Nuevo esquema: alternativas y cimentación recomendada
        alternativas = ia_data.get("alternativas_cimentacion_analizadas") or []
        cim_recomendada = ia_data.get("cimentacion_recomendada") or {}
        analisis_sismico = ia_data.get("analisis_sismico") or {}
        
        # Serializar alternativas como JSON string para el Excel
        alternativas_json = json.dumps(alternativas, ensure_ascii=False) if alternativas else None
        
        return {
            # Datos de ubicación (de la estructura de carpetas)
            "Año": anio,
            "Ciudad": ciudad,
            "ID_Tienda": id_tienda,
            "Nombre_Tienda": nombre_tienda,
            
            # Coordenadas del KMZ
            "Latitud_KMZ": lat,
            "Longitud_KMZ": lon,
            
            # Identificación del proyecto (del PDF)
            "Nombre_Obra_PDF": identificacion.get("nombre_obra"),
            "Ubicacion_Detallada": identificacion.get("ubicacion_detallada"),
            "Laboratorio": identificacion.get("laboratorio"),
            "Fecha_Reporte": identificacion.get("fecha_reporte"),
            
            # Exploración de campo
            "Cantidad_Sondeos": exploracion.get("cantidad_sondeos"),
            "Metodologia": exploracion.get("metodologia"),
            "Profundidad_Max_Explorada_m": exploracion.get("profundidad_maxima_explorada_m"),
            "Presencia_NAF": exploracion.get("presencia_naf"),
            "Profundidad_NAF_m": exploracion.get("profundidad_naf_m"),
            
            # Caracterización del suelo
            "Tipo_Suelo_Predominante": caracterizacion.get("tipo_suelo_predominante"),
            "Clasificacion_SUCS": caracterizacion.get("clasificacion_sucs"),
            "Consistencia_Densidad": caracterizacion.get("consistencia_densidad"),
            "Limite_Liquido_LL": propiedades.get("limite_liquido_ll"),
            "Indice_Plasticidad_IP": propiedades.get("indice_plasticidad_ip"),
            "Contenido_Agua_Promedio": propiedades.get("contenido_agua_promedio"),
            
            # Todas las alternativas analizadas (JSON serializado)
            "Alternativas_Cimentacion_JSON": alternativas_json,
            
            # Cimentación RECOMENDADA (con su Q adm correcto)
            "Tipo_Cimentacion_Recomendado": cim_recomendada.get("tipo"),
            "Qadm_Recomendado_ton_m2": cim_recomendada.get("capacidad_carga_admisible_ton_m2"),
            "Profundidad_Desplante_m": cim_recomendada.get("profundidad_desplante_m"),
            "Justificacion_Recomendacion": cim_recomendada.get("justificacion"),
            "Mejoramiento_Requerido": cim_recomendada.get("requiere_mejoramiento"),
            "Detalles_Mejoramiento": cim_recomendada.get("descripcion_mejoramiento"),
            
            # Análisis sísmico
            "Zona_Sismica": analisis_sismico.get("zona_sismica"),
            "Coeficiente_Sismico": analisis_sismico.get("coeficiente_sismico"),
            "Clasificacion_Sitio": analisis_sismico.get("clasificacion_sitio"),
            
            # Observaciones
            "Observaciones_Criticas": ia_data.get("observaciones_criticas"),
            
            # Metadatos
            "Archivo_KMZ": str(kmz_file) if kmz_file else None,
            "Archivo_PDF": str(pdf_file) if pdf_file else None,
            "Error_Procesamiento": ia_data.get("error")
        }
    
    def _guardar_resultados(self):
        """Guarda los resultados en Excel y CSV."""
        if not self.resultados:
            logger.warning("No hay resultados para guardar")
            return
        
        df = pd.DataFrame(self.resultados)
        
        # Guardar Excel
        excel_path = f"{self.output_filename}.xlsx"
        df.to_excel(excel_path, index=False, sheet_name="Tiendas")
        logger.info(f"Archivo Excel generado: {excel_path}")
        
        # Guardar CSV como respaldo
        csv_path = f"{self.output_filename}.csv"
        df.to_csv(csv_path, index=False, encoding='utf-8-sig')
        logger.info(f"Archivo CSV generado: {csv_path}")
        
        # Guardar log de errores si existen
        if self.errores:
            errores_df = pd.DataFrame(self.errores)
            errores_path = f"{self.output_filename}_errores.csv"
            errores_df.to_csv(errores_path, index=False, encoding='utf-8-sig')
            logger.info(f"Log de errores generado: {errores_path}")
        
        # Guardar JSON completo con datos anidados
        json_path = f"{self.output_filename}.json"
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(self.resultados, f, ensure_ascii=False, indent=2)
        logger.info(f"Archivo JSON generado: {json_path}")


# =============================================================================
# PUNTO DE ENTRADA
# =============================================================================
if __name__ == "__main__":
    # Ruta a la carpeta info
    PATH_INFO = Path(__file__).parent / "info"
    
    # Verificar que existe
    if not PATH_INFO.exists():
        logger.error(f"No se encontró la carpeta 'info' en {PATH_INFO}")
        logger.info("Asegúrate de que el script esté en la misma carpeta que 'info/'")
        exit(1)
    
    # Crear procesador y ejecutar
    processor = TiendaProcessor(
        root_path=str(PATH_INFO),
        output_filename="Consolidado_Tiendas"
    )
    
    try:
        processor.procesar()
    except KeyboardInterrupt:
        logger.info("Proceso interrumpido por el usuario")
        processor._guardar_resultados()
    except Exception as e:
        logger.error(f"Error fatal: {e}")
        processor._guardar_resultados()
        raise
