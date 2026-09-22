// Tiemora admin: a hash-routed page over /api/admin/*. Product names and photos come from the same
// /catalog.json the storefront uses and the store name / languages from /store.json; the database
// only knows inventory items, their status, bookings and push subscriptions.
const T={
 en:{adminTitle:'ADMIN',navDashboard:'Dashboard',navInventory:'Inventory',navReservations:'Bookings',navSettings:'Settings',logout:'Sign out',
  products:'Products',items:'Inventory items',rentedNow:'Rented now',upcoming:'Upcoming',maintenance:'In maintenance',returnsToday:'Returns today',pickupsToday:'Pick-ups today',today:'Today',
  itemStatus:{available:'Available',reserved:'Reserved',rented:'Rented',maintenance:'Maintenance',inactive:'Inactive'},
  reservationStatus:{pending:'Pending',confirmed:'Confirmed',rented:'Rented',returned:'Returned',cancelled:'Cancelled'},
  customer:'Customer',phone:'Phone',facebook:'Facebook',start:'Start date',end:'End date',product:'Product',size:'Size',item:'Item ID',note:'Note',status:'Status',id:'ID',reservation:'Booking',
  add:'Add',save:'Save',back:'Back',newItem:'Add item',newReservation:'New booking',autoPick:'Pick a free item',addLine:'Add product',remove:'Remove',confirm:'Confirm',handOver:'Hand over',returned:'Returned',cancelReservation:'Cancel booking',filter:'Filter',clear:'Clear',search:'Name / phone / Facebook',all:'All',anySize:'Any size',
  saved:'Saved.',created:'Created.',deleted:'Deleted.',cancelled:'Booking cancelled.',loading:'Loading…',empty:'Nothing here yet.',confirmDelete:'Remove this item from the inventory?',confirmCancel:'Cancel this booking?',pickDates:'Choose start and end dates first.',pickProduct:'Choose a product.',notInCatalog:'Not in catalog',free:'Free',taken:'Taken',noItems:'This product has no inventory items yet.',noFree:'No free item for these dates.',needItem:'Choose an item on every line.',
  idHint:'Suggested from the existing items. You can edit it.',inventoryOf:'Inventory',reservationsOf:'Bookings of this item',
  contact:'Contact',preferred:'Preferred channel',primary:'Preferred',whatsapp:'WhatsApp',zalo:'Zalo',messenger:'Messenger',messengerUrl:'Messenger link',zaloPhone:'Zalo number',usePhone:'Use phone number',notRegistered:'Not set',sameAsPhone:'Same as phone',privacyConsent:'Privacy consent',consentAccepted:'✓ Accepted',consentNone:'Not recorded (created by staff)',consentAt:'Consented at',
  contactChannel:{'':'—',messenger:'Messenger',zalo:'Zalo',whatsapp:'WhatsApp',phone:'Phone',other:'Other'},
  notification:'Customer notification',notificationStatus:{not_sent:'Not sent',sent:'Sent'},notificationChannel:{whatsapp:'WhatsApp',messenger:'Messenger',zalo:'Zalo',phone:'Phone',copy:'Copied',other:'Other'},
  language:'Language',message:'Message',sendWhatsapp:'Send on WhatsApp',openMessenger:'Open Messenger',call:'Call',copyZalo:'Copy Zalo number',copyPhone:'Copy phone number',copyMessage:'Copy message',copySummary:'Copy booking summary',copied:'Copied',
  markSent:'✓ Mark customer as notified',markNotSent:'Reset to not sent',channel:'Channel',sentAt:'Sent at',notificationNote:'Note',notifyPending:'Confirm the booking first, then notify the customer.',noPhone:'No phone number',
  needNotification:'Customers to notify',newRequests:'New requests',overdue:'Overdue returns',notifications:'Notifications',noAlerts:'Nothing needs your attention.',open:'Open',bookingsNeedNotification:'bookings waiting for a customer notification',
  request:'Booking request',requested:'Requested',confirmRequest:'Confirm booking',requestHint:'No inventory item is assigned yet. Press "Confirm booking" to re-check stock and assign a free item automatically, or pick one below and save.',source:{admin:'Store',public:'Website'},otherSizes:'Free sizes',
  settings:'Settings',pushTitle:'Push notifications on this device',pushDescription:'Get a notification on this phone or computer when a new booking request arrives from the website. Each device subscribes separately.',pushEnable:'Enable on this device',pushDisable:'Disable on this device',pushEnabled:'Enabled on this device',pushNotConfigured:'Web Push is not configured on the server (VAPID keys missing). See docs/deployment-cloudflare.md.',pushUnsupported:'This browser does not support Web Push. On iPhone, add the admin to the home screen first.',pushDenied:'Notifications are blocked for this site in the browser settings.',pushTest:'Send a test notification',pushTestSent:'Test sent to {n} device(s).',pushDevices:'Subscribed devices',pushThisDevice:'this device',pushRemove:'Remove',pushFailed:'Could not subscribe.',
  storeConfig:'Store configuration',storeName:'Store name',languages:'Languages',timezone:'Time zone',currency:'Currency',configHint:'Edit config/store.yaml and rebuild to change these.',
  navOrders:'Orders',orders:'Orders',order:'Order',newOrder:'New order',newOrders:'New orders',orderNumber:'Order no.',quantity:'Qty',fulfillment:'Pickup / Delivery',fulfillmentType:{pickup:'Pickup',delivery:'Delivery'},date:'Date',timeSlot:'Time slot',noSlot:'No slot',total:'Total',
  orderStatus:{pending:'Pending',confirmed:'Confirmed',preparing:'Preparing',ready:'Ready',out_for_delivery:'Out for delivery',completed:'Completed',cancelled:'Cancelled'},
  orderAction:{confirmed:'Confirm order',preparing:'Start preparing',ready:'Mark ready',out_for_delivery:'Out for delivery',completed:'Completed',cancelled:'Cancel order'},confirmCancelOrder:'Cancel this order?',
  recipient:'Recipient',recipientPhone:'Recipient phone',address:'Delivery address',deliveryNote:'Delivery note',messageCard:'Card message',noCard:'No card message',options:'Options',addons:'Add-ons',unitPrice:'Unit price',deliveryFee:'Delivery fee',
  schedule:'Schedule',pickupSchedule:'Pickup schedule',deliverySchedule:'Delivery schedule',ordersToday:'Orders today',pickupsTodayOrders:'Pickups today',deliveriesToday:'Deliveries today',upcomingOrders:'Upcoming orders',ordersNeedNotification:'orders waiting for a customer notification',orderNotifyPending:'Confirm the order first, then notify the customer.',
  capacity:'Capacity',used:'used',unlimited:'no limit',copyOrderSummary:'Copy order summary',pickDate:'Choose a date.',readOnly:'Demo mode: this admin is read-only. You can browse everything, but changes are not saved.',
  errors:{read_only:'Demo mode: changes are not saved.',capacity_full:'This time slot is full.',sold_out:'This product is sold out.',invalid_transition:'This status change is not allowed from the current status.',inventory_conflict:'This item is already booked for those dates.',inventory_unavailable:'No free item (or the item is in maintenance / inactive) for these dates.',inventory_exists:'This item ID already exists.',inventory_in_use:'This item is used by a booking. Set it to "Inactive" instead of deleting it.',not_pending:'This booking is no longer pending.',unauthorized:'Your session has expired. Please sign in again.',validation_error:'Please check the input.',not_found:'Not found.',network:'Could not reach the server.'}},
 vi:{adminTitle:'QUẢN LÝ CỬA HÀNG',navDashboard:'Tổng quan',navInventory:'Kho hàng',navReservations:'Đặt lịch',navSettings:'Cài đặt',logout:'Đăng xuất',
  products:'Sản phẩm',items:'Hàng thực tế',rentedNow:'Đang cho thuê',upcoming:'Lịch sắp tới',maintenance:'Đang bảo trì',returnsToday:'Trả hôm nay',pickupsToday:'Giao hôm nay',today:'Hôm nay',
  itemStatus:{available:'Có sẵn',reserved:'Đã giữ',rented:'Đang cho thuê',maintenance:'Bảo trì',inactive:'Ngừng dùng'},
  reservationStatus:{pending:'Chờ xác nhận',confirmed:'Đã xác nhận',rented:'Đã giao',returned:'Đã trả',cancelled:'Đã hủy'},
  customer:'Khách hàng',phone:'Điện thoại',facebook:'Facebook',start:'Ngày thuê',end:'Ngày trả',product:'Sản phẩm',size:'Cỡ',item:'Mã hàng',note:'Ghi chú',status:'Trạng thái',id:'Mã',reservation:'Đặt lịch',
  add:'Thêm',save:'Lưu',back:'Quay lại',newItem:'Thêm hàng',newReservation:'Tạo đặt lịch',autoPick:'Tự chọn hàng trống',addLine:'Thêm sản phẩm',remove:'Xóa',confirm:'Xác nhận',handOver:'Đã giao hàng',returned:'Đã nhận trả',cancelReservation:'Hủy đặt lịch',filter:'Lọc',clear:'Xóa lọc',search:'Tìm tên / SĐT / Facebook',all:'Tất cả',anySize:'Mọi cỡ',
  saved:'Đã lưu.',created:'Đã tạo.',deleted:'Đã xóa.',cancelled:'Đã hủy đặt lịch.',loading:'Đang tải…',empty:'Chưa có dữ liệu.',confirmDelete:'Xóa mã hàng này khỏi kho?',confirmCancel:'Hủy đặt lịch này?',pickDates:'Chọn ngày thuê và ngày trả trước.',pickProduct:'Chọn sản phẩm.',notInCatalog:'Không có trong catalog',free:'Trống',taken:'Đã đặt',noItems:'Sản phẩm này chưa có hàng trong kho.',noFree:'Không còn hàng trống cho khoảng ngày này.',needItem:'Mỗi dòng cần chọn một mã hàng.',
  idHint:'Gợi ý theo số hàng hiện có. Có thể sửa.',inventoryOf:'Hàng trong kho',reservationsOf:'Lịch của mã này',
  contact:'Liên hệ',preferred:'Kênh liên hệ ưu tiên',primary:'Ưu tiên',whatsapp:'WhatsApp',zalo:'Zalo',messenger:'Messenger',messengerUrl:'Link Messenger',zaloPhone:'Số Zalo',usePhone:'Dùng số điện thoại',notRegistered:'Chưa có',sameAsPhone:'Giống số điện thoại',privacyConsent:'Đồng ý bảo mật',consentAccepted:'✓ Đã đồng ý',consentNone:'Chưa ghi nhận (tạo tại cửa hàng)',consentAt:'Thời điểm đồng ý',
  contactChannel:{'':'—',messenger:'Messenger',zalo:'Zalo',whatsapp:'WhatsApp',phone:'Điện thoại',other:'Khác'},
  notification:'Thông báo cho khách',notificationStatus:{not_sent:'Chưa gửi',sent:'Đã gửi'},notificationChannel:{whatsapp:'WhatsApp',messenger:'Messenger',zalo:'Zalo',phone:'Điện thoại',copy:'Sao chép',other:'Khác'},
  language:'Ngôn ngữ',message:'Nội dung tin nhắn',sendWhatsapp:'Gửi qua WhatsApp',openMessenger:'Mở Messenger',call:'Gọi',copyZalo:'Sao chép số Zalo',copyPhone:'Sao chép SĐT',copyMessage:'Sao chép tin nhắn',copySummary:'Sao chép thông tin đặt lịch',copied:'Đã sao chép',
  markSent:'✓ Đã thông báo cho khách',markNotSent:'Đặt lại: chưa gửi',channel:'Kênh',sentAt:'Gửi lúc',notificationNote:'Ghi chú gửi',notifyPending:'Xác nhận đặt lịch trước, rồi gửi thông báo cho khách.',noPhone:'Chưa có số điện thoại',
  needNotification:'Cần thông báo khách',newRequests:'Yêu cầu mới',overdue:'Quá hạn trả',notifications:'Thông báo',noAlerts:'Không có việc cần làm.',open:'Mở',bookingsNeedNotification:'đặt lịch cần thông báo cho khách',
  request:'Yêu cầu đặt chỗ',requested:'Khách yêu cầu',confirmRequest:'Xác nhận đặt chỗ',requestHint:'Chưa gắn hàng thực tế. Bấm "Xác nhận đặt chỗ" để hệ thống kiểm tra kho và tự chọn hàng trống, hoặc tự chọn bên dưới rồi lưu.',source:{admin:'Cửa hàng',public:'Website'},otherSizes:'Cỡ còn trống',
  settings:'Cài đặt',pushTitle:'Thông báo đẩy trên thiết bị này',pushDescription:'Nhận thông báo trên điện thoại / máy tính này khi có yêu cầu đặt chỗ mới từ website. Mỗi thiết bị đăng ký riêng.',pushEnable:'Bật trên thiết bị này',pushDisable:'Tắt trên thiết bị này',pushEnabled:'Đã bật trên thiết bị này',pushNotConfigured:'Web Push chưa được cấu hình trên máy chủ (thiếu khóa VAPID). Xem docs/deployment-cloudflare.md.',pushUnsupported:'Trình duyệt này không hỗ trợ Web Push. Trên iPhone, hãy thêm trang quản lý vào màn hình chính trước.',pushDenied:'Thông báo đang bị chặn cho trang này trong cài đặt trình duyệt.',pushTest:'Gửi thông báo thử',pushTestSent:'Đã gửi thử tới {n} thiết bị.',pushDevices:'Thiết bị đã đăng ký',pushThisDevice:'thiết bị này',pushRemove:'Xóa',pushFailed:'Không đăng ký được.',
  storeConfig:'Cấu hình cửa hàng',storeName:'Tên cửa hàng',languages:'Ngôn ngữ',timezone:'Múi giờ',currency:'Tiền tệ',configHint:'Sửa config/store.yaml và build lại để thay đổi.',
  navOrders:'Đơn hàng',orders:'Đơn hàng',order:'Đơn hàng',newOrder:'Tạo đơn',newOrders:'Đơn mới',orderNumber:'Mã đơn',quantity:'SL',fulfillment:'Nhận / Giao',fulfillmentType:{pickup:'Nhận tại tiệm',delivery:'Giao tận nơi'},date:'Ngày',timeSlot:'Khung giờ',noSlot:'Không có khung giờ',total:'Tổng',
  orderStatus:{pending:'Chờ xác nhận',confirmed:'Đã xác nhận',preparing:'Đang làm',ready:'Sẵn sàng',out_for_delivery:'Đang giao',completed:'Hoàn tất',cancelled:'Đã hủy'},
  orderAction:{confirmed:'Xác nhận đơn',preparing:'Bắt đầu làm',ready:'Đã xong',out_for_delivery:'Đang giao',completed:'Hoàn tất',cancelled:'Hủy đơn'},confirmCancelOrder:'Hủy đơn này?',
  recipient:'Người nhận',recipientPhone:'SĐT người nhận',address:'Địa chỉ giao',deliveryNote:'Ghi chú giao',messageCard:'Lời nhắn trên thiệp',noCard:'Không có lời nhắn',options:'Tùy chọn',addons:'Thêm',unitPrice:'Đơn giá',deliveryFee:'Phí giao',
  schedule:'Lịch',pickupSchedule:'Lịch nhận tại tiệm',deliverySchedule:'Lịch giao',ordersToday:'Đơn hôm nay',pickupsTodayOrders:'Nhận tại tiệm hôm nay',deliveriesToday:'Giao hôm nay',upcomingOrders:'Đơn sắp tới',ordersNeedNotification:'đơn cần thông báo cho khách',orderNotifyPending:'Xác nhận đơn trước, rồi thông báo cho khách.',
  capacity:'Sức chứa',used:'đã dùng',unlimited:'không giới hạn',copyOrderSummary:'Sao chép thông tin đơn',pickDate:'Chọn ngày.',readOnly:'Chế độ demo: trang quản lý chỉ xem. Bạn có thể xem mọi thứ nhưng thay đổi không được lưu.',
  errors:{read_only:'Chế độ demo: thay đổi không được lưu.',capacity_full:'Khung giờ này đã hết chỗ.',sold_out:'Sản phẩm này đã hết hàng.',invalid_transition:'Không thể chuyển sang trạng thái này từ trạng thái hiện tại.',inventory_conflict:'Hàng này đã được đặt trong khoảng ngày đó.',inventory_unavailable:'Không còn hàng trống (hoặc đang bảo trì / ngừng dùng) cho khoảng ngày này.',inventory_exists:'Mã hàng đã tồn tại.',inventory_in_use:'Mã hàng đang nằm trong đặt lịch. Hãy chuyển sang "Ngừng dùng" thay vì xóa.',not_pending:'Đặt lịch này không còn ở trạng thái chờ xác nhận.',unauthorized:'Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.',validation_error:'Dữ liệu chưa hợp lệ.',not_found:'Không tìm thấy.',network:'Không kết nối được máy chủ.'}},
 ja:{adminTitle:'店舗管理',navDashboard:'ダッシュボード',navInventory:'在庫',navReservations:'予約',navSettings:'設定',logout:'ログアウト',
  products:'商品数',items:'実在庫数',rentedNow:'貸出中',upcoming:'今後の予約',maintenance:'メンテナンス中',returnsToday:'今日返却予定',pickupsToday:'今日貸出開始',today:'今日',
  itemStatus:{available:'利用可',reserved:'予約済',rented:'貸出中',maintenance:'メンテナンス',inactive:'無効'},
  reservationStatus:{pending:'保留',confirmed:'確定',rented:'貸出中',returned:'返却済',cancelled:'キャンセル'},
  customer:'顧客名',phone:'電話',facebook:'Facebook',start:'貸出日',end:'返却日',product:'商品',size:'サイズ',item:'在庫ID',note:'備考',status:'状態',id:'ID',reservation:'予約',
  add:'追加',save:'保存',back:'戻る',newItem:'在庫追加',newReservation:'予約作成',autoPick:'空いている実物を自動選択',addLine:'商品を追加',remove:'削除',confirm:'確定',handOver:'貸出（引き渡し）',returned:'返却処理',cancelReservation:'予約をキャンセル',filter:'絞り込み',clear:'クリア',search:'名前 / 電話 / Facebook',all:'すべて',anySize:'全サイズ',
  saved:'保存しました。',created:'作成しました。',deleted:'削除しました。',cancelled:'予約をキャンセルしました。',loading:'読み込み中…',empty:'データがありません。',confirmDelete:'この在庫を削除しますか？',confirmCancel:'この予約をキャンセルしますか？',pickDates:'先に貸出日と返却日を選択してください。',pickProduct:'商品を選択してください。',notInCatalog:'カタログにありません',free:'空き',taken:'予約あり',noItems:'この商品には在庫が登録されていません。',noFree:'この期間に空いている在庫がありません。',needItem:'各行で在庫IDを選択してください。',
  idHint:'既存の在庫数から自動提案。編集できます。',inventoryOf:'在庫一覧',reservationsOf:'この在庫の予約',
  contact:'連絡先',preferred:'希望の連絡チャネル',primary:'優先',whatsapp:'WhatsApp',zalo:'Zalo',messenger:'Messenger',messengerUrl:'Messenger URL',zaloPhone:'Zalo番号',usePhone:'電話番号を使用',notRegistered:'未登録',sameAsPhone:'電話番号と同じ',privacyConsent:'プライバシー同意',consentAccepted:'✓ 同意済み',consentNone:'記録なし（店舗で作成）',consentAt:'同意日時',
  contactChannel:{'':'—',messenger:'Messenger',zalo:'Zalo',whatsapp:'WhatsApp',phone:'電話',other:'その他'},
  notification:'顧客通知',notificationStatus:{not_sent:'未送信',sent:'送信済み'},notificationChannel:{whatsapp:'WhatsApp',messenger:'Messenger',zalo:'Zalo',phone:'電話',copy:'コピー',other:'その他'},
  language:'言語',message:'通知文',sendWhatsapp:'WhatsAppで送信',openMessenger:'Messengerで開く',call:'電話をかける',copyZalo:'Zalo番号をコピー',copyPhone:'電話番号をコピー',copyMessage:'通知文をコピー',copySummary:'予約情報をコピー',copied:'コピーしました',
  markSent:'✓ 顧客へ通知済みにする',markNotSent:'未送信に戻す',channel:'チャネル',sentAt:'送信日時',notificationNote:'送信メモ',notifyPending:'先に予約を確定してから顧客へ通知してください。',noPhone:'電話番号がありません',
  needNotification:'未通知の確定予約',newRequests:'新規申請',overdue:'返却期限超過',notifications:'通知',noAlerts:'対応が必要な項目はありません。',open:'開く',bookingsNeedNotification:'件の予約が顧客通知待ちです',
  request:'予約申請',requested:'希望内容',confirmRequest:'予約を確定する',requestHint:'まだ実物在庫が割り当てられていません。「予約を確定する」を押すと在庫を再確認して空いている実物を自動で割り当てます。下で手動選択して保存することもできます。',source:{admin:'店舗',public:'Web'},otherSizes:'空いているサイズ',
  settings:'設定',pushTitle:'この端末のプッシュ通知',pushDescription:'Web サイトから新しい予約申請が届いたとき、このスマートフォン / PC に通知します。端末ごとに登録が必要です。',pushEnable:'この端末で有効にする',pushDisable:'この端末で無効にする',pushEnabled:'この端末で有効',pushNotConfigured:'サーバー側で Web Push が設定されていません（VAPID 鍵がありません）。docs/deployment-cloudflare.md を参照してください。',pushUnsupported:'このブラウザは Web Push に対応していません。iPhone では先に管理画面をホーム画面に追加してください。',pushDenied:'ブラウザの設定でこのサイトの通知がブロックされています。',pushTest:'テスト通知を送る',pushTestSent:'{n} 台の端末にテストを送りました。',pushDevices:'登録済みの端末',pushThisDevice:'この端末',pushRemove:'削除',pushFailed:'登録できませんでした。',
  storeConfig:'店舗設定',storeName:'店舗名',languages:'言語',timezone:'タイムゾーン',currency:'通貨',configHint:'変更するには config/store.yaml を編集して再ビルドしてください。',
  navOrders:'注文',orders:'注文',order:'注文',newOrder:'注文作成',newOrders:'新規注文',orderNumber:'注文番号',quantity:'数量',fulfillment:'受取 / 配送',fulfillmentType:{pickup:'店頭受取',delivery:'配送'},date:'日付',timeSlot:'時間帯',noSlot:'時間帯なし',total:'合計',
  orderStatus:{pending:'未確認',confirmed:'確定',preparing:'制作中',ready:'準備完了',out_for_delivery:'配送中',completed:'完了',cancelled:'キャンセル'},
  orderAction:{confirmed:'注文を確定',preparing:'制作開始',ready:'準備完了にする',out_for_delivery:'配送開始',completed:'完了',cancelled:'注文をキャンセル'},confirmCancelOrder:'この注文をキャンセルしますか？',
  recipient:'受取人',recipientPhone:'受取人の電話',address:'配送先',deliveryNote:'配送メモ',messageCard:'カードメッセージ',noCard:'メッセージなし',options:'オプション',addons:'追加',unitPrice:'単価',deliveryFee:'配送料',
  schedule:'スケジュール',pickupSchedule:'店頭受取スケジュール',deliverySchedule:'配送スケジュール',ordersToday:'今日の注文',pickupsTodayOrders:'今日の店頭受取',deliveriesToday:'今日の配送',upcomingOrders:'今後の注文',ordersNeedNotification:'件の注文が顧客通知待ちです',orderNotifyPending:'先に注文を確定してから顧客へ通知してください。',
  capacity:'枠',used:'使用',unlimited:'上限なし',copyOrderSummary:'注文情報をコピー',pickDate:'日付を選択してください。',readOnly:'デモモード: この管理画面は閲覧専用です。変更は保存されません。',
  errors:{read_only:'デモモード: 変更は保存されません。',capacity_full:'この時間帯は満枠です。',sold_out:'この商品は売り切れです。',invalid_transition:'現在の状態からこの状態には変更できません。',inventory_conflict:'この期間は既に予約済みです。',inventory_unavailable:'この期間に空いている在庫がありません（またはメンテナンス中 / 無効）。',inventory_exists:'この在庫IDは既に存在します。',inventory_in_use:'この在庫は予約で使用中です。削除せず「無効」に変更してください。',not_pending:'この予約は保留状態ではありません。',unauthorized:'セッションが切れました。再ログインしてください。',validation_error:'入力内容を確認してください。',not_found:'見つかりません。',network:'サーバーに接続できません。'}}
};
const CONTACT_CHANNELS=['messenger','zalo','whatsapp','phone','other'];
const NOTIFICATION_CHANNELS=['whatsapp','messenger','zalo','phone','copy','other'];
const NOTIFICATION_LANGUAGES=['vi','en','ja','zh'];
const ITEM_STATUSES=['available','reserved','rented','maintenance','inactive'];
const RESERVATION_STATUSES=['pending','confirmed','rented','returned','cancelled'];
const ORDER_STATUSES=['pending','confirmed','preparing','ready','out_for_delivery','completed','cancelled'];
const FULFILLMENT_TYPES=['pickup','delivery'];
// Which modules this store uses, read off the catalog: sale products need Orders, everything else
// (rental or plain items) keeps Inventory / Bookings. Both can coexist.
let modules={orders:false,rental:true};
let readOnly=false;
// Store configuration (/store.json): name, languages, time zone. Defaults until it loads.
let storeConfig={store:{name:document.getElementById('brand-name')?.textContent||'Tiemora'},languages:['vi','en'],defaultLanguage:'vi',admin:{defaultLanguage:'en'}};
let lang='en';try{if(T[localStorage.getItem('tiemora-admin-lang')])lang=localStorage.getItem('tiemora-admin-lang');}catch{}
const t=key=>T[lang][key]??T.en[key]??key;
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const view=document.getElementById('view');
let catalog=[],productsById=new Map();

