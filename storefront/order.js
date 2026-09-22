// Public orders for `type: sale` products (pre-order, pickup or delivery in a time slot). Inside the
// product dialog the customer picks options, add-ons and a quantity and sees the price; the order
// form then asks for the card message, how and when to receive it, and how to reach them. The order
// is only ever `pending`: staff confirm it in /admin/ and contact the customer. Everything the form
// offers (dates, slots, remaining capacity, stock, option labels) comes from /api/orders/config.
// Loaded last; uses the globals of app.js / catalog.js / gallery.js / booking.js.
const orderCopy={
 vi:{title:'Đặt hàng',quantity:'Số lượng',cta:'Đặt trước',ctaClosed:'Đã hết hạn đặt trước',ctaSoldOut:'Đã hết hàng',preorder:'Nhận đặt trước',remaining:'Còn {n}',soldOut:'Hết hàng',closed:'Đã đóng đặt trước',deadline:'Nhận đặt đến {date}',unit:'/ sản phẩm',total:'Tổng',
  formTitle:'Hoàn tất đơn đặt hàng',cardTitle:'Lời nhắn trên thiệp',cardHint:'Không bắt buộc · tối đa {n} ký tự',cardPlaceholder:'Viết lời nhắn của bạn (không bắt buộc)',noTemplate:'Tự viết',
  fulfillmentTitle:'Cách nhận hàng',pickup:'Nhận tại cửa hàng',pickupHint:'Đến lấy tại cửa hàng',delivery:'Giao tận nơi',deliveryHint:'Phí giao {fee}',deliveryFree:'Miễn phí giao',recipientName:'Tên người nhận',recipientPhone:'SĐT người nhận',address:'Địa chỉ giao',deliveryNote:'Ghi chú giao hàng',
  whenTitle:'Ngày & khung giờ',windowCampaign:'Nhận đặt trước cho {from} – {to}',windowRolling:'Chọn ngày nhận hàng',closedWindow:'Hiện chưa nhận đặt trước.',slotLeft:'còn {n}',slotFull:'hết chỗ',dayFull:'Hết chỗ',pickSlot:'Chọn khung giờ',
  customerTitle:'Thông tin liên hệ',name:'Họ tên',phone:'Số điện thoại',preferred:'Liên hệ qua',zaloNumber:'Số Zalo',whatsappNumber:'Số WhatsApp',messengerUrl:'Link Facebook / Messenger',note:'Ghi chú cho tiệm',submit:'Gửi đơn',sending:'Đang gửi…',
  terms:'Đây là yêu cầu đặt hàng, chưa phải đơn đã xác nhận. Cửa hàng sẽ liên hệ với bạn để xác nhận và hướng dẫn thanh toán.',
  channels:{zalo:'Zalo',whatsapp:'WhatsApp',messenger:'Messenger',phone:'Gọi điện'},channelHints:{zalo:'Nhắn qua Zalo',whatsapp:'Nhắn qua WhatsApp',messenger:'Facebook / Messenger',phone:'Tiệm sẽ gọi cho bạn'},sameAsPhone:'Giống số điện thoại',optional:'Không bắt buộc',
  consent:'Tôi đồng ý với {policy} và việc xử lý thông tin (họ tên, số điện thoại, địa chỉ giao, lời nhắn) để phục vụ đơn hàng.',policy:'Chính sách bảo mật',
  doneTitle:'Cảm ơn bạn',doneSent:'Đơn đặt hàng đã được gửi.',doneId:'Mã đơn',doneContact:'Cửa hàng sẽ liên hệ để xác nhận trong thời gian sớm nhất.',doneNote:'Đơn chỉ được xác nhận sau khi cửa hàng liên hệ với bạn.',doneDuplicate:'Đơn này đã được gửi trước đó, cửa hàng sẽ sớm liên hệ với bạn.',doneMessenger:'Nhắn tin cho cửa hàng',close:'Đóng',
  adminTurnstile:'Dành cho quản trị viên: Cloudflare Turnstile chưa được cấu hình ({missing}). Biểu mẫu vẫn hoạt động nhưng chưa có bảo vệ chống spam.',
  errors:{required:'Vui lòng nhập họ tên và số điện thoại.',channel:'Vui lòng chọn cách liên hệ.',zaloNumber:'Vui lòng nhập số Zalo hoặc chọn "Giống số điện thoại".',whatsappNumber:'Vui lòng nhập số WhatsApp hoặc chọn "Giống số điện thoại".',consent:'Vui lòng đồng ý với Chính sách bảo mật để gửi đơn.',phone:'Số điện thoại chưa đúng.',recipient:'Vui lòng nhập tên, số điện thoại và địa chỉ người nhận.',date:'Vui lòng chọn ngày nhận hoa.',slot:'Vui lòng chọn khung giờ.',capacity_full:'Khung giờ này vừa hết chỗ. Bạn chọn khung giờ khác nhé.',sold_out:'Rất tiếc, mẫu này vừa hết hàng.',deadline_passed:'Đã hết hạn đặt trước.',too_many_requests:'Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau hoặc nhắn tin cho tiệm.',turnstile_required:'Vui lòng hoàn tất bước xác minh.',turnstile_failed:'Xác minh không thành công, vui lòng thử lại.',turnstile_unavailable:'Không xác minh được lúc này, vui lòng thử lại sau.',validation_error:'Vui lòng kiểm tra lại thông tin.',network:'Không gửi được. Vui lòng kiểm tra kết nối và thử lại.'}},
 en:{title:'Order',quantity:'Quantity',cta:'Pre-order',ctaClosed:'Pre-orders closed',ctaSoldOut:'Sold out',preorder:'Pre-order',remaining:'{n} left',soldOut:'Sold out',closed:'Pre-orders closed',deadline:'Order by {date}',unit:'/ item',total:'Total',
  formTitle:'Complete your order',cardTitle:'Card message',cardHint:'Optional · up to {n} characters',cardPlaceholder:'Write your message (optional)',noTemplate:'Write my own',
  fulfillmentTitle:'How to receive it',pickup:'Pick up at the shop',pickupHint:'Collect in store',delivery:'Delivery',deliveryHint:'Delivery fee {fee}',deliveryFree:'Free delivery',recipientName:'Recipient name',recipientPhone:'Recipient phone',address:'Delivery address',deliveryNote:'Delivery note',
  whenTitle:'Date & time slot',windowCampaign:'Pre-orders for {from} – {to}',windowRolling:'Choose a day',closedWindow:'Pre-orders are not open right now.',slotLeft:'{n} left',slotFull:'full',dayFull:'Full',pickSlot:'Choose a time slot',
  customerTitle:'Your contact',name:'Full name',phone:'Phone number',preferred:'Contact me via',zaloNumber:'Zalo number',whatsappNumber:'WhatsApp number',messengerUrl:'Facebook / Messenger link',note:'Note for the shop',submit:'Send order',sending:'Sending…',
  terms:'This is an order request, not a confirmed order. The shop will contact you to confirm and explain payment.',
  channels:{zalo:'Zalo',whatsapp:'WhatsApp',messenger:'Messenger',phone:'Phone call'},channelHints:{zalo:'Message on Zalo',whatsapp:'Message on WhatsApp',messenger:'Facebook / Messenger',phone:'The shop will call you'},sameAsPhone:'Same as my phone number',optional:'Optional',
  consent:'I agree to the {policy} and to my details (name, phone, delivery address, card message) being used to handle this order.',policy:'Privacy policy',
  doneTitle:'Thank you 🌷',doneSent:'Your order has been sent.',doneId:'Order ID',doneContact:'The shop will contact you shortly to confirm.',doneNote:'An order is confirmed only once the shop has contacted you.',doneDuplicate:'This order was already sent; the shop will be in touch soon.',doneMessenger:'Message the shop',close:'Close',
  adminTurnstile:'For the store admin: Cloudflare Turnstile is not configured ({missing}). The form still works but has no spam protection.',
  errors:{required:'Please enter your name and phone number.',channel:'Please choose how we should contact you.',zaloNumber:'Please enter your Zalo number or tick "Same as my phone number".',whatsappNumber:'Please enter your WhatsApp number or tick "Same as my phone number".',consent:'Please accept the privacy policy to send the order.',phone:'That phone number does not look right.',recipient:'Please enter the recipient\'s name, phone and address.',date:'Please choose a day.',slot:'Please choose a time slot.',capacity_full:'That time slot just filled up. Please pick another one.',sold_out:'Sorry, this design just sold out.',deadline_passed:'Pre-orders are closed.',too_many_requests:'Too many requests. Please try again later or message the shop.',turnstile_required:'Please complete the verification.',turnstile_failed:'Verification failed, please try again.',turnstile_unavailable:'Verification is unavailable right now, please try again later.',validation_error:'Please check the details.',network:'Could not send. Check your connection and try again.'}},
 ja:{title:'注文',quantity:'数量',cta:'予約注文する',ctaClosed:'受付終了',ctaSoldOut:'売り切れ',preorder:'予約受付中',remaining:'残り {n}',soldOut:'売り切れ',closed:'受付終了',deadline:'{date} まで受付',unit:'/ 点',total:'合計',
  formTitle:'注文内容の入力',cardTitle:'カードメッセージ',cardHint:'任意 · {n} 文字まで',cardPlaceholder:'メッセージを入力(任意)',noTemplate:'自分で書く',
  fulfillmentTitle:'受け取り方法',pickup:'店頭受取',pickupHint:'お店で受け取り',delivery:'配送',deliveryHint:'配送料 {fee}',deliveryFree:'配送無料',recipientName:'受取人のお名前',recipientPhone:'受取人の電話番号',address:'配送先住所',deliveryNote:'配送メモ',
  whenTitle:'日付と時間帯',windowCampaign:'{from} – {to} の予約受付中',windowRolling:'受取日を選択',closedWindow:'現在は予約を受け付けていません。',slotLeft:'残り {n}',slotFull:'満枠',dayFull:'満枠',pickSlot:'時間帯を選択',
  customerTitle:'ご連絡先',name:'お名前',phone:'電話番号',preferred:'ご希望の連絡方法',zaloNumber:'Zalo番号',whatsappNumber:'WhatsApp番号',messengerUrl:'Facebook / Messenger のリンク',note:'お店へのメモ',submit:'注文を送る',sending:'送信中…',
  terms:'これは注文申請であり、確定した注文ではありません。お店から確認とお支払い方法のご連絡をします。',
  channels:{zalo:'Zalo',whatsapp:'WhatsApp',messenger:'Messenger',phone:'電話'},channelHints:{zalo:'Zaloで連絡',whatsapp:'WhatsAppで連絡',messenger:'Facebook / Messenger',phone:'お店から電話します'},sameAsPhone:'電話番号と同じ',optional:'任意',
  consent:'{policy}と、注文対応のために個人情報（氏名・電話番号・配送先・メッセージ）を利用することに同意します。',policy:'プライバシーポリシー',
  doneTitle:'ありがとうございます 🌷',doneSent:'注文を送信しました。',doneId:'注文番号',doneContact:'お店からまもなく確認のご連絡をします。',doneNote:'注文はお店からの確認連絡をもって確定します。',doneDuplicate:'この注文はすでに送信されています。お店からまもなくご連絡します。',doneMessenger:'お店にメッセージ',close:'閉じる',
  adminTurnstile:'管理者向け: Cloudflare Turnstile が未設定です（{missing}）。フォームは動作しますがスパム対策がありません。',
  errors:{required:'お名前と電話番号を入力してください。',channel:'連絡方法を選択してください。',zaloNumber:'Zalo番号を入力するか「電話番号と同じ」にチェックしてください。',whatsappNumber:'WhatsApp番号を入力するか「電話番号と同じ」にチェックしてください。',consent:'送信にはプライバシーポリシーへの同意が必要です。',phone:'電話番号の形式を確認してください。',recipient:'受取人のお名前・電話番号・住所を入力してください。',date:'受取日を選択してください。',slot:'時間帯を選択してください。',capacity_full:'この時間帯は直前に満枠になりました。別の時間帯をお選びください。',sold_out:'申し訳ありません。この商品は売り切れました。',deadline_passed:'予約受付は終了しました。',too_many_requests:'送信回数が多すぎます。しばらくしてから再度お試しください。',turnstile_required:'認証を完了してください。',turnstile_failed:'認証に失敗しました。もう一度お試しください。',turnstile_unavailable:'現在認証できません。しばらくしてからお試しください。',validation_error:'入力内容を確認してください。',network:'送信できませんでした。通信環境を確認して再度お試しください。'}},
 zh:{title:'订购',quantity:'数量',cta:'预订',ctaClosed:'预订已截止',ctaSoldOut:'已售罄',preorder:'接受预订',remaining:'剩余 {n}',soldOut:'已售罄',closed:'预订已截止',deadline:'预订截止 {date}',unit:'/ 件',total:'合计',
  formTitle:'填写订单',cardTitle:'卡片留言',cardHint:'选填 · 最多 {n} 字',cardPlaceholder:'填写留言(选填)',noTemplate:'自己写',
  fulfillmentTitle:'收花方式',pickup:'到店自取',pickupHint:'到店领取',delivery:'配送到家',deliveryHint:'配送费 {fee}',deliveryFree:'免费配送',recipientName:'收件人姓名',recipientPhone:'收件人电话',address:'配送地址',deliveryNote:'配送备注',
  whenTitle:'日期与时段',windowCampaign:'接受 {from} – {to} 的预订',windowRolling:'选择日期',closedWindow:'目前未开放预订。',slotLeft:'剩余 {n}',slotFull:'已满',dayFull:'已满',pickSlot:'选择时段',
  customerTitle:'联系方式',name:'姓名',phone:'电话号码',preferred:'联系方式',zaloNumber:'Zalo 号码',whatsappNumber:'WhatsApp 号码',messengerUrl:'Facebook / Messenger 链接',note:'给店铺的备注',submit:'发送订单',sending:'发送中…',
  terms:'这是订单申请，并非已确认的订单。店铺将与您联系确认并说明付款方式。',
  channels:{zalo:'Zalo',whatsapp:'WhatsApp',messenger:'Messenger',phone:'电话'},channelHints:{zalo:'通过 Zalo 联系',whatsapp:'通过 WhatsApp 联系',messenger:'Facebook / Messenger',phone:'店铺将致电您'},sameAsPhone:'与电话号码相同',optional:'选填',
  consent:'我同意{policy}，并同意为处理本订单使用我的信息（姓名、电话、配送地址、留言）。',policy:'隐私政策',
  doneTitle:'感谢您 🌷',doneSent:'订单已发送。',doneId:'订单编号',doneContact:'店铺将尽快与您联系确认。',doneNote:'订单仅在店铺联系确认后生效。',doneDuplicate:'该订单此前已发送，店铺会尽快联系您。',doneMessenger:'联系店铺',close:'关闭',
  adminTurnstile:'管理员提示：Cloudflare Turnstile 尚未配置（{missing}）。表单可以使用，但没有防垃圾保护。',
  errors:{required:'请填写姓名和电话号码。',channel:'请选择联系方式。',zaloNumber:'请填写 Zalo 号码或勾选“与电话号码相同”。',whatsappNumber:'请填写 WhatsApp 号码或勾选“与电话号码相同”。',consent:'请先同意隐私政策再发送订单。',phone:'电话号码格式不正确。',recipient:'请填写收件人姓名、电话和地址。',date:'请选择日期。',slot:'请选择时段。',capacity_full:'该时段刚刚约满，请选择其他时段。',sold_out:'很抱歉，该款式刚刚售罄。',deadline_passed:'预订已截止。',too_many_requests:'申请过于频繁，请稍后再试或联系店铺。',turnstile_required:'请完成验证。',turnstile_failed:'验证失败，请重试。',turnstile_unavailable:'暂时无法验证，请稍后再试。',validation_error:'请检查填写的信息。',network:'发送失败，请检查网络后重试。'}}
};
const ORDER_CHANNELS=['zalo','whatsapp','messenger','phone'];
const ot=key=>orderCopy[language]?.[key]??orderCopy.en[key]??orderCopy.vi[key];
const fill=(text,values)=>String(text).replace(/\{(\w+)\}/g,(m,k)=>k in values?values[k]:m);
const orderBlock=document.getElementById('dialog-order'),orderOpen=document.getElementById('order-open'),orderQty=document.getElementById('order-qty');
const orderDialog=document.getElementById('order-dialog'),orderForm=document.getElementById('order-form'),orderDone=document.getElementById('order-done'),orderError=document.getElementById('order-error');
// What the form offers, from /api/orders/config. null until loaded; refreshed when the form opens.
let orderConfig=null,orderConfigLoading=null;
// The customer's current choice for the open product.
let order={productId:'',options:{},addons:[],quantity:1,fulfillment:'',date:'',slot:''};
const isSaleProduct=p=>Boolean(p&&p.type==='sale');

