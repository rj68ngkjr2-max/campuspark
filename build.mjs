import {build} from 'esbuild';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
await build({entryPoints:['source-app.js'],bundle:true,format:'esm',target:['safari16','chrome110'],outfile:'app.js',minify:true});
const hash=createHash('sha256');for(const f of ['app.js','styles.css','index.html'])hash.update(await readFile(f));
await writeFile('sw.js',(await readFile('source-sw.js','utf8')).replace('__VERSION__',hash.digest('hex').slice(0,12)));
console.log('CampusPark ready for GitHub Pages (main / root).');
