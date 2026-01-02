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

const kecamatanConfigs = [
  {
    name: 'Rumbai',
    url: 'data/rumbai.geojson',
    stroke: '#2196f3',
    fill: 'rgba(33, 150, 243, 0.15)'
  },
  {
    name: 'Rumbai Barat',
    url: 'data/rumbaiBarat.geojson',
    stroke: '#4caf50',
    fill: 'rgba(76, 175, 80, 0.15)'
  },
  {
    name: 'Rumbai Timur',
    url: 'data/rumbaiTimur.geojson',
    stroke: '#ff9800',
    fill: 'rgba(255, 152, 0, 0.15)'
  }
];

const kecamatanLayers = [];
let hoveredKecamatan = null;

// Style untuk kecamatan normal
function getKecamatanStyle(cfg, isHovered = false) {
  return new Style({
    fill: new Fill({
      color: isHovered ? cfg.fill.replace('0.15', '0.35') : cfg.fill
    }),
    stroke: new Stroke({
      color: cfg.stroke,
      width: isHovered ? 3 : 2,
      lineDash: isHovered ? null : [5, 5]
    })
  });
}

kecamatanConfigs.forEach(cfg => {
  const layer = new VectorLayer({
    source: new VectorSource({
      url: cfg.url,
      format: new GeoJSON({
        dataProjection: 'EPSG:4326',
        featureProjection: 'EPSG:3857'
      })
    }),
    style: getKecamatanStyle(cfg, false),
    properties: {
      layerType: 'kecamatan',
      nama: cfg.name,
      config: cfg
    }
  });

  map.addLayer(layer);
  kecamatanLayers.push(layer);
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
        scale: 0.06, 
        anchorXUnits: 'fraction',
        anchorYUnits: 'fraction'
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
        color: fillColor
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
// Add Buffer Layers
// ===============================
const lowToxicBuffer = createBufferLayer(
  'data/lowToxic.json',
  'rgba(255, 193, 7, 0.25)',
  '#FFC107',
  'buffer-low'
);

const midToxicBuffer = createBufferLayer(
  'data/midToxic.json',
  'rgba(255, 152, 0, 0.3)',
  '#FF9800',
  'buffer-mid'
);

const highToxicBuffer = createBufferLayer(
  'data/highToxic.json',
  'rgba(244, 67, 54, 0.35)',
  '#f44336',
  'buffer-high'
);

map.addLayer(highToxicBuffer);
map.addLayer(midToxicBuffer);
map.addLayer(lowToxicBuffer);

// ===============================
// Add Icon Layers
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
      const randomIndex = Math.floor(Math.random() * geojson.features.length);
      const randomFeature = geojson.features[randomIndex];
      const coords = randomFeature.geometry.coordinates;
      
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

function closePopup() {
  container.classList.remove('scale-up-tl');
  container.classList.add('scale-down-tl');
  
  setTimeout(() => {
    overlay.setPosition(undefined);
    container.classList.remove('scale-down-tl');
  }, 400);
}

closer.onclick = (e) => {
  e.preventDefault();
  closePopup();
  return false;
};

// ===============================
// Helper Functions untuk Format Popup
// ===============================
function formatDataAir(props) {
  const kualitas = props.kualitas || props.Kualitas;
  
  return `
    <div class="popup-header">
      <h5>💧 Data Sumur Air</h5>
    </div>
    <div class="popup-body">
      <p><strong>Nama Pemilik:</strong> ${props.Nama || '-'}</p>
      <p><strong>Kecamatan:</strong> ${props.Kecamatan || '-'}</p>
      <p><strong>Koordinat:</strong> ${props.Langitude}, ${props.Longtitude}</p>
      <hr>
      <p><strong>pH:</strong> ${props.PH || '-'}</p>
      <p><strong>Kategori pH:</strong> <span class="badge ${props.kat_pH === 'Layak Diminum' ? 'badge-baik' : props.kat_pH === 'Basa Ringan' ? 'badge-rendah' : 'badge-sedang'}">${props.kat_pH || '-'}</span></p>
      <p><strong>Warna:</strong> ${props.Warna || '-'}</p>
      <p><strong>Kategori Warna:</strong> <span class="badge ${props.kat_warna === 'normal' ? 'badge-baik' : props.kat_warna === 'bahaya' ? 'badge-tinggi' : 'badge-sedang'}">${props.kat_warna || '-'}</span></p>
      <p><strong>Rasa:</strong> ${props.Rasa || '-'}</p>
      <p><strong>Kategori Rasa:</strong> <span class="badge ${props.kat_rasa === 'normal' ? 'badge-baik' : props.kat_rasa === 'bahaya' ? 'badge-tinggi' : 'badge-sedang'}">${props.kat_rasa || '-'}</span></p>
      <p><strong>Bau:</strong> ${props.Bau || '-'}</p>
      <hr>
      ${kualitas ? 
        `<p><strong>Kualitas Air:</strong> <span class="badge badge-${kualitas.toLowerCase()}">${kualitas}</span></p>` 
        : 
        `<p><strong>Kualitas Air:</strong> <span style="color: #999; font-style: italic;">Belum ada data</span></p>`
      }
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
      <p style="font-size: 12px; color: #b0b0b0;">Area ini berada dalam radius ${props.BUFF_DIST}m dari sumber pencemar.</p>
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
    if (layerType === 'kecamatan') {
  const nama =
    props.name ||
    props['name:id'] ||
    layer.get('nama') ||
    'Kecamatan';

  html = `
    <div class="popup-header">
      <h5>📍 ${nama}</h5>
    </div>
    <div class="popup-body">
      <p>Wilayah administrasi</p>
    </div>
  `;
}
    if (layerType === 'sumur') {
      html = formatDataAir(props);
    } else if (layerType === 'pencemar') {
      html = formatDataPencemar(props);
    } else if (layerType && layerType.startsWith('buffer-')) {
      html = formatDataBuffer(props);
    }
    
    content.innerHTML = html;
    container.classList.remove('scale-up-tl', 'scale-down-tl');
    void container.offsetWidth;
    container.classList.add('scale-up-tl');
    overlay.setPosition(coord);
    featureFound = true;
  });
  
  if (!featureFound) {
    if (overlay.getPosition()) {
      closePopup();
    }
  }
});



// ===============================
// Legend & Zoom Controls
// ===============================
const legendToggleBtn = document.getElementById('legend-toggle');
const legendPanel = document.getElementById('legend-panel');
const legendCloseBtn = document.getElementById('legend-close');
const zoomControls = document.getElementById('zoom-controls');
const zoomInBtn = document.getElementById('zoom-in');
const zoomOutBtn = document.getElementById('zoom-out');

// Zoom functionality
zoomInBtn.addEventListener('click', () => {
  const view = map.getView();
  view.animate({
    zoom: view.getZoom() + 1,
    duration: 250
  });
});

zoomOutBtn.addEventListener('click', () => {
  const view = map.getView();
  view.animate({
    zoom: view.getZoom() - 1,
    duration: 250
  });
});

// Legend toggle
legendToggleBtn.addEventListener('click', () => {
  legendPanel.classList.toggle('show');
});

legendCloseBtn.addEventListener('click', () => {
  legendPanel.classList.remove('show');
});

document.addEventListener('click', (e) => {
  if (!legendPanel.contains(e.target) && !legendToggleBtn.contains(e.target)) {
    legendPanel.classList.remove('show');
  }
});

// ===============================
// Dashboard Toggle Functionality
// ===============================
const dashboardToggleBtn = document.getElementById('dashboard-toggle');
const dashboardPanel = document.getElementById('dashboard-panel');
const dashboardCloseBtn = document.getElementById('dashboard-close');

// Toggle dashboard saat tombol diklik
dashboardToggleBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  dashboardPanel.classList.toggle('show');
});

// Close dashboard HANYA saat tombol close (X) diklik
dashboardCloseBtn.addEventListener('click', () => {
  dashboardPanel.classList.remove('show');
});

// ===============================
// DASHBOARD DATA ANALYSIS & CHARTS
// ===============================

// Global variables untuk menyimpan data
let waterData = null;
let toxicData = null;
let chartInstances = {}; 

// Fetch semua data
async function loadAllData() {
  try {
    const [waterResponse, toxicResponse] = await Promise.all([
      fetch('data/waterData.json'),
      fetch('data/dataToxic.json')
    ]);
    
    waterData = await waterResponse.json();
    toxicData = await toxicResponse.json();
    
    console.log('Data loaded successfully');
    console.log('Total Sumur:', waterData.features.length);
    console.log('Total Pencemar:', toxicData.features.length);
    
    // Analisis dan buat dashboard
    analyzeDashboardData();
    createDashboard();
  } catch (error) {
    console.error('Error loading data:', error);
  }
}

// Analisis data untuk dashboard
function analyzeDashboardData() {
  if (!waterData || !toxicData) return;
  
  const stats = {
    totalSumur: waterData.features.length,
    totalPencemar: toxicData.features.length,
    kualitasAir: {
      baik: 0,
      sedang: 0,
      buruk: 0
    },
    perKecamatan: {
      'Rumbai Barat': { baik: 0, sedang: 0, buruk: 0, total: 0 },
      'Rumbai': { baik: 0, sedang: 0, buruk: 0, total: 0 },
      'Rumbai Timur': { baik: 0, sedang: 0, buruk: 0, total: 0 }
    },
    kategoriPH: {
      asam: 0,      // pH < 6.5
      normal: 0,    // pH 6.5-8.5
      basa: 0       // pH > 8.5
    },
    warnaAir: {},
    rasaAir: {},
    bauAir: {},
    tipePencemar: {}
  };
  
  // Analisis data sumur
  waterData.features.forEach(feature => {
    const props = feature.properties;
    
    // Kualitas air
    const kualitas = props.kualitas || props.Kualitas;
    if (kualitas === 'Baik') stats.kualitasAir.baik++;
    else if (kualitas === 'Sedang') stats.kualitasAir.sedang++;
    else if (kualitas === 'Buruk') stats.kualitasAir.buruk++;
    
    // Per kecamatan
    const kec = props.Kecamatan;
    if (stats.perKecamatan[kec]) {
      stats.perKecamatan[kec].total++;
      if (kualitas === 'Baik') stats.perKecamatan[kec].baik++;
      else if (kualitas === 'Sedang') stats.perKecamatan[kec].sedang++;
      else if (kualitas === 'Buruk') stats.perKecamatan[kec].buruk++;
    }
    
    // Kategori pH
    const ph = parseFloat(props.PH);
    if (ph < 6.5) stats.kategoriPH.asam++;
    else if (ph <= 8.5) stats.kategoriPH.normal++;
    else stats.kategoriPH.basa++;
    
    // Warna air
    const warna = props.Warna || 'Tidak ada data';
    stats.warnaAir[warna] = (stats.warnaAir[warna] || 0) + 1;
    
    // Rasa air
    const rasa = props.Rasa || 'Tidak ada data';
    stats.rasaAir[rasa] = (stats.rasaAir[rasa] || 0) + 1;
    
    // Bau air
    const bau = props.Bau || 'Tidak ada data';
    stats.bauAir[bau] = (stats.bauAir[bau] || 0) + 1;
  });
  
  // Analisis tipe pencemar
  toxicData.features.forEach(feature => {
    const props = feature.properties;
    const tipe = props.keterangan || 'Tidak ada data';
    stats.tipePencemar[tipe] = (stats.tipePencemar[tipe] || 0) + 1;
  });
  
  console.log('Dashboard Stats:', stats);
  window.dashboardStats = stats; // Save to global
  
  return stats;
}

// Buat dashboard dengan Chart.js
function createDashboard() {
  const stats = window.dashboardStats;
  if (!stats) return;
  
  const dashboardBody = document.querySelector('.dashboard-body');
  
  dashboardBody.innerHTML = `
    <!-- KPI Cards -->
    <div class="dashboard-section">
      <div class="kpi-cards">
        <div class="kpi-card" title="Klik untuk menampilkan semua sumur">
          <div class="kpi-icon">🚰</div>
          <div class="kpi-content">
            <div class="kpi-value">${stats.totalSumur}</div>
            <div class="kpi-label">Total Sumur</div>
          </div>
        </div>
        <div class="kpi-card" title="Klik untuk menampilkan sumber pencemar & zona bahaya">
          <div class="kpi-icon">⚠️</div>
          <div class="kpi-content">
            <div class="kpi-value">${stats.totalPencemar}</div>
            <div class="kpi-label">Sumber Pencemar</div>
          </div>
        </div>
        <div class="kpi-card kpi-success" title="Klik untuk menampilkan sumur kualitas baik">
          <div class="kpi-icon">✓</div>
          <div class="kpi-content">
            <div class="kpi-value">${stats.kualitasAir.baik}</div>
            <div class="kpi-label">Kualitas Baik</div>
          </div>
        </div>
        <div class="kpi-card kpi-danger" title="Klik untuk menampilkan sumur kualitas buruk">
          <div class="kpi-icon">✕</div>
          <div class="kpi-content">
            <div class="kpi-value">${stats.kualitasAir.buruk}</div>
            <div class="kpi-label">Kualitas Buruk</div>
          </div>
        </div>
      </div>
      
      <!-- Filter Info & Reset -->
      <div id="filter-info" class="filter-info" style="display: none;">
        <span id="filter-text">Filter aktif</span>
        <button id="reset-filter-btn" class="reset-filter-btn">Reset Filter</button>
      </div>
    </div>

    
    
    <!-- Kualitas per Kecamatan -->
    <div class="dashboard-section">
      <h6 class="dashboard-subtitle">📍 Kualitas Air per Kecamatan</h6>
      <div class="chart-container">
        <canvas id="chartKecamatan"></canvas>
      </div>
    </div>
    
    
    <!-- Kategori pH & Warna Air -->
    <div class="dashboard-section">
      <div class="chart-row">
        <div class="chart-col">
          <h6 class="dashboard-subtitle">🧪 Kategori pH</h6>
          <div class="chart-container-small">
            <canvas id="chartPH"></canvas>
          </div>
        </div>
        <div class="chart-col">
          <h6 class="dashboard-subtitle">💧 Warna Air</h6>
          <div class="chart-container-small">
            <canvas id="chartWarna"></canvas>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Tipe Pencemar -->
    <div class="dashboard-section">
      <h6 class="dashboard-subtitle">🏭 Tipe Sumber Pencemar (${stats.totalPencemar} lokasi)</h6>
      <div class="chart-container">
        <canvas id="chartPencemar"></canvas>
      </div>
    </div>
  `;
  
  // Tunggu DOM update, lalu create charts dan attach listeners
  setTimeout(() => {
    createCharts(stats);
    attachKPICardListeners(); // Attach click handlers to KPI cards
  }, 100);
}

// Create all charts
function createCharts(stats) {
  // Destroy existing charts
  Object.values(chartInstances).forEach(chart => chart.destroy());
  chartInstances = {};
  
  // Chart colors (dark theme)
  const colors = {
    baik: '#4caf50',
    sedang: '#ff9800',
    buruk: '#f44336',
    primary: '#2c9fbf',
    secondary: '#1b6f82',
    accent: '#f4b000'
  };
  
  // 1. Chart Kecamatan (Stacked Bar)
  const ctxKec = document.getElementById('chartKecamatan');
  if (ctxKec) {
    chartInstances.kecamatan = new Chart(ctxKec, {
      type: 'bar',
      data: {
        labels: ['Rumbai Barat', 'Rumbai', 'Rumbai Timur'],
        datasets: [
          {
            label: 'Baik',
            data: [
              stats.perKecamatan['Rumbai Barat'].baik,
              stats.perKecamatan['Rumbai'].baik,
              stats.perKecamatan['Rumbai Timur'].baik
            ],
            backgroundColor: colors.baik,
            borderColor: colors.baik,
            borderWidth: 1
          },
          {
            label: 'Sedang',
            data: [
              stats.perKecamatan['Rumbai Barat'].sedang,
              stats.perKecamatan['Rumbai'].sedang,
              stats.perKecamatan['Rumbai Timur'].sedang
            ],
            backgroundColor: colors.sedang,
            borderColor: colors.sedang,
            borderWidth: 1
          },
          {
            label: 'Buruk',
            data: [
              stats.perKecamatan['Rumbai Barat'].buruk,
              stats.perKecamatan['Rumbai'].buruk,
              stats.perKecamatan['Rumbai Timur'].buruk
            ],
            backgroundColor: colors.buruk,
            borderColor: colors.buruk,
            borderWidth: 1
          }
        ]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            stacked: true,
            ticks: { color: '#e0e0e0' },
            grid: { color: 'rgba(255,255,255,0.1)' }
          },
          y: {
            stacked: true,
            ticks: { color: '#e0e0e0' },
            grid: { color: 'rgba(255,255,255,0.1)' }
          }
        },
        plugins: {
          legend: {
            labels: { color: '#e0e0e0' }
          }
        }
      }
    });
  }
  
  // 2. Chart pH (Bar)
  const ctxPH = document.getElementById('chartPH');
  if (ctxPH) {
    chartInstances.ph = new Chart(ctxPH, {
      type: 'bar',
      data: {
        labels: ['Asam\n(<6.5)', 'Normal\n(6.5-8.5)', 'Basa\n(>8.5)'],
        datasets: [{
          label: 'Jumlah Sumur',
          data: [
            stats.kategoriPH.asam,
            stats.kategoriPH.normal,
            stats.kategoriPH.basa
          ],
          backgroundColor: [colors.buruk, colors.baik, colors.sedang],
          borderColor: [colors.buruk, colors.baik, colors.sedang],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: { color: '#e0e0e0' },
            grid: { color: 'rgba(255,255,255,0.1)' }
          },
          x: {
            ticks: { color: '#e0e0e0' },
            grid: { display: false }
          }
        },
        plugins: {
          legend: { display: false }
        }
      }
    });
  }
  
  // 3. Chart Warna (Doughnut)
  const ctxWarna = document.getElementById('chartWarna');
  if (ctxWarna) {
    const warnaLabels = Object.keys(stats.warnaAir);
    const warnaData = Object.values(stats.warnaAir);
    const warnaColors = [
      '#4caf50', '#2196f3', '#ff9800', '#f44336', '#9c27b0', '#00bcd4'
    ];
    
    chartInstances.warna = new Chart(ctxWarna, {
      type: 'doughnut',
      data: {
        labels: warnaLabels,
        datasets: [{
          data: warnaData,
          backgroundColor: warnaColors.slice(0, warnaLabels.length),
          borderColor: '#0d0d0d',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { 
              color: '#e0e0e0',
              padding: 10,
              font: { size: 11 }
            }
          }
        }
      }
    });
  }
  
  // 4. Chart Pencemar (Horizontal Bar)
  const ctxPencemar = document.getElementById('chartPencemar');
  if (ctxPencemar) {
    const pencemarLabels = Object.keys(stats.tipePencemar);
    const pencemarData = Object.values(stats.tipePencemar);
    
    chartInstances.pencemar = new Chart(ctxPencemar, {
      type: 'bar',
      data: {
        labels: pencemarLabels,
        datasets: [{
          label: 'Jumlah Lokasi',
          data: pencemarData,
          backgroundColor: colors.buruk,
          borderColor: colors.buruk,
          borderWidth: 1
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            beginAtZero: true,
            ticks: { color: '#e0e0e0' },
            grid: { color: 'rgba(255,255,255,0.1)' }
          },
          y: {
            ticks: { color: '#e0e0e0' },
            grid: { display: false }
          }
        },
        plugins: {
          legend: { display: false }
        }
      }
    });
  }
}

// ===============================
// FILTER FUNCTIONALITY - KPI CARDS INTERACTIVE
// ===============================

// Track current filter state
let currentFilter = null;

// Function to show/hide layers
function setLayerVisibility(layerName, visible) {
  const layerMap = {
    'sumur': sumurLayer,
    'pencemar': pencemarLayer,
    'buffer-high': highToxicBuffer,
    'buffer-mid': midToxicBuffer,
    'buffer-low': lowToxicBuffer
  };
  
  const layer = layerMap[layerName];
  if (layer) {
    layer.setVisible(visible);
  }
}

// Function to filter sumur by quality
function filterSumurByQuality(quality) {
  if (!waterData) return;
  
  // Create new filtered source
  const filteredFeatures = waterData.features.filter(feature => {
    const kualitas = feature.properties.kualitas || feature.properties.Kualitas;
    return kualitas === quality;
  });
  
  const filteredGeoJSON = {
    type: 'FeatureCollection',
    features: filteredFeatures
  };
  
  // Update sumur layer with filtered data
  const newSource = new VectorSource({
    features: new GeoJSON().readFeatures(filteredGeoJSON, {
      featureProjection: 'EPSG:3857'
    })
  });
  
  sumurLayer.setSource(newSource);
  sumurLayer.setStyle(new Style({
    image: new Icon({
      src: 'icon/sumur.png',
      anchor: [0.5, 1],
      scale: 0.06, // Reduced from 0.10 to 0.06
      anchorXUnits: 'fraction',
      anchorYUnits: 'fraction'
    })
  }));
}

// Function to reset all layers to original state
function resetAllLayers() {
  // Show all layers
  setLayerVisibility('sumur', true);
  setLayerVisibility('pencemar', true);
  setLayerVisibility('buffer-high', true);
  setLayerVisibility('buffer-mid', true);
  setLayerVisibility('buffer-low', true);
  
  // Reset sumur layer to original data
  if (waterData) {
    const originalSource = new VectorSource({
      features: new GeoJSON().readFeatures(waterData, {
        featureProjection: 'EPSG:3857'
      })
    });
    
    sumurLayer.setSource(originalSource);
    sumurLayer.setStyle(new Style({
      image: new Icon({
        src: 'icon/sumur.png',
        anchor: [0.5, 1],
        scale: 0.06, // Reduced from 0.10 to 0.06
        anchorXUnits: 'fraction',
        anchorYUnits: 'fraction'
      })
    }));
  }
  
  currentFilter = null;
  
  // Remove active class from all cards
  document.querySelectorAll('.kpi-card').forEach(card => {
    card.classList.remove('kpi-active');
  });
  
  // Hide filter info
  const filterInfo = document.getElementById('filter-info');
  if (filterInfo) {
    filterInfo.style.display = 'none';
  }
  
  // Remove radar effect
  removeRadarEffect();
}

// Function to add radar effect to map
function addRadarEffect(filterType) {
  const mapElement = document.getElementById('map');
  
  // Add radar-active class to map
  mapElement.classList.add('radar-active');
  
  // Add radar overlays for visible features
  createRadarOverlays(filterType);
  
  // Update radar overlays on map move
  map.on('moveend', updateRadarOverlays);
}

// Function to remove radar effect
function removeRadarEffect() {
  const mapElement = document.getElementById('map');
  mapElement.classList.remove('radar-active');
  
  // Remove all radar overlays
  removeRadarOverlays();
  
  // Remove moveend listener
  map.un('moveend', updateRadarOverlays);
}

// Store radar overlays
let radarOverlays = [];

// Create radar overlay elements
function createRadarOverlays(filterType) {
  // Remove existing overlays first
  removeRadarOverlays();
  
  // Get visible layer
  let targetLayer = null;
  let radarColor = 'cyan';
  
  if (filterType === 'sumur' || filterType === 'baik' || filterType === 'buruk') {
    targetLayer = sumurLayer;
    radarColor = filterType === 'baik' ? 'green' : filterType === 'buruk' ? 'red' : 'cyan';
  } else if (filterType === 'pencemar') {
    targetLayer = pencemarLayer;
    radarColor = 'warning';
  }
  
  if (!targetLayer) return;
  
  // Get all features from the layer
  const source = targetLayer.getSource();
  const features = source.getFeatures();
  
  features.forEach(feature => {
    const geometry = feature.getGeometry();
    const coords = geometry.getCoordinates();
    
    // Create overlay div for radar effect
    const radarDiv = document.createElement('div');
    radarDiv.className = `radar-marker radar-${radarColor}`;
    radarDiv.innerHTML = '<div class="radar-ring-3"></div>';
    
    // Create OpenLayers Overlay
    const overlay = new Overlay({
      element: radarDiv,
      positioning: 'center-center',
      stopEvent: false
    });
    
    overlay.setPosition(coords);
    map.addOverlay(overlay);
    
    radarOverlays.push(overlay);
  });
  
  console.log(`✅ Created ${radarOverlays.length} radar overlays (${radarColor})`);
}

// Update radar overlays (on map move)
function updateRadarOverlays() {
  // Overlays automatically update position with map
  // This function can be used for additional updates if needed
}

// Remove all radar overlays
function removeRadarOverlays() {
  radarOverlays.forEach(overlay => {
    map.removeOverlay(overlay);
  });
  radarOverlays = [];
}

// Function to handle filter actions
function applyFilter(filterType, cardElement) {
  // If same filter clicked, reset
  if (currentFilter === filterType) {
    resetAllLayers();
    return;
  }
  
  // Remove active class from all cards
  document.querySelectorAll('.kpi-card').forEach(card => {
    card.classList.remove('kpi-active');
  });
  
  // Add active class to clicked card
  if (cardElement) {
    cardElement.classList.add('kpi-active');
  }
  
  currentFilter = filterType;
  
  // Update filter info text
  const filterInfo = document.getElementById('filter-info');
  const filterText = document.getElementById('filter-text');
  let infoText = '';
  
  switch(filterType) {
    case 'sumur':
      // Show ONLY sumur
      setLayerVisibility('sumur', true);
      setLayerVisibility('pencemar', false);
      setLayerVisibility('buffer-high', false);
      setLayerVisibility('buffer-mid', false);
      setLayerVisibility('buffer-low', false);
      
      // Reset sumur to show all
      if (waterData) {
        const originalSource = new VectorSource({
          features: new GeoJSON().readFeatures(waterData, {
            featureProjection: 'EPSG:3857'
          })
        });
        sumurLayer.setSource(originalSource);
      }
      
      infoText = '🚰 Menampilkan semua sumur';
      break;
      
    case 'pencemar':
      // Show ONLY pencemar + buffers
      setLayerVisibility('sumur', false);
      setLayerVisibility('pencemar', true);
      setLayerVisibility('buffer-high', true);
      setLayerVisibility('buffer-mid', true);
      setLayerVisibility('buffer-low', true);
      
      infoText = '⚠️ Menampilkan sumber pencemar & zona bahaya';
      break;
      
    case 'baik':
      // Show ONLY sumur with "Baik" quality
      setLayerVisibility('sumur', true);
      setLayerVisibility('pencemar', false);
      setLayerVisibility('buffer-high', false);
      setLayerVisibility('buffer-mid', false);
      setLayerVisibility('buffer-low', false);
      
      filterSumurByQuality('Baik');
      
      infoText = '✓ Menampilkan sumur kualitas BAIK';
      break;
      
    case 'buruk':
      // Show ONLY sumur with "Buruk" quality
      setLayerVisibility('sumur', true);
      setLayerVisibility('pencemar', false);
      setLayerVisibility('buffer-high', false);
      setLayerVisibility('buffer-mid', false);
      setLayerVisibility('buffer-low', false);
      
      filterSumurByQuality('Buruk');
      
      infoText = '✕ Menampilkan sumur kualitas BURUK';
      break;
      
    default:
      resetAllLayers();
      return;
  }
  
  // Show filter info
  if (filterInfo && filterText) {
    filterText.textContent = infoText;
    filterInfo.style.display = 'flex';
  }
  
  // Add radar effect
  setTimeout(() => {
    addRadarEffect(filterType);
  }, 300); // Delay untuk smooth transition
}

// Attach event listeners to KPI cards (will be called after dashboard is created)
function attachKPICardListeners() {
  const cards = document.querySelectorAll('.kpi-card');
  
  cards.forEach((card, index) => {
    card.style.cursor = 'pointer';
    
    card.addEventListener('click', (e) => {
      e.stopPropagation();
      
      // Determine filter type based on card index
      let filterType = null;
      if (index === 0) filterType = 'sumur';        // Total Sumur
      else if (index === 1) filterType = 'pencemar'; // Sumber Pencemar
      else if (index === 2) filterType = 'baik';     // Kualitas Baik
      else if (index === 3) filterType = 'buruk';    // Kualitas Buruk
      
      applyFilter(filterType, card);
    });
  });
  
  // Attach reset button listener
  const resetBtn = document.getElementById('reset-filter-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      resetAllLayers();
    });
  }
  
  console.log('✅ KPI Card filters attached');
}

// Load data saat halaman ready
window.addEventListener('load', () => {
  loadAllData();
});