// --- API ------------------------------------------------------------------------------------------
class ApiError extends Error{constructor(status,data){super(data?.message||`HTTP ${status}`);this.status=status;this.data=data||{};}}
async function api(path,{method='GET',body}={}){
 let response;
 try{response=await fetch(path,{method,credentials:'same-origin',headers:{'x-requested-with':'fetch',...(body!==undefined?{'content-type':'application/json'}:{})},body:body!==undefined?JSON.stringify(body):undefined});}
 catch{throw new ApiError(0,{error:'network'});}
 if(response.status===401){location.replace('/admin/login');throw new ApiError(401,{error:'unauthorized'});}
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw new ApiError(response.status,data);
 return data;
}
function describe(error){
 const known=T[lang].errors[error.data?.error];
 if(error.data?.error==='validation_error')return `${known} ${error.message}`;
 return known||error.message||String(error);
}
let toastTimer;
function toast(message,{error=false}={}){const el=document.getElementById('toast');el.textContent=message;el.classList.toggle('error',error);el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),error?5000:2500);}

// --- Catalog helpers ------------------------------------------------------------------------------
function localized(value){if(typeof value==='string')return value;if(!value||typeof value!=='object')return '';return [lang,storeConfig.defaultLanguage,...(storeConfig.languages||[]),'vi','en','ja','zh',...Object.keys(value)].map(k=>value[k]).find(v=>typeof v==='string'&&v.trim())||'';}
const product=id=>productsById.get(id);
const productName=id=>localized(product(id)?.name)||`${id} (${t('notInCatalog')})`;
function thumb(id){const p=product(id);const src=p?.cover&&(p.variants?.[p.cover]?.thumb||p.cover);return src?`<img class="thumb" src="${esc(src)}" alt="" loading="lazy">`:'<span class="thumb-empty"></span>';}
const productCell=id=>`<td class="product-cell">${thumb(id)}<div><b>${esc(productName(id))}</b><small class="mono">${esc(id)}</small></div></td>`;
const pill=(kind,status)=>`<span class="pill ${esc(status)}">${esc(T[lang][kind][status]||status)}</span>`;
const options=(list,selected,labels)=>list.map(v=>`<option value="${esc(v)}"${v===selected?' selected':''}>${esc(labels?labels[v]||v:v)}</option>`).join('');
const productOptions=selected=>`<option value="">${esc(t('pickProduct'))}</option>`+catalog.map(p=>`<option value="${esc(p.id)}"${p.id===selected?' selected':''}>${esc(localized(p.name))} · ${esc(p.id)}</option>`).join('');
function formatDate(iso){if(!iso)return '';try{return new Intl.DateTimeFormat({ja:'ja-JP',vi:'vi-VN',en:'en-GB'}[lang]||'en-GB',{year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(iso+'T00:00:00'));}catch{return iso;}}
const dateRange=(a,b)=>a===b?formatDate(a):`${formatDate(a)} → ${formatDate(b)}`;
const today=()=>new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10);
const field=(label,control,extra='')=>`<label class="field ${extra}"><span>${esc(label)}</span>${control}</label>`;
function formatDateTime(iso){if(!iso)return '';try{return new Intl.DateTimeFormat('sv-SE',{dateStyle:'short',timeStyle:'short'}).format(new Date(iso));}catch{return iso;}}
// Copy to the clipboard with the old execCommand path for browsers that hide navigator.clipboard on http.
async function copyText(text){
 try{if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(text);toast(t('copied'));return true;}}catch{}
 const ta=document.createElement('textarea');ta.value=text;ta.setAttribute('readonly','');ta.style.cssText='position:fixed;opacity:0;top:0;left:0';document.body.append(ta);ta.select();
 let ok=false;try{ok=document.execCommand('copy');}catch{}ta.remove();
 if(ok)toast(t('copied'));else toast(text,{error:true});
 return ok;
}
// "Chưa gửi" / "WhatsApp ✓" for the list and the dashboard; cancelled bookings need no notice.
function notificationPill(r){
 if(r.status==='cancelled')return '<span class="muted">—</span>';
 if(r.notification_status==='sent')return `<span class="pill sent">${esc(T[lang].notificationChannel[r.notification_channel]||r.notification_channel||T[lang].notificationStatus.sent)} ✓</span>`;
 return `<span class="pill not_sent">${esc(T[lang].notificationStatus.not_sent)}</span>`;
}
const isRequest=r=>Boolean(r.request_product_id)&&!(r.items?.length);
const sourceBadge=r=>r.source==='public'?`<span class="badge">${esc(T[lang].source.public)}</span>`:'';
// What a booking holds, or what a request asks for, as one line per item.
function itemLines(r){
 if(isRequest(r))return `<div>${esc(productName(r.request_product_id))}${r.request_size?` <small>${esc(t('size'))} ${esc(r.request_size)}</small>`:''} <small class="mono">${esc(t('request'))}</small></div>`;
 return r.items.map(i=>`<div>${esc(productName(i.product_id))} <small class="mono">${esc(i.inventory_item_id)}</small></div>`).join('');
}

