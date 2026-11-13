// Pemeriksaan rilis (opsional, butuh Node): node tools/cek-rilis.js
const fs=require('fs'),vm=require('vm'),path=require('path');process.chdir(path.join(__dirname,'..'));
vm.runInThisContext(fs.readFileSync('js/resources.js','utf8')+';globalThis.__R={APP_VERSION,CORE}');const{APP_VERSION,CORE}=globalThis.__R;let bad=0;const err=m=>{console.log('✗',m);bad++};
CORE.filter(f=>f!=='./').forEach(f=>fs.existsSync(f)||err('File di CORE tidak ada: '+f));
const html=fs.readFileSync('index.html','utf8');[...html.matchAll(/src="([^"]+\.js)"/g)].map(m=>m[1]).forEach(s=>CORE.includes(s)||err('Skrip di index.html belum masuk CORE: '+s));
const m=JSON.parse(fs.readFileSync('manifest.json','utf8'));m.icons.forEach(i=>fs.existsSync(i.src)||err('Ikon manifest tidak ada: '+i.src));
const rt=fs.statSync('js/resources.js').mtimeMs,newer=CORE.filter(f=>f!=='./'&&fs.existsSync(f)&&fs.statSync(f).mtimeMs>rt+1000&&f!=='js/resources.js');
if(newer.length)console.log('⚠ File lebih baru dari resources.js (apakah APP_VERSION sudah dinaikkan?):',newer.join(', '));
console.log(bad?`\n${bad} masalah.`:`✓ Rilis ${APP_VERSION}: ${CORE.length} resource konsisten.`);process.exit(bad?1:0)
