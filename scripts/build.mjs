import {readFile, writeFile, mkdir, copyFile} from 'node:fs/promises';
import {webcrypto} from 'node:crypto';
import {prepareContent} from './content.mjs';

const password = process.env.CALENDAR_PASSWORD;
if (!password || password.length < 12) throw new Error('CALENDAR_PASSWORD muss mindestens 12 Zeichen lang sein.');
let source;
try {
  source = await readFile('content.local.json', 'utf8');
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
  source = await readFile('content.example.json', 'utf8');
}
const content = await prepareContent(JSON.parse(source.replace(/^\uFEFF/, '')));
const salt = webcrypto.getRandomValues(new Uint8Array(16));
const iv = webcrypto.getRandomValues(new Uint8Array(12));
const iterations = 600000;
const material = await webcrypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveKey']);
const key = await webcrypto.subtle.deriveKey({name:'PBKDF2',salt,iterations,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['encrypt']);
const data = await webcrypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(JSON.stringify(content)));
const base64 = value => Buffer.from(value).toString('base64');
const bundle = JSON.stringify({version:1,iterations,salt:base64(salt),iv:base64(iv),data:base64(data)});
// Nur verschlüsselte Daten werden in die veröffentlichte HTML-Datei eingebettet.
const sourceHtml = await readFile('index.html','utf8');
const html = sourceHtml.replace(/(<script id="calendar-data" type="application\/json">)[\s\S]*?(<\/script>)/, (_, start, end) => start + bundle + end);
if (html === sourceHtml) throw new Error('Einbettung der Kalenderdaten fehlgeschlagen.');
await mkdir('dist',{recursive:true});
await writeFile('dist/calendar.enc.json',bundle);
await writeFile('index.html',html);
for (const file of ['index.html','style.css','app.js']) await copyFile(file,'dist/' + file);
await writeFile('dist/.nojekyll','');
console.log('Kalender mit 24 verschlüsselten Türchen in dist erstellt.');
