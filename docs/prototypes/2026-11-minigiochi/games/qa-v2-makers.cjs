// Standalone browser proof for the two disposable maker prototypes. No network.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('@playwright/test');
(async()=>{
 const html=['c1','c2'].map(id=>fs.readFileSync(path.join(__dirname,id+'.html'),'utf8')).join('\n');
 for(const m of html.matchAll(/<script>([\s\S]*?)<\/script>/g))new Function(m[1]);
 const libs=['interactjs/dist/interact.min.js','animejs/lib/anime.min.js'].map(x=>fs.readFileSync(path.join(__dirname,'../node_modules',x),'utf8'));
 const browser=await chromium.launch({headless:true,executablePath:path.resolve('.wrangler/browsers/chromium_headless_shell-1248/chrome-headless-shell-win64/chrome-headless-shell.exe')});
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:process.env.MAKERS_MOTION||'reduce'}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.setContent('<!doctype html><html lang="it"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Maker prototype QA</title><style>body{margin:0;font:16px system-ui;background:#f4efdf}.demo{max-width:900px;padding:12px;margin:auto}button{font:inherit}details{margin:12px 0}h2{font:30px Georgia}</style>'+libs.map(x=>'<script>'+x+'</script>').join('')+'<script>window.WinterProfile={cards:{},save(c){this.cards[c.game]=c},remove(g){delete this.cards[g]}}</script></head><body>'+html+'</body></html>');
 if(process.env.MAKERS_INTEGRATED){await page.goto(require('node:url').pathToFileURL(path.join(__dirname,'../index.html')).href);await page.locator('#wp-picker').selectOption('c1')}
 await page.evaluate(()=>{window.__makerProfileCards={};const original=window.WinterProfile;window.WinterProfile={...original,save(c){__makerProfileCards[c.game]=c;original?.save(c)},remove(g){delete __makerProfileCards[g];original?.remove(g)}}});
 if(process.env.MAKERS_SCREENSHOT_DIR){for(const id of ['c1','c2'])await page.locator('#g-'+id+' .scene').screenshot({path:path.join(process.env.MAKERS_SCREENSHOT_DIR,id+'-scene-mobile.png')})}
 const cdp=await context.newCDPSession(page),click=s=>page.locator(s).click(),text=s=>page.locator(s).textContent();
 async function touchDrag(from,to,{cancel=false,outside=false}={}){
   await page.locator(from).scrollIntoViewIfNeeded();
   if(!outside)await page.evaluate(({from,to})=>{const a=document.querySelector(from).getBoundingClientRect(),b=document.querySelector(to).getBoundingClientRect();scrollBy(0,(Math.min(a.top,b.top)+Math.max(a.bottom,b.bottom))/2-innerHeight/2)},{from,to});
   const a=await page.locator(from).boundingBox(),b=outside?{x:1,y:20,width:2,height:2}:await page.locator(to).boundingBox(),start={x:a.x+a.width/2,y:a.y+a.height/2},end={x:b.x+b.width/2,y:b.y+b.height/2};
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...start,id:1}]});
   for(let n=1;n<=12;n++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:start.x+(end.x-start.x)*n/12,y:start.y+(end.y-start.y)*n/12,id:1}]});
   await cdp.send('Input.dispatchTouchEvent',{type:cancel?'touchCancel':'touchEnd',touchPoints:[]});
   await page.waitForTimeout(480);
 }
 await touchDrag('#g-c1 [data-add="lamp"]','#g-c1 [data-slot="0"]',{cancel:true});
 assert.match(await text('#g-c1 [data-slot="0"]'),/Posto/,'Canceled touch leaves inventory empty');
 await touchDrag('#g-c1 [data-add="lamp"]','#g-c1 [data-slot="0"]',{outside:true});
 assert.match(await text('#g-c1 [data-slot="0"]'),/Posto/,'Outside drop leaves inventory empty');
 await touchDrag('#g-c1 [data-add="lamp"]','#g-c1 [data-slot="0"]');
 assert.match(await text('#g-c1 [data-slot="0"]'),/Lanterna/);
 await touchDrag('#g-c1 [data-add="cup"]','#g-c1 [data-slot="1"]');
 await click('#g-c1 [data-slot="0"]');await click('#g-c1 [data-slot="1"]');
 assert.match(await text('#c1-links'),/Lanterna.*appoggiare.*Tazza/);
 await click('#c1-scene-test');assert.match(await text('#c1-status'),/vento.*gira/i);
 await click('#c1-turn-left');await click('#c1-scene-test');assert.match(await text('#c1-status'),/svegliata/);
 await click('#c1-roof');await click('#c1-turn-center');await click('#c1-scene-test');assert.match(await text('#c1-status'),/svegliata/);
 await page.locator('#g-c1 details').first().evaluate(e=>e.open=true);await click('#c1-reset');
 for(const id of ['bell','spoon'])await click('#g-c1 [data-add="'+id+'"]');
 await click('#g-c1 [data-slot="0"]');await click('#g-c1 [data-slot="1"]');await click('#c1-turn-left');await click('#c1-scene-test');assert.match(await text('#c1-status'),/suono.*svegliata|svegliata.*suono/);
 await click('#c1-reset');for(const id of ['scarf','spoon','feather'])await click('#g-c1 [data-add="'+id+'"]');
 await click('#g-c1 [data-slot="0"]');await click('#g-c1 [data-slot="1"]');await click('#g-c1 [data-slot="1"]');await click('#g-c1 [data-slot="2"]');await click('#c1-turn-left');await click('#c1-scene-test');assert.match(await text('#c1-status'),/movimento.*svegliata|svegliata.*movimento/);
 await page.locator('#g-c1 details').nth(1).evaluate(e=>e.open=true);assert.equal(await page.locator('#c1-note').inputValue(),'');await page.locator('#c1-note').fill('Mi piace costruire con fili');await page.locator('#c1-meaning').selectOption({label:'Vorrei provarlo'});await click('#c1-confirm');assert.equal(await page.evaluate(()=>__makerProfileCards.c1.text),'Mi piace costruire con fili');await click('#c1-undo');assert.equal(await page.evaluate(()=>Object.hasOwn(__makerProfileCards,'c1')),false);
 if(process.env.MAKERS_INTEGRATED)await page.locator('#wp-picker').selectOption('c2');
 await touchDrag('#g-c2 [data-open="book"]','#g-c2 [data-kept="0"]',{cancel:true});assert.equal(await text('#c2-count'),'0/3');
 await touchDrag('#g-c2 [data-open="book"]','#g-c2 [data-kept="0"]',{outside:true});assert.equal(await text('#c2-count'),'0/3');
 await touchDrag('#g-c2 [data-open="book"]','#g-c2 [data-kept="0"]');assert.equal(await text('#c2-count'),'1/3');
 await touchDrag('#g-c2 [data-hole="1"]','#g-c2 [data-hole="2"]');assert.match(await text('#c2-play-state'),/completata/);
 await click('#g-c2 [data-variant="1"]');assert.match(await text('#g-c2 [data-kept="0"]'),/righe/);
 await page.locator('#g-c2 .c2-swipe').scrollIntoViewIfNeeded();const swipe=await page.locator('#g-c2 .c2-swipe').boundingBox();await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:swipe.x+swipe.width/2,y:swipe.y+22,id:1}]});for(let n=1;n<=8;n++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:swipe.x+swipe.width/2-90*n/8,y:swipe.y+22,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(480);assert.match(await text('#g-c2 [data-kept="0"]'),/lino/);
 await page.locator('#g-c2 [data-open="scope"]').focus();await page.locator('#g-c2 [data-open="scope"]').press('Enter');
 const handle=await page.locator('#c2-aim-handle').boundingBox();await page.locator('#c2-aim-handle').scrollIntoViewIfNeeded();
 const h=await page.locator('#c2-aim-handle').boundingBox();
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:h.x+26,y:h.y+24,id:1}]});
 for(let n=1;n<=10;n++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:h.x+26+84*n/10,y:h.y+24,id:1}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(480);assert.match(await text('#c2-play-state'),/completata/);
 await click('#c2-keep');await click('#g-c2 [data-open="cookie"]');
 await touchDrag('#g-c2 [data-stamp="✦"]','#g-c2 [data-mark="0"]');assert.equal(await text('#g-c2 [data-mark="0"]'),'✦');
 await touchDrag('#g-c2 [data-stamp="○"]','#g-c2 [data-mark="1"]',{cancel:true});assert.equal(await text('#g-c2 [data-mark="1"]'),'·');
 await click('#g-c2 [data-mark="1"]');await click('#g-c2 [data-mark="2"]');assert.match(await text('#c2-play-state'),/completata/);
 await click('#c2-keep');assert.equal(await text('#c2-count'),'3/3');
 await touchDrag('#g-c2 [data-open="cup"]','#g-c2 [data-kept="1"]');assert.match(await text('#c2-pending'),/Confronto affiancato/);assert.match(await text('#g-c2 [data-kept="1"]'),/telescopio/i);
 await click('#c2-do-swap');assert.match(await text('#g-c2 [data-kept="1"]'),/Tazza/);await click('#c2-undo');assert.match(await text('#g-c2 [data-kept="1"]'),/telescopio/i);
 await click('#c2-leave');assert.equal(await page.locator('#c2-note').inputValue(),'');await page.locator('#c2-note').fill('Mi piace rilegare');await page.locator('#c2-meaning').selectOption({label:'Vorrei provarlo'});await click('#c2-confirm');assert.match(await text('#c2-card'),/confermata/);assert.equal(await page.evaluate(()=>__makerProfileCards.c2.text),'Mi piace rilegare');await page.locator('#c2-note').fill('Vorrei fare un quaderno');assert.match(await text('#c2-card'),/confermare/);assert.equal(await page.evaluate(()=>Object.hasOwn(__makerProfileCards,'c2')),false);
 // A swipe on ordinary scene background must keep native document scrolling.
 await page.locator('#c2-title').scrollIntoViewIfNeeded();const y0=await page.evaluate(()=>scrollY);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:380,y:700,id:1}]});
 for(let n=1;n<=10;n++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:380,y:700-400*n/10,id:1}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(200);assert.ok(await page.evaluate(()=>scrollY)>y0,'Vertical native scroll outside handles');
 for(const width of [320,390,900]){await page.setViewportSize({width,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'No horizontal overflow '+width)}
 assert.deepEqual(errors,[]);await browser.close();console.log('PASS C1/C2: real CDP touch placement/cancel/outside, all three invention families and wind/riparo, tap fallback, stitch/aim/stamp, explicit confirmed swap + undo, variants + local profile, native scrolling, 320/390/900, no script errors.');
})().catch(e=>{console.error(e);process.exit(1)});
