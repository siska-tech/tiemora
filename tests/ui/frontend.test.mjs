// The storefront driven in jsdom: store.json, catalog.json and the availability API are mocked,
// the four page scripts run as they do in a browser.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {JSDOM} from 'jsdom';

const fixture=[
 {id:'outfit-red-001',name:{vi:'Trang phục đỏ',ja:'赤い衣装'},description:{en:'A red design'},category:'rental',price:{rental:300000},currency:'VND',available:false,featured:false,cover:'/catalog/red/cover.jpg',images:['/catalog/red/cover.jpg','/catalog/red/2.jpg'],videos:['/catalog/red/demo.mp4'],sizes:['S','M'],model:{height:160,wearing_size:'M'}},
 {id:'accessory-featured',name:{en:'<img src=x onerror=alert(1)>'},category:'accessories',featured:true,available:true,cover:'/catalog/acc/cover.png',images:['/catalog/acc/cover.png'],videos:[]}
];
const storeFixture={
 store:{name:'Test Store',tagline:{vi:'Cửa hàng thử',en:'Test shop'},description:{vi:'Mô tả thử',en:'Test description'},logo:null,hero:{title:{en:'Hello <em>world</em>',vi:'Xin chào <em>bạn</em>'},subtitle:null,image:null},announcement:{vi:'Khuyến mãi',en:'Promo'},values:[{vi:'Một',en:'One'},{vi:'Hai',en:'Two'}]},
 languages:['vi','en','ja','zh'],defaultLanguage:'vi',currency:'VND',timezone:'Asia/Ho_Chi_Minh',phoneCountryCode:'84',
 contact:{facebook:'https://www.facebook.com/teststore',messenger:'https://m.me/teststore',zalo:null,whatsapp:'0900000000',phone:'+84 900 000 000',email:null,address:{vi:'Địa chỉ thử',en:'Test address'},mapUrl:'https://maps.example/test'},
 categories:{rental:{vi:'Cho thuê',en:'Rental',ja:'レンタル',zh:'租赁'},accessories:{vi:'Phụ kiện',en:'Accessories'}},
 theme:{primary:'#3b5b6b'},booking:{maxRentalDays:60,maxDaysAhead:365,bufferDays:0},admin:{defaultLanguage:'en'}
};
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(check,label,timeout=2000){const started=Date.now();while(Date.now()-started<timeout){const v=check();if(v)return v;await wait(5);}throw new Error('Timed out: '+label);}
async function setup(t,{failure=false,data=fixture,reduceMotion=false,hash='',availability=null,store=storeFixture,storeFails=false}={}){
 const dom=new JSDOM(await readFile(new URL('../../storefront/index.html',import.meta.url),'utf8'),{url:'https://store.example/'+hash,runScripts:'outside-only'});
 t.after(()=>dom.window.close());
 const {window}=dom;let shouldFail=failure;let pauses=0;const copied=[];
 Object.defineProperty(window.navigator,'clipboard',{configurable:true,value:{writeText:async text=>{copied.push(text);}}});
 const availabilityRequests=[];
 window.fetch=async url=>{
  if(url==='/store.json'){if(storeFails)throw new Error('no store');return {ok:true,json:async()=>structuredClone(store)};}
  if(url.startsWith('/api/availability')){availabilityRequests.push(url);if(!availability)throw new Error('No API in this test');return {ok:true,json:async()=>({products:structuredClone(availability)})};}
  assert.equal(url,'/catalog.json');if(shouldFail)throw new Error('Test failure');return {ok:true,json:async()=>structuredClone(data)};};
 window.console.error=()=>{};window.console.warn=()=>{};
 window.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};
 window.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');this.dispatchEvent(new window.Event('close'));};
 window.HTMLMediaElement.prototype.pause=function(){pauses++;};
 window.matchMedia=query=>({media:query,matches:reduceMotion&&query.includes('prefers-reduced-motion'),addEventListener(){},removeEventListener(){}});
 window.requestAnimationFrame=callback=>{callback(0);return 0;};
 window.cancelAnimationFrame=()=>{};
 const observers=[];
 window.IntersectionObserver=class{
  constructor(callback,options){this.callback=callback;this.options=options;this.elements=[];observers.push(this);}
  observe(el){this.elements.push(el);}
  unobserve(el){this.elements=this.elements.filter(e=>e!==el);}
  disconnect(){this.elements=[];}
 };
 for(const file of ['catalog.js','gallery.js','app.js','booking.js'])new vm.Script(await readFile(new URL('../../storefront/'+file,import.meta.url),'utf8'),{filename:file}).runInContext(dom.getInternalVMContext());
 // store.json -> copy -> catalog.json: wait until the grid has settled (cards, empty state or error).
 await until(()=>window.document.getElementById('products').getAttribute('aria-busy')==='false','catalog render');
 await wait(0);
 return {window,document:window.document,recover:()=>{shouldFail=false;},pauses:()=>pauses,observers,copied,availabilityRequests};
}
const setLang=(d,window,lang)=>{const selector=d.getElementById('language');selector.value=lang;selector.dispatchEvent(new window.Event('change'));};

test('store.json drives the branding: name, tagline, hero title, announcement, values, languages and contact channels',async t=>{
 const {window,document:d}=await setup(t);
 assert.equal(d.getElementById('brand-name').textContent,'Test Store');
 assert.equal(d.getElementById('brand-tagline').textContent,'Cửa hàng thử');
 assert.equal(d.getElementById('hero-title').innerHTML,'Xin chào <em>bạn</em>');
 assert.equal(d.getElementById('hero-description').textContent,'Mô tả thử');
 assert.equal(d.getElementById('announcement').hidden,false);
 assert.equal(d.getElementById('announcement-text').textContent,'Khuyến mãi');
 assert.deepEqual([...d.querySelectorAll('#values-list span')].map(el=>el.textContent),['Một','Hai']);
 assert.deepEqual([...d.getElementById('language').options].map(o=>o.value),['vi','en','ja','zh']);
 assert.equal(d.title,'Test Store | Cửa hàng thử');
 // Contact: messenger, whatsapp (normalised), facebook, phone; zalo and email are null and absent.
 const channels=[...d.querySelectorAll('#contact-channels a')].map(a=>a.getAttribute('href'));
 assert.deepEqual(channels,['https://m.me/teststore','https://wa.me/84900000000','https://www.facebook.com/teststore','tel:+84900000000']);
 assert.equal(d.getElementById('store-details').hidden,false);
 assert.match(d.getElementById('store-details').textContent,/Địa chỉ thử/);
 // The first chat channel feeds every "message the store" link.
 assert.equal(d.getElementById('hero-chat').hidden,false);
 assert.equal(d.getElementById('hero-chat').getAttribute('href'),'https://m.me/teststore');
 setLang(d,window,'en');
 assert.equal(d.getElementById('hero-title').innerHTML,'Hello <em>world</em>');
 assert.equal(d.getElementById('brand-tagline').textContent,'Test shop');
 assert.equal(d.getElementById('announcement-text').textContent,'Promo');
 assert.equal(d.querySelector('[data-i18n="navCollection"]').textContent,'Catalog');
});

