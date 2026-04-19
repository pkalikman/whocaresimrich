(() => {
  'use strict';

  // Soft gate. Not cryptographic — anyone reading the source can bypass.
  // Change PASSWORD to whatever you want to share. Parallel to trtdh's 'cheap'.
  const PASSWORD = 'fancy';
  const STORAGE_KEY = 'wcir:unlocked';

  const gate = document.getElementById('gate');
  const gateForm = document.getElementById('gate-form');
  const gateInput = document.getElementById('gate-input');
  const gateError = document.getElementById('gate-error');
  const app = document.getElementById('app');

  // Declared before unlock() is called so initMap() can assign without
  // hitting a temporal dead zone when the storage flag is already set.
  let map, userMarker;
  let restaurants = [];
  let userLatLng = null;

  function unlock() {
    gate.hidden = true;
    app.hidden = false;
    initMap();
  }

  gateForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (gateInput.value === PASSWORD) {
      localStorage.setItem(STORAGE_KEY, '1');
      unlock();
    } else {
      gateError.hidden = false;
      gateInput.select();
    }
  });

  if (localStorage.getItem(STORAGE_KEY) === '1') {
    unlock();
  }

  async function initMap() {
    // Default view: Manhattan core. Will refit once restaurants load.
    map = L.map('map').setView([40.74, -73.99], 12);
    // CartoDB dark tiles to match the caviar-and-champagne palette.
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
    }).addTo(map);

    try {
      const res = await fetch('restaurants.json', { cache: 'no-cache' });
      restaurants = await res.json();
    } catch (err) {
      console.error('failed to load restaurants.json', err);
      restaurants = [];
    }

    renderMarkers();
    renderList();
    if (restaurants.length) fitToMarkers();

    document.getElementById('locate-btn').addEventListener('click', locateUser);
    document.getElementById('sort-btn').addEventListener('click', () => {
      renderList(true);
    });
  }

  function renderMarkers() {
    restaurants.forEach((r) => {
      if (typeof r.lat !== 'number' || typeof r.lng !== 'number') return;
      const marker = L.circleMarker([r.lat, r.lng], {
        radius: 7,
        color: '#c8a96a',
        fillColor: '#e5c98a',
        fillOpacity: 0.9,
        weight: 1.5,
      }).addTo(map);
      const popup = `
        <strong>${escapeHtml(r.name)}</strong><br>
        ${r.neighborhood ? escapeHtml(r.neighborhood) + '<br>' : ''}
        ${r.price ? escapeHtml(r.price) : ''}
        ${r.hours ? '<br>' + escapeHtml(r.hours) : ''}
        ${r.notes ? '<br>' + escapeHtml(r.notes) : ''}
      `;
      marker.bindPopup(popup);
      r._marker = marker;
    });
  }

  function renderList(sortByDistance = false) {
    const list = document.getElementById('list');
    let items = restaurants.slice();
    if (sortByDistance && userLatLng) {
      items.forEach((r) => {
        r._dist = haversine(userLatLng, [r.lat, r.lng]);
      });
      items.sort((a, b) => (a._dist ?? Infinity) - (b._dist ?? Infinity));
    }
    if (!items.length) {
      list.innerHTML = '<div class="item"><em>No restaurants yet.</em></div>';
      return;
    }
    list.innerHTML = items.map((r) => `
      <div class="item" data-name="${escapeHtml(r.name)}">
        <h3>${escapeHtml(r.name)}
          ${r._dist != null ? `<span class="dist">${(r._dist / 1609).toFixed(1)} mi</span>` : ''}
        </h3>
        <div class="meta">${escapeHtml(r.neighborhood || '')}${r.price ? ' &middot; ' + escapeHtml(r.price) : ''}</div>
        ${r.notes ? `<div class="notes">${escapeHtml(r.notes)}</div>` : ''}
      </div>
    `).join('');
    list.querySelectorAll('.item').forEach((el) => {
      el.addEventListener('click', () => {
        const r = restaurants.find((x) => x.name === el.dataset.name);
        if (r && r._marker) {
          map.setView([r.lat, r.lng], 16);
          r._marker.openPopup();
        }
      });
    });
  }

  function fitToMarkers() {
    const pts = restaurants
      .filter((r) => typeof r.lat === 'number' && typeof r.lng === 'number')
      .map((r) => [r.lat, r.lng]);
    if (pts.length) map.fitBounds(pts, { padding: [40, 40] });
  }

  function locateUser() {
    if (!navigator.geolocation) {
      alert('Geolocation not supported.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        userLatLng = [pos.coords.latitude, pos.coords.longitude];
        if (userMarker) userMarker.remove();
        userMarker = L.circleMarker(userLatLng, {
          radius: 8, color: '#e5c98a', fillColor: '#e5c98a', fillOpacity: 0.9,
        }).addTo(map).bindPopup('you');
        map.setView(userLatLng, 14);
        document.getElementById('sort-btn').disabled = false;
        renderList(true);
      },
      (err) => alert('Could not get location: ' + err.message),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function haversine([lat1, lon1], [lat2, lon2]) {
    const R = 6371000;
    const toRad = (d) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }
})();
