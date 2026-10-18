const places = [
  {id:'hawthorne', name:'Hawthorne Library', building:'Hawthorne Library', category:'LIBRARY', type:'library', occupancy:22, walk:4, noise:'Quiet', noiseScore:1, outlets:true, light:true, group:false, seats:86, match:98, description:'A calm, sunlit reading room on the second floor. Plenty of space to settle in, spread out your notes, and get into a good rhythm.', amenities:['☼ Natural light','ϟ Power outlets','◖ Quiet zone','⌁ Wi-Fi'], favorite:true},
  {id:'arts', name:'Arts Commons', building:'Arts Commons', category:'STUDIO LOUNGE', type:'lounge', occupancy:18, walk:7, noise:'Low-key', noiseScore:2, outlets:true, light:true, group:false, seats:32, match:94, description:'A bright, tucked-away lounge surrounded by studio windows. A favorite for independent work and afternoon light.', amenities:['☼ Big windows','ϟ Outlets at every table','◖ Low-key','☕ Café nearby'], favorite:true},
  {id:'founders', name:'Founders Hall 204', building:'Founders Hall', category:'CLASSROOM', type:'hall', occupancy:34, walk:6, noise:'Moderate', noiseScore:3, outlets:true, light:false, group:true, seats:24, match:87, description:'An open classroom with movable tables and whiteboards. Usually free between lectures and great for a study group.', amenities:['▦ Whiteboards','ϟ Wall outlets','♧ Group friendly','⌁ Wi-Fi'], favorite:true},
  {id:'west', name:'West Lounge', building:'West Lounge', category:'LOUNGE', type:'lounge', occupancy:41, walk:8, noise:'Moderate', noiseScore:3, outlets:true, light:true, group:true, seats:18, match:81, description:'A relaxed common room with sofa seating, wide windows, and plenty of table space for group projects.', amenities:['☼ Window seats','ϟ Outlets','♧ Group friendly','☕ Coffee'], favorite:false},
  {id:'engineering', name:'Engineering Commons', building:'Engineering', category:'COMMONS', type:'hall', occupancy:66, walk:9, noise:'Social', noiseScore:4, outlets:true, light:false, group:true, seats:11, match:67, description:'A lively shared workspace in the engineering building. Best for collaborative projects and quick work between classes.', amenities:['♧ Group tables','ϟ Lots of outlets','⌁ Wi-Fi','☕ Vending'], favorite:false},
  {id:'union', name:'Student Union Atrium', building:'Student Union', category:'STUDENT UNION', type:'lounge', occupancy:78, walk:3, noise:'Social', noiseScore:5, outlets:false, light:true, group:true, seats:7, match:53, description:'The energetic heart of campus, with bright atrium seating and easy access to food and coffee.', amenities:['☼ Atrium light','♧ Group friendly','☕ Food nearby','♧ Social'], favorite:false},
  {id:'science', name:'Science Hall Reading Room', building:'Science Hall', category:'READING ROOM', type:'library', occupancy:27, walk:11, noise:'Quiet', noiseScore:1, outlets:true, light:false, group:false, seats:48, match:84, description:'A hushed reading room with individual desks and reliable power access, tucked just off the main science corridor.', amenities:['◖ Silent study','ϟ Desk outlets','⌁ Wi-Fi','♧ Solo focus'], favorite:false},
  {id:'garden', name:'Garden Pavilion', building:'Garden Pavilion', category:'OUTDOOR STUDY', type:'lounge', occupancy:15, walk:12, noise:'Low-key', noiseScore:2, outlets:false, light:true, group:false, seats:14, match:78, description:'An outdoor covered pavilion with leafy views and a quiet atmosphere. Best on a mild, sunny day.', amenities:['☼ Outdoor light','♧ Quiet corners','◌ Fresh air','☂ Covered seating'], favorite:false}
];

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
let activeFilters = new Set();
let preferences = {noise:'quiet', space:'any', distance:10, outlets:true, light:true, crowds:true};
let searchQuery = '';
let lowestFirst = true;
let toastTimer;

function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2300);
}