test('default copy stays generic while configured demo labels appear only in their language',async t=>{
 const generic=await setup(t);
 assert(!generic.document.querySelector('[data-i18n="collectionTitle"]').textContent.includes('Hà Nội'));
 assert([...generic.document.querySelectorAll('.hero-services span')].every(el=>el.hidden));
 const store={...storeFixture,store:{...storeFixture.store,text:{heroDineIn:{vi:'At the table'},collectionTitle:{vi:'Demo menu'}}}};
 const {document:d,window}=await setup(t,{store});
 assert.equal(d.querySelector('[data-i18n="collectionTitle"]').textContent,'Demo menu');
 assert.equal(d.querySelector('[data-i18n="heroDineIn"]').hidden,false);
 setLang(d,window,'en');
 assert(d.querySelector('[data-i18n="heroDineIn"]').hidden);
});
test('a store with fewer languages hides the others; without contact channels the chat links disappear',async t=>{
 const store={...storeFixture,languages:['en'],defaultLanguage:'en',contact:{},store:{...storeFixture.store,hero:{title:null},announcement:null,values:[]}};
 const {document:d}=await setup(t,{store});
 assert.deepEqual([...d.getElementById('language').options].map(o=>o.value),['en']);
 assert.equal(d.getElementById('language').parentElement.hidden,true);
 assert.equal(d.documentElement.lang,'en');
 assert.equal(d.getElementById('hero-title').innerHTML,'Pick something beautiful.\nKeep the <em>memory.</em>');
 assert.equal(d.getElementById('announcement').hidden,true);
 assert.equal(d.getElementById('values').hidden,true);
 assert.equal(d.querySelectorAll('#contact-channels a').length,0);
 assert.equal(d.getElementById('hero-chat').hidden,true);
 d.querySelector('[data-id="outfit-red-001"]').click();
 assert.equal(d.getElementById('dialog-chat').hidden,true);
});
test('the environmental hero layout marks the body and hands focus / subject to the scroll zoom',async t=>{
 const store={...storeFixture,store:{...storeFixture.store,hero:{layout:'environmental',title:null,fit:'cover',focus:'38% 50%',subject:'68% 70%'}}};
 const {document:d}=await setup(t,{store});
 assert(d.body.classList.contains('hero-environmental'));
 const image=d.getElementById('hero-image');
 assert.equal(image.dataset.focus,'38% 50%');
 assert.equal(image.dataset.subject,'68% 70%');
 assert.equal(image.style.objectPosition,'38% 50%');
 assert(d.querySelector('.hero-visual .hero-scroll-hint'));
 const split=await setup(t);
 assert(!split.document.body.classList.contains('hero-environmental'));
 assert.equal(split.document.getElementById('hero-image').dataset.subject,undefined);
});
test('when store.json is unavailable the page still renders with defaults',async t=>{
 const {document:d}=await setup(t,{storeFails:true});
 assert.equal(d.querySelectorAll('.product').length,2);
 assert.deepEqual([...d.getElementById('language').options].map(o=>o.value),['vi','en','ja','zh']);
});
test('fetch catalog; cards, category labels from config, price, availability, featured, language fallback and escaping',async t=>{
 const {window,document:d}=await setup(t);
 assert.equal(d.querySelectorAll('.product').length,2);
 assert.equal(d.querySelector('.product h3').textContent,'Trang phục đỏ');
 assert.equal(d.querySelector('.product .product-meta span').textContent,'Cho thuê');
 assert(d.querySelector('.product-price').textContent.includes('300.000'));
 assert(d.querySelector('.unavailable'));assert(d.querySelector('.product-badge'));
 assert.equal(d.querySelectorAll('.product h3 img').length,0);
 assert.equal(d.querySelector('.product-image img').getAttribute('src'),fixture[0].cover);
 for(const [lang,name] of [['ja','赤い衣装'],['en','Trang phục đỏ'],['zh','Trang phục đỏ'],['vi','Trang phục đỏ']]){
   setLang(d,window,lang);
   assert.equal(d.querySelector('.product h3').textContent,name);
 }
 assert.equal(d.querySelector('[data-filter="category:rental"]').textContent,'Cho thuê');
 setLang(d,window,'ja');
 assert.equal(d.querySelector('[data-filter="category:rental"]').textContent,'レンタル');
 // No Japanese label configured for accessories: falls back through the store's languages.
 assert.equal(d.querySelector('[data-filter="category:accessories"]').textContent,'Phụ kiện');
 d.getElementById('catalog-sort').value='featured';d.getElementById('catalog-sort').dispatchEvent(new window.Event('change'));
 assert.equal(d.querySelector('.product').dataset.id,'accessory-featured');
 d.querySelector('[data-filter="category:rental"]').click();assert.equal(d.querySelectorAll('.product').length,1);
 d.querySelector('[data-filter="featured"]').click();assert.equal(d.querySelector('.product').dataset.id,'accessory-featured');
});
test('arbitrary ids open translated detail; mixed gallery; video stopped on close',async t=>{
 const {window,document:d,pauses}=await setup(t);
 setLang(d,window,'ja');
 d.querySelector('[data-id="outfit-red-001"]').click();
 assert.equal(d.getElementById('dialog-title').textContent,'赤い衣装');
 assert.equal(d.getElementById('dialog-description').textContent,'A red design');
 assert(d.getElementById('dialog-details').textContent.includes('160 cm'));
 assert.equal(d.querySelectorAll('[data-media-index]').length,3);
 d.querySelector('[data-media-index="2"]').click();
 const video=d.querySelector('#gallery-stage video');assert(video.controls);assert(!video.autoplay);
 assert.equal(video.querySelector('source').getAttribute('src'),fixture[0].videos[0]);
 assert(d.getElementById('product-dialog').classList.contains('is-open'));
 d.getElementById('close-dialog').click();assert(pauses()>0);assert.equal(d.getElementById('dialog-art').innerHTML,'');
 assert(!d.getElementById('product-dialog').classList.contains('is-open'));
});
test('hero copy, section headings and cards start hidden and reveal once they intersect',async t=>{
 const {document:d,observers}=await setup(t);
 const hero=[...d.querySelectorAll('.hero-copy .reveal')];
 assert.deepEqual(hero.map(el=>el.className),['eyebrow reveal','reveal','hero-subtitle reveal','intro reveal']);
 assert.equal(observers.length,1);
 const [observer]=observers;
 const cards=[...d.querySelectorAll('.product')];
 assert.equal(cards.length,2);
 assert.deepEqual(cards.map(el=>el.style.getPropertyValue('--reveal-index')),['0','1']);
 const targets=[...hero,...cards,...d.querySelectorAll('.section-heading .reveal,.how .reveal,.contact .reveal')];
 assert(targets.every(el=>el.classList.contains('reveal')&&!el.classList.contains('is-visible')));
 assert(targets.every(el=>observer.elements.includes(el)));
 observer.callback([{target:targets[0],isIntersecting:false}],observer);
 assert(!targets[0].classList.contains('is-visible'));
 observer.callback(targets.map(target=>({target,isIntersecting:true})),observer);
 assert(targets.every(el=>el.classList.contains('is-visible')&&!observer.elements.includes(el)));
 const reduced=await setup(t,{reduceMotion:true});
 assert.equal(reduced.observers.length,0);
 assert([...reduced.document.querySelectorAll('.reveal')].every(el=>el.classList.contains('is-visible')));
});
test('a discount shows the original price struck through with the percentage off',async t=>{
 const discounted=[
  {id:'sale-01',name:{vi:'Món một'},category:'rental',price:{rental:100000,original:140000},currency:'VND',cover:'/catalog/a/1.jpg',images:['/catalog/a/1.jpg'],videos:[]},
  {id:'plain-01',name:{vi:'Món hai'},category:'rental',price:{rental:100000},currency:'VND',cover:'/catalog/b/1.jpg',images:['/catalog/b/1.jpg'],videos:[]}
 ];
 const {document:d}=await setup(t,{data:discounted});
 const [sale,plain]=d.querySelectorAll('.product-price');
 assert(sale.classList.contains('sale-price'));
 assert(sale.querySelector('.price-original').textContent.includes('140.000'));
 assert(sale.textContent.includes('100.000'));
 assert(sale.querySelector('.price-badge').textContent.includes('−29%'));
 assert(!plain.classList.contains('sale-price'));
 assert.equal(plain.querySelector('.price-original'),null);
 d.querySelector('[data-id="sale-01"]').click();
 const dialogPrice=d.getElementById('dialog-price');
 assert(dialogPrice.querySelector('.price-original').textContent.includes('140.000'));
 assert(dialogPrice.textContent.includes('100.000'));
});
test('the grid and the strip use the generated sizes; the stage keeps the full image',async t=>{
 const data=[{id:'sized',name:{vi:'Món'},category:'rental',cover:'/c/1.jpg',images:['/c/1.jpg','/c/2.jpg'],videos:[],
  variants:{'/c/1.jpg':{card:'/c/1.card.webp',thumb:'/c/1.thumb.webp'}}}];
 const {document:d}=await setup(t,{data});
 assert.equal(d.querySelector('.product-image img').getAttribute('src'),'/c/1.card.webp');
 d.querySelector('[data-id="sized"]').click();
 assert.deepEqual([...d.querySelectorAll('[data-media-index] img')].map(i=>i.getAttribute('src')),['/c/1.thumb.webp','/c/2.jpg']);
 assert.equal(d.querySelector('#gallery-stage img').getAttribute('src'),'/c/1.jpg');
});
test('opening a product puts it in the address bar and closing takes it back out',async t=>{
 const {window,document:d,copied}=await setup(t);
 const dialog=d.getElementById('product-dialog');
 assert.equal(window.location.hash,'');
 d.querySelector('[data-id="outfit-red-001"]').click();
 assert.equal(window.location.hash,'#outfit-red-001');
 assert(dialog.hasAttribute('open'));
 // The "message the store" button copies the product link and opens the configured chat channel.
 assert.equal(d.getElementById('dialog-chat').getAttribute('href'),'https://m.me/teststore');
 d.getElementById('dialog-chat').click();
 await wait(0);
 assert.equal(copied.at(-1).split('\n').at(-1),'https://store.example/#outfit-red-001');
 d.getElementById('close-dialog').click();
 assert.equal(window.location.hash,'');
 assert.equal(dialog.hasAttribute('open'),false);
});
test('with WhatsApp as the only chat channel the product text is prefilled into the link',async t=>{
 const store={...storeFixture,contact:{whatsapp:'0900000000'}};
 const {document:d}=await setup(t,{store});
 d.querySelector('[data-id="outfit-red-001"]').click();
 const href=d.getElementById('dialog-chat').getAttribute('href');
 assert(href.startsWith('https://wa.me/84900000000?text='));
 assert(decodeURIComponent(href).includes('Trang phục đỏ'));
});
test('a pasted product link opens the dialog, and going back closes it',async t=>{
 const {window,document:d}=await setup(t,{hash:'#accessory-featured'});
 const dialog=d.getElementById('product-dialog');
 assert(dialog.hasAttribute('open'));
 assert.equal(d.getElementById('dialog-title').textContent,'<img src=x onerror=alert(1)>');
 window.history.replaceState(null,'','/');
 window.dispatchEvent(new window.PopStateEvent('popstate'));
 assert.equal(dialog.hasAttribute('open'),false);
});
test('an unknown product link leaves the catalog alone',async t=>{
 const {document:d}=await setup(t,{hash:'#no-such-product'});
 assert.equal(d.getElementById('product-dialog').hasAttribute('open'),false);
 assert.equal(d.querySelectorAll('.product').length,2);
});
test('failed fetch can retry; empty catalog displays an empty state',async t=>{
 const {document:d,recover}=await setup(t,{failure:true});
 assert(d.getElementById('retry-catalog'));recover();d.getElementById('retry-catalog').click();
 await wait(0);assert.equal(d.querySelectorAll('.product').length,2);
 const empty=await setup(t,{data:[]});assert(empty.document.querySelector('.catalog-message'));assert.equal(empty.document.querySelectorAll('.product').length,0);
});

