// Browser-side decoding/rasterization of the exact embedded SVGs. This checks
// declarations and small-size legibility, not native tab caching or PWA install.
export async function testIcons({evaluate,send,assert}) {
 const checks=[];
 for(const scheme of ['light','dark']) {
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:scheme}]});
  const icon=await evaluate(`(async()=>{
   const links=[...document.querySelectorAll('head link[rel="icon"]')];
   const selected=links.filter(link=>!link.media||matchMedia(link.media).matches).at(-1);
   if(!selected)throw new Error('No matching browser icon');
   const image=new Image();image.src=selected.href;await image.decode();
   const pixels=[16,24,32].map(size=>{
    const canvas=document.createElement('canvas');canvas.width=canvas.height=size;
    const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0,size,size);
    const data=ctx.getImageData(0,0,size,size).data;let base=0,orange=0;
    const dark=matchMedia('(prefers-color-scheme: dark)').matches;
    for(let i=0;i<data.length;i+=4){
     if(data[i+3]<100)continue;
     if(data[i]>240&&data[i+1]>120&&data[i+1]<170&&data[i+2]<70)orange++;
     if(dark?data[i]>200&&data[i+1]>200&&data[i+2]>200:data[i]<40&&data[i+1]<55&&data[i+2]<65)base++;
    }
    return {size,base_pixels:base,orange_pixels:orange};
   });
   return {scheme:matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light',links:links.length,type:selected.type,sizes:selected.sizes.value,media:selected.media,embedded:selected.href.startsWith('data:image/svg+xml;base64,'),natural_width:image.naturalWidth,natural_height:image.naturalHeight,pixels};
  })()`);
  assert(icon.scheme===scheme&&icon.links===2&&icon.type==='image/svg+xml'&&icon.sizes==='any'&&icon.embedded&&icon.natural_width===184&&icon.natural_height===184&&icon.pixels.every(p=>p.base_pixels>0&&p.orange_pixels>0),'SVG browser icon failed '+JSON.stringify(icon));
  checks.push(icon);
 }
 await send('Emulation.setEmulatedMedia',{features:[]});
 const specimen=await evaluate(`(async()=>{
  const canvas=document.createElement('canvas');canvas.width=480;canvas.height=192;
  const ctx=canvas.getContext('2d');const links=[...document.querySelectorAll('head link[rel="icon"]')];
  for(const [row,link] of links.entries()){
   const image=new Image();image.src=link.href;await image.decode();
   ctx.fillStyle=row?'#122128':'#dde0e0';ctx.fillRect(0,row*96,480,96);
   ctx.fillStyle=row?'#dde0e0':'#122128';ctx.font='12px "Commit Mono"';
   for(const [col,size] of [16,24,32].entries()){
    const x=col*160+32;ctx.fillText((row?'Dark':'Light')+' / '+size+'px',x,row*96+22);
    ctx.drawImage(image,x,row*96+42,size,size);
   }
  }
  return canvas.toDataURL('image/png').split(',')[1];
 })()`);
 return {checks,specimen,scope:'Emulated theme media matching and SVG image decode/pixels at 16/24/32px; not native tab-cache or installed-app certification'};
}