function iconFor(place) { return place.type === 'library' ? '▤' : place.type === 'hall' ? '▦' : '☼'; }
function heatFor(occupancy) {
  if (occupancy < 35) return {name:'low', rgb:'53 171 112', label:'Available'};
  if (occupancy < 70) return {name:'mid', rgb:'216 181 53', label:'Filling up'};
  return {name:'high', rgb:'222 83 81', label:'Crowded'};
}
function estimateOccupancy(place, hoursAhead) {
  const trend = [0, 3, 5, 4, 1, -3, -7, -8, -5];
  const classPressure = place.type === 'hall' ? 5 : place.id === 'union' ? 6 : place.type === 'lounge' ? 2 : 0;
  const classFactors = [0, .35, .75, 1, .8, .6, .4, .2, 0];
  const step = Math.max(0, Math.min(8, Math.round(hoursAhead * 2)));
  return Math.max(4, Math.min(96, Math.round(place.occupancy + trend[step] + classPressure * classFactors[step])));
}
function scorePlace(place) {
  let score = place.match;
  if (place.occupancy < 35) score += 8;
  else if (place.occupancy > 70) score -= 18;
  else if (place.occupancy > 55) score -= 8;
  if (preferences.noise === 'quiet') score += place.noiseScore <= 2 ? 8 : place.noiseScore >= 4 ? -18 : 0;
  if (preferences.noise === 'social' && place.noiseScore >= 3) score += 10;
  if (preferences.outlets) score += place.outlets ? 4 : -8;
  if (preferences.light && place.light) score += 5;
  if (preferences.crowds) score += Math.max(0, 8 - place.occupancy * .08);
  if (preferences.space === 'group') score += place.group ? 10 : -7;
  if (preferences.space === 'solo') score += !place.group ? 6 : -8;
  if (place.walk > preferences.distance) score -= 20;
  return Math.max(30, Math.min(99, Math.round(score)));
}
function matchesQuickFilters(place) {
  if (activeFilters.has('quiet') && place.noiseScore > 2) return false;
  if (activeFilters.has('outlets') && !place.outlets) return false;
  if (activeFilters.has('available') && place.occupancy > 50) return false;
  if (activeFilters.has('light') && !place.light) return false;
  if (activeFilters.has('group') && !place.group) return false;
  if (searchQuery && !`${place.name} ${place.category}`.toLowerCase().includes(searchQuery)) return false;
  return true;
}
function matchesPersonalPreferences(place) {
  if (preferences.noise === 'quiet' && place.noiseScore > 3) return false;
  if (preferences.noise === 'social' && place.noiseScore < 2) return false;
  if (preferences.outlets && !place.outlets) return false;
  if (preferences.light && !place.light) return false;
  if (place.walk > preferences.distance) return false;
  if (preferences.space === 'group' && !place.group) return false;
  if (preferences.space === 'solo' && place.group) return false;
  return true;
}
function matchesRecommendationPreferences(place) { return matchesPersonalPreferences(place) && matchesQuickFilters(place); }

function renderRecommendations() {
  const host = $('#recommendations');
  renderSmartAlternative();
  const picks = places.filter(matchesRecommendationPreferences).sort((a, b) => scorePlace(b) - scorePlace(a));
  if (!picks.length) {
    host.innerHTML = '<div class="empty-state">No spots match those filters. Try switching one off.</div>';
    return;
  }
  host.innerHTML = picks.slice(0, 3).map(place => {
    const heat = heatFor(place.occupancy);
    return `<article class="spot-card" data-place="${place.id}" tabindex="0" role="button" aria-label="View ${place.name}">
      <div class="spot-thumb thumb-${place.type}">${iconFor(place)}</div>
      <div class="spot-info"><div class="spot-title">${place.name}</div><div class="spot-subtitle">${place.noise} · ${place.walk} min walk</div>
      <div class="spot-meta"><span class="occupancy-label heat-text-${heat.name}"><i class="occupancy-dot heat-${heat.name}"></i>${place.occupancy}% ${heat.label.toLowerCase()}</span><span>${place.outlets ? 'ϟ Outlets' : ''}</span></div></div>
      <span class="match-score">${scorePlace(place)}% match</span><button class="heart-button ${place.favorite ? 'saved' : ''}" data-heart="${place.id}" aria-label="${place.favorite ? 'Unsave' : 'Save'} ${place.name}">${place.favorite ? '♥' : '♡'}</button></article>`;
  }).join('');
  $$('#recommendations .spot-card').forEach(card => {
    card.addEventListener('click', event => { if (!event.target.closest('[data-heart]')) openDetail(card.dataset.place); });
    card.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openDetail(card.dataset.place); } });
  });
  $$('#recommendations [data-heart]').forEach(button => button.addEventListener('click', event => { event.stopPropagation(); toggleFavorite(button.dataset.heart); }));
}

