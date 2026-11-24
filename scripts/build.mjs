import {readFile, writeFile, mkdir, copyFile} from 'node:fs/promises';
import {webcrypto} from 'node:crypto';
const password = process.env.CALENDAR_PASSWORD;
if (!password || password.length < 12) throw new Error('CALENDAR_PASSWORD muss mindestens 12 Zeichen lang sein.');
let content;
try { content = JSON.parse((await readFile('content.local.json','utf8')).replace(/^\uFEFF/,'')); }
catch(error) {
  if (error.code !== 'ENOENT') throw error;
  content = Array.from({length:24},(_,index) => ({day:index+1,title:'Hier wächst eine kleine Überraschung',text:'Dieses Türchen wird noch mit Liebe gefüllt. Bald wartet hier etwas ganz Persönliches auf dich, Chantal. ♡'}));
}
if (!Array.isArray(content) || content.length !== 24 || new Set(content.map(item => item.day)).size !== 24 || content.some(item => !Number.isInteger(item.day) || item.day < 1 || item.day > 24 || typeof item.title !== 'string' || typeof item.text !== 'string')) throw new Error('Es werden genau 24 Türchen mit day (1–24), title und text erwartet.');
const salt = webcrypto.getRandomValues(new Uint8Array(16));
const iv = webcrypto.getRandomValues(new Uint8Array(12));
const iterations = 600000;
const material = await webcrypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveKey']);
const key = await webcrypto.subtle.deriveKey({name:'PBKDF2',salt,iterations,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['encrypt']);
const data = await webcrypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(JSON.stringify(content)));
const base64 = value => Buffer.from(value).toString('base64');
await mkdir('dist',{recursive:true});
const bundle = JSON.stringify({version:1,iterations,salt:base64(salt),iv:base64(iv),data:base64(data)});
await writeFile('dist/calendar.enc.json',bundle);
// Eingebettete verschlüsselte Daten funktionieren auch unter file://.
const sourceHtml = await readFile('index.html','utf8');
const html = sourceHtml.replace(/(<script id="calendar-data" type="application\/json">)[\s\S]*?(<\/script>)/, (_, start, end) => start + bundle + end);
if (html === sourceHtml) throw new Error('Einbettung der Kalenderdaten fehlgeschlagen.');
await writeFile('index.html',html);
for (const file of ['index.html','style.css','app.js']) await copyFile(file,'dist/' + file);
await writeFile('dist/.nojekyll','');
console.log('Kalender mit 24 verschlüsselten Türchen in dist erstellt.');
