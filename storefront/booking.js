// Public reservation requests. Inside the product dialog the customer picks pick-up / return dates
// (and a size), sees whether the design is free, and sends a request. The request is only ever
// `pending`: nothing is held until staff confirm it in /admin/ and contact the customer.
// Loaded after app.js; uses its globals (selected, language, copy, catalogCopy, chatUrl, store).
const bookingCopy={
 vi:{title:'Đặt chỗ',from:'Ngày nhận',to:'Ngày trả',size:'Kích cỡ',anySize:'Cửa hàng tư vấn',cta:'Gửi yêu cầu đặt chỗ',checking:'Đang kiểm tra lịch trống…',available:'Có sẵn',unavailable:'Không có sẵn trong thời gian này',pickDates:'Chọn ngày nhận và ngày trả để kiểm tra lịch trống.',apiDown:'Không kiểm tra được lịch trống. Vui lòng nhắn tin cho cửa hàng.',
  formTitle:'Gửi yêu cầu đặt chỗ',name:'Họ tên',phone:'Số điện thoại',preferred:'Liên hệ qua',zaloNumber:'Số Zalo',whatsappNumber:'Số WhatsApp',messengerUrl:'Link Facebook / Messenger',note:'Ghi chú',submit:'Gửi yêu cầu',sending:'Đang gửi…',
  terms:'Đây là yêu cầu đặt chỗ, chưa phải đặt chỗ đã xác nhận. Cửa hàng sẽ liên hệ với bạn để xác nhận.',
  channels:{zalo:'Zalo',whatsapp:'WhatsApp',messenger:'Messenger',phone:'Gọi điện'},
  channelHints:{zalo:'Nhắn qua Zalo',whatsapp:'Nhắn qua WhatsApp',messenger:'Facebook / Messenger',phone:'Cửa hàng sẽ gọi cho bạn'},sameAsPhone:'Giống số điện thoại',optional:'Không bắt buộc',consent:'Tôi đồng ý với {policy} và việc xử lý thông tin cá nhân để phục vụ yêu cầu đặt chỗ.',policy:'Chính sách bảo mật',
  doneTitle:'Cảm ơn bạn 🌸',doneSent:'Yêu cầu đặt chỗ đã được gửi.',doneId:'Mã yêu cầu',doneContact:'Cửa hàng sẽ liên hệ để xác nhận.',doneNote:'Yêu cầu của bạn đã được tiếp nhận. Đặt chỗ chỉ được xác nhận sau khi cửa hàng liên hệ xác nhận.',doneDuplicate:'Yêu cầu này đã được gửi trước đó, cửa hàng sẽ sớm liên hệ với bạn.',doneMessenger:'Nhắn tin cho cửa hàng',close:'Đóng',adminTurnstile:'Dành cho quản trị viên: Cloudflare Turnstile chưa được cấu hình ({missing}). Biểu mẫu vẫn hoạt động nhưng chưa có bảo vệ chống spam. Xem docs/deployment-cloudflare.md.',
  errors:{required:'Vui lòng nhập họ tên và số điện thoại.',channel:'Vui lòng chọn cách liên hệ.',zaloNumber:'Vui lòng nhập số Zalo hoặc chọn "Giống số điện thoại".',whatsappNumber:'Vui lòng nhập số WhatsApp hoặc chọn "Giống số điện thoại".',consent:'Vui lòng đồng ý với Chính sách bảo mật để gửi yêu cầu.',phone:'Số điện thoại chưa đúng.',unavailable:'Rất tiếc, sản phẩm này vừa hết trong khoảng ngày đã chọn. Bạn thử ngày khác hoặc nhắn tin cho cửa hàng nhé.',too_many_requests:'Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau hoặc nhắn tin cho cửa hàng.',turnstile_required:'Vui lòng hoàn tất bước xác minh.',turnstile_failed:'Xác minh không thành công, vui lòng thử lại.',turnstile_unavailable:'Không xác minh được lúc này, vui lòng thử lại sau.',validation_error:'Vui lòng kiểm tra lại thông tin.',network:'Không gửi được. Vui lòng kiểm tra kết nối và thử lại.'}},
 en:{title:'Book this item',from:'Pick-up date',to:'Return date',size:'Size',anySize:'Let the store advise',cta:'Send a booking request',checking:'Checking availability…',available:'Available',unavailable:'Not available for these dates',pickDates:'Choose pick-up and return dates to check availability.',apiDown:'Availability could not be checked. Please message the store.',
  formTitle:'Send a booking request',name:'Full name',phone:'Phone number',preferred:'Contact me via',zaloNumber:'Zalo number',whatsappNumber:'WhatsApp number',messengerUrl:'Facebook / Messenger link',note:'Notes',submit:'Send request',sending:'Sending…',
  terms:'This is a booking request, not a confirmed booking. The store will contact you to confirm.',
  channels:{zalo:'Zalo',whatsapp:'WhatsApp',messenger:'Messenger',phone:'Phone call'},
  channelHints:{zalo:'Message on Zalo',whatsapp:'Message on WhatsApp',messenger:'Facebook / Messenger',phone:'The store will call you'},sameAsPhone:'Same as my phone number',optional:'Optional',consent:'I agree to the {policy} and to my personal data being used to handle this booking request.',policy:'Privacy policy',
  doneTitle:'Thank you 🌸',doneSent:'Your booking request has been sent.',doneId:'Request ID',doneContact:'The store will contact you to confirm.',doneNote:'Your request has been received. A booking is confirmed only once the store has contacted you.',doneDuplicate:'This request was already sent; the store will be in touch soon.',doneMessenger:'Message the store',close:'Close',adminTurnstile:'For the store admin: Cloudflare Turnstile is not configured ({missing}). The form still works but has no spam protection. See docs/deployment-cloudflare.md.',
  errors:{required:'Please enter your name and phone number.',channel:'Please choose how we should contact you.',zaloNumber:'Please enter your Zalo number or tick "Same as my phone number".',whatsappNumber:'Please enter your WhatsApp number or tick "Same as my phone number".',consent:'Please accept the privacy policy to send the request.',phone:'That phone number does not look right.',unavailable:'Sorry, this item was just taken for those dates. Try other dates or message the store.',too_many_requests:'Too many requests. Please try again later or message the store.',turnstile_required:'Please complete the verification.',turnstile_failed:'Verification failed, please try again.',turnstile_unavailable:'Verification is unavailable right now, please try again later.',validation_error:'Please check the details.',network:'Could not send. Check your connection and try again.'}},
 zh:{title:'预约',from:'取件日期',to:'归还日期',size:'尺码',anySize:'由店铺建议',cta:'发送预约申请',checking:'正在查询…',available:'有库存',unavailable:'所选日期暂不可租',pickDates:'请选择取衣和归还日期以查询库存。',apiDown:'暂时无法查询库存，请联系店铺。',
  formTitle:'发送预约申请',name:'姓名',phone:'电话号码',preferred:'联系方式',zaloNumber:'Zalo 号码',whatsappNumber:'WhatsApp 号码',messengerUrl:'Facebook / Messenger 链接',note:'备注',submit:'发送申请',sending:'发送中…',
  terms:'这是预约申请，并非已确认的预约。店铺将与您联系确认。',
  channels:{zalo:'Zalo',whatsapp:'WhatsApp',messenger:'Messenger',phone:'电话'},
  channelHints:{zalo:'通过 Zalo 联系',whatsapp:'通过 WhatsApp 联系',messenger:'Facebook / Messenger',phone:'店铺将致电您'},sameAsPhone:'与电话号码相同',optional:'选填',consent:'我同意{policy}，并同意为处理本次预约申请而使用我的个人信息。',policy:'隐私政策',
  doneTitle:'感谢您 🌸',doneSent:'预约申请已发送。',doneId:'申请编号',doneContact:'店铺将与您联系确认。',doneNote:'您的申请已收到。预约仅在店铺联系确认后生效。',doneDuplicate:'该申请此前已发送，店铺会尽快联系您。',doneMessenger:'联系店铺',close:'关闭',adminTurnstile:'管理员提示：Cloudflare Turnstile 尚未配置（{missing}）。表单可以使用，但没有防垃圾保护。请参阅 docs/deployment-cloudflare.md。',
  errors:{required:'请填写姓名和电话号码。',channel:'请选择联系方式。',zaloNumber:'请填写 Zalo 号码或勾选“与电话号码相同”。',whatsappNumber:'请填写 WhatsApp 号码或勾选“与电话号码相同”。',consent:'请先同意隐私政策再发送申请。',phone:'电话号码格式不正确。',unavailable:'很抱歉，该商品在所选日期刚被预订。请更换日期或联系店铺。',too_many_requests:'申请过于频繁，请稍后再试或联系店铺。',turnstile_required:'请完成验证。',turnstile_failed:'验证失败，请重试。',turnstile_unavailable:'暂时无法验证，请稍后再试。',validation_error:'请检查填写的信息。',network:'发送失败，请检查网络后重试。'}},
 ja:{title:'この商品を予約',from:'受取日',to:'返却日',size:'サイズ',anySize:'お店におまかせ',cta:'予約申請を送る',checking:'空き状況を確認中…',available:'空きあり',unavailable:'この期間は空きがありません',pickDates:'受取日と返却日を選ぶと空き状況を確認できます。',apiDown:'空き状況を確認できませんでした。お店にお問い合わせください。',
  formTitle:'予約申請を送る',name:'お名前',phone:'電話番号',preferred:'ご希望の連絡方法',zaloNumber:'Zalo番号',whatsappNumber:'WhatsApp番号',messengerUrl:'Facebook / Messenger のリンク',note:'備考',submit:'申請を送る',sending:'送信中…',
  terms:'これは予約申請であり、確定した予約ではありません。お店から確認のご連絡をします。',
  channels:{zalo:'Zalo',whatsapp:'WhatsApp',messenger:'Messenger',phone:'電話'},
  channelHints:{zalo:'Zaloで連絡',whatsapp:'WhatsAppで連絡',messenger:'Facebook / Messenger',phone:'お店から電話します'},sameAsPhone:'電話番号と同じ',optional:'任意',consent:'{policy}と、予約申請のために個人情報を利用することに同意します。',policy:'プライバシーポリシー',
  doneTitle:'ありがとうございます 🌸',doneSent:'予約申請を送信しました。',doneId:'受付番号',doneContact:'お店から確認のご連絡をします。',doneNote:'申請を受け付けました。予約はお店からの確認連絡をもって確定します。',doneDuplicate:'この申請はすでに送信されています。お店からまもなくご連絡します。',doneMessenger:'お店にメッセージ',close:'閉じる',adminTurnstile:'管理者向け: Cloudflare Turnstile が未設定です（{missing}）。フォームは動作しますがスパム対策がありません。docs/deployment-cloudflare.md を参照してください。',
  errors:{required:'お名前と電話番号を入力してください。',channel:'連絡方法を選択してください。',zaloNumber:'Zalo番号を入力するか「電話番号と同じ」にチェックしてください。',whatsappNumber:'WhatsApp番号を入力するか「電話番号と同じ」にチェックしてください。',consent:'申請を送るにはプライバシーポリシーへの同意が必要です。',phone:'電話番号の形式を確認してください。',unavailable:'申し訳ありません。この期間は直前に埋まってしまいました。別の日程を選ぶか、お店にご相談ください。',too_many_requests:'申請回数が多すぎます。しばらくしてから再度お試しいただくか、お店にご連絡ください。',turnstile_required:'認証を完了してください。',turnstile_failed:'認証に失敗しました。もう一度お試しください。',turnstile_unavailable:'現在認証できません。しばらくしてからお試しください。',validation_error:'入力内容を確認してください。',network:'送信できませんでした。通信環境を確認して再度お試しください。'}}
};
const BOOKING_CHANNELS=['zalo','whatsapp','messenger','phone'];
const bt=key=>bookingCopy[language]?.[key]??bookingCopy.vi[key];
const bookingBlock=document.getElementById('dialog-booking'),bookingFrom=document.getElementById('booking-from'),bookingTo=document.getElementById('booking-to'),bookingSize=document.getElementById('booking-size'),bookingStatus=document.getElementById('booking-status'),bookingOpen=document.getElementById('booking-open');
const bookingDialog=document.getElementById('booking-dialog'),bookingForm=document.getElementById('booking-form'),bookingDone=document.getElementById('booking-done'),bookingError=document.getElementById('booking-error');
// What the dialog currently knows: the design, dates, size and whether that combination is free.
let booking={productId:'',from:'',to:'',size:'',available:false,checkSeq:0};
const localToday=()=>new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10);
const isoDate=value=>/^\d{4}-\d{2}-\d{2}$/.test(value||'');

