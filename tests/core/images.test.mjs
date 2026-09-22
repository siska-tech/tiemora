import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import os from 'node:os';
import {publishMedia,applyRewrites,generateThumbnails,attachThumbnails,variants,maxEdge} from '../../scripts/images.mjs';

// libvips keeps decoded files open, which blocks the temp-directory cleanup on Windows.
sharp.cache(false);

const card=variants.find(v=>v.name==='card'),thumb=variants.find(v=>v.name==='thumb');

async function workspace(t){
  const root=await mkdtemp(path.join(os.tmpdir(),'tiemora-images-'));
  t.after(()=>rm(root,{recursive:true,force:true}));
  const source=path.join(root,'source'),output=path.join(root,'dist');
  await mkdir(path.join(source,'catalog'),{recursive:true});
  const add=async(name,width,height)=>{
    const file=path.join(source,'catalog',name);
    const canvas=sharp({create:{width,height,channels:3,background:{r:150,g:60,b:70}}});
    await (path.extname(name)==='.webp'?canvas.webp():canvas.jpeg()).toFile(file);
    return {source:file,relative:path.join('catalog',name),url:'/catalog/'+name};
  };
  // Noise is the worst case for any codec; saved at a low JPEG quality it lands very small.
  const noisy=async(name,size,options)=>{
    const file=path.join(source,'catalog',name);
    await sharp({create:{width:size,height:size,channels:3,noise:{type:'gaussian',mean:128,sigma:70}}}).jpeg(options).toFile(file);
    return {source:file,relative:path.join('catalog',name),url:'/catalog/'+name};
  };
  const raw=async name=>{
    const file=path.join(source,'catalog',name);
    await writeFile(file,'not an image');
    return {source:file,relative:path.join('catalog',name),url:'/catalog/'+name};
  };
  return {output,add,noisy,raw};
}

test('images past the long-edge limit are published as WebP; smaller ones are copied untouched',async t=>{
  const {output,add}=await workspace(t);
  const big=await add('big.jpg',2000,3000);
  const fine=await add('fine.jpg',900,1200);
  const {published,rewrites,converted}=await publishMedia([big,fine],output);
  assert.equal(converted,1);
  assert.deepEqual(rewrites,{'/catalog/big.jpg':'/catalog/big.webp'});
  const reduced=await sharp(path.join(output,'catalog','big.webp')).metadata();
  assert.equal(reduced.format,'webp');
  assert.equal(Math.max(reduced.width,reduced.height),maxEdge);
  assert.equal(reduced.width,Math.round(2000/3000*maxEdge));
  // The untouched file is byte-for-byte the original, not a re-encode.
  assert.deepEqual(await readFile(path.join(output,'catalog','fine.jpg')),await readFile(fine.source));
  // Thumbnails are still cut from the full-resolution master.
  assert.deepEqual(published.map(f=>[f.source,f.url]),[[big.source,'/catalog/big.webp'],[fine.source,'/catalog/fine.jpg']]);
});

test('a reduced copy that is no smaller than the original is thrown away',async t=>{
  const {output,noisy}=await workspace(t);
  // Barely over the limit and already crushed to a low JPEG quality: re-encoding only adds bytes.
  const stubborn=await noisy('stubborn.jpg',maxEdge+40,{quality:12});
  const {rewrites,converted}=await publishMedia([stubborn],output);
  assert.equal(converted,0);
  assert.deepEqual(rewrites,{});
  assert.deepEqual(await readFile(path.join(output,'catalog','stubborn.jpg')),await readFile(stubborn.source));
});

test('an unreadable or already-taken name is published unchanged with a warning',async t=>{
  const {output,add,raw}=await workspace(t);
  const broken=await raw('broken.jpg');
  const clip=await raw('clip.mp4');
  const clash=await add('clash.jpg',2000,3000);
  const sibling=await add('clash.webp',100,100);
  const warnings=[];
  const {rewrites,converted}=await publishMedia([broken,clip,clash,sibling],output,{warn:m=>warnings.push(m)});
  assert.equal(converted,0);
  assert.deepEqual(rewrites,{});
  assert.deepEqual(await readFile(path.join(output,'catalog','clash.jpg')),await readFile(clash.source));
  assert.equal(warnings.length,2);
  assert(warnings.some(m=>m.includes('broken.jpg')&&m.includes('unreadable')));
  assert(warnings.some(m=>m.includes('clash.jpg')&&m.includes('already taken')));
});

