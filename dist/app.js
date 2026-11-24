const $ = (id) => document.getElementById(id);
// Entfernt Passwortparameter aus früheren Formularaufrufen.
try {
  const cleanUrl = new URL(location.href);
  if (cleanUrl.searchParams.has('password')) {
    cleanUrl.searchParams.delete('password');
    history.replaceState(null, '', cleanUrl);
  }
} catch { /* Manche Browser begrenzen History-Zugriffe auf lokale Dateien. */ }
const preview = new URLSearchParams(location.search).get('vorschau') === '1';
const storageKey = preview ? 'chantal-advent-2026-preview' : 'chantal-advent-2026-opened';
let contents = null;
let opened = new Set();
try {
  const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
  if (Array.isArray(saved)) opened = new Set(saved.filter(day => Number.isInteger(day) && day >= 1 && day <= 24));
} catch { /* Der Kalender funktioniert auch ohne lokalen Speicher. */ }
const decode = value => Uint8Array.from(atob(value), char => char.charCodeAt(0));
function berlinDate() {
  return new Intl.DateTimeFormat('sv-SE', {timeZone:'Europe/Berlin', year:'numeric', month:'2-digit', day:'2-digit'}).format(new Date());
}
function available(day) {
  return preview || berlinDate() >= '2026-12-' + String(day).padStart(2,'0');
}
function renderCalendar() {
  const today = berlinDate();
  const count = opened.size;
  $('calendar-status').textContent = today < '2026-12-01' && !preview ? 'Die Vorfreude beginnt. Am 1. Dezember geht’s los.' : count + ' von 24 kleinen Überraschungen entdeckt';
  $('preview-note').hidden = !preview;
  $('doors').replaceChildren();
  const ornaments = ['✧','❋','♡','✦','❄','✧'];
  for (let day = 1; day <= 24; day++) {
    const button = document.createElement('button');
    button.className = 'door';
    button.dataset.day = day;
    const isOpen = opened.has(day);
    const isToday = today === '2026-12-' + String(day).padStart(2,'0');
    if (isOpen) button.classList.add('opened');
    if (isToday) button.classList.add('today');
    const status = isOpen ? 'Noch einmal ansehen' : available(day) ? (isToday ? 'Für dich, heute' : 'Türchen öffnen') : 'Ab ' + day + '. Dezember';
    button.setAttribute('aria-label', 'Türchen ' + day + ', ' + status);
    for (const [className, text] of [['door-ornament',ornaments[(day-1)%6]],['door-number',String(day).padStart(2,'0')],['door-state',status]]) {
      const span = document.createElement('span');
      span.className = className;
      span.textContent = text;
      if (className === 'door-ornament') span.setAttribute('aria-hidden','true');
      button.append(span);
    }
    button.addEventListener('click', () => openDoor(day));
    $('doors').append(button);
  }
}
function openDoor(day) {
  $('door-date').textContent = day + '. DEZEMBER';
  if (!available(day)) {
    $('door-title').textContent = 'Ein bisschen Vorfreude …';
    $('door-text').textContent = 'Diese Überraschung wartet ab dem ' + day + '. Dezember auf dich.';
  } else {
    const item = contents.find(item => item.day === day);
    $('door-title').textContent = item.title;
    $('door-text').textContent = item.text;
    opened.add(day);
    try { localStorage.setItem(storageKey, JSON.stringify([...opened])); } catch {}
    renderCalendar();
  }
  $('door-dialog').showModal();
}
$('show-password').addEventListener('click', () => {
  const show = $('password').type === 'password';
  $('password').type = show ? 'text' : 'password';
  $('show-password').textContent = show ? 'Verbergen' : 'Zeigen';
  $('show-password').setAttribute('aria-pressed',String(show));
  $('show-password').setAttribute('aria-label',show ? 'Passwort verbergen' : 'Passwort anzeigen');
});
$('login-form').addEventListener('submit', async event => {
  event.preventDefault();
  $('login-error').textContent = '';
  $('unlock').disabled = true;
  $('unlock').textContent = 'Dein Kalender wird geöffnet …';
  let bundle;
  try {
    if (!crypto.subtle) throw new Error('secure-context');
    bundle = JSON.parse($('calendar-data').textContent);
    if (!bundle?.data) throw new Error('missing-content');
  } catch {
    $('login-error').textContent = 'Der Kalender konnte nicht geladen werden. Bitte verwende eine neu gebaute Version in einem aktuellen Browser.';
    $('unlock').disabled = false;
    $('unlock').textContent = 'Meinen Kalender öffnen ✧';
    return;
  }
  try {
    const material = await crypto.subtle.importKey('raw',new TextEncoder().encode($('password').value),'PBKDF2',false,['deriveKey']);
    const key = await crypto.subtle.deriveKey({name:'PBKDF2',salt:decode(bundle.salt),iterations:bundle.iterations,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['decrypt']);
    const plaintext = await crypto.subtle.decrypt({name:'AES-GCM',iv:decode(bundle.iv)},key,decode(bundle.data));
    contents = JSON.parse(new TextDecoder().decode(plaintext));
    $('password').value = '';
    $('password').type = 'password';
    $('show-password').textContent = 'Zeigen';
    $('show-password').setAttribute('aria-pressed','false');
    $('show-password').setAttribute('aria-label','Passwort anzeigen');
    $('login').hidden = true;
    $('calendar').hidden = false;
    $('logout').hidden = false;
    renderCalendar();
    $('doors').firstElementChild.focus({preventScroll:true});
  } catch {
    $('login-error').textContent = 'Das Passwort passt noch nicht. Versuch es noch einmal.';
    $('password').focus();
  } finally {
    $('unlock').disabled = false;
    $('unlock').textContent = 'Meinen Kalender öffnen ✧';
  }
});
$('logout').addEventListener('click', () => {
  contents = null;
  $('doors').replaceChildren();
  $('door-title').textContent = '';
  $('door-text').textContent = '';
  $('calendar').hidden = true;
  $('logout').hidden = true;
  $('login').hidden = false;
  $('password').focus();
});
function closeDoor() {
  const day = Number($('door-date').textContent.split('.')[0]);
  $('door-dialog').close();
  document.querySelector('[data-day="' + day + '"]')?.focus();
}
$('close-dialog').addEventListener('click',closeDoor);
$('back-calendar').addEventListener('click',closeDoor);
$('door-dialog').addEventListener('click', event => { if (event.target === $('door-dialog') && (event.clientX < event.target.getBoundingClientRect().left || event.clientX > event.target.getBoundingClientRect().right || event.clientY < event.target.getBoundingClientRect().top || event.clientY > event.target.getBoundingClientRect().bottom)) closeDoor(); });
let renderedDate = berlinDate();
setInterval(() => {
  const currentDate = berlinDate();
  if (contents && !$('door-dialog').open && currentDate !== renderedDate) {
    renderedDate = currentDate;
    renderCalendar();
  }
},60000);


$('unlock').disabled = false;
