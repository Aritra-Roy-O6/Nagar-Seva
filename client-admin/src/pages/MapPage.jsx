import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import apiClient from '../api/client';
// AdminLayout is no longer imported or used here

// Fix for default marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

const MapPage = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const position = [22.5726, 88.3639]; // Default center (Kolkata)

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const response = await apiClient.get('/admin/reports');
        setReports(response.data);
      } catch (err) {
        console.error("Failed to fetch reports for map", err);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  if (loading) return <p>Loading map data...</p>;

  return (
    <>
      <h1 className="mb-4">Live Issues Map</h1>
      <div className="card shadow-sm" style={{ height: 'calc(100vh - 8rem)' }}>
        <MapContainer center={position} zoom={12} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          {reports.map(report => (
            <Marker
              key={report.id}
              position={[report.location.coordinates[1], report.location.coordinates[0]]}
            >
              <Popup>
                <b>{report.problem_type}</b><br />
                Status: {report.status}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </>
  );
};

export default MapPage;

