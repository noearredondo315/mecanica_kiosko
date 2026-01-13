"""
Data Processor for Tiendas Geo-Dashboard
Handles Excel processing with checkpoints, incremental saving, and comprehensive logging.
"""

import pandas as pd
import json
import logging
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, Any, List
import sys

# Configuration
BASE_DIR = Path(__file__).parent.parent
INPUT_FILE = BASE_DIR / "fixed_tiendas.xlsx"
OUTPUT_FILE = BASE_DIR / "Consolidado_Final_Procesado.xlsx"
CHECKPOINT_FILE = BASE_DIR / "backend" / "processing_state.json"
LOG_FILE = BASE_DIR / "backend" / "process.log"

# Column mappings (auto-detection with fallbacks)
COLUMN_MAPPINGS = {
    "tienda": ["Tienda", "Nombre_Tienda", "ID_Tienda", "tienda"],
    "ciudad": ["Ciudad", "ciudad", "City"],
    "año": ["Año", "año", "Year", "Anio"],
    "latitud": ["Latitud", "Latitud_KMZ", "latitud", "lat", "Lat"],
    "longitud": ["Longitud", "Longitud_KMZ", "longitud", "lng", "Lon", "Long"],
    "error": ["Error_Procesamiento", "error", "Error", "has_error"]
}

# Mexico bounding box for validation
MEXICO_BOUNDS = {
    "lat_min": 14.5,
    "lat_max": 32.7,
    "lon_min": -118.4,
    "lon_max": -86.7
}


