import {testApply} from './qa-apply.mjs';
import {testMicro} from './qa-micro.mjs';
import {testHero} from './qa-hero.mjs';
import {spawn} from 'node:child_process';
import {mkdtempSync,readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=dirname(fileURLToPath(import.meta.url));
const pilot=process.argv.includes('--pilot');
const out=join(root,pilot?'.qa':'.impeccable/review/groundwork');mkdirSync(out,{recursive:true});
const profile=mkdtempSync(join(tmpdir(),'research-guide-qa-'));
const chrome=spawn(process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--remote-debugging-address=127.0.0.1','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{stdio:['ignore','ignore','pipe']});
let stderr='';chrome.stderr.on('data',d=>stderr+=d);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let socket;let id=0;const pending=new Map();const events=[];
async function send(method,params={}){
 const n=++id;return new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>{pending.delete(n);reject(new Error('CDP timeout '+method));},12000);
  pending.set(n,{resolve:r=>{clearTimeout(timer);resolve(r)},reject:e=>{clearTimeout(timer);reject(e)}});
  socket.send(JSON.stringify({id:n,method,params}));
 });
}
async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result.value;}
async function viewport(width,height){await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<700});}
async function navigate(file){await send('Page.navigate',{url:pathToFileURL(join(root,file)).href});await sleep(250);await evaluate('document.fonts.ready.then(()=>true)');await sleep(100);}
async function shot(name){const r=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync(join(out,name+'.png'),Buffer.from(r.data,'base64'));}
function assert(ok,message){if(!ok)throw new Error(message);}
const result={scope:'Local headless Chrome, self-contained file:// artifacts; author QA, not independent review or research-method certification',checks:[],screenshots:[],capture_directory:pilot?'.qa':'.impeccable/review/groundwork'};
try{
 for(let i=0;i<100&&!existsSync(join(profile,'DevToolsActivePort'));i++)await sleep(100);
 assert(existsSync(join(profile,'DevToolsActivePort')),'Chrome did not open DevTools '+stderr.slice(-300));
 const port=readFileSync(join(profile,'DevToolsActivePort'),'utf8').split('\n')[0];
 const targets=await fetch('http://127.0.0.1:'+port+'/json/list').then(r=>r.json());
 const target=targets.find(t=>t.type==='page');
 socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject});
 socket.onmessage=event=>{const message=JSON.parse(event.data);if(message.id){const p=pending.get(message.id);if(p){pending.delete(message.id);message.error?p.reject(new Error(JSON.stringify(message.error))):p.resolve(message.result)}}else events.push(message)};
 await send('Page.enable');await send('Runtime.enable');await send('Network.enable');
 mkdirSync(join(out,'downloads'),{recursive:true});await send('Page.setDownloadBehavior',{behavior:'allow',downloadPath:join(out,'downloads')});
 await viewport(1440,1000);await navigate(pilot?'.qa/pilot.html':'research-field-guide.html');
 const identity=await evaluate(`({title:document.title,logos:[...document.querySelectorAll('.identity-logo')].map(el=>({width:el.getBoundingClientRect().width,hidden:el.getAttribute('aria-hidden'),focusable:el.getAttribute('focusable'),href:el.parentElement.getAttribute('href'),label:el.parentElement.textContent,strokes:[...el.querySelectorAll('path')].map(p=>getComputedStyle(p).stroke)}))})`);
 assert(identity.title==='Groundwork — research field guide & notebook'&&identity.logos.length===2&&identity.logos.every(el=>el.hidden==='true'&&el.focusable==='false'&&el.href==='#top'&&el.label.includes('Groundwork'))&&identity.logos[0].width===28&&identity.logos[1].width===24&&identity.logos[0].strokes[0]==='rgb(221, 224, 224)'&&identity.logos[1].strokes[0]==='rgb(18, 33, 40)'&&identity.logos.every(el=>el.strokes[1]==='rgb(255, 144, 48)'),'Groundwork identity mismatch '+JSON.stringify(identity));
 assert(identity.logos[0].label.trim()==='Groundwork','Removed header descriptor reappeared');
 assert(await evaluate(`!document.querySelector('.sitebar .edition,.intro .hero-bottom')&&!document.querySelector('.sitebar').textContent.includes('Personal research edition / 02')&&!document.querySelector('.intro').textContent.includes('one working notebook')`),'Removed hero metadata reappeared');
 // Logo leaves must not inherit the existing action-arrow hover translation.
 const logoBox=await evaluate(`(()=>{const r=document.querySelector('.identity-brand').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
 await send('Input.dispatchMouseEvent',{type:'mouseMoved',...logoBox});await sleep(350);
 assert(await evaluate(`getComputedStyle(document.querySelector('.identity-brand>.identity-logo')).transform==='none'`),'Identity logo inherited arrow motion');
 await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:1,y:1});result.checks.push({identity,logo_hover_stationary:true});
 if(pilot) {
   await viewport(1440,1000);await navigate('.qa/pilot.html');
   result.checks.push(await testApply({evaluate,send,viewport,assert,full:false}));
 } else {
 result.checks.push(await testMicro({evaluate,send,viewport,navigate,sleep,assert,shot:async name=>{await shot(name);result.screenshots.push(name+'.png');}}));
 await viewport(1440,1000);await navigate('research-field-guide.html');
 result.checks.push(await testHero({evaluate,viewport,navigate,assert}));
 const desktop=await evaluate(`({overflow:document.documentElement.scrollWidth>innerWidth,chapters:document.querySelectorAll('.chapter[data-part]').length,glossary:document.querySelectorAll('.glossary-entry').length,sans:document.fonts.check('24px Archivo'),mono:document.fonts.check('13px "Commit Mono"'),fontFaces:[...document.fonts].map(f=>({family:f.family.replace(/["']/g,''),status:f.status})),fontRoles:{body:getComputedStyle(document.body).fontFamily,heading:getComputedStyle(document.querySelector('h1')).fontFamily,control:getComputedStyle(document.getElementById('export-notebook')).fontFamily,note:getComputedStyle(document.getElementById('note-prior')).fontFamily,annotation:getComputedStyle(document.querySelector('.chapter-index')).fontFamily},layout:[document.querySelector('.toc'),document.querySelector('main'),document.querySelector('.reading-path')].map(el=>el.getBoundingClientRect().x),notebook:document.querySelectorAll('#research-notebook textarea').length,links:[...document.querySelectorAll('a[href^="#"]')].every(a=>document.getElementById(a.hash.slice(1))),h1:document.querySelectorAll('h1').length})`);
 assert(!desktop.overflow&&desktop.chapters===21&&desktop.glossary===134&&desktop.links&&desktop.h1===1&&desktop.sans&&desktop.mono&&desktop.notebook===10&&desktop.layout[0]<desktop.layout[1]&&desktop.layout[1]<desktop.layout[2],'Desktop structure/font failure '+JSON.stringify(desktop));result.checks.push({desktop});await shot('desktop');result.screenshots.push('desktop.png');
 assert(desktop.fontFaces.length===2&&['Archivo','Commit Mono'].every(family=>desktop.fontFaces.some(f=>f.family===family&&f.status==='loaded')),'Approved embedded font faces not loaded '+JSON.stringify(desktop.fontFaces));
 assert(['body','heading','control'].every(role=>desktop.fontRoles[role].startsWith('Archivo'))&&['note','annotation'].every(role=>desktop.fontRoles[role].startsWith('"Commit Mono"')),'Typography role mismatch '+JSON.stringify(desktop.fontRoles));
 await evaluate(`document.getElementById('research').scrollIntoView();true`);await sleep(150);await shot('reading-desktop');result.screenshots.push('reading-desktop.png');
 assert(await evaluate(`document.querySelector('.reading-path a[aria-current="location"]')?.hash==='#research'`),'Right reading path location missing');
 await evaluate(`document.getElementById('concept-search').value='p-value';document.getElementById('concept-search').dispatchEvent(new Event('input'));true`);
 assert(await evaluate(`!document.getElementById('search-results').hidden && [...document.querySelectorAll('#search-results a')].some(a=>a.hash==='#term-p-value')`),'Search does not find p-value');
 await evaluate(`document.getElementById('concept-search').value='qzxvunlikely';document.getElementById('concept-search').dispatchEvent(new Event('input'));true`);
 assert(await evaluate(`document.getElementById('search-results').textContent.includes('No matching concept')`),'No-results state missing');
 await evaluate(`document.getElementById('concept-search').value='';document.getElementById('concept-search').dispatchEvent(new Event('input'));document.getElementById('essentials').click();true`);
 assert(await evaluate(`getComputedStyle(document.querySelector('.depth')).display==='none'&&getComputedStyle(document.querySelector('.takeaway')).display!=='none'`),'Intuition toggle hides critical content');
 await evaluate(`document.getElementById('essentials').click();document.getElementById('statistics').scrollIntoView();true`);await sleep(150);
 assert(await evaluate(`document.querySelector('.toc a[aria-current="location"]')?.hash==='#statistics'`),'Current chapter marker is stale');
 await shot('statistics');result.screenshots.push('statistics.png');
 await evaluate(`document.getElementById('bookmark').click();true`);
 assert(await evaluate(`document.getElementById('reader-status').textContent.includes('Place saved')`),'Bookmark not saved');
 await navigate('research-field-guide.html');assert(await evaluate(`!document.getElementById('resume').hidden&&document.getElementById('resume').hash==='#statistics'`),'Bookmark not restored');
 await evaluate(`document.getElementById('sources').scrollIntoView();true`);await sleep(100);
 assert(await evaluate(`document.querySelector('.reading-path .path-source').getAttribute('aria-current')==='location'&&!document.querySelector('.reading-path a[href="#notebook"][aria-current]')`),'Sources retains a stale notebook marker');await shot('sources');result.screenshots.push('sources.png');
 await navigate('research-field-guide.html');
 await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
 assert(await evaluate(`document.activeElement.classList.contains('skip') && getComputedStyle(document.activeElement).outlineStyle!=='none'`),'Keyboard skip/focus state missing');
 const blocked=await evaluate(`(()=>{const old=Object.getOwnPropertyDescriptor(window,'localStorage');Object.defineProperty(window,'localStorage',{configurable:true,get(){throw new DOMException('Blocked','SecurityError')}});document.getElementById('bookmark').click();const ok=document.getElementById('reader-status').textContent.includes('Could not save');if(old)Object.defineProperty(window,'localStorage',old);else delete window.localStorage;return ok;})()`);assert(blocked,'Blocked storage fallback missing');
 await evaluate(`document.getElementById('essentials').click();window.dispatchEvent(new Event('beforeprint'));true`);await send('Emulation.setEmulatedMedia',{media:'print'});
 assert(await evaluate(`getComputedStyle(document.querySelector('.depth')).display!=='none'&&[...document.querySelectorAll('.field-kit details')].every(d=>d.open)`),'Print content incomplete');
 await send('Emulation.setEmulatedMedia',{media:''});await evaluate(`window.dispatchEvent(new Event('afterprint'));true`);
 assert(await evaluate(`[...document.querySelectorAll('.field-kit details')].every(d=>!d.open)`),'Print did not restore disclosure states');
 result.checks.push({keyboard_skip_focus:true,storage_denial_fallback:true,print_full_detail:true,print_disclosure_restore:true,current_chapter_marker:true});
 await viewport(390,844);await navigate('research-field-guide.html');
 const mobile=await evaluate(`({overflow:document.documentElement.scrollWidth>innerWidth,searchVisible:document.getElementById('concept-search').getBoundingClientRect().width>0,ctaBottom:document.querySelector('.intro-actions .primary').getBoundingClientRect().bottom})`);
 assert(!mobile.overflow&&mobile.searchVisible&&mobile.ctaBottom<844,'Mobile layout failure '+JSON.stringify(mobile));result.checks.push({mobile});await shot('mobile');result.screenshots.push('mobile.png');
 await evaluate(`document.getElementById('research').scrollIntoView();true`);await sleep(100);await shot('reading-mobile');result.screenshots.push('reading-mobile.png');
 for (const width of [320,768,1024]) {
   await viewport(width,844);
   assert(await evaluate(`document.documentElement.scrollWidth<=innerWidth`),'Overflow at '+width);
 }
 result.checks.push({responsive_widths:[320,390,768,1024,1440],page_overflow:false});
 await viewport(390,844);
 await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});assert(await evaluate(`matchMedia('(prefers-reduced-motion: reduce)').matches`),'Reduced motion not emulated');
 await send('Emulation.setScriptExecutionDisabled',{value:true});await navigate('research-field-guide.html');
 assert(await evaluate(`!document.documentElement.classList.contains('js')&&getComputedStyle(document.querySelector('.depth')).display!=='none'&&document.querySelectorAll('#research-notebook textarea').length===10`),'No-JS content not readable');
 await evaluate(`document.getElementById('apply-prior-art').click();true`);await sleep(100);
 assert(await evaluate(`location.hash==='#field-prior'&&document.querySelectorAll('.guide-context-row').length===0&&getComputedStyle(document.querySelector('#field-prior .no-js-returns')).display!=='none'`),'No-JS native Apply failed or implies attached context');
 await evaluate(`document.querySelector('#field-prior .no-js-returns').open=true;document.querySelector('#field-prior .no-js-returns a').click();true`);await sleep(100);
 assert(await evaluate(`location.hash==='#apply-prior-art'`),'No-JS return anchor failed');
 await send('Emulation.setScriptExecutionDisabled',{value:false});await send('Emulation.setEmulatedMedia',{features:[]});
 await viewport(1440,1000);await navigate('research-field-guide.html');
 await evaluate(`document.getElementById('notebook').scrollIntoView();true`);await sleep(150);await shot('notebook-desktop');result.screenshots.push('notebook-desktop.png');
 assert(await evaluate(`document.querySelector('.reading-path a[aria-current="location"]')?.hash==='#notebook'`),'Notebook path marker missing');
 await evaluate(`document.getElementById('note-question').value='Synthetic QA question: how can stale support be detected?';document.getElementById('note-question').dispatchEvent(new Event('input'));true`);
 assert(await evaluate(`document.getElementById('notebook-status').textContent.includes('Unsaved')`),'Notebook input state missing');
 // Intercept only the generated local download to inspect its text without invoking a save dialog.
 await evaluate(`window.__blob=null;window.__originalCreate=URL.createObjectURL;URL.createObjectURL=b=>{window.__blob=b;return window.__originalCreate(b)};document.getElementById('export-notebook').click();true`);
 const exported=await evaluate(`window.__blob.text()`);assert(exported.startsWith('# Groundwork — research notebook\n'),'Groundwork export title missing');assert(exported.includes('Synthetic QA question')&&exported.includes('## The question'),'Notebook export incomplete');
 await evaluate(`document.getElementById('confirm-export').click();window.dispatchEvent(new Event('beforeprint'));true`);
 assert(await evaluate(`document.getElementById('note-question-print').textContent.includes('Synthetic QA')`),'Print mirror missing');
 await send('Emulation.setEmulatedMedia',{media:'print'});
 assert(await evaluate(`getComputedStyle(document.getElementById('note-question-print')).display==='block'&&getComputedStyle(document.querySelector('.reading-path')).display==='none'`),'Notebook print layout is incomplete');
 await evaluate(`document.body.classList.add('print-notes');true`);
 assert(await evaluate(`getComputedStyle(document.getElementById('research')).display==='none'&&getComputedStyle(document.getElementById('notebook')).display!=='none'`),'Print-notes scope failed');
 await evaluate(`document.body.classList.remove('print-notes');true`);await send('Emulation.setEmulatedMedia',{media:''});
 await viewport(390,844);await evaluate("document.getElementById('notebook').scrollIntoView();true");await sleep(100);assert(!await evaluate('document.documentElement.scrollWidth>innerWidth'),'Notebook mobile overflow');await shot('notebook-mobile');result.screenshots.push('notebook-mobile.png');
 const capture=async name=>{await shot(name);result.screenshots.push(name+'.png');};
 result.checks.push(await testApply({evaluate,send,viewport,assert,full:true,shot:capture}));
 }
 const remote=events.filter(e=>e.method==='Network.requestWillBeSent').map(e=>e.params.request.url).filter(url=>/^https?:/.test(url));
 const errors=events.filter(e=>e.method==='Runtime.exceptionThrown').map(e=>e.params.exceptionDetails.text);
 assert(remote.length===0,'Remote runtime request '+remote.join(','));assert(errors.length===0,'Browser exceptions '+errors.join(','));
 if(!pilot) result.checks.push({left_nav_right_path:true,in_page_notebook:true,right_path_active_location:true,search:true,no_results:true,intuition_toggle:true,bookmark_persistence:true,reduced_motion:true,no_js_reading:true,no_js_apply_return:true,notebook_export:true,print_mirror:true,print_notes_scope:true});
 result.checks.push({remote_requests:remote,browser_exceptions:errors});
 result.status='passed';
}catch(error){result.status='failed';result.error=String(error);process.exitCode=1;}
finally{if(socket)socket.close();chrome.kill('SIGTERM');writeFileSync(join(root,pilot?'.qa/pilot-results.json':'qa-results-integration.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));}
