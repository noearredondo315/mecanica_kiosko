import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'

// Dynamically import the entire page content to avoid SSR issues with client-side only libraries
const GeoMapContent = dynamic(
  () => import('@/components/geomap/GeoMapContent'),
  { 
    ssr: false,
    loading: () => (
      <div className="h-screen w-full flex items-center justify-center bg-slate-900">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto" />
          <p className="text-slate-400">Cargando mapa...</p>
        </div>
      </div>
    )
  }
)

export default function GeoMapPage() {
  return <GeoMapContent />
}
