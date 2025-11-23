import './style.css';
import { Map, View } from 'ol';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import { Vector as VectorSource } from 'ol/source.js';
import VectorLayer from 'ol/layer/Vector';
import GeoJSON from 'ol/format/GeoJSON.js';
import { Style, Icon } from 'ol/style.js';
import { fromLonLat } from 'ol/proj.js';
import Overlay from 'ol/Overlay.js';

// Base map
const map = new Map({
  target: 'map',
  layers: [
    new TileLayer({ source: new OSM() })
  ],
  view: new View({
    center: fromLonLat([101.45, 0.5]),
    zoom: 7
  })
});

// Layer Titik Sumur
const sumurLayer = new VectorLayer({
  source: new VectorSource({
    format: new GeoJSON(),
    url: 'data/dataSumur.json'
  }),
  style: new Style({
    image: new Icon({
      anchor: [0.5, 1],
      anchorXUnits: 'fraction',
      anchorYUnits: 'fraction',
      src: 'icon/sumur.png',
      scale: 0.15
    })
  })
});

// Layer Titik Pencemar / Air
const pencemarLayer = new VectorLayer({
  source: new VectorSource({
    format: new GeoJSON(),
    url: 'data/dataPencemar.json'
  }),
  style: new Style({
    image: new Icon({
      anchor: [0.5, 1],
      anchorXUnits: 'fraction',
      anchorYUnits: 'fraction',
      src: 'icon/air.png',
      scale: 0.15
    })
  })
});

// Tambahkan layer ke map
map.addLayer(sumurLayer);
map.addLayer(pencemarLayer);

// Debugging: Periksa pemuatan fitur
sumurLayer.getSource().on('addfeature', function() {
  console.log('Fitur sumur dimuat:', sumurLayer.getSource().getFeatures().length);
});
pencemarLayer.getSource().on('addfeature', function() {
  console.log('Fitur pencemar dimuat:', pencemarLayer.getSource().getFeatures().length);
});

// POPUP
const container = document.getElementById('popup');
const contentElement = document.getElementById('popup-content');
const closer = document.getElementById('popup-closer');

// Buat overlay
const overlay = new Overlay({
  element: container,
  autoPan: {
    animation: { duration: 250 }
  }
});

map.addOverlay(overlay);

// Klik pada titik untuk popup
map.on('singleclick', function(evt) {
  console.log('Klik di koordinat:', evt.coordinate);
  const feature = map.forEachFeatureAtPixel(evt.pixel, function(feature) {
    console.log('Fitur ditemukan:', feature.getProperties());
    return feature;
  });
  
  if (!feature) {
    overlay.setPosition();
    return;
  }

  const coordinate = evt.coordinate;
  const props = feature.getProperties();

  // Tampilkan nama dan deskripsi, sesuaikan nama field JSON
  let contentHTML = '';
  if (props.Nama_Sumur) {
    contentHTML = `<h5>Titik Sumur</h5><p>Nama Sumur: ${props.Nama_Sumur}</p>`;
  } else if (props.Nama_Pencemar) {
    contentHTML = `<h5>Titik Pencemar</h5><p>Nama Pencemar: ${props.Nama_Pencemar}</p>`;
  } else {
    contentHTML = `<p>Data tidak tersedia</p>`;
  }

  contentElement.innerHTML = contentHTML;
  overlay.setPosition(coordinate);
});

// Klik close untuk menyembunyikan popup
closer.onclick = function() {
  overlay.setPosition(undefined);
  closer.blur();
  return false;
};