function renderSaved() {
  const saved = places.filter(place => place.favorite).sort((a, b) => a.occupancy - b.occupancy);
  $$('.saved-count').forEach(count => count.textContent = saved.length);
  $('.nav-count').textContent = saved.length;
  const host = $('.saved-list');
  host.innerHTML = saved.map(place => {
    const heat = heatFor(place.occupancy);
    return `<article class="saved-item" data-place="${place.id}"><div class="saved-icon ${place.type === 'library' ? 'library-icon' : place.type === 'hall' ? 'hall-icon' : 'lounge-icon'}">${iconFor(place)}</div>
      <div class="saved-copy"><b>${place.name}</b><span>${place.type === 'hall' ? 'Group friendly' : place.light ? 'Bright' : place.noise} · ${place.walk} min walk</span></div>
      <div class="saved-heat"><b class="heat-text-${heat.name}">${place.occupancy}%</b><span>${heat.label}</span></div>
      <button class="heart-button saved-heart" data-heart="${place.id}" aria-label="Remove ${place.name} from saved">♥</button></article>`;
  }).join('') || '<div class="empty-state">Save a study spot to find it here.</div>';
  $$('.saved-item').forEach(card => card.addEventListener('click', event => { if (!event.target.closest('[data-heart]')) openDetail(card.dataset.place); }));
  $$('.saved-heart').forEach(button => button.addEventListener('click', event => { event.stopPropagation(); toggleFavorite(button.dataset.heart); }));
}

function renderMap() {
  $$('.map-marker').forEach(marker => {
    const place = places.find(item => item.id === marker.dataset.place);
    if (!place) return;
    const heat = heatFor(place.occupancy);
    marker.querySelector('b').textContent = `${place.occupancy}%`;
    marker.style.setProperty('--heat-rgb', heat.rgb);
    marker.dataset.heat = heat.name;
    marker.classList.toggle('filtered-out', !matchesQuickFilters(place));
    marker.setAttribute('aria-label', `${place.name}, ${place.occupancy}% occupied, ${heat.label}`);
    marker.onclick = () => openDetail(place.id);
  });
}

function renderSmartAlternative() {
  const crowded = places.map(place => ({place, predicted:Math.max(place.occupancy, estimateOccupancy(place, 1))}))
    .filter(item => item.predicted >= 65).sort((a, b) => b.predicted - a.predicted)[0];
  if (!crowded) { $('#smart-alternative').innerHTML = ''; return; }
  const source = crowded.place;
  const alternative = places.filter(place => place.id !== source.id && matchesPersonalPreferences(place))
    .sort((a, b) => scorePlace(b) - scorePlace(a))[0]
    || places.filter(place => place.id !== source.id).sort((a, b) => scorePlace(b) - scorePlace(a))[0];
  if (!alternative) { $('#smart-alternative').innerHTML = ''; return; }
  const heat = heatFor(alternative.occupancy);
  $('#smart-alternative').innerHTML = `<div class="alt-heading"><span>✳ SMART ALTERNATIVE</span><span class="alt-alert">${crowded.predicted}% expected</span></div>
    <p><b>${source.name} could be crowded by arrival.</b> Your preferences point to this better-fit option:</p>
    <button class="alt-place" id="alternative-open" data-place="${alternative.id}"><span class="alt-place-icon">${iconFor(alternative)}</span><span class="alt-place-copy"><b>${alternative.name}</b><small>${alternative.noise} · ${alternative.walk} min walk</small></span><span class="alt-occupancy heat-text-${heat.name}">${alternative.occupancy}%<small>${heat.label}</small></span><span class="alt-arrow">→</span></button>`;
  $('#alternative-open').addEventListener('click', () => openDetail(alternative.id));
}