def setup_logging() -> logging.Logger:
    """Configure logging with file and console handlers."""
    LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
    
    logger = logging.getLogger("DataProcessor")
    logger.setLevel(logging.DEBUG)
    
    # File handler
    file_handler = logging.FileHandler(LOG_FILE, encoding="utf-8")
    file_handler.setLevel(logging.DEBUG)
    file_format = logging.Formatter(
        "%(asctime)s | %(levelname)-8s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )
    file_handler.setFormatter(file_format)
    
    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    console_format = logging.Formatter("%(levelname)s: %(message)s")
    console_handler.setFormatter(console_format)
    
    logger.addHandler(file_handler)
    logger.addHandler(console_handler)
    
    return logger


def detect_column(df: pd.DataFrame, column_type: str, logger: logging.Logger) -> Optional[str]:
    """Auto-detect column name from possible variations."""
    possible_names = COLUMN_MAPPINGS.get(column_type, [])
    for name in possible_names:
        if name in df.columns:
            logger.info(f"Detected '{column_type}' column as: {name}")
            return name
    logger.warning(f"Could not detect '{column_type}' column. Tried: {possible_names}")
    return None


def load_checkpoint() -> Dict[str, Any]:
    """Load processing checkpoint from JSON file."""
    if CHECKPOINT_FILE.exists():
        try:
            with open(CHECKPOINT_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except json.JSONDecodeError:
            return {"last_processed_index": 0, "processed_cities": [], "errors": []}
    return {"last_processed_index": 0, "processed_cities": [], "errors": []}


def save_checkpoint(state: Dict[str, Any]) -> None:
    """Save processing checkpoint to JSON file."""
    CHECKPOINT_FILE.parent.mkdir(parents=True, exist_ok=True)
    state["last_updated"] = datetime.now().isoformat()
    with open(CHECKPOINT_FILE, "w", encoding="utf-8") as f:
        json.dump(state, f, indent=2, ensure_ascii=False)


def validate_coordinates(lat: float, lon: float, logger: logging.Logger, row_id: Any) -> bool:
    """Validate that coordinates are within Mexico bounds."""
    if pd.isna(lat) or pd.isna(lon):
        logger.error(f"Row {row_id}: Missing coordinates (lat={lat}, lon={lon})")
        return False
    
    if not (MEXICO_BOUNDS["lat_min"] <= lat <= MEXICO_BOUNDS["lat_max"]):
        logger.error(f"Row {row_id}: Latitude {lat} out of Mexico range [{MEXICO_BOUNDS['lat_min']}, {MEXICO_BOUNDS['lat_max']}]")
        return False
    
    if not (MEXICO_BOUNDS["lon_min"] <= lon <= MEXICO_BOUNDS["lon_max"]):
        logger.error(f"Row {row_id}: Longitude {lon} out of Mexico range [{MEXICO_BOUNDS['lon_min']}, {MEXICO_BOUNDS['lon_max']}]")
        return False
    
    return True


def validate_data_types(row: pd.Series, columns: Dict[str, str], logger: logging.Logger, row_id: Any) -> List[str]:
    """Validate data types for a row and return list of issues."""
    issues = []
    
    # Check latitude is numeric
    lat_col = columns.get("latitud")
    if lat_col and lat_col in row.index:
        try:
            float(row[lat_col]) if not pd.isna(row[lat_col]) else None
        except (ValueError, TypeError):
            issues.append(f"Invalid latitude type: {type(row[lat_col])}")
            logger.error(f"Row {row_id}: Invalid latitude type - {row[lat_col]}")
    
    # Check longitude is numeric
    lon_col = columns.get("longitud")
    if lon_col and lon_col in row.index:
        try:
            float(row[lon_col]) if not pd.isna(row[lon_col]) else None
        except (ValueError, TypeError):
            issues.append(f"Invalid longitude type: {type(row[lon_col])}")
            logger.error(f"Row {row_id}: Invalid longitude type - {row[lon_col]}")
    
    # Check year is numeric
    year_col = columns.get("año")
    if year_col and year_col in row.index:
        try:
            int(row[year_col]) if not pd.isna(row[year_col]) else None
        except (ValueError, TypeError):
            issues.append(f"Invalid year type: {type(row[year_col])}")
            logger.error(f"Row {row_id}: Invalid year type - {row[year_col]}")
    
    return issues


def process_data(resume: bool = True) -> pd.DataFrame:
    """
    Main processing function with checkpoint support.
    
    Args:
        resume: If True, resume from last checkpoint. If False, start fresh.
    
    Returns:
        Processed DataFrame
    """
    logger = setup_logging()
    logger.info("=" * 60)
    logger.info("Starting data processing")
    logger.info(f"Input file: {INPUT_FILE}")
    
    # Load checkpoint if resuming
    checkpoint = load_checkpoint() if resume else {"last_processed_index": 0, "processed_cities": [], "errors": []}
    start_index = checkpoint.get("last_processed_index", 0)
    
    if start_index > 0:
        logger.info(f"Resuming from index {start_index}")
    
    # Read Excel file
    try:
        df = pd.read_excel(INPUT_FILE)
        logger.info(f"Loaded {len(df)} rows from Excel file")
        logger.info(f"Columns detected: {df.columns.tolist()}")
    except Exception as e:
        logger.critical(f"Failed to read Excel file: {e}")
        raise
    
    # Auto-detect columns
    columns = {}
    for col_type in COLUMN_MAPPINGS.keys():
        detected = detect_column(df, col_type, logger)
        if detected:
            columns[col_type] = detected
    
    # Add validation columns if not present
    if "coord_valid" not in df.columns:
        df["coord_valid"] = True
    if "validation_issues" not in df.columns:
        df["validation_issues"] = ""
    if "processed_at" not in df.columns:
        df["processed_at"] = None
    
    # Process by city blocks for checkpoint granularity
    ciudad_col = columns.get("ciudad", "Ciudad")
    cities = df[ciudad_col].unique()
    processed_cities = set(checkpoint.get("processed_cities", []))
    
    total_errors = 0
    processed_count = 0
    
    for city in cities:
        if city in processed_cities:
            logger.info(f"Skipping already processed city: {city}")
            continue
        
        logger.info(f"Processing city: {city}")
        city_mask = df[ciudad_col] == city
        city_indices = df[city_mask].index
        
        for idx in city_indices:
            if idx < start_index:
                continue
            
            row = df.loc[idx]
            
            # Validate coordinates
            lat_col = columns.get("latitud", "Latitud_KMZ")
            lon_col = columns.get("longitud", "Longitud_KMZ")
            
            lat = row.get(lat_col)
            lon = row.get(lon_col)
            
            coord_valid = validate_coordinates(lat, lon, logger, idx)
            df.at[idx, "coord_valid"] = coord_valid
            
            # Validate data types
            issues = validate_data_types(row, columns, logger, idx)
            if issues:
                df.at[idx, "validation_issues"] = "; ".join(issues)
                total_errors += 1
            
            if not coord_valid:
                total_errors += 1
            
            df.at[idx, "processed_at"] = datetime.now().isoformat()
            processed_count += 1
            
            # Update checkpoint every 10 rows
            if processed_count % 10 == 0:
                checkpoint["last_processed_index"] = idx
                save_checkpoint(checkpoint)
        
        # Mark city as processed
        processed_cities.add(city)
        checkpoint["processed_cities"] = list(processed_cities)
        save_checkpoint(checkpoint)
        logger.info(f"Completed city: {city}")
        
        # Incremental save to Excel
        df.to_excel(OUTPUT_FILE, index=False)
        logger.info(f"Incremental save to {OUTPUT_FILE}")
    
    # Final save
    df.to_excel(OUTPUT_FILE, index=False)
    
    # Summary
    logger.info("=" * 60)
    logger.info("Processing complete!")
    logger.info(f"Total rows processed: {len(df)}")
    logger.info(f"Total validation errors: {total_errors}")
    logger.info(f"Output saved to: {OUTPUT_FILE}")
    
    # Clear checkpoint on successful completion
    if CHECKPOINT_FILE.exists():
        CHECKPOINT_FILE.unlink()
        logger.info("Checkpoint cleared")
    
    return df


def get_dashboard_data() -> Dict[str, Any]:
    """
    Get processed data formatted for the dashboard API.
    
    Returns:
        Dictionary with stores data and metadata for the frontend.
    """
    # Use processed file if available, otherwise use original
    file_to_use = OUTPUT_FILE if OUTPUT_FILE.exists() else INPUT_FILE
    df = pd.read_excel(file_to_use)
    
    def safe_str(val):
        return str(val) if pd.notna(val) else None
    
    def safe_float(val):
        return float(val) if pd.notna(val) else None
    
    def safe_bool(val):
        return bool(val) if pd.notna(val) else False
    
    def parse_alternativas(val):
        if pd.isna(val):
            return []
        try:
            if isinstance(val, str):
                return json.loads(val)
            return val
        except (json.JSONDecodeError, TypeError):
            return []
    
    # Standardize column names for API response
    stores = []
    for _, row in df.iterrows():
        store = {
            "id": int(row.get("ID_Tienda", 0)),
            "nombre": safe_str(row.get("Nombre_Tienda")),
            "ciudad": safe_str(row.get("Ciudad")),
            "año": int(row.get("Año", 0)),
            "latitud": safe_float(row.get("Latitud_KMZ")),
            "longitud": safe_float(row.get("Longitud_KMZ")),
            
            # Identificación
            "nombre_obra": safe_str(row.get("Nombre_Obra_PDF")),
            "ubicacion_detallada": safe_str(row.get("Ubicacion_Detallada")),
            "laboratorio": safe_str(row.get("Laboratorio")),
            "fecha_reporte": safe_str(row.get("Fecha_Reporte")),
            
            # Exploración de campo
            "cantidad_sondeos": safe_str(row.get("Cantidad_Sondeos")),
            "metodologia": safe_str(row.get("Metodologia")),
            "profundidad_max": safe_float(row.get("Profundidad_Max_Explorada_m")),
            "presencia_naf": safe_bool(row.get("Presencia_NAF")),
            "profundidad_naf": safe_float(row.get("Profundidad_NAF_m")),
            
            # Caracterización del suelo
            "tipo_suelo": safe_str(row.get("Tipo_Suelo_Predominante")),
            "clasificacion_sucs": safe_str(row.get("Clasificacion_SUCS")),
            "consistencia_densidad": safe_str(row.get("Consistencia_Densidad")),
            "limite_liquido": safe_float(row.get("Limite_Liquido_LL")),
            "indice_plasticidad": safe_float(row.get("Indice_Plasticidad_IP")),
            "contenido_agua": safe_float(row.get("Contenido_Agua_Promedio")),
            
            # Cimentación
            "alternativas_cimentacion": parse_alternativas(row.get("Alternativas_Cimentacion_JSON")),
            "tipo_cimentacion": safe_str(row.get("Tipo_Cimentacion_Recomendado")),
            "qadm": safe_float(row.get("Qadm_Recomendado_ton_m2")),
            "profundidad_desplante": safe_float(row.get("Profundidad_Desplante_m")),
            "justificacion": safe_str(row.get("Justificacion_Recomendacion")),
            "mejoramiento_requerido": safe_bool(row.get("Mejoramiento_Requerido")),
            "detalles_mejoramiento": safe_str(row.get("Detalles_Mejoramiento")),
            
            # Análisis sísmico
            "zona_sismica": safe_str(row.get("Zona_Sismica")),
            "coeficiente_sismico": safe_str(row.get("Coeficiente_Sismico")),
            "clasificacion_sitio": safe_str(row.get("Clasificacion_Sitio")),
            
            # Observaciones
            "observaciones_criticas": safe_str(row.get("Observaciones_Criticas")),
        }
        stores.append(store)
    
    # Calculate metrics
    total_stores = len(stores)
    cities = list(set(s["ciudad"] for s in stores if s["ciudad"]))
    years = sorted(list(set(s["año"] for s in stores)))
    
    # Stores by city
    stores_by_city = {}
    for city in cities:
        city_stores = [s for s in stores if s["ciudad"] == city]
        stores_by_city[city] = len(city_stores)
    
    return {
        "stores": stores,
        "metadata": {
            "total_stores": total_stores,
            "cities": sorted(cities),
            "years": years,
            "stores_by_city": stores_by_city
        }
    }


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Process tiendas data with checkpoints")
    parser.add_argument("--fresh", action="store_true", help="Start fresh, ignore checkpoints")
    parser.add_argument("--export-json", action="store_true", help="Export dashboard data as JSON")
    args = parser.parse_args()
    
    if args.export_json:
        data = get_dashboard_data()
        output_json = BASE_DIR / "backend" / "dashboard_data.json"
        with open(output_json, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"Dashboard data exported to {output_json}")
    else:
        process_data(resume=not args.fresh)