const stocked=[
 {id:'item-0001',name:{vi:'Một'},category:'rental',available:true,inventory:{managed:true},cover:'/c/1.jpg',images:['/c/1.jpg'],videos:[]},
 {id:'item-0002',name:{vi:'Hai'},category:'rental',available:true,inventory:{managed:true},cover:'/c/2.jpg',images:['/c/2.jpg'],videos:[]},
 {id:'item-0003',name:{vi:'Ba'},category:'rental',available:true,inventory:{managed:true},cover:'/c/3.jpg',images:['/c/3.jpg'],videos:[]},
 {id:'item-0004',name:{vi:'Bốn'},category:'rental',available:false,cover:'/c/4.jpg',images:['/c/4.jpg'],videos:[]}
];
const live={
 'item-0001':{total:1,available:1,status:'available',managed:true},
 'item-0002':{total:3,available:1,status:'low',managed:true},
 'item-0003':{total:1,available:0,status:'rented',managed:true},
 'item-0004':{total:0,available:0,status:'unavailable',managed:false}
};
test('managed products show live stock in every language; unmanaged ones keep the catalog flag',async t=>{
 const {window,document:d,availabilityRequests}=await setup(t,{data:stocked,availability:live});
 assert.deepEqual(availabilityRequests,['/api/availability']);
 const texts=()=>[...d.querySelectorAll('.availability')].map(el=>el.textContent);
 assert.deepEqual(texts(),['Có sẵn','Sắp hết','Đang cho thuê','Không có sẵn']);
 assert(d.querySelector('[data-id="item-0002"] .availability').classList.contains('status-low'));
 assert(d.querySelector('[data-id="item-0003"] .availability').classList.contains('status-rented'));
 assert(d.querySelector('[data-id="item-0004"] .availability').classList.contains('unavailable'));
 for(const [lang,expected] of [['ja',['在庫あり','残りわずか','貸出中','現在利用不可']],['en',['Available','Low stock','Currently rented','Unavailable']],['zh',['有库存','库存较少','出租中','暂不可用']]]){
  setLang(d,window,lang);
  assert.deepEqual(texts(),expected);
 }
 d.querySelector('[data-id="item-0003"]').click();
 assert(d.getElementById('dialog-details').textContent.startsWith('出租中'));
});
test('without the API the catalog flag is the fallback',async t=>{
 const {document:d}=await setup(t,{data:stocked});
 assert.deepEqual([...d.querySelectorAll('.availability')].map(el=>el.textContent),['Có sẵn','Có sẵn','Có sẵn','Không có sẵn']);
});
test('choosing rental dates asks for that period and hides items that are taken',async t=>{
 const {window,document:d,availabilityRequests,copied}=await setup(t,{data:stocked,availability:live});
 const from=d.getElementById('date-from'),to=d.getElementById('date-to');
 assert.equal(d.getElementById('date-search-note').textContent,'');
 from.value='2026-10-01';from.dispatchEvent(new window.Event('change'));
 await wait(0);
 assert.equal(availabilityRequests.at(-1),'/api/availability');
 assert.equal(to.min,'2026-10-01');
 to.value='2026-10-03';to.dispatchEvent(new window.Event('change'));
 await wait(0);
 assert.equal(availabilityRequests.at(-1),'/api/availability?from=2026-10-01&to=2026-10-03');
 assert.deepEqual([...d.querySelectorAll('.product')].map(el=>el.dataset.id),['item-0001','item-0002']);
 assert.equal(d.getElementById('count').textContent,'2 sản phẩm');
 assert.equal(d.querySelector('.availability').textContent,'Có sẵn · 01/10/2026 – 03/10/2026');
 assert.equal(d.getElementById('date-search-note').textContent,'Chỉ hiển thị sản phẩm còn trống trong khoảng ngày đã chọn.');
 d.querySelector('[data-id="item-0001"]').click();
 d.getElementById('dialog-chat').click();
 await wait(0);
 assert.deepEqual(copied.at(-1).split('\n').slice(2,4),['Ngày thuê: 2026-10-01','Ngày trả: 2026-10-03']);
 d.getElementById('close-dialog').click();
 d.getElementById('date-clear').click();
 await wait(0);
 assert.equal(from.value,'');
 assert.equal(availabilityRequests.at(-1),'/api/availability');
 assert.equal(d.querySelectorAll('.product').length,4);
});