test('the rewritten names reach cover, images and video posters',async ()=>{
  const products=[{
    id:'a',
    cover:'/c/1.jpg',
    images:['/c/1.jpg','/c/2.png'],
    videos:['/c/clip.mp4'],
    posters:{'/c/clip.mp4':'/c/clip.jpg'}
  }];
  applyRewrites(products,{'/c/1.jpg':'/c/1.webp','/c/clip.jpg':'/c/clip.webp'});
  assert.equal(products[0].cover,'/c/1.webp');
  assert.deepEqual(products[0].images,['/c/1.webp','/c/2.png']);
  assert.deepEqual(products[0].videos,['/c/clip.mp4']);
  assert.deepEqual(products[0].posters,{'/c/clip.mp4':'/c/clip.webp'});
});

test('every catalog image gets a card and strip copy, sized from the display it serves',async t=>{
  const {output,add}=await workspace(t);
  const {generated,written}=await generateThumbnails([await add('big.jpg',1200,1600)],output);
  assert.equal(written,2);
  assert.deepEqual(generated['/catalog/big.jpg'],{card:'/catalog/big.card.webp',thumb:'/catalog/big.thumb.webp'});
  for(const {name,width,height} of variants){
    const meta=await sharp(path.join(output,'catalog',`big.${name}.webp`)).metadata();
    assert.equal(meta.format,'webp');
    assert.equal(meta.width,width);
    assert.equal(meta.height,height);
  }
});

test('sources already smaller than a size keep serving the published image',async t=>{
  const {output,add,raw}=await workspace(t);
  const files=[await add('small.jpg',card.width-1,card.height+400),await add('tiny.jpg',thumb.width-1,thumb.height-1),await raw('clip.mp4')];
  const warnings=[];
  const {generated,written}=await generateThumbnails(files,output,{warn:m=>warnings.push(m)});
  assert.equal(written,1);
  assert.deepEqual(generated['/catalog/small.jpg'],{thumb:'/catalog/small.thumb.webp'});
  assert.equal(generated['/catalog/tiny.jpg'],undefined);
  assert.equal(generated['/catalog/clip.mp4'],undefined);
  assert.deepEqual(warnings,[]);
});

test('an unreadable image warns and leaves the published image in place',async t=>{
  const {output,raw}=await workspace(t);
  const warnings=[];
  const {generated,written}=await generateThumbnails([await raw('broken.jpg')],output,{warn:m=>warnings.push(m)});
  assert.equal(written,0);
  assert.deepEqual(generated,{});
  assert.equal(warnings.length,1);
  assert(warnings[0].includes('broken.jpg'));
});

test('products carry only their own sizes, covering video posters as well as photos',async ()=>{
  const generated={
    '/a/1.jpg':{card:'/a/1.card.webp',thumb:'/a/1.thumb.webp'},
    '/a/poster.jpg':{thumb:'/a/poster.thumb.webp'},
    '/b/1.jpg':{card:'/b/1.card.webp'}
  };
  const products=[
    {id:'a',images:['/a/1.jpg'],videos:['/a/clip.mp4'],posters:{'/a/clip.mp4':'/a/poster.jpg'}},
    {id:'c',images:['/c/1.jpg'],variants:{'/c/stale.jpg':{}}}
  ];
  const [a,c]=attachThumbnails(products,generated);
  assert.deepEqual(Object.keys(a.variants),['/a/1.jpg','/a/poster.jpg']);
  assert.equal(a.variants['/a/poster.jpg'].thumb,'/a/poster.thumb.webp');
  assert.equal('variants' in c,false);
});
