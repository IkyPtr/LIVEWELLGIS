import './style.css';
import { Map, View } from 'ol';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';

import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';

import { Style, Icon, Fill, Stroke } from 'ol/style';
import { fromLonLat } from 'ol/proj';
import Overlay from 'ol/Overlay';

// ===============================
// Base Map (Initial view sementara)
// ===============================
const map = new Map({
  target: 'map',
  layers: [
    new TileLayer({ source: new OSM() })
  ],
  view: new View({
    center: fromLonLat([101.45, 0.5]),
    zoom: 10
  })
});

// ===============================
// Utility function: create icon layer
// ===============================
function createIconLayer(url, iconSrc, layerType) {
  return new VectorLayer({
    source: new VectorSource({
      url,
      format: new GeoJSON()
    }),
    style: new Style({
      image: new Icon({
        src: iconSrc,
        anchor: [0.5, 1],
        scale: 0.10  // Diperkecil dari 0.15 ke 0.10
      })
    }),
    properties: { layerType }
  });
}

// ===============================
// Utility function: create buffer layer
// ===============================
function createBufferLayer(url, fillColor, strokeColor, layerType) {
  return new VectorLayer({
    source: new VectorSource({
      url,
      format: new GeoJSON()
    }),
    style: new Style({
      fill: new Fill({
        color: fillColor  // RGBA dengan transparansi
      }),
      stroke: new Stroke({
        color: strokeColor,
        width: 2
      })
    }),
    properties: { layerType }
  });
}

// ===============================
// Add Buffer Layers (Ditambahkan dulu, agar di bawah icon)
// ===============================
const lowToxicBuffer = createBufferLayer(
  'data/lowToxic.json',
  'rgba(255, 193, 7, 0.25)',   // Kuning transparan (100m)
  '#FFC107',
  'buffer-low'
);

const midToxicBuffer = createBufferLayer(
  'data/midToxic.json',
  'rgba(255, 152, 0, 0.3)',    // Oranye transparan (200m)
  '#FF9800',
  'buffer-mid'
);

const highToxicBuffer = createBufferLayer(
  'data/highToxic.json',
  'rgba(244, 67, 54, 0.35)',   // Merah transparan (500m)
  '#f44336',
  'buffer-high'
);

// Tambahkan buffer layers ke map (urutan penting: dari bawah ke atas)
map.addLayer(highToxicBuffer);  // Layer paling bawah
map.addLayer(midToxicBuffer);
map.addLayer(lowToxicBuffer);

// ===============================
// Add Icon Layers (Di atas buffer)
// ===============================
const sumurLayer = createIconLayer('data/waterData.json', 'icon/sumur.png', 'sumur');
const pencemarLayer = createIconLayer('data/dataToxic.json', 'icon/air.png', 'pencemar');

map.addLayer(sumurLayer);
map.addLayer(pencemarLayer);

// ===============================
// Random Zoom to Water Point on Load
// ===============================
async function zoomToRandomWaterPoint() {
  try {
    const response = await fetch('data/waterData.json');
    const geojson = await response.json();
    
    if (geojson.features && geojson.features.length > 0) {
      // Pilih feature random
      const randomIndex = Math.floor(Math.random() * geojson.features.length);
      const randomFeature = geojson.features[randomIndex];
      const coords = randomFeature.geometry.coordinates;
      
      // Zoom ke koordinat random dengan animasi
      map.getView().animate({
        center: fromLonLat(coords),
        zoom: 15,
        duration: 1500
      });
    }
  } catch (error) {
    console.error('Error loading water data:', error);
  }
}

// Panggil fungsi saat halaman dimuat
zoomToRandomWaterPoint();

// ===============================
// Popup
// ===============================
const container = document.getElementById('popup');
const content = document.getElementById('popup-content');
const closer = document.getElementById('popup-closer');

const overlay = new Overlay({
  element: container,
  autoPan: true,
});

map.addOverlay(overlay);

closer.onclick = () => {
  overlay.setPosition(undefined);
  container.classList.remove('scale-up-tl');
  return false;
};

// ===============================
// Helper Functions untuk Format Popup
// ===============================
function formatDataAir(props) {
  return `
    <div class="popup-header">
      <h5>📍 Data Sumur Air</h5>
    </div>
    <div class="popup-body">
      <p><strong>Nama:</strong> ${props.Nama || '-'}</p>
      <p><strong>Kecamatan:</strong> ${props.Kecamatan || '-'}</p>
      <p><strong>Koordinat:</strong> ${props.Langitude}, ${props.Longtitude}</p>
      <hr>
      <p><strong>pH:</strong> ${props.PH || '-'}</p>
      <p><strong>Kategori pH:</strong> <span class="badge">${props.kat_pH || '-'}</span></p>
      <p><strong>Warna:</strong> ${props.Warna || '-'}</p>
      <p><strong>Kategori Warna:</strong> ${props.kat_warna || '-'}</p>
      <p><strong>Rasa:</strong> ${props.Rasa || '-'}</p>
      <p><strong>Kategori Rasa:</strong> ${props.kat_rasa || '-'}</p>
      <p><strong>Bau:</strong> ${props.Bau || '-'}</p>
      <hr>
      <p><strong>Kualitas:</strong> <span class="badge badge-${props.kualitas?.toLowerCase()}">${props.kualitas || '-'}</span></p>
    </div>
  `;
}