// The public booking flow: dates + size in the product dialog, an availability check per size,
// then the request form and the "received, not yet confirmed" screen.
test('a customer checks dates and size, sends a request and gets a request id; the request is pending only',async t=>{
 const sized=[{...stocked[0],sizes:['M','L']},stocked[3]];
 const {window,document:d}=await setup(t,{data:sized,availability:live});
 const calls=[];let requestStatus=201;
 window.fetch=async(url,init={})=>{
  calls.push([url,init]);
  if(url.startsWith('/api/products/item-0001/availability')){const q=new URL(url,'https://store.example').searchParams;const free=q.get('size')!=='M';return {ok:true,json:async()=>({productId:'item-0001',from:q.get('from'),to:q.get('to'),total:1,available:free?1:0,status:free?'available':'rented',managed:true})};}
  if(url==='/api/reservation-requests/config')return {ok:true,json:async()=>({turnstileSiteKey:'',turnstile:{enabled:false,siteKeySet:false,secretSet:true}})};
  if(url==='/api/reservation-requests'){
   const body=JSON.parse(init.body);
   if(requestStatus===409)return {ok:false,status:409,json:async()=>({error:'unavailable',message:'taken'})};
   return {ok:true,status:201,json:async()=>({request:{id:'rsv-20261002-ab12',status:'pending',customer_name:body.customer_name,start_date:body.start_date,end_date:body.end_date,product_id:body.product_id,size:body.size},duplicate:false})};
  }
  throw new Error('unexpected '+url);
 };
 const tick=()=>wait(0);
 assert.equal(d.getElementById('hero-book').textContent.replace(/\s+/g,' ').trim(),'Đặt chỗ↗');
 assert.equal(d.querySelector('[data-id="item-0001"] .product-cta').textContent,'Kiểm tra lịch trống ↗');
 assert.equal(d.querySelector('[data-id="item-0004"] .product-cta'),null);
 d.querySelector('[data-id="item-0004"]').click();
 assert(d.getElementById('dialog-booking').hidden);
 d.getElementById('close-dialog').click();
 d.querySelector('[data-id="item-0001"]').click();
 const block=d.getElementById('dialog-booking');
 assert(!block.hidden);
 assert.equal(d.getElementById('booking-status').textContent,'Chọn ngày nhận và ngày trả để kiểm tra lịch trống.');
 assert(d.getElementById('booking-open').disabled);
 const from=d.getElementById('booking-from'),to=d.getElementById('booking-to'),size=d.getElementById('booking-size');
 assert.deepEqual([...size.options].map(o=>o.value),['','M','L']);
 from.value='2026-10-02';from.dispatchEvent(new window.Event('change'));
 to.value='2026-10-04';to.dispatchEvent(new window.Event('change'));
 await tick();await tick();
 assert.equal(calls.filter(([url])=>url.includes('/availability')).at(-1)[0],'/api/products/item-0001/availability?from=2026-10-02&to=2026-10-04');
 assert.equal(d.getElementById('booking-status').textContent,'Có sẵn');
 assert(!d.getElementById('booking-open').disabled);
 size.value='M';size.dispatchEvent(new window.Event('change'));
 await tick();await tick();
 assert.equal(calls.filter(([url])=>url.includes('/availability')).at(-1)[0],'/api/products/item-0001/availability?from=2026-10-02&to=2026-10-04&size=M');
 assert.equal(d.getElementById('booking-status').textContent,'Không có sẵn trong thời gian này');
 assert(d.getElementById('booking-open').disabled);
 size.value='L';size.dispatchEvent(new window.Event('change'));
 await tick();await tick();
 assert.equal(d.getElementById('booking-status').textContent,'Có sẵn');
 d.getElementById('booking-open').click();
 await tick();
 const bookingDialog=d.getElementById('booking-dialog'),form=d.getElementById('booking-form');
 assert(bookingDialog.hasAttribute('open'));
 assert.match(d.getElementById('booking-summary').textContent,/Một.*Ngày nhận: 02\/10\/2026.*Ngày trả: 04\/10\/2026.*Kích cỡ: L/);
 assert.equal(d.getElementById('booking-turnstile').hidden,true);
 // Half-configured Turnstile: the widget stays off, the form works, and the owner is told what is missing.
 assert.equal(d.getElementById('turnstile-warning').hidden,false);
 assert.match(d.getElementById('turnstile-warning').textContent,/^⚠ Dành cho quản trị viên: Cloudflare Turnstile chưa được cấu hình [(]TURNSTILE_SITE_KEY[)][.]/);
 const cards=form.querySelectorAll('.channel-card');
 assert.equal(cards.length,4);
 assert.deepEqual([...cards].map(c=>c.querySelector('.channel-name').textContent),['Zalo','WhatsApp','Messenger','Gọi điện']);
 assert.equal(cards[0].getAttribute('for'),'channel-zalo');
 assert(cards[0].querySelector('input').checked);
 assert(cards[0].classList.contains('is-selected'));
 assert.equal(form.querySelector('[data-channel-field=zalo]').hidden,false);
 assert(form.elements.zalo_same.checked);
 assert.equal(form.querySelector('[data-channel-field=zalo] .channel-number').hidden,true);
 form.elements.zalo_same.checked=false;form.elements.zalo_same.dispatchEvent(new window.Event('change',{bubbles:true}));
 assert.equal(form.querySelector('[data-channel-field=zalo] .channel-number').hidden,false);
 assert.equal(form.elements.customer_zalo_phone.disabled,false);
 const policyLink=d.querySelector('#consent-text a');
 assert.equal(policyLink.getAttribute('href'),'/privacy?lang=vi');
 assert.equal(policyLink.textContent,'Chính sách bảo mật');
 assert.match(d.getElementById('consent-text').textContent,/^Tôi đồng ý với Chính sách bảo mật và việc xử lý thông tin cá nhân/);
 form.dispatchEvent(new window.Event('submit',{cancelable:true}));
 await tick();
 assert.equal(d.getElementById('booking-error').textContent,'Vui lòng nhập họ tên và số điện thoại.');
 form.elements.customer_name.value='Nguyễn Mai';form.elements.customer_phone.value='0901234567';form.elements.note.value='Chụp ảnh';
 form.dispatchEvent(new window.Event('submit',{cancelable:true}));
 await tick();
 assert.equal(d.getElementById('booking-error').textContent,'Vui lòng nhập số Zalo hoặc chọn "Giống số điện thoại".');
 assert.equal(calls.filter(c=>c[0]==='/api/reservation-requests').length,0);
 form.querySelector('input[name=preferred_contact_channel][value=messenger]').checked=true;
 form.querySelector('input[name=preferred_contact_channel][value=messenger]').dispatchEvent(new window.Event('change',{bubbles:true}));
 assert.equal(form.querySelector('[data-channel-field=zalo]').hidden,true);
 assert.equal(form.querySelector('[data-channel-field=messenger]').hidden,false);
 assert.equal(form.elements.customer_messenger_url,undefined);
 assert.match(form.querySelector('[data-channel-field=messenger]').textContent,/Không cần nhập ID Messenger/);
 form.dispatchEvent(new window.Event('submit',{cancelable:true}));
 await tick();
 // Privacy consent is mandatory: refused locally with a clear message.
 assert.equal(d.getElementById('booking-error').textContent,'Vui lòng đồng ý với Chính sách bảo mật để gửi yêu cầu.');
 assert(d.getElementById('consent-row').classList.contains('is-invalid'));
 assert.equal(calls.filter(c=>c[0]==='/api/reservation-requests').length,0);
 form.elements.privacy_consent.checked=true;form.elements.privacy_consent.dispatchEvent(new window.Event('change',{bubbles:true}));
 assert(!d.getElementById('consent-row').classList.contains('is-invalid'));
 requestStatus=409;
 form.dispatchEvent(new window.Event('submit',{cancelable:true}));
 await tick();await tick();
 assert.match(d.getElementById('booking-error').textContent,/vừa hết/);
 assert.equal(d.getElementById('booking-status').textContent,'Không có sẵn trong thời gian này');
 requestStatus=201;
 form.dispatchEvent(new window.Event('submit',{cancelable:true}));
 await tick();await tick();
 const sent=JSON.parse(calls.at(-1)[1].body);
 assert.equal(calls.at(-1)[1].headers['x-requested-with'],'fetch');
 assert.match(sent.privacy_consent_at,/^\d{4}-\d{2}-\d{2}T.*Z$/);
 delete sent.privacy_consent_at;
 assert.deepEqual(sent,{customer_name:'Nguyễn Mai',customer_phone:'0901234567',preferred_contact_channel:'messenger',customer_zalo_phone:'',customer_whatsapp:'',customer_messenger_url:'',note:'Chụp ảnh',privacy_consent:true,product_id:'item-0001',size:'L',start_date:'2026-10-02',end_date:'2026-10-04'});
 assert.equal(sent.status,undefined);
 const done=d.getElementById('booking-done');
 assert(!done.hidden);assert(form.hidden);
 assert.match(done.textContent,/Cảm ơn bạn 🌸.*Yêu cầu đặt chỗ đã được gửi\..*Mã yêu cầursv-20261002-ab12.*Hãy sao chép mã yêu cầu/);
 assert.equal(done.querySelector('.chat').getAttribute('href'),'https://m.me/teststore');
 // Everything else here is a statement; this line is the only one still asking the customer to do
 // something, so it is a callout of its own rather than another note in the same voice.
 const next=done.querySelector('.booking-next');
 assert.ok(next,'the Messenger instruction stands apart');
 assert.match(next.textContent,/Hãy sao chép mã yêu cầu bên dưới/);
 assert.ok(next.querySelector('.booking-next-mark'),'and carries a mark, not colour alone');
 assert.notEqual(next,done.querySelector('.booking-terms'));
 let copiedId='';window.navigator.clipboard.writeText=async value=>{copiedId=value;};
 d.getElementById('booking-copy-id').click();await tick();
 assert.equal(copiedId,'rsv-20261002-ab12');
 assert.match(d.getElementById('booking-copy-status').textContent,/Đã sao chép/);
 window.navigator.clipboard.writeText=async()=>{throw new Error('denied');};
 d.getElementById('booking-copy-id').click();await tick();
 assert.match(d.getElementById('booking-copy-status').textContent,/Không thể sao chép/);
 assert.equal(window.getSelection().toString(),'rsv-20261002-ab12');
 setLang(d,window,'en');
 assert.match(done.textContent,/Thank you 🌸.*Request IDrsv-20261002-ab12/);
 assert.match(d.querySelector('.booking-next').textContent,/Copy your request ID below/,'and in every language');
 assert.equal(d.getElementById('booking-copy-id').textContent,'Copy request ID');
 assert.equal(d.getElementById('hero-book').textContent.replace(/\s+/g,' ').trim(),'Book now↗');
 d.getElementById('booking-done-close').click();
 assert(!bookingDialog.hasAttribute('open'));
 d.getElementById('close-dialog').click();
 assert(block.hidden);
});