function refreshBookingText(){
 document.querySelectorAll('[data-booking-i18n]').forEach(el=>{el.textContent=bt(el.dataset.bookingI18n);});
 document.getElementById('close-booking').setAttribute('aria-label',bt('close'));
 // Contact channel cards: real radio inputs (keyboard + screen readers) dressed as tappable cards.
 const channels=document.getElementById('booking-channels');
 const current=bookingForm.elements.preferred_contact_channel?.value||'zalo';
 channels.innerHTML=BOOKING_CHANNELS.map(c=>`<label class="channel-card" for="channel-${c}"><input type="radio" id="channel-${c}" name="preferred_contact_channel" value="${c}" class="sr-only"${c===current?' checked':''}><span class="channel-mark" aria-hidden="true"></span><span class="channel-name">${escapeMarkup(bt('channels')[c])}</span><span class="channel-hint">${escapeMarkup(bt('channelHints')[c])}</span></label>`).join('');
 // Consent sentence with the policy link inside it.
 const [before,after]=bt('consent').split('{policy}');
 document.getElementById('consent-text').innerHTML=`${escapeMarkup(before)}<a href="/privacy?lang=${encodeURIComponent(language)}" target="_blank" rel="noopener noreferrer">${escapeMarkup(bt('policy'))}</a>${escapeMarkup(after??'')}`;
 syncChannelFields();
 fillSizes();
 renderBookingStatus();
 renderTurnstileWarning();
 if(!bookingDone.hidden&&bookingDone.dataset.id)renderDone(JSON.parse(bookingDone.dataset.result||'{}'));
}
const chosenChannel=()=>bookingForm.elements.preferred_contact_channel?.value||'';
// Only the chosen channel's extra field is shown; Zalo / WhatsApp hide their number input while
// "same as my phone number" is ticked (the main phone is used at submit time, so later edits count).
function syncChannelFields(){
 const chosen=chosenChannel();
 bookingForm.querySelectorAll('.channel-card').forEach(card=>card.classList.toggle('is-selected',card.querySelector('input').checked));
 bookingForm.querySelectorAll('[data-channel-field]').forEach(el=>{
  const active=el.dataset.channelField===chosen;
  if(active&&el.hidden){el.hidden=false;el.classList.remove('is-entering');void el.offsetWidth;el.classList.add('is-entering');}
  else if(!active)el.hidden=true;
  const same=el.querySelector('input[type=checkbox]'),number=el.querySelector('.channel-number');
  if(same&&number){number.hidden=same.checked;number.querySelector('input').disabled=same.checked;}
 });
}
function clearConsentError(){document.getElementById('consent-row').classList.remove('is-invalid');}
function fillSizes(){
 const p=selected;
 const sizes=Array.isArray(p?.sizes)?p.sizes.filter(s=>typeof s==='string'&&s.trim()):[];
 document.getElementById('booking-size-field').hidden=!sizes.length;
 bookingSize.innerHTML=`<option value="">${escapeMarkup(bt('anySize'))}</option>`+sizes.map(s=>`<option value="${escapeMarkup(s)}"${s===booking.size?' selected':''}>${escapeMarkup(s)}</option>`).join('');
 if(!sizes.includes(booking.size))booking.size='';
}
// Called by catalog.js whenever the product dialog (re)renders its details.
function updateBookingBlock(){
 const p=selected;
 const managed=Boolean(p&&p.inventory?.managed===true);
 bookingBlock.hidden=!managed;
 if(!managed)return;
 if(booking.productId!==p.id){
  // A new design: start from the dates the customer already typed in the collection search, if any.
  const range=typeof readDateRange==='function'?readDateRange():null;
  booking={productId:p.id,from:range?.from||'',to:range?.to||'',size:'',available:false,checkSeq:booking.checkSeq};
  bookingFrom.value=booking.from;bookingTo.value=booking.to;
 }
 bookingFrom.min=localToday();bookingTo.min=booking.from||localToday();
 fillSizes();
 checkAvailability();
}
function renderBookingStatus(state=bookingStatus.dataset.state||''){
 bookingStatus.dataset.state=state;
 bookingStatus.className='booking-status'+(state==='available'?' is-available':state==='unavailable'?' is-unavailable':'');
 bookingStatus.textContent=state?bt(state):'';
 bookingOpen.disabled=state!=='available';
}
async function checkAvailability(){
 const p=selected;if(!p)return;
 booking.from=bookingFrom.value;booking.to=bookingTo.value;booking.size=bookingSize.value;booking.available=false;
 if(!isoDate(booking.from)||!isoDate(booking.to)||booking.from>booking.to){renderBookingStatus('pickDates');return;}
 const seq=++booking.checkSeq;
 renderBookingStatus('checking');
 try{
  const query=new URLSearchParams({from:booking.from,to:booking.to});
  if(booking.size)query.set('size',booking.size);
  const response=await fetch(`/api/products/${encodeURIComponent(p.id)}/availability?${query}`,{cache:'no-cache'});
  if(!response.ok)throw new Error(`HTTP ${response.status}`);
  const data=await response.json();
  if(seq!==booking.checkSeq||selected?.id!==p.id)return;
  booking.available=data.available>0;
  renderBookingStatus(booking.available?'available':'unavailable');
 }catch(error){
  if(seq!==booking.checkSeq)return;
  console.warn('Availability check failed:',error);
  renderBookingStatus('apiDown');
 }
}
function onBookingDates(){
 if(bookingFrom.value){bookingTo.min=bookingFrom.value;if(bookingTo.value&&bookingTo.value<bookingFrom.value)bookingTo.value=bookingFrom.value;}
 else bookingTo.min=localToday();
 checkAvailability();
}
bookingFrom.addEventListener('change',onBookingDates);bookingTo.addEventListener('change',onBookingDates);bookingSize.addEventListener('change',checkAvailability);