function renderForecast() {
  const place = places.find(item => item.id === $('#forecast-place').value) || places[0];
  const selectedHorizon = Number($('.arrival-chip.selected')?.dataset.horizon || 1);
  const arrivalEstimate = estimateOccupancy(place, selectedHorizon);
  const openSeats = Math.max(0, Math.round(place.seats * (100 - arrivalEstimate) / 100));
  const heat = heatFor(arrivalEstimate);
  $('#arrival-result').innerHTML = `<span>Estimated occupancy in ${selectedHorizon === .5 ? '30 minutes' : `${selectedHorizon} ${selectedHorizon === 1 ? 'hour' : 'hours'}`}</span><b class="heat-text-${heat.name}">${arrivalEstimate}% · ${heat.label.toLowerCase()}</b><small>About ${openSeats} open seats expected</small>`;
  const direction = arrivalEstimate < place.occupancy ? 'quieter' : arrivalEstimate > place.occupancy ? 'busier' : 'about the same';
  $('#forecast-insight-title').textContent = `${place.name} should be ${direction}`;
  $('#forecast-insight-copy').textContent = `${place.occupancy}% now · around ${arrivalEstimate}% when you arrive`;
  const values = [0, .5, 1, 2, 3, 4].map(hours => hours === 0 ? place.occupancy : estimateOccupancy(place, hours));
  const points = values.map((value, index) => [index * 136, 145 - value * 1.2]);
  const line = points.map(([x, y]) => `${x},${y}`).join(' L');
  $('#forecast-line-path').setAttribute('d', `M${line}`);
  $('#forecast-area-path').setAttribute('d', `M${line} L680,155 L0,155 Z`);
  $('#forecast-points').innerHTML = points.map(([cx, cy], index) => `<circle class="chart-point" cx="${cx}" cy="${cy}" r="${index === 0 ? 4 : 3}"/>`).join('');
  $('.chart-tooltip span').textContent = `In ${selectedHorizon === .5 ? '30 min' : `${selectedHorizon} hr`}`;
  $('.chart-tooltip b').textContent = `${arrivalEstimate}% occupied`;
  $('.chart-tooltip small').textContent = `${openSeats} seats estimated`;
}

function renderDirectory() {
  const host = $('#location-directory');
  let listed = places.filter(matchesQuickFilters).sort((a, b) => lowestFirst ? a.occupancy - b.occupancy : b.occupancy - a.occupancy);
  host.innerHTML = listed.map(place => {
    const heat = heatFor(place.occupancy);
    return `<button class="directory-row" data-place="${place.id}" style="--heat-rgb:${heat.rgb}" aria-label="${place.name}, ${place.occupancy}% occupied">
      <span class="directory-heat-dot"></span><span class="directory-copy"><b>${place.name}</b><small>${place.noise} · ${place.walk} min walk</small><span class="occupancy-track"><i style="width:${place.occupancy}%"></i></span></span>
      <span class="directory-value heat-text-${heat.name}"><b>${place.occupancy}%</b><small>${heat.label}</small></span></button>`;
  }).join('') || '<div class="empty-state">No spots match the current search.</div>';
  $$('#location-directory .directory-row').forEach(button => button.addEventListener('click', () => openDetail(button.dataset.place)));
  const average = Math.round(places.reduce((total, place) => total + place.occupancy, 0) / places.length);
  $('.summary-number').innerHTML = `${average}<span>%</span>`;
  $('.summary-meter i').style.width = `${average}%`;
}

function renderAll() {
  renderRecommendations(); renderSaved(); renderMap(); renderDirectory(); renderForecast();
  const count = places.filter(matchesQuickFilters).length;
  $('.result-count').textContent = `· ${count} ${count === 1 ? 'location' : 'locations'}`;
}
function setView(name) {
  $$('.view').forEach(view => view.classList.toggle('active', view.id === `view-${name}`));
  $$('.nav-link').forEach(button => {
    const selected = button.dataset.view === name;
    button.classList.toggle('active', selected);
    if (selected) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
  });
  $$('.mobile-tabs [data-view]').forEach(button => {
    const selected = button.dataset.view === name;
    button.classList.toggle('active', selected);
    button.setAttribute('aria-selected', String(selected));
  });
  const mapPanel = $('#map-panel');
  const fullMap = name === 'map';
  (fullMap ? $('#map-full-slot') : $('#map-home-slot')).append(mapPanel);
  mapPanel.classList.toggle('full-map-panel', fullMap);
  const forecastPanel = $('#forecast-panel');
  if (name === 'forecast') $('#forecast-full-slot').append(forecastPanel);
  else $('.discover-shortcut').before(forecastPanel);
  forecastPanel.classList.toggle('forecast-full-panel', name === 'forecast');
  const label = name === 'map' ? 'Campus heatmap' : name === 'forecast' ? 'Crowd forecast' : name === 'saved' ? 'Saved spots' : 'Find a spot';
  $('.breadcrumb').innerHTML = `Discover <span>/</span> <b>${label}</b>`;
  renderDirectory();
}