// --- Views ----------------------------------------------------------------------------------------
async function dashboard(){
 view.innerHTML=`<div class="view-head"><h1>${esc(t('navDashboard'))}</h1><div class="actions">${modules.orders?`<a class="button primary" href="#/orders/new">${esc(t('newOrder'))}</a><a class="button" href="#/orders/schedule">${esc(t('schedule'))}</a>`:''}${modules.rental?`<a class="button${modules.orders?'':' primary'}" href="#/reservations/new">${esc(t('newReservation'))}</a><a class="button" href="#/inventory/new">${esc(t('newItem'))}</a>`:''}</div></div><p class="muted">${esc(t('loading'))}</p>`;
 const d=await api('/api/admin/dashboard');
 const stat=(key,value,href,extra='')=>`<a class="stat ${extra}" href="${href}"><b>${value}</b><span>${esc(t(key))}</span></a>`;
 const list=(key,rows,action,{date=true}={})=>`<section class="card"><h2>${esc(t(key))} ${date?`<small>${esc(formatDate(d.today))}</small>`:`<small>${rows.length}</small>`}</h2>${rows.length?reservationTable(rows,action):`<p class="muted">${esc(t('empty'))}</p>`}</section>`;
 const orderList=(key,rows,action,{date=true}={})=>`<section class="card"><h2>${esc(t(key))} ${date?`<small>${esc(formatDate(d.today))}</small>`:`<small>${rows.length}</small>`}</h2>${rows.length?orderTable(rows,action):`<p class="muted">${esc(t('empty'))}</p>`}</section>`;
 const orderStats=modules.orders?`${stat('newOrders',d.newOrders.length,'#/orders?status=pending',d.newOrders.length?'attention':'')}${stat('needNotification',d.orderNotifications.length,'#/orders?notification=not_sent&status=confirmed,preparing,ready,out_for_delivery',d.orderNotifications.length?'attention':'')}${stat('pickupsTodayOrders',d.orderPickupsToday.length,`#/orders/schedule?date=${d.today}`)}${stat('deliveriesToday',d.orderDeliveriesToday.length,`#/orders/schedule?date=${d.today}`)}${stat('upcomingOrders',d.upcomingOrders,`#/orders?from=${d.today}`)}${stat('products',d.products,'#/orders/new')}`:'';
 const rentalStats=modules.rental?`${stat('newRequests',d.newReservations.length,'#/reservations?status=pending',d.newReservations.length?'attention':'')}${stat('needNotification',d.pendingNotifications.length,'#/reservations?status=confirmed&notification=not_sent',d.pendingNotifications.length?'attention':'')}${modules.orders?'':stat('products',d.products,'#/inventory')}${stat('items',d.items,'#/inventory')}${stat('rentedNow',d.rentedNow,'#/reservations?status=rented')}${stat('upcoming',d.upcoming,`#/reservations?status=pending,confirmed&from=${d.today}`)}${stat('maintenance',d.maintenance,'#/inventory?status=maintenance')}${stat('returnsToday',d.returnsToday.length,`#/reservations?from=${d.today}&to=${d.today}`)}${stat('pickupsToday',d.pickupsToday.length,`#/reservations?from=${d.today}&to=${d.today}`)}`:'';
 view.querySelector('p').outerHTML=`${readOnly?`<p class="hint">${esc(t('readOnly'))}</p>`:''}<div class="stats">${orderStats}${rentalStats}</div>
  <div class="stack">
   ${modules.orders?`${orderList('newOrders',d.newOrders,'confirmed',{date:false})}<section class="card"><h2>${esc(t('notifications'))} <small>${d.orderNotifications.length} ${esc(t('ordersNeedNotification'))}</small></h2>${d.orderNotifications.length?orderTable(d.orderNotifications,'open'):`<p class="muted">${esc(t('empty'))}</p>`}</section>${orderList('pickupsTodayOrders',d.orderPickupsToday,'completed')}${orderList('deliveriesToday',d.orderDeliveriesToday,'out_for_delivery')}`:''}
   ${modules.rental?`<section class="card" id="dashboard-notifications"><h2>${esc(t('notifications'))} <small>${d.pendingNotifications.length} ${esc(t('bookingsNeedNotification'))}</small></h2>${d.pendingNotifications.length?reservationTable(d.pendingNotifications,'open'):`<p class="muted">${esc(t('empty'))}</p>`}</section>
   ${list('newRequests',d.newReservations,'confirm',{date:false})}
   ${d.overdue.length?list('overdue',d.overdue,'returned',{date:false}):''}
   ${list('returnsToday',d.returnsToday,'returned')}${list('pickupsToday',d.pickupsToday,'rented')}`:''}</div>`;
 bindQuickActions();bindOrderQuickActions();
}

// quickAction: 'rented' / 'returned' (status PATCH), 'confirm' (POST /confirm) or 'open' (link only).
function reservationTable(rows,quickAction){
 const quickLabel={rented:'handOver',returned:'returned',confirm:'confirmRequest',open:'open'}[quickAction];
 return `<table class="table"><thead><tr><th>${esc(t('id'))}</th><th>${esc(t('customer'))}</th><th>${esc(t('contact'))}</th><th>${esc(t('start'))}</th><th>${esc(t('end'))}</th><th>${esc(t('product'))}</th><th>${esc(t('status'))}</th><th>${esc(t('notification'))}</th>${quickAction?'<th></th>':''}</tr></thead><tbody>${rows.map(r=>`<tr class="row-link" data-href="#/reservations/${esc(r.id)}">
  <td data-label="${esc(t('id'))}" class="mono">${esc(r.id)}${sourceBadge(r)}</td>
  <td data-label="${esc(t('customer'))}"><b>${esc(r.customer_name)}</b></td>
  <td data-label="${esc(t('contact'))}">${r.preferred_contact_channel?`<span class="pill channel">${esc(T[lang].contactChannel[r.preferred_contact_channel]||r.preferred_contact_channel)}</span> `:''}${esc([r.customer_phone,r.customer_facebook].filter(Boolean).join(' · '))||(r.preferred_contact_channel?'':'—')}</td>
  <td data-label="${esc(t('start'))}">${esc(formatDate(r.start_date))}</td>
  <td data-label="${esc(t('end'))}">${esc(formatDate(r.end_date))}</td>
  <td data-label="${esc(t('product'))}">${itemLines(r)}</td>
  <td data-label="${esc(t('status'))}">${pill('reservationStatus',r.status)}</td>
  <td data-label="${esc(t('notification'))}">${notificationPill(r)}</td>
  ${quickAction==='open'?`<td><a class="button small" href="#/reservations/${esc(r.id)}">${esc(t('open'))}</a></td>`:quickAction?`<td><button type="button" class="small${quickAction==='confirm'?' primary':''}" data-quick="${quickAction}" data-id="${esc(r.id)}">${esc(t(quickLabel))}</button></td>`:''}
 </tr>`).join('')}</tbody></table>`;
}
async function quickAction(id,action){
 const path=`/api/admin/reservations/${encodeURIComponent(id)}`;
 return action==='confirm'?api(path+'/confirm',{method:'POST',body:{}}):api(path,{method:'PATCH',body:{status:action}});
}
function bindQuickActions(){
 view.querySelectorAll('[data-quick]').forEach(button=>button.addEventListener('click',async e=>{
  e.stopPropagation();button.disabled=true;
  try{await quickAction(button.dataset.id,button.dataset.quick);toast(t('saved'));if(button.dataset.quick==='confirm')location.hash='#/reservations/'+encodeURIComponent(button.dataset.id);else route();}
  catch(error){toast(describe(error),{error:true});button.disabled=false;}
 }));
}

