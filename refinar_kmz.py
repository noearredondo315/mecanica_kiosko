import zipfile
import xml.etree.ElementTree as ET
import logging
from pathlib import Path

# Configuración de logging para ver qué pasa internamente
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

def extraer_coordenadas_kmz_refinado(kmz_path: Path):
    """
    Versión mejorada para extraer coordenadas de un KMZ.
    Maneja múltiples namespaces y estructuras de KML.
    """
    logger.info(f"Procesando: {kmz_path.name}")
    try:
        with zipfile.ZipFile(kmz_path, 'r') as z:
            # Buscar todos los archivos KML
            kml_files = [f for f in z.namelist() if f.lower().endswith('.kml')]
            if not kml_files:
                logger.warning("No se encontraron archivos KML en el KMZ.")
                return None, None
            
            # Procesar el primer KML encontrado (usualmente doc.kml)
            with z.open(kml_files[0]) as f:
                content = f.read()
                root = ET.fromstring(content)
                
                # Extraer namespace del root si existe
                ns = ""
                if root.tag.startswith("{"):
                    ns = root.tag.split("}")[0] + "}"
                
                logger.info(f"Namespace detectado: {ns if ns else 'Ninguno'}")

                # Buscar todos los elementos 'coordinates' de forma recursiva
                # Usamos .//* para buscar en todo el árbol
                all_coords = root.findall(f".//{ns}coordinates")
                
                if not all_coords:
                    # Intento sin namespace por si acaso
                    all_coords = root.findall(".//coordinates")

                if all_coords:
                    for coord_elem in all_coords:
                        if coord_elem.text:
                            coords_text = coord_elem.text.strip()
                            if not coords_text:
                                continue
                            
                            # KML puede tener múltiples puntos separados por espacio
                            # Tomamos el primero
                            first_point = coords_text.split()[0]
                            parts = first_point.split(',')
                            
                            if len(parts) >= 2:
                                try:
                                    lon = float(parts[0].strip())
                                    lat = float(parts[1].strip())
                                    logger.info(f"ÉXITO: lat={lat}, lon={lon}")
                                    return lat, lon
                                except ValueError:
                                    continue
                
                logger.warning("No se encontraron coordenadas válidas en las etiquetas detectadas.")
                return None, None

    except Exception as e:
        logger.error(f"Error procesando {kmz_path.name}: {e}")
        return None, None

def test_on_samples():
    """Prueba la extracción en algunos archivos reales si existen."""
    # Buscar algunos KMZ en la carpeta info
    base_path = Path("./info")
    if not base_path.exists():
        logger.error("Carpeta 'info/' no encontrada para pruebas.")
        return

    kmz_samples = list(base_path.glob("**/*.kmz"))[:5] # Probar los primeros 5
    
    print("\n--- INICIANDO PRUEBAS DE EXTRACCIÓN ---")
    results = []
    for sample in kmz_samples:
        lat, lon = extraer_coordenadas_kmz_refinado(sample)
        results.append({
            "archivo": sample.name,
            "coord": (lat, lon) if lat else "FALLÓ"
        })
    
    print("\n--- RESUMEN DE PRUEBAS ---")
    for r in results:
        print(f"{r['archivo']}: {r['coord']}")

if __name__ == "__main__":
    test_on_samples()
