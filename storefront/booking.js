// Public reservation requests. Inside the product dialog the customer picks pick-up / return dates
// (and a size), sees whether the design is free, and sends a request. The request is only ever
// `pending`: nothing is held until staff confirm it in /admin/ and contact the customer.
// Loaded after app.js; uses its globals (selected, language, copy, catalogCopy, chatUrl, store).
const bookingCopy={
 vi:{title:'Đặt chỗ',from:'Ngày nhận',to:'Ngày trả',size:'Kích cỡ',anySize:'Cửa hàng tư vấn',cta:'Gửi yêu cầu đặt chỗ',checking:'Đang kiểm tra lịch trống…',available:'Có sẵn',unavailable:'Không có sẵn trong thời gian này',pickDates:'Chọn ngày nhận và ngày trả để kiểm tra lịch trống.',apiDown:'Không kiểm tra được lịch trống. Vui lòng nhắn tin cho cửa hàng.',
  formTitle:'Gửi yêu cầu đặt chỗ',name:'Họ tên',phone:'Số điện thoại',preferred:'Liên hệ qua',zaloNumber:'Số Zalo',whatsappNumber:'Số WhatsApp',messengerUrl:'Link Facebook / Messenger',note:'Ghi chú',submit:'Gửi yêu cầu',sending:'Đang gửi…',
  policyTitle:'Điều khoản thuê',terms:'Đây là yêu cầu đặt chỗ, chưa phải đặt chỗ đã xác nhận. Cửa hàng sẽ liên hệ với bạn để xác nhận.',
  channels:{zalo:'Zalo',whatsapp:'WhatsApp',messenger:'Messenger',phone:'Gọi điện'},
  channelHints:{zalo:'Nhắn qua Zalo',whatsapp:'Nhắn qua WhatsApp',messenger:'Facebook / Messenger',phone:'Cửa hàng sẽ gọi cho bạn'},sameAsPhone:'Giống số điện thoại',optional:'Không bắt buộc',consent:'Tôi đồng ý với {policy} và việc xử lý thông tin cá nhân để phục vụ yêu cầu đặt chỗ.',policy:'Chính sách bảo mật',
  doneTitle:'Cảm ơn bạn 🌸',doneSent:'Yêu cầu đặt chỗ đã được gửi.',doneId:'Mã yêu cầu',doneContact:'Cửa hàng sẽ liên hệ để xác nhận.',doneNote:'Yêu cầu của bạn đã được tiếp nhận. Đặt chỗ chỉ được xác nhận sau khi cửa hàng liên hệ xác nhận.',doneDuplicate:'Yêu cầu này đã được gửi trước đó, cửa hàng sẽ sớm liên hệ với bạn.',doneMessenger:'Nhắn tin cho cửa hàng',close:'Đóng',adminTurnstile:'Dành cho quản trị viên: Cloudflare Turnstile chưa được cấu hình ({missing}). Biểu mẫu vẫn hoạt động nhưng chưa có bảo vệ chống spam. Xem docs/deployment-cloudflare.md.',
  errors:{required:'Vui lòng nhập họ tên và số điện thoại.',channel:'Vui lòng chọn cách liên hệ.',zaloNumber:'Vui lòng nhập số Zalo hoặc chọn "Giống số điện thoại".',whatsappNumber:'Vui lòng nhập số WhatsApp hoặc chọn "Giống số điện thoại".',consent:'Vui lòng đồng ý với Chính sách bảo mật để gửi yêu cầu.',phone:'Số điện thoại chưa đúng.',unavailable:'Rất tiếc, sản phẩm này vừa hết trong khoảng ngày đã chọn. Bạn thử ngày khác hoặc nhắn tin cho cửa hàng nhé.',too_many_requests:'Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau hoặc nhắn tin cho cửa hàng.',turnstile_required:'Vui lòng hoàn tất bước xác minh.',turnstile_failed:'Xác minh không thành công, vui lòng thử lại.',turnstile_unavailable:'Không xác minh được lúc này, vui lòng thử lại sau.',validation_error:'Vui lòng kiểm tra lại thông tin.',network:'Không gửi được. Vui lòng kiểm tra kết nối và thử lại.'}},
 en:{title:'Book this item',from:'Pick-up date',to:'Return date',size:'Size',anySize:'Let the store advise',cta:'Send a booking request',checking:'Checking availability…',available:'Available',unavailable:'Not available for these dates',pickDates:'Choose pick-up and return dates to check availability.',apiDown:'Availability could not be checked. Please message the store.',
  formTitle:'Send a booking request',name:'Full name',phone:'Phone number',preferred:'Contact me via',zaloNumber:'Zalo number',whatsappNumber:'WhatsApp number',messengerUrl:'Facebook / Messenger link',note:'Notes',submit:'Send request',sending:'Sending…',
  policyTitle:'Rental terms',terms:'This is a booking request, not a confirmed booking. The store will contact you to confirm.',
  channels:{zalo:'Zalo',whatsapp:'WhatsApp',messenger:'Messenger',phone:'Phone call'},
  channelHints:{zalo:'Message on Zalo',whatsapp:'Message on WhatsApp',messenger:'Facebook / Messenger',phone:'The store will call you'},sameAsPhone:'Same as my phone number',optional:'Optional',consent:'I agree to the {policy} and to my personal data being used to handle this booking request.',policy:'Privacy policy',
  doneTitle:'Thank you 🌸',doneSent:'Your booking request has been sent.',doneId:'Request ID',doneContact:'The store will contact you to confirm.',doneNote:'Your request has been received. A booking is confirmed only once the store has contacted you.',doneDuplicate:'This request was already sent; the store will be in touch soon.',doneMessenger:'Message the store',close:'Close',adminTurnstile:'For the store admin: Cloudflare Turnstile is not configured ({missing}). The form still works but has no spam protection. See docs/deployment-cloudflare.md.',
  errors:{required:'Please enter your name and phone number.',channel:'Please choose how we should contact you.',zaloNumber:'Please enter your Zalo number or tick "Same as my phone number".',whatsappNumber:'Please enter your WhatsApp number or tick "Same as my phone number".',consent:'Please accept the privacy policy to send the request.',phone:'That phone number does not look right.',unavailable:'Sorry, this item was just taken for those dates. Try other dates or message the store.',too_many_requests:'Too many requests. Please try again later or message the store.',turnstile_required:'Please complete the verification.',turnstile_failed:'Verification failed, please try again.',turnstile_unavailable:'Verification is unavailable right now, please try again later.',validation_error:'Please check the details.',network:'Could not send. Check your connection and try again.'}},
 zh:{title:'预约',from:'取件日期',to:'归还日期',size:'尺码',anySize:'由店铺建议',cta:'发送预约申请',checking:'正在查询…',available:'有库存',unavailable:'所选日期暂不可租',pickDates:'请选择取衣和归还日期以查询库存。',apiDown:'暂时无法查询库存，请联系店铺。',
  formTitle:'发送预约申请',name:'姓名',phone:'电话号码',preferred:'联系方式',zaloNumber:'Zalo 号码',whatsappNumber:'WhatsApp 号码',messengerUrl:'Facebook / Messenger 链接',note:'备注',submit:'发送申请',sending:'发送中…',
  policyTitle:'租赁条款',terms:'这是预约申请，并非已确认的预约。店铺将与您联系确认。',
  channels:{zalo:'Zalo',whatsapp:'WhatsApp',messenger:'Messenger',phone:'电话'},
  channelHints:{zalo:'通过 Zalo 联系',whatsapp:'通过 WhatsApp 联系',messenger:'Facebook / Messenger',phone:'店铺将致电您'},sameAsPhone:'与电话号码相同',optional:'选填',consent:'我同意{policy}，并同意为处理本次预约申请而使用我的个人信息。',policy:'隐私政策',
  doneTitle:'感谢您 🌸',doneSent:'预约申请已发送。',doneId:'申请编号',doneContact:'店铺将与您联系确认。',doneNote:'您的申请已收到。预约仅在店铺联系确认后生效。',doneDuplicate:'该申请此前已发送，店铺会尽快联系您。',doneMessenger:'联系店铺',close:'关闭',adminTurnstile:'管理员提示：Cloudflare Turnstile 尚未配置（{missing}）。表单可以使用，但没有防垃圾保护。请参阅 docs/deployment-cloudflare.md。',
  errors:{required:'请填写姓名和电话号码。',channel:'请选择联系方式。',zaloNumber:'请填写 Zalo 号码或勾选“与电话号码相同”。',whatsappNumber:'请填写 WhatsApp 号码或勾选“与电话号码相同”。',consent:'请先同意隐私政策再发送申请。',phone:'电话号码格式不正确。',unavailable:'很抱歉，该商品在所选日期刚被预订。请更换日期或联系店铺。',too_many_requests:'申请过于频繁，请稍后再试或联系店铺。',turnstile_required:'请完成验证。',turnstile_failed:'验证失败，请重试。',turnstile_unavailable:'暂时无法验证，请稍后再试。',validation_error:'请检查填写的信息。',network:'发送失败，请检查网络后重试。'}},
 ja:{title:'この商品を予約',from:'受取日',to:'返却日',size:'サイズ',anySize:'お店におまかせ',cta:'予約申請を送る',checking:'空き状況を確認中…',available:'空きあり',unavailable:'この期間は空きがありません',pickDates:'受取日と返却日を選ぶと空き状況を確認できます。',apiDown:'空き状況を確認できませんでした。お店にお問い合わせください。',
  formTitle:'予約申請を送る',name:'お名前',phone:'電話番号',preferred:'ご希望の連絡方法',zaloNumber:'Zalo番号',whatsappNumber:'WhatsApp番号',messengerUrl:'Facebook / Messenger のリンク',note:'備考',submit:'申請を送る',sending:'送信中…',
  policyTitle:'レンタル規約',terms:'これは予約申請であり、確定した予約ではありません。お店から確認のご連絡をします。',
  channels:{zalo:'Zalo',whatsapp:'WhatsApp',messenger:'Messenger',phone:'電話'},
  channelHints:{zalo:'Zaloで連絡',whatsapp:'WhatsAppで連絡',messenger:'Facebook / Messenger',phone:'お店から電話します'},sameAsPhone:'電話番号と同じ',optional:'任意',consent:'{policy}と、予約申請のために個人情報を利用することに同意します。',policy:'プライバシーポリシー',
  doneTitle:'ありがとうございます 🌸',doneSent:'予約申請を送信しました。',doneId:'受付番号',doneContact:'お店から確認のご連絡をします。',doneNote:'申請を受け付けました。予約はお店からの確認連絡をもって確定します。',doneDuplicate:'この申請はすでに送信されています。お店からまもなくご連絡します。',doneMessenger:'お店にメッセージ',close:'閉じる',adminTurnstile:'管理者向け: Cloudflare Turnstile が未設定です（{missing}）。フォームは動作しますがスパム対策がありません。docs/deployment-cloudflare.md を参照してください。',
  errors:{required:'お名前と電話番号を入力してください。',channel:'連絡方法を選択してください。',zaloNumber:'Zalo番号を入力するか「電話番号と同じ」にチェックしてください。',whatsappNumber:'WhatsApp番号を入力するか「電話番号と同じ」にチェックしてください。',consent:'申請を送るにはプライバシーポリシーへの同意が必要です。',phone:'電話番号の形式を確認してください。',unavailable:'申し訳ありません。この期間は直前に埋まってしまいました。別の日程を選ぶか、お店にご相談ください。',too_many_requests:'申請回数が多すぎます。しばらくしてから再度お試しいただくか、お店にご連絡ください。',turnstile_required:'認証を完了してください。',turnstile_failed:'認証に失敗しました。もう一度お試しください。',turnstile_unavailable:'現在認証できません。しばらくしてからお試しください。',validation_error:'入力内容を確認してください。',network:'送信できませんでした。通信環境を確認して再度お試しください。'}}
};
for(const [lang,labels] of Object.entries({"vi":{"chooseStart":"Chọn ngày bắt đầu","chooseEnd":"Chọn ngày kết thúc (chọn lại cùng ngày để thuê 1 ngày)","calendarNote":"Ngày bị gạch không thể chọn. Giá gồm cả ngày nhận và ngày trả.","previousMonth":"Tháng trước","nextMonth":"Tháng sau","resetDates":"Chọn lại","retryCalendar":"Thử lại","rentalTotal":"Tổng tiền thuê dự kiến","daysUnit":"ngày"},"en":{"chooseStart":"Choose the start date","chooseEnd":"Choose the end date (pick the same day for a one-day rental)","calendarNote":"Crossed-out dates cannot be selected. Both pickup and return days are charged.","previousMonth":"Previous month","nextMonth":"Next month","resetDates":"Start over","retryCalendar":"Retry","rentalTotal":"Estimated rental total","daysUnit":"days"},"ja":{"chooseStart":"開始日を選んでください","chooseEnd":"終了日を選んでください（同日なら1日分）","calendarNote":"取消線の日付は選択できません。貸出日・返却日を含めて計算します。","previousMonth":"前の月","nextMonth":"次の月","resetDates":"選び直す","retryCalendar":"再読み込み","rentalTotal":"レンタル料金合計（目安）","daysUnit":"日"},"zh":{"chooseStart":"请选择开始日期","chooseEnd":"请选择结束日期（同一天按1天计算）","calendarNote":"划线日期不可选。租金包含取件日和归还日。","previousMonth":"上个月","nextMonth":"下个月","resetDates":"重新选择","retryCalendar":"重试","rentalTotal":"预计租金合计","daysUnit":"天"}}))Object.assign(bookingCopy[lang],labels);
for(const [lang,labels] of Object.entries({"vi":{"messengerFirst":"Sau khi gửi yêu cầu, vui lòng gửi mã yêu cầu đến Messenger của cửa hàng. Không cần nhập ID Messenger.","messengerNext":"Hãy sao chép mã yêu cầu bên dưới và gửi cho cửa hàng qua Messenger. Cửa hàng sẽ trả lời trong cuộc trò chuyện đó để xác nhận.","copyId":"Sao chép mã yêu cầu","idCopied":"Đã sao chép. Hãy dán và gửi trong Messenger.","copyFailed":"Không thể sao chép tự động. Hãy chọn và sao chép mã bên trên.","openMessenger":"Mở Messenger của cửa hàng"},"en":{"messengerFirst":"After submitting, send your request ID to the store on Messenger. No Messenger ID is needed.","messengerNext":"Copy your request ID below and send it to the store on Messenger. The store will reply in that conversation to confirm.","copyId":"Copy request ID","idCopied":"Copied. Paste and send it in Messenger.","copyFailed":"Could not copy automatically. Select and copy the ID above.","openMessenger":"Open the store’s Messenger"},"ja":{"messengerFirst":"申請後、予約番号をお店のMessengerへ送ってください。ご自身のMessenger IDの入力は不要です。","messengerNext":"下の予約番号をコピーして、お店のMessengerへ送ってください。その会話でお店から確認の返信をします。","copyId":"予約番号をコピー","idCopied":"コピーしました。Messengerに貼り付けて送信してください。","copyFailed":"自動コピーできませんでした。上の予約番号を選択してコピーしてください。","openMessenger":"お店のMessengerを開く"},"zh":{"messengerFirst":"提交后，请通过Messenger将预约编号发送给店铺。无需填写您的Messenger ID。","messengerNext":"请复制下方预约编号，通过Messenger发送给店铺。店铺将在该会话中回复确认。","copyId":"复制预约编号","idCopied":"已复制。请粘贴到Messenger并发送。","copyFailed":"无法自动复制。请选中并复制上方编号。","openMessenger":"打开店铺Messenger"}}))Object.assign(bookingCopy[lang],labels);
for(const [lang,labels] of Object.entries({"vi":{"pickupWindow":"Khung giờ nhận","returnNote":"Trả lại trong cùng khung giờ. Giá tính theo mỗi 24 giờ.","calendarNote":"Ngày bị gạch không thể chọn. Giá tính theo mỗi 24 giờ kể từ giờ nhận."},"en":{"pickupWindow":"Pick-up window","returnNote":"Return it in the same window. Rent is charged per 24 hours.","calendarNote":"Crossed-out dates cannot be selected. Rent is charged per 24 hours from the pick-up time."},"ja":{"pickupWindow":"受取時間帯","returnNote":"返却は同じ時間帯です。料金は24時間ごとに計算します。","calendarNote":"取消線の日付は選択できません。料金は受取時刻から24時間ごとに計算します。"},"zh":{"pickupWindow":"取件时段","returnNote":"归还为同一时段。租金按每24小时计算。","calendarNote":"划线日期不可选。租金自取件时间起按每24小时计算。"}}))Object.assign(bookingCopy[lang],labels);
for(const [lang,text] of Object.entries({vi:"Vui lòng chọn khung giờ nhận.",en:"Please choose a pick-up window.",ja:"受取時間帯を選んでください。",zh:"请选择取件时段。"}))bookingCopy[lang].errors.chooseWindow=text;
for(const [lang,labels] of Object.entries({"vi":{"pickupAt":"Giờ nhận","availabilityTitle":"Giờ còn trống","rentalLength":"Thuê trong","planPickup":"Nhận lúc","planLength":"Thời gian thuê","planDue":"Hạn trả","planPrice":"Giá thuê","changeChoice":"Chọn lại","hoursUnit":" giờ","remainingOne":"Còn 1","noTimes":"Ngày này chưa có giờ nhận nào.","handoffClosedDay":"Ngày này cửa hàng không giao nhận được.","stateFree":"Còn trống","stateLow":"Sắp hết","stateTaken":"Đã có người thuê","stateHandoff":"Ngoài giờ giao nhận","stateCare":"Đang bảo dưỡng","statePast":"Đã qua giờ"},"en":{"pickupAt":"Pick-up time","availabilityTitle":"Times still free","rentalLength":"Rental length","planPickup":"Pick up","planLength":"Length","planDue":"Return by","planPrice":"Price","changeChoice":"Change","hoursUnit":"h","remainingOne":"1 left","noTimes":"No pick-up times on this day.","handoffClosedDay":"Nobody can hand items over on this day.","stateFree":"Free","stateLow":"Almost gone","stateTaken":"Booked","stateHandoff":"Outside handover hours","stateCare":"In care","statePast":"Gone"},"ja":{"pickupAt":"受取時刻","availabilityTitle":"空き状況","rentalLength":"利用期間","planPickup":"受取予定","planLength":"利用期間","planDue":"返却期限","planPrice":"料金","changeChoice":"選び直す","hoursUnit":"時間","remainingOne":"残り1点","noTimes":"この日に受け取れる時間はありません。","handoffClosedDay":"この日は受取・返却の対応ができません。","stateFree":"空きあり","stateLow":"残りわずか","stateTaken":"予約済み","stateHandoff":"受取対応不可","stateCare":"メンテナンス中","statePast":"受付終了"},"zh":{"pickupAt":"取件时间","availabilityTitle":"空闲时段","rentalLength":"租期","planPickup":"取件","planLength":"租期","planDue":"归还期限","planPrice":"租金","changeChoice":"重新选择","hoursUnit":"小时","remainingOne":"仅剩1件","noTimes":"当天没有可取件的时间。","handoffClosedDay":"当天无法办理取件与归还。","stateFree":"有空","stateLow":"所剩不多","stateTaken":"已被预约","stateHandoff":"非取还时段","stateCare":"保养中","statePast":"已过时间"}}))Object.assign(bookingCopy[lang],labels);
for(const [lang,text] of Object.entries({"vi":"Vui lòng chọn giờ nhận.","en":"Please choose a pick-up time.","ja":"受取時刻を選んでください。","zh":"请选择取件时间。"}))bookingCopy[lang].errors.chooseWindow=text;
for(const [lang,labels] of Object.entries({
 ja:{stateClosed:'営業時間外',stateCare:'お手入れ中',stateTaken:'在庫なし / 予約済み',timelineHint:'横にスクロールして1日の空き状況を確認。選べない時間をタップすると理由が表示されます。',stockLabel:'在庫',countLabel:'利用可能 {n}着',review:'予約内容を確認'},
 en:{stateClosed:'Closed',timelineHint:'Scroll across the day. Tap an unavailable time to see why.',stockLabel:'Availability',countLabel:'{n} available',review:'Review reservation'},
 vi:{stateClosed:'Ngoài giờ mở cửa',timelineHint:'Vuốt ngang để xem cả ngày. Chạm giờ không còn trống để xem lý do.',stockLabel:'Tình trạng',countLabel:'Còn {n} bộ',review:'Xem lại yêu cầu'},
 zh:{stateClosed:'营业时间外',timelineHint:'左右滑动查看全天。点击不可选时段查看原因。',stockLabel:'库存',countLabel:'可用 {n} 件',review:'确认预约内容'}
}))Object.assign(bookingCopy[lang],labels);
for(const [lang,labels] of Object.entries({"vi":{"purposeRental":"Thuê","purposeFitting":"Thử đồ","rentalNote":"Chọn ngày nhận, giờ nhận và số ngày thuê.","fittingNote":"Đến thử tại cửa hàng khoảng {n} phút rồi trả lại ngay. Không mất phí.","planVisit":"Đến lúc","minutesUnit":" phút","freeOfCharge":"Miễn phí"},"en":{"purposeRental":"Rent","purposeFitting":"Try on","rentalNote":"Pick the day, the hour and how long you need it.","fittingNote":"Come and try it on at the shop for about {n} minutes and hand it straight back. Free of charge.","planVisit":"Come at","minutesUnit":" min","freeOfCharge":"Free"},"ja":{"purposeRental":"レンタル","purposeFitting":"試着","rentalNote":"受取日・受取時刻・利用日数を選んでください。","fittingNote":"お店で{n}分ほど試着し、その場でお返しいただきます。料金はかかりません。","planVisit":"来店日時","minutesUnit":"分","freeOfCharge":"無料"},"zh":{"purposeRental":"租借","purposeFitting":"试穿","rentalNote":"请选择取件日期、取件时间与租借天数。","fittingNote":"在店内试穿约{n}分钟后当场归还。不收取费用。","planVisit":"到店时间","minutesUnit":"分钟","freeOfCharge":"免费"}}))Object.assign(bookingCopy[lang],labels);
for(const [lang,labels] of Object.entries({"vi":{"useTitle":"Bạn muốn gì","purposeRentalHint":"Tính theo mỗi 24 giờ","purposeFittingHint":"Chỉ thử tại cửa hàng","visitDate":"Ngày đến","visitAt":"Giờ đến"},"en":{"useTitle":"What you need","purposeRentalHint":"Charged per 24 hours","purposeFittingHint":"Try it on at the shop","visitDate":"Visit date","visitAt":"Arrive at"},"ja":{"useTitle":"利用方法","purposeRentalHint":"24時間単位で利用","purposeFittingHint":"店舗で試着のみ","visitDate":"来店日","visitAt":"来店時刻"},"zh":{"useTitle":"使用方式","purposeRentalHint":"按每24小时计费","purposeFittingHint":"仅在店内试穿","visitDate":"到店日期","visitAt":"到店时间"}}))Object.assign(bookingCopy[lang],labels);
const BOOKING_CHANNELS=['zalo','whatsapp','messenger','phone'];
const bt=key=>bookingCopy[language]?.[key]??bookingCopy.vi[key];
const bookingBlock=document.getElementById('dialog-booking'),bookingFrom=document.getElementById('booking-from'),bookingTo=document.getElementById('booking-to'),bookingSize=document.getElementById('booking-size'),bookingStatus=document.getElementById('booking-status'),bookingOpen=document.getElementById('booking-open');
const bookingDialog=document.getElementById('booking-dialog'),bookingForm=document.getElementById('booking-form'),bookingDone=document.getElementById('booking-done'),bookingError=document.getElementById('booking-error');
// What the dialog currently knows: the design, dates, size and whether that combination is free.
let calendarMonth='',calendarData=null,calendarSeq=0;
let booking={productId:'',from:'',to:'',size:'',slot:'',days:1,lengthPicked:false,purpose:'rental',available:false,checkSeq:0};
let timelineData=null,timelineSeq=0;
const localToday=()=>new Intl.DateTimeFormat('en-CA',{timeZone:store.timezone||'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const isoDate=value=>/^\d{4}-\d{2}-\d{2}$/.test(value||'');

function rentalPriceText(quote){
 const p=selected;if(!p)return '';
 if(isFitting())return '';
 // A rental is a number of whole 24-hour days. With an hour axis that number is what the customer
 // chose; without one it is still the gap between the two dates they picked. Either way the Worker
 // charges the same, and its quote wins whenever one has arrived.
 const spanDays=isoDate(booking.from)&&isoDate(booking.to)&&booking.from<=booking.to?Math.max(1,Math.round((Date.parse(booking.to+'T00:00:00Z')-Date.parse(booking.from+'T00:00:00Z'))/86400000)):0;
 const days=usesTimeline()?(isoDate(booking.from)?Math.max(1,booking.days):0):spanDays;
 if(!days||typeof p.price?.rental!=='number')return '';
 // The Worker charges this. The same sum is worked out here only so a total is on screen before
 // its answer arrives, and its answer replaces this the moment it does.
 const extra=typeof p.price.additionalDay==='number'?p.price.additionalDay:p.price.rental;
 const q=quote||{daily:p.price.rental,additionalDay:extra,additionalDays:days-1,days,
  total:p.price.rental+extra*(days-1),discounted:extra<p.price.rental,currency:p.currency};
 // Without a cheaper rate it is one multiplication; with one, the first day and the rest, because
 // a customer checking the number wants to see where the cheaper days came from.
 if(!q.discounted||!q.additionalDays)return bt('rentalTotal')+': '+formatPrice(q.daily,q.currency)+' × '+q.days+' '+bt('daysUnit')+' = '+formatPrice(q.total,q.currency);
 return bt('rentalTotal')+': '+formatPrice(q.daily,q.currency)+' + '+formatPrice(q.additionalDay,q.currency)+' × '+q.additionalDays+' '+bt('daysUnit')+' = '+formatPrice(q.total,q.currency);
}
const SLOT_STATE_KEYS={available:'stateFree',low:'stateLow',none:'stateTaken',handoff:'stateHandoff',maintenance:'stateCare',past:'statePast',closed:'stateClosed'};
const maxRentalDays=()=>Number(store.booking?.maxRentalDays)||60;
// Only a store that says when somebody is there to hand a garment over gets the hour axis; one
// that does not keeps the plain date range it always had.
const usesTimeline=()=>Object.values(store.booking?.handoff?.weekly||{}).some(list=>Array.isArray(list)&&list.length);
// Coming in to try something on: an appointment of a set length, free, ending the same day. The
// store decides whether it offers them at all.
const fittingOffered=()=>usesTimeline()&&store.booking?.fitting?.enabled===true;
const isFitting=()=>booking.purpose==='fitting';
const fittingMinutes=()=>Number(timelineData?.fittingMinutes)||Number(store.booking?.fitting?.minutes)||30;
// Which of the two the customer is here for. It changes what a day on the calendar means, so it
// sits above it rather than beside the button at the end.
function renderPurpose(){
 const box=document.getElementById('booking-purpose');
 box.hidden=!fittingOffered();
 if(box.hidden)return;
 document.getElementById('purpose-label').textContent=bt('useTitle');
 document.getElementById('purpose-note').textContent=isFitting()?bt('fittingNote').replace('{n}',String(fittingMinutes())):bt('rentalNote');
 // Real radios inside the cards: arrow keys and screen readers work, the card is the hit area.
 document.getElementById('purpose-cards').innerHTML=[['rental','purposeRental','purposeRentalHint'],['fitting','purposeFitting','purposeFittingHint']]
  .map(([value,name,hint])=>`<label class="channel-card purpose-card${booking.purpose===value?' is-selected':''}" for="purpose-${value}">`+
   `<input type="radio" id="purpose-${value}" name="booking_purpose" value="${value}" class="sr-only"${booking.purpose===value?' checked':''}>`+
   `<span class="channel-mark" aria-hidden="true"></span><span class="channel-name">${escapeMarkup(bt(name))}</span>`+
   `<span class="channel-hint">${escapeMarkup(bt(hint))}</span></label>`).join('');
}
// What the form asks for depends on why the customer is coming: a rental names two ends and a
// length, a visit names only when to arrive. Nothing from the other errand is left on screen.
function renderBookingFields(){
 const fitting=isFitting();
 document.getElementById('booking-to-field').hidden=fitting;
 const fromLabel=document.querySelector('.booking-fields [data-booking-i18n="from"]');
 if(fromLabel)fromLabel.textContent=fitting?bt('visitDate'):bt('from');
}
document.getElementById('purpose-cards').addEventListener('change',event=>{
 const chosen=event.target.closest('[name=booking_purpose]');if(!chosen||chosen.value===booking.purpose)return;
 // Switching errand drops everything the other one had chosen, so nothing irrelevant is left.
 booking.purpose=chosen.value;booking.slot='';booking.days=1;booking.lengthPicked=false;
 syncBookingDates();renderPurpose();renderBookingFields();renderDuration();renderRentalPrice();
 checkAvailability();loadTimeline();loadRentalCalendar({keepView:true});
});
// The day the garment is collected plus the length chosen: the return date follows from those two
// and is never asked for.
function syncBookingDates(){
 booking.from=bookingFrom.value;
 // With an hour axis the return follows from the length; without one the customer names it.
 if(!usesTimeline()){booking.to=bookingTo.value;return;}
 booking.to=isoDate(booking.from)?shiftIso(booking.from,isFitting()?0:Math.max(1,booking.days)):'';
 bookingTo.value=booking.to;
}
const shiftIso=(date,days)=>{const d=new Date(date+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);};
// One row of the day per time the store offers, with why a time cannot be taken when it cannot.
// Colour alone never carries it: every state also has a mark and a name in the legend.
// Domain-independent renderer: callers provide states, counts, labels and selection.
function renderAvailabilityTimeline(track,{slots,selectedTime,endTime,label,stateLabel,countLabel}){
 const escape=escapeMarkup;
 const marks={available:'○',low:'△',none:'×',handoff:'□',maintenance:'≋',closed:'−',past:'·'};
 const scroll=track.scrollLeft;
 const focusTime=track.contains(document.activeElement)?document.activeElement.dataset.time:null;
 track.setAttribute('aria-label',label);
 track.innerHTML='<div class="availability-axis">'+slots.map((slot,index)=>{
  const open=['available','low'].includes(slot.state);
  const major=slot.time.endsWith(':00')||index===0;
  const description=slot.time+' / '+stateLabel(slot.state)+(open?' / '+countLabel(slot.remaining):'');
  return '<div class="availability-cell '+(major?'major':'minor')+'">'+
   '<span class="availability-tick" aria-hidden="true">'+(major?escape(slot.time):'')+'</span>'+
   '<button type="button" class="slot slot-'+escape(slot.state)+'" data-time="'+escape(slot.time)+'" aria-pressed="'+(slot.time===selectedTime)+'" aria-disabled="'+!open+'" aria-label="'+escape(description)+'" title="'+escape(description)+'">'+
   '<span class="slot-mark" aria-hidden="true">'+(marks[slot.state]||'?')+'</span><span class="slot-count" aria-hidden="true">'+(open?slot.remaining:'')+'</span></button></div>';
 }).join('')+'<span class="availability-end" aria-hidden="true">'+escape(endTime||'')+'</span></div>';
 track.scrollLeft=scroll;
 if(focusTime)track.querySelector('[data-time="'+focusTime+'"]')?.focus({preventScroll:true});
}
let timelineBand=0;
const timelineUiCopy={
 ja:{hint:'1日の空き状況を確認して、時間帯から受取時刻を選べます。',details:'詳しい時間軸を見る',bands:['深夜','朝','昼','夜'],empty:'この時間帯に選べる時刻はありません。',count:'選べる時刻 {n}件'},
 en:{hint:'See the whole day, then choose a time within a period.',details:'Show detailed timeline',bands:['Overnight','Morning','Afternoon','Evening'],empty:'No available times in this period.',count:'{n} available times'},
 vi:{hint:'Xem cả ngày, rồi chọn giờ trong từng buổi.',details:'Xem trục thời gian chi tiết',bands:['Đêm','Sáng','Chiều','Tối'],empty:'Không có giờ trống trong buổi này.',count:'{n} giờ có thể chọn'},
 zh:{hint:'先查看全天空闲情况，再按时段选择取件时间。',details:'查看详细时间轴',bands:['凌晨','上午','下午','晚上'],empty:'此时段没有可选时间。',count:'{n} 个可选时间'}
};
function renderQuickTimes({reveal=false}={}){
 const ui=timelineUiCopy[language]||timelineUiCopy.vi,slots=timelineData.slots||[];
 const open=slot=>['available','low'].includes(slot.state);
 const bandOf=slot=>Math.floor(Number(slot.time.slice(0,2))/6);
 if(reveal){const target=slots.find(slot=>slot.time===booking.slot)||slots.find(open)||slots[0];timelineBand=target?bandOf(target):0;}
 const marks={available:'○',low:'△',none:'×',handoff:'□',maintenance:'≋',closed:'−',past:'·'};
 const bands=document.getElementById('timeline-periods');
 bands.innerHTML=ui.bands.map((label,n)=>{
  const entries=slots.filter(slot=>bandOf(slot)===n),count=entries.filter(open).length;
  return `<button type="button" data-band="${n}" aria-pressed="${timelineBand===n}" aria-controls="timeline-choices"><b>${escapeMarkup(label)}</b><span>${String(n*6).padStart(2,'0')}:00–${String((n+1)*6).padStart(2,'0')}:00</span><span class="day-strip" aria-hidden="true">${entries.map(slot=>`<i class="slot-${escapeMarkup(slot.state)}">${marks[slot.state]||'×'}</i>`).join('')}</span><small>${escapeMarkup(ui.count.replace('{n}',count))}</small></button>`;
 }).join('');
 const entries=slots.filter(slot=>bandOf(slot)===timelineBand);
 const choices=document.getElementById('timeline-choices');
 const focused=choices.contains(document.activeElement)?document.activeElement.dataset.time:null;
 choices.innerHTML=entries.map(slot=>{
  const label=bt(SLOT_STATE_KEYS[slot.state]||'stateTaken');
  const detail=open(slot)?bt('countLabel').replace('{n}',slot.remaining):label;
  return `<button type="button" class="quick-time slot-${escapeMarkup(slot.state)}" data-time="${escapeMarkup(slot.time)}" aria-pressed="${booking.slot===slot.time}" aria-disabled="${!open(slot)}" aria-label="${escapeMarkup(slot.time+' / '+label+' / '+detail)}"><b>${escapeMarkup(slot.time)}</b><span>${marks[slot.state]||'×'} ${escapeMarkup(detail)}</span></button>`;
 }).join('');
 if(focused)choices.querySelector(`[data-time="${focused}"]`)?.focus({preventScroll:true});
 const empty=document.getElementById('timeline-period-empty');empty.hidden=entries.some(open);empty.textContent=ui.empty;
 document.getElementById('timeline-more-label').textContent=ui.details;
 document.getElementById('timeline-hint').textContent=ui.hint;
}
function renderTimeline({reveal=false}={}){
 const box=document.getElementById('booking-timeline'),track=document.getElementById('timeline-track');
 const empty=document.getElementById('timeline-empty'),legend=document.getElementById('timeline-legend');
 box.hidden=!timelineData;
 if(!timelineData)return;
 document.getElementById('timeline-label').textContent=bt('availabilityTitle');
 document.getElementById('timeline-day').textContent=formatDate(timelineData.date);
 document.getElementById('timeline-hint').textContent=bt('timelineHint');
 const slots=timelineData.slots||[];
 renderQuickTimes({reveal});
 empty.hidden=slots.some(slot=>['available','low'].includes(slot.state));
 empty.textContent=bt(timelineData.closed?'handoffClosedDay':'noTimes');
 const stateLabel=state=>bt(SLOT_STATE_KEYS[state]||'stateTaken');
 renderAvailabilityTimeline(track,{slots,selectedTime:booking.slot,endTime:timelineData.displayEnd,label:bt('pickupAt'),stateLabel,countLabel:n=>bt('countLabel').replace('{n}',n)});
 const marks={available:'○',low:'△',none:'×',handoff:'□',maintenance:'≋',closed:'−',past:'·'};
 legend.innerHTML=[...new Set(slots.map(slot=>slot.state))].map(state=>'<li><span class="legend-swatch slot-'+escapeMarkup(state)+'" aria-hidden="true">'+marks[state]+'</span>'+escapeMarkup(stateLabel(state))+'</li>').join('');
 if(reveal){
  const target=track.querySelector('[data-time="'+booking.slot+'"]')||track.querySelector('[aria-disabled="false"]')||track.querySelector('[data-time]');
  if(target)track.scrollLeft=Math.max(0,target.parentElement.offsetLeft-track.clientWidth/3);
 }
}
// The axis is the server's answer, never the page's guess: it knows the bookings, the care
// windows and when somebody is actually at the shop.
async function loadTimeline(){
 const p=selected;
 const seq=++timelineSeq;
 const box=document.getElementById('booking-timeline');
 if(!p||p.inventory?.managed!==true||!usesTimeline()||!isoDate(booking.from)){timelineData=null;box.hidden=true;renderPlan();return;}
 const previousSlot=booking.slot;
 timelineData=null;booking.slot='';booking.available=false;renderPlan();renderBookingStatus();
 box.hidden=false;document.getElementById('timeline-track').innerHTML='';
 document.getElementById('timeline-periods').innerHTML='';document.getElementById('timeline-choices').innerHTML='';document.getElementById('timeline-period-empty').hidden=true;
 document.getElementById('timeline-legend').innerHTML='';document.getElementById('timeline-empty').hidden=true;
 document.getElementById('timeline-detail').textContent=bt('checking');
 const query=new URLSearchParams({date:booking.from,days:String(Math.max(1,booking.days)),size:bookingSize.value,purpose:booking.purpose});
 box.setAttribute('aria-busy','true');
 try{
  const response=await fetch('/api/products/'+encodeURIComponent(p.id)+'/timeline?'+query,{cache:'no-store'});
  if(!response.ok)throw new Error('timeline unavailable');
  const data=await response.json();
  if(seq!==timelineSeq||selected?.id!==p.id)return;
  timelineData=data;
  if(data.slots?.some(slot=>slot.time===previousSlot&&['available','low'].includes(slot.state)))booking.slot=previousSlot;
  // A time that stopped being free while the customer was reading has to let go of itself.
  const chosen=(data.slots||[]).find(slot=>slot.time===booking.slot);
  if(booking.slot&&(!chosen||!['available','low'].includes(chosen.state)))booking.slot='';
 }catch{ if(seq!==timelineSeq)return;timelineData=null;booking.slot='';document.getElementById('timeline-detail').textContent=bt('apiDown'); }
 box.removeAttribute('aria-busy');
 if(seq!==timelineSeq)return;
 renderTimeline({reveal:true});box.hidden=false;
 if(timelineData)document.getElementById('timeline-detail').textContent=booking.slot?bt('pickupAt')+' '+booking.slot:bt('pickupAt');
 else{
  const retry=document.createElement('button');retry.type='button';retry.className='text-link';retry.textContent=bt('retryCalendar');
  retry.addEventListener('click',()=>loadTimeline());document.getElementById('timeline-detail').append(' ',retry);
 }
 renderPlan();renderBookingStatus(timelineData?'pickupAt':'apiDown');
}
// What the customer is about to ask for, in words, next to the button that sends it.
function renderPlan(){
 const plan=document.getElementById('booking-plan');
 const ready=usesTimeline()&&isoDate(booking.from)&&booking.slot;
 plan.hidden=!ready;
 if(!ready)return;
 const quote=timelineData?.quote;
 const hours=Math.max(1,booking.days)*24;
 const rows=isFitting()
  ?[[bt('planVisit'),formatDate(booking.from)+' '+booking.slot],[bt('planLength'),fittingMinutes()+bt('minutesUnit')],[bt('planPrice'),bt('freeOfCharge')]]
  :[[bt('planPickup'),formatDate(booking.from)+' '+booking.slot],
    [bt('planLength'),Math.max(1,booking.days)+' '+bt('daysUnit')+' / '+hours+bt('hoursUnit')],
    [bt('planDue'),formatDate(booking.to)+' '+booking.slot]];
 rows.push([bt('stockLabel'),bt('available')]);
 if(quote&&!isFitting())rows.push([bt('planPrice'),formatPrice(quote.total,quote.currency)]);
 plan.innerHTML=rows.map(([label,value])=>`<div><span>${escapeMarkup(label)}</span><b>${escapeMarkup(value)}</b></div>`).join('')+
  `<button type="button" class="text-link" data-reset-plan>${escapeMarkup(bt('changeChoice'))}</button>`;
}
// How many whole days, at the store's own limit.
function renderDuration(){
 const box=document.getElementById('booking-duration');
 box.hidden=!usesTimeline()||isFitting()||!isoDate(booking.from);
 document.getElementById('duration-label').textContent=bt('rentalLength');
 document.getElementById('booking-days').value=String(Math.max(1,booking.days));
 document.getElementById('duration-hours').textContent=Math.max(1,booking.days)*24+bt('hoursUnit');
 document.getElementById('days-minus').disabled=booking.days<=1;
 document.getElementById('days-plus').disabled=booking.days>=maxRentalDays();
}
document.getElementById('booking-timeline').addEventListener('click',event=>{
 const band=event.target.closest('[data-band]');
 if(band){timelineBand=Number(band.dataset.band);renderQuickTimes();document.querySelector(`[data-band="${timelineBand}"]`)?.focus({preventScroll:true});return;}
 const slot=event.target.closest('[data-time]');if(!slot)return;
 document.getElementById('timeline-detail').textContent=slot.getAttribute('aria-label');
 if(slot.getAttribute('aria-disabled')==='true')return;
 booking.slot=slot.dataset.time;
 timelineBand=Math.floor(Number(booking.slot.slice(0,2))/6);
 renderTimeline();renderPlan();renderBookingStatus();
});
document.querySelector('.timeline-more').addEventListener('toggle',event=>{
 if(!event.target.open)return;
 const track=document.getElementById('timeline-track');
 const target=track.querySelector('[aria-pressed="true"]')||track.querySelector('[aria-disabled="false"]');
 if(target)track.scrollLeft=Math.max(0,target.parentElement.offsetLeft-track.clientWidth/3);
});
document.getElementById('booking-plan').addEventListener('click',event=>{
 if(!event.target.closest('[data-reset-plan]'))return;
 booking.slot='';renderTimeline();renderPlan();renderBookingStatus();
 document.getElementById('booking-timeline').scrollIntoView?.({block:'nearest'});
});
for(const [id,step] of [['days-minus',-1],['days-plus',1]])document.getElementById(id).addEventListener('click',()=>{
 booking.days=Math.min(maxRentalDays(),Math.max(1,booking.days+step));booking.lengthPicked=true;
 syncBookingDates();renderDuration();renderPlan();checkAvailability();loadTimeline();loadRentalCalendar({keepView:true});
});
function renderRentalPrice(quote){document.getElementById('booking-price').textContent=rentalPriceText(quote);}
function renderRentalCalendar({fresh=true}={}){
 const box=document.getElementById('booking-calendar');if(!calendarData)return;
 box.removeAttribute('aria-busy');box.style.minHeight='';
 const date=new Date(calendarMonth+'-01T00:00:00Z'),locale=language==='zh'?'zh-CN':language;
 const title=new Intl.DateTimeFormat(locale,{year:'numeric',month:'long',timeZone:'UTC'}).format(date);
 const offset=(date.getUTCDay()+6)%7;
 const weekdays=Array.from({length:7},(_,n)=>new Intl.DateTimeFormat(locale,{weekday:'short',timeZone:'UTC'}).format(new Date(Date.UTC(2026,0,5+n))));
 box.innerHTML=`<div class="calendar-nav"><button type="button" data-month="-1" ${calendarMonth===calendarData.minMonth?'disabled':''} aria-label="${escapeMarkup(bt('previousMonth'))}">‹</button><b>${escapeMarkup(title)}</b><button type="button" data-month="1" ${calendarMonth===calendarData.maxMonth?'disabled':''} aria-label="${escapeMarkup(bt('nextMonth'))}">›</button></div><p class="calendar-instruction">${escapeMarkup(bt(booking.from&&(usesTimeline()?!booking.lengthPicked:!booking.to)?'chooseEnd':'chooseStart'))}</p><div class="calendar-grid${fresh?' is-fresh':''}">${weekdays.map(day=>'<span class="weekday">'+escapeMarkup(day)+'</span>').join('')}${'<span></span>'.repeat(offset)}${calendarData.days.map(day=>`<button type="button" data-day="${day.date}" aria-label="${escapeMarkup(formatDate(day.date))}" aria-pressed="${day.date===booking.from||((!usesTimeline()||booking.lengthPicked)&&day.date===booking.to)}" class="${booking.from&&booking.to&&day.date>=booking.from&&day.date<=booking.to?'in-range':''}" ${(usesTimeline()?day.date>=localToday()&&day.date<=shiftIso(localToday(),store.booking?.maxDaysAhead||365):day.available)?'':'disabled'}>${Number(day.date.slice(-2))}</button>`).join('')}</div><p class="calendar-note">${escapeMarkup(bt('calendarNote'))}</p><button type="button" data-reset-dates>${escapeMarkup(bt('resetDates'))}</button>`;
 box.querySelectorAll('[data-month]').forEach(button=>button.addEventListener('click',()=>{const month=new Date(calendarMonth+'-01T00:00:00Z');month.setUTCMonth(month.getUTCMonth()+Number(button.dataset.month));calendarMonth=month.toISOString().slice(0,7);loadRentalCalendar();}));
 box.querySelector('[data-reset-dates]').addEventListener('click',()=>{bookingFrom.value='';bookingTo.value='';booking.from='';booking.to='';booking.slot='';checkAvailability();loadTimeline();loadRentalCalendar({keepView:true});});
 box.querySelectorAll('[data-day]').forEach(button=>button.addEventListener('click',()=>{
  if(usesTimeline()){
   // Two taps still mean a range: the first names the day it is collected, the second says how far
   // it runs. The length is what gets stored, so the stepper below says the same thing.
   const day=button.dataset.day;
   if(!isFitting()&&booking.from&&!booking.lengthPicked&&day>booking.from){
    booking.days=Math.min(maxRentalDays(),Math.round((Date.parse(day+'T00:00:00Z')-Date.parse(booking.from+'T00:00:00Z'))/86400000));
    booking.lengthPicked=true;
   }else{bookingFrom.value=day;booking.days=1;booking.lengthPicked=false;booking.slot='';}
  }else if(!booking.from||booking.to){bookingFrom.value=button.dataset.day;bookingTo.value='';}
  else bookingTo.value=button.dataset.day;
  syncBookingDates();renderDuration();checkAvailability();loadRentalCalendar({keepView:true});loadTimeline();
 }));
}
async function loadRentalCalendar({keepView=false}={}){
 const p=selected;if(!p||p.inventory?.managed!==true)return;
 const seq=++calendarSeq;
 const box=document.getElementById('booking-calendar');
 // Choosing a day only changes the selection, not the month, so repaint what we already have
 // right away and let fresh availability land underneath. Showing a placeholder for every tap
 // made the calendar blink for the length of a round trip.
 if(keepView&&calendarData){renderRentalCalendar({fresh:false});box.setAttribute('aria-busy','true');}
 else{
  calendarData=null;
  const height=box.getBoundingClientRect().height;if(height)box.style.minHeight=height+'px';
  box.setAttribute('aria-busy','true');box.textContent=bt('checking');
 }
 calendarMonth=calendarMonth||(booking.from||localToday()).slice(0,7);
 const query=new URLSearchParams({month:calendarMonth,size:bookingSize.value});
 if(booking.from&&!booking.to)query.set('start',booking.from);
 try{
  const response=await fetch('/api/products/'+encodeURIComponent(p.id)+'/calendar?'+query,{cache:'no-store'});
  if(!response.ok)throw new Error('Calendar unavailable');const data=await response.json();
  if(seq!==calendarSeq||selected?.id!==p.id)return;
  calendarData=data;renderRentalCalendar({fresh:!keepView});
 }catch{
  if(seq!==calendarSeq||selected?.id!==p.id)return;
  box.removeAttribute('aria-busy');box.style.minHeight='';
  box.innerHTML='<p>'+escapeMarkup(bt('apiDown'))+'</p><button type="button">'+escapeMarkup(bt('retryCalendar'))+'</button>';
  box.querySelector('button').addEventListener('click',()=>loadRentalCalendar());
 }
}
function refreshBookingText(){
 const notice=document.getElementById('booking-handoff-notice');
 notice.textContent=localizedText(store.store?.text?.handoffNotice);notice.hidden=!notice.textContent;
 document.querySelectorAll('[data-booking-i18n]').forEach(el=>{el.textContent=bt(el.dataset.bookingI18n);});
 document.getElementById('close-booking').setAttribute('aria-label',bt('close'));
 // Contact channel cards: real radio inputs (keyboard + screen readers) dressed as tappable cards.
 const channels=document.getElementById('booking-channels');
 const current=bookingForm.elements.preferred_contact_channel?.value||'zalo';
 channels.innerHTML=BOOKING_CHANNELS.map(c=>`<label class="channel-card" for="channel-${c}"><input type="radio" id="channel-${c}" name="preferred_contact_channel" value="${c}" class="sr-only"${c===current?' checked':''}><span class="channel-mark" aria-hidden="true"></span><span class="channel-name">${escapeMarkup(bt('channels')[c])}</span><span class="channel-hint">${escapeMarkup(bt('channelHints')[c])}</span></label>`).join('');
 // Consent sentence with the policy link inside it.
 const [before,after]=bt('consent').split('{policy}');
 document.getElementById('consent-text').innerHTML=`${escapeMarkup(before)}<a href="/privacy?lang=${encodeURIComponent(language)}" target="_blank" rel="noopener noreferrer">${escapeMarkup(bt('policy'))}</a>${escapeMarkup(after??'')}`;
 renderBookingPolicy();
 syncChannelFields();
 fillSizes();
 renderBookingStatus();
 renderTurnstileWarning();
 renderPurpose();renderBookingFields();renderDuration();renderTimeline();renderPlan();
 renderRentalCalendar({fresh:false});renderRentalPrice();
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
// The store's own rental terms (booking.policy in config/store.yaml): deposit, late return, damage.
// One term per line; a store that wrote none shows nothing.
function renderBookingPolicy(){
 const box=document.getElementById('booking-policy');if(!box)return;
 const terms=String(localizedText(store.booking?.policy)||'').split('\n').map(term=>term.trim()).filter(Boolean);
 box.hidden=!terms.length;
 box.innerHTML=terms.length?`<p class="booking-policy-title">${escapeMarkup(bt('policyTitle'))}</p><ul>${terms.map(term=>`<li>${escapeMarkup(term)}</li>`).join('')}</ul>`:'';
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
  booking={productId:p.id,from:range?.from||'',to:'',size:'',slot:'',days:1,lengthPicked:false,purpose:'rental',available:false,checkSeq:booking.checkSeq};
  bookingFrom.value=booking.from;bookingTo.value=booking.to;calendarMonth=(booking.from||localToday()).slice(0,7);
 }
 bookingFrom.min=localToday();bookingTo.min=booking.from||localToday();
 fillSizes();
 renderPurpose();renderBookingFields();syncBookingDates();renderDuration();
 checkAvailability();loadRentalCalendar();loadTimeline();
}
function renderBookingStatus(state=bookingStatus.dataset.state||''){
 if(usesTimeline()&&state!=='apiDown')state=booking.slot?'available':(timelineData?'pickupAt':isoDate(booking.from)?'checking':'pickDates');
 bookingStatus.dataset.state=state;
 bookingStatus.className='booking-status'+(state==='available'?' is-available':state==='unavailable'?' is-unavailable':'');
 bookingStatus.textContent=state?bt(state):'';
 if(usesTimeline()){
  booking.available=Boolean(timelineData?.slots?.some(slot=>slot.time===booking.slot&&['available','low'].includes(slot.state)));
  bookingOpen.disabled=!booking.available;
  bookingOpen.firstElementChild.textContent=bt('review');
 }else bookingOpen.disabled=state!=='available';
}
async function checkAvailability(){
 const p=selected;if(!p)return;
 const seq=++booking.checkSeq;
 booking.size=bookingSize.value;
 if(usesTimeline()){renderRentalPrice();renderBookingStatus(booking.slot?'available':'pickDates');return;}
 booking.from=bookingFrom.value;booking.to=bookingTo.value;booking.size=bookingSize.value;booking.available=false;
 renderRentalPrice();
 if(!isoDate(booking.from)||!isoDate(booking.to)||booking.from>booking.to){renderBookingStatus('pickDates');return;}
 renderBookingStatus('checking');
 try{
  const query=new URLSearchParams({from:booking.from,to:booking.to});
  if(booking.size)query.set('size',booking.size);
  const response=await fetch(`/api/products/${encodeURIComponent(p.id)}/availability?${query}`,{cache:'no-cache'});
  if(!response.ok)throw new Error(`HTTP ${response.status}`);
  const data=await response.json();
  if(seq!==booking.checkSeq||selected?.id!==p.id)return;
  booking.available=data.available>0;renderRentalPrice(data.quote);
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
 // A different day means a different axis, and the hour that was chosen on the old one is gone.
 booking.slot='';
 syncBookingDates();renderDuration();checkAvailability();loadTimeline();
}
bookingFrom.addEventListener('change',onBookingDates);bookingTo.addEventListener('change',onBookingDates);bookingSize.addEventListener('change',()=>{booking.slot='';checkAvailability();loadTimeline();loadRentalCalendar();});

// --- The request form -------------------------------------------------------------------------------
// Cloudflare Turnstile (free). The Worker tells the page the site key and whether the secret is set
// too; with either missing the form still works, and a warning aimed at the shop owner is shown in
// place of the widget so a half-configured deployment is noticed on the first visit.
let turnstileSiteKey=null,turnstileWidget=null,turnstileState=null;
// Any element id lands on window, so a container called "turnstile" would both hide the API from
// us and stop api.js installing it at all. The container is named apart from it; this still tests
// for the API rather than the global, so a stray id elsewhere cannot break the widget silently.
const turnstileApi=()=>typeof window.turnstile?.render==='function'?window.turnstile:null;
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
 const box=document.getElementById('booking-turnstile');
 box.hidden=!turnstileSiteKey;
 if(!turnstileSiteKey)return;
 if(!turnstileApi()){
  await new Promise(resolve=>{const s=document.createElement('script');s.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';s.async=true;s.onload=resolve;s.onerror=resolve;document.head.append(s);});
 }
 const api=turnstileApi();
 if(!api)return;
 if(turnstileWidget!==null){api.reset(turnstileWidget);return;}
 turnstileWidget=api.render(box,{sitekey:turnstileSiteKey,language:language==='zh'?'zh-cn':language})??null;
}
function openBookingForm(){
 const p=selected;if(!p||!booking.available)return;
 bookingError.textContent='';clearConsentError();
 bookingForm.hidden=false;bookingDone.hidden=true;bookingDone.dataset.id='';
 document.getElementById('booking-summary').innerHTML=`<b>${escapeMarkup(productName(p))}</b><span>${escapeMarkup(bt('from'))}: ${escapeMarkup(formatDate(booking.from))}</span><span>${escapeMarkup(bt('to'))}: ${escapeMarkup(formatDate(booking.to))}</span>${booking.size?`<span>${escapeMarkup(bt('size'))}: ${escapeMarkup(booking.size)}</span>`:''}${booking.slot?(isFitting()
  ?`<span>${escapeMarkup(bt('planVisit'))}: ${escapeMarkup(formatDate(booking.from)+' '+booking.slot)}</span><span>${escapeMarkup(bt('planLength'))}: ${escapeMarkup(fittingMinutes()+bt('minutesUnit'))}</span>`
  :`<span>${escapeMarkup(bt('pickupAt'))}: ${escapeMarkup(formatDate(booking.from)+' '+booking.slot)}</span><span>${escapeMarkup(bt('planDue'))}: ${escapeMarkup(formatDate(booking.to)+' '+booking.slot)}</span>`):''}`;
 const price=document.createElement('strong');price.textContent=rentalPriceText();document.getElementById('booking-summary').append(price);
 refreshBookingText();
 if(!bookingDialog.open)bookingDialog.showModal();
 loadTurnstile().catch(error=>console.warn('Turnstile failed to load:',error));
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
 if(status===400&&data?.fields?.start_time)return errors.chooseWindow;
 return data?.message||errors[status?'validation_error':'network'];
}
function renderDone(result){
 const t=bookingCopy[language]||bookingCopy.vi;
 const messenger=result.preferred_contact_channel==='messenger';
 const messengerUrl=store.contact?.messenger||'';
 const contactUrl=messenger?messengerUrl:chatUrl();
 bookingDone.dataset.result=JSON.stringify(result);bookingDone.dataset.id=result.id||'';
 bookingDone.innerHTML=`${result.quote?'<p class="rental-total">'+escapeMarkup(rentalPriceText(result.quote))+'</p>':''}<h2>${escapeMarkup(t.doneTitle)}</h2><p>${escapeMarkup(result.duplicate?(messenger?t.doneSent:t.doneDuplicate):t.doneSent)}</p><p class="booking-id"><span>${escapeMarkup(t.doneId)}</span><b>${escapeMarkup(result.id||'')}</b></p>${messenger?`<p class="booking-next" role="note"><span class="booking-next-mark" aria-hidden="true">!</span><span>${escapeMarkup(t.messengerNext)}</span></p>`:`<p>${escapeMarkup(t.doneContact)}</p>`}<p class="booking-terms">${escapeMarkup(t.doneNote)}</p><div class="booking-done-actions">${messenger?`<button type="button" class="button" id="booking-copy-id">${escapeMarkup(t.copyId)}</button><p id="booking-copy-status" role="status" aria-live="polite"></p>`:''}${contactUrl?`<a class="button chat" href="${escapeMarkup(contactUrl)}" target="_blank" rel="noopener noreferrer"><span>${escapeMarkup(messenger?t.openMessenger:t.doneMessenger)}</span><span>↗</span></a>`:''}<button type="button" class="text-link" id="booking-done-close">${escapeMarkup(t.close)}</button></div>`;
 document.getElementById('booking-copy-id')?.addEventListener('click',async()=>{
  const status=document.getElementById('booking-copy-status');
  try{await navigator.clipboard.writeText(result.id||'');status.textContent=bt('idCopied');}
  catch{status.textContent=bt('copyFailed');const range=document.createRange();range.selectNodeContents(bookingDone.querySelector('.booking-id b'));const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);}
 });
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
 if(!f.privacy_consent.checked){document.getElementById('consent-row').classList.add('is-invalid');return fail(errors.consent,f.privacy_consent);}
 clearConsentError();
 Object.assign(body,{privacy_consent:true,privacy_consent_at:new Date().toISOString(),product_id:p.id,size:booking.size,start_date:booking.from,end_date:booking.to});
  // The length, not a second date: the Worker works the return out the same way the page does.
  if(usesTimeline()){
   if(!booking.slot)return fail(errors.chooseWindow);
   body.start_time=booking.slot;body.purpose=booking.purpose;
   if(!isFitting())body.rental_days=Math.max(1,booking.days);
  }
 if(turnstileSiteKey&&turnstileApi()&&turnstileWidget!=null)body.turnstile_token=turnstileApi().getResponse(turnstileWidget)||'';
 const submit=document.getElementById('booking-submit');
 submit.disabled=true;submit.firstElementChild.textContent=bt('sending');bookingError.textContent='';
 try{
  const response=await fetch('/api/reservation-requests',{method:'POST',headers:{'content-type':'application/json','x-requested-with':'fetch'},body:JSON.stringify(body)});
  const data=await response.json().catch(()=>null);
  if(!response.ok){
   bookingError.textContent=describeBookingError(data,response.status);
   if(data?.error==='unavailable'){booking.available=false;booking.slot='';renderPlan();renderBookingStatus('unavailable');loadRentalCalendar();if(usesTimeline())loadTimeline();}
   if(turnstileWidget!=null&&turnstileApi())turnstileApi().reset(turnstileWidget);
   return;
  }
  bookingForm.hidden=true;bookingDone.hidden=false;
  renderDone({...data.request,preferred_contact_channel:channel,duplicate:Boolean(data.duplicate)});
  bookingForm.reset();
 }catch(error){console.warn('Booking request failed:',error);bookingError.textContent=errors.network;}
 finally{submit.disabled=false;submit.firstElementChild.textContent=bt('submit');}
});
// The product dialog closing takes the booking dialog with it.
document.getElementById('product-dialog').addEventListener('close',()=>{if(bookingDialog.open)bookingDialog.close();booking={productId:'',from:'',to:'',size:'',slot:'',days:1,lengthPicked:false,purpose:'rental',available:false,checkSeq:booking.checkSeq};timelineData=null;timelineSeq++;bookingBlock.hidden=true;calendarSeq++;calendarData=null;calendarMonth='';booking.checkSeq++;renderBookingStatus('');});
refreshBookingText();