async function inventoryList(params){
 const productId=params.get('product_id')||'',status=params.get('status')||'';
 view.innerHTML=`<div class="view-head"><h1>${esc(t('navInventory'))}</h1><a class="button primary" href="#/inventory/new">${esc(t('newItem'))}</a></div>
  <form class="filters" id="inventory-filters">${field(t('product'),`<select name="product_id"><option value="">${esc(t('all'))}</option>${catalog.map(p=>`<option value="${esc(p.id)}"${p.id===productId?' selected':''}>${esc(localized(p.name))} · ${esc(p.id)}</option>`).join('')}</select>`)}${field(t('status'),`<select name="status"><option value="">${esc(t('all'))}</option>${options(ITEM_STATUSES,status,T[lang].itemStatus)}</select>`)}</form><div id="inventory-table"><p class="muted">${esc(t('loading'))}</p></div>`;
 const form=document.getElementById('inventory-filters');
 form.addEventListener('change',()=>{const q=new URLSearchParams([...new FormData(form)].filter(([,v])=>v));location.hash='#/inventory'+(String(q)?'?'+q:'');});
 const {items}=await api('/api/admin/inventory?'+new URLSearchParams(Object.fromEntries([['product_id',productId],['status',status]].filter(([,v])=>v))));
 const table=document.getElementById('inventory-table');
 if(!items.length){table.innerHTML=`<p class="empty">${esc(t('empty'))}</p>`;return;}
 table.innerHTML=`<table class="table"><thead><tr><th>${esc(t('product'))}</th><th>${esc(t('item'))}</th><th>${esc(t('size'))}</th><th>${esc(t('status'))}</th><th>${esc(t('note'))}</th><th></th></tr></thead><tbody>${items.map(i=>`<tr data-item="${esc(i.id)}">
  ${productCell(i.product_id)}
  <td data-label="${esc(t('item'))}" class="mono">${esc(i.id)}</td>
  <td data-label="${esc(t('size'))}">${esc(i.size)||'—'}</td>
  <td data-label="${esc(t('status'))}"><select class="inline-status" data-field="status" aria-label="${esc(t('status'))}">${options(ITEM_STATUSES,i.status,T[lang].itemStatus)}</select></td>
  <td data-label="${esc(t('note'))}"><input class="inline-note" data-field="note" value="${esc(i.note)}" placeholder="—" aria-label="${esc(t('note'))}"></td>
  <td><div class="actions"><a class="button small" href="#/reservations?q=${encodeURIComponent(i.id)}">${esc(t('reservationsOf'))}</a><button type="button" class="small danger" data-delete>${esc(t('remove'))}</button></div></td>
 </tr>`).join('')}</tbody></table>`;
 table.addEventListener('change',async e=>{
  const control=e.target.closest('[data-field]');if(!control)return;
  const id=control.closest('tr').dataset.item;control.disabled=true;
  try{await api(`/api/admin/inventory/${encodeURIComponent(id)}`,{method:'PATCH',body:{[control.dataset.field]:control.value}});toast(t('saved'));}
  catch(error){toast(describe(error),{error:true});}
  control.disabled=false;
 });
 table.addEventListener('click',async e=>{
  const button=e.target.closest('[data-delete]');if(!button)return;
  const id=button.closest('tr').dataset.item;
  if(!confirm(`${t('confirmDelete')}\n${id}`))return;
  try{await api(`/api/admin/inventory/${encodeURIComponent(id)}`,{method:'DELETE'});toast(t('deleted'));button.closest('tr').remove();}
  catch(error){toast(describe(error),{error:true});}
 });
}

async function inventoryNew(params){
 const preset=params.get('product_id')||'';
 view.innerHTML=`<div class="view-head"><h1>${esc(t('newItem'))}</h1><a class="button" href="#/inventory">${esc(t('back'))}</a></div>
  <form class="form card" id="item-form">
   ${field(t('product'),`<select name="product_id" required>${productOptions(preset)}</select>`,'full')}
   ${field(t('item'),`<input name="id" required pattern="[a-z0-9]+(-[a-z0-9]+)*" autocapitalize="off" autocomplete="off"><small>${esc(t('idHint'))}</small>`)}
   ${field(t('size'),`<input name="size" list="size-options" maxlength="20" autocomplete="off"><datalist id="size-options"></datalist>`)}
   ${field(t('note'),`<textarea name="note" maxlength="500"></textarea>`,'full')}
   <p class="form-error" id="item-error"></p>
   <div class="form-footer"><button type="submit" class="primary">${esc(t('add'))}</button></div>
  </form>`;
 // Controls are read through form.elements: a field named "id" would otherwise be shadowed by the form's own id.
const form=document.getElementById('item-form');
 async function suggest(){
  const productId=form.elements.product_id.value;
  form.elements.id.value='';form.elements.size.value='';document.getElementById('size-options').innerHTML='';
  if(!productId)return;
  const p=product(productId);
  document.getElementById('size-options').innerHTML=(p?.sizes||[]).map(s=>`<option value="${esc(s)}">`).join('');
  if(p?.sizes?.length===1)form.elements.size.value=p.sizes[0];
  const {items}=await api('/api/admin/inventory?product_id='+encodeURIComponent(productId));
  const taken=new Set(items.map(i=>i.id));
  let n=items.length+1;while(taken.has(`${productId}-${String(n).padStart(2,'0')}`))n++;
  if(form.elements.product_id.value===productId)form.elements.id.value=`${productId}-${String(n).padStart(2,'0')}`;
 }
 form.elements.product_id.addEventListener('change',suggest);
 if(preset)suggest();
 form.addEventListener('submit',async e=>{
  e.preventDefault();const error=document.getElementById('item-error');error.textContent='';
  const body=Object.fromEntries(new FormData(form));
  try{await api('/api/admin/inventory',{method:'POST',body});toast(t('created'));location.hash='#/inventory?product_id='+encodeURIComponent(body.product_id);}
  catch(err){error.textContent=describe(err);}
 });
}

async function reservationList(params){
 const filters={from:params.get('from')||'',to:params.get('to')||'',status:params.get('status')||'',notification:params.get('notification')||'',q:params.get('q')||''};
 const statuses=filters.status.split(',').filter(Boolean);
 view.innerHTML=`<div class="view-head"><h1>${esc(t('navReservations'))}</h1><a class="button primary" href="#/reservations/new">${esc(t('newReservation'))}</a></div>
  <form class="filters" id="reservation-filters">
   ${field(t('start'),`<input type="date" name="from" value="${esc(filters.from)}">`)}
   ${field(t('end'),`<input type="date" name="to" value="${esc(filters.to)}">`)}
   ${field(t('status'),`<select name="status"><option value="">${esc(t('all'))}</option>${statuses.length>1?`<option value="${esc(filters.status)}" selected>${esc(statuses.map(s=>T[lang].reservationStatus[s]||s).join(' + '))}</option>`:''}${options(RESERVATION_STATUSES,statuses.length===1?statuses[0]:'',T[lang].reservationStatus)}</select>`)}
   ${field(t('notification'),`<select name="notification"><option value="">${esc(t('all'))}</option>${options(['not_sent','sent'],filters.notification,T[lang].notificationStatus)}</select>`)}
   ${field(t('search'),`<input type="search" name="q" value="${esc(filters.q)}" maxlength="100">`)}
   <button type="submit">${esc(t('filter'))}</button><a class="button ghost" href="#/reservations">${esc(t('clear'))}</a>
  </form><div id="reservation-table"><p class="muted">${esc(t('loading'))}</p></div>`;
 const form=document.getElementById('reservation-filters');
 form.addEventListener('submit',e=>{e.preventDefault();const q=new URLSearchParams([...new FormData(form)].filter(([,v])=>v));location.hash='#/reservations'+(String(q)?'?'+q:'');});
 const {reservations}=await api('/api/admin/reservations?'+new URLSearchParams(Object.entries(filters).filter(([,v])=>v)));
 document.getElementById('reservation-table').innerHTML=reservations.length?reservationTable(reservations):`<p class="empty">${esc(t('empty'))}</p>`;
}

