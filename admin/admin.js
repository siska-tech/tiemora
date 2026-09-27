// Tiemora admin: a hash-routed page over /api/admin/*. Product names and photos come from the same
// /catalog.json the storefront uses and the store name / languages from /store.json; the database
// only knows inventory items, their status, bookings and push subscriptions.
const T={
 en:{adminTitle:'ADMIN',navDashboard:'Dashboard',navInventory:'Inventory',navReservations:'Bookings',navSettings:'Settings',logout:'Sign out',
  products:'Products',items:'Inventory items',rentedNow:'Rented now',upcoming:'Upcoming',maintenance:'In maintenance',returnsToday:'Returns today',pickupsToday:'Pick-ups today',today:'Today',
  itemStatus:{available:'Available',reserved:'Reserved',rented:'Rented',cleaning:'In care',maintenance:'Maintenance',inactive:'Inactive'},
  reservationStatus:{pending:'Pending',confirmed:'Confirmed',rented:'Rented',returned:'Returned',cancelled:'Cancelled'},
  customer:'Customer',phone:'Phone',facebook:'Facebook',start:'Start date',pickup:'Pick-up window',purposeRental:'Rental',purposeFitting:'Fitting',end:'End date',product:'Product',size:'Size',item:'Item ID',note:'Note',status:'Status',id:'ID',reservation:'Booking',
  add:'Add',save:'Save',back:'Back',newItem:'Add item',newReservation:'New booking',autoPick:'Pick a free item',addLine:'Add product',remove:'Remove',confirm:'Confirm',handOver:'Hand over',returned:'Returned',cancelReservation:'Cancel booking',filter:'Filter',clear:'Clear',search:'Name / phone / Facebook',all:'All',anySize:'Any size',
  saved:'Saved.',created:'Created.',deleted:'Deleted.',cancelled:'Booking cancelled.',loading:'Loading…',empty:'Nothing here yet.',confirmDelete:'Remove this item from the inventory?',confirmCancel:'Cancel this booking?',pickDates:'Choose start and end dates first.',pickProduct:'Choose a product.',addProduct:'Add another product',notInCatalog:'Not in catalog',free:'Free',taken:'Taken',noItems:'This product has no inventory items yet.',noFree:'No free item for these dates.',needItem:'Choose an item on every line.',
  idHint:'Suggested from the existing items. You can edit it.',inventoryOf:'Inventory',reservationsOf:'Bookings of this item',
  contact:'Contact',preferred:'Preferred channel',primary:'Preferred',whatsapp:'WhatsApp',zalo:'Zalo',messenger:'Messenger',messengerUrl:'Messenger link',zaloPhone:'Zalo number',usePhone:'Use phone number',notRegistered:'Not set',sameAsPhone:'Same as phone',privacyConsent:'Privacy consent',consentAccepted:'✓ Accepted',consentNone:'Not recorded (created by staff)',consentAt:'Consented at',
  contactChannel:{'':'—',messenger:'Messenger',zalo:'Zalo',whatsapp:'WhatsApp',phone:'Phone',other:'Other'},
  notification:'Customer notification',notificationStatus:{not_sent:'Not sent',sent:'Sent'},notificationChannel:{whatsapp:'WhatsApp',messenger:'Messenger',zalo:'Zalo',phone:'Phone',copy:'Copied',other:'Other'},
  language:'Language',message:'Message',sendWhatsapp:'Send on WhatsApp',openMessenger:'Open Messenger',call:'Call',copyZalo:'Copy Zalo number',copyPhone:'Copy phone number',copyMessage:'Copy message',copySummary:'Copy booking summary',otherChannels:'Other ways to reach them',copied:'Copied',
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
  availability:'Availability',availabilityHint:'What each item is doing, and when the next one comes free. Bookings themselves stay in the booking list.',handoverHours:'Handover hours',handoverHint:'When somebody is at the shop to hand an item over. An item being free is a separate question.',usualWeek:'Usual week',daysDiffer:'Days that differ',closedAllDay:'Away all day',handoverWindows:'Handover windows',addWindow:'Add a window',removeRow:'Remove',nextFree:'Next free',freeNow:'Free now',noExceptions:'No days set yet.',occupiedLabel:'Booked out',daysShown:'Days shown',memo:'Note',exceptionSaved:'Day saved.',exceptionRemoved:'Day removed.',needWindow:'Add a window, or mark the day away.',totalItems:'Items',neverFree:'No date',timeAxis:'Next {n} days',noStock:'No inventory items yet.',
  capacity:'Capacity',used:'used',unlimited:'no limit',copyOrderSummary:'Copy order summary',pickDate:'Choose a date.',readOnly:'Demo mode: this admin is read-only. You can browse everything, but changes are not saved.',
  errors:{read_only:'Demo mode: changes are not saved.',capacity_full:'This time slot is full.',sold_out:'This product is sold out.',invalid_transition:'This status change is not allowed from the current status.',inventory_conflict:'This item is already booked for those dates.',inventory_unavailable:'No free item (or the item is in maintenance / inactive) for these dates.',inventory_exists:'This item ID already exists.',inventory_in_use:'This item is used by a booking. Set it to "Inactive" instead of deleting it.',not_pending:'This booking is no longer pending.',unauthorized:'Your session has expired. Please sign in again.',validation_error:'Please check the input.',not_found:'Not found.',network:'Could not reach the server.'}},
 vi:{adminTitle:'QUẢN LÝ CỬA HÀNG',navDashboard:'Tổng quan',navInventory:'Kho hàng',navReservations:'Đặt lịch',navSettings:'Cài đặt',logout:'Đăng xuất',
  products:'Sản phẩm',items:'Hàng thực tế',rentedNow:'Đang cho thuê',upcoming:'Lịch sắp tới',maintenance:'Đang bảo trì',returnsToday:'Trả hôm nay',pickupsToday:'Giao hôm nay',today:'Hôm nay',
  itemStatus:{available:'Có sẵn',reserved:'Đã giữ',rented:'Đang cho thuê',cleaning:'Đang giặt ủi',maintenance:'Bảo trì',inactive:'Ngừng dùng'},
  reservationStatus:{pending:'Chờ xác nhận',confirmed:'Đã xác nhận',rented:'Đã giao',returned:'Đã trả',cancelled:'Đã hủy'},
  customer:'Khách hàng',phone:'Điện thoại',facebook:'Facebook',start:'Ngày thuê',pickup:'Khung giờ nhận',purposeRental:'Thuê',purposeFitting:'Thử đồ',end:'Ngày trả',product:'Sản phẩm',size:'Cỡ',item:'Mã hàng',note:'Ghi chú',status:'Trạng thái',id:'Mã',reservation:'Đặt lịch',
  add:'Thêm',save:'Lưu',back:'Quay lại',newItem:'Thêm hàng',newReservation:'Tạo đặt lịch',autoPick:'Tự chọn hàng trống',addLine:'Thêm sản phẩm',remove:'Xóa',confirm:'Xác nhận',handOver:'Đã giao hàng',returned:'Đã nhận trả',cancelReservation:'Hủy đặt lịch',filter:'Lọc',clear:'Xóa lọc',search:'Tìm tên / SĐT / Facebook',all:'Tất cả',anySize:'Mọi cỡ',
  saved:'Đã lưu.',created:'Đã tạo.',deleted:'Đã xóa.',cancelled:'Đã hủy đặt lịch.',loading:'Đang tải…',empty:'Chưa có dữ liệu.',confirmDelete:'Xóa mã hàng này khỏi kho?',confirmCancel:'Hủy đặt lịch này?',pickDates:'Chọn ngày thuê và ngày trả trước.',pickProduct:'Chọn sản phẩm.',addProduct:'Thêm sản phẩm',notInCatalog:'Không có trong catalog',free:'Trống',taken:'Đã đặt',noItems:'Sản phẩm này chưa có hàng trong kho.',noFree:'Không còn hàng trống cho khoảng ngày này.',needItem:'Mỗi dòng cần chọn một mã hàng.',
  idHint:'Gợi ý theo số hàng hiện có. Có thể sửa.',inventoryOf:'Hàng trong kho',reservationsOf:'Lịch của mã này',
  contact:'Liên hệ',preferred:'Kênh liên hệ ưu tiên',primary:'Ưu tiên',whatsapp:'WhatsApp',zalo:'Zalo',messenger:'Messenger',messengerUrl:'Link Messenger',zaloPhone:'Số Zalo',usePhone:'Dùng số điện thoại',notRegistered:'Chưa có',sameAsPhone:'Giống số điện thoại',privacyConsent:'Đồng ý bảo mật',consentAccepted:'✓ Đã đồng ý',consentNone:'Chưa ghi nhận (tạo tại cửa hàng)',consentAt:'Thời điểm đồng ý',
  contactChannel:{'':'—',messenger:'Messenger',zalo:'Zalo',whatsapp:'WhatsApp',phone:'Điện thoại',other:'Khác'},
  notification:'Thông báo cho khách',notificationStatus:{not_sent:'Chưa gửi',sent:'Đã gửi'},notificationChannel:{whatsapp:'WhatsApp',messenger:'Messenger',zalo:'Zalo',phone:'Điện thoại',copy:'Sao chép',other:'Khác'},
  language:'Ngôn ngữ',message:'Nội dung tin nhắn',sendWhatsapp:'Gửi qua WhatsApp',openMessenger:'Mở Messenger',call:'Gọi',copyZalo:'Sao chép số Zalo',copyPhone:'Sao chép SĐT',copyMessage:'Sao chép tin nhắn',copySummary:'Sao chép thông tin đặt lịch',otherChannels:'Cách liên hệ khác',copied:'Đã sao chép',
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
  availability:'Tình trạng',availabilityHint:'Mỗi món hàng đang ở đâu, và khi nào có món tiếp theo. Danh sách đặt thuê vẫn ở mục cũ.',handoverHours:'Giờ giao nhận',handoverHint:'Giờ có người ở cửa hàng để giao và nhận hàng. Việc món hàng có trống hay không là chuyện khác.',usualWeek:'Lịch thường',daysDiffer:'Ngày khác lệ thường',closedAllDay:'Nghỉ cả ngày',handoverWindows:'Khung giờ giao nhận',addWindow:'Thêm khung giờ',removeRow:'Xoá',nextFree:'Sắp trống',freeNow:'Đang trống',noExceptions:'Chưa đặt ngày nào.',occupiedLabel:'Đã có khách',daysShown:'Số ngày hiển thị',memo:'Ghi chú',exceptionSaved:'Đã lưu ngày này.',exceptionRemoved:'Đã xoá ngày này.',needWindow:'Thêm khung giờ, hoặc đánh dấu nghỉ cả ngày.',totalItems:'Số lượng',neverFree:'Chưa có',timeAxis:'{n} ngày tới',noStock:'Chưa có hàng nào trong kho.',
  capacity:'Sức chứa',used:'đã dùng',unlimited:'không giới hạn',copyOrderSummary:'Sao chép thông tin đơn',pickDate:'Chọn ngày.',readOnly:'Chế độ demo: trang quản lý chỉ xem. Bạn có thể xem mọi thứ nhưng thay đổi không được lưu.',
  errors:{read_only:'Chế độ demo: thay đổi không được lưu.',capacity_full:'Khung giờ này đã hết chỗ.',sold_out:'Sản phẩm này đã hết hàng.',invalid_transition:'Không thể chuyển sang trạng thái này từ trạng thái hiện tại.',inventory_conflict:'Hàng này đã được đặt trong khoảng ngày đó.',inventory_unavailable:'Không còn hàng trống (hoặc đang bảo trì / ngừng dùng) cho khoảng ngày này.',inventory_exists:'Mã hàng đã tồn tại.',inventory_in_use:'Mã hàng đang nằm trong đặt lịch. Hãy chuyển sang "Ngừng dùng" thay vì xóa.',not_pending:'Đặt lịch này không còn ở trạng thái chờ xác nhận.',unauthorized:'Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.',validation_error:'Dữ liệu chưa hợp lệ.',not_found:'Không tìm thấy.',network:'Không kết nối được máy chủ.'}},
 ja:{adminTitle:'店舗管理',navDashboard:'ダッシュボード',navInventory:'在庫',navReservations:'予約',navSettings:'設定',logout:'ログアウト',
  products:'商品数',items:'実在庫数',rentedNow:'貸出中',upcoming:'今後の予約',maintenance:'メンテナンス中',returnsToday:'今日返却予定',pickupsToday:'今日貸出開始',today:'今日',
  itemStatus:{available:'利用可',reserved:'予約済',rented:'貸出中',cleaning:'手入れ中',maintenance:'メンテナンス',inactive:'無効'},
  reservationStatus:{pending:'保留',confirmed:'確定',rented:'貸出中',returned:'返却済',cancelled:'キャンセル'},
  customer:'顧客名',phone:'電話',facebook:'Facebook',start:'貸出日',pickup:'受取時間帯',purposeRental:'レンタル',purposeFitting:'試着',end:'返却日',product:'商品',size:'サイズ',item:'在庫ID',note:'備考',status:'状態',id:'ID',reservation:'予約',
  add:'追加',save:'保存',back:'戻る',newItem:'在庫追加',newReservation:'予約作成',autoPick:'空いている実物を自動選択',addLine:'商品を追加',remove:'削除',confirm:'確定',handOver:'貸出（引き渡し）',returned:'返却処理',cancelReservation:'予約をキャンセル',filter:'絞り込み',clear:'クリア',search:'名前 / 電話 / Facebook',all:'すべて',anySize:'全サイズ',
  saved:'保存しました。',created:'作成しました。',deleted:'削除しました。',cancelled:'予約をキャンセルしました。',loading:'読み込み中…',empty:'データがありません。',confirmDelete:'この在庫を削除しますか？',confirmCancel:'この予約をキャンセルしますか？',pickDates:'先に貸出日と返却日を選択してください。',pickProduct:'商品を選択してください。',addProduct:'商品を追加',notInCatalog:'カタログにありません',free:'空き',taken:'予約あり',noItems:'この商品には在庫が登録されていません。',noFree:'この期間に空いている在庫がありません。',needItem:'各行で在庫IDを選択してください。',
  idHint:'既存の在庫数から自動提案。編集できます。',inventoryOf:'在庫一覧',reservationsOf:'この在庫の予約一覧',
  contact:'連絡先',preferred:'希望の連絡チャネル',primary:'優先',whatsapp:'WhatsApp',zalo:'Zalo',messenger:'Messenger',messengerUrl:'Messenger URL',zaloPhone:'Zalo番号',usePhone:'電話番号を使用',notRegistered:'未登録',sameAsPhone:'電話番号と同じ',privacyConsent:'プライバシー同意',consentAccepted:'✓ 同意済み',consentNone:'記録なし（店舗で作成）',consentAt:'同意日時',
  contactChannel:{'':'—',messenger:'Messenger',zalo:'Zalo',whatsapp:'WhatsApp',phone:'電話',other:'その他'},
  notification:'顧客通知',notificationStatus:{not_sent:'未送信',sent:'送信済み'},notificationChannel:{whatsapp:'WhatsApp',messenger:'Messenger',zalo:'Zalo',phone:'電話',copy:'コピー',other:'その他'},
  language:'言語',message:'通知文',sendWhatsapp:'WhatsAppで送信',openMessenger:'Messengerで開く',call:'電話をかける',copyZalo:'Zalo番号をコピー',copyPhone:'電話番号をコピー',copyMessage:'通知文をコピー',copySummary:'予約情報をコピー',otherChannels:'その他の連絡手段',copied:'コピーしました',
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
  availability:'空き状況',availabilityHint:'各在庫がいま何をしていて、次にいつ貸し出せるか。予約そのものの一覧は従来どおりです。',handoverHours:'受渡し時間',handoverHint:'受け渡しに対応できる人がいる時間です。商品が空いているかどうかとは別の話です。',usualWeek:'通常の週',daysDiffer:'通常と異なる日',closedAllDay:'終日対応不可',handoverWindows:'受渡し時間帯',addWindow:'時間帯を追加',removeRow:'削除',nextFree:'次回貸出可能',freeNow:'現在空き',noExceptions:'まだ設定はありません。',occupiedLabel:'占有',daysShown:'表示日数',memo:'メモ',exceptionSaved:'この日の設定を保存しました。',exceptionRemoved:'この日の設定を削除しました。',needWindow:'時間帯を追加するか、終日対応不可にしてください。',totalItems:'在庫数',neverFree:'未定',timeAxis:'今後{n}日',noStock:'在庫がまだ登録されていません。',
  capacity:'枠',used:'使用',unlimited:'上限なし',copyOrderSummary:'注文情報をコピー',pickDate:'日付を選択してください。',readOnly:'デモモード: この管理画面は閲覧専用です。変更は保存されません。',
  errors:{read_only:'デモモード: 変更は保存されません。',capacity_full:'この時間帯は満枠です。',sold_out:'この商品は売り切れです。',invalid_transition:'現在の状態からこの状態には変更できません。',inventory_conflict:'この期間は既に予約済みです。',inventory_unavailable:'この期間に空いている在庫がありません（またはメンテナンス中 / 無効）。',inventory_exists:'この在庫IDは既に存在します。',inventory_in_use:'この在庫は予約で使用中です。削除せず「無効」に変更してください。',not_pending:'この予約は保留状態ではありません。',unauthorized:'セッションが切れました。再ログインしてください。',validation_error:'入力内容を確認してください。',not_found:'見つかりません。',network:'サーバーに接続できません。'}}
};
for(const [key,label] of Object.entries({en:['Dine in','Dine-in orders','Table'],vi:['Ăn tại quán','Đơn tại quán','Số bàn'],ja:['店内注文','店内注文','テーブル番号']})){T[key].fulfillmentType.dine_in=label[0];T[key].dineInSchedule=label[1];T[key].tableNumber=label[2];}
// Order Queue: the kitchen-facing lanes. Same strings pattern as the dine-in labels above.
for(const [key,label] of Object.entries({en:['Order queue','Nothing in this lane','Ordered at','No orders for this day'],vi:['Hàng đợi đơn','Không có đơn nào','Đặt lúc','Chưa có đơn nào trong ngày'],ja:['注文キュー','この列は空です','注文時刻','この日の注文はありません']})){T[key].queue=label[0];T[key].laneEmpty=label[1];T[key].orderedAt=label[2];T[key].queueEmpty=label[3];}
for (const [language, labels] of Object.entries({"en":{"stockToday":"Stock today","availableToday":"Available today","bookedToday":"Booked / held today","currentBooking":"Current booking / hold","nextBooking":"Next booking","noBooking":"None","unassignedRequests":"Requests awaiting stock assignment","unassignedHint":"These requests do not hold stock. Confirm a booking to assign an item.","overviewHint":"Stock counts follow the filters. Booking holds include buffer days; counts may overlap.","refreshStock":"Refresh","overdueReturn":"Return overdue"},"vi":{"stockToday":"Tình trạng kho hôm nay","availableToday":"Còn trống hôm nay","bookedToday":"Đã đặt / giữ hôm nay","currentBooking":"Lịch hiện tại / giữ hàng","nextBooking":"Lịch tiếp theo","noBooking":"Không có","unassignedRequests":"Yêu cầu chờ xếp hàng","unassignedHint":"Các yêu cầu này chưa giữ hàng. Xác nhận đặt lịch để xếp hàng.","overviewHint":"Số lượng theo bộ lọc. Lịch giữ hàng bao gồm ngày đệm; các nhóm có thể trùng nhau.","refreshStock":"Làm mới","overdueReturn":"Quá hạn trả"},"ja":{"stockToday":"今日の在庫状況","availableToday":"今日の空き","bookedToday":"今日の予約・確保","currentBooking":"現在の予約・確保","nextBooking":"次回の予約","noBooking":"なし","unassignedRequests":"在庫未割当の予約申請","unassignedHint":"この申請ではまだ在庫を確保していません。予約を確定すると割り当てられます。","overviewHint":"在庫数は絞り込み結果です。予約・確保は前後の確保日数を含み、各集計には重複があります。","refreshStock":"更新","overdueReturn":"返却期限超過"}})) Object.assign(T[language], labels);
// ASAP orders carry no slot.
for(const [key,label] of Object.entries({en:['ASAP'],vi:['Ngay bây giờ'],ja:['できあがり次第']})){T[key].asap=label[0];}
// Menu / sold-out switch.
for(const [key,label] of Object.entries({en:['Menu','Switch a dish off while it lasts; the catalog decides everything else.','Category','Stock','Sold out'],vi:['Thực đơn','Tắt món khi hết; mọi thứ còn lại do catalog quyết định.','Danh mục','Tồn','Hết món'],ja:['メニュー','品切れの品をここで止めます。それ以外はカタログの設定に従います。','カテゴリ','在庫','品切れ']})){T[key].navMenu=label[0];T[key].menuHint=label[1];T[key].category=label[2];T[key].stock=label[3];T[key].soldOut=label[4];}
// Availability timeline: what each garment is doing hour by hour, in words as well as colours, so a
// screen reader hears "rented from 24 Sep 19:00 to 25 Sep 19:00" where others see a bar.
for(const [language,labels] of Object.entries({
 en:{segment:{rented:'Rented out',reserved:'Booked',fitting:'Fitting',returned:'Returned',cleaning:'In care',maintenance:'Maintenance',blocked:'Out of service',available:'Available',past:'Past'},
  segmentPhrase:'{kind} from {start} to {end}',week:'Next 7 days',viewDetail:'Details',bookItem:'Book this item',moreInfo:'More',lessInfo:'Less',readyAt:'Ready again',dueBack:'Return due',actualReturn:'Returned at',bookingType:'Type',assignedItem:'Item',openBooking:'Open booking',
  byProduct:'Free by product',freeOf:'{free} of {total} free all day',partFree:'{n} free part of the day',legend:'Legend',period:'Period',daysLabel:'{n} days',asList:'Show as a list',chartFailed:'The chart could not load. The list below has the same information.',chartLabel:'Timeline chart. The same schedule is in the list below.',
  nowMarker:'Now',close:'Close',allItems:'All items',nowDoing:'Now',todayMark:'today',untilLater:'later',noSchedule:'No timeline for this item.'},
 vi:{segment:{rented:'Đang cho thuê',reserved:'Đã đặt',fitting:'Thử đồ',returned:'Đã trả',cleaning:'Đang giặt ủi',maintenance:'Bảo trì',blocked:'Ngừng dùng',available:'Trống',past:'Đã qua'},
  segmentPhrase:'{kind} từ {start} đến {end}',week:'7 ngày tới',viewDetail:'Xem chi tiết',bookItem:'Đặt bộ này',moreInfo:'Thêm',lessInfo:'Thu gọn',readyAt:'Sẵn sàng lại',dueBack:'Hạn trả',actualReturn:'Đã trả lúc',bookingType:'Loại',assignedItem:'Mã hàng',openBooking:'Mở đặt lịch',
  byProduct:'Còn trống theo sản phẩm',freeOf:'{free}/{total} trống cả ngày',partFree:'{n} trống một phần ngày',legend:'Chú thích',period:'Khoảng thời gian',daysLabel:'{n} ngày',asList:'Xem dạng danh sách',chartFailed:'Không tải được biểu đồ. Danh sách bên dưới có cùng thông tin.',chartLabel:'Biểu đồ lịch. Cùng lịch này có trong danh sách bên dưới.',
  nowMarker:'Bây giờ',close:'Đóng',allItems:'Tất cả mã hàng',nowDoing:'Hiện tại',todayMark:'hôm nay',untilLater:'về sau',noSchedule:'Không có lịch cho mã này.'},
 ja:{segment:{rented:'レンタル中',reserved:'予約済み',fitting:'試着',returned:'返却済み',cleaning:'お手入れ中',maintenance:'メンテナンス',blocked:'利用停止',available:'利用可',past:'経過'},
  segmentPhrase:'{start}から{end}まで{kind}',week:'今後7日',viewDetail:'詳細を見る',bookItem:'この在庫を予約',moreInfo:'その他',lessInfo:'閉じる',readyAt:'次に貸出可能',dueBack:'返却予定',actualReturn:'実際の返却',bookingType:'予約種別',assignedItem:'割当在庫',openBooking:'予約を開く',
  byProduct:'商品別の空き',freeOf:'{total}点中{free}点が終日空き',partFree:'{n}点は一部の時間のみ空き',legend:'凡例',period:'表示期間',daysLabel:'{n}日',asList:'一覧で表示',chartFailed:'チャートを読み込めませんでした。下の一覧に同じ情報があります。',chartLabel:'タイムラインチャート。同じ内容を下の一覧でも確認できます。',
  nowMarker:'現在',close:'閉じる',allItems:'全在庫',nowDoing:'現在',todayMark:'今日',untilLater:'以降',noSchedule:'この在庫のタイムラインはありません。'}
}))Object.assign(T[language],labels);
const CONTACT_CHANNELS=['messenger','zalo','whatsapp','phone','other'];
const NOTIFICATION_CHANNELS=['whatsapp','messenger','zalo','phone','copy','other'];
const NOTIFICATION_LANGUAGES=['vi','en','ja','zh'];
const ITEM_STATUSES=['available','reserved','rented','cleaning','maintenance','inactive'];
const RESERVATION_STATUSES=['pending','confirmed','rented','returned','cancelled'];
const ORDER_STATUSES=['pending','confirmed','preparing','ready','out_for_delivery','completed','cancelled'];
const FULFILLMENT_TYPES=['pickup','delivery','dine_in'];
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
 view.innerHTML=`<div class="view-head"><h1>${esc(t('navDashboard'))}</h1><div class="actions">${modules.orders?`<a class="button primary" href="#/orders/new">${esc(t('newOrder'))}</a><a class="button" href="#/orders/queue">${esc(t('queue'))}</a><a class="button" href="#/orders/schedule">${esc(t('schedule'))}</a>`:''}${modules.rental?`<a class="button${modules.orders?'':' primary'}" href="#/reservations/new">${esc(t('newReservation'))}</a><a class="button" href="#/inventory/new">${esc(t('newItem'))}</a>`:''}</div></div><p class="muted">${esc(t('loading'))}</p>`;
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
  <td data-label="${esc(t('start'))}">${r.purpose==='fitting'?`<small class="pill cleaning">${esc(t('purposeFitting'))}</small> `:''}${esc(formatDate(r.start_date))}${r.start_time?` <small class="muted">${esc(r.start_time)}</small>`:''}</td>
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

