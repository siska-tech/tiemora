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
 assert.equal(calls.at(-1)[0],'/api/products/item-0001/availability?from=2026-10-02&to=2026-10-04');
 assert.equal(d.getElementById('booking-status').textContent,'Có sẵn');
 assert(!d.getElementById('booking-open').disabled);
 size.value='M';size.dispatchEvent(new window.Event('change'));
 await tick();await tick();
 assert.equal(calls.at(-1)[0],'/api/products/item-0001/availability?from=2026-10-02&to=2026-10-04&size=M');
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
 assert.equal(d.getElementById('turnstile').hidden,true);
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
 form.elements.customer_messenger_url.value='m.me/mai';
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
 assert.deepEqual(sent,{customer_name:'Nguyễn Mai',customer_phone:'0901234567',preferred_contact_channel:'messenger',customer_zalo_phone:'',customer_whatsapp:'',customer_messenger_url:'m.me/mai',note:'Chụp ảnh',privacy_consent:true,product_id:'item-0001',size:'L',start_date:'2026-10-02',end_date:'2026-10-04'});
 assert.equal(sent.status,undefined);
 const done=d.getElementById('booking-done');
 assert(!done.hidden);assert(form.hidden);
 assert.match(done.textContent,/Cảm ơn bạn 🌸.*Yêu cầu đặt chỗ đã được gửi\..*Mã yêu cầursv-20261002-ab12.*Cửa hàng sẽ liên hệ để xác nhận\./);
 assert.equal(done.querySelector('.chat').getAttribute('href'),'https://m.me/teststore');
 setLang(d,window,'en');
 assert.match(done.textContent,/Thank you 🌸.*Request IDrsv-20261002-ab12/);
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