// One form serves both creating and editing; every product line loads its free items for the dates.
async function reservationForm(id){
 const editing=Boolean(id);
 let current=null,notification=null;
 if(editing){
  view.innerHTML=`<p class="muted">${esc(t('loading'))}</p>`;
  try{({reservation:current,notification}=await api(`/api/admin/reservations/${encodeURIComponent(id)}`));}
  catch(error){view.innerHTML=`<div class="error-box">${esc(describe(error))}</div>`;return;}
 }
 const r=current||{customer_name:'',customer_phone:'',customer_facebook:'',preferred_contact_channel:'',customer_whatsapp:'',customer_messenger_url:'',customer_zalo_phone:'',start_date:today(),end_date:today(),status:'pending',note:'',items:[],request_product_id:'',request_size:''};
 const request=isRequest(r);
 const radio=(name,value,label,checked)=>`<label class="radio"><input type="radio" name="${name}" value="${esc(value)}"${checked?' checked':''}><span>${esc(label)}</span></label>`;
 view.innerHTML=`<div class="view-head"><h1>${editing?`${esc(request?t('request'):t('reservation'))} <small class="mono">${esc(id)}</small>`:esc(t('newReservation'))}</h1><a class="button" href="#/reservations">${esc(t('back'))}</a></div>
  ${editing?`<div class="card actions" id="status-actions" style="margin-bottom:14px">${pill('reservationStatus',r.status)}${sourceBadge(r)}
   ${['pending'].includes(r.status)?`<button type="button" class="${request?'primary':''}" data-status="confirmed">${esc(request?t('confirmRequest'):t('confirm'))}</button>`:''}
   ${['pending','confirmed'].includes(r.status)&&!request?`<button type="button" class="${request?'':'primary'}" data-status="rented">${esc(t('handOver'))}</button>`:''}
   ${['rented'].includes(r.status)?`<button type="button" class="primary" data-status="returned">${esc(t('returned'))}</button>`:''}
   ${!['cancelled','returned'].includes(r.status)?`<button type="button" class="danger" data-status="cancelled">${esc(t('cancelReservation'))}</button>`:''}
  </div>`:''}
  ${editing&&request?`<section class="card request-card" style="margin-bottom:14px"><h3>${esc(t('requested'))}</h3><div class="request-summary">${thumb(r.request_product_id)}<div><b>${esc(productName(r.request_product_id))}</b><div class="muted">${r.request_size?`${esc(t('size'))}: ${esc(r.request_size)} · `:''}${esc(dateRange(r.start_date,r.end_date))}</div><div>${esc(r.customer_name)}${r.customer_phone?` · ${esc(r.customer_phone)}`:''}${r.preferred_contact_channel?` · ${esc(t('preferred'))}: ${esc(T[lang].contactChannel[r.preferred_contact_channel])}`:''}</div></div></div><p class="muted" style="margin:10px 0 0">${esc(t('requestHint'))}</p></section>`:''}
  ${editing?`<div id="notify"></div>`:''}
  <form class="form card" id="reservation-form">
   ${field(t('customer'),`<input name="customer_name" required maxlength="100" value="${esc(r.customer_name)}">`)}
   ${field(t('phone'),`<input name="customer_phone" type="tel" maxlength="40" value="${esc(r.customer_phone)}">`)}
   ${field(t('facebook'),`<input name="customer_facebook" maxlength="200" value="${esc(r.customer_facebook)}">`)}
   ${field(t('status'),`<select name="status">${options(RESERVATION_STATUSES,r.status,T[lang].reservationStatus)}</select>`)}
   ${field(t('start'),`<input type="date" name="start_date" required value="${esc(r.start_date)}">`)}
   ${field(t('end'),`<input type="date" name="end_date" required value="${esc(r.end_date)}">`)}
   <fieldset class="full contact-fields"><legend>${esc(t('contact'))}</legend>
    <div class="field full"><span>${esc(t('preferred'))}</span><div class="radio-group">${radio('preferred_contact_channel','',T[lang].contactChannel[''],!r.preferred_contact_channel)}${CONTACT_CHANNELS.map(c=>radio('preferred_contact_channel',c,T[lang].contactChannel[c],r.preferred_contact_channel===c)).join('')}</div></div>
    <div class="form contact-grid">
     ${field(t('whatsapp'),`<div class="with-button"><input name="customer_whatsapp" type="tel" maxlength="40" value="${esc(r.customer_whatsapp)}" placeholder="= ${esc(t('phone'))}"><button type="button" class="small" data-use-phone="customer_whatsapp">${esc(t('usePhone'))}</button></div>`)}
     ${field(t('zaloPhone'),`<div class="with-button"><input name="customer_zalo_phone" type="tel" maxlength="40" value="${esc(r.customer_zalo_phone)}" placeholder="= ${esc(t('phone'))}"><button type="button" class="small" data-use-phone="customer_zalo_phone">${esc(t('usePhone'))}</button></div>`)}
     ${field(t('messengerUrl'),`<input name="customer_messenger_url" maxlength="300" inputmode="url" placeholder="https://m.me/…" value="${esc(r.customer_messenger_url)}">`,'full')}
    </div>
   </fieldset>
   <div class="full"><div class="view-head"><h3 style="margin:0">${esc(t('product'))}</h3><button type="button" id="add-line" class="small">${esc(t('addLine'))}</button></div><div class="lines" id="lines"></div></div>
   ${field(t('note'),`<textarea name="note" maxlength="1000">${esc(r.note)}</textarea>`,'full')}
   <p class="form-error full" id="reservation-error"></p>
   <div class="form-footer"><button type="submit" class="primary">${esc(editing?t('save'):t('newReservation'))}</button></div>
  </form>`;
 const form=document.getElementById('reservation-form'),lines=document.getElementById('lines'),errorBox=document.getElementById('reservation-error');
 form.querySelectorAll('[data-use-phone]').forEach(button=>button.addEventListener('click',()=>{form.elements[button.dataset.usePhone].value=form.elements.customer_phone.value;}));
 if(editing)renderNotificationPanel(document.getElementById('notify'),r,notification);
 let lineSeq=0;
 function addLine({product_id='',inventory_item_id='',size=''}={}){
  const n=++lineSeq;
  const line=document.createElement('div');line.className='line';line.dataset.line=n;line.dataset.selected=inventory_item_id;
  line.innerHTML=`<div class="line-head">${field(t('product'),`<select data-role="product">${productOptions(product_id)}</select>`)}${field(t('size'),`<select data-role="size"><option value="">${esc(t('anySize'))}</option></select>`)}<button type="button" class="small" data-role="auto">${esc(t('autoPick'))}</button><button type="button" class="small ghost" data-role="remove">${esc(t('remove'))}</button></div><div class="candidates" data-role="candidates"></div>`;
  lines.append(line);
  const sizeSelect=line.querySelector('[data-role=size]');
  const fillSizes=()=>{const p=product(line.querySelector('[data-role=product]').value);sizeSelect.innerHTML=`<option value="">${esc(t('anySize'))}</option>`+options(p?.sizes||[],size);};
  fillSizes();
  line.querySelector('[data-role=product]').addEventListener('change',()=>{line.dataset.selected='';fillSizes();loadCandidates(line);});
  sizeSelect.addEventListener('change',()=>renderCandidates(line));
  line.querySelector('[data-role=auto]').addEventListener('click',()=>{const first=line.querySelector('.candidate:not(.taken) input');if(first){first.checked=true;line.dataset.selected=first.value;}else toast(t('noFree'),{error:true});});
  line.querySelector('[data-role=remove]').addEventListener('click',()=>line.remove());
  line.querySelector('[data-role=candidates]').addEventListener('change',e=>{if(e.target.matches('input[type=radio]'))line.dataset.selected=e.target.value;});
  loadCandidates(line);
 }
 async function loadCandidates(line){
  const productId=line.querySelector('[data-role=product]').value,box=line.querySelector('[data-role=candidates]');
  const from=form.elements.start_date.value,to=form.elements.end_date.value;
  line.items=[];
  if(!productId){box.innerHTML='';return;}
  if(!from||!to||from>to){box.innerHTML=`<p class="muted">${esc(t('pickDates'))}</p>`;return;}
  box.innerHTML=`<p class="muted">${esc(t('loading'))}</p>`;
  try{
   const query=new URLSearchParams({from,to,...(editing?{exclude:id}:{})});
   const data=await api(`/api/products/${encodeURIComponent(productId)}/inventory?${query}`);
   if(line.querySelector('[data-role=product]').value!==productId)return;
   line.items=data.items;renderCandidates(line);
  }catch(error){box.innerHTML=`<div class="error-box">${esc(describe(error))}</div>`;}
 }
 function renderCandidates(line){
  const box=line.querySelector('[data-role=candidates]'),size=line.querySelector('[data-role=size]').value,selected=line.dataset.selected;
  const items=(line.items||[]).filter(i=>!size||i.size===size);
  if(!line.items?.length){box.innerHTML=`<p class="muted">${esc(t('noItems'))}</p>`;return;}
  box.innerHTML=items.map(i=>{
   const free=i.available;
   if(i.id===selected&&!free)line.dataset.selected='';
   const who=i.conflicts?.[0]?`${i.conflicts[0].customer_name} · ${dateRange(i.conflicts[0].start_date,i.conflicts[0].end_date)}`:(!free?T[lang].itemStatus[i.status]:'');
   return `<label class="candidate${free?'':' taken'}"><input type="radio" name="line-${line.dataset.line}" value="${esc(i.id)}"${free?'':' disabled'}${i.id===selected?' checked':''}><span class="mono">${esc(i.id)}</span><span>${esc(i.size)||''}</span>${pill('itemStatus',i.status)}<span class="who">${free?esc(t('free')):esc(who)}</span></label>`;
  }).join('')||`<p class="muted">${esc(t('noFree'))}</p>`;
 }
 document.getElementById('add-line').addEventListener('click',()=>addLine());
 for(const item of r.items)addLine({product_id:item.product_id,inventory_item_id:item.inventory_item_id,size:item.size});
 // A request already says which design (and size) the customer wants; the item is still to be picked.
 if(!r.items.length)addLine(request?{product_id:r.request_product_id,size:r.request_size}:{});
 const refreshAll=()=>{if(form.elements.start_date.value&&form.elements.end_date.value<form.elements.start_date.value)form.elements.end_date.value=form.elements.start_date.value;form.elements.end_date.min=form.elements.start_date.value;lines.querySelectorAll('.line').forEach(loadCandidates);};
 form.elements.start_date.addEventListener('change',refreshAll);form.elements.end_date.addEventListener('change',refreshAll);
 form.addEventListener('submit',async e=>{
  e.preventDefault();errorBox.textContent='';
  const body=Object.fromEntries(new FormData(form));
  body.items=[...lines.querySelectorAll('.line')].map(line=>line.dataset.selected).filter(Boolean);
  // A pending request may stay without a item; every other booking needs one per line.
  const mayBeEmpty=request&&body.status==='pending';
  if(!mayBeEmpty&&(body.items.length!==lines.querySelectorAll('.line').length||!body.items.length)){errorBox.textContent=t('needItem');return;}
  const button=form.querySelector('[type=submit]');button.disabled=true;
  try{
   const data=editing?await api(`/api/admin/reservations/${encodeURIComponent(id)}`,{method:'PATCH',body}):await api('/api/admin/reservations',{method:'POST',body});
   toast(editing?t('saved'):t('created'));
   if(editing)route();else location.hash='#/reservations/'+encodeURIComponent(data.reservation.id);
  }catch(error){
   errorBox.textContent=describe(error);
   if(error.data?.error==='inventory_conflict')lines.querySelectorAll('.line').forEach(loadCandidates);
  }
  button.disabled=false;
 });
 document.getElementById('status-actions')?.addEventListener('click',async e=>{
  const button=e.target.closest('[data-status]');if(!button)return;
  const status=button.dataset.status;
  if(status==='cancelled'&&!confirm(t('confirmCancel')))return;
  button.disabled=true;
  try{
   // Confirming goes through /confirm so the stock is re-checked and a request gets its item.
   if(status==='confirmed')await api(`/api/admin/reservations/${encodeURIComponent(id)}/confirm`,{method:'POST',body:{}});
   else await api(`/api/admin/reservations/${encodeURIComponent(id)}`,{method:'PATCH',body:{status}});
   toast(status==='cancelled'?t('cancelled'):t('saved'));route();
  }catch(error){
   const sizes=error.data?.otherSizes?.filter(Boolean);
   toast(describe(error)+(sizes?.length?` ${t('otherSizes')}: ${[...new Set(sizes)].join(', ')}`:''),{error:true});button.disabled=false;
  }
 });
}

