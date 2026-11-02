import {build} from 'esbuild';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
const options={bundle:true,format:'esm',target:['safari16','chrome110'],minify:true};
await build({...options,entryPoints:['source-app.js'],outfile:'app.js'});
// Compile the same UI against a local adapter. Supabase never enters the demo graph.
const demoBuild=await build({...options,entryPoints:['demo-entry.js'],outfile:'demo.js',metafile:true,plugins:[{name:'isolated-demo',setup(b){
 b.onResolve({filter:/^\.\/backend\.js$/},()=>({path:resolve('demo-backend.js')}));
 b.onLoad({filter:/source-app\.js$/},async a=>({contents:(await readFile(a.path,'utf8')).replaceAll('campuspark.theme','campuspark.demo.theme'),loader:'js'}));
}}]});
if(Object.keys(demoBuild.metafile.inputs).some(f=>/supabase|auth-storage|(^|\/)config\.js$|(^|\/)backend\.js$/.test(f)))throw new Error('Live dependency found in demo');
const html=await readFile('source-index.html','utf8'),hash=createHash('sha256').update(html);
const csp="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://tile.openstreetmap.org; connect-src https://photon.komoot.io; object-src 'none'; base-uri 'self'; form-action 'none'; worker-src 'self'";
const demoHtml=html.replace('<meta charset="utf-8">','<meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="'+csp+'">').replaceAll('campuspark.theme','campuspark.demo.theme').replace('./app.js','./demo.js').replace('./manifest.webmanifest','./demo.webmanifest').replace('<title>CampusPark · DHBW Lörrach</title>','<title>CampusPark · Demo</title>').replace('content="CampusPark"','content="CampusPark Demo"').replace('</head>','<link rel="stylesheet" href="./demo.css"></head>');
hash.update(demoHtml);
for(const f of ['app.js','demo.js','demo.css','demo.webmanifest','styles.css','leaflet.css','source-sw.js','manifest.webmanifest','icon-180.png','icon-192.png','icon-512.png'])hash.update(await readFile(f));
const version=hash.digest('hex').slice(0,12);
const versioned=s=>s.replace(/\.\/(app\.js|demo\.js|demo\.css|styles\.css|leaflet\.css|manifest\.webmanifest|demo\.webmanifest)(?=")/g,'./$1?v='+version);
await writeFile('index.html',versioned(html));await writeFile('demo.html',versioned(demoHtml));
await writeFile('sw.js',(await readFile('source-sw.js','utf8')).replaceAll('__VERSION__',version));
console.log('CampusPark ready for GitHub Pages. Version '+version);