test('the illustration notice appears only while a placeholder item is in the catalog',async t=>{
 const real=await setup(t);
 assert.equal(real.document.getElementById('placeholder-notice').hidden,true);
 const {window,document:d}=await setup(t,{data:[{...fixture[0],placeholder:true}]});
 assert.equal(d.getElementById('placeholder-notice').hidden,false);
 assert(d.querySelector('.sample-label'));
 setLang(d,window,'ja');
 assert.equal(d.querySelector('[data-i18n="placeholderNotice"]').textContent,'以下の一部は仮画像で、実際の商品を示すものではありません。');
});



// Turnstile switched on. Every other test runs with it off, which is how a widget that never
// rendered went unnoticed. Element ids land on window, so a container named "turnstile" both hides
// the API behind a <div> and makes api.js report "already loaded" instead of installing itself.
// The stub below refuses to install for exactly that reason, the way the real script does.
test('with Turnstile configured the script loads, the widget renders and its token rides along',async t=>{
 const {window,document:d}=await setup(t,{data:[{...stocked[0],sizes:['L']}],availability:live});
 assert.ok(!('turnstile' in window),'no element id may shadow window.turnstile');
 const renders=[],posts=[];let scripts=0;
 // jsdom does not fetch scripts: stand in for the browser running Turnstile's api.js.
 const head=d.head,append=head.append.bind(head);
 head.append=(...nodes)=>{
  append(...nodes);
  for(const node of nodes)if(node.tagName==='SCRIPT'&&String(node.src).includes('challenges.cloudflare.com')){
   scripts++;
   // api.js leaves window.turnstile alone and warns when the name is already taken.
   if(!('turnstile' in window))window.turnstile={render(el,options){renders.push({id:el.id,...options});return 'widget-'+renders.length;},getResponse:id=>'token-'+id,reset(){},remove(){}};
   node.onload();
  }
 };
 window.fetch=async(url,init={})=>{
  const u=String(url);
  if(u.startsWith('/api/products/item-0001/availability'))return {ok:true,json:async()=>({productId:'item-0001',available:true})};
  if(u.includes('/calendar')){const month=new URL(u,'https://store.example').searchParams.get('month');return {ok:true,json:async()=>({month,days:Array.from({length:28},(_,n)=>({date:month+'-'+String(n+1).padStart(2,'0'),available:true}))})};}
  if(u==='/api/reservation-requests/config')return {ok:true,json:async()=>({turnstileSiteKey:'0xSITEKEY',turnstile:{enabled:true,siteKeySet:true,secretSet:true}})};
  if(u==='/api/reservation-requests'){
   const body=JSON.parse(init.body);posts.push(body);
   if(!body.turnstile_token)return {ok:false,status:400,json:async()=>({error:'turnstile_required',message:'no token'})};
   return {ok:true,status:201,json:async()=>({request:{id:'rsv-20261002-ab12',status:'pending',customer_name:body.customer_name,start_date:body.start_date,end_date:body.end_date,product_id:body.product_id}})};
  }
  throw new Error('unexpected '+u);
 };
 d.querySelector('[data-id="item-0001"]').click();
 const from=d.getElementById('booking-from'),to=d.getElementById('booking-to');
 from.value='2026-10-02';from.dispatchEvent(new window.Event('change'));
 to.value='2026-10-04';to.dispatchEvent(new window.Event('change'));
 await until(()=>!d.getElementById('booking-open').disabled,'availability');
 d.getElementById('booking-open').click();
 await until(()=>renders.length,'turnstile widget');
 assert.equal(scripts,1,'the api script is fetched exactly once');
 assert.equal(renders.length,1,'the widget is rendered exactly once');
 assert.equal(renders[0].id,'booking-turnstile');
 assert.equal(renders[0].sitekey,'0xSITEKEY');
 assert.equal(d.getElementById('booking-turnstile').hidden,false);
 assert.equal(d.getElementById('turnstile-warning').hidden,true,'a working widget needs no owner warning');
 const form=d.getElementById('booking-form');
 form.elements.customer_name.value='Test';
 form.elements.customer_phone.value='0900000000';
 form.elements.privacy_consent.checked=true;
 form.dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));
 await until(()=>posts.length,'request posted');
 assert.equal(posts[0].turnstile_token,'token-widget-1','the token the Worker verifies must be sent');
 await until(()=>!d.getElementById('booking-done').hidden,'confirmation');
 // A booking that is not going through Messenger has nothing left to do, so no call to action.
 assert.equal(d.querySelector('.booking-next'),null);
 assert.equal(d.getElementById('booking-error').textContent,'');
});

// The pick-up window is the return window too, so it belongs next to the calendar rather than in the
// request form, and the request cannot be opened until the customer has named one.

// The rental timeline: a day off the calendar, a length, then an hour off that day's own axis. What
// the axis says comes from the Worker, which knows the bookings, the care window after a return and
// the hours somebody is actually at the shop.
const timelineDay = '2026-10-20';
test('handoff notice is visible before date selection and follows the customer language', async t => {
 const configured={...storeFixture,store:{...storeFixture.store,text:{handoffNotice:{vi:'Liên hệ trước',ja:'平日18:30〜24:00。時間外は事前にご連絡ください。'}}}};
 const {window,document:d}=await setup(t,{data:[stocked[0]],availability:live,store:configured});
 d.querySelector('[data-id="item-0001"]').click();
 assert.equal(d.getElementById('booking-handoff-notice').hidden,false);
 assert.match(d.getElementById('booking-handoff-notice').textContent,/Liên hệ trước/);
 setLang(d,window,'ja');
 assert.match(d.getElementById('booking-handoff-notice').textContent,/事前にご連絡/);
});
test('the store\'s rental terms sit above the consent box, one per line, in the customer language', async t => {
 const configured={...storeFixture,booking:{...storeFixture.booking,policy:{vi:'Đặt cọc hoặc giấy tờ.\nTrả trễ trừ vào cọc.\n',ja:'保証金または身分証明書をお預かりします。\n破損時は賠償いただきます。'}}};
 const {window,document:d}=await setup(t,{data:[stocked[0]],availability:live,store:configured});
 const box=d.getElementById('booking-policy');
 assert.equal(box.hidden,false);
 assert.equal(box.querySelector('.booking-policy-title').textContent,'Điều khoản thuê');
 assert.deepEqual([...box.querySelectorAll('li')].map(li=>li.textContent),['Đặt cọc hoặc giấy tờ.','Trả trễ trừ vào cọc.']);
 assert.equal(box.nextElementSibling.id,'consent-row');
 setLang(d,window,'ja');
 assert.equal(box.querySelector('.booking-policy-title').textContent,'レンタル規約');
 assert.equal(box.querySelectorAll('li').length,2);
 assert.match(box.textContent,/賠償/);
});
test('a store without rental terms shows no terms box', async t => {
 const {document:d}=await setup(t,{data:[stocked[0]],availability:live});
 assert.equal(d.getElementById('booking-policy').hidden,true);
});
// 2026-10-20 is a Tuesday; every weekday is listed so the axis never depends on the calendar.
const timelineStore = {...storeFixture, booking: {...storeFixture.booking, slotMinutes: 30,
 handoff: {weekly: Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map(n => [n, [{start: '18:30', end: '21:00'}]]))}}};
