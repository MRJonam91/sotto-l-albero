const {readFileSync,writeFileSync}=require('node:fs');
const {join}=require('node:path');
const libraries=[
  ['Matter.js 0.20.0','matter-js/build/matter.min.js'],
  ['interact.js 1.10.27','interactjs/dist/interact.min.js'],
  ['Anime.js 3.2.2','animejs/lib/anime.min.js'],
];
const bundled=libraries.map(([name,file])=>{
  const code=readFileSync(join(__dirname,'node_modules',file),'utf8')
    .replace(/\/\/# sourceMappingURL=.*$/gm,'')
    .replace(/<\/script/gi,'<\\/script');
  return '<script data-library="'+name+'">\n'+code+'\n</script>\n';
}).join('');
let html=bundled+'<script>\n'+readFileSync(join(__dirname,'profile.js'),'utf8')+'\n</script>\n'+readFileSync(join(__dirname,'shell.html'),'utf8');
for(const id of['f1','f2','f3','c1','c2','c3','c4','c5'])html=html.replace('%%'+id.toUpperCase()+'%%',()=>readFileSync(join(__dirname,'games',id+'.html'),'utf8'));
html+='\n<style>\n'+readFileSync(join(__dirname,'mobile-v2.css'),'utf8')+'\n</style>\n';
writeFileSync(join(__dirname,'preview.html'),html);
writeFileSync(join(__dirname,'index.html'),'<!doctype html>\n<html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sotto l’Albero · Otto nuove demo</title><style>body{margin:0;padding:16px;background:#e3dfd2}@media(max-width:480px){body{padding:0}}</style></head><body>\n'+html+'\n</body></html>');
console.log('Generate preview.html e index.html: otto giochi con librerie incluse, nessuna dipendenza di rete.');