function formatDataPencemar(props) {
  const riskClass = props.risk_cemar?.toLowerCase() === 'tinggi' ? 'tinggi' : 
                    props.risk_cemar?.toLowerCase() === 'sedang' ? 'sedang' : 'rendah';
  
  return `
    <div class="popup-header">
      <h5>⚠️ Data Sumber Pencemar</h5>
    </div>
    <div class="popup-body">
      <p><strong>Keterangan:</strong> ${props.keterangan || '-'}</p>
      <p><strong>Koordinat:</strong> ${props.Langitude}, ${props.longitude}</p>
      <hr>
      <p><strong>Risiko Pencemaran:</strong> <span class="badge badge-${riskClass}">${props.risk_cemar || '-'}</span></p>
      <p><strong>Radius Buffer:</strong> ${props.BUFF_DIST || '-'} meter</p>
      ${props.Timestamp ? `<p><strong>Timestamp:</strong> ${new Date(props.Timestamp).toLocaleString('id-ID')}</p>` : ''}
    </div>
  `;
}

function formatDataBuffer(props) {
  const riskClass = props.risk_cemar?.toLowerCase() === 'tinggi' ? 'tinggi' : 
                    props.risk_cemar?.toLowerCase() === 'sedang' ? 'sedang' : 'rendah';
  
  const bufferInfo = props.BUFF_DIST === 500 ? 'Zona Bahaya Tinggi' :
                     props.BUFF_DIST === 200 ? 'Zona Bahaya Sedang' : 'Zona Bahaya Rendah';
  
  return `
    <div class="popup-header">
      <h5>🚧 ${bufferInfo}</h5>
    </div>
    <div class="popup-body">
      <p><strong>Jenis Sumber:</strong> ${props.keterangan || '-'}</p>
      <p><strong>Radius Buffer:</strong> ${props.BUFF_DIST || '-'} meter</p>
      <p><strong>Tingkat Risiko:</strong> <span class="badge badge-${riskClass}">${props.risk_cemar || '-'}</span></p>
      <hr>
      <p style="font-size: 12px; color: #666;">Area ini berada dalam radius ${props.BUFF_DIST}m dari sumber pencemar.</p>
    </div>
  `;
}

// ===============================
// Click Handler
// ===============================
map.on('singleclick', (evt) => {
  let featureFound = false;
  
  map.forEachFeatureAtPixel(evt.pixel, (feature, layer) => {
    if (featureFound) return;
    
    const props = feature.getProperties();
    const coord = evt.coordinate;
    const layerType = layer.get('layerType');
    
    let html = '';
    
    // Tentukan format berdasarkan tipe layer
    if (layerType === 'sumur') {
      html = formatDataAir(props);
    } else if (layerType === 'pencemar') {
      html = formatDataPencemar(props);
    } else if (layerType && layerType.startsWith('buffer-')) {
      html = formatDataBuffer(props);
    }
    
    content.innerHTML = html;
    
    // Hapus class animasi dulu (jika ada)
    container.classList.remove('scale-up-tl');
    
    // Trigger reflow untuk restart animasi
    void container.offsetWidth;
    
    // Tambahkan class animasi
    container.classList.add('scale-up-tl');
    
    overlay.setPosition(coord);
    featureFound = true;
  });
  
  // Jika tidak ada feature yang diklik, sembunyikan popup
  if (!featureFound) {
    overlay.setPosition(undefined);
    container.classList.remove('scale-up-tl');
  }
});
// ===============================
// Legend Toggle Functionality
// ===============================
const legendToggleBtn = document.getElementById('legend-toggle');
const legendPanel = document.getElementById('legend-panel');
const legendCloseBtn = document.getElementById('legend-close');

// Toggle legend saat tombol diklik
legendToggleBtn.addEventListener('click', () => {
  legendPanel.classList.toggle('show');
});

// Close legend saat tombol close diklik
legendCloseBtn.addEventListener('click', () => {
  legendPanel.classList.remove('show');
});

// Close legend saat klik di luar panel
document.addEventListener('click', (e) => {
  if (!legendPanel.contains(e.target) && !legendToggleBtn.contains(e.target)) {
    legendPanel.classList.remove('show');
  }
});