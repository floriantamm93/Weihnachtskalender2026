import {readFile, realpath} from 'node:fs/promises';
import path from 'node:path';

const types = new Set(['text', 'letter', 'photo', 'voucher', 'quiz', 'gallery']);
function requireText(value, label) {
  if (typeof value !== 'string') throw new Error(label + ' muss ein Text sein.');
}
async function preparePhoto(photo, imageRoot) {
  if (!photo || typeof photo !== 'object') throw new Error('Für jedes Foto wird ein Objekt mit src, alt und caption benötigt.');
  requireText(photo.src, 'Foto src');
  requireText(photo.alt, 'Foto alt');
  requireText(photo.caption, 'Foto caption');
  if (!photo.src) return {src:'', alt:photo.alt, caption:photo.caption};
  const root = await realpath(imageRoot);
  const file = await realpath(path.resolve(imageRoot, photo.src));
  const relative = path.relative(root, file);
  if (relative.startsWith('..' + path.sep) || relative === '..' || path.isAbsolute(relative)) {
    throw new Error('Bilder müssen im Ordner private-media liegen.');
  }
  const bytes = await readFile(file);
  let mime;
  if (bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) mime = 'image/png';
  else if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) mime = 'image/jpeg';
  else if (['GIF87a','GIF89a'].includes(bytes.toString('ascii',0,6))) mime = 'image/gif';
  else if (bytes.toString('ascii',0,4) === 'RIFF' && bytes.toString('ascii',8,12) === 'WEBP') mime = 'image/webp';
  if (!mime) throw new Error('Unterstützte Bildformate sind JPG, PNG, GIF und WebP.');
  return {src:'data:' + mime + ';base64,' + bytes.toString('base64'), alt:photo.alt, caption:photo.caption};
}
export async function prepareContent(content, imageRoot = path.resolve('private-media')) {
  if (!Array.isArray(content) || content.length !== 24 ||
      new Set(content.map(item => item?.day)).size !== 24) {
    throw new Error('Es werden genau 24 unterschiedliche Türchen benötigt.');
  }
  const result = [];
  for (const item of content) {
    if (!item || !Number.isInteger(item.day) || item.day < 1 || item.day > 24) throw new Error('Türchennummern müssen zwischen 1 und 24 liegen.');
    const type = item.type || 'text';
    if (!types.has(type)) throw new Error('Unbekannter Inhaltstyp in Türchen ' + item.day);
    requireText(item.title, 'Türchen ' + item.day + ' title');
    requireText(item.text, 'Türchen ' + item.day + ' text');
    const door = {day:item.day, type, title:item.title, text:item.text};
    if (type === 'letter') {
      requireText(item.greeting, 'greeting');
      requireText(item.signature, 'signature');
      door.greeting = item.greeting;
      door.signature = item.signature;
    }
    if (type === 'photo') door.image = await preparePhoto(item.image, imageRoot);
    if (type === 'gallery') {
      if (!Array.isArray(item.photos) || item.photos.length !== 5) throw new Error('Die Galerie benötigt genau fünf Fotos.');
      door.photos = [];
      for (const photo of item.photos) door.photos.push(await preparePhoto(photo, imageRoot));
    }
    if (type === 'voucher') {
      if (!item.voucher || !Array.isArray(item.voucher.details)) throw new Error('Dem Gutschein fehlen seine Details.');
      requireText(item.voucher.headline, 'Gutschein headline');
      requireText(item.voucher.note, 'Gutschein note');
      item.voucher.details.forEach(detail => requireText(detail, 'Gutscheindetail'));
      door.voucher = {headline:item.voucher.headline, details:item.voucher.details, note:item.voucher.note};
    }
    if (type === 'quiz') {
      if (!Array.isArray(item.questions) || item.questions.length !== 3) throw new Error('Das Quiz benötigt genau drei Fragen.');
      requireText(item.completionText, 'completionText');
      door.questions = item.questions.map(question => {
        if (!question || !Array.isArray(question.answers) || question.answers.length < 2) throw new Error('Jede Quizfrage benötigt mindestens zwei Antworten.');
        requireText(question.question, 'Quizfrage');
        requireText(question.explanation, 'Quizauflösung');
        question.answers.forEach(answer => requireText(answer, 'Quizantwort'));
        if (!Number.isInteger(question.correctAnswer) || question.correctAnswer < 0 || question.correctAnswer >= question.answers.length) throw new Error('correctAnswer muss auf eine vorhandene Antwort zeigen, beginnend bei 0.');
        return {question:question.question, answers:question.answers, correctAnswer:question.correctAnswer, explanation:question.explanation};
      });
      door.completionText = item.completionText;
    }
    result.push(door);
  }
  return result;
}
