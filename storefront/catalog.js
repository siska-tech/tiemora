// Product grid and detail view over /catalog.json, with live stock from /api/availability.
// Loaded before app.js; app.js supplies `store`, `language`, `copy`, `localizedText`, `chatUrl`.
let products=[];
let catalogState='loading';
// Live stock from the Worker (/api/availability), keyed by product id. Empty when the API is unreachable,
// in which case the catalog's own `available` flag is shown instead.
let availability={},availabilityRange=null;
const catalogCopy={
 vi:{items:'sản phẩm',featured:'Nổi bật',available:'Có sẵn',lowStock:'Sắp hết',rented:'Đang cho thuê',unavailable:'Không có sẵn',unknown:'Hỏi về tình trạng còn sẵn',rentalDate:'Ngày thuê',returnDate:'Ngày trả',clearDates:'Xóa ngày',dateNote:'Chỉ hiển thị sản phẩm còn trống trong khoảng ngày đã chọn.',loading:'Đang tải sản phẩm…',error:'Không thể tải sản phẩm.',retry:'Thử lại',empty:'Chưa có sản phẩm phù hợp.',standard:'Thứ tự mặc định',featuredFirst:'Ưu tiên nổi bật',sizes:'Kích cỡ',model:'Người mẫu',wearing:'Mặc cỡ',noDescription:'Liên hệ cửa hàng để biết thêm thông tin.',media:'Ảnh / video',category:'Danh mục',saleBadge:'Ưu đãi',checkDates:'Kiểm tra lịch trống',orderCta:'Đặt trước',perUnit:'/ bó'},
 en:{items:'items',featured:'Featured',available:'Available',lowStock:'Low stock',rented:'Currently rented',unavailable:'Unavailable',unknown:'Ask about availability',rentalDate:'Rental date',returnDate:'Return date',clearDates:'Clear dates',dateNote:'Showing only items free for the selected dates.',loading:'Loading the catalog…',error:'The catalog could not be loaded.',retry:'Try again',empty:'No matching items yet.',standard:'Default order',featuredFirst:'Featured first',sizes:'Sizes',model:'Model',wearing:'Wearing size',noDescription:'Contact the store for more information.',media:'Photos / videos',category:'Category',saleBadge:'Sale',checkDates:'Check availability',orderCta:'Pre-order',perUnit:'/ bouquet'},
 zh:{items:'件商品',featured:'推荐',available:'有库存',lowStock:'库存较少',rented:'出租中',unavailable:'暂不可用',unknown:'请咨询库存',rentalDate:'租赁日期',returnDate:'归还日期',clearDates:'清除日期',dateNote:'仅显示所选日期内可租的商品。',loading:'正在加载商品…',error:'无法加载商品。',retry:'重试',empty:'暂无符合条件的商品。',standard:'默认顺序',featuredFirst:'推荐优先',sizes:'尺码',model:'模特',wearing:'试穿尺码',noDescription:'更多信息请联系店铺。',media:'照片 / 视频',category:'分类',saleBadge:'优惠',checkDates:'查看可租日期',orderCta:'预订',perUnit:'/ 束'},
 ja:{items:'点',featured:'おすすめ',available:'在庫あり',lowStock:'残りわずか',rented:'貸出中',unavailable:'現在利用不可',unknown:'空き状況はお問い合わせください',rentalDate:'貸出日',returnDate:'返却日',clearDates:'日付をクリア',dateNote:'選択した期間に空いている商品だけを表示しています。',loading:'商品を読み込み中…',error:'商品を読み込めませんでした。',retry:'再読み込み',empty:'該当する商品はまだありません。',standard:'標準の順',featuredFirst:'おすすめを優先',sizes:'サイズ',model:'モデル',wearing:'着用サイズ',noDescription:'詳しくはお店にお問い合わせください。',media:'写真・動画',category:'カテゴリ',saleBadge:'セール中',checkDates:'空き状況を見る',orderCta:'予約注文',perUnit:'/ 束'}
};
function localized(value,lang=language){return localizedText(value,lang);}
function productName(p){return localized(p.name)||p.id;}
const LOCALES={vi:'vi-VN',ja:'ja-JP',en:'en-US',zh:'zh-CN'};
function formatPrice(amount,currency){
 const code=currency||store.currency||'VND';
 try{return new Intl.NumberFormat(LOCALES[language],{style:'currency',currency:code}).format(amount);}
 catch{return `${amount} ${code}`;}
}
// The base price: price.sale for sale products, price.rental for rentals (null = contact the store).
const basePrice=p=>typeof p.price?.sale==='number'?p.price.sale:typeof p.price?.rental==='number'?p.price.rental:null;
const isSale=p=>p?.type==='sale';
function productPrice(p){
 const base=basePrice(p);
 if(base===null)return copy[language].price;
 return formatPrice(base,p.currency);
}
function originalPrice(p){return typeof p.price?.original==='number'?formatPrice(p.price.original,p.currency):'';}
function discountPercent(p){const original=p.price?.original,base=basePrice(p);return typeof original==='number'&&base!==null&&original>base?Math.round((1-base/original)*100):0;}
function priceMarkup(p){
 const t=catalogCopy[language],off=discountPercent(p),before=originalPrice(p);
 return (onSale(p)?`<span class="price-badge">${t.saleBadge}${off?` −${off}%`:''}</span>`:'')
  +(before?`<s class="price-original">${escapeMarkup(before)}</s>`:'')
  +escapeMarkup(productPrice(p));
}
// Products with inventory.managed in their YAML answer from the database; the rest keep the hand-written flag.
function availabilityStatus(p){
 const live=p.inventory?.managed===true&&availability[p.id];
 if(live)return ['available','low','rented','unavailable'].includes(live.status)?live.status:'unknown';
 return p.available===true?'available':p.available===false?'unavailable':'unknown';
}
function formatDate(iso){try{return new Intl.DateTimeFormat({vi:'vi-VN',ja:'ja-JP',en:'en-GB',zh:'zh-CN'}[language],{year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(iso+'T00:00:00'));}catch{return iso;}}
function productAvailability(p){
 if(isSale(p))return typeof saleLabel==='function'?saleLabel(p):'';
 const t=catalogCopy[language],status=availabilityStatus(p);
 const label={available:t.available,low:t.lowStock,rented:t.rented,unavailable:t.unavailable}[status]||t.unknown;
 return availabilityRange&&p.inventory?.managed===true&&availability[p.id]?`${label} · ${formatDate(availabilityRange.from)} – ${formatDate(availabilityRange.to)}`:label;
}
function availabilityClass(p){if(isSale(p))return 'availability'+(typeof saleClass==='function'?saleClass(p):'');const status=availabilityStatus(p);return 'availability'+(status==='unavailable'?' unavailable':'')+(status==='low'||status==='rented'?' status-'+status:'');}
function readDateRange(){
 const from=document.getElementById('date-from')?.value||'',to=document.getElementById('date-to')?.value||'';
 return /^\d{4}-\d{2}-\d{2}$/.test(from)&&/^\d{4}-\d{2}-\d{2}$/.test(to)&&from<=to?{from,to}:null;
}
async function loadAvailability(){
 const range=readDateRange();availabilityRange=range;
 const url='/api/availability'+(range?`?from=${range.from}&to=${range.to}`:'');
 try{
  const response=await fetch(url,{cache:'no-cache'});
  if(!response.ok)throw new Error(`HTTP ${response.status}`);
  const data=await response.json();
  if(!data||typeof data.products!=='object')throw new Error('Invalid availability');
  // A slower earlier request must not overwrite the dates the customer has picked since.
  const current=readDateRange();
  if((current?.from||'')!==(range?.from||'')||(current?.to||'')!==(range?.to||''))return;
  availability=data.products;
 }catch(error){console.warn('Availability unavailable, using catalog flags:',error);availability={};}
 renderProducts();if(selected)updateProductDetail();
}
function onSale(p){return discountPercent(p)>0||Array.isArray(p.tags)&&p.tags.includes('sale');}
function productMessage(p){const t=catalogCopy[language];return [productName(p),productPrice(p),...(availabilityRange?[`${t.rentalDate}: ${availabilityRange.from}`,`${t.returnDate}: ${availabilityRange.to}`]:[]),location.origin+location.pathname+'#'+encodeURIComponent(p.id)].join('\n');}
// Category labels come from config/store.yaml (categories:); unknown ids are shown as they are.
const productCategories=p=>Array.isArray(p.categories)&&p.categories.length?p.categories:[p.category];
function categoryName(category){return localized(store.categories?.[category])||(category==='uncategorized'?{vi:'Khác',en:'Other',zh:'其他',ja:'その他'}[language]:category);}
function refreshCatalogText(){
 const t=catalogCopy[language];
 document.querySelectorAll('[data-catalog-i18n]').forEach(el=>{el.textContent=t[el.dataset.catalogI18n];});
 // The illustration disclaimer only matters while a placeholder item is still in the catalog.
 const hasPlaceholder=products.some(p=>p.placeholder===true);
 document.getElementById('placeholder-notice').hidden=!hasPlaceholder;
 const note=document.getElementById('date-search-note');if(note)note.textContent=availabilityRange?t.dateNote:'';
 // The rental date search only makes sense when something is booked by date.
 const dateSearch=document.querySelector('.date-search');if(dateSearch)dateSearch.hidden=catalogState==='ready'&&!products.some(p=>p.inventory?.managed===true);
 const controls=[{id:'all',label:copy[language].all},{id:'featured',label:t.featured},...Array.from(new Set(products.flatMap(productCategories))).map(c=>({id:`category:${c}`,label:categoryName(c)}))];
 if(!controls.some(c=>c.id===filter))filter='all';
 document.querySelector('.filters').innerHTML=controls.map(c=>`<button type="button" data-filter="${escapeMarkup(c.id)}" aria-pressed="${filter===c.id}">${escapeMarkup(c.label)}</button>`).join('');
}
function renderProducts(){
 refreshCatalogText();
 const t=copy[language],labels=catalogCopy[language];
 let shown=products.filter(p=>filter==='all'||filter==='featured'&&p.featured||productCategories(p).some(c=>filter===`category:${c}`));
 // With rental dates chosen, items known to be taken or out of service drop out of the grid.
 if(availabilityRange)shown=shown.filter(p=>isSale(p)||!['rented','unavailable'].includes(availabilityStatus(p)));
 if(document.getElementById('catalog-sort').value==='featured')shown=[...shown].sort((a,b)=>Number(b.featured)-Number(a.featured));
 const container=document.getElementById('products');
 container.setAttribute('aria-busy',String(catalogState==='loading'));
 if(catalogState!=='ready')container.innerHTML=`<p class="catalog-message" role="status">${escapeMarkup(labels[catalogState==='error'?'error':'loading'])}${catalogState==='error'?` <button type="button" id="retry-catalog">${labels.retry}</button>`:''}</p>`;
 else if(!shown.length)container.innerHTML=`<p class="catalog-message" role="status">${labels.empty}</p>`;
 else container.innerHTML=shown.map((p,i)=>`<button class="product reveal reveal-up" style="--reveal-index:${i%4}" data-id="${escapeMarkup(p.id)}" aria-label="${escapeMarkup(productName(p)+' · '+productAvailability(p))}"><div class="product-image">${mediaCover(p)}${p.featured?`<span class="product-badge">${labels.featured}</span>`:''}${onSale(p)?`<span class="sale-badge">${labels.saleBadge}</span>`:''}${p.placeholder?`<span class="sample-label">${t.sample}</span>`:''}</div><div class="product-meta"><span>${escapeMarkup(categoryName(p.category))}</span><span>${p.images.length+p.videos.length} ${labels.media}</span></div><h3>${escapeMarkup(productName(p))}</h3><p class="product-price${onSale(p)?' sale-price':''}">${priceMarkup(p)}</p><p class="${availabilityClass(p)}">${escapeMarkup(productAvailability(p))}</p>${isSale(p)?`<span class="product-cta">${labels.orderCta} ↗</span>`:p.inventory?.managed===true?`<span class="product-cta">${labels.checkDates} ↗</span>`:``}</button>`).join('');
 document.getElementById("count").textContent=catalogState==="ready"?`${shown.length} ${t.count||labels.items}`:"";
 document.getElementById('retry-catalog')?.addEventListener('click',loadCatalog);
 revealOnScroll(container);
}
function updateProductDetail(){
 const p=selected,t=catalogCopy[language];
 document.getElementById('dialog-title').textContent=productName(p);
 document.getElementById('dialog-description').textContent=localized(p.description)||t.noDescription;
 const priceEl=document.getElementById('dialog-price');
 priceEl.innerHTML=priceMarkup(p);
 priceEl.classList.toggle('sale-price',onSale(p));
 document.getElementById('dialog-category').textContent=[productCategories(p).map(categoryName).join(' · '),p.featured?t.featured:'',p.placeholder?copy[language].sample:''].filter(Boolean).join(' · ');
 const details=[productAvailability(p)];
 if(p.sizes?.length)details.push(`${t.sizes}: ${p.sizes.join(' / ')}`);
 if(p.model?.height)details.push(`${t.model}: ${p.model.height} cm`);
 if(p.model?.wearing_size)details.push(`${t.wearing}: ${p.model.wearing_size}`);
 document.getElementById('dialog-details').textContent=details.join('\n');
 // "Message the store" opens the first configured chat channel (with the item prefilled where supported).
 const chat=document.getElementById('dialog-chat'),href=chatUrl(productMessage(p));
 chat.hidden=!href;if(href)chat.href=href;
 // The booking block (booking.js) shows dates, size and availability for inventory-managed items.
 if(typeof updateBookingBlock==='function')updateBookingBlock();
 // The order block (order.js) shows options, quantity and price for sale products.
 if(typeof updateOrderBlock==='function')updateOrderBlock();
}
async function loadCatalog(){
 catalogState='loading';renderProducts();
 try{
  const response=await fetch('/catalog.json',{cache:'no-cache'});
  if(!response.ok)throw new Error(`HTTP ${response.status}`);
  const data=await response.json();
  if(!Array.isArray(data)||data.some(p=>!p||typeof p.id!=='string'||!Array.isArray(p.images)||!Array.isArray(p.videos)))throw new Error('Invalid catalog');
  products=data;catalogState='ready';
 }catch(error){console.error('Catalog loading failed:',error);catalogState='error';}
 renderProducts();
 if(catalogState==='ready'){syncProductFromHash();loadAvailability();if(products.some(isSale)&&typeof loadOrderConfig==='function')loadOrderConfig();}
}