function toggleFavorite(id) {
  const place = places.find(item => item.id === id);
  place.favorite = !place.favorite;
  renderRecommendations(); renderSaved();
  showToast(place.favorite ? `${place.name} saved to your shortlist` : `${place.name} removed from your shortlist`);
}

function openDetail(id) {
  const place = places.find(item => item.id === id);
  if (!place) return;
  const heat = heatFor(place.occupancy);
  $('#detail-title').textContent = place.name;
  $('#detail-location').textContent = `${place.building} · ${place.walk} min walk`;
  $('#detail-category').textContent = place.category;
  $('#detail-occupancy').textContent = `${place.occupancy}%`;
  $('.occupancy-pill').style.setProperty('--heat-rgb', heat.rgb);
  $('#detail-seats').textContent = `~${place.seats} seats available`;
  $('#detail-description').textContent = place.description;
  $('#detail-amenities').innerHTML = place.amenities.map(item => `<span class="amenity">${item}</span>`).join('');
  const expectedOccupancy = Math.max(place.occupancy, estimateOccupancy(place, 1));
  let detailAlternative = $('#detail-alternative');
  if (!detailAlternative) {
    detailAlternative = document.createElement('div');
    detailAlternative.id = 'detail-alternative';
    $('#detail-amenities').after(detailAlternative);
  }
  if (expectedOccupancy >= 65) {
    const alternative = places.filter(item => item.id !== place.id && matchesPersonalPreferences(item))
      .sort((a, b) => scorePlace(b) - scorePlace(a))[0]
      || places.filter(item => item.id !== place.id).sort((a, b) => scorePlace(b) - scorePlace(a))[0];
    detailAlternative.hidden = !alternative;
    if (alternative) detailAlternative.innerHTML = `<span>✳ SMART BACKUP · ${expectedOccupancy}% expected here in 1 hour</span><button type="button" data-detail-alt="${alternative.id}"><b>${alternative.name}</b><small>${alternative.occupancy}% full · ${alternative.noise} · ${alternative.walk} min walk</small><i>→</i></button>`;
  } else {
    detailAlternative.hidden = true;
    detailAlternative.innerHTML = '';
  }
  detailAlternative.querySelector('[data-detail-alt]')?.addEventListener('click', event => openDetail(event.currentTarget.dataset.detailAlt));
  $('#detail-image').style.background = place.type === 'library' ? 'linear-gradient(140deg,#dff1df,#bce5d0 52%,#edf0c7)' : place.type === 'hall' ? 'linear-gradient(140deg,#ffedc7,#f4d9a9 52%,#e8eccb)' : 'linear-gradient(140deg,#f7e5c6,#d9edcc 52%,#ebf2bf)';
  $('#detail-image-emoji').textContent = iconFor(place);
  const heart = $('.detail-heart');
  heart.textContent = place.favorite ? '♥' : '♡';
  heart.classList.toggle('saved', place.favorite);
  heart.onclick = () => { toggleFavorite(id); heart.textContent = place.favorite ? '♥' : '♡'; heart.classList.toggle('saved', place.favorite); };
  $$('.rating-button').forEach(button => button.classList.remove('selected'));
  $('#detail-modal').classList.add('open');
  $('#detail-modal').setAttribute('aria-hidden', 'false');
}

function closeModal(modal) { modal.classList.remove('open'); modal.setAttribute('aria-hidden', 'true'); }
function openPreferences() {
  $('#pref-noise').value = preferences.noise;
  $('#pref-space').value = preferences.space;
  $('#pref-distance').value = String(preferences.distance);
  $('#pref-outlets').checked = preferences.outlets;
  $('#pref-light').checked = preferences.light;
  $('#pref-crowds').checked = preferences.crowds;
  $('#preferences-modal').classList.add('open');
  $('#preferences-modal').setAttribute('aria-hidden', 'false');
}