async function loadOrderConfig({force=false}={}){
 if(orderConfig&&!force)return orderConfig;
 if(orderConfigLoading&&!force)return orderConfigLoading;
 orderConfigLoading=(async()=>{
  try{
   const response=await fetch('/api/orders/config',{cache:'no-cache'});
   if(!response.ok)throw new Error(`HTTP ${response.status}`);
   const data=await response.json();
   if(!data||typeof data!=='object'||!data.dates)throw new Error('Invalid order config');
   orderConfig=data;
  }catch(error){console.warn('Order config unavailable:',error);if(!orderConfig)orderConfig=null;}
  orderConfigLoading=null;
  renderProducts();if(selected)updateProductDetail();
  return orderConfig;
 })();
 return orderConfigLoading;
}
// --- Labels and prices ---------------------------------------------------------------------------------
const groupLabel=group=>localizedText(orderConfig?.options?.[group]?.label)||group;
const choiceLabel=(group,id)=>localizedText(orderConfig?.options?.[group]?.choices?.[id]?.label)||id;
const addonLabel=id=>localizedText(orderConfig?.addons?.[id]?.label)||id;
function choicePrice(p,group,id){
 const own=(p.options?.[group]||[]).find(c=>c.id===id);
 if(typeof own?.price==='number')return own.price;
 const configured=orderConfig?.options?.[group]?.choices?.[id]?.price;
 return typeof configured==='number'?configured:0;
}
function addonPrice(p,id){
 const own=(p.addons||[]).find(a=>a.id===id);
 if(typeof own?.price==='number')return own.price;
 const configured=orderConfig?.addons?.[id]?.price;
 return typeof configured==='number'?configured:0;
}
function unitPrice(p){
 let price=p.price?.sale??0;
 for(const group of Object.keys(p.options||{}))price+=choicePrice(p,group,order.options[group]||p.options[group][0]?.id);
 for(const id of order.addons)price+=addonPrice(p,id);
 return Math.max(0,price);
}
const deliveryFee=()=>orderConfig?.fulfillment?.deliveryFee||0;
const orderTotal=p=>unitPrice(p)*order.quantity+(order.fulfillment==='delivery'?deliveryFee():0);
const money=amount=>formatPrice(amount,selected?.currency||orderConfig?.currency);
const signed=amount=>amount>0?`+${money(amount)}`:amount<0?`−${money(-amount)}`:'';
// --- Availability shown on cards and in the dialog (catalog.js calls these for sale products) --------
// Only real limits are shown: a product without `ordering.stock` never says "N left".
function saleStatus(p){
 const info=orderConfig?.products?.[p.id];
 if(!orderConfig)return {code:'unknown'};
 if(orderConfig.deadlinePassed||info?.deadlinePassed||!orderConfig.dates?.open)return {code:'closed'};
 if(!info||info.preorder===false)return {code:'unknown'};
 if(info.soldOut)return {code:'soldOut'};
 if(info.stock!==null&&info.remaining<=5)return {code:'low',remaining:info.remaining};
 return {code:'preorder'};
}
function saleLabel(p){
 const s=saleStatus(p);
 if(s.code==='closed')return ot('closed');
 if(s.code==='soldOut')return ot('soldOut');
 if(s.code==='low')return fill(ot('remaining'),{n:s.remaining});
 if(s.code==='preorder'){const deadline=orderConfig?.deadline;return deadline?`${ot('preorder')} · ${fill(ot('deadline'),{date:formatDate(deadline.slice(0,10))})}`:ot('preorder');}
 return catalogCopy[language].unknown;
}
const saleClass=p=>({closed:' unavailable',soldOut:' unavailable',low:' status-low'}[saleStatus(p).code]||'');
// --- The block inside the product dialog --------------------------------------------------------------
function refreshOrderText(){
 document.querySelectorAll('[data-order-i18n]').forEach(el=>{el.textContent=ot(el.dataset.orderI18n);});
 document.getElementById('close-order').setAttribute('aria-label',ot('close'));
 const [before,after]=ot('consent').split('{policy}');
 document.getElementById('order-consent-text').innerHTML=`${escapeMarkup(before)}<a href="/privacy?lang=${encodeURIComponent(language)}" target="_blank" rel="noopener noreferrer">${escapeMarkup(ot('policy'))}</a>${escapeMarkup(after??'')}`;
 if(selected&&isSaleProduct(selected))renderOrderBlock();
 if(orderDialog.open&&!orderForm.hidden)renderOrderForm();
 renderOrderTurnstileWarning();
 if(!orderDone.hidden&&orderDone.dataset.id)renderOrderDone(JSON.parse(orderDone.dataset.result||'{}'));
}
// Called by catalog.js whenever the product dialog (re)renders its details.
function updateOrderBlock(){
 const p=selected,sale=isSaleProduct(p);
 orderBlock.hidden=!sale;
 if(!sale)return;
 if(order.productId!==p.id){
  order={productId:p.id,options:{},addons:[],quantity:1,fulfillment:'',date:'',slot:''};
  for(const [group,choices] of Object.entries(p.options||{}))order.options[group]=choices[0]?.id||'';
 }
 loadOrderConfig();
 renderOrderBlock();
}
function renderOrderBlock(){
 const p=selected;if(!p)return;
 const chip=(name,value,label,price,checked,type='radio')=>`<label class="chip${checked?' is-selected':''}"><input type="${type}" name="${escapeMarkup(name)}" value="${escapeMarkup(value)}" class="sr-only"${checked?' checked':''}><span>${escapeMarkup(label)}</span>${price?`<small>${escapeMarkup(price)}</small>`:''}</label>`;
 document.getElementById('order-options').innerHTML=Object.entries(p.options||{}).map(([group,choices])=>`<div class="option-group" data-group="${escapeMarkup(group)}"><span class="option-label">${escapeMarkup(groupLabel(group))}</span><div class="chips">${choices.map(c=>chip(`opt-${group}`,c.id,choiceLabel(group,c.id),signed(choicePrice(p,group,c.id)),order.options[group]===c.id)).join('')}</div></div>`).join('');
 document.getElementById('order-addons').innerHTML=(p.addons||[]).length?`<div class="option-group"><span class="option-label">Add-on</span><div class="chips">${p.addons.map(a=>chip('addon',a.id,addonLabel(a.id),signed(addonPrice(p,a.id)),order.addons.includes(a.id),'checkbox')).join('')}</div></div>`:'';
 orderQty.value=String(order.quantity);
 document.getElementById('order-total').innerHTML=`<span>${escapeMarkup(money(unitPrice(p)))} <small>${escapeMarkup(ot('unit'))}</small></span><b>${escapeMarkup(ot('total'))}: ${escapeMarkup(money(unitPrice(p)*order.quantity))}</b>`;
 const status=saleStatus(p),statusEl=document.getElementById('order-status');
 statusEl.textContent=orderConfig?saleLabel(p):'';
 statusEl.className='order-status'+(status.code==='closed'||status.code==='soldOut'?' is-unavailable':status.code==='low'?' is-low':'');
 const can=orderConfig&&['preorder','low'].includes(status.code)&&!(status.code==='low'&&status.remaining<order.quantity);
 orderOpen.disabled=!can;
 orderOpen.firstElementChild.textContent=status.code==='closed'?ot('ctaClosed'):status.code==='soldOut'?ot('ctaSoldOut'):ot('cta');
}
document.getElementById('order-options').addEventListener('change',e=>{const group=e.target.closest('[data-group]')?.dataset.group;if(group){order.options[group]=e.target.value;renderOrderBlock();}});
document.getElementById('order-addons').addEventListener('change',e=>{if(e.target.name==='addon'){order.addons=e.target.checked?[...new Set([...order.addons,e.target.value])]:order.addons.filter(id=>id!==e.target.value);renderOrderBlock();}});
function setQuantity(next){order.quantity=Math.min(20,Math.max(1,Number.parseInt(next,10)||1));renderOrderBlock();}
document.getElementById('qty-minus').addEventListener('click',()=>setQuantity(order.quantity-1));
document.getElementById('qty-plus').addEventListener('click',()=>setQuantity(order.quantity+1));
orderQty.addEventListener('change',()=>setQuantity(orderQty.value));