function timelineHarness(window, d, {slots, onPost = () => {}} = {}) {
 const asked = [];
 window.fetch = async (url, init = {}) => {
  const u = String(url);
  if (u.startsWith('/api/products/item-0001/availability')) return {ok: true, json: async () => ({productId: 'item-0001', available: true})};
  if (u.includes('/timeline')) {
   const query = new URL(u, 'https://store.example').searchParams;
   asked.push({date: query.get('date'), days: query.get('days')});
   const days = Number(query.get('days'));
   return {ok: true, json: async () => ({date: query.get('date'), days, slotMinutes: 30, total: 2, closed: false,
    slots: slots(days), maxRentalDays: 60, quote: {daily: 119000, days, total: 119000 * days, currency: 'VND'}})};
  }
  if (u.includes('/calendar')) { const month = new URL(u, 'https://store.example').searchParams.get('month'); return {ok: true, json: async () => ({month, days: Array.from({length: 28}, (_, n) => ({date: month + '-' + String(n + 1).padStart(2, '0'), available: true}))})}; }
  if (u === '/api/reservation-requests/config') return {ok: true, json: async () => ({turnstileSiteKey: '', turnstile: {enabled: false, siteKeySet: false, secretSet: true}})};
  if (u === '/api/reservation-requests') { const body = JSON.parse(init.body); onPost(body); return {ok: true, status: 201, json: async () => ({request: {id: 'rsv-1', status: 'pending', customer_name: body.customer_name, start_date: body.start_date, end_date: body.end_date, start_time: body.start_time, rental_days: body.rental_days, product_id: body.product_id}})}; }
  throw new Error('unexpected ' + u);
 };
 return asked;
}
const evening = days => [
 {time: '07:00', state: 'past', remaining: 0},
 {time: '18:30', state: days > 1 ? 'none' : 'available', remaining: days > 1 ? 0 : 2},
 {time: '19:00', state: 'available', remaining: 2},
 {time: '19:30', state: 'low', remaining: 1},
 {time: '20:00', state: 'handoff', remaining: 0}
];

test('24-hour picker switches periods without scrolling and keeps unavailable reasons and selection', async t => {
 const {window,document:d}=await setup(t,{data:[{...stocked[0],sizes:['L']}],availability:live,store:timelineStore});
 const slots=()=>Array.from({length:48},(_,n)=>({time:String(Math.floor(n/2)).padStart(2,'0')+':'+(n%2?'30':'00'),state:n===2?'maintenance':'available',remaining:n===2?0:2}));
 timelineHarness(window,d,{slots});
 d.querySelector('[data-id="item-0001"]').click();
 const from=d.getElementById('booking-from');from.value=timelineDay;from.dispatchEvent(new window.Event('change'));
 await until(()=>d.querySelector('#timeline-choices [data-time="00:00"]'),'midnight choices');
 assert.equal(d.querySelectorAll('[data-band]').length,4);
 assert.equal(d.querySelectorAll('#timeline-choices [data-time]').length,12);
 assert.equal(d.querySelector('.timeline-more').open,false,'full axis starts collapsed');
 assert.ok(d.getElementById('booking-duration').compareDocumentPosition(d.getElementById('booking-timeline'))&window.Node.DOCUMENT_POSITION_FOLLOWING);
 d.querySelector('#timeline-choices [data-time="01:00"]').click();
 assert.equal(d.getElementById('booking-open').disabled,true);
 assert.match(d.getElementById('timeline-detail').textContent,/01:00/);
 d.querySelector('[data-band="3"]').click();
 d.querySelector('#timeline-choices [data-time="23:30"]').click();
 assert.match(d.getElementById('booking-plan').textContent,/23:30/);
 assert.equal(d.querySelector('#timeline-track [data-time="23:30"]').getAttribute('aria-pressed'),'true');
 d.querySelector('[data-band="0"]').click();
 assert.match(d.getElementById('booking-plan').textContent,/23:30/,'view changes preserve selection');
 d.querySelector('#timeline-choices [data-time="00:00"]').click();
 assert.equal(d.querySelector('#timeline-choices [data-time="00:00"]').getAttribute('aria-pressed'),'true');
 assert.equal(d.getElementById('booking-open').disabled,false);
});

test('a failed timeline refresh clears selection and permits a safe retry', async t => {
 const {window, document: d} = await setup(t, {data: [{...stocked[0], sizes: ['L']}], availability: live, store: timelineStore});
 timelineHarness(window, d, {slots: evening});
 d.querySelector('[data-id="item-0001"]').click();
 const from=d.getElementById('booking-from');from.value=timelineDay;from.dispatchEvent(new window.Event('change'));
 await until(()=>d.querySelector('#timeline-track [data-time="19:00"]'),'initial timeline');
 d.querySelector('#timeline-track [data-time="19:00"]').click();
 assert.equal(d.getElementById('booking-open').disabled,false);
 const fetch=window.fetch;
 window.fetch=async(url,init)=>{if(String(url).includes('/timeline'))throw new Error('offline');return fetch(url,init);};
 d.getElementById('days-plus').click();
 assert.equal(d.getElementById('booking-open').disabled,true,'disabled immediately while revalidating');
 await until(()=>d.querySelector('#timeline-detail button'),'retry');
 assert.equal(d.getElementById('booking-plan').hidden,true);
 assert.equal(d.querySelectorAll('#timeline-track [data-time]').length,0);
 window.fetch=fetch;d.querySelector('#timeline-detail button').click();
 await until(()=>d.querySelector('#timeline-track [data-time="19:00"]'),'retried timeline');
 assert.equal(d.getElementById('booking-open').disabled,true,'retry must not silently select a time');
});

test('the timeline shows why each hour can or cannot be taken, and only free ones can be picked', async t => {
 const {window, document: d} = await setup(t, {data: [{...stocked[0], sizes: ['L'], price: {rental: 119000}, currency: 'VND'}], availability: live, store: timelineStore});
 timelineHarness(window, d, {slots: evening});
 d.querySelector('[data-id="item-0001"]').click();
 const from = d.getElementById('booking-from');
 from.value = timelineDay; from.dispatchEvent(new window.Event('change'));
 await until(() => d.querySelectorAll('#timeline-track [data-time]').length, 'timeline');
 const slot = time => d.querySelector('#timeline-track [data-time="' + time + '"]');
 assert.equal(d.getElementById('booking-timeline').hidden, false);
 // Every state is readable without colour: a mark on the chip and a name in the legend.
 assert.equal(slot('19:00').querySelector('.slot-mark').textContent, '○');
 assert.equal(slot('19:30').querySelector('.slot-mark').textContent, '△');
 assert.equal(slot('19:30').querySelector('.slot-count').textContent, '1');
 assert.equal(slot('20:00').querySelector('.slot-mark').textContent, '□');
 assert.match(slot('20:00').getAttribute('aria-label'), /Ngoài giờ giao nhận/);
 assert.equal(slot('20:00').getAttribute('aria-disabled'), 'true', 'nobody is there to hand it over');
 assert.equal(slot('07:00').getAttribute('aria-disabled'), 'true', 'that hour has gone');
 assert.ok(!slot('19:00').disabled);
 const legend = [...d.querySelectorAll('#timeline-legend li')].map(item => item.textContent);
 assert.ok(legend.some(text => text.includes('Còn trống')));
 assert.ok(legend.some(text => text.includes('Ngoài giờ giao nhận')));
 // A day alone is not a booking: the request cannot be opened until an hour is chosen.
 assert.ok(d.getElementById('booking-open').disabled);
 slot('20:00').click();
 assert.ok(d.getElementById('booking-open').disabled, 'reason inspection must not select an unavailable time');
 assert.match(d.getElementById('timeline-detail').textContent, /20:00/);
 slot('19:00').click();
 assert.equal(slot('19:00').getAttribute('aria-pressed'), 'true');
 assert.ok(!d.getElementById('booking-open').disabled);
 slot('20:00').click();
 assert.equal(slot('19:00').getAttribute('aria-pressed'), 'true', 'inspecting a reason preserves the selection');
 assert.match(d.getElementById('timeline-detail').textContent, /Ngoài giờ giao nhận/);
});