$$('[data-view]').forEach(button => button.addEventListener('click', () => setView(button.dataset.view)));
$('#preferences-open').addEventListener('click', openPreferences);
$('#map-preferences-open').addEventListener('click', openPreferences);
$('#save-preferences').addEventListener('click', () => {
  preferences = {noise:$('#pref-noise').value, space:$('#pref-space').value, distance:Number($('#pref-distance').value), outlets:$('#pref-outlets').checked, light:$('#pref-light').checked, crowds:$('#pref-crowds').checked};
  renderAll(); closeModal($('#preferences-modal')); showToast('Your study style is saved. Picks updated!');
});
$$('[data-close]').forEach(button => button.addEventListener('click', () => closeModal(button.closest('.modal-backdrop'))));
$$('.modal-backdrop').forEach(modal => modal.addEventListener('click', event => { if (event.target === modal) closeModal(modal); }));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') $$('.modal-backdrop.open').forEach(closeModal);
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setView('discover'); $('#search-input').focus(); }
});
$$('.filter-chip').forEach(button => button.addEventListener('click', () => {
  const filter = button.dataset.filter;
  if (activeFilters.has(filter)) { activeFilters.delete(filter); button.classList.remove('selected'); }
  else { activeFilters.add(filter); button.classList.add('selected'); }
  renderAll();
}));
$('#search-input').addEventListener('input', event => {
  searchQuery = event.target.value.trim().toLowerCase();
  renderAll();
});
$('#map-expand').addEventListener('click', () => {
  const map = $('#map-canvas'); map.classList.toggle('expanded');
  $('#map-expand').innerHTML = map.classList.contains('expanded') ? '⛶ <span>Collapse map</span>' : '⛶ <span>Expand map</span>';
});
let zoom = 0;
$('#zoom-in').addEventListener('click', () => { zoom = Math.min(1, zoom + 1); $('#map-canvas').classList.toggle('zoomed', zoom > 0); $('#map-canvas').classList.remove('zoomed-out'); });
$('#zoom-out').addEventListener('click', () => { zoom = Math.max(-1, zoom - 1); $('#map-canvas').classList.toggle('zoomed-out', zoom < 0); $('#map-canvas').classList.remove('zoomed'); });
$('#locate').addEventListener('click', () => { $('#map-canvas').classList.add('locating'); setTimeout(() => $('#map-canvas').classList.remove('locating'), 1600); });
$('#sort-occupancy').addEventListener('click', () => { lowestFirst = !lowestFirst; $('#sort-occupancy').textContent = lowestFirst ? 'Lowest first ↓' : 'Highest first ↓'; renderDirectory(); });
$('#forecast-place').addEventListener('change', renderForecast);
$$('.arrival-chip').forEach(button => button.addEventListener('click', () => {
  $$('.arrival-chip').forEach(chip => { chip.classList.toggle('selected', chip === button); chip.setAttribute('aria-pressed', String(chip === button)); });
  renderForecast();
}));
$('#detail-go').addEventListener('click', () => showToast('Directions are ready in your campus map.'));
$('#see-all').addEventListener('click', () => { activeFilters.clear(); $$('.filter-chip').forEach(button => button.classList.remove('selected')); searchQuery = ''; $('#search-input').value = ''; renderAll(); showToast('Showing your best available matches'); });
$('#map-details').addEventListener('click', () => setView('map'));
$('.round-arrow').addEventListener('click', () => { const first = $('#recommendations .spot-card'); if (first) openDetail(first.dataset.place); });
$$('.rating-button').forEach(button => button.addEventListener('click', () => {
  button.classList.add('selected');
  const place = places.find(item => item.name === $('#detail-title').textContent);
  if (place) { place.match = button.dataset.rating === 'love' ? Math.min(99, place.match + 2) : Math.max(30, place.match - 8); if (button.dataset.rating === 'meh') place.favorite = false; renderAll(); }
  showToast(button.dataset.rating === 'love' ? 'Thanks! We’ll find more spots like this.' : 'Got it. We’ll tune your future picks.');
}));

renderAll();