// Contact summary + the notification tools for one booking. Nothing is sent from here: the
// buttons open WhatsApp / Messenger or copy text, and staff record the result with "notified".
function renderNotificationPanel(root,r,n,{endpoint='/api/admin/reservations',pendingHint='notifyPending',summaryLabel='copySummary'}={}){
 if(!root||!n)return;
 let language=n.defaultLanguage||storeConfig.defaultLanguage||'vi';
 let channel=r.notification_channel||({messenger:'messenger',zalo:'zalo',whatsapp:'whatsapp',phone:'phone',other:'other'}[n.preferred]||'copy');
 const sent=r.notification_status==='sent';
 const message=()=>n.messages[language]||n.messages.vi||'';
 const waHref=()=>n.whatsapp.number?`https://wa.me/${n.whatsapp.number}?text=${encodeURIComponent(message())}`:'';
 const ext='target="_blank" rel="noopener noreferrer"';
 const line=(label,value)=>`<div class="contact-line"><span>${esc(label)}</span><b>${value}</b></div>`;
 const channelRows={
  whatsapp:()=>n.whatsapp.number?`<a class="button" href="${esc(waHref())}" ${ext} data-channel="whatsapp" data-wa>${esc(t('sendWhatsapp'))} ↗</a>`:`<button type="button" disabled>${esc(t('sendWhatsapp'))} · ${esc(t('noPhone'))}</button>`,
  messenger:()=>(n.messenger.url?`<a class="button" href="${esc(n.messenger.url)}" ${ext} data-channel="messenger">${esc(t('openMessenger'))} ↗</a>`:`<button type="button" disabled>${esc(t('openMessenger'))} · ${esc(t('notRegistered'))}</button>`)+`<button type="button" data-copy="message" data-channel="messenger">${esc(t('copyMessage'))}</button>`,
  zalo:()=>(n.zalo.phone?`<button type="button" data-copy="zalo" data-channel="zalo">${esc(t('copyZalo'))}</button>`:`<button type="button" disabled>${esc(t('copyZalo'))} · ${esc(t('noPhone'))}</button>`)+`<button type="button" data-copy="message" data-channel="zalo">${esc(t('copyMessage'))}</button>`,
  phone:()=>n.phone?`<a class="button" href="tel:${esc(n.phone.replace(/[^\d+]/g,''))}" data-channel="phone">${esc(t('call'))} ${esc(n.phone)}</a><button type="button" data-copy="phone" data-channel="phone">${esc(t('copyPhone'))}</button>`:`<button type="button" disabled>${esc(t('call'))} · ${esc(t('noPhone'))}</button>`
 };
 const order=['whatsapp','messenger','zalo','phone'];
 if(order.includes(n.preferred))order.splice(order.indexOf(n.preferred),1),order.unshift(n.preferred);
 const contactValue=(value,{link=false}={})=>value?(link?`<a href="${esc(value)}" ${ext}>${esc(value.replace(/^https?:\/\//,''))}</a>`:esc(value)):`<span class="muted">${esc(t('notRegistered'))}</span>`;
 // Zalo / WhatsApp numbers: "same as phone" when they match the main number (or were left empty).
 const digits=v=>String(v||'').replace(/\D/g,'').replace(new RegExp('^('+(storeConfig.phoneCountryCode||'84')+'|0)'),'');
 const phoneValue=value=>{if(!value&&!r.customer_phone)return contactValue('');if(!value||digits(value)===digits(r.customer_phone))return `${esc(r.customer_phone)} <small class="muted">· ${esc(t('sameAsPhone'))}</small>`;return esc(value);};
 root.innerHTML=`<section class="card notify" style="margin-bottom:14px"><div class="notify-grid">
  <div class="contact-block"><h3>${esc(t('contact'))}</h3>
   ${line(t('preferred'),r.preferred_contact_channel?`<span class="pill channel">${esc(T[lang].contactChannel[r.preferred_contact_channel])}</span>`:'<span class="muted">—</span>')}
   ${line(t('phone'),contactValue(r.customer_phone))}
   ${line(t('whatsapp'),phoneValue(r.customer_whatsapp))}
   ${line(t('messenger'),contactValue(r.customer_messenger_url,{link:true}))}
   ${line(t('zalo'),phoneValue(r.customer_zalo_phone))}
   ${r.customer_facebook?line(t('facebook'),esc(r.customer_facebook)):''}
   ${line(t('privacyConsent'),r.privacy_consent?`<span class="consent-ok">${esc(t('consentAccepted'))}</span>`:`<span class="muted">${esc(t('consentNone'))}</span>`)}
   ${r.privacy_consent&&r.privacy_consent_at?line(t('consentAt'),esc(formatDateTime(r.privacy_consent_at))):''}
  </div>
  <div class="notification-block"><h3>${esc(t('notification'))}</h3>
   <div class="notification-state">${notificationPill(r)}${sent?` <span class="muted">${esc(t('channel'))}: ${esc(T[lang].notificationChannel[r.notification_channel]||r.notification_channel)} · ${esc(t('sentAt'))}: ${esc(formatDateTime(r.notification_sent_at))}${r.notification_note?` · ${esc(r.notification_note)}`:''}</span>`:''}</div>
   ${r.status==='pending'?`<p class="hint">${esc(t(pendingHint))}</p>`:''}
   <label class="field"><span>${esc(t('language'))}</span><select id="notify-lang">${options(NOTIFICATION_LANGUAGES,language,{vi:'VI · Tiếng Việt',en:'EN · English',ja:'JA · 日本語',zh:'ZH · 中文'})}</select></label>
   <label class="field"><span>${esc(t('message'))}</span><textarea id="notify-message" readonly rows="9">${esc(message())}</textarea></label>
   <div class="channels">${order.map(c=>`<div class="channel-row${c===n.preferred?' preferred':''}"><span class="channel-label">${esc(T[lang].contactChannel[c])}${c===n.preferred?` <em>${esc(t('primary'))}</em>`:''}</span><div class="actions">${channelRows[c]()}</div></div>`).join('')}
    <div class="channel-row"><span class="channel-label">${esc(t('copyMessage'))}</span><div class="actions"><button type="button" data-copy="message" data-channel="copy">${esc(t('copyMessage'))}</button><button type="button" data-copy="summary" data-channel="copy">${esc(t(summaryLabel))}</button>${n.phone?`<button type="button" data-copy="phone" data-channel="copy">${esc(t('copyPhone'))}</button>`:''}</div></div>
   </div>
   <form class="mark-sent" id="mark-sent">${sent
    ?`<button type="button" class="ghost" data-notify="not_sent">${esc(t('markNotSent'))}</button>`
    :`<label class="field"><span>${esc(t('channel'))}</span><select name="channel">${options(NOTIFICATION_CHANNELS,channel,T[lang].notificationChannel)}</select></label><label class="field grow"><span>${esc(t('notificationNote'))}</span><input name="note" maxlength="500"></label><button type="submit" class="primary" data-notify="sent">${esc(t('markSent'))}</button>`}
   </form>
  </div></div></section>`;
 const section=root.firstElementChild,textarea=root.querySelector('#notify-message');
 root.querySelector('#notify-lang').addEventListener('change',e=>{language=e.target.value;textarea.value=message();const wa=root.querySelector('[data-wa]');if(wa)wa.href=waHref();});
 const markForm=root.querySelector('#mark-sent');
 // Listeners go on the section, which is replaced on every re-render, so nothing is bound twice.
 section.addEventListener('click',e=>{
  const el=e.target.closest('[data-channel]');if(!el)return;
  // Whatever staff just used becomes the suggested channel for "notified".
  if(markForm.elements.channel)markForm.elements.channel.value=el.dataset.channel;
  if(el.dataset.copy)copyText({message:message(),summary:n.summary,zalo:n.zalo.phone,phone:n.phone}[el.dataset.copy]||'');
 });
 // Primary button = the customer's preferred channel.
 root.querySelector('.channel-row.preferred .actions > :first-child')?.classList.add('primary');
 async function record(status){
  const body={status,channel:markForm.elements.channel?.value||'',note:markForm.elements.note?.value||''};
  markForm.querySelectorAll('button').forEach(b=>b.disabled=true);
  try{const data=await api(`${endpoint}/${encodeURIComponent(r.id)}/notification`,{method:'POST',body});toast(t('saved'));renderNotificationPanel(root,data.reservation||data.order,data.notification,{endpoint,pendingHint,summaryLabel});}
  catch(error){toast(describe(error),{error:true});markForm.querySelectorAll('button').forEach(b=>b.disabled=false);}
 }
 markForm.addEventListener('submit',e=>{e.preventDefault();record('sent');});
 markForm.querySelector('[data-notify=not_sent]')?.addEventListener('click',()=>record('not_sent'));
}

// --- Settings: Web Push on this device, store configuration summary ---------------------------------
const urlBase64ToUint8Array=text=>Uint8Array.from(atob(text.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(text.length/4)*4,'=')),c=>c.charCodeAt(0));
async function currentSubscription(){
 if(!('serviceWorker' in navigator)||!('PushManager' in window))return null;
 try{const registration=await navigator.serviceWorker.ready;return registration.pushManager.getSubscription();}catch{return null;}
}
async function settings(){
 view.innerHTML=`<div class="view-head"><h1>${esc(t('settings'))}</h1></div><p class="muted">${esc(t('loading'))}</p>`;
 const [config,{subscriptions}]=await Promise.all([api('/api/admin/push/config'),api('/api/admin/push/subscriptions')]);
 const supported='serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window;
 const mine=await currentSubscription();
 const subscribed=Boolean(mine&&subscriptions.some(s=>s.endpoint===mine.endpoint));
 const permission=supported?Notification.permission:'default';
 let pushState='';
 if(!config.publicKey)pushState=`<p class="hint">${esc(t('pushNotConfigured'))}</p>`;
 else if(!supported)pushState=`<p class="hint">${esc(t('pushUnsupported'))}</p>`;
 else if(permission==='denied')pushState=`<p class="hint">${esc(t('pushDenied'))}</p>`;
 else pushState=`<div class="actions">${subscribed?`<span class="pill sent">${esc(t('pushEnabled'))} ✓</span><button type="button" id="push-toggle" data-action="unsubscribe">${esc(t('pushDisable'))}</button>`:`<button type="button" class="primary" id="push-toggle" data-action="subscribe">${esc(t('pushEnable'))}</button>`}${subscriptions.length?`<button type="button" id="push-test">${esc(t('pushTest'))}</button>`:''}</div>`;
 const devices=subscriptions.length?`<table class="table"><thead><tr><th>${esc(t('pushDevices'))}</th><th>${esc(t('sentAt'))}</th><th></th></tr></thead><tbody>${subscriptions.map(s=>`<tr><td data-label="${esc(t('pushDevices'))}">${esc(s.label||new URL(s.endpoint).host)}${mine&&s.endpoint===mine.endpoint?` <small>· ${esc(t('pushThisDevice'))}</small>`:''}</td><td data-label="${esc(t('sentAt'))}">${esc(formatDateTime(s.last_sent_at))||'—'}${s.failures?` <small class="muted">(${s.failures}✕)</small>`:''}</td><td><button type="button" class="small danger" data-remove="${esc(s.endpoint)}">${esc(t('pushRemove'))}</button></td></tr>`).join('')}</tbody></table>`:'';
 const c=storeConfig;
 view.innerHTML=`<div class="view-head"><h1>${esc(t('settings'))}</h1></div><div class="stack">
  <section class="card"><h2>${esc(t('pushTitle'))}</h2><p class="muted">${esc(t('pushDescription'))}</p>${pushState}${devices}</section>
  <section class="card"><h2>${esc(t('storeConfig'))}</h2><div class="contact-block">${[[t('storeName'),c.store?.name],[t('languages'),(c.languages||[]).join(', ')],[t('timezone'),c.timezone],[t('currency'),c.currency]].map(([k,v])=>`<div class="contact-line"><span>${esc(k)}</span><b>${esc(v||'—')}</b></div>`).join('')}</div><p class="hint">${esc(t('configHint'))}</p></section></div>`;
 view.querySelector('#push-toggle')?.addEventListener('click',async e=>{
  const button=e.currentTarget;button.disabled=true;
  try{
   if(button.dataset.action==='subscribe'){
    if(Notification.permission!=='granted'&&await Notification.requestPermission()!=='granted'){toast(t('pushDenied'),{error:true});button.disabled=false;return;}
    const registration=await navigator.serviceWorker.ready;
    const subscription=mine||await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:urlBase64ToUint8Array(config.publicKey)});
    await api('/api/admin/push/subscriptions',{method:'POST',body:{...subscription.toJSON(),label:navigator.userAgent.replace(/^Mozilla\/5\.0\s*/,'').slice(0,100)}});
   }else{
    if(mine){await api('/api/admin/push/unsubscribe',{method:'POST',body:{endpoint:mine.endpoint}});await mine.unsubscribe().catch(()=>{});}
   }
   toast(t('saved'));settings();
  }catch(error){toast(error instanceof ApiError?describe(error):t('pushFailed'),{error:true});button.disabled=false;}
 });
 view.querySelector('#push-test')?.addEventListener('click',async e=>{e.currentTarget.disabled=true;try{const result=await api('/api/admin/push/test',{method:'POST',body:{}});toast(t('pushTestSent').replace('{n}',result.sent));}catch(error){toast(describe(error),{error:true});}e.currentTarget.disabled=false;});
 view.querySelectorAll('[data-remove]').forEach(button=>button.addEventListener('click',async()=>{try{await api('/api/admin/push/unsubscribe',{method:'POST',body:{endpoint:button.dataset.remove}});if(mine&&mine.endpoint===button.dataset.remove)await mine.unsubscribe().catch(()=>{});toast(t('deleted'));settings();}catch(error){toast(describe(error),{error:true});}}));
}

