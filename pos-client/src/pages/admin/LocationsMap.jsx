import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useGetLocationsQuery } from '../../features/locations/locationsApi';

// Fix default marker icons broken by webpack/vite bundling
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function LocationsMap() {
  const { data: locations = [], isFetching, refetch } = useGetLocationsQuery();

  const center = locations.length > 0
    ? [+locations[0].latitude, +locations[0].longitude]
    : [7.8731, 80.7718]; // Sri Lanka default

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Sales Rep Locations</h1>
          <p className="text-sm text-gray-500">{locations.length} rep{locations.length !== 1 ? 's' : ''} tracked</p>
        </div>
        <button
          onClick={refetch}
          disabled={isFetching}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {isFetching ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      <div className="flex-1 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700" style={{ minHeight: 400 }}>
        <MapContainer center={center} zoom={locations.length > 0 ? 12 : 8} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {locations.map(loc => (
            <Marker key={loc.user_id} position={[+loc.latitude, +loc.longitude]}>
              <Popup>
                <div className="text-sm">
                  <p className="font-semibold">{loc.user?.name}</p>
                  <p className="text-gray-500">{loc.user?.email}</p>
                  <p className="mt-1 text-xs text-gray-400">Updated {timeAgo(loc.updated_at)}</p>
                  {loc.accuracy && (
                    <p className="text-xs text-gray-400">Accuracy ±{Math.round(loc.accuracy)}m</p>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {locations.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {locations.map(loc => (
            <div key={loc.user_id} className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 font-semibold text-sm shrink-0">
                {loc.user?.name?.[0]?.toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{loc.user?.name}</p>
                <p className="text-xs text-gray-500">{(+loc.latitude).toFixed(5)}, {(+loc.longitude).toFixed(5)}</p>
                <p className="text-xs text-gray-400">{timeAgo(loc.updated_at)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {locations.length === 0 && !isFetching && (
        <p className="text-center text-gray-400 py-8">No locations reported yet. Sales reps need to share their location from their device.</p>
      )}
    </div>
  );
}
