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
function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}
function appendPhoto(parent, photo) {
  const figure = element('figure', 'memory-photo');
  if (photo.src) {
    const image = element('img');
    image.src = photo.src;
    image.alt = photo.alt || '';
    figure.append(image);
  } else {
    figure.append(element('p', 'photo-placeholder', 'Hier findet bald ein Foto seinen Platz. ♡'));
  }
  if (photo.caption) figure.append(element('figcaption', '', photo.caption));
  parent.append(figure);
}
function renderDoorContent(item) {
  const container = $('door-content');
  const type = item.type || 'text';
  $('door-dialog').dataset.type = type;
  if (type === 'letter') {
    const letter = element('div', 'letter');
    if (item.greeting) letter.append(element('p', 'letter-greeting', item.greeting));
    letter.append(element('p', 'letter-body', item.text));
    if (item.signature) letter.append(element('p', 'letter-signature', item.signature));
    container.append(letter);
    $('door-text').hidden = true;
  }
  if (type === 'photo') appendPhoto(container, item.image);
  if (type === 'voucher') {
    const voucher = element('section', 'voucher');
    voucher.append(element('p', 'eyebrow', 'DEIN GUTSCHEIN'));
    voucher.append(element('h3', '', item.voucher.headline));
    const details = element('ul', 'voucher-details');
    for (const detail of item.voucher.details) details.append(element('li', '', detail));
    voucher.append(details);
    if (item.voucher.note) voucher.append(element('p', 'voucher-note', item.voucher.note));
    container.append(voucher);
  }
  if (type === 'audio') renderMusicBox(container, item);
  if (type === 'quiz') renderQuiz(container, item);
  if (type === 'gallery') renderGallery(container, item.photos);
}
function renderQuiz(container, item) {
  let questionIndex = 0;
  let score = 0;
  const quiz = element('section', 'quiz');
  container.append(quiz);
  function showQuestion() {
    quiz.replaceChildren();
    const question = item.questions[questionIndex];
    quiz.append(element('p', 'quiz-progress', 'Frage ' + (questionIndex + 1) + ' von ' + item.questions.length));
    const heading = element('h3', '', question.question);
    heading.tabIndex = -1;
    quiz.append(heading);
    const answers = element('div', 'quiz-answers');
    const feedback = element('p', 'quiz-feedback');
    feedback.setAttribute('role', 'status');
    const next = element('button', 'primary', questionIndex === item.questions.length - 1 ? 'Ergebnis ansehen' : 'Nächste Frage');
    next.type = 'button';
    next.hidden = true;
    question.answers.forEach((answer, index) => {
      const button = element('button', 'answer-button', answer);
      button.type = 'button';
      button.addEventListener('click', () => {
        for (const option of answers.children) option.disabled = true;
        const correct = index === question.correctAnswer;
        if (correct) score++;
        answers.children[question.correctAnswer].classList.add('correct-answer');
        button.classList.add('selected-answer');
        feedback.textContent = (correct ? 'Richtig! ' : 'Die richtige Antwort ist „' + question.answers[question.correctAnswer] + '“. ') + question.explanation;
        next.hidden = false;
      });
      answers.append(button);
    });
    next.addEventListener('click', () => {
      questionIndex++;
      if (questionIndex < item.questions.length) {
        showQuestion();
        return;
      }
      quiz.replaceChildren();
      const result = element('h3', '', score + ' von ' + item.questions.length + ' richtig');
      result.tabIndex = -1;
      quiz.append(result, element('p', 'quiz-completion', item.completionText));
      const restart = element('button', 'secondary-button', 'Noch einmal spielen');
      restart.type = 'button';
      restart.addEventListener('click', () => {
        questionIndex = 0;
        score = 0;
        showQuestion();
      });
      quiz.append(restart);
      result.focus();
    });
    quiz.append(answers, feedback, next);
    if ($('door-dialog').open) heading.focus();
  }
  showQuestion();
}
function renderGallery(container, photos) {
  const progress = element('p', 'gallery-progress', '0 von ' + photos.length + ' Bildern aufgedeckt');
  progress.setAttribute('role', 'status');
  const gallery = element('div', 'reveal-gallery');
  let revealedCount = 0;
  photos.forEach((photo, index) => {
    const card = element('section', 'reveal-card');
    const button = element('button', 'reveal-button', 'Bild ' + (index + 1) + ' aufdecken');
    button.type = 'button';
    button.setAttribute('aria-expanded', 'false');
    const content = element('div', 'revealed-photo');
    content.id = 'gallery-photo-' + index;
    content.hidden = true;
    button.setAttribute('aria-controls', content.id);
    let revealed = false;
    button.addEventListener('click', () => {
      revealed = !revealed;
      revealedCount += revealed ? 1 : -1;
      content.replaceChildren();
      if (revealed) appendPhoto(content, photo);
      content.hidden = !revealed;
      button.textContent = 'Bild ' + (index + 1) + (revealed ? ' verbergen' : ' aufdecken');
      button.setAttribute('aria-expanded', String(revealed));
      progress.textContent = revealedCount + ' von ' + photos.length + ' Bildern aufgedeckt';
    });
    card.append(button, content);
    gallery.append(card);
  });
  container.append(progress, gallery);
}