test('the length drives the return deadline and the price, and the request carries both', async t => {
 const {window, document: d} = await setup(t, {data: [{...stocked[0], sizes: ['L'], price: {rental: 119000}, currency: 'VND'}], availability: live, store: timelineStore});
 const posts = [];
 const asked = timelineHarness(window, d, {slots: evening, onPost: body => posts.push(body)});
 d.querySelector('[data-id="item-0001"]').click();
 const from = d.getElementById('booking-from');
 from.value = timelineDay; from.dispatchEvent(new window.Event('change'));
 await until(() => d.querySelectorAll('#timeline-track [data-time]').length, 'timeline');
 d.querySelector('#timeline-track [data-time="19:00"]').click();
 // One day: back at the same hour the next day.
 const plan = () => d.getElementById('booking-plan').textContent;
 assert.match(plan(), /20\/10\/2026 19:00/);
 assert.match(plan(), /21\/10\/2026 19:00/);
 assert.match(plan(), /1 ngày \/ 24 giờ/);
 assert.match(plan(), /119.000/);
 // Two days: 48 hours, and the deadline moves with it.
 d.getElementById('days-plus').click();
 await until(() => asked.some(call => call.days === '2'), 'timeline reloaded for two days');
 await until(() => plan().includes('238.000'), 'the price follows the length');
 assert.match(plan(), /22\/10\/2026 19:00/);
 assert.match(plan(), /2 ngày \/ 48 giờ/);
 assert.equal(d.getElementById('booking-days').value, '2');
 assert.equal(d.getElementById('booking-to').value, '2026-10-22');
 // Choosing again is one tap, without scrolling back up a long form.
 d.querySelector('[data-reset-plan]').click();
 assert.equal(d.getElementById('booking-plan').hidden, true);
 assert.ok(d.getElementById('booking-open').disabled);
 d.querySelector('#timeline-track [data-time="19:30"]').click();
 d.getElementById('booking-open').click();
 assert.match(d.getElementById('booking-summary').textContent, /19:30/);
 const form = d.getElementById('booking-form');
 form.elements.customer_name.value = 'Test';
 form.elements.customer_phone.value = '0900000000';
 form.elements.privacy_consent.checked = true;
 form.dispatchEvent(new window.Event('submit', {bubbles: true, cancelable: true}));
 await until(() => posts.length, 'request posted');
 assert.equal(posts[0].start_date, '2026-10-20');
 assert.equal(posts[0].start_time, '19:30');
 assert.equal(posts[0].rental_days, 2, 'the length goes to the server, not a second date');
});

test('a day nobody can hand over on says so instead of showing an empty axis', async t => {
 const {window, document: d} = await setup(t, {data: [{...stocked[0], sizes: ['L'], price: {rental: 119000}, currency: 'VND'}], availability: live, store: timelineStore});
 window.fetch = async url => {
  const u = String(url);
  if (u.startsWith('/api/products/item-0001/availability')) return {ok: true, json: async () => ({productId: 'item-0001', available: true})};
  if (u.includes('/timeline')) return {ok: true, json: async () => ({date: timelineDay, days: 1, slotMinutes: 30, total: 1, closed: true, slots: [], maxRentalDays: 60, quote: null})};
  if (u.includes('/calendar')) { const month = new URL(u, 'https://store.example').searchParams.get('month'); return {ok: true, json: async () => ({month, days: Array.from({length: 28}, (_, n) => ({date: month + '-' + String(n + 1).padStart(2, '0'), available: true}))})}; }
  if (u === '/api/reservation-requests/config') return {ok: true, json: async () => ({turnstileSiteKey: '', turnstile: {enabled: false, siteKeySet: false, secretSet: true}})};
  throw new Error('unexpected ' + u);
 };
 d.querySelector('[data-id="item-0001"]').click();
 const from = d.getElementById('booking-from');
 from.value = timelineDay; from.dispatchEvent(new window.Event('change'));
 await until(() => !d.getElementById('timeline-empty').hidden, 'the closed-day notice');
 assert.equal(d.getElementById('timeline-empty').textContent, 'Ngày này cửa hàng không giao nhận được.');
 assert.equal(d.querySelectorAll('#timeline-track [data-time]').length, 0);
 assert.ok(d.getElementById('booking-open').disabled);
});

// A store that has not said when anybody is at the shop has no hour axis to pick from, so its
// calendar still names both ends of the rental. This is the flow every store had before the axis
// existed, and the one they keep until handover hours are configured.
test('without handover hours the calendar still picks a range, two taps, and prices it', async t => {
 const {window, document: d} = await setup(t, {data: [{...stocked[0], sizes: ['L'], price: {rental: 119000}, currency: 'VND'}], availability: live});
 const calls = [];
 window.fetch = async url => {
  const u = String(url);
  calls.push(u);
  if (u.startsWith('/api/products/item-0001/availability')) return {ok: true, json: async () => ({productId: 'item-0001', available: true})};
  if (u.includes('/calendar')) { const month = new URL(u, 'https://store.example').searchParams.get('month'); return {ok: true, json: async () => ({month, days: Array.from({length: 28}, (_, n) => ({date: month + '-' + String(n + 1).padStart(2, '0'), available: true}))})}; }
  if (u === '/api/reservation-requests/config') return {ok: true, json: async () => ({turnstileSiteKey: '', turnstile: {enabled: false, siteKeySet: false, secretSet: true}})};
  throw new Error('unexpected ' + u);
 };
 d.querySelector('[data-id="item-0001"]').click();
 await until(() => d.querySelector('[data-day]'), 'calendar');
 const month = d.querySelector('[data-day]').dataset.day.slice(0, 7);
 const day = n => d.querySelector(`[data-day="${month}-${String(n).padStart(2, '0')}"]`);
 // No hour axis and no length stepper: this store names both dates itself.
 assert.equal(d.getElementById('booking-timeline').hidden, true);
 assert.equal(d.getElementById('booking-duration').hidden, true);
 day(10).click();
 await until(() => d.getElementById('booking-from').value === `${month}-10`, 'the first tap');
 assert.equal(d.getElementById('booking-to').value, '', 'the second end is still open');
 day(12).click();
 await until(() => d.getElementById('booking-to').value === `${month}-12`, 'the second tap closes the range');
 // Three calendar days apart is two 24-hour days, the same as the Worker charges.
 await until(() => d.getElementById('booking-price').textContent.includes('238.000'), 'the range is priced');
 assert.match(d.getElementById('booking-price').textContent, /119.000.*2.*238.000/);
 await until(() => calls.some(url => url.includes('from=' + month + '-10&to=' + month + '-12')), 'availability asked for the range');
 // The whole span is shaded, and a third tap starts a new range.
 await until(() => d.querySelectorAll('.calendar-grid .in-range').length === 3, 'the span is shaded');
 day(14).click();
 await until(() => d.getElementById('booking-from').value === `${month}-14`, 'a third tap starts again');
 assert.equal(d.getElementById('booking-to').value, '');
 // Tapping the same day twice is the one-day rental the instruction promises.
 day(14).click();
 await until(() => d.getElementById('booking-to').value === `${month}-14`, 'same day twice');
 await until(() => d.getElementById('booking-price').textContent.includes('119.000'), 'one day');
 assert.match(d.getElementById('booking-price').textContent, /× 1 /);
});

