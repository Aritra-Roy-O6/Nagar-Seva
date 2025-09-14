import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import apiClient from '../api/client';

// Fix for default marker icon issue in React Leaflet
const iconUrl = 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png';
const iconRetinaUrl = 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png';
const shadowUrl = 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Map resize handler component
const MapResizeHandler = () => {
  const map = useMap();
  
  useEffect(() => {
    // Small delay to ensure container is ready
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [map]);
  
  return null;
};

const MapPage = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const position = [23.3441, 85.3096]; // Default center (Ranchi)

  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiClient.get('/admin/reports');
        
        // Validate that reports is an array
        if (Array.isArray(response.data)) {
          setReports(response.data);
        } else {
          console.warn('Reports data is not an array:', response.data);
          setReports([]);
        }
      } catch (err) {
        console.error("Failed to fetch reports for map", err);
        setError('Failed to load map data');
        setReports([]); // Set empty array on error
      } finally {
        setLoading(false);
      }
    };
    
    fetchReports();
  }, []);

  // Validate report data before rendering markers
  const validReports = reports.filter(report => {
    return report && 
           report.location && 
           report.location.coordinates && 
           Array.isArray(report.location.coordinates) &&
           report.location.coordinates.length >= 2 &&
           typeof report.location.coordinates[0] === 'number' &&
           typeof report.location.coordinates[1] === 'number';
  });

  if (loading) return <div>Loading map data...</div>;
  
  if (error) return <div>Error: {error}</div>;

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <h1 style={{ marginBottom: '1rem' }}>Live Issues Map</h1>
      <div 
        style={{ 
          height: 'calc(100vh - 8rem)', 
          width: '100%',
          border: '1px solid #ccc',
          borderRadius: '4px',
          overflow: 'hidden'
        }}
      >
        <MapContainer 
          center={position} 
          zoom={12} 
          style={{ height: '100%', width: '100%' }}
          whenCreated={(mapInstance) => {
            // Additional setup if needed
            console.log('Map created:', mapInstance);
          }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            maxZoom={19}
          />
          
          {validReports.map((report, index) => {
            // Use index as fallback key if report.id is not available
            const key = report.id || `report-${index}`;
            const lat = report.location.coordinates[1];
            const lng = report.location.coordinates[0];
            
            return (
              <Marker
                key={key}
                position={[lat, lng]}
              >
                <Popup>
                  <div>
                    <strong>{report.problem_type || 'Unknown Issue'}</strong>
                    <br />
                    Status: {report.status || 'Unknown'}
                  </div>
                </Popup>
              </Marker>
            );
          })}
          
          <MapResizeHandler />
        </MapContainer>
      </div>
      
      {/* Debug info */}
      <div style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#666' }}>
        Total reports: {reports.length} | Valid reports: {validReports.length}
      </div>
    </div>
  );
};

export default MapPage;