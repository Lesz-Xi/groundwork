// Native control and bounded underline-feedback checks; synthetic data only.
export async function testMicro({evaluate,send,viewport,navigate,sleep,assert,shot}) {
  await viewport(1440,1000);await navigate('research-field-guide.html');
  const initial=await evaluate(`({owner:document.scrollingElement===document.documentElement,labels:document.querySelectorAll('.action-label').length,wrapped:[...document.querySelectorAll('.text-button,.hero-secondary,.apply-link,.micro-action,#resume')].every(el=>el.querySelector(':scope>.action-label')),initialStatus:document.getElementById('notebook-status').textContent})`);
  assert(initial.owner&&initial.labels===31&&initial.wrapped,'Native owner / action label coverage '+JSON.stringify(initial));
  // Test every static action, not just a button: anchor hover and #resume
  // defaults used to win the low-specificity decoration reset.
  const underlineStyles=async()=>evaluate(`([...document.querySelectorAll('.action-label')].map(label=>{const parent=label.parentElement,s=getComputedStyle(parent),l=getComputedStyle(label),before=getComputedStyle(label,'::before'),after=getComputedStyle(label,'::after');return {name:parent.id||parent.textContent.trim(),parentDecoration:s.textDecorationLine,labelDecoration:l.textDecorationLine,beforeBottom:before.bottom,afterBottom:after.bottom,beforeHeight:before.height,afterHeight:after.height};}))`);
  const assertSingle=(rows,state)=>assert(rows.length>0&&rows.every(r=>r.parentDecoration==='none'&&r.labelDecoration==='none'&&r.beforeBottom===r.afterBottom&&r.beforeHeight==='0.75px'&&r.afterHeight==='0.75px'),'Duplicate native/action underline in '+state+' '+JSON.stringify(rows.filter(r=>r.parentDecoration!=='none'||r.labelDecoration!=='none'||r.beforeBottom!==r.afterBottom)));
  const checkUnderlines=async()=>{
    await send('DOM.enable');const doc=await send('DOM.getDocument');
    const {nodeIds}=await send('DOM.querySelectorAll',{nodeId:doc.root.nodeId,selector:':has(>.action-label)'});
    const counts={};
    for(const state of ['rest','hover','focus-visible','active']){
      for(const nodeId of nodeIds)await send('CSS.forcePseudoState',{nodeId,forcedPseudoClasses:state==='rest'?[]:state==='focus-visible'?['focus','focus-visible']:[state]});
      const rows=await underlineStyles();assertSingle(rows,state);counts[state]=rows.length;
    }
    for(const nodeId of nodeIds)await send('CSS.forcePseudoState',{nodeId,forcedPseudoClasses:[]});
    return counts;
  };
  await send('DOM.enable');await send('CSS.enable');const singleUnderlines=await checkUnderlines();
  const tab=async shift=>{await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9,modifiers:shift?8:0});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9,modifiers:shift?8:0});};
  const heroPaint=async()=>evaluate(`(()=>{const el=document.querySelector('.hero-secondary'),label=el.querySelector('.action-label'),after=getComputedStyle(label,'::after');return {label:getComputedStyle(label).color,arrow:getComputedStyle(el.querySelector('svg')).stroke,line:after.backgroundColor,scale:new DOMMatrixReadOnly(after.transform).a,outline:getComputedStyle(el).outlineWidth,focusVisible:el.matches(':focus-visible'),begin:getComputedStyle(document.querySelector('.intro-actions>.primary')).backgroundColor};})()`);
  await sleep(220);const heroRest=await heroPaint();assert(heroRest.arrow===heroRest.label&&heroRest.line===heroRest.label&&heroRest.scale===0,'Hero resting colors or settled underline changed');
  // Real pointer input reproduces Chief's photographed hero-link state.
  const heroBox=await evaluate(`(()=>{const r=document.querySelector('.hero-secondary').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',...heroBox});await sleep(350);
  assert(await evaluate(`document.querySelector('.hero-secondary').matches(':hover')&&getComputedStyle(document.querySelector('.hero-secondary')).textDecorationLine==='none'`),'Hero hover restores native underline');
  const heroHover=await heroPaint();assert(heroHover.begin==='rgb(255, 144, 48)'&&heroHover.arrow===heroRest.arrow&&heroHover.line===heroRest.line&&heroHover.label===heroRest.label&&heroHover.scale===1,'Restored hero hover colors differ from previous light-grey treatment '+JSON.stringify(heroHover));
  await shot('underline-hero-hover-desktop');
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:1,y:1});await sleep(220);
  const heroExit=await heroPaint();assert(heroExit.arrow===heroRest.arrow&&heroExit.line===heroRest.line&&heroExit.scale===0,'Hero exit did not restore rest colors');
  await evaluate(`document.querySelector('.intro-actions>.primary').focus();true`);await tab(false);await sleep(350);
  const heroKeyboard=await heroPaint();assert(heroKeyboard.focusVisible&&heroKeyboard.outline==='2px'&&heroKeyboard.arrow===heroRest.arrow&&heroKeyboard.line===heroRest.line,'Restored hero keyboard colors/focus missing');await shot('hero-keyboard-desktop');
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  assert(await evaluate(`getComputedStyle(document.querySelector('.hero-secondary>.action-label'),'::after').transitionDuration==='0s'`),'Hero accent motion persists under reduced motion');
  await send('Emulation.setEmulatedMedia',{features:[{name:'forced-colors',value:'active'}]});
  assert(await evaluate(`(()=>{const el=document.querySelector('.hero-secondary'),probe=document.createElement('span');probe.style.color='LinkText';el.append(probe);const color=getComputedStyle(probe).color;probe.remove();return getComputedStyle(el.querySelector('svg')).stroke===getComputedStyle(el.querySelector('svg')).color&&getComputedStyle(el.querySelector('.action-label'),'::after').backgroundColor===color&&getComputedStyle(el).outlineWidth==='2px';})()`),'Forced-color hero feedback does not use system LinkText');
  await send('Emulation.setEmulatedMedia',{features:[]});await evaluate(`document.activeElement.blur();true`);
  const identityHover=[];
  for(const selector of ['.identity-brand','.identity-rail']){
    const box=await evaluate(`(()=>{const el=document.querySelector('${selector}');el.scrollIntoView({block:'center'});const r=el.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
    await send('Input.dispatchMouseEvent',{type:'mouseMoved',...box});await sleep(350);
    const paint=await evaluate(`(()=>{const el=document.querySelector('${selector}');return {hover:el.matches(':hover'),decoration:getComputedStyle(el).textDecorationLine,logo:getComputedStyle(el.querySelector('.identity-logo')).transform,border:getComputedStyle(el).borderBottomWidth};})()`);
    assert(paint.hover&&paint.decoration==='none'&&paint.logo==='none','Identity hover underline/motion '+JSON.stringify(paint));identityHover.push({selector,...paint});
    if(selector==='.identity-brand')await shot('identity-no-underline-hover-desktop');
  }
  assert(identityHover[1].border==='1px','Reading-index structural divider removed');
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:1,y:1});
  await evaluate(`document.querySelector('.skip').focus();true`);await tab(false);
  assert(await evaluate(`document.activeElement.matches('.identity-brand:focus-visible')&&getComputedStyle(document.activeElement).outlineWidth==='2px'`),'Identity keyboard focus lost');
  await evaluate(`document.getElementById('note-method').scrollIntoView({block:'center'});document.getElementById('note-method').focus();true`);
  // Real Tab/Shift-Tab establishes keyboard focus rather than assuming focus().
  await tab(false);await tab(true);
  const field=await evaluate(`(()=>{const el=document.getElementById('note-method'),s=getComputedStyle(el),bar=getComputedStyle(el,'::-webkit-scrollbar'),thumb=getComputedStyle(el,'::-webkit-scrollbar-thumb'),track=getComputedStyle(el,'::-webkit-scrollbar-track');return {focus:document.activeElement.id,focusVisible:el.matches(':focus-visible'),border:s.borderTopWidth,outline:s.outlineWidth,resize:s.resize,track:track.backgroundColor,barWidth:bar.width,thumbBorder:thumb.borderLeftWidth,thumbClip:thumb.backgroundClip,thumbColor:thumb.backgroundColor,scrollWidth:s.scrollbarWidth,legacy:CSS.supports('selector(::-webkit-scrollbar)')};})()`);
  assert(field.focus==='note-method'&&field.focusVisible&&field.border==='1px'&&field.outline==='0px'&&field.resize==='vertical','Single-edge field / keyboard / resize failure '+JSON.stringify(field));
  assert(field.legacy&&field.barWidth==='10px'&&field.thumbBorder==='3px'&&field.thumbClip==='padding-box'&&field.track==='rgba(0, 0, 0, 0)'&&field.scrollWidth==='auto','Native micro scrollbar failure '+JSON.stringify(field));
  await shot('micro-field-focus-desktop');
  const contrast=await evaluate(`(()=>{const el=document.getElementById('note-method');el.blur();const s=getComputedStyle(el),canvas=document.createElement('canvas');canvas.width=canvas.height=1;const ctx=canvas.getContext('2d');const lum=c=>{ctx.fillStyle=c;ctx.fillRect(0,0,1,1);const p=ctx.getImageData(0,0,1,1).data;const v=[p[0],p[1],p[2]].map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4});return .2126*v[0]+.7152*v[1]+.0722*v[2];};const ratio=(a,b)=>{a=lum(a);b=lum(b);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05)};const bg=getComputedStyle(document.getElementById('notebook')).backgroundColor;return {borderAgainstField:ratio(s.borderTopColor,s.backgroundColor),borderAgainstNotebook:ratio(s.borderTopColor,bg)};})()`);
  assert(contrast.borderAgainstField>=3&&contrast.borderAgainstNotebook>=3,'Resting field edge contrast '+JSON.stringify(contrast));
  await evaluate(`(()=>{const el=document.getElementById('note-method');el.value='[SYNTHETIC MICRO-CONTROL TEST — not research]\\n'+Array.from({length:25},(_,i)=>'Line '+i+': native editing and scrolling').join('\\n');el.dispatchEvent(new Event('input'));el.setSelectionRange(7,32);window.__microBefore={value:el.value,selection:[el.selectionStart,el.selectionEnd],status:document.getElementById('notebook-status').textContent};return true;})()`);
  const scroll=await evaluate(`(()=>{const el=document.getElementById('note-method'),rail=document.querySelector('.toc'),y=scrollY;el.scrollTop=40;rail.scrollTop=40;return {field:el.scrollTop,rail:rail.scrollTop,pageUnchanged:scrollY===y};})()`);
  assert(scroll.field>0&&scroll.rail>0&&scroll.pageUnchanged,'Native nested scrolling failure '+JSON.stringify(scroll));
  // Exercise the actual browser resize handle, then restore only the fixture size.
  await evaluate(`document.getElementById('note-method').scrollIntoView({block:'center'});true`);
  const box=await evaluate(`(()=>{const el=document.getElementById('note-method'),r=el.getBoundingClientRect();return {x:r.right-4,y:r.bottom-4,height:r.height};})()`);
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:box.x,y:box.y});
  await send('Input.dispatchMouseEvent',{type:'mousePressed',x:box.x,y:box.y,button:'left',clickCount:1});
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:box.x,y:box.y+55,button:'left',buttons:1});
  await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:box.x,y:box.y+55,button:'left',clickCount:1});
  const resized=await evaluate(`document.getElementById('note-method').getBoundingClientRect().height`);
  assert(resized>box.height+10,'Native resize handle did not respond');
  await evaluate(`document.getElementById('note-method').style.removeProperty('height');document.getElementById('note-method').setSelectionRange(7,32);document.activeElement.blur();document.getElementById('print-notebook').scrollIntoView({block:'center'});true`);
  const move=async inside=>{
    const p=inside?await evaluate(`(()=>{const r=document.getElementById('print-notebook').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`):{x:1,y:1};
    await send('Input.dispatchMouseEvent',{type:'mouseMoved',...p});
  };
  const state=async()=>evaluate(`(()=>{const el=document.querySelector('#print-notebook>.action-label'),s=getComputedStyle(el,'::after');return {scale:new DOMMatrixReadOnly(s.transform).a,duration:s.transitionDuration,rule:s.height,labelTransform:getComputedStyle(el).transform,parentDecoration:getComputedStyle(el.parentElement).textDecorationLine};})()`);
  await move(false);await sleep(220);const rest=await state();await shot('micro-actions-rest-desktop');
  assert(rest.scale===0&&rest.rule==='0.75px'&&rest.duration==='0.18s'&&rest.parentDecoration==='none','Resting underline state '+JSON.stringify(rest));
  await move(true);await sleep(80);const mid=await state();await move(false);await sleep(60);const reversed=await state();
  assert(mid.scale>0&&reversed.scale<mid.scale,'Hover interruption did not reverse '+JSON.stringify({mid,reversed}));
  await sleep(220);await move(true);await sleep(350);const hover=await state();await shot('micro-actions-hover-desktop');
  assert(hover.scale===1&&hover.duration==='0.3s'&&hover.labelTransform==='none','Hover sweep / stationary label '+JSON.stringify(hover));
  for(let i=0;i<2;i++){await move(false);await sleep(220);assert((await state()).scale===0,'Exit did not settle');await move(true);await sleep(350);assert((await state()).scale===1,'Repeated hover did not settle');}
  await move(false);await sleep(220);
  await evaluate(`document.getElementById('print-notebook').disabled=true;true`);await move(true);await sleep(350);assert((await state()).scale===0,'Disabled control animated');
  await evaluate(`document.getElementById('print-notebook').disabled=false;document.getElementById('export-notebook').focus();true`);await move(false);await tab(false);await sleep(350);
  assert(await evaluate(`document.activeElement.id==='print-notebook'&&document.activeElement.matches(':focus-visible')&&getComputedStyle(document.activeElement).outlineWidth==='2px'`),'Keyboard button focus not visible');
  assert((await state()).scale===1,'Keyboard underline feedback missing');await shot('micro-actions-keyboard-desktop');
  const unchanged=await evaluate(`(()=>{const el=document.getElementById('note-method'),b=window.__microBefore;return el.value===b.value&&el.selectionStart===b.selection[0]&&el.selectionEnd===b.selection[1]&&document.getElementById('notebook-status').textContent===b.status;})()`);
  assert(unchanged,'Hover/scroll/focus/resize changed notes, selection or edit status');
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  assert((await state()).duration==='0s','Reduced motion still transitions underline');
  await send('Emulation.setEmulatedMedia',{features:[{name:'forced-colors',value:'active'}]});
  await evaluate(`document.getElementById('note-method').focus();true`);
  assert(await evaluate(`matchMedia('(forced-colors:active)').matches&&getComputedStyle(document.getElementById('note-method')).outlineWidth==='2px'`),'Forced-colors field focus fallback missing');
  await send('Emulation.setEmulatedMedia',{features:[]});
  await evaluate(`document.getElementById('apply-prior-art').click();true`);await sleep(120);
  assert(await evaluate(`[...document.querySelectorAll('.context-return,.context-remove')].every(el=>el.querySelector(':scope>.action-label'))`),'Dynamic context actions lack underline labels');
  const dynamicSingleUnderlines=await checkUnderlines();
  // Observe the exact synthetic export before marking the external test copy saved.
  await evaluate(`window.__microBlob=null;window.__microCreate=URL.createObjectURL;URL.createObjectURL=b=>{window.__microBlob=b;return window.__microCreate(b)};document.getElementById('export-notebook').click();true`);
  assert((await evaluate(`window.__microBlob.text()`)).includes('SYNTHETIC MICRO-CONTROL TEST'),'Synthetic note export lost text');
  await evaluate(`URL.createObjectURL=window.__microCreate;document.getElementById('confirm-export').click();true`);
  await viewport(390,844);await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});await navigate('research-field-guide.html');
  // The earlier synthetic download can leave the document inactive. ActiveElement
  // alone is not evidence that the browser's :focus state is painted.
  await send('Page.bringToFront');
  await evaluate(`document.getElementById('apply-methods').click();true`);await sleep(120);
  const touch=await evaluate(`({coarse:matchMedia('(pointer:coarse)').matches,focus:document.activeElement.id,documentFocused:document.hasFocus(),fieldMatchesFocus:document.getElementById('field-method').matches(':focus'),fieldClass:document.getElementById('field-method').className,fieldOutlineStyle:getComputedStyle(document.getElementById('field-method')).outlineStyle,focusRules:[...document.styleSheets[0].cssRules].filter(r=>r.selectorText?.includes('.field:focus')).map(r=>[r.selectorText,r.style.outline]),fieldOutline:getComputedStyle(document.getElementById('field-method')).outlineWidth,duration:getComputedStyle(document.querySelector('.context-return>.action-label'),'::after').transitionDuration,overflow:document.documentElement.scrollWidth>innerWidth,hitAreas:[...document.querySelectorAll('.context-actions a,.context-actions button')].filter(el=>el.getBoundingClientRect().height>0).every(el=>el.getBoundingClientRect().height>=44)})`);
  assert(touch.coarse&&touch.documentFocused&&touch.fieldMatchesFocus&&touch.focus==='field-method'&&touch.fieldOutline==='1px'&&touch.duration==='0s'&&!touch.overflow&&touch.hitAreas,'Touch group focus / hit targets '+JSON.stringify(touch));
  assertSingle(await underlineStyles(),'coarse-pointer mobile');
  await shot('micro-field-mobile');
  await evaluate(`window.scrollTo(0,0);document.activeElement.blur();true`);await sleep(120);
  const heroTouchRest=await heroPaint();assert(heroTouchRest.arrow===heroTouchRest.label&&heroTouchRest.line===heroTouchRest.label,'Coarse-pointer hero retains sticky orange hover');await shot('underline-hero-mobile');
  await evaluate(`document.getElementById('confirm-export').click();true`);
  await send('Emulation.setTouchEmulationEnabled',{enabled:false});await viewport(1440,1000);await navigate('research-field-guide.html');
  return {native_document_owner:true,static_action_labels:initial.labels,single_underline_states:singleUnderlines,dynamic_single_underline_states:dynamicSingleUnderlines,real_hero_hover_single_underline:true,hero_original_colors_restored:{rest:heroRest,hover:heroHover,exit:heroExit,keyboard:heroKeyboard,reduced_motion:true,forced_colors_system_line_and_focus:true,coarse_pointer_rest:heroTouchRest},identity_no_hover_underline:identityHover,identity_keyboard_focus:true,field,contrast,native_scroll:scroll,native_resize_handle:true,hover:{rest,mid,reversed,hover},repeat_and_interruption:true,disabled_rest:true,keyboard_focus:true,reduced_motion:true,forced_colors_focus:true,dynamic_context_labels:true,touch,notes_selection_and_dirty_state_preserved:true};
}
