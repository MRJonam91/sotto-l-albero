const {readFileSync,writeFileSync}=require('node:fs');
const {join}=require('node:path');
const files={PONTE:'ponte-delle-tre-vie.html',PIAZZA:'piazza-che-reagisce.html',VAGONE:'vagone-degli-scambi.html',CASA:'casa-che-accoglie.html',BOTTEGA:'bottega-delle-meraviglie.html'};
let html=readFileSync(join(__dirname,'avventure-natale-shell.html'),'utf8');
for(const [key,file]of Object.entries(files))html=html.replace('%%'+key+'%%',()=>readFileSync(join(__dirname,file),'utf8'));
writeFileSync(join(__dirname,'cinque-avventure-riviste.html'),html);
console.log('Composte cinque anteprime indipendenti.');