// Choosing the span on the calendar is how this has always felt, and the hour axis did not take it
// away: the second tap says how far the rental runs, which is the same thing the stepper says.
test('with an hour axis the calendar still takes a span, and the stepper agrees with it', async t => {
 const {window, document: d} = await setup(t, {data: [{...stocked[0], sizes: ['L'], price: {rental: 119000}, currency: 'VND'}], availability: live, store: timelineStore});
 const asked = timelineHarness(window, d, {slots: evening});
 d.querySelector('[data-id="item-0001"]').click();
 await until(() => d.querySelector('[data-day]'), 'calendar');
 const oldMonth=d.querySelector('[data-day]').dataset.day.slice(0,7);
 d.querySelector('[data-month="1"]').click();
 await until(()=>d.querySelector('[data-day]')&&d.querySelector('[data-day]').dataset.day.slice(0,7)!==oldMonth,'next month');
 const month = d.querySelector('[data-day]').dataset.day.slice(0, 7);
 const day = n => d.querySelector(`[data-day="${month}-${String(n).padStart(2, '0')}"]`);
 day(10).click();
 await until(() => d.getElementById('booking-days').value === '1', 'one day to begin with');
 assert.equal(d.getElementById('booking-from').value, `${month}-10`);
 assert.equal(d.getElementById('booking-to').value, `${month}-11`, 'the return is worked out, not asked for');
 // A second tap further along is the span, and the length says so.
 day(13).click();
 await until(() => d.getElementById('booking-days').value === '3', 'the span sets the length');
 assert.equal(d.getElementById('booking-to').value, `${month}-13`);
 await until(() => asked.some(call => call.days === '3'), 'the axis is asked again for three days');
 await until(() => d.querySelectorAll('.calendar-grid .in-range').length === 4, 'the span is shaded');
 assert.equal(day(13).getAttribute('aria-pressed'), 'true', 'both ends read as chosen');
 // The stepper and the calendar are two ways of saying the same thing.
 d.getElementById('days-plus').click();
 await until(() => d.getElementById('booking-days').value === '4', 'the stepper carries on from there');
 assert.equal(d.getElementById('booking-to').value, `${month}-14`);
 // Once a span is set, the next tap starts a new one rather than stretching the old.
 day(20).click();
 await until(() => d.getElementById('booking-from').value === `${month}-20`, 'a fresh start');
 assert.equal(d.getElementById('booking-days').value, '1');
 // Tapping backwards also starts again, instead of making a negative span.
 day(18).click();
 await until(() => d.getElementById('booking-from').value === `${month}-18`, 'backwards starts again');
 assert.equal(d.getElementById('booking-days').value, '1');
});

// Trying something on is a different errand from renting: come at an agreed time, put it on, hand it
// straight back. The page asks for a time and nothing else, and names no price.
const fittingStore = {...timelineStore, booking: {...timelineStore.booking, fitting: {enabled: true, minutes: 30, bufferMinutes: 0}}};
test('a fitting asks only when to come, shows no price and says so in the request', async t => {
 const {window, document: d} = await setup(t, {data: [{...stocked[0], sizes: ['L'], price: {rental: 119000}, currency: 'VND'}], availability: live, store: fittingStore});
 const posts = [];
 const asked = [];
 window.fetch = async (url, init = {}) => {
  const u = String(url);
  if (u.startsWith('/api/products/item-0001/availability')) return {ok: true, json: async () => ({productId: 'item-0001', available: true})};
  if (u.includes('/timeline')) {
   const query = new URL(u, 'https://store.example').searchParams;
   const purpose = query.get('purpose');
   asked.push(purpose);
   return {ok: true, json: async () => ({date: query.get('date'), days: 1, purpose, slotMinutes: 30, total: 1, closed: false,
    fittingMinutes: purpose === 'fitting' ? 30 : 0, slots: evening(1), maxRentalDays: 60,
    quote: purpose === 'fitting' ? null : {daily: 119000, days: 1, total: 119000, currency: 'VND'}})};
  }
  if (u.includes('/calendar')) { const month = new URL(u, 'https://store.example').searchParams.get('month'); return {ok: true, json: async () => ({month, days: Array.from({length: 28}, (_, n) => ({date: month + '-' + String(n + 1).padStart(2, '0'), available: true}))})}; }
  if (u === '/api/reservation-requests/config') return {ok: true, json: async () => ({turnstileSiteKey: '', turnstile: {enabled: false, siteKeySet: false, secretSet: true}})};
  if (u === '/api/reservation-requests') { const body = JSON.parse(init.body); posts.push(body); return {ok: true, status: 201, json: async () => ({request: {id: 'rsv-1', status: 'pending', customer_name: body.customer_name, start_date: body.start_date, end_date: body.end_date, start_time: body.start_time, purpose: body.purpose, product_id: body.product_id}})}; }
  throw new Error('unexpected ' + u);
 };
 d.querySelector('[data-id="item-0001"]').click();
 await until(() => d.querySelectorAll('#purpose-cards input[name=booking_purpose]').length === 2, 'the choice');
 const pick = value => d.querySelector(`#purpose-cards input[value="${value}"]`);
 // The errand is asked before the dates, because it decides what the dates mean.
 const block = d.getElementById('dialog-booking');
 assert.ok(block.querySelector('#booking-purpose').compareDocumentPosition(block.querySelector('.booking-fields')) & 4, 'the choice comes first');
 assert.ok(pick('rental').checked, 'renting is the default errand');
 assert.deepEqual([...d.querySelectorAll('#purpose-cards .channel-name')].map(el => el.textContent), ['Thuê', 'Thử đồ']);
 assert.deepEqual([...d.querySelectorAll('#purpose-cards .channel-hint')].map(el => el.textContent), ['Tính theo mỗi 24 giờ', 'Chỉ thử tại cửa hàng']);
 const from = d.getElementById('booking-from');
 from.value = timelineDay; from.dispatchEvent(new window.Event('change'));
 await until(() => d.querySelectorAll('#timeline-track [data-time]').length, 'timeline');
 assert.equal(d.getElementById('booking-duration').hidden, false, 'a rental has a length to choose');

 assert.equal(d.getElementById('booking-to-field').hidden, false, 'a rental names both ends');
 pick('fitting').checked = true;
 pick('fitting').dispatchEvent(new window.Event('change', {bubbles: true}));
 await until(() => asked.includes('fitting'), 'the axis is asked for a fitting');
 // Nothing belonging to the other errand is left on screen.
 assert.equal(d.getElementById('booking-to-field').hidden, true, 'a visit has no return date');
 assert.equal(d.querySelector('.booking-fields [data-booking-i18n="from"]').textContent, 'Ngày đến');
 // Nothing to choose a length for, and nothing to pay.
 assert.equal(d.getElementById('booking-duration').hidden, true);
 assert.match(d.getElementById('booking-purpose').textContent, /30 phút/);
 await until(() => d.getElementById('booking-price').textContent === '', 'no rental total for a fitting');
 await until(() => d.querySelector('#timeline-track [data-time="19:00"]'), 'the axis redrawn for a fitting');
 d.querySelector('#timeline-track [data-time="19:00"]').click();
 const plan = d.getElementById('booking-plan').textContent;
 assert.match(plan, /Đến lúc/);
 assert.match(plan, /30 phút/);
 assert.match(plan, /Miễn phí/);
 assert.doesNotMatch(plan, /119.000/);

 const form = d.getElementById('booking-form');
 d.getElementById('booking-open').click();
 form.elements.customer_name.value = 'Test';
 form.elements.customer_phone.value = '0900000000';
 form.elements.privacy_consent.checked = true;
 form.dispatchEvent(new window.Event('submit', {bubbles: true, cancelable: true}));
 await until(() => posts.length, 'request posted');
 assert.equal(posts[0].purpose, 'fitting');
 assert.equal(posts[0].start_time, '19:00');
 assert.equal(posts[0].rental_days, undefined, 'a fitting counts no days');
});

// A cheaper rate after the first day has to read as two parts, or a customer cannot see where the
// total came from.
test('the price spells out the first day and the cheaper ones when they differ', async t => {
 const product = {...stocked[0], sizes: ['L'], price: {rental: 119000, additionalDay: 30000}, currency: 'VND'};
 const {window, document: d} = await setup(t, {data: [product], availability: live, store: timelineStore});
 timelineHarness(window, d, {slots: evening});
 d.querySelector('[data-id="item-0001"]').click();
 const from = d.getElementById('booking-from');
 from.value = timelineDay; from.dispatchEvent(new window.Event('change'));
 await until(() => d.querySelectorAll('#timeline-track [data-time]').length, 'timeline');
 d.querySelector('#timeline-track [data-time="19:00"]').click();
 // One day: one rate, one multiplication, nothing to explain.
 await until(() => d.getElementById('booking-price').textContent.includes('119.000'), 'one day');
 assert.match(d.getElementById('booking-price').textContent, /119.000.*× 1 /);
 // Three days: the first day and the two cheaper ones, adding up to what the Worker will charge.
 d.getElementById('days-plus').click();
 d.getElementById('days-plus').click();
 await until(() => d.getElementById('booking-days').value === '3', 'three days');
 await until(() => d.getElementById('booking-price').textContent.includes('179.000'), 'the discounted total');
 const text = d.getElementById('booking-price').textContent;
 assert.match(text, /119.000.*\+.*30.000.*× 2 /, 'the first day, then the cheaper ones');
 assert.doesNotMatch(text, /357.000/, 'not the undiscounted total');
});
