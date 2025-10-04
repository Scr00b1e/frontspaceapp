import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// API base URL from env (set in Netlify)
const API_BASE = process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000';

function App() {
  const [data, setData] = useState([]);
  const [greenIncrease, setGreenIncrease] = useState(0);
  const [originalAvgRisk, setOriginalAvgRisk] = useState(0);  // Track baseline
  const center = [20, 0];  // World center (equator, prime meridian)
  const [currentAvgRisk, setCurrentAvgRisk] = useState(0);  // For post-sim avg

  useEffect(() => {
    fetch(`${API_BASE}/api/heat-data`)
      .then(res => res.json())
      .then(fetchedData => {
        setData(fetchedData);
        const avg = fetchedData.reduce((sum, p) => sum + p.heat_risk, 0) / fetchedData.length || 0;
        setOriginalAvgRisk(avg);
        setCurrentAvgRisk(avg);
      })
      .catch(err => console.error("Fetch error:", err));
  }, []);

  const simulate = () => {
    fetch(`${API_BASE}/sim?green=${greenIncrease}`)
      .then(res => res.json())
      .then(result => {
        const newData = result.simulated_data || [];
        setData(newData);
        const newAvg = newData.reduce((sum, p) => sum + p.heat_risk, 0) / newData.length || 0;
        setCurrentAvgRisk(newAvg);
        console.log(`Avg risk: ${originalAvgRisk.toFixed(2)} → ${newAvg.toFixed(2)} (reduced ${((originalAvgRisk - newAvg) / originalAvgRisk * 100 || 0).toFixed(1)}%!)`);
      })
      .catch(err => console.error("Sim error:", err));
  };

  return (
    <div style={{ height: '100vh', padding: '10px', position: 'relative' }}>
      <h1>UrbanVitality: Global Urban Heat Risks</h1>
      <div>
        <label>Green Increase (%): </label>
        <input
          type="number"
          value={greenIncrease}
          onChange={(e) => setGreenIncrease(parseFloat(e.target.value) || 0)}
          min="0"
          max="50"
          step="5"
        />
        <button onClick={simulate}>Simulate</button>
        {originalAvgRisk > 0 && (
          <p>Avg Heat Risk: {currentAvgRisk.toFixed(2)} extreme days/yr 
            ({((originalAvgRisk - currentAvgRisk) / originalAvgRisk * 100 || 0).toFixed(1)}% reduction from baseline)</p>
        )}
      </div>

      {/* NASA Logo */}
      <img
        src="https://upload.wikimedia.org/wikipedia/commons/e/e5/NASA_logo.svg"
        alt="NASA Logo"
        style={{ position: 'absolute', top: 10, right: 10, width: 100, height: 'auto', zIndex: 1000 }}
      />

      <MapContainer center={center} zoom={2} style={{ height: '70vh', marginTop: '10px' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {data.map((point, idx) => {
          const risk = point.heat_risk;
          const color = risk > 0.5 ? 'red' : risk > 0.3 ? 'orange' : 'green';  // Color by risk level
          return (
            <Marker key={idx} position={[point.lat, point.lon]} icon={L.divIcon({ className: `marker-${color}`, html: `<div style="background:${color};width:12px;height:12px;border-radius:50%;border:2px solid white;"></div>`, iconSize: [14, 14] })}>
              <Popup>
                Heat Risk: {risk.toFixed(2)} extreme days/yr<br/>
                Population: {point.population.toLocaleString()}
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
      <p>Data from NASA SEDAC (worldwide urban heat events)</p>
    </div>
  );
}

export default App;