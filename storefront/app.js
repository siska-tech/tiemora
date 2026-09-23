// Tiemora storefront: the store configuration (/store.json), page copy in four languages, the
// language switcher and the product dialog. catalog.js renders the products, gallery.js the media,
// booking.js the availability check and request form. Everything store-specific (name, contact
// links, colours, languages) comes from config/store.yaml; nothing is hard-coded here.
const FLAGS={vi:'/assets/flags/vn.svg',en:'/assets/flags/us.svg',zh:'/assets/flags/cn.svg',ja:'/assets/flags/jp.svg'};
const LANGUAGE_NAMES={vi:'Tiếng Việt',en:'English',zh:'中文',ja:'日本語'};
// Used until /store.json arrives (and if it never does): a minimal but complete configuration.
let store={store:{name:document.getElementById('brand-name').textContent||'Tiemora Store',tagline:null,description:null,logo:null,logoStyle:'mark',hero:{eyebrow:null,title:null,subtitle:null,image:null,fit:'pan'},announcement:null,values:[],text:{}},languages:['vi','en','ja','zh'],defaultLanguage:'vi',currency:'VND',phoneCountryCode:'84',contact:{},categories:{}};
const copy={
vi:{
discover:'Khám phá',navCollection:'Sản phẩm',navHow:'Cách đặt',navContact:'Liên hệ',heroTitle:'Chọn một món đồ.\nGiữ một <em>kỷ niệm.</em>',explore:'Xem sản phẩm',consult:'Nhắn tin cho cửa hàng',bookCta:'Đặt chỗ',privacy:'Chính sách bảo mật',heroNote:'Chọn ngày, kiểm tra lịch trống và gửi yêu cầu chỉ trong một phút.',visualCaption:'Catalog · Booking · Inventory',collectionEyebrow:'BỘ SƯU TẬP',collectionTitle:'Tìm món đồ cho riêng bạn.',collectionDescription:'Xem sản phẩm, chọn ngày thuê để thấy sản phẩm còn trống và gửi yêu cầu đặt chỗ.',all:'Tất cả',placeholderNotice:'Một số hình bên dưới là hình minh họa tạm, không thể hiện sản phẩm thực tế.',sample:'HÌNH MINH HỌA',price:'Liên hệ cửa hàng để biết giá',howEyebrow:'CÁCH ĐẶT CHỖ',howTitle:'Ba bước đơn giản.',step1Title:'Chọn sản phẩm',step1Description:'Xem hình ảnh, kích cỡ và giá thuê của từng sản phẩm.',step2Title:'Chọn ngày và gửi yêu cầu',step2Description:'Chọn ngày nhận, ngày trả, kiểm tra lịch trống và gửi yêu cầu đặt chỗ kèm cách liên hệ bạn thích.',step3Title:'Cửa hàng xác nhận',step3Description:'Cửa hàng liên hệ qua Zalo, WhatsApp, Messenger hoặc điện thoại để xác nhận. Đặt chỗ chỉ có hiệu lực sau khi được xác nhận.',contactTitle:'Liên hệ với cửa hàng.',contactDescription:'Có câu hỏi về sản phẩm, giá thuê hay lịch trống? Nhắn cho cửa hàng qua kênh bạn thích.',contactFacebook:'Facebook',contactMessenger:'Messenger',contactZalo:'Zalo',contactWhatsapp:'WhatsApp',contactPhone:'Gọi điện',contactEmail:'Email',contactAddress:'Địa chỉ',contactMap:'Xem bản đồ',footer:'Giá, tình trạng còn hàng và điều kiện thuê được xác nhận bởi cửa hàng.',count:'sản phẩm',close:'Đóng',copied:'Đã sao chép thông tin sản phẩm · Dán vào tin nhắn nhé!'
},
en:{
discover:'Explore',navCollection:'Catalog',navHow:'How it works',navContact:'Contact',heroTitle:'Pick something beautiful.\nKeep the <em>memory.</em>',explore:'Browse the catalog',consult:'Message the store',bookCta:'Book now',privacy:'Privacy policy',heroNote:'Pick your dates, check availability and send a request in a minute.',visualCaption:'Catalog · Booking · Inventory',collectionEyebrow:'THE COLLECTION',collectionTitle:'Find the one for you.',collectionDescription:'Browse the catalog, pick rental dates to see what is free, and send a booking request.',all:'All',placeholderNotice:'Some images below are temporary illustrations and do not show the actual items.',sample:'PLACEHOLDER IMAGE',price:'Contact the store for prices',howEyebrow:'HOW IT WORKS',howTitle:'Three simple steps.',step1Title:'Choose an item',step1Description:'Look at the photos, sizes and rental price of each item.',step2Title:'Pick dates and send a request',step2Description:'Choose pick-up and return dates, check availability and send a request with your preferred contact channel.',step3Title:'The store confirms',step3Description:'The store gets in touch on Zalo, WhatsApp, Messenger or by phone to confirm. A booking is only final once confirmed.',contactTitle:'Get in touch.',contactDescription:'Questions about an item, prices or dates? Message the store on the channel you prefer.',contactFacebook:'Facebook',contactMessenger:'Messenger',contactZalo:'Zalo',contactWhatsapp:'WhatsApp',contactPhone:'Call',contactEmail:'Email',contactAddress:'Address',contactMap:'Open map',footer:'Prices, availability and rental terms are confirmed by the store.',count:'items',close:'Close',copied:'Item details copied · Paste them into your message!'
},
zh:{
discover:'探索',navCollection:'商品',navHow:'预约流程',navContact:'联系我们',heroTitle:'选一件心仪之物，\n留住<em>美好回忆。</em>',explore:'浏览商品',consult:'联系店铺',bookCta:'立即预约',privacy:'隐私政策',heroNote:'选择日期、查看可用情况并发送申请，只需一分钟。',visualCaption:'Catalog · Booking · Inventory',collectionEyebrow:'商品目录',collectionTitle:'找到属于你的那一件。',collectionDescription:'浏览商品，选择租赁日期查看可租商品，并发送预约申请。',all:'全部',placeholderNotice:'以下部分图片为临时示意图，不代表实际商品。',sample:'示意图',price:'价格请咨询店铺',howEyebrow:'预约流程',howTitle:'简单三步。',step1Title:'选择商品',step1Description:'查看每件商品的图片、尺码和租赁价格。',step2Title:'选择日期并发送申请',step2Description:'选择取件和归还日期，查看可用情况，并附上您偏好的联系方式发送申请。',step3Title:'店铺确认',step3Description:'店铺将通过 Zalo、WhatsApp、Messenger 或电话与您联系确认。预约在确认后方才生效。',contactTitle:'联系店铺。',contactDescription:'对商品、价格或日期有疑问？通过您偏好的渠道联系店铺。',contactFacebook:'Facebook',contactMessenger:'Messenger',contactZalo:'Zalo',contactWhatsapp:'WhatsApp',contactPhone:'致电',contactEmail:'电子邮件',contactAddress:'地址',contactMap:'查看地图',footer:'价格、库存及租赁条款以店铺确认为准。',count:'件商品',close:'关闭',copied:'已复制商品信息 · 粘贴到消息中即可！'
},
ja:{
discover:'見る',navCollection:'商品',navHow:'予約の流れ',navContact:'お問い合わせ',heroTitle:'お気に入りを選んで、\n思い出を<em>残す。</em>',explore:'商品を見る',consult:'お店にメッセージ',bookCta:'予約する',privacy:'プライバシーポリシー',heroNote:'日付を選んで空き状況を確認し、1分で申請できます。',visualCaption:'Catalog · Booking · Inventory',collectionEyebrow:'コレクション',collectionTitle:'あなたの一点を見つける。',collectionDescription:'商品を見て、レンタル日を選ぶと空いている商品だけが表示されます。そのまま予約申請できます。',all:'すべて',placeholderNotice:'以下の一部は仮画像で、実際の商品を示すものではありません。',sample:'仮画像',price:'料金はお問い合わせください',howEyebrow:'予約の流れ',howTitle:'かんたん3ステップ。',step1Title:'商品を選ぶ',step1Description:'写真・サイズ・レンタル料金を確認します。',step2Title:'日付を選んで申請',step2Description:'受取日と返却日を選んで空き状況を確認し、希望の連絡方法とあわせて申請を送ります。',step3Title:'お店が確認',step3Description:'お店から Zalo / WhatsApp / Messenger / 電話で確認のご連絡をします。予約は確認後に確定します。',contactTitle:'お問い合わせ。',contactDescription:'商品・料金・日程についてのご質問は、お好きな方法でお店にご連絡ください。',contactFacebook:'Facebook',contactMessenger:'Messenger',contactZalo:'Zalo',contactWhatsapp:'WhatsApp',contactPhone:'電話する',contactEmail:'メール',contactAddress:'住所',contactMap:'地図を見る',footer:'料金・在庫・レンタル条件は店舗が確認します。',count:'点',close:'閉じる',copied:'商品情報をコピーしました · メッセージに貼り付けてください'
}
};
// Neutral placeholder art for products without media: a simple garment outline on the product's colours.
function artwork(product){
 const bg=product.bg||'#ebe6dc',fg=product.color||'#8f8778';
 return `<svg viewBox="0 0 326 510" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect width="326" height="510" fill="${bg}"/><circle cx="110" cy="150" r="90" fill="${fg}" opacity=".12"/><circle cx="230" cy="360" r="120" fill="${fg}" opacity=".1"/><g fill="none" stroke="${fg}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" opacity=".85"><path d="M163 120l-30 26-26-9-38 90 34 17-13 141h146l-13-141 34-17-38-90-26 9z"/><path d="M146 120q17 26 34 0"/></g></svg>`;
}
let language='vi',filter='all',selected=null;
const localizedText=(value,lang=language)=>typeof value==='string'?value:(value&&typeof value==='object'?[lang,store.defaultLanguage,...(store.languages||[]),...Object.keys(value)].map(k=>value[k]).find(v=>typeof v==='string'&&v.trim())||'':'');
function pickLanguage(){
 const allowed=store.languages||['vi'];
 let stored='';try{stored=localStorage.getItem('tiemora-language')||'';}catch{}
 const fromQuery=new URLSearchParams(location.search).get('lang')||'';
 return [fromQuery,stored,store.defaultLanguage,...allowed].find(l=>allowed.includes(l)&&copy[l])||'vi';
}
// --- Contact channels -----------------------------------------------------------------------------
const digits=value=>{let d=String(value||'').replace(/[^\d+]/g,'');if(d.startsWith('+'))d=d.slice(1);else if(d.startsWith('00'))d=d.slice(2);d=d.replace(/\D/g,'');if(d.startsWith('0'))d=(store.phoneCountryCode||'84')+d.replace(/^0+/,'');return d;};
function contactLinks(){
 const c=store.contact||{},links=[];
 if(c.messenger)links.push({key:'messenger',href:c.messenger,label:'contactMessenger',chat:true});
 if(c.whatsapp)links.push({key:'whatsapp',href:`https://wa.me/${digits(c.whatsapp)}`,label:'contactWhatsapp',chat:true,prefill:true});
 if(c.zalo)links.push({key:'zalo',href:/^https?:\/\//.test(c.zalo)?c.zalo:`https://zalo.me/${digits(c.zalo)}`,label:'contactZalo',chat:true});
 if(c.facebook)links.push({key:'facebook',href:c.facebook,label:'contactFacebook',chat:true});
 if(c.phone)links.push({key:'phone',href:`tel:${String(c.phone).replace(/[^\d+]/g,'')}`,label:'contactPhone',text:c.phone});
 if(c.email)links.push({key:'email',href:`mailto:${c.email}`,label:'contactEmail',text:c.email});
 return links;
}
// The first chat channel the store configured; the "message the store" buttons go there.
const chatLink=()=>contactLinks().find(l=>l.chat)||null;
function chatUrl(text=''){
 const link=chatLink();if(!link)return '';
 return link.prefill&&text?`${link.href}?text=${encodeURIComponent(text)}`:link.href;
}
function renderContact(){
 const t=copy[language],links=contactLinks(),box=document.getElementById('contact-channels');
 box.innerHTML=links.map(l=>`<a class="button${l.chat?'':' light'} contact-${escapeMarkup(l.key)}" href="${escapeMarkup(l.href)}"${l.href.startsWith('http')?' target="_blank" rel="noopener noreferrer"':''}><span>${escapeMarkup(t[l.label])}${l.text?` · ${escapeMarkup(l.text)}`:''}</span><span>↗</span></a>`).join('');
 const address=localizedText(store.contact?.address),details=document.getElementById('store-details');
 details.hidden=!address&&!store.contact?.mapUrl;
 details.innerHTML=(address?`<div><span>${escapeMarkup(t.contactAddress)}</span>${store.contact.mapUrl?`<a href="${escapeMarkup(store.contact.mapUrl)}" target="_blank" rel="noopener noreferrer">${escapeMarkup(address)} ↗</a>`:escapeMarkup(address)}</div>`:'')+(!address&&store.contact?.mapUrl?`<div><a href="${escapeMarkup(store.contact.mapUrl)}" target="_blank" rel="noopener noreferrer">${escapeMarkup(t.contactMap)} ↗</a></div>`:'');
 const chat=chatLink();
 for(const el of document.querySelectorAll('.chat')){if(chat){el.hidden=false;el.href=chat.href;el.target='_blank';el.rel='noopener noreferrer';}else{el.hidden=true;}}
 document.getElementById('dialog-chat').hidden=!chat;
}
// --- Store branding -------------------------------------------------------------------------------
function renderStore(){
 const s=store.store;
 for(const id of ['brand-name','footer-name','contact-eyebrow'])document.getElementById(id).textContent=s.name;
 document.getElementById('hero-eyebrow').textContent=localizedText(s.hero?.eyebrow)||s.name;
 const subtitle=localizedText(s.hero?.subtitle),subtitleEl=document.getElementById('hero-subtitle');
 subtitleEl.hidden=!subtitle;subtitleEl.textContent=subtitle;
 const tagline=localizedText(s.tagline);
 for(const id of ['brand-tagline','footer-tagline'])document.getElementById(id).textContent=tagline;
 const mark=document.getElementById('brand-mark');
 const wordmark=s.logoStyle==='wordmark';
 document.body.classList.toggle('hero-environmental',s.hero?.layout==='environmental');
 if(s.logo){mark.hidden=false;mark.innerHTML=`<img src="${escapeMarkup(s.logo)}" alt="${wordmark?escapeMarkup(s.name):''}"${wordmark?'':' width="144" height="144"'}>`;document.getElementById('brand').classList.add('brand-with-logo');}
 else{mark.hidden=true;mark.innerHTML='';document.getElementById('brand').classList.remove('brand-with-logo');}
 document.getElementById('brand').classList.toggle('brand-wordmark-logo',Boolean(s.logo&&wordmark));
 const description=localizedText(s.description);
 if(description){document.getElementById('hero-description').textContent=description;document.querySelector('meta[name="description"]').content=description;}
 // Hero title: config wins (\n = line break, <em> allowed), else the built-in headline.
 const title=localizedText(s.hero?.title)||copy[language].heroTitle;
 document.getElementById('hero-title').innerHTML=escapeMarkup(title).replace(/&lt;em&gt;/g,'<em>').replace(/&lt;\/em&gt;/g,'</em>');
 if(s.hero?.image)document.getElementById('hero-image').src=s.hero.image;
 // fit: 'pan' (tall crop that slides on scroll, the default) or 'cover' (fills the frame, no slide).
 document.getElementById('hero-art').classList.toggle('hero-cover',s.hero?.fit==='cover');
 const heroImg=document.getElementById('hero-image');
 if(s.hero?.focus){heroImg.style.objectPosition=s.hero.focus;heroImg.dataset.focus=s.hero.focus;}
 // subject: the point of the image ("X% Y%") the scroll zoom of the environmental layout closes in on.
 if(s.hero?.subject)heroImg.dataset.subject=s.hero.subject;
 const announcement=localizedText(s.announcement),bar=document.getElementById('announcement');
 bar.hidden=!announcement;document.getElementById('announcement-text').textContent=announcement;
 const values=(s.values||[]).map(v=>localizedText(v)).filter(Boolean),strip=document.getElementById('values');
 strip.hidden=!values.length;
 document.getElementById('values-list').innerHTML=values.map((v,i)=>`${i?'<i>✧</i>':''}<span>${escapeMarkup(v)}</span>`).join('');
 document.title=tagline?`${s.name} | ${tagline}`:s.name;
 renderContact();
}
function renderLanguageOptions(){
 const select=document.getElementById('language');
 select.innerHTML=(store.languages||['vi']).filter(l=>copy[l]).map(l=>`<option value="${l}">${LANGUAGE_NAMES[l]||l}</option>`).join('');
 select.parentElement.hidden=(store.languages||[]).length<2;
}
function setLanguage(next){
 language=copy[next]?next:'vi';const t=copy[language];
 document.documentElement.lang=language;
 document.querySelectorAll('[data-i18n]').forEach(el=>{el.textContent=t[el.dataset.i18n]??'';});
 document.querySelectorAll('.hero-services span').forEach(el=>{el.hidden=!el.textContent.trim();});
 document.getElementById('language').value=language;document.getElementById('language-flag').src=FLAGS[language]||'';
 document.getElementById('close-dialog').setAttribute('aria-label',t.close);
 renderStore();
 if(typeof refreshBookingText==='function')refreshBookingText();
 if(typeof refreshOrderText==='function')refreshOrderText();
 renderProducts();if(selected){updateProductDetail();renderGallery();}
 try{localStorage.setItem('tiemora-language',language);}catch{}
}
// The hero artwork is wider than its frame; scrolling pans it right so the whole scene is seen.
const heroArt=document.getElementById('hero-art'),heroImage=document.getElementById('hero-image'),heroSection=document.querySelector('.hero'),heroCopy=document.querySelector('.hero-copy');
let panQueued=false;
const clamp01=v=>Math.min(1,Math.max(0,v));
const percentPair=(value,fallback)=>{const m=/^(\d{1,3})% (\d{1,3})%$/.exec(value||'');return m?[+m[1]/100,+m[2]/100]:fallback;};
// Where the cover-fitted image sits inside its frame, and where hero.subject (the bowl) lands in frame pixels.
function heroGeometry(objectPosition){
 const W=heroArt.clientWidth,H=heroArt.clientHeight,nw=heroImage.naturalWidth||1600,nh=heroImage.naturalHeight||1000;
 const s=Math.max(W/nw,H/nh),rw=nw*s,rh=nh*s,[fx,fy]=objectPosition,[px,py]=percentPair(heroImage.dataset.subject,objectPosition);
 const ox=(W-rw)*fx,oy=(H-rh)*fy;
 return {W,H,rw,rh,ox,oy,sx:ox+rw*px,sy:oy+rh*py};
}
// Scales the image about the subject and drifts the subject towards (tx,ty), never uncovering the frame
// (object-fit clips the picture to the element box, so the box edges are the limit, not the picture's).
function zoomTowards(g,scale,tx,ty){
 const left=g.sx*(1-scale),right=g.sx+(g.W-g.sx)*scale,top=g.sy*(1-scale),bottom=g.sy+(g.H-g.sy)*scale;
 const dx=Math.min(-left,Math.max(g.W-right,tx-g.sx)),dy=Math.min(-top,Math.max(g.H-bottom,ty-g.sy));
 heroImage.style.transformOrigin=`${g.sx}px ${g.sy}px`;
 heroImage.style.transform=`translate3d(${dx.toFixed(1)}px,${dy.toFixed(1)}px,0) scale(${scale.toFixed(4)})`;
}
function drawHeroPan(){
 if(document.body.classList.contains('hero-environmental')){
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches,phone=window.matchMedia('(max-width: 640px)').matches;
  const focus=percentPair(heroImage.dataset.focus,[.5,.5]);
  if(!heroArt.clientWidth||!heroArt.clientHeight)return;
  if(phone){
   // The frame is a portrait slice of a landscape scene: crop with the subject on the right third and its
   // surroundings to the left, then, while the section is pinned (styles.css), push in on the subject
   // until it sits centred, lifting the copy away as the visitor scrolls.
   const probe=heroGeometry(focus),fx=probe.rw>probe.W?clamp01((probe.W*.68-(probe.sx-probe.ox))/(probe.W-probe.rw)):.5;
   heroImage.style.objectPosition=`${(fx*100).toFixed(2)}% ${focus[1]*100}%`;
   const runway=heroSection.offsetHeight-heroArt.offsetHeight,progress=runway>0&&!reduced?clamp01(-heroSection.getBoundingClientRect().top/runway):0;
   const eased=1-Math.pow(1-progress,3),fade=clamp01((progress-.15)/.5);
   heroSection.style.setProperty('--hero-progress',progress.toFixed(4));
   heroSection.style.setProperty('--hero-copy-fade',fade.toFixed(4));
   heroCopy.classList.toggle('is-faded',fade>=.98);
   if(reduced){heroImage.style.transform='';return;}
   const g=heroGeometry([fx,focus[1]]);
   zoomTowards(g,1+eased*.32,g.sx+(g.W/2-g.sx)*eased,g.sy+(g.H*.52-g.sy)*eased);
   return;
  }
  heroImage.style.objectPosition=heroImage.dataset.focus||'';
  heroCopy.classList.remove('is-faded');
  heroSection.style.setProperty('--hero-copy-fade','0');
  if(reduced){heroImage.style.transform='';heroSection.style.setProperty('--hero-progress','0');return;}
  // Desktop: a slow push-in on the subject as the scene scrolls away.
  const frame=heroArt.getBoundingClientRect(),progress=clamp01(-frame.top/frame.height);
  heroSection.style.setProperty('--hero-progress',(progress*.5).toFixed(4));
  const g=heroGeometry(focus);zoomTowards(g,1+progress*.12,g.sx,g.sy);
  return;
 }
 if(heroArt.classList.contains('hero-cover')){heroImage.style.transform='';return;}
 const frame=heroArt.getBoundingClientRect();
 const distance=Math.max(0,heroImage.offsetWidth-heroArt.clientWidth);
 const start=Math.max(0,frame.top+window.scrollY+frame.height/2-window.innerHeight);
 const progress=Math.min(1,Math.max(0,(window.scrollY-start)/(window.innerHeight*0.6)));
 heroImage.style.transform=`translate3d(${-distance*progress}px,0,0)`;
}
function queueHeroPan(){if(panQueued)return;panQueued=true;requestAnimationFrame(()=>{drawHeroPan();panQueued=false;});}
drawHeroPan();
heroImage.addEventListener('load',queueHeroPan);
addEventListener('scroll',queueHeroPan,{passive:true});
addEventListener('resize',queueHeroPan);
document.getElementById('language').addEventListener('change',e=>setLanguage(e.target.value));
document.querySelector('.filters').addEventListener('click',e=>{const button=e.target.closest('[data-filter]');if(button){filter=button.dataset.filter;renderProducts();}});document.getElementById('catalog-sort').addEventListener('change',renderProducts);
// Rental dates: the return date can never precede the pickup, and past days are not offered.
const dateFrom=document.getElementById('date-from'),dateTo=document.getElementById('date-to');
dateFrom.min=dateTo.min=new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10);
function onDatesChanged(){if(dateFrom.value){dateTo.min=dateFrom.value;if(dateTo.value&&dateTo.value<dateFrom.value)dateTo.value=dateFrom.value;}else dateTo.min=dateFrom.min;loadAvailability();}
dateFrom.addEventListener('change',onDatesChanged);dateTo.addEventListener('change',onDatesChanged);
document.getElementById('date-clear').addEventListener('click',()=>{dateFrom.value='';dateTo.value='';onDatesChanged();});
const dialog=document.getElementById('product-dialog');
// Each product is addressable as /#<id>, so a link pasted into a chat opens straight onto it.
function productFromHash(){
 let id='';
 try{id=decodeURIComponent(location.hash.slice(1));}catch{return null;}
 return id&&products.find(p=>p.id===id)||null;
}
function openProduct(product,{link=true}={}){
 if(!product)return;
 selected=product;renderGallery(true);updateProductDetail();
 dialog.setAttribute('aria-labelledby','dialog-title');
 if(!dialog.open)dialog.showModal();
 requestAnimationFrame(()=>dialog.classList.add('is-open'));
 // A history entry per product is what makes the browser's back button close the dialog.
 if(link)history.pushState({product:product.id},'','#'+encodeURIComponent(product.id));
}
// Called on popstate and once the catalog has loaded, so the address bar always wins.
function syncProductFromHash(){
 const product=productFromHash();
 if(product)openProduct(product,{link:false});
 else if(dialog.open)dialog.close();
}
addEventListener('popstate',syncProductFromHash);
document.getElementById('products').addEventListener('click',e=>{const button=e.target.closest('[data-id]');if(button)openProduct(products.find(p=>p.id===button.dataset.id));});
document.getElementById('close-dialog').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
dialog.addEventListener('close',()=>{dialog.classList.remove('is-open');stopGalleryVideo();document.getElementById('dialog-art').innerHTML='';document.getElementById('dialog-copy-status').textContent='';selected=null;mediaIndex=0;
 if(productFromHash())history.replaceState(null,'',location.pathname+location.search);});
function copyProductInfo(){
 if(!selected)return;
 const text=productMessage(selected),status=document.getElementById('dialog-copy-status');
 const show=()=>{status.textContent=copy[language].copied;clearTimeout(copyProductInfo.t);copyProductInfo.t=setTimeout(()=>{status.textContent='';},3000);};
 if(navigator.clipboard?.writeText)navigator.clipboard.writeText(text).then(show).catch(()=>{});
 else{const ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();try{document.execCommand('copy');show();}catch{}document.body.removeChild(ta);}
}
document.getElementById('dialog-chat').addEventListener('click',copyProductInfo);
// .reveal elements start hidden in CSS and settle into place once they reach the viewport.
const revealObserver='IntersectionObserver' in window&&!window.matchMedia('(prefers-reduced-motion:reduce)').matches
 ?new IntersectionObserver(entries=>{
   for(const entry of entries)if(entry.isIntersecting){entry.target.classList.add('is-visible');revealObserver.unobserve(entry.target);}
  },{threshold:0.1,rootMargin:'0px 0px -6% 0px'})
 :null;
function revealOnScroll(root=document){
 const targets=root.querySelectorAll('.reveal:not(.is-visible)');
 if(revealObserver)targets.forEach(el=>revealObserver.observe(el));
 else targets.forEach(el=>el.classList.add('is-visible'));
}
// Boot: the configuration first (name, languages, contact), then copy and catalog.
async function loadStore(){
 try{
  const response=await fetch('/store.json',{cache:'no-cache'});
  if(response.ok){const data=await response.json();if(data&&typeof data==='object'&&data.store)store={...store,...data,store:{...store.store,...data.store}};}
 }catch(error){console.warn('store.json unavailable, using defaults:',error);}
 // store.text overrides the built-in copy per language (e.g. bookCta: 'Đặt hoa' for a florist).
 for(const [key,value] of Object.entries(store.store.text||{}))for(const lang of Object.keys(copy)){const text=typeof value==='string'?value:value?.[lang];if(typeof text==='string'&&text.trim())copy[lang][key]=text;}
}
loadStore().then(()=>{renderLanguageOptions();setLanguage(pickLanguage());loadCatalog();revealOnScroll();queueHeroPan();});
