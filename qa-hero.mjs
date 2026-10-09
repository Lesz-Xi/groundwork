// Content-led hero sizing; author QA in local Chrome, not device certification.
export async function testHero({evaluate,viewport,navigate,assert}) {
  const measure=()=>evaluate(`(()=>{window.scrollTo(0,0);const hero=document.querySelector('.intro'),s=getComputedStyle(hero),r=hero.getBoundingClientRect();const rect=el=>{const b=el.getBoundingClientRect();return {x:b.x,y:b.y,width:b.width,height:b.height};};const children=[...hero.children].map(el=>({...rect(el),font:getComputedStyle(el).fontSize,text:el.textContent.trim()}));const mobile=document.querySelector('.mobile-contents');const entry=getComputedStyle(mobile).display==='none'?document.querySelector('.book-layout'):mobile;return {hero:rect(hero),minimum:s.minHeight,padding:[s.paddingTop,s.paddingRight,s.paddingBottom,s.paddingLeft],gap:s.gap,children,readingEntry:entry.getBoundingClientRect().top,overflow:document.documentElement.scrollWidth>innerWidth,contained:children.every(b=>b.y>=r.y&&b.y+b.height<=r.bottom-parseFloat(s.paddingBottom)+1),paddingFits:Math.abs(children.at(-1).y+children.at(-1).height+parseFloat(s.paddingBottom)-r.bottom)<1};})()`);
  const comparisons=[];
  for(const width of [1440,900,390,320]) {
    await viewport(width,1000);
    await navigate('tests/fixtures/hero-before.html');const before=await measure();
    await navigate('research-field-guide.html');const after=await measure();
    assert(['0px','auto'].includes(after.minimum)&&after.contained&&after.paddingFits&&!after.overflow,'Hero does not follow content at '+width+' '+JSON.stringify(after));
    assert(JSON.stringify(before.padding)===JSON.stringify(after.padding)&&before.gap===after.gap&&JSON.stringify(before.children)===JSON.stringify(after.children),'Hero content/type/alignment/spacing drift at '+width);
    assert(after.readingEntry<=before.readingEntry&&after.hero.height<=before.hero.height,'Reading entrance moved later at '+width);
    if(width===1440||width===390)assert(after.readingEntry<before.readingEntry-1,'Hero reservation was not reduced at '+width);
    comparisons.push({width,before,after,readingEntryEarlierBy:before.readingEntry-after.readingEntry});
  }
  const enlarged=[];
  for(const width of [1440,390]) {
    await viewport(width,1000);await navigate('research-field-guide.html');const before=await measure();
    await evaluate(`(()=>{for(const el of document.querySelectorAll('.intro h1,.intro .lede,.intro-actions>a'))el.style.fontSize=(parseFloat(getComputedStyle(el).fontSize)*1.5)+'px';return true;})()`);
    const after=await measure();assert(after.hero.height>before.hero.height&&after.contained&&after.paddingFits&&!after.overflow,'150% hero-text fixture clips at '+width+' '+JSON.stringify(after));
    enlarged.push({width,heightBefore:before.hero.height,heightAfter:after.hero.height,contained:true,overflow:false});
  }
  await viewport(1440,1000);await navigate('research-field-guide.html');
  return {content_led_hero:true,comparisons,enlarged_text_fixture_150_percent:enlarged,scope:'Only hero text enlarged synthetically; not browser zoom/screen-reader/native-device certification'};
}