// --- The request form -------------------------------------------------------------------------------
// Cloudflare Turnstile (free). The Worker tells the page the site key and whether the secret is set
// too; with either missing the form still works, and a warning aimed at the shop owner is shown in
// place of the widget so a half-configured deployment is noticed on the first visit.
let turnstileSiteKey=null,turnstileWidget=null,turnstileState=null;
function renderTurnstileWarning(){
 const warning=document.getElementById('turnstile-warning');
 if(!turnstileState||turnstileState.enabled){warning.hidden=true;warning.textContent='';return;}
 const missing=[!turnstileState.siteKeySet&&'TURNSTILE_SITE_KEY',!turnstileState.secretSet&&'TURNSTILE_SECRET_KEY'].filter(Boolean).join(', ');
 warning.textContent='⚠ '+bt('adminTurnstile').replace('{missing}',missing);
 warning.hidden=false;
}
async function loadTurnstile(){
 if(turnstileSiteKey===null){
  try{
   const response=await fetch('/api/reservation-requests/config',{cache:'no-cache'});
   const config=await response.json();
   turnstileSiteKey=config.turnstileSiteKey||'';
   turnstileState=config.turnstile||{enabled:Boolean(turnstileSiteKey),siteKeySet:Boolean(turnstileSiteKey),secretSet:Boolean(turnstileSiteKey)};
  }catch{turnstileSiteKey='';turnstileState=null;}
 }
 renderTurnstileWarning();
 const box=document.getElementById('turnstile');
 box.hidden=!turnstileSiteKey;
 if(!turnstileSiteKey)return;
 if(!window.turnstile){
  await new Promise(resolve=>{const s=document.createElement('script');s.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';s.async=true;s.onload=resolve;s.onerror=resolve;document.head.append(s);});
 }
 if(!window.turnstile)return;
 if(turnstileWidget!==null){window.turnstile.reset(turnstileWidget);return;}
 turnstileWidget=window.turnstile.render(box,{sitekey:turnstileSiteKey,language:language==='zh'?'zh-cn':language});
}
function openBookingForm(){
 const p=selected;if(!p||!booking.available)return;
 bookingError.textContent='';clearConsentError();
 bookingForm.hidden=false;bookingDone.hidden=true;bookingDone.dataset.id='';
 document.getElementById('booking-summary').innerHTML=`<b>${escapeMarkup(productName(p))}</b><span>${escapeMarkup(bt('from'))}: ${escapeMarkup(formatDate(booking.from))}</span><span>${escapeMarkup(bt('to'))}: ${escapeMarkup(formatDate(booking.to))}</span>${booking.size?`<span>${escapeMarkup(bt('size'))}: ${escapeMarkup(booking.size)}</span>`:''}`;
 refreshBookingText();
 if(!bookingDialog.open)bookingDialog.showModal();
 loadTurnstile();
 setTimeout(()=>bookingForm.elements.customer_name.focus(),50);
}
bookingOpen.addEventListener('click',openBookingForm);
bookingForm.addEventListener('change',e=>{if(['preferred_contact_channel','zalo_same','whatsapp_same'].includes(e.target.name))syncChannelFields();if(e.target.name==='privacy_consent'&&e.target.checked)clearConsentError();});
document.getElementById('close-booking').addEventListener('click',()=>bookingDialog.close());
bookingDialog.addEventListener('click',e=>{if(e.target===bookingDialog){const r=bookingDialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)bookingDialog.close();}});
function describeBookingError(data,status){
 const errors=bt('errors');
 if(data?.error&&errors[data.error])return errors[data.error];
 if(status===400&&data?.fields?.customer_phone)return errors.phone;
 return data?.message||errors[status?'validation_error':'network'];
}
function renderDone(result){
 const t=bookingCopy[language]||bookingCopy.vi;
 bookingDone.dataset.result=JSON.stringify(result);bookingDone.dataset.id=result.id||'';
 bookingDone.innerHTML=`<h2>${escapeMarkup(t.doneTitle)}</h2><p>${escapeMarkup(result.duplicate?t.doneDuplicate:t.doneSent)}</p><p class="booking-id"><span>${escapeMarkup(t.doneId)}</span><b>${escapeMarkup(result.id||'')}</b></p><p>${escapeMarkup(t.doneContact)}</p><p class="booking-terms">${escapeMarkup(t.doneNote)}</p><div class="booking-done-actions">${chatUrl()?`<a class="button chat" href="${escapeMarkup(chatUrl())}" target="_blank" rel="noopener noreferrer"><span>${escapeMarkup(t.doneMessenger)}</span><span>↗</span></a>`:''}<button type="button" class="text-link" id="booking-done-close">${escapeMarkup(t.close)}</button></div>`;
 document.getElementById('booking-done-close').addEventListener('click',()=>bookingDialog.close());
}
bookingForm.addEventListener('submit',async e=>{
 e.preventDefault();
 const p=selected;if(!p)return;
 const errors=bt('errors'),f=bookingForm.elements;
 const fail=(message,focus)=>{bookingError.textContent=message;focus?.focus?.();};
 const phonePattern=/^\+?[\d\s().-]{6,40}$/;
 const value=name=>(f[name]?.value||'').trim();
 // Only what the chosen channel needs is sent; hidden fields go out empty.
 const channel=chosenChannel();
 const body={customer_name:value('customer_name'),customer_phone:value('customer_phone'),preferred_contact_channel:channel,customer_zalo_phone:'',customer_whatsapp:'',customer_messenger_url:'',note:value('note')};
 if(!body.customer_name||!body.customer_phone)return fail(errors.required,body.customer_name?f.customer_phone:f.customer_name);
 if(!phonePattern.test(body.customer_phone))return fail(errors.phone,f.customer_phone);
 if(!BOOKING_CHANNELS.includes(channel))return fail(errors.channel,f.preferred_contact_channel?.[0]);
 if(channel==='zalo'){body.customer_zalo_phone=f.zalo_same.checked?body.customer_phone:value('customer_zalo_phone');if(!body.customer_zalo_phone)return fail(errors.zaloNumber,f.customer_zalo_phone);if(!phonePattern.test(body.customer_zalo_phone))return fail(errors.phone,f.customer_zalo_phone);}
 if(channel==='whatsapp'){body.customer_whatsapp=f.whatsapp_same.checked?body.customer_phone:value('customer_whatsapp');if(!body.customer_whatsapp)return fail(errors.whatsappNumber,f.customer_whatsapp);if(!phonePattern.test(body.customer_whatsapp))return fail(errors.phone,f.customer_whatsapp);}
 if(channel==='messenger')body.customer_messenger_url=value('customer_messenger_url');
 if(!f.privacy_consent.checked){document.getElementById('consent-row').classList.add('is-invalid');return fail(errors.consent,f.privacy_consent);}
 clearConsentError();
 Object.assign(body,{privacy_consent:true,privacy_consent_at:new Date().toISOString(),product_id:p.id,size:booking.size,start_date:booking.from,end_date:booking.to});
 if(turnstileSiteKey&&window.turnstile&&turnstileWidget!==null)body.turnstile_token=window.turnstile.getResponse(turnstileWidget)||'';
 const submit=document.getElementById('booking-submit');
 submit.disabled=true;submit.firstElementChild.textContent=bt('sending');bookingError.textContent='';
 try{
  const response=await fetch('/api/reservation-requests',{method:'POST',headers:{'content-type':'application/json','x-requested-with':'fetch'},body:JSON.stringify(body)});
  const data=await response.json().catch(()=>null);
  if(!response.ok){
   bookingError.textContent=describeBookingError(data,response.status);
   if(data?.error==='unavailable'){booking.available=false;renderBookingStatus('unavailable');}
   if(turnstileWidget!==null&&window.turnstile)window.turnstile.reset(turnstileWidget);
   return;
  }
  bookingForm.hidden=true;bookingDone.hidden=false;
  renderDone({...data.request,duplicate:Boolean(data.duplicate)});
  bookingForm.reset();
 }catch(error){console.warn('Booking request failed:',error);bookingError.textContent=errors.network;}
 finally{submit.disabled=false;submit.firstElementChild.textContent=bt('submit');}
});
// The product dialog closing takes the booking dialog with it.
document.getElementById('product-dialog').addEventListener('close',()=>{if(bookingDialog.open)bookingDialog.close();booking={productId:'',from:'',to:'',size:'',available:false,checkSeq:booking.checkSeq};bookingBlock.hidden=true;renderBookingStatus('');});
refreshBookingText();