// --- Orders (type: sale products) -------------------------------------------------------------------
// Names, option labels and time slots come from /catalog.json and /store.json; the database holds
// the order rows. Capacity per slot is what /api/orders/config and the schedule report.
const ordering=()=>storeConfig.ordering||{timeSlots:[],options:{},addons:{},fulfillment:{}};
const slotLabel=id=>{const slot=(ordering().timeSlots||[]).find(s=>s.id===id);return slot?(localized(slot.label)||`${slot.start}–${slot.end}`):(id||'');};
const optionText=(group,id)=>localized(ordering().options?.[group]?.choices?.[id]?.label)||id;
const addonText=id=>localized(ordering().addons?.[id]?.label)||id;
function money(amount,currency){try{return new Intl.NumberFormat({vi:'vi-VN',ja:'ja-JP',en:'en-US'}[lang]||'en-US',{style:'currency',currency:currency||storeConfig.currency||'VND',maximumFractionDigits:0}).format(amount);}catch{return `${amount} ${currency||''}`;}}
const lineText=i=>`${productName(i.product_id)}${Object.keys(i.options||{}).length?` (${Object.entries(i.options).map(([g,id])=>optionText(g,id)).join(' · ')})`:''}${(i.addons||[]).length?` + ${i.addons.map(addonText).join(', ')}`:''}`;
function orderLines(o){return (o.items||[]).map(i=>`<div>${esc(lineText(i))} <b>×${i.quantity}</b></div>`).join('');}
const fulfillmentPill=o=>`<span class="pill fulfillment-${esc(o.fulfillment_type)}">${esc(T[lang].fulfillmentType[o.fulfillment_type]||o.fulfillment_type)}</span>`;
function orderTable(rows,quickAction){
 return `<table class="table"><thead><tr><th>${esc(t('orderNumber'))}</th><th>${esc(t('customer'))}</th><th>${esc(t('product'))}</th><th>${esc(t('fulfillment'))}</th><th>${esc(t('date'))}</th><th>${esc(t('timeSlot'))}</th><th>${esc(t('status'))}</th><th>${esc(t('notification'))}</th>${quickAction?'<th></th>':''}</tr></thead><tbody>${rows.map(o=>`<tr class="row-link" data-href="#/orders/${esc(o.id)}">
  <td data-label="${esc(t('orderNumber'))}" class="mono">${esc(o.id)}${sourceBadge(o)}</td>
  <td data-label="${esc(t('customer'))}"><b>${esc(o.customer_name)}</b>${o.customer_phone?`<small class="block">${esc(o.customer_phone)}</small>`:''}</td>
  <td data-label="${esc(t('product'))}">${orderLines(o)}</td>
  <td data-label="${esc(t('fulfillment'))}">${fulfillmentPill(o)}</td>
  <td data-label="${esc(t('date'))}">${esc(formatDate(o.fulfillment_date))}</td>
  <td data-label="${esc(t('timeSlot'))}">${esc(slotLabel(o.time_slot))||'—'}</td>
  <td data-label="${esc(t('status'))}">${pill('orderStatus',o.status)}</td>
  <td data-label="${esc(t('notification'))}">${notificationPill(o)}</td>
  ${quickAction==='open'?`<td><a class="button small" href="#/orders/${esc(o.id)}">${esc(t('open'))}</a></td>`:quickAction?`<td><button type="button" class="small primary" data-order-quick="${quickAction}" data-id="${esc(o.id)}">${esc(T[lang].orderAction[quickAction])}</button></td>`:''}
 </tr>`).join('')}</tbody></table>`;
}
function bindOrderQuickActions(){
 view.querySelectorAll('[data-order-quick]').forEach(button=>button.addEventListener('click',async e=>{
  e.stopPropagation();button.disabled=true;
  try{await api(`/api/admin/orders/${encodeURIComponent(button.dataset.id)}/status`,{method:'POST',body:{status:button.dataset.orderQuick}});toast(t('saved'));route();}
  catch(error){toast(describe(error),{error:true});button.disabled=false;}
 }));
}
async function orderList(params){
 const filters={from:params.get('from')||'',to:params.get('to')||'',fulfillment:params.get('fulfillment')||'',status:params.get('status')||'',notification:params.get('notification')||'',q:params.get('q')||''};
 const statuses=filters.status.split(',').filter(Boolean);
 view.innerHTML=`<div class="view-head"><h1>${esc(t('orders'))}</h1><div class="actions"><a class="button" href="#/orders/schedule">${esc(t('schedule'))}</a><a class="button primary" href="#/orders/new">${esc(t('newOrder'))}</a></div></div>
  <form class="filters" id="order-filters">
   ${field(t('date'),`<input type="date" name="from" value="${esc(filters.from)}">`)}
   ${field('→',`<input type="date" name="to" value="${esc(filters.to)}">`)}
   ${field(t('fulfillment'),`<select name="fulfillment"><option value="">${esc(t('all'))}</option>${options(FULFILLMENT_TYPES,filters.fulfillment,T[lang].fulfillmentType)}</select>`)}
   ${field(t('status'),`<select name="status"><option value="">${esc(t('all'))}</option>${statuses.length>1?`<option value="${esc(filters.status)}" selected>${esc(statuses.map(s=>T[lang].orderStatus[s]||s).join(' + '))}</option>`:''}${options(ORDER_STATUSES,statuses.length===1?statuses[0]:'',T[lang].orderStatus)}</select>`)}
   ${field(t('notification'),`<select name="notification"><option value="">${esc(t('all'))}</option>${options(['not_sent','sent'],filters.notification,T[lang].notificationStatus)}</select>`)}
   ${field(t('search'),`<input type="search" name="q" value="${esc(filters.q)}" maxlength="100">`)}
   <button type="submit">${esc(t('filter'))}</button><a class="button ghost" href="#/orders">${esc(t('clear'))}</a>
  </form><div id="order-table"><p class="muted">${esc(t('loading'))}</p></div>`;
 const form=document.getElementById('order-filters');
 form.addEventListener('submit',e=>{e.preventDefault();const q=new URLSearchParams([...new FormData(form)].filter(([,v])=>v));location.hash='#/orders'+(String(q)?'?'+q:'');});
 const {orders}=await api('/api/admin/orders?'+new URLSearchParams(Object.entries(filters).filter(([,v])=>v)));
 document.getElementById('order-table').innerHTML=orders.length?orderTable(orders):`<p class="empty">${esc(t('empty'))}</p>`;
}
// One day on the bench: pickups and deliveries per time slot, with the slot's capacity.
async function orderSchedule(params){
 const date=params.get('date')||today();
 view.innerHTML=`<div class="view-head"><h1>${esc(t('schedule'))}</h1><a class="button" href="#/orders">${esc(t('back'))}</a></div>
  <form class="filters" id="schedule-filters">${field(t('date'),`<input type="date" name="date" value="${esc(date)}">`)}<button type="button" class="ghost" data-shift="-1">‹</button><button type="button" class="ghost" data-shift="1">›</button></form><div id="schedule"><p class="muted">${esc(t('loading'))}</p></div>`;
 const form=document.getElementById('schedule-filters');
 form.addEventListener('change',()=>{location.hash='#/orders/schedule?date='+form.elements.date.value;});
 form.querySelectorAll('[data-shift]').forEach(b=>b.addEventListener('click',()=>{const d=new Date(form.elements.date.value+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+Number(b.dataset.shift));location.hash='#/orders/schedule?date='+d.toISOString().slice(0,10);}));
 const data=await api('/api/admin/orders/schedule?date='+encodeURIComponent(date));
 const groups=[...data.slots,...(data.unslotted.length?[{id:'',start:'',end:'',orders:data.unslotted}]:[])];
 const capacityText=slot=>{const c=data.capacity?.slots?.[slot.id];return c?`${c.used} / ${c.capacity===null?t('unlimited'):c.capacity} ${t('used')}`:'';};
 const columns=[['pickup','pickupSchedule'],['delivery','deliverySchedule']];
 document.getElementById('schedule').innerHTML=`<div class="schedule-grid">${columns.map(([type,label])=>`<section class="card"><h2>${esc(t(label))} <small>${data.slots.reduce((n,s)=>n+s.orders.filter(o=>o.fulfillment_type===type).length,0)+data.unslotted.filter(o=>o.fulfillment_type===type).length}</small></h2>${groups.map(slot=>{const rows=slot.orders.filter(o=>o.fulfillment_type===type);return `<div class="slot"><h3>${esc(slot.id?slotLabel(slot.id):t('noSlot'))} <small>${esc(capacityText(slot))}</small></h3>${rows.length?rows.map(o=>`<a class="slot-order" href="#/orders/${esc(o.id)}"><span class="mono">${esc(o.id)}</span>${pill('orderStatus',o.status)}<b>${esc(o.customer_name)}</b><small>${esc((o.items||[]).map(i=>`${lineText(i)} ×${i.quantity}`).join(', '))}${type==='delivery'&&o.delivery_address?` · ${esc(o.delivery_address)}`:''}</small>${o.message_card?`<em>“${esc(o.message_card)}”</em>`:''}</a>`).join(''):`<p class="muted">—</p>`}</div>`;}).join('')}</section>`).join('')}</div>`;
}
// Staff-entered order (a customer on the phone / Zalo). The price is computed by the Worker.
async function orderNew(){
 const sale=catalog.filter(p=>p.type==='sale');
 const o=ordering();
 view.innerHTML=`<div class="view-head"><h1>${esc(t('newOrder'))}</h1><a class="button" href="#/orders">${esc(t('back'))}</a></div>
  <form class="form card" id="order-form">
   ${field(t('product'),`<select name="product_id" required><option value="">${esc(t('pickProduct'))}</option>${sale.map(p=>`<option value="${esc(p.id)}">${esc(localized(p.name))} · ${esc(p.id)}</option>`).join('')}</select>`,'full')}
   <div class="full" id="order-options"></div>
   ${field(t('quantity'),`<input name="quantity" type="number" min="1" max="20" value="1">`)}
   ${field(t('status'),`<select name="status">${options(['confirmed','pending'],'confirmed',T[lang].orderStatus)}</select>`)}
   ${field(t('fulfillment'),`<select name="fulfillment_type">${options(FULFILLMENT_TYPES.filter(x=>o.fulfillment?.[x]!==false),'pickup',T[lang].fulfillmentType)}</select>`)}
   ${field(t('date'),`<input type="date" name="fulfillment_date" required value="${esc(today())}">`)}
   ${field(t('timeSlot'),`<select name="time_slot"><option value="">—</option>${(o.timeSlots||[]).map(s=>`<option value="${esc(s.id)}">${esc(slotLabel(s.id))}</option>`).join('')}</select>`)}
   <div class="full form" id="delivery-fields" hidden>${field(t('recipient'),`<input name="recipient_name" maxlength="100">`)}${field(t('recipientPhone'),`<input name="recipient_phone" type="tel" maxlength="40">`)}${field(t('address'),`<input name="delivery_address" maxlength="300">`,'full')}${field(t('deliveryNote'),`<input name="delivery_note" maxlength="300">`,'full')}</div>
   ${field(t('customer'),`<input name="customer_name" required maxlength="100">`)}
   ${field(t('phone'),`<input name="customer_phone" type="tel" maxlength="40">`)}
   ${field(t('messageCard'),`<textarea name="message_card" maxlength="${o.messageCard?.maxLength||200}"></textarea>`,'full')}
   ${field(t('note'),`<textarea name="note" maxlength="500"></textarea>`,'full')}
   <p class="form-error full" id="order-error"></p>
   <div class="form-footer"><button type="submit" class="primary">${esc(t('newOrder'))}</button></div>
  </form>`;
 const form=document.getElementById('order-form'),optionsBox=document.getElementById('order-options');
 function renderOptions(){
  const p=product(form.elements.product_id.value);
  optionsBox.innerHTML=p?Object.entries(p.options||{}).map(([group,choices])=>field(localized(o.options?.[group]?.label)||group,`<select data-option="${esc(group)}">${choices.map(c=>`<option value="${esc(c.id)}">${esc(optionText(group,c.id))}</option>`).join('')}</select>`)).join('')+((p.addons||[]).length?`<div class="field"><span>${esc(t('addons'))}</span><div class="radio-group">${p.addons.map(a=>`<label class="radio"><input type="checkbox" data-addon="${esc(a.id)}"><span>${esc(addonText(a.id))}</span></label>`).join('')}</div></div>`:''):'';
  optionsBox.classList.toggle('form',Boolean(p));
 }
 form.elements.product_id.addEventListener('change',renderOptions);
 form.elements.fulfillment_type.addEventListener('change',()=>{document.getElementById('delivery-fields').hidden=form.elements.fulfillment_type.value!=='delivery';});
 form.addEventListener('submit',async e=>{
  e.preventDefault();const error=document.getElementById('order-error');error.textContent='';
  const body=Object.fromEntries(new FormData(form));
  body.quantity=Number(body.quantity)||1;
  body.options=Object.fromEntries([...optionsBox.querySelectorAll('[data-option]')].map(el=>[el.dataset.option,el.value]));
  body.addons=[...optionsBox.querySelectorAll('[data-addon]:checked')].map(el=>el.dataset.addon);
  const button=form.querySelector('[type=submit]');button.disabled=true;
  try{const data=await api('/api/admin/orders',{method:'POST',body});toast(t('created'));location.hash='#/orders/'+encodeURIComponent(data.order.id);}
  catch(err){error.textContent=describe(err);button.disabled=false;}
 });
}
async function orderDetail(id){
 view.innerHTML=`<p class="muted">${esc(t('loading'))}</p>`;
 let o,notification,next;
 try{({order:o,notification,next}=await api(`/api/admin/orders/${encodeURIComponent(id)}`));}
 catch(error){view.innerHTML=`<div class="error-box">${esc(describe(error))}</div>`;return;}
 const line=(label,value)=>`<div class="contact-line"><span>${esc(label)}</span><b>${value}</b></div>`;
 view.innerHTML=`<div class="view-head"><h1>${esc(t('order'))} <small class="mono">${esc(o.id)}</small></h1><a class="button" href="#/orders">${esc(t('back'))}</a></div>
  <div class="card actions" id="status-actions" style="margin-bottom:14px">${pill('orderStatus',o.status)}${fulfillmentPill(o)}${sourceBadge(o)}
   ${next.filter(s=>s!=='cancelled').map((s,i)=>`<button type="button" class="${i===0?'primary':''}" data-status="${s}">${esc(T[lang].orderAction[s])}</button>`).join('')}
   ${next.includes('cancelled')?`<button type="button" class="danger" data-status="cancelled">${esc(T[lang].orderAction.cancelled)}</button>`:''}
  </div>
  <div class="order-grid">
   <section class="card"><h3>${esc(t('product'))}</h3>${(o.items||[]).map(i=>`<div class="request-summary">${thumb(i.product_id)}<div><b>${esc(productName(i.product_id))}</b><div class="muted">${esc(Object.entries(i.options||{}).map(([g,v])=>`${localized(ordering().options?.[g]?.label)||g}: ${optionText(g,v)}`).join(' · '))}</div>${(i.addons||[]).length?`<div class="muted">${esc(t('addons'))}: ${esc(i.addons.map(addonText).join(', '))}</div>`:''}<div>${esc(t('quantity'))} ${i.quantity} × ${esc(money(i.unit_price,o.currency))} = <b>${esc(money(i.line_total,o.currency))}</b></div></div></div>`).join('')}
    <div class="contact-block" style="margin-top:10px">${o.delivery_fee?line(t('deliveryFee'),esc(money(o.delivery_fee,o.currency))):''}${line(t('total'),`<span class="total">${esc(money(o.total,o.currency))}</span>`)}</div>
    <h3 style="margin-top:16px">${esc(t('messageCard'))}</h3><blockquote class="card-message">${o.message_card?esc(o.message_card):`<span class="muted">${esc(t('noCard'))}</span>`}</blockquote>
   </section>
   <section class="card"><h3>${esc(t('fulfillment'))}</h3><div class="contact-block">
    ${line(t('fulfillment'),fulfillmentPill(o))}${line(t('date'),esc(formatDate(o.fulfillment_date)))}${line(t('timeSlot'),esc(slotLabel(o.time_slot))||'—')}
    ${o.fulfillment_type==='delivery'?line(t('recipient'),esc([o.recipient_name,o.recipient_phone].filter(Boolean).join(' · ')))+line(t('address'),esc(o.delivery_address))+(o.delivery_note?line(t('deliveryNote'),esc(o.delivery_note)):''):''}
    ${o.note?line(t('note'),esc(o.note)):''}
   </div></section>
  </div>
  <div id="notify"></div>
  <form class="form card" id="order-edit">
   ${field(t('customer'),`<input name="customer_name" required maxlength="100" value="${esc(o.customer_name)}">`)}
   ${field(t('phone'),`<input name="customer_phone" type="tel" maxlength="40" value="${esc(o.customer_phone)}">`)}
   ${field(t('fulfillment'),`<select name="fulfillment_type">${options(FULFILLMENT_TYPES,o.fulfillment_type,T[lang].fulfillmentType)}</select>`)}
   ${field(t('date'),`<input type="date" name="fulfillment_date" required value="${esc(o.fulfillment_date)}">`)}
   ${field(t('timeSlot'),`<select name="time_slot"><option value="">—</option>${(ordering().timeSlots||[]).map(s=>`<option value="${esc(s.id)}"${s.id===o.time_slot?' selected':''}>${esc(slotLabel(s.id))}</option>`).join('')}</select>`)}
   ${field(t('deliveryFee'),`<input name="delivery_fee" type="number" min="0" step="1000" value="${esc(o.delivery_fee)}">`)}
   ${field(t('recipient'),`<input name="recipient_name" maxlength="100" value="${esc(o.recipient_name)}">`)}
   ${field(t('recipientPhone'),`<input name="recipient_phone" type="tel" maxlength="40" value="${esc(o.recipient_phone)}">`)}
   ${field(t('address'),`<input name="delivery_address" maxlength="300" value="${esc(o.delivery_address)}">`,'full')}
   ${field(t('deliveryNote'),`<input name="delivery_note" maxlength="300" value="${esc(o.delivery_note)}">`,'full')}
   ${field(t('messageCard'),`<textarea name="message_card" maxlength="500">${esc(o.message_card)}</textarea>`,'full')}
   ${field(t('note'),`<textarea name="note" maxlength="1000">${esc(o.note)}</textarea>`,'full')}
   <p class="form-error full" id="order-error"></p>
   <div class="form-footer"><button type="submit" class="primary">${esc(t('save'))}</button></div>
  </form>`;
 renderNotificationPanel(document.getElementById('notify'),o,notification,{endpoint:'/api/admin/orders',pendingHint:'orderNotifyPending',summaryLabel:'copyOrderSummary'});
 document.getElementById('status-actions').addEventListener('click',async e=>{
  const button=e.target.closest('[data-status]');if(!button)return;
  const status=button.dataset.status;
  if(status==='cancelled'&&!confirm(t('confirmCancelOrder')))return;
  button.disabled=true;
  try{await api(`/api/admin/orders/${encodeURIComponent(id)}/status`,{method:'POST',body:{status}});toast(status==='cancelled'?t('cancelled'):t('saved'));route();}
  catch(error){toast(describe(error),{error:true});button.disabled=false;}
 });
 const form=document.getElementById('order-edit');
 form.addEventListener('submit',async e=>{
  e.preventDefault();const error=document.getElementById('order-error');error.textContent='';
  const body=Object.fromEntries(new FormData(form));
  body.delivery_fee=Number.parseInt(body.delivery_fee,10)||0;
  const button=form.querySelector('[type=submit]');button.disabled=true;
  try{await api(`/api/admin/orders/${encodeURIComponent(id)}`,{method:'PATCH',body});toast(t('saved'));route();}
  catch(err){error.textContent=describe(err);button.disabled=false;}
 });
}