// --- The order form ------------------------------------------------------------------------------------
let orderTurnstileWidget=null;
function renderOrderTurnstileWarning(){
 const warning=document.getElementById('order-turnstile-warning'),state=orderConfig?.turnstile;
 if(!state||state.enabled){warning.hidden=true;warning.textContent='';return;}
 const missing=[!state.siteKeySet&&'TURNSTILE_SITE_KEY',!state.secretSet&&'TURNSTILE_SECRET_KEY'].filter(Boolean).join(', ');
 warning.textContent='⚠ '+fill(ot('adminTurnstile'),{missing});warning.hidden=false;
}
async function loadOrderTurnstile(){
 const box=document.getElementById('order-turnstile'),siteKey=orderConfig?.turnstileSiteKey||'';
 renderOrderTurnstileWarning();
 box.hidden=!siteKey;
 if(!siteKey)return;
 if(!window.turnstile)await new Promise(resolve=>{const s=document.createElement('script');s.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';s.async=true;s.onload=resolve;s.onerror=resolve;document.head.append(s);});
 if(!window.turnstile)return;
 if(orderTurnstileWidget!==null){window.turnstile.reset(orderTurnstileWidget);return;}
 orderTurnstileWidget=window.turnstile.render(box,{sitekey:siteKey,language:language==='zh'?'zh-cn':language});
}
const chosenOrderChannel=()=>orderForm.elements.preferred_contact_channel?.value||'';
function syncOrderChannelFields(){
 const chosen=chosenOrderChannel();
 orderForm.querySelectorAll('#order-channels .channel-card').forEach(card=>card.classList.toggle('is-selected',card.querySelector('input').checked));
 orderForm.querySelectorAll('[data-channel-field]').forEach(el=>{
  el.hidden=el.dataset.channelField!==chosen;
  const same=el.querySelector('input[type=checkbox]'),number=el.querySelector('.channel-number');
  if(same&&number){number.hidden=same.checked;number.querySelector('input').disabled=same.checked;}
 });
}
function syncFulfillment(){
 const type=orderForm.elements.fulfillment_type?.value||'';
 order.fulfillment=type;
 orderForm.querySelectorAll('#fulfillment-cards .channel-card').forEach(card=>card.classList.toggle('is-selected',card.querySelector('input').checked));
 const fields=document.getElementById('delivery-fields');
 fields.hidden=type!=='delivery';
 fields.querySelectorAll('input').forEach(input=>{input.disabled=type!=='delivery';});
 renderOrderSummary();
}
function renderOrderSummary(){
 const p=selected;if(!p)return;
 const parts=[...Object.entries(order.options).map(([g,id])=>choiceLabel(g,id)),...order.addons.map(addonLabel)].filter(Boolean);
 document.getElementById('order-summary').innerHTML=`<b>${escapeMarkup(productName(p))}</b><span>${escapeMarkup(parts.join(' · '))}${parts.length?' · ':''}×${order.quantity}</span><span>${escapeMarkup(ot('total'))}: ${escapeMarkup(money(orderTotal(p)))}${order.fulfillment==='delivery'&&deliveryFee()?` <small>(${escapeMarkup(ot('delivery'))} ${escapeMarkup(money(deliveryFee()))})</small>`:''}</span>`;
 document.getElementById('order-submit-total').textContent=money(orderTotal(p));
}
function renderDateChips(){
 const c=orderConfig,box=document.getElementById('date-chips'),windowEl=document.getElementById('order-window');
 const dates=c?.dates?.list||[];
 windowEl.textContent=!c||!dates.length?ot('closedWindow'):c.dates.campaign?fill(ot('windowCampaign'),{from:formatDate(c.dates.from),to:formatDate(c.dates.to)}):ot('windowRolling');
 if(!dates.includes(order.date))order.date=dates.find(d=>c.capacity?.[d]?.open!==false)||'';
 box.innerHTML=dates.map(d=>{const open=c.capacity?.[d]?.open!==false;return `<label class="chip date-chip${order.date===d?' is-selected':''}${open?'':' is-full'}"><input type="radio" name="fulfillment_date" value="${d}" class="sr-only"${order.date===d?' checked':''}${open?'':' disabled'}><span>${escapeMarkup(formatDate(d))}</span>${open?'':`<small>${escapeMarkup(ot('dayFull'))}</small>`}</label>`;}).join('');
 renderSlotChips();
}
function renderSlotChips(){
 const c=orderConfig,box=document.getElementById('slot-chips');
 const slots=c?.timeSlots||[],day=c?.capacity?.[order.date];
 if(!slots.length||!order.date){box.innerHTML='';order.slot='';return;}
 const state=id=>day?.slots?.[id]||{open:true,capacity:null,remaining:null};
 if(!slots.some(s=>s.id===order.slot&&state(s.id).open))order.slot='';
 box.innerHTML=`<span class="option-label">${escapeMarkup(ot('pickSlot'))}</span><div class="chips">`+slots.map(s=>{const st=state(s.id);const label=localizedText(s.label)||`${s.start}–${s.end}`;return `<label class="chip slot-chip${order.slot===s.id?' is-selected':''}${st.open?'':' is-full'}"><input type="radio" name="time_slot" value="${escapeMarkup(s.id)}" class="sr-only"${order.slot===s.id?' checked':''}${st.open?'':' disabled'}><span>${escapeMarkup(label)}</span>${!st.open?`<small>${escapeMarkup(ot('slotFull'))}</small>`:st.capacity!==null?`<small>${escapeMarkup(fill(ot('slotLeft'),{n:st.remaining}))}</small>`:''}</label>`;}).join('')+'</div>';
}
function renderOrderForm(){
 const p=selected,c=orderConfig;if(!p)return;
 // 1. Card message: templates as chips, free text underneath.
 const card=c?.messageCard||{enabled:true,maxLength:200,templates:[]};
 document.getElementById('order-card-section').hidden=card.enabled===false;
 const textarea=orderForm.elements.message_card;
 textarea.maxLength=card.maxLength||200;textarea.placeholder=localizedText(card.placeholder)||ot('cardPlaceholder');
 document.getElementById('card-templates').innerHTML=(card.templates||[]).map(t=>`<button type="button" class="chip" data-template="${escapeMarkup(t.id)}"><span>${escapeMarkup(localizedText(t.label))}</span></button>`).join('');
 document.getElementById('card-counter').textContent=`${textarea.value.length} / ${textarea.maxLength} · ${fill(ot('cardHint'),{n:textarea.maxLength})}`;
 // 2. Fulfillment cards, only the ways both the store and the product offer.
 const offered=['pickup','delivery'].filter(type=>c?.fulfillment?.[type]!==false&&p.fulfillment?.[type]!==false);
 if(!offered.includes(order.fulfillment))order.fulfillment=offered[0]||'';
 const fee=deliveryFee();
 const hints={pickup:ot('pickupHint'),delivery:fee?fill(ot('deliveryHint'),{fee:money(fee)}):ot('deliveryFree')};
 document.getElementById('fulfillment-cards').innerHTML=offered.map(type=>`<label class="channel-card${order.fulfillment===type?' is-selected':''}" for="fulfillment-${type}"><input type="radio" id="fulfillment-${type}" name="fulfillment_type" value="${type}" class="sr-only"${order.fulfillment===type?' checked':''}><span class="channel-mark" aria-hidden="true"></span><span class="channel-name">${escapeMarkup(ot(type))}</span><span class="channel-hint">${escapeMarkup(hints[type])}</span></label>`).join('');
 const note=localizedText(c?.fulfillment?.deliveryNote);document.getElementById('delivery-note-text').textContent=note;document.getElementById('delivery-note-text').hidden=!note;
 syncFulfillment();
 // 3. Dates and slots. 4. Contact channels (same cards as the booking form).
 renderDateChips();
 const current=chosenOrderChannel()||'zalo';
 document.getElementById('order-channels').innerHTML=ORDER_CHANNELS.map(ch=>`<label class="channel-card" for="order-channel-${ch}"><input type="radio" id="order-channel-${ch}" name="preferred_contact_channel" value="${ch}" class="sr-only"${ch===current?' checked':''}><span class="channel-mark" aria-hidden="true"></span><span class="channel-name">${escapeMarkup(ot('channels')[ch])}</span><span class="channel-hint">${escapeMarkup(ot('channelHints')[ch])}</span></label>`).join('');
 syncOrderChannelFields();
 renderOrderSummary();
}
async function openOrderForm(){
 const p=selected;if(!p||orderOpen.disabled)return;
 orderError.textContent='';document.getElementById('order-consent-row').classList.remove('is-invalid');
 orderForm.hidden=false;orderDone.hidden=true;orderDone.dataset.id='';
 refreshOrderText();renderOrderForm();
 if(!orderDialog.open)orderDialog.showModal();
 // Fresh capacity every time the form opens, then the chips are redrawn with it.
 loadOrderConfig({force:true}).then(()=>{if(orderDialog.open){renderDateChips();renderOrderBlock();}loadOrderTurnstile();});
 setTimeout(()=>orderForm.elements.message_card?.focus(),50);
}
orderOpen.addEventListener('click',openOrderForm);
orderForm.addEventListener('change',e=>{
 const name=e.target.name;
 if(name==='fulfillment_type')syncFulfillment();
 if(['preferred_contact_channel','zalo_same','whatsapp_same'].includes(name))syncOrderChannelFields();
 if(name==='fulfillment_date'){order.date=e.target.value;renderDateChips();}
 if(name==='time_slot'){order.slot=e.target.value;renderSlotChips();}
 if(name==='privacy_consent'&&e.target.checked)document.getElementById('order-consent-row').classList.remove('is-invalid');
});
orderForm.addEventListener('input',e=>{if(e.target.name==='message_card'){const ta=e.target;document.getElementById('card-counter').textContent=`${ta.value.length} / ${ta.maxLength} · ${fill(ot('cardHint'),{n:ta.maxLength})}`;}});
document.getElementById('card-templates').addEventListener('click',e=>{
 const button=e.target.closest('[data-template]');if(!button)return;
 const template=(orderConfig?.messageCard?.templates||[]).find(t=>t.id===button.dataset.template);
 if(template){orderForm.elements.message_card.value=localizedText(template.text);orderForm.elements.message_card.dispatchEvent(new Event('input',{bubbles:true}));}
 document.querySelectorAll('#card-templates .chip').forEach(chip=>chip.classList.toggle('is-selected',chip===button));
});
document.getElementById('close-order').addEventListener('click',()=>orderDialog.close());
orderDialog.addEventListener('click',e=>{if(e.target===orderDialog){const r=orderDialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)orderDialog.close();}});
function describeOrderError(data,status){
 const errors=ot('errors');
 if(data?.error&&errors[data.error])return errors[data.error];
 if(status===400&&data?.fields){
  const f=data.fields;
  if(f.customer_phone)return errors.phone;
  if(f.recipient_name||f.recipient_phone||f.delivery_address)return errors.recipient;
  if(f.fulfillment_date)return errors.date;
  if(f.time_slot)return errors.slot;
 }
 return data?.message||errors[status?'validation_error':'network'];
}
function renderOrderDone(result){
 orderDone.dataset.result=JSON.stringify(result);orderDone.dataset.id=result.id||'';
 const when=[result.fulfillment_date?formatDate(result.fulfillment_date):'',(orderConfig?.timeSlots||[]).filter(s=>s.id===result.time_slot).map(s=>localizedText(s.label)||`${s.start}–${s.end}`)[0]||''].filter(Boolean).join(' · ');
 orderDone.innerHTML=`<h2>${escapeMarkup(ot('doneTitle'))}</h2><p>${escapeMarkup(result.duplicate?ot('doneDuplicate'):ot('doneSent'))}</p><p class="booking-id"><span>${escapeMarkup(ot('doneId'))}</span><b>${escapeMarkup(result.id||'')}</b><small>${escapeMarkup(result.fulfillment_type?ot(result.fulfillment_type):'')}${when?' · '+escapeMarkup(when):''}${typeof result.total==='number'?' · '+escapeMarkup(money(result.total)):''}</small></p><p>${escapeMarkup(ot('doneContact'))}</p><p class="booking-terms">${escapeMarkup(ot('doneNote'))}</p><div class="booking-done-actions">${chatUrl()?`<a class="button chat" href="${escapeMarkup(chatUrl())}" target="_blank" rel="noopener noreferrer"><span>${escapeMarkup(ot('doneMessenger'))}</span><span>↗</span></a>`:''}<button type="button" class="text-link" id="order-done-close">${escapeMarkup(ot('close'))}</button></div>`;
 document.getElementById('order-done-close').addEventListener('click',()=>orderDialog.close());
}
orderForm.addEventListener('submit',async e=>{
 e.preventDefault();
 const p=selected;if(!p)return;
 const errors=ot('errors'),f=orderForm.elements;
 const fail=(message,focus)=>{orderError.textContent=message;focus?.focus?.();focus?.scrollIntoView?.({block:'center'});};
 const phonePattern=/^\+?[\d\s().-]{6,40}$/;
 const value=name=>(f[name]?.value||'').trim();
 const channel=chosenOrderChannel();
 const body={product_id:p.id,quantity:order.quantity,options:{...order.options},addons:[...order.addons],fulfillment_type:order.fulfillment,fulfillment_date:order.date,time_slot:order.slot,
  message_card:value('message_card'),note:value('note'),customer_name:value('customer_name'),customer_phone:value('customer_phone'),preferred_contact_channel:channel,customer_zalo_phone:'',customer_whatsapp:'',customer_messenger_url:''};
 if(order.fulfillment==='delivery'){
  Object.assign(body,{recipient_name:value('recipient_name'),recipient_phone:value('recipient_phone'),delivery_address:value('delivery_address'),delivery_note:value('delivery_note')});
  if(!body.recipient_name||!body.recipient_phone||!body.delivery_address)return fail(errors.recipient,!body.recipient_name?f.recipient_name:!body.recipient_phone?f.recipient_phone:f.delivery_address);
  if(!phonePattern.test(body.recipient_phone))return fail(errors.phone,f.recipient_phone);
 }
 if(!order.date)return fail(errors.date,document.getElementById('date-chips'));
 if((orderConfig?.timeSlots||[]).length&&!order.slot)return fail(errors.slot,document.getElementById('slot-chips'));
 if(!body.customer_name||!body.customer_phone)return fail(errors.required,body.customer_name?f.customer_phone:f.customer_name);
 if(!phonePattern.test(body.customer_phone))return fail(errors.phone,f.customer_phone);
 if(!ORDER_CHANNELS.includes(channel))return fail(errors.channel,f.preferred_contact_channel?.[0]);
 if(channel==='zalo'){body.customer_zalo_phone=f.zalo_same.checked?body.customer_phone:value('customer_zalo_phone');if(!body.customer_zalo_phone)return fail(errors.zaloNumber,f.customer_zalo_phone);if(!phonePattern.test(body.customer_zalo_phone))return fail(errors.phone,f.customer_zalo_phone);}
 if(channel==='whatsapp'){body.customer_whatsapp=f.whatsapp_same.checked?body.customer_phone:value('customer_whatsapp');if(!body.customer_whatsapp)return fail(errors.whatsappNumber,f.customer_whatsapp);if(!phonePattern.test(body.customer_whatsapp))return fail(errors.phone,f.customer_whatsapp);}
 if(channel==='messenger')body.customer_messenger_url=value('customer_messenger_url');
 if(!f.privacy_consent.checked){document.getElementById('order-consent-row').classList.add('is-invalid');return fail(errors.consent,f.privacy_consent);}
 body.privacy_consent=true;
 if(orderConfig?.turnstileSiteKey&&window.turnstile&&orderTurnstileWidget!==null)body.turnstile_token=window.turnstile.getResponse(orderTurnstileWidget)||'';
 const submit=document.getElementById('order-submit');
 submit.disabled=true;submit.firstElementChild.textContent=ot('sending');orderError.textContent='';
 try{
  const response=await fetch('/api/orders',{method:'POST',headers:{'content-type':'application/json','x-requested-with':'fetch'},body:JSON.stringify(body)});
  const data=await response.json().catch(()=>null);
  if(!response.ok){
   orderError.textContent=describeOrderError(data,response.status);
   // A slot that filled up or a design that sold out meanwhile: reload the limits and redraw.
   if(['capacity_full','sold_out','deadline_passed'].includes(data?.error))loadOrderConfig({force:true}).then(()=>{renderDateChips();renderOrderBlock();});
   if(orderTurnstileWidget!==null&&window.turnstile)window.turnstile.reset(orderTurnstileWidget);
   return;
  }
  orderForm.hidden=true;orderDone.hidden=false;
  renderOrderDone({...data.order,duplicate:Boolean(data.duplicate)});
  orderForm.reset();
  loadOrderConfig({force:true});
 }catch(error){console.warn('Order failed:',error);orderError.textContent=errors.network;}
 finally{submit.disabled=false;submit.firstElementChild.textContent=ot('submit');}
});
// The product dialog closing takes the order dialog with it.
document.getElementById('product-dialog').addEventListener('close',()=>{if(orderDialog.open)orderDialog.close();orderBlock.hidden=true;});
refreshOrderText();
// If the catalog arrived before this script ran, fetch the order state now for the cards.
if(typeof products!=='undefined'&&catalogState==='ready'&&products.some(isSaleProduct))loadOrderConfig();