// --- Availability timeline (shared by the inventory list and the detailed schedule) ---------------
// The Worker works out every segment (core/inventory/timeline.mjs); the page only draws and names
// them. Moments are store-local "YYYY-MM-DDTHH:MM" and are formatted as UTC so the viewer's own
// time zone never shifts them.
const LOCALES={ja:'ja-JP',vi:'vi-VN',en:'en-GB'};
const SEGMENT_SYMBOL={rented:'■',reserved:'▣',fitting:'◆',returned:'✓',cleaning:'▒',maintenance:'▓',blocked:'×',available:'○',past:'·'};
const LEGEND_KINDS=['rented','reserved','fitting','cleaning','maintenance','available','blocked'];
const momentMs=moment=>Date.parse(moment+':00Z');
const segmentLabel=kind=>T[lang].segment?.[kind]||T.en.segment[kind]||kind;
function formatMoment(moment,{date=true}={}){
 if(!moment)return '';
 try{return new Intl.DateTimeFormat(LOCALES[lang]||'en-GB',{timeZone:'UTC',...(date?{month:'numeric',day:'numeric',weekday:'short'}:{}),hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(momentMs(moment)));}
 catch{return moment.replace('T',' ');}
}
function formatDay(date,options={month:'numeric',day:'numeric',weekday:'short'}){
 try{return new Intl.DateTimeFormat(LOCALES[lang]||'en-GB',{timeZone:'UTC',...options}).format(new Date(date+'T00:00:00Z'));}catch{return date;}
}
const shiftDay=(date,n)=>{const d=new Date(date+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);};
// "19:00" within a day, where the day's own midnight at the far end reads as 24:00.
const clockWithin=(moment,date)=>moment.slice(0,10)>date?'24:00':moment.slice(11,16);
const segmentPhrase=(kind,start,end)=>t('segmentPhrase').replace('{kind}',segmentLabel(kind)).replace('{start}',start).replace('{end}',end);
const segmentKey=kind=>`<span class="tl-key k-${esc(kind)}" aria-hidden="true">${SEGMENT_SYMBOL[kind]||''}</span>`;
// Bars are placed through the CSSOM: the admin's Content-Security-Policy ignores style="" attributes.
function applyGeometry(root){root.querySelectorAll('[data-l]').forEach(el=>{el.style.left=el.dataset.l+'%';el.style.width=el.dataset.w+'%';});}
const legend=({now=false}={})=>`<ul class="tl-legend" aria-label="${esc(t('legend'))}">${LEGEND_KINDS.map(kind=>`<li>${segmentKey(kind)}${esc(segmentLabel(kind))}</li>`).join('')}${now?`<li><span class="tl-now-key" aria-hidden="true"></span>${esc(t('nowMarker'))}</li>`:''}</ul>`;

// The last timeline the page loaded, so a tap on a day or a bar can open its details.
let timeline={items:new Map(),today:'',now:'',from:'',until:''};
function keepTimeline(data){
 timeline={items:new Map(data.items.map(item=>[item.id,item])),today:data.today,now:data.now,from:data.from,until:shiftDay(data.from,data.days)+'T00:00'};
 return data;
}
const bookHref=(item,date)=>'#/reservations/new?'+new URLSearchParams({product_id:item.product_id,item:item.id,start:date});
const scheduleHref=(params={})=>'#/inventory/schedule'+(Object.values(params).some(Boolean)?'?'+new URLSearchParams(Object.entries(params).filter(([,v])=>v)):'');

// One calendar day of one item as a tappable cell: the date, the day's pieces drawn to scale, and a
// symbol for what took most of it. Its accessible name spells every piece out with its times.
function daySentence(day){
 const parts=day.parts.filter(part=>part.kind!=='past');
 if(!parts.length)return segmentLabel('past');
 return parts.map(part=>segmentPhrase(part.kind,clockWithin(part.start,day.date),clockWithin(part.end,day.date))).join(lang==='ja'?'、':'; ');
}
function dayCell(item,day){
 const isToday=day.date===timeline.today,partFree=day.free>0&&day.state!=='available';
 const label=`${formatDay(day.date)}${isToday?` (${t('todayMark')})`:''}: ${daySentence(day)}`;
 const midnight=Date.parse(day.date+'T00:00:00Z');
 const bars=day.parts.map(part=>`<i class="k-${esc(part.kind)}" data-l="${((momentMs(part.start)-midnight)/864e5*100).toFixed(2)}" data-w="${((momentMs(part.end)-momentMs(part.start))/864e5*100).toFixed(2)}"></i>`).join('');
 return `<button type="button" class="tl-day s-${esc(day.state)}${partFree?' part-free':''}${isToday?' is-today':''}" data-tl-item="${esc(item.id)}" data-tl-day="${esc(day.date)}" aria-label="${esc(label)}" title="${esc(label)}"><span class="tl-date" aria-hidden="true">${esc(String(Number(day.date.slice(8))))}<small>${esc(formatDay(day.date,{weekday:'narrow'}))}</small></span><span class="tl-bar" aria-hidden="true">${bars}</span><span class="tl-sym" aria-hidden="true">${SEGMENT_SYMBOL[day.state]||''}${partFree?'<small>○</small>':''}</span></button>`;
}
const dayStrip=(item,extra='')=>`<div class="tl-week${extra}" role="group" aria-label="${esc(`${item.id} · ${t('timeAxis').replace('{n}',String(item.days.length))}`)}">${item.days.map(day=>dayCell(item,day)).join('')}</div>`;
// What an item is doing right now when that is not simply "free", and when it can go out again.
function nowLine(item){
 if(!item||!item.now||item.now==='available')return '';
 return `<small class="inv-now">${segmentKey(item.now)}${esc(t('nowDoing'))}: ${esc(segmentLabel(item.now))}${item.next_available?` · ${esc(t('readyAt'))} <b>${esc(formatMoment(item.next_available))}</b>`:''}</small>`;
}
// Per product and size, how many pieces are free each day: all day, and for part of it.
function productDayStrip(group){
 return `<ul class="tl-counts">${group.days.map(day=>{
  const level=day.free===0?(day.partial?'low':'none'):day.free<day.total/2?'low':'ok';
  const sentence=`${formatDay(day.date)}: ${t('freeOf').replace('{free}',day.free).replace('{total}',day.total)}${day.partial?`, ${t('partFree').replace('{n}',day.partial)}`:''}`;
  return `<li class="tl-count r-${level}${day.date===timeline.today?' is-today':''}" title="${esc(sentence)}"><span class="tl-date" aria-hidden="true">${esc(String(Number(day.date.slice(8))))}<small>${esc(formatDay(day.date,{weekday:'narrow'}))}</small></span><b aria-hidden="true">${day.free}</b>${day.partial?`<em aria-hidden="true">+${day.partial}</em>`:''}<span class="sr-only">${esc(sentence)}</span></li>`;
 }).join('')}</ul>`;
}

// Details of one segment, for the sheet a tap opens: who, what kind of booking, and the moments
// that matter -- collected, due back, actually back, ready again.
// Opened from a day, a free stretch books that day; opened from a bar, its first moment still ahead.
function segmentDetails(item,segment,{date=''}={}){
 const r=segment.reservation;
 const end=segment.end>=timeline.until?t('untilLater'):formatMoment(segment.end);
 const rows=[];
 if(r){
  rows.push([t('customer'),`<b>${esc(r.customer_name)}</b>`],[t('bookingType'),esc(r.purpose==='fitting'?t('purposeFitting'):t('purposeRental'))],[t('status'),pill('reservationStatus',r.status)],[t('start'),esc(formatMoment(r.start))]);
  if(r.purpose!=='fitting'){
   rows.push([t('dueBack'),esc(formatMoment(r.due))+(r.overdue?` <strong class="form-error">${esc(t('overdueReturn'))}</strong>`:'')]);
   if(r.returned)rows.push([t('actualReturn'),esc(formatMoment(r.returned))]);
  }
  rows.push([t('readyAt'),esc(formatMoment(r.ready))],[t('assignedItem'),`<span class="mono">${esc(item.id)}</span>`]);
  if(r.note)rows.push([t('note'),esc(r.note)]);
  rows.push([t('id'),`<span class="mono">${esc(r.id)}</span>`]);
 }else if(['cleaning','maintenance','blocked'].includes(segment.kind)&&item.next_available){
  rows.push([t('readyAt'),esc(formatMoment(item.next_available))]);
 }
 const actions=[];
 if(r)actions.push(`<a class="button small" href="#/reservations/${encodeURIComponent(r.id)}">${esc(t('openBooking'))}</a>`);
 if(segment.kind==='available')actions.push(`<a class="button small primary" href="${esc(bookHref(item,[segment.start,timeline.now,date&&date+'T00:00'].sort().at(-1).slice(0,10)))}">${esc(t('bookItem'))}</a>`);
 return `<section class="tl-seg"><h3>${segmentKey(segment.kind)} ${esc(segmentLabel(segment.kind))}</h3><p class="tl-when">${esc(formatMoment(segment.start))} – ${esc(end)}</p>${rows.length?`<dl class="tl-facts">${rows.map(([k,v])=>`<dt>${esc(k)}</dt><dd>${v}</dd>`).join('')}</dl>`:''}${actions.length?`<div class="actions">${actions.join('')}</div>`:''}</section>`;
}
// A small non-modal sheet: a bottom sheet on a phone, a floating panel on a desk. Escape or the
// close button puts focus back where it came from.
let sheetReturn=null;
function openSheet(title,body,trigger){
 let sheet=document.getElementById('tl-sheet');
 if(!sheet){
  sheet=document.createElement('div');sheet.id='tl-sheet';sheet.className='tl-sheet';sheet.setAttribute('role','dialog');sheet.setAttribute('aria-labelledby','tl-sheet-title');
  sheet.addEventListener('click',e=>{if(e.target.closest('[data-close-sheet]'))closeSheet();else if(e.target.closest('a'))closeSheet(false);});
  document.body.append(sheet);
 }
 sheet.innerHTML=`<div class="panel-head"><h2 id="tl-sheet-title" tabindex="-1">${title}</h2><button type="button" class="small ghost" data-close-sheet aria-label="${esc(t('close'))}">×</button></div><div class="tl-sheet-body">${body}</div>`;
 sheet.hidden=false;sheetReturn=trigger||null;
 sheet.querySelector('h2').focus();
}
function closeSheet(restore=true){
 const sheet=document.getElementById('tl-sheet');
 if(!sheet||sheet.hidden)return;
 sheet.hidden=true;
 if(restore&&sheetReturn?.isConnected)sheetReturn.focus();
 sheetReturn=null;
}
function openDaySheet(itemId,date,trigger){
 const item=timeline.items.get(itemId);if(!item)return;
 const start=date+'T00:00',end=shiftDay(date,1)+'T00:00';
 const segments=item.segments.filter(segment=>segment.end>start&&segment.start<end&&segment.kind!=='past');
 openSheet(`<span class="mono">${esc(item.id)}</span> <small>${esc(formatDay(date))}</small>`,
  (segments.map(segment=>segmentDetails(item,segment,{date})).join('')||`<p class="muted">${esc(segmentLabel('past'))}</p>`)+`<p><a class="button small" href="${esc(scheduleHref({product_id:item.product_id,item_id:item.id}))}">${esc(t('viewDetail'))}</a></p>`,trigger);
}
function openSegmentSheet(itemId,index,trigger){
 const item=timeline.items.get(itemId),segment=item?.segments[index];if(!segment)return;
 openSheet(`<span class="mono">${esc(item.id)}</span>`,segmentDetails(item,segment),trigger);
}
view.addEventListener('click',e=>{
 const day=e.target.closest('[data-tl-day]');
 if(day){openDaySheet(day.dataset.tlItem,day.dataset.tlDay,day);return;}
 const segment=e.target.closest('[data-tl-segment]');
 if(segment){const [id,index]=segment.dataset.tlSegment.split('|');openSegmentSheet(id,Number(index),segment);}
});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeSheet();});
document.addEventListener('click',e=>{if(!e.target.closest('#tl-sheet,[data-tl-day],[data-tl-segment],.gantt-chart'))closeSheet(false);});

