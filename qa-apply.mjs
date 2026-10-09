// Shared functional tests for the private pilot and the delivered file:// document.
// Uses synthetic notes only; no external provider, app server or test dependency.
export async function testApply({evaluate,send,viewport,assert,full,shot}) {
  await viewport(1440,1000);
  const settle=()=>evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
  const click=id=>evaluate(`document.getElementById(${JSON.stringify(id)}).click();true`);
  const unsaved=()=>evaluate(`(()=>{const event=new Event('beforeunload',{cancelable:true});window.dispatchEvent(event);return event.defaultPrevented;})()`);
  const captureExport=async()=>{
    await evaluate(`window.__applyBlob=null;window.__applyCreate=URL.createObjectURL;URL.createObjectURL=blob=>{window.__applyBlob=blob;return window.__applyCreate(blob)};document.getElementById('export-notebook').click();true`);
    const text=await evaluate('window.__applyBlob.text()');
    await evaluate('URL.createObjectURL=window.__applyCreate;true');return text;
  };
  const seed='  Synthetic prior-work comparison.\nUnknown differences remain unknown.\n  ';
  const seedResult=await evaluate(`(()=>{const input=document.getElementById('note-prior');input.value=${JSON.stringify(seed)};input.dispatchEvent(new Event('input'));document.getElementById('confirm-export').click();return {count:document.querySelectorAll('[data-apply-chapter]').length,context:document.querySelectorAll('.guide-context-row').length,bookmark:localStorage.getItem('research-field-guide-bookmark-v1')};})()`);
  assert(seedResult.count===(full?21:1)&&seedResult.context===0,'Wrong pilot/full Apply count or eager context attachment');
  await click('apply-prior-art');await settle();
  const arrival=await evaluate(`({hash:location.hash,focus:document.activeElement.id,value:document.getElementById('note-prior').value,rows:document.querySelectorAll('#context-prior .guide-context-row').length,changed:document.getElementById('notebook-status').textContent,top:document.getElementById('field-prior').getBoundingClientRect().top})`);
  assert(arrival.hash==='#field-prior'&&arrival.focus==='note-prior'&&arrival.value===seed&&arrival.rows===1&&arrival.changed.includes('Unsaved'),'Pilot handoff changed text, missed focus, or failed dirty state '+JSON.stringify(arrival));
  assert(arrival.top>=0&&arrival.top<150,'Arrival must keep field label/help visible');
  assert(await unsaved(),'Context attachment did not set beforeunload warning');
  const exported=await captureExport();
  assert(exported.includes(seed)&&exported.includes('Guide context — instructional reference, not research evidence')&&exported.includes('Chapter 06: Prior art & novelty')&&exported.includes('research-field-guide.html#prior-art')&&!exported.includes('file:///'),'Context export missing, unsafe absolute link or note whitespace lost');
  await click('confirm-export');assert(!await unsaved(),'Save confirmation did not clear context dirty state');
  await click('apply-prior-art');await settle();
  assert(await evaluate(`document.querySelectorAll('#context-prior .guide-context-row').length===1&&document.getElementById('note-prior').value===${JSON.stringify(seed)}`),'Repeated Apply duplicated context or changed text');
  assert(!await unsaved(),'Repeated Apply marked a saved association dirty');
  await evaluate(`document.querySelector('#context-prior .context-return').click();true`);await settle();
  assert(await evaluate(`location.hash==='#apply-prior-art'&&document.activeElement.id==='apply-prior-art'&&document.getElementById('apply-prior-art').getBoundingClientRect().top>=0&&document.getElementById('apply-prior-art').getBoundingClientRect().top<innerHeight`),'Return lost the exact Apply link/focus');
  assert(!await unsaved(),'Returning is navigation, not a dirty-state edit');
  const history=await send('Page.getNavigationHistory');
  await send('Page.navigateToHistoryEntry',{entryId:history.entries[history.currentIndex-1].id});await settle();
  assert(await evaluate(`location.hash==='#field-prior'&&document.getElementById('note-prior').value===${JSON.stringify(seed)}&&document.querySelectorAll('#context-prior .guide-context-row').length===1`),'Native Back lost the field or its in-page data');
  await send('Page.navigateToHistoryEntry',{entryId:history.entries[history.currentIndex].id});await settle();
  await evaluate(`document.getElementById('apply-prior-art').focus({preventScroll:true});true`);
  assert(await evaluate(`location.hash==='#apply-prior-art'`),'Native Forward lost the return position');
  assert(await evaluate(`localStorage.getItem('research-field-guide-bookmark-v1')===${JSON.stringify(seedResult.bookmark)}`),'Handoff/return changed the reader bookmark');
  // Exercise a keyboard-activated Apply, not just scripted pointer dispatch.
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});await settle();
  assert(await evaluate(`location.hash==='#field-prior'&&document.activeElement.id==='note-prior'`),'Keyboard Apply missed destination');
  if(shot) await shot('apply-arrival-desktop');
  await evaluate(`window.dispatchEvent(new Event('beforeprint'));true`);await send('Emulation.setEmulatedMedia',{media:'print'});
  assert(await evaluate(`getComputedStyle(document.getElementById('context-prior')).display!=='none'&&getComputedStyle(document.querySelector('#context-prior .context-actions')).display==='none'&&getComputedStyle(document.querySelector('#context-prior .context-reference')).display!=='none'&&document.getElementById('note-prior-print').textContent===${JSON.stringify(seed)}`),'Print context/note mirror lost provenance or exposes controls');
  await send('Emulation.setEmulatedMedia',{media:''});await evaluate(`window.dispatchEvent(new Event('afterprint'));true`);
  await evaluate(`document.querySelector('#context-prior .context-remove').click();true`);await settle();
  assert(await evaluate(`document.getElementById('context-prior').hidden&&document.getElementById('note-prior').value===${JSON.stringify(seed)}`),'Removing context changed the note or left phantom association');
  assert(await unsaved(),'Context removal did not mark export unsaved');
  await click('confirm-export');
  const cleanExport=await captureExport();assert(!cleanExport.includes('### Guide context'),'Removed context still exported');
  await click('confirm-export');
  if(full) {
    await click('apply-assumptions');await settle();await click('apply-methods');await settle();
    assert(await evaluate(`document.querySelectorAll('#context-method .guide-context-row').length===2`),'Second chapter replaced the first field association');
    await click('confirm-export');
    await evaluate(`document.querySelector('#context-method [data-chapter="assumptions"] .context-remove').click();true`);await settle();
    assert(await evaluate(`document.querySelectorAll('#context-method .guide-context-row').length===1&&document.querySelector('#context-method [data-chapter="methods"]')!==null`),'Removing one association removed its sibling');
    const snapshot=await evaluate(`JSON.stringify([...document.querySelectorAll('#research-notebook textarea')].map(input=>input.value))`);
    await evaluate(`document.querySelectorAll('[data-apply-chapter]').forEach(link=>link.click());true`);await settle();
    const all=await evaluate(`({rows:document.querySelectorAll('.guide-context-row').length,covered:[...document.querySelectorAll('.guide-context')].filter(host=>!host.hidden).length,noteValues:JSON.stringify([...document.querySelectorAll('#research-notebook textarea')].map(input=>input.value)),methodRows:document.querySelectorAll('#context-method .guide-context-row').length})`);
    assert(all.rows===21&&all.covered===10&&all.noteValues===snapshot&&all.methodRows===6,'Full mapping lost coverage, text, or an association '+JSON.stringify(all));
    const contextOnly=await captureExport();
    assert(contextOnly.includes('## Method & assumptions\n\nNot filled in.')&&contextOnly.includes('research-field-guide.html#methods'),'Context-only field must remain unfilled, not infer completion');
    await click('confirm-export');
    // Modified clicks are normal browser navigation, not association mutations.
    await evaluate(`document.getElementById('apply-prior-art').dispatchEvent(new MouseEvent('click',{button:0,ctrlKey:true,bubbles:true,cancelable:true}));true`);
    assert(!await unsaved(),'Modified click changed notebook data');
  }
  await viewport(390,844);
  await click('apply-prior-art');await settle();
  const touch=await evaluate(`({focus:document.activeElement.id,hash:location.hash,top:document.getElementById('field-prior').getBoundingClientRect().top,overflow:document.documentElement.scrollWidth>innerWidth})`);
  assert(touch.focus==='field-prior'&&touch.hash==='#field-prior'&&touch.top>=0&&touch.top<150&&!touch.overflow,'Mobile handoff stole text focus or lost its label '+JSON.stringify(touch));
  if(shot) await shot('apply-arrival-mobile');
  await evaluate(`document.querySelector('#context-prior .context-return').click();true`);await settle();
  if(shot) await shot('apply-return-mobile');
  assert(await evaluate(`document.activeElement.id==='apply-prior-art'&&location.hash==='#apply-prior-art'`),'Mobile return missed original action');
  if(full) {
    await click('apply-methods');await settle();
    const compact=await evaluate(`({current:document.querySelector('#context-method > .guide-context-list .guide-context-row').dataset.chapter,folded:!document.querySelector('#context-method .context-history').open,top:document.getElementById('note-method').getBoundingClientRect().top})`);
    assert(compact.current==='methods'&&compact.folded&&compact.top>0&&compact.top<550,'Multi-context arrival displaced its note or selected the wrong return '+JSON.stringify(compact));
    if(shot) await shot('apply-multiple-mobile');
    assert(!await unsaved(),'Selecting an already attached context was treated as an edit');
    await evaluate(`document.querySelector('#context-method .context-history').open=true;true`);await settle();
    assert(await evaluate(`document.querySelector('#context-method [data-chapter="assumptions"] .context-return').getBoundingClientRect().height>=44`),'Older contexts are not accessible by native disclosure');
    await evaluate(`document.querySelector('#context-method .context-history').open=false;window.dispatchEvent(new Event('beforeprint'));true`);
    await send('Emulation.setEmulatedMedia',{media:'print'});
    assert(await evaluate(`document.querySelector('#context-method .context-history').open&&[...document.querySelectorAll('#context-method .context-reference')].every(link=>link.getClientRects().length>0)`),'Print dropped a folded chapter context');
    await send('Emulation.setEmulatedMedia',{media:''});await evaluate(`window.dispatchEvent(new Event('afterprint'));true`);
    assert(await evaluate(`!document.querySelector('#context-method .context-history').open`),'Printing changed the previous disclosure state');
    const long='Synthetic long-note test: '+('A very long unbroken token '+ 'x'.repeat(400)+'\n').repeat(20);
    await evaluate(`(()=>{const input=document.getElementById('note-method');input.value=${JSON.stringify(long)};input.dispatchEvent(new Event('input'));document.getElementById('apply-methods').click();return true})()`);await settle();
    assert((await captureExport()).includes(long),'Long note text changed during Apply/export');
  }
  for(const width of [320,390,768,1024,1440]) {
    await viewport(width,844);
    assert(await evaluate('document.documentElement.scrollWidth<=innerWidth'),'Context layout overflows at '+width);
  }
  await viewport(1440,1000);
  await click('confirm-export');
  return {pilot:!full,apply_actions:full?21:1,existing_text_and_whitespace_preserved:true,explicit_only_context:true,duplicate_safe:true,context_dirty_state:true,exact_return_and_focus:true,native_back_forward:true,keyboard_apply:true,mobile_no_text_focus:true,export_context_separate:true,print_context:true,removal_preserves_notes:true,multiple_contexts:full,compact_selected_context:full,older_context_print_and_restore:full,long_notes:full,all_ten_fields:full,bookmark_unchanged:true};
}
