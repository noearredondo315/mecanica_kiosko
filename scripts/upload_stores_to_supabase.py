"""
Script to upload store data from fixed_tiendas.xlsx to Supabase.
Run this once to populate the database with official store data.

Usage:
    python upload_stores_to_supabase.py

Requirements:
    pip install pandas openpyxl supabase
"""

import pandas as pd
import json
from pathlib import Path
from supabase import create_client, Client

# Supabase configuration
SUPABASE_URL = "https://yffwjnoiiivtuncfajmy.supabase.co"
# You need to use the service_role key for this script (not the anon key)
# Get it from: Supabase Dashboard -> Settings -> API -> service_role key
SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmZndqbm9paWl2dHVuY2Zham15Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODMyOTczNiwiZXhwIjoyMDgzOTA1NzM2fQ.28xAzzPlXJ7cY_Hn9Tcgn6KA3SDRxdGCqelBYHT6LfA"

# File path
BASE_DIR = Path(__file__).parent.parent
INPUT_FILE = BASE_DIR / "fixed_tiendas.xlsx"


def load_excel_data(file_path: Path) -> list[dict]:
    """Load data from Excel file and convert to list of dicts."""
    print(f"Loading data from {file_path}...")
    
    df = pd.read_excel(file_path)
    print(f"Found {len(df)} rows")
    
    # Column mapping (Excel column -> Database column)
    # Note: We exclude ID_Tienda since the database auto-generates IDs
    column_mapping = {
        'Nombre_Tienda': 'nombre',
        'Ciudad': 'ciudad',
        'Año': 'año',
        'Latitud_KMZ': 'latitud',
        'Longitud_KMZ': 'longitud',
        'Nombre_Obra_PDF': 'nombre_obra',
        'Ubicacion_Detallada': 'ubicacion_detallada',
        'Laboratorio': 'laboratorio',
        'Fecha_Reporte': 'fecha_reporte',
        'Cantidad_Sondeos': 'cantidad_sondeos',
        'Metodologia': 'metodologia',
        'Profundidad_Max_Explorada_m': 'profundidad_max',
        'Presencia_NAF': 'presencia_naf',
        'Profundidad_NAF_m': 'profundidad_naf',
        'Tipo_Suelo_Predominante': 'tipo_suelo',
        'Clasificacion_SUCS': 'clasificacion_sucs',
        'Consistencia_Densidad': 'consistencia_densidad',
        'Limite_Liquido_LL': 'limite_liquido',
        'Indice_Plasticidad_IP': 'indice_plasticidad',
        'Contenido_Agua_Promedio': 'contenido_agua',
        'Alternativas_Cimentacion_JSON': 'alternativas_cimentacion',
        'Tipo_Cimentacion_Recomendado': 'tipo_cimentacion',
        'Qadm_Recomendado_ton_m2': 'qadm',
        'Profundidad_Desplante_m': 'profundidad_desplante',
        'Justificacion_Recomendacion': 'justificacion',
        'Mejoramiento_Requerido': 'mejoramiento_requerido',
        'Detalles_Mejoramiento': 'detalles_mejoramiento',
        'Zona_Sismica': 'zona_sismica',
        'Coeficiente_Sismico': 'coeficiente_sismico',
        'Clasificacion_Sitio': 'clasificacion_sitio',
        'Observaciones_Criticas': 'observaciones_criticas',
    }
    
    # Columns to exclude (not in database schema)
    exclude_columns = ['Archivo_KMZ', 'Archivo_PDF', 'Error_Procesamiento']
    
    # Drop excluded columns
    for col in exclude_columns:
        if col in df.columns:
            df = df.drop(columns=[col])
    
    # Rename columns that exist
    existing_columns = {k: v for k, v in column_mapping.items() if k in df.columns}
    df = df.rename(columns=existing_columns)
    
    # Only keep columns that are in the database schema
    valid_db_columns = list(column_mapping.values())
    df = df[[col for col in df.columns if col in valid_db_columns]]
    
    print(f"Columns to upload: {list(df.columns)}")
    
    # Convert to list of dicts
    records = []
    for _, row in df.iterrows():
        record = {}
        for col in df.columns:
            value = row[col]
            # Handle NaN values
            if pd.isna(value):
                value = None
            # Handle numpy types
            elif hasattr(value, 'item'):
                value = value.item()
            # Handle JSON columns
            elif col == 'alternativas_cimentacion' and isinstance(value, str):
                try:
                    value = json.loads(value)
                except:
                    value = []
            # Handle boolean columns
            elif col in ['presencia_naf', 'mejoramiento_requerido']:
                if isinstance(value, str):
                    value = value.lower() in ['true', 'sí', 'si', 'yes', '1']
                elif value is not None:
                    value = bool(value)
            record[col] = value
        records.append(record)
    
    return records


def upload_to_supabase(records: list[dict], supabase: Client):
    """Upload records to Supabase in batches."""
    print(f"Uploading {len(records)} records to Supabase...")
    
    # Upload in batches of 100
    batch_size = 100
    for i in range(0, len(records), batch_size):
        batch = records[i:i + batch_size]
        try:
            result = supabase.table('stores').insert(batch).execute()
            print(f"  Uploaded batch {i // batch_size + 1}/{(len(records) + batch_size - 1) // batch_size}")
        except Exception as e:
            print(f"  Error uploading batch: {e}")
            # Try uploading one by one
            for j, record in enumerate(batch):
                try:
                    supabase.table('stores').insert(record).execute()
                except Exception as e2:
                    print(f"    Error uploading record {i + j}: {e2}")


def main():
    # Check if service role key is set
    if SUPABASE_SERVICE_ROLE_KEY == "YOUR_SERVICE_ROLE_KEY_HERE":
        print("ERROR: Please set your SUPABASE_SERVICE_ROLE_KEY in this script.")
        print("Get it from: Supabase Dashboard -> Settings -> API -> service_role key")
        return
    
    # Check if input file exists
    if not INPUT_FILE.exists():
        print(f"ERROR: Input file not found: {INPUT_FILE}")
        return
    
    # Create Supabase client
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    
    # Load data
    records = load_excel_data(INPUT_FILE)
    
    if not records:
        print("No records found in Excel file.")
        return
    
    # Confirm upload
    print(f"\nReady to upload {len(records)} records to Supabase.")
    
    # Auto-confirm if running non-interactively
    import sys
    if sys.stdin.isatty():
        confirm = input("Continue? (y/n): ")
        if confirm.lower() != 'y':
            print("Cancelled.")
            return
    else:
        print("Auto-confirming (non-interactive mode)...")
    
    # Upload
    upload_to_supabase(records, supabase)
    
    print("\nDone!")


if __name__ == "__main__":
    main()