function inventoryBooking(r,today){
 if(!r)return '<span class="muted">'+esc(t('noBooking'))+'</span>';
 return `<a class="inventory-booking" href="#/reservations/${encodeURIComponent(r.id)}"><b>${esc(r.customer_name)}</b><span>${esc(formatDate(r.start_date))} → ${esc(formatDate(r.end_date))}</span>${pill('reservationStatus',r.status)}${r.status==='rented'&&r.end_date<today?'<strong class="form-error">'+esc(t('overdueReturn'))+'</strong>':''}</a>`;
}
async function inventoryList(params){
 const productId=params.get('product_id')||'',status=params.get('status')||'';
 view.innerHTML=`<div class="view-head"><h1>${esc(t('navInventory'))}</h1><div class="view-actions"><a class="button" href="#/inventory/schedule">${esc(t('availability'))}</a><a class="button primary" href="#/inventory/new">${esc(t('newItem'))}</a></div></div>
  <form class="filters" id="inventory-filters">${field(t('product'),`<select name="product_id"><option value="">${esc(t('all'))}</option>${catalog.map(p=>`<option value="${esc(p.id)}"${p.id===productId?' selected':''}>${esc(localized(p.name))} · ${esc(p.id)}</option>`).join('')}</select>`)}${field(t('status'),`<select name="status"><option value="">${esc(t('all'))}</option>${options(ITEM_STATUSES,status,T[lang].itemStatus)}</select>`)}</form><div id="inventory-overview" aria-live="polite"></div><div id="inventory-week"></div><div id="inventory-table"><p class="muted">${esc(t('loading'))}</p></div>`;
 const form=document.getElementById('inventory-filters');
 form.addEventListener('change',()=>{const q=new URLSearchParams([...new FormData(form)].filter(([,v])=>v));location.hash='#/inventory'+(String(q)?'?'+q:'');});
 // The week strip is a second, lighter answer; the list still works when it fails.
 const [{items,today,summary,requests},week]=await Promise.all([
  api('/api/admin/inventory?'+new URLSearchParams(Object.fromEntries([['overview','1'],['product_id',productId],['status',status]].filter(([,v])=>v)))),
  api('/api/admin/inventory/timeline?'+new URLSearchParams({days:'7',...(productId?{product_id:productId}:{})})).then(keepTimeline).catch(()=>null)
 ]);
 document.getElementById('inventory-overview').innerHTML=`<section class="card inventory-overview"><div class="view-head"><h2>${esc(t('stockToday'))} <small>${esc(formatDate(today))}</small></h2><button type="button" id="refresh-stock">${esc(t('refreshStock'))}</button></div><p class="muted">${esc(t('overviewHint'))}</p><div class="stats">${[['items',summary.total],['availableToday',summary.available],['bookedToday',summary.booked],['rentedNow',summary.rented],['maintenance',summary.maintenance]].map(([key,value])=>`<div class="stat" data-stock="${key}"><span>${esc(t(key))}</span><b>${value}</b></div>`).join('')}</div></section>${requests.length?`<section class="card inventory-overview" id="inventory-requests"><h2>${esc(t('unassignedRequests'))} <small>${requests.length}</small></h2><p class="muted">${esc(t('unassignedHint'))}</p><div class="inventory-request-list">${requests.map(r=>`<div><b>${esc(productName(r.request_product_id))} · ${esc(r.request_size)}</b>${inventoryBooking(r,today)}</div>`).join('')}</div></section>`:''}`;
 document.getElementById('refresh-stock').addEventListener('click',()=>route());
 if(week?.products.length&&!status){
  document.getElementById('inventory-week').innerHTML=`<section class="card inventory-overview tl-products"><div class="view-head"><h2>${esc(t('byProduct'))} <small>${esc(t('week'))}</small></h2>${legend()}</div>
   ${week.products.map(group=>`<div class="tl-product"><a class="tl-product-name" href="${esc(scheduleHref({product_id:group.product_id}))}"><b>${esc(productName(group.product_id))}</b><small>${group.size?`${esc(t('size'))} ${esc(group.size)} · `:''}${esc(t('totalItems'))} ${group.total}</small></a>${productDayStrip(group)}</div>`).join('')}</section>`;
 }
 const table=document.getElementById('inventory-table');
 if(!items.length){table.innerHTML=`<p class="empty">${esc(t('empty'))}</p>`;return;}
 const th=key=>`<th>${esc(t(key))}</th>`;
 table.innerHTML=`<table class="table inv-table"><thead><tr>${th('product')}${th('item')}${th('size')}${th('status')}<th>${esc(t('week'))}</th>${th('currentBooking')}${th('nextBooking')}${th('note')}<th><span class="sr-only">${esc(t('open'))}</span></th></tr></thead><tbody>${items.map(i=>{
  const tl=week&&timeline.items.get(i.id);
  return `<tr data-item="${esc(i.id)}">
  <td class="product-cell c-product">${thumb(i.product_id)}<div><b>${esc(productName(i.product_id))}</b><small class="inv-sub">${i.size?`${esc(t('size'))} ${esc(i.size)} · `:''}<span class="mono">${esc(i.id)}</span></small></div></td>
  <td data-label="${esc(t('item'))}" class="mono c-id">${esc(i.id)}</td>
  <td data-label="${esc(t('size'))}" class="c-size">${esc(i.size)||'—'}</td>
  <td data-label="${esc(t('status'))}" class="c-status"><select class="inline-status" data-field="status" aria-label="${esc(t('status'))} ${esc(i.id)}">${options(ITEM_STATUSES,i.status,T[lang].itemStatus)}</select>${nowLine(tl)}</td>
  <td class="c-week">${tl?dayStrip(tl):'<span class="muted">—</span>'}</td>
  <td data-label="${esc(t('currentBooking'))}" class="inventory-current c-current">${i.current_reservations.length?i.current_reservations.map(r=>inventoryBooking(r,today)).join(''):esc(i.available_today?t('availableToday'):t('noBooking'))}</td>
  <td data-label="${esc(t('nextBooking'))}" class="inventory-next c-next">${inventoryBooking(i.next_reservation,today)}</td>
  <td data-label="${esc(t('note'))}" class="c-note"><input class="inline-note" data-field="note" value="${esc(i.note)}" placeholder="—" aria-label="${esc(t('note'))} ${esc(i.id)}"></td>
  <td class="c-actions"><div class="actions"><a class="button small" href="${esc(scheduleHref({product_id:i.product_id,item_id:i.id}))}">${esc(t('viewDetail'))}</a><a class="button small primary" href="${esc(bookHref(i,today))}">${esc(t('bookItem'))}</a><span class="inv-secondary"><a class="button small" href="#/reservations?q=${encodeURIComponent(i.id)}">${esc(t('reservationsOf'))}</a><button type="button" class="small danger" data-delete>${esc(t('remove'))}</button></span><button type="button" class="small ghost inv-toggle" data-toggle-row aria-expanded="false">${esc(t('moreInfo'))}</button></div></td>
 </tr>`;}).join('')}</tbody></table>`;
 applyGeometry(table);
 table.addEventListener('change',async e=>{
  const control=e.target.closest('[data-field]');if(!control)return;
  const id=control.closest('tr').dataset.item;control.disabled=true;
  try{await api(`/api/admin/inventory/${encodeURIComponent(id)}`,{method:'PATCH',body:{[control.dataset.field]:control.value}});toast(t('saved'));}
  catch(error){toast(describe(error),{error:true});}
  control.disabled=false;
  if(control.dataset.field==='status')await route();
 });
 table.addEventListener('click',async e=>{
  const toggle=e.target.closest('[data-toggle-row]');
  if(toggle){const open=toggle.closest('tr').classList.toggle('open');toggle.setAttribute('aria-expanded',String(open));toggle.textContent=t(open?'lessInfo':'moreInfo');return;}
  const button=e.target.closest('[data-delete]');if(!button)return;
  const id=button.closest('tr').dataset.item;
  if(!confirm(`${t('confirmDelete')}\n${id}`))return;
  try{await api(`/api/admin/inventory/${encodeURIComponent(id)}`,{method:'DELETE'});toast(t('deleted'));await route();}
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
async function reservationForm(id,params=new URLSearchParams()){
 const editing=Boolean(id);
 // "Book this item" from the inventory or the timeline arrives with the item and the day chosen.
 const presetItem=editing?'':params.get('item')||'',presetProduct=presetItem?params.get('product_id')||'':'';
 const presetStart=!editing&&/^\d{4}-\d{2}-\d{2}$/.test(params.get('start')||'')&&params.get('start')>=today()?params.get('start'):'';
 let current=null,notification=null;
 if(editing){
  view.innerHTML=`<p class="muted">${esc(t('loading'))}</p>`;
  try{({reservation:current,notification}=await api(`/api/admin/reservations/${encodeURIComponent(id)}`));}
  catch(error){view.innerHTML=`<div class="error-box">${esc(describe(error))}</div>`;return;}
 }
 const r=current||{customer_name:'',customer_phone:'',customer_facebook:'',preferred_contact_channel:'',customer_whatsapp:'',customer_messenger_url:'',customer_zalo_phone:'',start_date:presetStart||today(),end_date:presetStart||today(),status:'pending',note:'',items:[],request_product_id:'',request_size:''};
 const request=isRequest(r);
 const radio=(name,value,label,checked)=>`<label class="radio"><input type="radio" name="${name}" value="${esc(value)}"${checked?' checked':''}><span>${esc(label)}</span></label>`;
 view.innerHTML=`<div class="view-head"><h1>${editing?`${esc(request?t('request'):t('reservation'))} <small class="mono">${esc(id)}</small>`:esc(t('newReservation'))}</h1><a class="button" href="#/reservations">${esc(t('back'))}</a></div>
  ${editing?`<div class="card actions" id="status-actions" style="margin-bottom:14px">${pill('reservationStatus',r.status)}${sourceBadge(r)}
   ${['pending'].includes(r.status)?`<button type="button" class="${request?'primary':''}" data-status="confirmed">${esc(request?t('confirmRequest'):t('confirm'))}</button>`:''}
   ${['pending','confirmed'].includes(r.status)&&!request?`<button type="button" class="${request?'':'primary'}" data-status="rented">${esc(t('handOver'))}</button>`:''}
   ${['rented'].includes(r.status)?`<button type="button" class="primary" data-status="returned">${esc(t('returned'))}</button>`:''}
   ${!['cancelled','returned'].includes(r.status)?`<button type="button" class="danger" data-status="cancelled">${esc(t('cancelReservation'))}</button>`:''}
  </div>`:''}
  ${editing&&request?`<section class="card request-card" style="margin-bottom:14px"><h3>${esc(t('requested'))}</h3><div class="request-summary">${thumb(r.request_product_id)}<div><b>${esc(productName(r.request_product_id))}</b><div class="muted">${r.request_size?`${esc(t('size'))}: ${esc(r.request_size)} · `:''}${esc(dateRange(r.start_date,r.end_date))}${r.start_time?` · ${esc(t('pickup'))}: ${esc(r.start_time)}`:''}</div><div>${esc(r.customer_name)}${r.customer_phone?` · ${esc(r.customer_phone)}`:''}${r.preferred_contact_channel?` · ${esc(t('preferred'))}: ${esc(T[lang].contactChannel[r.preferred_contact_channel])}`:''}</div></div></div><p class="muted" style="margin:10px 0 0">${esc(t('requestHint'))}</p></section>`:''}
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
   if(r.start_time&&(r.rental_days>0||r.purpose==='fitting')){query.set('start_time',r.start_time);query.set('purpose',r.purpose||'rental');}
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
 if(!r.items.length)addLine(request?{product_id:r.request_product_id,size:r.request_size}:presetItem&&product(presetProduct)?{product_id:presetProduct,inventory_item_id:presetItem}:{});
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
 const reachable={whatsapp:()=>Boolean(n.whatsapp.number),messenger:()=>Boolean(n.messenger.url),zalo:()=>Boolean(n.zalo.phone),phone:()=>Boolean(n.phone)};
 const all=['whatsapp','messenger','zalo','phone'];
 const preferred=all.includes(n.preferred)?n.preferred:'';
 // The preferred channel leads (even if unusable, so staff see why); the rest fold away behind a summary.
 const order=preferred?[preferred]:all.filter(c=>reachable[c]());
 const others=all.filter(c=>!order.includes(c)&&reachable[c]());
 const channelRow=c=>`<div class="channel-row${c===preferred?' preferred':''}"><span class="channel-label">${esc(T[lang].contactChannel[c])}${c===preferred?` <em>${esc(t('primary'))}</em>`:''}</span><div class="actions">${channelRows[c]()}</div></div>`;
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
   <div class="channels">${order.map(channelRow).join('')}
    ${others.length?`<details class="more-channels"><summary>${esc(t('otherChannels'))} (${others.length})</summary>${others.map(channelRow).join('')}</details>`:''}
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
const whenLabel=o=>o?.asap?t('asap'):(slotLabel(o?.time_slot)||formatDate(o?.fulfillment_date));
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
  <td data-label="${esc(t('timeSlot'))}">${esc(o.asap?t('asap'):slotLabel(o.time_slot))||'—'}</td>
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
 view.innerHTML=`<div class="view-head"><h1>${esc(t('orders'))}</h1><div class="actions"><a class="button" href="#/orders/queue">${esc(t('queue'))}</a><a class="button" href="#/orders/schedule">${esc(t('schedule'))}</a><a class="button primary" href="#/orders/new">${esc(t('newOrder'))}</a></div></div>
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
 const columns=[['pickup','pickupSchedule'],['delivery','deliverySchedule'],['dine_in','dineInSchedule']];
 document.getElementById('schedule').innerHTML=`<div class="schedule-grid">${columns.map(([type,label])=>`<section class="card"><h2>${esc(t(label))} <small>${data.slots.reduce((n,s)=>n+s.orders.filter(o=>o.fulfillment_type===type).length,0)+data.unslotted.filter(o=>o.fulfillment_type===type).length}</small></h2>${groups.map(slot=>{const rows=slot.orders.filter(o=>o.fulfillment_type===type);return `<div class="slot"><h3>${esc(slot.id?slotLabel(slot.id):t('noSlot'))} <small>${esc(capacityText(slot))}</small></h3>${rows.length?rows.map(o=>`<a class="slot-order" href="#/orders/${esc(o.id)}"><span class="mono">${esc(o.id)}</span>${pill('orderStatus',o.status)}<b>${esc(o.customer_name)}</b><small>${esc((o.items||[]).map(i=>`${lineText(i)} ×${i.quantity}`).join(', '))}${type==='delivery'&&o.delivery_address?` · ${esc(o.delivery_address)}`:''}</small>${o.message_card?`<em>“${esc(o.message_card)}”</em>`:''}</a>`).join(''):`<p class="muted">—</p>`}</div>`;}).join('')}</section>`).join('')}</div>`;
}
// Menu: the sold-out switch for sale products. `ordering.stock` in product.yaml still counts down on
// its own; this is the manual override a shop reaches for when the beef runs out mid-service, and it
// only ever takes something off the menu. Rental stock lives in Inventory and is not touched here.
async function menuList() {
 view.innerHTML=`<div class="view-head"><h1>${esc(t('navMenu'))}</h1><a class="button" href="#/orders">${esc(t('orders'))}</a></div>
  <p class="hint hint">${esc(t('menuHint'))}</p><div id="menu-table"><p class="muted">${esc(t('loading'))}</p></div>`;
 const box=document.getElementById('menu-table');
 const render=products=>{
  if(!products.length){box.innerHTML=`<p class="empty">${esc(t('empty'))}</p>`;return;}
  box.innerHTML=`<table class="table"><thead><tr><th>${esc(t('product'))}</th><th>${esc(t('category'))}</th><th>${esc(t('stock'))}</th><th>${esc(t('soldOut'))}</th></tr></thead><tbody>${products.map(p=>`<tr data-product="${esc(p.product_id)}">
   <td data-label="${esc(t('product'))}">${thumb(p.product_id)} ${esc(localized(p.name)||p.product_id)}</td>
   <td data-label="${esc(t('category'))}">${esc(localized(storeConfig.categories?.[p.category])||p.category||'—')}</td>
   <td data-label="${esc(t('stock'))}">${p.stock===null?'—':`${p.remaining} / ${p.stock}`}</td>
   <td data-label="${esc(t('soldOut'))}"><label class="check"><input type="checkbox" data-sold-out${p.soldOutByStaff?' checked':''}><span>${esc(p.soldOutByStaff?t('soldOut'):t('available'))}</span></label></td>
  </tr>`).join('')}</tbody></table>`;
 };
 render((await api('/api/admin/products')).products);
 box.addEventListener('change',async e=>{
  const input=e.target.closest('[data-sold-out]');if(!input)return;
  const id=input.closest('[data-product]').dataset.product;
  input.disabled=true;
  try{render((await api(`/api/admin/products/${encodeURIComponent(id)}`,{method:'PATCH',body:{sold_out:input.checked}})).products);toast(t('saved'));}
  catch(error){toast(describe(error),{error:true});input.checked=!input.checked;input.disabled=false;}
 });
}
// Order Queue: the kitchen view. One lane per working status, newest at the bottom, every card
// carrying what the cook needs (table or pickup slot, lines with options and add-ons, the note) and
// the buttons that move it along. Terminal states are not lanes: a completed bowl leaves the screen.
// The status flow mirrors nextOrderStatuses in core/orders/rules.mjs; the Worker refuses the rest.
const QUEUE_LANES=['pending','confirmed','preparing','ready'];
const nextStatuses=(status,fulfillment)=>({
 pending:['confirmed','cancelled'],confirmed:['preparing','cancelled'],preparing:['ready','cancelled'],
 ready:fulfillment==='delivery'?['out_for_delivery','completed','cancelled']:['completed','cancelled'],
 out_for_delivery:['completed','cancelled']
}[status]||[]);
const queueWhen=o=>o.fulfillment_type==='dine_in'?(o.table_number?`${t('tableNumber')} ${o.table_number}`:t('asap')):whenLabel(o);
function queueCard(o){
 const actions=nextStatuses(o.status,o.fulfillment_type);
 const time=(o.created_at||'').slice(11,16);
 return `<article class="queue-card" data-order="${esc(o.id)}">
  <header><a class="mono" href="#/orders/${esc(o.id)}">${esc(o.id)}</a>${fulfillmentPill(o)}${sourceBadge(o)}</header>
  <p class="queue-when"><b>${esc(queueWhen(o))}</b><small>${esc(t('orderedAt'))} ${esc(time)}</small></p>
  ${o.customer_name?`<p class="queue-customer">${esc(o.customer_name)}</p>`:''}
  <ul class="queue-lines">${(o.items||[]).map(i=>`<li><b>×${i.quantity}</b> ${esc(lineText(i))}</li>`).join('')}</ul>
  ${o.note?`<p class="queue-note">${esc(o.note)}</p>`:''}
  ${o.message_card?`<p class="queue-note">“${esc(o.message_card)}”</p>`:''}
  <div class="queue-actions">${actions.filter(x=>x!=='cancelled').map((x,i)=>`<button type="button" class="small ${i===0?'primary':''}" data-queue-status="${x}" data-id="${esc(o.id)}">${esc(T[lang].orderAction[x])}</button>`).join('')}${actions.includes('cancelled')?`<button type="button" class="small danger" data-queue-status="cancelled" data-id="${esc(o.id)}">${esc(T[lang].orderAction.cancelled)}</button>`:''}</div>
 </article>`;
}
async function orderQueue(params){
 const date=params.get('date')||today();
 view.innerHTML=`<div class="view-head"><h1>${esc(t('queue'))}</h1><div class="actions"><a class="button" href="#/orders/schedule">${esc(t('schedule'))}</a><a class="button" href="#/orders">${esc(t('back'))}</a></div></div>
  <form class="filters" id="queue-filters">${field(t('date'),`<input type="date" name="date" value="${esc(date)}">`)}<button type="button" class="ghost" data-shift="-1">‹</button><button type="button" class="ghost" data-shift="1">›</button></form><div id="queue"><p class="muted">${esc(t('loading'))}</p></div>`;
 const form=document.getElementById('queue-filters');
 form.addEventListener('change',()=>{location.hash='#/orders/queue?date='+form.elements.date.value;});
 form.querySelectorAll('[data-shift]').forEach(b=>b.addEventListener('click',()=>{const d=new Date(form.elements.date.value+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+Number(b.dataset.shift));location.hash='#/orders/queue?date='+d.toISOString().slice(0,10);}));
 const render=async()=>{
  const {orders}=await api(`/api/admin/orders?from=${encodeURIComponent(date)}&to=${encodeURIComponent(date)}&status=${QUEUE_LANES.join(',')},out_for_delivery`);
  const box=document.getElementById('queue');
  if(!orders.length){box.innerHTML=`<p class="empty">${esc(t('queueEmpty'))}</p>`;return;}
  const lane=status=>orders.filter(o=>o.status===status||(status==='ready'&&o.status==='out_for_delivery'));
  box.innerHTML=`<div class="queue-grid">${QUEUE_LANES.map(status=>{const rows=lane(status);return `<section class="queue-lane"><h2>${esc(T[lang].orderStatus[status])} <small>${rows.length}</small></h2>${rows.length?rows.map(queueCard).join(''):`<p class="muted">${esc(t('laneEmpty'))}</p>`}</section>`;}).join('')}</div>`;
 };
 await render();
 document.getElementById('queue').addEventListener('click',async e=>{
  const button=e.target.closest('[data-queue-status]');if(!button)return;
  const status=button.dataset.queueStatus;
  if(status==='cancelled'&&!confirm(t('confirmCancelOrder')))return;
  button.disabled=true;
  try{await api(`/api/admin/orders/${encodeURIComponent(button.dataset.id)}/status`,{method:'POST',body:{status}});toast(status==='cancelled'?t('cancelled'):t('saved'));await render();}
  catch(error){toast(describe(error),{error:true});button.disabled=false;}
 });
}
// Staff-entered order (a customer on the phone / Zalo). The price is computed by the Worker.
async function orderNew(){
 const sale=catalog.filter(p=>p.type==='sale');
 const o=ordering();
 view.innerHTML=`<div class="view-head"><h1>${esc(t('newOrder'))}</h1><a class="button" href="#/orders">${esc(t('back'))}</a></div>
  <form class="form card" id="order-form">
   <div class="full order-lines" id="order-lines"></div>
   <div class="full"><button type="button" class="ghost" id="add-line">+ ${esc(t('addProduct'))}</button></div>
   ${field(t('status'),`<select name="status">${options(['confirmed','pending'],'confirmed',T[lang].orderStatus)}</select>`)}
  ${field(t('fulfillment'),`<select name="fulfillment_type">${options(FULFILLMENT_TYPES.filter(x=>o.fulfillment?.[x]!==false),'pickup',T[lang].fulfillmentType)}</select>`)}
  ${field(t('tableNumber'),`<input name="table_number" maxlength="4" inputmode="numeric">`)}
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
 const form=document.getElementById('order-form'),linesBox=document.getElementById('order-lines');
 // One order, several bowls: each line keeps its own product, options, add-ons and quantity, and the
 // whole list is posted as items[] (the Worker prices it, the same way the storefront cart does).
 const lines=[{}];
 const productPicker=(line,index)=>field(t('product'),`<select data-line-product="${index}" required><option value="">${esc(t('pickProduct'))}</option>${sale.map(p=>`<option value="${esc(p.id)}"${p.id===line.product_id?' selected':''}>${esc(localized(p.name))} · ${esc(p.id)}</option>`).join('')}</select>`,'full');
 const lineChoices=(line,index)=>{
  const p=product(line.product_id);if(!p)return '';
  return Object.entries(p.options||{}).map(([group,choices])=>field(localized(o.options?.[group]?.label)||group,`<select data-option="${esc(group)}" data-line="${index}">${choices.map(c=>`<option value="${esc(c.id)}"${line.options?.[group]===c.id?' selected':''}>${esc(optionText(group,c.id))}</option>`).join('')}</select>`)).join('')
   +((p.addons||[]).length?`<div class="field"><span>${esc(t('addons'))}</span><div class="radio-group">${p.addons.map(a=>`<label class="radio"><input type="checkbox" data-addon="${esc(a.id)}" data-line="${index}"${line.addons?.includes(a.id)?' checked':''}><span>${esc(addonText(a.id))}</span></label>`).join('')}</div></div>`:'');
 };
 function renderLines(){
  linesBox.innerHTML=lines.map((line,index)=>`<section class="order-line" data-line-row="${index}"><div class="order-line-head"><b>${index+1}.</b>${lines.length>1?`<button type="button" class="ghost danger" data-remove-line="${index}">${esc(t('remove'))}</button>`:''}</div><div class="form">${productPicker(line,index)}${lineChoices(line,index)}${field(t('quantity'),`<input type="number" min="1" max="20" value="${line.quantity||1}" data-line-quantity="${index}">`)}</div></section>`).join('');
 }
 renderLines();
 linesBox.addEventListener('change',e=>{
  const el=e.target,index=Number(el.dataset.line??el.dataset.lineProduct??el.dataset.lineQuantity);
  const line=lines[index];if(!line)return;
  if(el.dataset.lineProduct!==undefined){lines[index]={product_id:el.value,quantity:line.quantity||1};renderLines();return;}
  if(el.dataset.lineQuantity!==undefined){line.quantity=Number(el.value)||1;return;}
  if(el.dataset.option){line.options={...line.options,[el.dataset.option]:el.value};return;}
  if(el.dataset.addon){const picked=new Set(line.addons||[]);el.checked?picked.add(el.dataset.addon):picked.delete(el.dataset.addon);line.addons=[...picked];}
 });
 linesBox.addEventListener('click',e=>{
  const button=e.target.closest('[data-remove-line]');if(!button)return;
  lines.splice(Number(button.dataset.removeLine),1);renderLines();
 });
 document.getElementById('add-line').addEventListener('click',()=>{lines.push({});renderLines();document.querySelector('[data-line-row="'+(lines.length-1)+'"] select')?.focus();});
 form.elements.fulfillment_type.addEventListener('change',()=>{document.getElementById('delivery-fields').hidden=form.elements.fulfillment_type.value!=='delivery';});
 form.addEventListener('submit',async e=>{
  e.preventDefault();const error=document.getElementById('order-error');error.textContent='';
  const body=Object.fromEntries(new FormData(form));
  if(lines.some(line=>!line.product_id)){error.textContent=t('pickProduct');return;}
  // Each line carries the defaults of the groups staff never touched, so the Worker prices what is on screen.
  body.items=lines.map(line=>{
   const p=product(line.product_id),options={...line.options};
   for(const [group,choices] of Object.entries(p?.options||{}))if(!options[group])options[group]=choices[0]?.id||'';
   return {product_id:line.product_id,quantity:Number(line.quantity)||1,options,addons:line.addons||[]};
  });
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
    ${line(t('fulfillment'),fulfillmentPill(o))}${line(t('date'),esc(formatDate(o.fulfillment_date)))}${line(t('timeSlot'),esc(o.asap?t('asap'):slotLabel(o.time_slot))||'—')}${o.table_number?line(t('tableNumber'),esc(o.table_number)):''}
    ${o.fulfillment_type==='delivery'?line(t('recipient'),esc([o.recipient_name,o.recipient_phone].filter(Boolean).join(' · ')))+line(t('address'),esc(o.delivery_address))+(o.delivery_note?line(t('deliveryNote'),esc(o.delivery_note)):''):''}
    ${o.note?line(t('note'),esc(o.note)):''}
   </div></section>
  </div>
  <div id="notify"></div>
  <form class="form card" id="order-edit">
   ${field(t('customer'),`<input name="customer_name" required maxlength="100" value="${esc(o.customer_name)}">`)}
   ${field(t('phone'),`<input name="customer_phone" type="tel" maxlength="40" value="${esc(o.customer_phone)}">`)}
   ${field(t('fulfillment'),`<select name="fulfillment_type">${options(FULFILLMENT_TYPES,o.fulfillment_type,T[lang].fulfillmentType)}</select>`)}
  ${field(t('tableNumber'),`<input name="table_number" maxlength="4" inputmode="numeric" value="${esc(o.table_number||'')}">`)}
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
// The detailed schedule: per product and size, what every garment is doing across 7, 14 or 30 days.
// 7 and 14 days are drawn hour-accurate by ECharts, one chart per product group and only once it
// scrolls into view; 30 days are summarised a day at a time, which stays readable on a phone. The
// same schedule is always in a plain list as well, for keyboards, screen readers and the moment the
// chart cannot load. The booking list stays where it is: this answers "what is free, and when".
const RANGES=[7,14,30];
const GANTT_ROW=44,GANTT_AXIS=30;
let charts=[],chartObserver=null;
function disposeCharts(){
 chartObserver?.disconnect();chartObserver=null;
 for(const entry of charts){entry.resize?.disconnect();try{entry.chart?.dispose();}catch{}}
 charts=[];
}
// ECharts ships with the admin (dist/admin/vendor) and is only fetched by this view.
let echartsLoading=null;
function loadECharts(){
 if(window.echarts)return Promise.resolve(window.echarts);
 echartsLoading??=new Promise((resolve,reject)=>{
  const script=document.createElement('script');
  const timer=setTimeout(()=>reject(new Error('timeout')),15000);
  script.src='/admin/vendor/echarts.min.js';script.async=true;
  script.onload=()=>{clearTimeout(timer);window.echarts?resolve(window.echarts):reject(new Error('missing'));};
  script.onerror=()=>{clearTimeout(timer);reject(new Error('load'));};
  document.head.append(script);
 }).catch(error=>{echartsLoading=null;throw error;});
 return echartsLoading;
}
const kindColour=kind=>getComputedStyle(document.documentElement).getPropertyValue(`--k-${kind}`).trim()||'#999';
// Pixels per day: enough for an evening return to be told from a morning one. Wider than the
// screen scrolls sideways inside the chart only, never the page.
const dayWidth=(span,available)=>Math.max(available/span,span===7?(available<600?110:96):56);
function renderGantt(echarts,entry,span){
 const {host,items}=entry;
 const scroller=host.querySelector('.gantt-scroll'),canvas=host.querySelector('.gantt-chart');
 const width=Math.round(dayWidth(span,scroller.clientWidth||600)*span);
 canvas.style.width=width+'px';canvas.style.height=(GANTT_AXIS+items.length*GANTT_ROW)+'px';
 const kinds=[...new Set(items.flatMap(item=>item.segments.map(segment=>segment.kind)))];
 const colours=Object.fromEntries([...kinds,'past'].map(kind=>[kind,kindColour(kind)]));
 const data=items.flatMap((item,row)=>item.segments.map((segment,index)=>({value:[row,momentMs(segment.start),momentMs(segment.end),index],kind:segment.kind,label:segment.reservation?.customer_name||''})));
 const label=kind=>`${SEGMENT_SYMBOL[kind]||''} ${segmentLabel(kind)}`;
 entry.chart??=echarts.init(canvas,null,{renderer:'canvas',width,height:GANTT_AXIS+items.length*GANTT_ROW});
 entry.chart.resize({width,height:GANTT_AXIS+items.length*GANTT_ROW});
 entry.chart.setOption({
  animation:false,useUTC:true,
  grid:{left:0,right:0,top:GANTT_AXIS,bottom:0},
  xAxis:{type:'time',position:'top',min:momentMs(timeline.from+'T00:00'),max:momentMs(timeline.until),splitNumber:span===7?span*2:span,
   axisLabel:{hideOverlap:true,alignMinLabel:'left',alignMaxLabel:'right',fontSize:11,formatter:value=>{const d=new Date(value);return d.getUTCHours()===0?formatDay(d.toISOString().slice(0,10)):`${String(d.getUTCHours()).padStart(2,'0')}:00`;}},
   splitLine:{show:true,lineStyle:{color:'#e3ded3'}},axisLine:{show:false},axisTick:{show:false}},
  yAxis:{type:'category',data:items.map(item=>item.id),inverse:true,show:false},
  series:[{type:'custom',data,encode:{x:[1,2],y:0},
   renderItem:(params,api)=>{
    const row=api.value(0),start=api.coord([api.value(1),row]),end=api.coord([api.value(2),row]);
    const datum=data[params.dataIndex],height=GANTT_ROW*(datum.kind==='fitting'?.5:.64);
    const rect=echarts.graphic.clipRectByRect({x:start[0],y:start[1]-height/2,width:Math.max(3,end[0]-start[0]),height},{x:params.coordSys.x,y:params.coordSys.y,width:params.coordSys.width,height:params.coordSys.height});
    if(!rect)return null;
    const quiet=datum.kind==='past'||datum.kind==='available';
    const text=rect.width>44&&!quiet?(datum.label||label(datum.kind)):rect.width>44&&datum.kind==='available'?label('available'):'';
    return {type:'group',children:[
     {type:'rect',shape:{...rect,r:3},style:{fill:colours[datum.kind]||'#999',stroke:quiet?'#d9d3c7':'#fff',lineWidth:1,lineDash:['cleaning','maintenance'].includes(datum.kind)?[4,3]:null,opacity:datum.kind==='past'?.5:1}},
     {type:'text',style:{text,x:rect.x+6,y:rect.y+rect.height/2,verticalAlign:'middle',fontSize:11,fill:['rented','reserved','fitting','cleaning','maintenance','blocked'].includes(datum.kind)?'#fff':'#302e29',width:Math.max(0,rect.width-10),overflow:'truncate'},silent:true}
    ]};
   },
   markLine:{silent:true,symbol:'none',lineStyle:{color:'#302e29',type:'solid',width:2},label:{show:false},data:[{xAxis:momentMs(timeline.now)}]}
  }]
 },true);
 entry.chart.off('click');
 entry.chart.on('click',event=>{const item=items[event.value?.[0]];if(item)openSegmentSheet(item.id,event.value[3],canvas);});
}
function mountGantt(entry,span){
 loadECharts().then(echarts=>{
  if(!charts.includes(entry)||!entry.host.isConnected)return;
  renderGantt(echarts,entry,span);
  if(typeof ResizeObserver==='function'){
   let last=entry.host.clientWidth,frame=0;
   entry.resize=new ResizeObserver(()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{if(entry.host.clientWidth!==last){last=entry.host.clientWidth;renderGantt(echarts,entry,span);}});});
   entry.resize.observe(entry.host);
  }
 }).catch(()=>{
  entry.host.querySelector('.gantt-scroll').innerHTML=`<p class="hint">${esc(t('chartFailed'))}</p>`;
  const list=entry.host.closest('.availability-group')?.querySelector('.tl-list');if(list)list.open=true;
 });
}
// The plain-language schedule: every stretch of every garment, each opening the same details.
function segmentList(items){
 return items.map(item=>{
  const rows=item.segments.map((segment,index)=>({segment,index})).filter(({segment})=>segment.kind!=='past');
  return `<section class="tl-list-item"><h3><span class="mono">${esc(item.id)}</span>${item.size?` <small>${esc(t('size'))} ${esc(item.size)}</small>`:''}</h3>
   <p class="next-free">${esc(t('readyAt'))}: <b>${item.next_available?(item.now==='available'?esc(t('freeNow')):esc(formatMoment(item.next_available))):esc(t('neverFree'))}</b></p>
   <ol>${rows.map(({segment,index})=>`<li><button type="button" class="tl-row" data-tl-segment="${esc(item.id)}|${index}">${segmentKey(segment.kind)}<span>${esc(segmentPhrase(segment.kind,formatMoment(segment.start),segment.end>=timeline.until?t('untilLater'):formatMoment(segment.end)))}</span>${segment.reservation?`<small>${esc(segment.reservation.customer_name)}</small>`:''}</button></li>`).join('')||`<li class="muted">${esc(t('noSchedule'))}</li>`}</ol></section>`;
 }).join('');
}
async function availabilityView(params){
 const productId=params.get('product_id')||'',itemId=params.get('item_id')||'';
 const span=RANGES.includes(Number(params.get('days')))?Number(params.get('days')):7;
 const href=changes=>scheduleHref({product_id:productId,item_id:itemId,days:span===7?'':String(span),...changes});
 view.innerHTML=`<div class="view-head"><h1>${esc(t('availability'))}</h1><div class="view-actions"><a class="button" href="#/inventory/handoff">${esc(t('handoverHours'))}</a><a class="button" href="#/inventory">${esc(t('navInventory'))}</a></div></div>
  <p class="hint">${esc(t('availabilityHint'))}</p>
  <form class="filters" id="availability-filters">${field(t('product'),`<select name="product_id"><option value="">${esc(t('all'))}</option>${catalog.map(p=>`<option value="${esc(p.id)}"${p.id===productId?' selected':''}>${esc(productName(p.id))}</option>`).join('')}</select>`)}
   ${field(t('item'),`<select name="item_id"${productId?'':' disabled'}><option value="">${esc(t('allItems'))}</option></select>`)}</form>
  <div class="tl-toolbar"><div class="tl-range" role="group" aria-label="${esc(t('period'))}">${RANGES.map(n=>`<a class="button small${n===span?' primary':''}" href="${esc(href({days:n===7?'':String(n)}))}"${n===span?' aria-current="true"':''}>${esc(t('daysLabel').replace('{n}',String(n)))}</a>`).join('')}</div>${legend({now:true})}</div>
  <div id="availability"><p class="muted">${esc(t('loading'))}</p></div>`;
 const form=document.getElementById('availability-filters');
 form.addEventListener('change',e=>{location.hash=href({product_id:form.elements.product_id.value,item_id:e.target.name==='product_id'?'':form.elements.item_id.value});});
 const data=keepTimeline(await api('/api/admin/inventory/timeline?'+new URLSearchParams({days:String(span),...(productId?{product_id:productId}:{}),...(itemId?{item_id:itemId}:{})})));
 if(productId){
  // The item choices are the product's own pieces, whichever one is on screen now.
  const all=itemId?(await api('/api/admin/inventory?product_id='+encodeURIComponent(productId))).items:data.items;
  form.elements.item_id.innerHTML=`<option value="">${esc(t('allItems'))}</option>`+all.map(item=>`<option value="${esc(item.id)}"${item.id===itemId?' selected':''}>${esc(item.id)}${item.size?` · ${esc(item.size)}`:''}</option>`).join('');
 }
 const box=document.getElementById('availability');
 if(!data.products.length){box.innerHTML=`<p class="muted">${esc(t('noStock'))}</p>`;return;}
 const groups=data.products.map(group=>({...group,items:group.items.map(id=>timeline.items.get(id))}));
 box.innerHTML=groups.map((group,n)=>{
  const counts={};for(const item of group.items)if(item.now)counts[item.now]=(counts[item.now]||0)+1;
  const soonest=group.items.map(item=>item.next_available).filter(Boolean).sort()[0]||'';
  return `<section class="card availability-group" data-group="${n}">
   <div class="view-head"><h2>${esc(productName(group.product_id))}${group.size?` <small>${esc(t('size'))} ${esc(group.size)}</small>`:''}</h2><span class="muted">${esc(t('totalItems'))}: ${group.total}</span></div>
   <ul class="state-counts">${[...LEGEND_KINDS,'returned'].filter(kind=>counts[kind]).map(kind=>`<li class="count-${kind}">${segmentKey(kind)}${esc(segmentLabel(kind))}<b>${counts[kind]}</b></li>`).join('')}</ul>
   <p class="next-free">${esc(t('nextFree'))}: <b>${soonest?(soonest<=timeline.now?esc(t('freeNow')):esc(formatMoment(soonest))):esc(t('neverFree'))}</b></p>
   ${group.items.length>1||span===30?`<div class="tl-scroll">${productDayStrip(group)}</div>`:''}
   ${span===30
    ?`<div class="tl-scroll"><div class="tl-month">${group.items.map(item=>`<div class="tl-month-row"><span class="mono">${esc(item.id)}</span>${dayStrip(item,' tl-long')}</div>`).join('')}</div></div>`
    :`<div class="gantt"><div class="gantt-names" aria-hidden="true">${group.items.map(item=>`<span class="mono" title="${esc(item.id)}">${esc(item.id)}</span>`).join('')}</div><div class="gantt-scroll"><div class="gantt-chart" role="img" aria-label="${esc(t('chartLabel'))}"></div></div></div>`}
   <details class="tl-list"${span===30?'':' data-chart'}><summary>${esc(t('asList'))}</summary>${segmentList(group.items)}</details>
  </section>`;
 }).join('');
 applyGeometry(box);
 if(span===30)return;
 charts=[...box.querySelectorAll('.availability-group')].map(host=>({host,items:groups[Number(host.dataset.group)].items,chart:null,resize:null}));
 // One chart per product group, created only when it comes into view.
 if(typeof IntersectionObserver==='function'){
  chartObserver=new IntersectionObserver(entries=>{for(const seen of entries){if(!seen.isIntersecting)continue;chartObserver.unobserve(seen.target);const entry=charts.find(c=>c.host===seen.target);if(entry)mountGantt(entry,span);}},{rootMargin:'200px'});
  charts.forEach(entry=>chartObserver.observe(entry.host));
 }else charts.forEach(entry=>mountGantt(entry,span));
}

// The handover diary:the ordinary week comes from the store configuration, and single dates that
// differ are set here so a day off needs no rebuild and reaches customers straight away.
async function handoffDiary(){
 const weekly=storeConfig.booking?.handoff?.weekly||{};
 const dayName=n=>{try{return new Intl.DateTimeFormat({ja:'ja-JP',vi:'vi-VN',en:'en-GB'}[lang]||'en-GB',{weekday:'short',timeZone:'UTC'}).format(new Date(Date.UTC(2026,0,4+n)));}catch{return String(n);}};
 const spans=list=>(list||[]).map(w=>`${w.start}–${w.end}`).join(', ');
 view.innerHTML=`<div class="view-head"><h1>${esc(t('handoverHours'))}</h1><a class="button" href="#/inventory/schedule">${esc(t('availability'))}</a></div>
  <p class="hint">${esc(t('handoverHint'))}</p>
  <section class="card"><h2>${esc(t('usualWeek'))}</h2><ul class="weekly-hours">${[1,2,3,4,5,6,0].map(n=>`<li><span>${esc(dayName(n))}</span><b>${esc(spans(weekly[n])||t('closedAllDay'))}</b></li>`).join('')}</ul>
   <p class="muted">${esc(t('configHint'))}</p></section>
  <section class="card"><h2>${esc(t('daysDiffer'))}</h2>
   <form id="handoff-form" class="handoff-form">
    ${field(t('date'),`<input type="date" name="date" required value="${esc(today())}">`)}
    <label class="check"><input type="checkbox" name="closed"><span>${esc(t('closedAllDay'))}</span></label>
    <div class="window-rows" id="window-rows"></div>
    <button type="button" class="ghost" id="add-window">${esc(t('addWindow'))}</button>
    ${field(t('memo'),`<input name="note" maxlength="200">`)}
    <button type="submit" class="button primary"${readOnly?' disabled':''}>${esc(t('save'))}</button>
   </form>
   <div id="handoff-list"><p class="muted">${esc(t('loading'))}</p></div></section>`;
 const rows=document.getElementById('window-rows'),form=document.getElementById('handoff-form');
 const addRow=(start='18:30',end='21:00')=>{
  const row=document.createElement('div');row.className='window-row';
  row.innerHTML=`<input type="time" class="win-start" value="${esc(start)}" step="300" aria-label="${esc(t('start'))}"><span>–</span><input type="text" class="win-end" value="${esc(end)}" pattern="([01][0-9]|2[0-3]):[0-5][0-9]|24:00" placeholder="24:00" maxlength="5" size="5" aria-label="${esc(t('end'))} (HH:MM / 24:00)"><button type="button" class="ghost" data-drop>${esc(t('removeRow'))}</button>`;
  rows.append(row);
 };
 addRow();
 document.getElementById('add-window').addEventListener('click',()=>addRow());
 rows.addEventListener('click',e=>{if(e.target.closest('[data-drop]'))e.target.closest('.window-row').remove();});
 const closedBox=form.elements.closed;
 const syncClosed=()=>{rows.hidden=closedBox.checked;document.getElementById('add-window').hidden=closedBox.checked;};
 closedBox.addEventListener('change',syncClosed);syncClosed();
 // Two saves in quick succession answer in whatever order the network feels like; only the
 // newest list may be drawn, or staff are left looking at the one before it.
 let listSeq=0;
 async function refresh(){
  const seq=++listSeq;
  const {exceptions}=await api('/api/admin/handoff-exceptions?from='+encodeURIComponent(today()));
  if(seq!==listSeq)return;
  document.getElementById('handoff-list').innerHTML=exceptions.length?`<table class="table"><thead><tr><th>${esc(t('date'))}</th><th>${esc(t('handoverWindows'))}</th><th>${esc(t('memo'))}</th><th></th></tr></thead><tbody>${exceptions.map(entry=>`<tr>
   <td data-label="${esc(t('date'))}">${esc(formatDate(entry.date))}</td>
   <td data-label="${esc(t('handoverWindows'))}">${entry.closed?`<span class="pill maintenance">${esc(t('closedAllDay'))}</span>`:esc(spans(entry.windows))}</td>
   <td data-label="${esc(t('memo'))}">${esc(entry.note||'—')}</td>
   <td><button type="button" class="ghost" data-drop-date="${esc(entry.date)}"${readOnly?' disabled':''}>${esc(t('removeRow'))}</button></td>
  </tr>`).join('')}</tbody></table>`:`<p class="muted">${esc(t('noExceptions'))}</p>`;
 }
 document.getElementById('handoff-list').addEventListener('click',async e=>{
  const button=e.target.closest('[data-drop-date]');if(!button)return;
  try{await api('/api/admin/handoff-exceptions/'+encodeURIComponent(button.dataset.dropDate),{method:'DELETE'});toast(t('exceptionRemoved'));await refresh();}
  catch(error){toast(describe(error),{error:true});}
 });
 form.addEventListener('submit',async e=>{
  e.preventDefault();
  const closed=closedBox.checked;
  const windows=closed?[]:[...rows.querySelectorAll('.window-row')].map(row=>({start:row.querySelector('.win-start').value,end:row.querySelector('.win-end').value})).filter(w=>w.start&&w.end);
  if(!closed&&!windows.length)return toast(t('needWindow'),{error:true});
  try{await api('/api/admin/handoff-exceptions/'+encodeURIComponent(form.elements.date.value),{method:'PUT',body:{closed,windows,note:form.elements.note.value}});
   toast(t('exceptionSaved'));await refresh();}
  catch(error){toast(describe(error),{error:true});}
 });
 await refresh();
}

const routes=[
 [/^\/?$/,'dashboard',()=>dashboard()],
 [/^\/inventory$/,'inventory',(m,q)=>inventoryList(q)],
 [/^\/inventory\/new$/,'inventory',(m,q)=>inventoryNew(q)],
 [/^\/reservations$/,'reservations',(m,q)=>reservationList(q)],
 [/^\/reservations\/new$/,'reservations',(m,q)=>reservationForm('',q)],
 [/^\/reservations\/([^/?]+)$/,'reservations',m=>reservationForm(decodeURIComponent(m[1]))],
 [/^\/orders$/,'orders',(m,q)=>orderList(q)],
 [/^\/orders\/queue$/,'orders',(m,q)=>orderQueue(q)],
 [/^\/menu$/,'menu',()=>menuList()],
 [/^\/orders\/schedule$/,'orders',(m,q)=>orderSchedule(q)],
 [/^\/orders\/new$/,'orders',()=>orderNew()],
 [/^\/orders\/([^/?]+)$/,'orders',m=>orderDetail(decodeURIComponent(m[1]))],
 [/^\/inventory\/schedule$/,'inventory',(m,q)=>availabilityView(q)],
 [/^\/inventory\/handoff$/,'inventory',()=>handoffDiary()],
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
 disposeCharts();closeSheet(false);
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