function clearDoorContent() {
  for (const audio of $('door-content').querySelectorAll('audio')) {
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
  }
  $('door-content').replaceChildren();
}
function renderMusicBox(container, item) {
  let turns = 0;
  const box = element('section', 'music-box');
  const wind = element('button', 'wind-button');
  wind.type = 'button';
  wind.setAttribute('aria-label', 'Spieluhr aufziehen');
  const artwork = element('img', 'music-box-art');
  artwork.src = './assets/gothic-music-box.png';
  artwork.alt = 'Silberne Spieluhr mit Rosenornamenten, violettem Samt und Aufziehschlüssel';
  artwork.draggable = false;
  const key = element('img', 'music-box-key');
  key.src = artwork.src;
  key.alt = '';
  key.setAttribute('aria-hidden', 'true');
  key.draggable = false;
  wind.append(artwork, key);
  const instruction = element('p', 'wind-instruction', 'Klicke auf die Spieluhr, um sie aufzuziehen.');
  const status = element('p', 'wind-status');
  status.setAttribute('role', 'status');
  const audio = element('audio', 'music-box-audio');
  audio.preload = 'none';
  audio.controls = true;
  audio.hidden = true;
  audio.setAttribute('aria-label', item.audio.title);
  if (item.audio.src) audio.src = item.audio.src;
  const title = element('p', 'audio-title', item.audio.title);
  title.hidden = true;
  function updatePlayback() {
    box.classList.toggle('is-playing', !audio.paused && !audio.ended);
  }
  audio.addEventListener('play', () => {
    updatePlayback();
    status.textContent = 'Die Spieluhr spielt für dich. ♡';
  });
  audio.addEventListener('pause', updatePlayback);
  audio.addEventListener('ended', () => {
    updatePlayback();
    status.textContent = 'Du kannst den Ton über den Player noch einmal anhören.';
  });
  audio.addEventListener('error', () => {
    if (!audio.isConnected || !audio.hasAttribute('src')) return;
    box.classList.remove('is-playing');
    status.textContent = 'Diese Audiodatei konnte nicht abgespielt werden. Bitte versuche eine andere Datei oder ein anderes Audioformat.';
  });
  wind.addEventListener('click', () => {
    if (turns >= 10) return;
    turns++;
    // Die zweite Bildebene zeigt ausschließlich den Schlüssel.
    key.style.transform = 'rotateX(' + turns * 180 + 'deg)';
    if (turns < 10) return;
    wind.disabled = true;
    instruction.textContent = 'Ganz aufgezogen.';
    if (!item.audio.src) {
      status.textContent = 'Die Spieluhr ist bereit. Dein Sound wird hier noch ergänzt.';
      return;
    }
    audio.hidden = false;
    title.hidden = false;
    // play() bleibt direkt im Klick-Ereignis, damit mobile Browser den Start erlauben.
    audio.play().catch(error => {
      if (audio.isConnected && audio.hasAttribute('src')) {
        status.textContent = error.name === 'NotAllowedError'
          ? 'Drücke im Player auf Play, um deinen Sound zu starten.'
          : 'Diese Audiodatei konnte nicht abgespielt werden. Bitte prüfe Datei und Audioformat.';
      }
    });
  });
  box.append(wind, instruction, status, title, audio);
  container.append(box);
}

function openDoor(day) {
  clearDoorContent();
  $('door-text').hidden = false;
  delete $('door-dialog').dataset.type;
  $('door-date').textContent = day + '. DEZEMBER';
  if (!available(day)) {
    $('door-title').textContent = 'Ein bisschen Vorfreude …';
    $('door-text').textContent = 'Diese Überraschung wartet ab dem ' + day + '. Dezember auf dich.';
  } else {
    const item = contents.find(item => item.day === day);
    $('door-title').textContent = item.title;
    $('door-text').textContent = item.text;
    renderDoorContent(item);
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
  clearDoorContent();
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
$('door-dialog').addEventListener('close', () => {
  clearDoorContent();
  $('door-text').textContent = '';
});
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
