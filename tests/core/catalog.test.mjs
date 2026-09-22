// core/catalog/collect.mjs: recursive scan, YAML parsing, duplicate ids, media detection.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {collectCatalog,webPath,localized} from '../../core/catalog/collect.mjs';
import {generateCatalog} from '../../scripts/generate-catalog.mjs';

async function fixture(t){
  const root=await mkdtemp(path.join(os.tmpdir(),'tiemora-catalog-'));
  t.after(()=>rm(root,{recursive:true,force:true}));
  const add=async(dir,yaml,media=[])=>{
    const folder=path.join(root,dir);await mkdir(folder,{recursive:true});
    await writeFile(path.join(folder,'product.yaml'),yaml);
    for(const name of media)await writeFile(path.join(folder,name),'test media');
    return folder;
  };
  return {root,add};
}
test('recursive detection, case-insensitive extensions, cover priority, natural sorting, metadata',async t=>{
  const {root,add}=await fixture(t);
  await add('rental/season/red','id: red\nname:\n  ja: 赤\ncategory: rental\nprice:\n  rental: 300000\nfeatured: true\navailable: false\nmodel:\n  height: 160\n  wearing_size: M\n',['10.JPG','2.jpeg','cover.WEBP','cover.PNG','cover.JPEG','cover.JPG','Demo.MP4','clip.WEBM','walk.MOV','x.AVIF','y.GIF']);
  const {products,files}=await collectCatalog(root);
  assert.equal(products.length,1);
  const p=products[0];
  assert.equal(p.cover,'/catalog/rental/season/red/cover.JPG');
  assert.equal(p.images[0],p.cover);
  assert(p.images.indexOf('/catalog/rental/season/red/2.jpeg')<p.images.indexOf('/catalog/rental/season/red/10.JPG'));
  assert.equal(p.videos.length,3);assert.equal(p.images.length,8);assert.equal(files.length,11);
  assert.equal(p.available,false);assert.equal(p.featured,true);assert.equal(p.price.rental,300000);assert.equal(p.model.height,160);
  assert.equal(p.path,'/catalog/rental/season/red/');
  assert.equal(p.currency,'VND');
});
test('the store currency is the default; product.yaml may override it',async t=>{
  const {root,add}=await fixture(t);
  await add('a','id: a\nprice:\n  rental: 10\n');
  await add('b','id: b\ncurrency: usd\nprice:\n  rental: 10\n');
  await add('c','id: c\ncurrency: dollars\n');
  const warnings=[];const {products}=await collectCatalog(root,{currency:'JPY',warn:m=>warnings.push(m)});
  assert.deepEqual(products.map(p=>p.currency),['JPY','USD','JPY']);
  assert(warnings.some(m=>m.includes('Invalid currency; using JPY')));
});
test('explicit cover, YAML/YML, directory-derived id, optional fields, encoded paths',async t=>{
  const {root,add}=await fixture(t);
  const dir=await add('nested/日本 語','# optional fields\ncover: 02.webp\n',['01.JPG','02.webp']);
  await rm(path.join(dir,'product.yaml'));
  await writeFile(path.join(dir,'product.yml'),'cover: 02.webp\n');
  const warnings=[];const {products}=await collectCatalog(root,{warn:m=>warnings.push(m)});
  assert.equal(products[0].id,'nested/日本 語');
  assert(products[0].cover.endsWith('/02.webp'));assert(products[0].path.includes('%20'));
  assert.equal(products[0].available,null);assert.equal(products[0].price,undefined);
  assert(warnings.some(m=>m.includes('No id')));
  assert.equal(webPath('nested\\日本 語\\a #1.jpg'),webPath('nested/日本 語/a #1.jpg'));
});
test('cover fallbacks follow required priority and missing references warn',async t=>{
  const {root,add}=await fixture(t);
  for(const [folder,media] of [
    ['a',['cover.jpeg','cover.webp','cover.png']],
    ['b',['cover.webp','cover.png']],
    ['c',['cover.png','01.jpg']],
    ['d',['10.jpg','2.jpg']]
  ]){await add(folder,`id: ${folder}\ncover: missing.jpg\n`,media);}
  const warnings=[];const {products}=await collectCatalog(root,{warn:m=>warnings.push(m)});
  assert.deepEqual(products.map(p=>p.cover.split('/').at(-1)),['cover.jpeg','cover.webp','cover.png','2.jpg']);
  assert.equal(warnings.filter(m=>m.includes('Cover')).length,4);
});
test('price.original is kept only when it is above the rental price',async t=>{
  const {root,add}=await fixture(t);
  await add('a','id: a\nprice:\n  rental: 100000\n  original: 140000\n');
  await add('b','id: b\nprice:\n  rental: 100000\n  original: 90000\n');
  await add('c','id: c\nprice:\n  original: 140000\n');
  const warnings=[];const {products}=await collectCatalog(root,{warn:m=>warnings.push(m)});
  const [a,b,c]=products;
  assert.deepEqual(a.price,{rental:100000,original:140000});
  assert.deepEqual(b.price,{rental:100000});
  assert.equal(c.price,undefined);
  assert.equal(warnings.filter(m=>m.includes('price.original')).length,2);
});
test('an image sharing a video basename becomes its poster and leaves the gallery',async t=>{
  const {root,add}=await fixture(t);
  await add('a','id: a\n',['image1.jpg','Video1.JPG','video1.mp4','clip.webm']);
  await add('b','id: b\n',['demo.jpg','demo.mp4']);
  const {products,files}=await collectCatalog(root);
  const [a,b]=products;
  assert.deepEqual(a.images,['/catalog/a/image1.jpg']);
  assert.deepEqual(a.posters,{'/catalog/a/video1.mp4':'/catalog/a/Video1.JPG'});
  assert.equal(a.cover,'/catalog/a/image1.jpg');
  assert.deepEqual(b.images,[]);assert.equal(b.cover,null);
  assert.deepEqual(b.posters,{'/catalog/b/demo.mp4':'/catalog/b/demo.jpg'});
  assert.equal(files.length,6);
});
test('recoverable errors warn, child products survive invalid parent, duplicate ids fail',async t=>{
  const {root,add}=await fixture(t);
  await add('broken','name: [bad\n');await add('broken/valid','id: child\nunknown: abc\n');
  const warnings=[];const {products}=await collectCatalog(root,{warn:m=>warnings.push(m)});
  assert.equal(products.length,1);assert.equal(products[0].cover,null);
  for(const text of ['Skipping product','Unknown field','No supported media'])assert(warnings.some(m=>m.includes(text)));
  await add('duplicate','id: child');
  await assert.rejects(collectCatalog(root,{warn:()=>{}}),/Duplicate id.*child/);
});
test('order sorting is stable; folder additions regenerate JSON; YAML is never a media asset',async t=>{
  const {root,add}=await fixture(t);
  await add('z','id: z\norder: 1\nfeatured: false');
  await add('a','id: a\norder: 20\nfeatured: true');
  await add('b10','id: b10');await add('b2','id: b2');
  const output=path.join(root,'generated.json');
  const first=await generateCatalog({root,output,warn:()=>{}});
  assert.deepEqual(first.products.map(p=>p.id),['z','a','b2','b10']);
  const original=await readFile(output,'utf8');
  await generateCatalog({root,output,warn:()=>{}});assert.equal(await readFile(output,'utf8'),original);
  await add('new/deeper/design','id: new\norder: 0',['cover.jpg']);
  const next=await generateCatalog({root,output,warn:()=>{}});
  assert.equal(JSON.parse(await readFile(output,'utf8')).length,5);
  assert.equal(next.products[0].id,'new');assert(next.files.every(f=>!f.source.endsWith('.yaml')));
});
test('language fallbacks, missing catalog, empty metadata, unsafe cover',async t=>{
  assert.equal(localized({vi:'Vi',ja:'Ja',en:'En'},'zh'),'Vi');
  assert.equal(localized({ja:'Ja',en:'En'},'zh'),'En');
  assert.equal(localized({ja:'Ja',fr:'Fr'},'zh'),'Ja');
  assert.equal(localized({fr:'Fr'},'zh'),'Fr');
  const {root,add}=await fixture(t);
  await add('empty','');await add('unsafe','id: unsafe\ncover: ../outside.jpg',['1.jpg']);
  const {products}=await collectCatalog(root,{warn:()=>{}});assert.equal(products.length,2);
  assert(products.find(p=>p.id==='unsafe').cover.endsWith('/1.jpg'));
  assert.deepEqual((await collectCatalog(path.join(root,'missing'),{warn:()=>{}})).products,[]);
});
test('inventory.managed passes through as a boolean and other shapes warn',async t=>{
  const {root,add}=await fixture(t);
  await add('a','id: a\ninventory:\n  managed: true\n');
  await add('b','id: b\navailable: true\ninventory:\n  managed: false\n  count: 3\n');
  await add('c','id: c\ninventory: yes\n');
  await add('d','id: d\n');
  const warnings=[];const {products}=await collectCatalog(root,{warn:m=>warnings.push(m)});
  assert.deepEqual(products.map(p=>p.inventory),[{managed:true},{managed:false},undefined,undefined]);
  assert.equal(products[1].available,true);
  assert(warnings.some(m=>m.includes('inventory.count')));
  assert(warnings.some(m=>m.includes('inventory must be a mapping')));
});
test('the shipped sample catalog is valid and has no duplicate ids',async()=>{
  const {products}=await collectCatalog(new URL('../../examples/catalog/',import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1'),{warn:m=>{throw new Error('unexpected warning: '+m);}});
  assert.deepEqual(products.map(p=>p.id),['sample-rental-001','sample-rental-002','sample-rental-003']);
  assert(products.every(p=>p.images.length>=1));
  assert.deepEqual(products.map(p=>p.inventory?.managed===true),[true,true,false]);
});
