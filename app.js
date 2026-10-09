(() => {
  'use strict';
  document.documentElement.classList.add('js');
  const status = document.getElementById('reader-status');
  const tell = (text) => { if (status) status.textContent = text; };
  document.querySelectorAll('[data-print]').forEach((button) => button.addEventListener('click', () => window.print()));
  let printDetails = [];
  window.addEventListener('beforeprint', () => {
    if (printDetails.length) return;
    printDetails = [...document.querySelectorAll('.field-kit details, .guide-context details')].map(node => [node,node.open]);
    printDetails.forEach(([node]) => {node.open=true;});
  });
  window.addEventListener('afterprint', () => {printDetails.forEach(([node,open]) => {node.open=open;});printDetails=[];});
  const sections = [...document.querySelectorAll('main > section[id]')];
  const links = [...document.querySelectorAll('.toc nav > a')];
  const pathLinks = [...document.querySelectorAll('.reading-path nav > a:not(.path-source)')];
  const pathStarts = pathLinks.map(link => document.getElementById(link.hash.slice(1)));
  let pendingLocation = false;
  function updateLocation() {
    pendingLocation = false;
    const line = Math.min(180, innerHeight * .25);
    const leading = [...sections].reverse().find(section => section.getBoundingClientRect().top <= line);
    for (const link of links) {
      if (leading && link.hash === '#' + leading.id) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
    const path = [...pathStarts].reverse().find(section => section && section.getBoundingClientRect().top <= line);
    const atSources = leading?.id === 'sources';
    for (const link of pathLinks) {
      if (!atSources && path && link.hash === '#' + path.id) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
    const sourceLink = document.querySelector('.reading-path .path-source');
    if (sourceLink) {
      if (atSources) sourceLink.setAttribute('aria-current', 'location');
      else sourceLink.removeAttribute('aria-current');
    }
    // Keep the active chapter inside the left rail without moving the document.
    const active = links.find(link => link.hasAttribute('aria-current'));
    const rail = document.querySelector('.toc');
    if (active && rail && getComputedStyle(rail).position === 'sticky') {
      const a = active.getBoundingClientRect(), r = rail.getBoundingClientRect();
      if (a.bottom > r.bottom - 24) rail.scrollTop += a.bottom - r.bottom + 24;
      else if (a.top < r.top + 16) rail.scrollTop -= r.top + 16 - a.top;
    }
  }
  function queueLocation() {
    if (!pendingLocation) { pendingLocation = true; requestAnimationFrame(updateLocation); }
  }
  window.addEventListener('scroll', queueLocation, {passive:true});
  window.addEventListener('resize', queueLocation, {passive:true});
  document.fonts.ready.then(queueLocation);
  queueLocation();
  const essentials = document.getElementById('essentials');
  if (essentials) essentials.addEventListener('change', () => {
    document.body.classList.toggle('essentials', essentials.checked);
    tell(essentials.checked ? 'Intuition view: key distinctions and exercises remain visible. Full detail is still included when printing.' : 'Full guide: intuition, technical detail and exercises are visible.');
  });
  const key = 'research-field-guide-bookmark-v1';
  const bookmark = document.getElementById('bookmark');
  const resume = document.getElementById('resume');
  try {
    const saved = localStorage.getItem(key);
    const target = saved && document.getElementById(saved);
    if (target && resume) { resume.href = '#' + saved; resume.hidden = false; }
  } catch { tell('Browser storage is unavailable. Section links still work; no reading history is tracked.'); }
  if (bookmark) bookmark.addEventListener('click', () => {
    const nearest = [...sections].reverse().find((s) => s.getBoundingClientRect().top <= 180);
    const id = nearest ? nearest.id : 'top';
    try {
      localStorage.setItem(key,id);
      if (resume) { resume.href = '#' + id; resume.hidden = false; }
      tell('Place saved on this browser. This is a bookmark, not a measure of learning.');
    } catch { tell('Could not save in browser storage. Bookmark this section using your browser instead.'); }
  });
  const search = document.getElementById('concept-search');
  const results = document.getElementById('search-results');
  const searchStatus = document.getElementById('search-status');
  if (search && results) {
    const index = [
      ...sections.filter(s => s.classList.contains('chapter')).map(s => ({id:s.id,title:s.dataset.title || s.querySelector('h2')?.textContent || s.id,kind:'Chapter',text:s.textContent.toLowerCase()})),
      ...document.querySelectorAll('.glossary-entry')
    ].map(item => item instanceof Element ? {id:item.id,title:item.querySelector('dfn').textContent,kind:'Glossary',text:item.textContent.toLowerCase()} : item);
    document.querySelectorAll('#research-notebook .field').forEach(field => {
      const input = field.querySelector('textarea');
      index.push({id:input.id,title:field.querySelector('label').textContent,kind:'Notebook',text:field.textContent.toLowerCase()});
    });
    search.addEventListener('input', () => {
      const query = search.value.trim().toLowerCase(); results.replaceChildren();
      if (!query) {results.hidden = true; if (searchStatus) searchStatus.textContent=''; return;}
      const found = index.filter(item => item.text.includes(query)).sort((a,b) => Number(b.title.toLowerCase().includes(query)) - Number(a.title.toLowerCase().includes(query)));
      results.hidden = false;
      const count = document.createElement('p'); count.textContent = found.length ? `${found.length} matches · showing ${Math.min(8,found.length)}` : 'No matching concept. Try “bias”, “review”, or “causal”.'; results.append(count);
      if (searchStatus) searchStatus.textContent = count.textContent;
      for (const item of found.slice(0,8)) {
        const link = document.createElement('a'); link.href = '#' + item.id; link.textContent = item.title;
        const label = document.createElement('small'); label.textContent = item.kind; link.append(label);
        link.addEventListener('click', () => {
          if (essentials && essentials.checked && item.kind === 'Chapter') {essentials.checked=false;document.body.classList.remove('essentials');tell('Full detail restored for this search result.');}
          const target=document.getElementById(item.id); if(target){target.tabIndex=-1;requestAnimationFrame(()=>target.focus({preventScroll:true}));}
        });
        results.append(link);
      }
    });
    search.addEventListener('keydown', e => {if(e.key==='Escape'){search.value='';results.hidden=true; if(searchStatus)searchStatus.textContent='';}});
  }
  document.querySelectorAll('.mobile-contents a').forEach(link => link.addEventListener('click',()=>{link.closest('details').open=false;}));
  function download(name, content, type) {
    const url=URL.createObjectURL(new Blob([content],{type})); const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
  }
  const kitButton = document.getElementById('download-kit');
  if (kitButton) kitButton.addEventListener('click',()=>{
    const text=[...document.querySelectorAll('.field-kit details')].map(d=>'## '+d.querySelector('summary').textContent+'\n\n'+d.querySelector('pre').textContent).join('\n\n');
    download('research-field-kit.md','# Groundwork — research field kit\n\nTemplates, not completed research records.\n\n'+text,'text/markdown;charset=utf-8');tell('Field-kit download requested. Check your browser downloads.');
  });
  const form=document.getElementById('research-notebook');
  if(form){
    const fields=[...form.querySelectorAll('textarea')]; const note=document.getElementById('notebook-status');
    let dirty=false;
    // A chapter association is context, never a mutation of the reader's note.
    const applications = new Map(JSON.parse(document.getElementById('guide-application-map')?.textContent || '[]')
      .map(item => [item.chapterId, item]));
    const contexts = new Map(fields.map(el => [el.name, new Set()]));
    // Arrival selection is navigation state, separate from exportable associations.
    const lastApplied = new Map();
    const updatePrint=()=>fields.forEach(el=>{const target=document.getElementById(el.id+'-print'); if(target)target.textContent=el.value||'Not filled in.';});
    const markDirty = (message) => {
      dirty=true;
      note.textContent=message+' Unsaved edits. Nothing is uploaded or automatically stored. Export before closing.';
      updatePrint();
    };
    const isTouchLayout = () => matchMedia('(max-width:700px), (pointer:coarse)').matches;
    const focusField = (input, editing=false) => {
      const target = editing && !isTouchLayout() ? input : input.closest('.field');
      requestAnimationFrame(() => target.focus({preventScroll:true}));
    };
    const make = (tag, text, className) => {
      const node=document.createElement(tag);
      if(text) {
        if((className || '').split(/\s+/).some(name=>name==='text-button' || name==='context-return')) {
          const label=document.createElement('span');label.className='action-label';label.textContent=text;node.append(label);
        } else node.textContent=text;
      }
      if(className) node.className=className;
      return node;
    };
    function renderContext(input) {
      const host=document.getElementById('context-'+input.name);
      const ids=contexts.get(input.name);
      const historyOpen=host.querySelector('.context-history')?.open || false;
      host.replaceChildren();host.hidden=ids.size===0;
      if(!ids.size) {lastApplied.delete(input.name);return;}
      const selected=ids.has(lastApplied.get(input.name)) ? lastApplied.get(input.name) : [...ids].at(-1);
      lastApplied.set(input.name,selected);
      host.append(make('p','Guide context — instructional, not research evidence.','guide-context-label'));
      const current=make('ul','','guide-context-list');
      const earlier=make('ul','','guide-context-list');
      for(const id of ids) {
        const chapter=applications.get(id);
        const row=make('li','','guide-context-row');row.dataset.chapter=id;
        row.append(make('span',String(chapter.number).padStart(2,'0')+' / '+chapter.title,'guide-context-title'));
        const actions=make('div','','context-actions');
        const back=make('a','Return to chapter','context-return');back.href='#apply-'+id;
        back.setAttribute('aria-label','Return to '+chapter.title+' Apply link');
        back.addEventListener('click',event=>{
          if(event.button!==0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
          requestAnimationFrame(()=>document.getElementById('apply-'+id).focus({preventScroll:true}));
        });
        const remove=make('button','Remove context','text-button context-remove');remove.type='button';
        remove.setAttribute('aria-label','Remove guide context: '+chapter.title);
        remove.addEventListener('click',()=>{
          ids.delete(id);renderContext(input);
          markDirty('Guide context removed. Your note text is unchanged.');
          focusField(input);
        });
        actions.append(back,remove);row.append(actions);
        row.append(make('span','research-field-guide.html#'+id,'context-reference'));
        (id===selected ? current : earlier).append(row);
      }
      host.append(current);
      if(earlier.children.length) {
        const history=make('details','','context-history');history.open=historyOpen;
        const count=earlier.children.length;
        history.append(make('summary',count+' other chapter context'+(count===1?'':'s')),earlier);
        host.append(history);
      }
    }
    document.querySelectorAll('[data-apply-chapter]').forEach(link=>link.addEventListener('click',event=>{
      // Modified/middle clicks retain ordinary browser navigation and attach nothing here.
      if(event.button!==0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const chapter=applications.get(link.dataset.applyChapter);
      const input=chapter && fields.find(el=>el.name===chapter.fieldId);
      if(!input) return;
      const ids=contexts.get(input.name);
      lastApplied.set(input.name,chapter.chapterId);
      if(!ids.has(chapter.chapterId)) {
        ids.add(chapter.chapterId);renderContext(input);
        markDirty('Guide context attached. Your note text is unchanged.');
      } else {
        renderContext(input);
        note.textContent='Guide context already attached. Your note text is unchanged. '+(dirty?'Unsaved edits. Export before closing.':'No new edits.');
      }
      // Keep the anchor's default history/scroll behavior. Mobile focus never opens a text keyboard.
      focusField(input,true);
    }));
    fields.forEach(el=>el.addEventListener('input',()=>markDirty('Note changed.')));
    window.addEventListener('beforeprint',updatePrint);updatePrint();
    document.getElementById('print-notebook').addEventListener('click',()=>{
      document.body.classList.add('print-notes');
      try { window.print(); } finally { document.body.classList.remove('print-notes'); }
    });
    window.addEventListener('afterprint',()=>document.body.classList.remove('print-notes'));
    window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
    document.getElementById('export-notebook').addEventListener('click',()=>{
      const sections=fields.map(input=>{
        const label=input.labels[0].textContent.trim();
        let section='## '+label+'\n\n'+(input.value||'Not filled in.');
        const ids=contexts.get(input.name);
        if(ids.size) {
          section+='\n\n### Guide context — instructional reference, not research evidence\n\n';
          section+=[...ids].map(id=>{
            const chapter=applications.get(id);
            return '- Chapter '+String(chapter.number).padStart(2,'0')+': '+chapter.title+'\n  research-field-guide.html#'+id;
          }).join('\n');
        }
        return section;
      });
      const text='# Groundwork — research notebook\n\nWorking notes; labels are not evidence of completed research. Guide links are relative and resolve when research-field-guide.html accompanies this Markdown.\n\n'+sections.join('\n\n');
      download('research-notebook.md',text,'text/markdown;charset=utf-8');note.textContent='Download requested. Verify the file before closing; this page has no autosave.';
    });
    document.getElementById('confirm-export').addEventListener('click',()=>{dirty=false;note.textContent='You marked your external copy saved. New edits will be marked unsaved again.';});
  }
})();
