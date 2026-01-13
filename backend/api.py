"""
FastAPI Backend for Tiendas Geo-Dashboard
Serves store data for visualization and analysis.
"""

from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List, Dict, Any
from pathlib import Path
import json

from data_processor import get_dashboard_data, process_data

app = FastAPI(
    title="Tiendas Geo-Dashboard API",
    description="API for geospatial analysis of store network",
    version="1.1.0"
)

# CORS middleware for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    """Health check endpoint."""
    return {"status": "ok", "service": "Tiendas Geo-Dashboard API"}


@app.get("/api/stores")
async def get_stores(
    year: Optional[List[int]] = Query(None, description="Filter by year(s)"),
    city: Optional[List[str]] = Query(None, description="Filter by city/cities"),
    search: Optional[str] = Query(None, description="Search by store name or ID")
):
    """
    Get all stores with optional filters.
    """
    try:
        data = get_dashboard_data()
        stores = data["stores"]
        
        # Apply filters
        if year:
            stores = [s for s in stores if s["año"] in year]
        
        if city:
            stores = [s for s in stores if s["ciudad"] in city]
        
        if search:
            search_lower = search.lower()
            stores = [
                s for s in stores 
                if (s["nombre"] and search_lower in s["nombre"].lower()) or 
                   (str(s["id"]) == search_lower) or
                   (s["ciudad"] and search_lower in s["ciudad"].lower())
            ]
        
        # Recalculate metadata for filtered data
        total_stores = len(stores)
        cities = sorted(list(set(s["ciudad"] for s in stores if s["ciudad"])))
        years = sorted(list(set(s["año"] for s in stores)))
        
        # Stores by city
        stores_by_city = {}
        for c in cities:
            stores_by_city[c] = len([s for s in stores if s["ciudad"] == c])
        
        return {
            "stores": stores,
            "metadata": {
                "total_stores": total_stores,
                "cities": cities,
                "years": years,
                "stores_by_city": stores_by_city
            }
        }
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/stores/{store_id}")
async def get_store_detail(store_id: int):
    """Get detailed information for a specific store."""
    try:
        data = get_dashboard_data()
        store = next((s for s in data["stores"] if s["id"] == store_id), None)
        
        if not store:
            raise HTTPException(status_code=404, detail="Store not found")
        
        return store
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/cities")
async def get_cities():
    """Get list of all unique cities."""
    try:
        data = get_dashboard_data()
        return {"cities": data["metadata"]["cities"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/years")
async def get_years():
    """Get list of all unique years."""
    try:
        data = get_dashboard_data()
        return {"years": data["metadata"]["years"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/process")
async def trigger_processing(fresh: bool = False):
    """
    Trigger data processing.
    """
    try:
        process_data(resume=not fresh)
        return {"status": "success", "message": "Processing completed"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
