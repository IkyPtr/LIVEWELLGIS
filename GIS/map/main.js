import './style.css';
import { Map, View } from 'ol';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';

import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';

import { Style, Icon } from 'ol/style';
import { fromLonLat } from 'ol/proj';
import Overlay from 'ol/Overlay';

// ===============================
// Base Map
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
function createIconLayer(url, iconSrc) {
  return new VectorLayer({
    source: new VectorSource({
      url,
      format: new GeoJSON()
    }),
    style: new Style({
      image: new Icon({
        src: iconSrc,
        anchor: [0.5, 1],
        scale: 0.15
      })
    })
  });
}

// ===============================
// Add Layers
// ===============================
const sumurLayer = createIconLayer('data/dataSumur.json', 'icon/sumur.png');
const pencemarLayer = createIconLayer('data/dataPencemar.json', 'icon/air.png');

map.addLayer(sumurLayer);
map.addLayer(pencemarLayer);

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
  return false;
};

// ===============================
// Click Handler
// ===============================
map.on('singleclick', (evt) => {
  const feature = map.forEachFeatureAtPixel(evt.pixel, (ft) => ft);

  if (!feature) {
    overlay.setPosition(undefined);
    return;
  }

  const props = feature.getProperties();
  const coord = evt.coordinate;

  let html = `
    <h5>${props.Nama_Sumur ? 'Titik Sumur' : 'Titik Pencemar'}</h5>
    <p><strong>Nama:</strong> ${props.Nama_Sumur || props.Nama_Pencemar}</p>
  `;

  content.innerHTML = html;
  overlay.setPosition(coord);
});
