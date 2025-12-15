import './style.css';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import OSM from 'ol/source/OSM';
import GeoJSON from 'ol/format/GeoJSON';
import Overlay from 'ol/Overlay';
import { Style, Fill, Stroke, Circle as CircleStyle } from 'ol/style';
import { fromLonLat } from 'ol/proj';

/* =============================
   MAP INIT
============================= */
const map = new Map({
  target: 'map',
  layers: [
    new TileLayer({ source: new OSM() })
  ],
  view: new View({
    center: fromLonLat([101.44, 0.58]),
    zoom: 11
  })
});

/* =============================
   STYLES
============================= */
const waterStyle = new Style({
  image: new CircleStyle({
    radius: 7,
    fill: new Fill({ color: '#2dd4bf' }),
    stroke: new Stroke({ color: '#0f766e', width: 2 })
  })
});

const toxicPointStyle = new Style({
  image: new CircleStyle({
    radius: 6,
    fill: new Fill({ color: '#ef4444' }),
    stroke: new Stroke({ color: '#7f1d1d', width: 2 })
  })
});

const lowToxicStyle = new Style({
  fill: new Fill({ color: 'rgba(34,197,94,0.25)' }),
  stroke: new Stroke({ color: '#16a34a', width: 2 })
});

const midToxicStyle = new Style({
  fill: new Fill({ color: 'rgba(234,179,8,0.25)' }),
  stroke: new Stroke({ color: '#ca8a04', width: 2 })
});

const highToxicStyle = new Style({
  fill: new Fill({ color: 'rgba(239,68,68,0.3)' }),
  stroke: new Stroke({ color: '#b91c1c', width: 2 })
});

/* =============================
   LAYER FACTORY
============================= */
function createVectorLayer(url, style) {
  const layer = new VectorLayer({
    source: new VectorSource({
      url,
      format: new GeoJSON({
        dataProjection: 'EPSG:4326',
        featureProjection: 'EPSG:3857'
      })
    }),
    style
  });

  layer.getSource().on('featuresloadend', () => {
    console.log(url, 'loaded:', layer.getSource().getFeatures().length);
  });

  return layer;
}

/* =============================
   LAYERS
============================= */
const waterLayer = createVectorLayer('./data/waterData.json', waterStyle);
const toxicPointLayer = createVectorLayer('./data/dataToxic.json', toxicPointStyle);
const lowToxicLayer = createVectorLayer('./data/lowToxic.json', lowToxicStyle);
const midToxicLayer = createVectorLayer('./data/midToxic.json', midToxicStyle);
const highToxicLayer = createVectorLayer('./data/highToxic.json', highToxicStyle);

map.addLayer(lowToxicLayer);
map.addLayer(midToxicLayer);
map.addLayer(highToxicLayer);
map.addLayer(toxicPointLayer);
map.addLayer(waterLayer);

/* =============================
   POPUP
============================= */
const popupContainer = document.getElementById('popup');
const popupContent = document.getElementById('popup-content');
const popupCloser = document.getElementById('popup-closer');

const popupOverlay = new Overlay({
  element: popupContainer,
  autoPan: true,
  autoPanAnimation: { duration: 250 }
});

map.addOverlay(popupOverlay);

popupCloser.onclick = () => {
  popupOverlay.setPosition(undefined);
  return false;
};

/* =============================
   CLICK EVENT (LIKE OLD PROJECT)
============================= */
map.on('singleclick', (evt) => {
  const feature = map.forEachFeatureAtPixel(evt.pixel, f => f);

  if (!feature) {
    popupOverlay.setPosition(undefined);
    return;
  }

  const props = feature.getProperties();
  const geomType = feature.getGeometry().getType();

  /* ===== KHUSUS POINT DATA AIR ===== */
  if (geomType === 'Point' && props.PH !== undefined) {

    popupContent.innerHTML = `
      <h6 class="mb-2">Kualitas Air</h6>
      <table class="table table-sm table-bordered mb-0">
        <tr><td>Nama</td><td>${props.Nama}</td></tr>
        <tr><td>Kecamatan</td><td>${props.Kecamatan}</td></tr>
        <tr><td>pH</td><td>${props.PH}</td></tr>
        <tr><td>Kategori pH</td><td>${props.kat_pH}</td></tr>
        <tr><td>Rasa</td><td>${props.Rasa}</td></tr>
        <tr><td>Kategori Rasa</td><td>${props.kat_rasa}</td></tr>
        <tr><td>Warna</td><td>${props.Warna}</td></tr>
        <tr><td>Kategori Warna</td><td>${props.kat_warna}</td></tr>
        <tr><td>Bau</td><td>${props.Bau}</td></tr>
        <tr>
          <td><strong>Kualitas</strong></td>
          <td><strong>${props.kualitas}</strong></td>
        </tr>
      </table>
    `;

    popupOverlay.setPosition(evt.coordinate);
    return;
  }

  popupOverlay.setPosition(undefined);
});

/* =============================
   CHECKBOX CONTROL
============================= */
document.getElementById('waterLayer').addEventListener('change', e => {
  waterLayer.setVisible(e.target.checked);
});

document.getElementById('toxicLayer').addEventListener('change', e => {
  lowToxicLayer.setVisible(e.target.checked);
  midToxicLayer.setVisible(e.target.checked);
  highToxicLayer.setVisible(e.target.checked);
  toxicPointLayer.setVisible(e.target.checked);
});
