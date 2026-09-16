import { useState } from 'react';
import { Geolocation } from '@capacitor/geolocation';
import { useUpdateMyLocationMutation } from '../features/locations/locationsApi';

export default function ShareLocationButton() {
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [updateLocation] = useUpdateMyLocationMutation();

  async function handleShare() {
    setStatus('loading');
    try {
      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
      await updateLocation({
        latitude:  pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy:  pos.coords.accuracy,
      }).unwrap();
      setStatus('success');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err) {
      console.error('Location error', err);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  }

  const label = { idle: 'Share Location', loading: 'Getting location…', success: 'Location shared!', error: 'Failed — retry' };
  const color = { idle: 'text-gray-600 dark:text-gray-300 hover:text-blue-600', loading: 'text-blue-500', success: 'text-green-500', error: 'text-red-500' };

  return (
    <button
      onClick={handleShare}
      disabled={status === 'loading'}
      title={label[status]}
      className={`flex items-center gap-1.5 text-sm px-2 py-1 rounded-lg transition-colors ${color[status]}`}
    >
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
      </svg>
      <span className="hidden sm:inline">{label[status]}</span>
    </button>
  );
}