// --- Router ---------------------------------------------------------------------------------------
const routes=[
 [/^\/?$/,'dashboard',()=>dashboard()],
 [/^\/inventory$/,'inventory',(m,q)=>inventoryList(q)],
 [/^\/inventory\/new$/,'inventory',(m,q)=>inventoryNew(q)],
 [/^\/reservations$/,'reservations',(m,q)=>reservationList(q)],
 [/^\/reservations\/new$/,'reservations',()=>reservationForm('')],
 [/^\/reservations\/([^/?]+)$/,'reservations',m=>reservationForm(decodeURIComponent(m[1]))],
 [/^\/orders$/,'orders',(m,q)=>orderList(q)],
 [/^\/orders\/schedule$/,'orders',(m,q)=>orderSchedule(q)],
 [/^\/orders\/new$/,'orders',()=>orderNew()],
 [/^\/orders\/([^/?]+)$/,'orders',m=>orderDetail(decodeURIComponent(m[1]))],
 [/^\/settings$/,'settings',()=>settings()]
];
let routing=0;
async function route(){
 const token=++routing;
 const [path,query='']=location.hash.replace(/^#/,'').split('?');
 const params=new URLSearchParams(query);
 const found=routes.find(([pattern])=>pattern.test(path||'/'));
 if(!found){location.hash='#/';return;}
 const [pattern,nav,handler]=found;
 document.querySelectorAll('[data-route]').forEach(a=>{if(a.dataset.route===nav)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
 view.classList.remove('is-error');
 try{await handler((path||'/').match(pattern),params);}
 catch(error){if(token===routing&&error.status!==401)view.innerHTML=`<div class="error-box">${esc(describe(error))}</div>`;}
 window.scrollTo({top:0});
}
view.addEventListener('click',e=>{
 const row=e.target.closest('.row-link');
 if(row&&!e.target.closest('button,a,select,input'))location.hash=row.dataset.href;
});
function applyLanguage(){
 document.documentElement.lang=lang;
 document.querySelectorAll('[data-t]').forEach(el=>{el.textContent=t(el.dataset.t);});
 document.getElementById('admin-lang').value=lang;
 document.getElementById('bell').setAttribute('aria-label',t('notifications'));
 document.getElementById('read-only-banner').textContent=t('readOnly');
}

// --- Notification centre (the bell) ----------------------------------------------------------------
// Store-side alerts live inside the admin page: no push, no external service. Refreshed on every
// route change and whenever the panel opens; the badge counts everything that needs a hand today.
const bell=document.getElementById('bell'),bellCount=document.getElementById('bell-count'),panel=document.getElementById('notification-panel');
let alerts=null;
async function refreshAlerts(){
 try{alerts=await api('/api/admin/notifications');}catch{return;}
 const total=['newReservations','pickupsToday','returnsToday','overdue','pendingNotifications','newOrders','orderPickupsToday','orderDeliveriesToday','orderNotifications'].reduce((n,key)=>n+(alerts[key]?.length||0),0);
 bellCount.textContent=String(total);bellCount.hidden=!total;bell.classList.toggle('has-alerts',total>0);
 if(!panel.hidden)renderAlerts();
}
function renderAlerts(){
 if(!alerts){panel.innerHTML=`<p class="muted">${esc(t('loading'))}</p>`;return;}
 const groups=[['newOrders','newOrders'],['needNotification','orderNotifications'],['pickupsTodayOrders','orderPickupsToday'],['deliveriesToday','orderDeliveriesToday'],['newRequests','newReservations'],['needNotification','pendingNotifications'],['pickupsToday','pickupsToday'],['returnsToday','returnsToday'],['overdue','overdue']];
 const entry=r=>r.fulfillment_type
  ?`<a class="alert" href="#/orders/${esc(r.id)}"><span class="mono">${esc(r.id)}</span><b>${esc(r.customer_name)}</b><small>${esc(T[lang].fulfillmentType[r.fulfillment_type])} · ${esc(formatDate(r.fulfillment_date))}${r.time_slot?` · ${esc(slotLabel(r.time_slot))}`:''}</small><small>${esc((r.items||[]).map(i=>`${lineText(i)} ×${i.quantity}`).join(', '))}</small></a>`
  :`<a class="alert" href="#/reservations/${esc(r.id)}"><span class="mono">${esc(r.id)}</span><b>${esc(r.customer_name)}</b><small>${esc(dateRange(r.start_date,r.end_date))}${r.preferred_contact_channel?` · ${esc(T[lang].contactChannel[r.preferred_contact_channel])}`:''}</small><small>${esc(isRequest(r)?productName(r.request_product_id)+(r.request_size?` (${r.request_size})`:''):r.items.map(i=>productName(i.product_id)).join(', '))}</small></a>`;
 const sections=groups.filter(([,key])=>alerts[key]?.length).map(([label,key])=>`<section><h3>${esc(t(label))} <small>${alerts[key].length}</small></h3>${alerts[key].map(entry).join('')}</section>`);
 panel.innerHTML=`<div class="panel-head"><h2>${esc(t('notifications'))}</h2><button type="button" class="small ghost" id="close-panel" aria-label="×">×</button></div>${sections.join('')||`<p class="muted">${esc(t('noAlerts'))}</p>`}`;
 document.getElementById('close-panel').addEventListener('click',togglePanel);
}
function togglePanel(force){
 const open=typeof force==='boolean'?force:panel.hidden;
 panel.hidden=!open;bell.setAttribute('aria-expanded',String(open));
 if(open){renderAlerts();refreshAlerts();}
}
bell.addEventListener('click',()=>togglePanel());
panel.addEventListener('click',e=>{if(e.target.closest('a'))togglePanel(false);});
document.addEventListener('click',e=>{if(!panel.hidden&&!e.target.closest('#notification-panel,#bell'))togglePanel(false);});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden)togglePanel(false);});

document.getElementById('admin-lang').addEventListener('change',e=>{lang=e.target.value;try{localStorage.setItem('tiemora-admin-lang',lang);}catch{}applyLanguage();route();if(!panel.hidden)renderAlerts();});
document.getElementById('logout').addEventListener('click',async()=>{try{await api('/api/admin/logout',{method:'POST',body:{}});}catch{}location.replace('/admin/login');});
addEventListener('hashchange',()=>{route();refreshAlerts();});
// Installable as a home-screen app. The service worker caches nothing (bookings are private, always
// fresh) and receives the Web Push messages (see Settings).
if('serviceWorker' in navigator){try{navigator.serviceWorker.register('/admin/sw.js').catch(()=>{});}catch{}}
(async()=>{
 try{const data=await (await fetch('/store.json',{cache:'no-cache'})).json();if(data&&data.store)storeConfig=data;}catch{}
 // First visit: the language from config/store.yaml (admin.defaultLanguage); afterwards the staff's own choice.
 let stored=null;try{stored=localStorage.getItem('tiemora-admin-lang');}catch{}
 if(!T[stored])lang=T[storeConfig.admin?.defaultLanguage]?storeConfig.admin.defaultLanguage:'en';
 const brand=document.getElementById('brand-name');if(brand&&storeConfig.store?.name)brand.textContent=storeConfig.store.name;
 // A square mark fits the 48px header slot; a wordmark logo would be cropped, so the app icon stays.
 if(storeConfig.store?.logo&&storeConfig.store.logoStyle!=='wordmark'){const logo=document.getElementById('brand-logo');if(logo)logo.src=storeConfig.store.logo;}
 applyLanguage();
 try{catalog=await (await fetch('/catalog.json',{cache:'no-cache'})).json();productsById=new Map(catalog.map(p=>[p.id,p]));}
 catch{toast('catalog.json?',{error:true});}
 // Modules follow the catalog: only sale products -> Orders alone; no sale products -> the rental pages alone.
 modules.orders=catalog.some(p=>p.type==='sale');
 modules.rental=!modules.orders||catalog.some(p=>p.type!=='sale');
 document.querySelectorAll('[data-module]').forEach(a=>{a.hidden=!modules[a.dataset.module];});
 try{readOnly=Boolean((await api('/api/admin/session')).readOnly);}catch{}
 document.getElementById('read-only-banner').hidden=!readOnly;
 route();refreshAlerts();
})();
