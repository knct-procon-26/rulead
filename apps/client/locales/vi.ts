import type { Messages, Week } from "./ja";

/** UI tiếng Việt */

const WEEKDAYS: Week = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

const tabs = {
  rules: "Quy định",
  diary: "Nhật ký",
  scan: "Quét",
  collection: "Bộ sưu tập",
  you: "Cá nhân",
};

const vi: Messages = {
  common: {
    ok: "OK",
    cancel: "Hủy",
    close: "Đóng",
    reload: "Tải lại",
    loading: "Đang tải…",
    processing: "Đang xử lý…",
    openSettings: "Mở cài đặt",
    errorTitle: "Lỗi",
    park: "Công viên",
    unnamedPark: "Công viên chưa có tên",
    tryAgainOnline: "Vui lòng thử lại ở nơi có kết nối mạng.",
    locationNotAllowed: "Chưa cho phép truy cập vị trí.",
  },

  tabs,

  notFound: {
    title: "Không tìm thấy trang",
    message: "Màn hình này không tồn tại.",
    goHome: "Về màn hình chính",
  },

  errors: {
    network:
      "Không thể kết nối với máy chủ. Vui lòng thử lại ở nơi có kết nối mạng.",
    server: "Máy chủ gặp lỗi. Vui lòng thử lại sau.",
    rateLimited: "Bạn đã dùng hết lượt hôm nay. Vui lòng quay lại vào ngày mai.",
    blocked: "Tài khoản này đã bị tạm ngưng.",
    notASign:
      "Không nhận ra đây là biển báo quy định. Hãy chụp lại sao cho biển báo nằm trọn trong khung.",
    requestFailed: "Đã xảy ra lỗi.",
  },

  rulesTab: {
    androidOnly:
      "Tính năng ra ngoài và hiển thị quy định công viên hiện chỉ hỗ trợ Android.",
    readyTitle: "Chuẩn bị ra ngoài",
    readyDescription:
      "Nhấn \"Ra ngoài\", khi bạn vào một công viên, ứng dụng sẽ báo cho bạn quy định của công viên đó.\nỞ các công viên đã có quy định, hình ảnh camera được phân tích ngay trên điện thoại và bạn sẽ nhận thông báo khi camera thấy thứ liên quan đến quy định.",
    outingTitle: "Đang ra ngoài",
    outingDescription:
      "Khi bạn vào công viên đã có quy định, quy định của công viên đó sẽ hiện ở đây và camera bắt đầu theo dõi.\nKhi bạn quay lại gần nơi xuất phát, chuyến ra ngoài sẽ tự động kết thúc.",
    startOuting: "Ra ngoài",
    endOuting: "Kết thúc ra ngoài",
    searchNearby: "Tìm công viên gần đây theo quy định",
    searchWithTheseRules: "Tìm công viên gần đây theo các quy định này",
    showCurrentPark: (parkName: string) =>
      `Xem quy định của công viên bạn đang ở (${parkName})`,
    loadingRules: "Đang tải quy định…",
    noRules: "Công viên này chưa có quy định nào",
    parkNotSaved:
      "Điện thoại chưa có thông tin về công viên này.\nThông tin sẽ được tải tự động khi bạn đến gần công viên trong lúc ra ngoài.",
    parkLoadFailed: "Không thể tải thông tin công viên.",
    watchOff: `Theo dõi bằng camera đang tắt (có thể đổi trong phần cài đặt ở tab "${tabs.you}").`,
    watching:
      "Camera đang theo dõi các quy định. Khi camera thấy thứ liên quan đến quy định, quy định đó sẽ chuyển sang màu đỏ và bạn sẽ nhận thông báo. Hình ảnh không bao giờ được lưu hay gửi đi.",
    watchStopped: "Theo dõi bằng camera đã dừng.",
    resumeWatch: "Tiếp tục theo dõi bằng camera",
    startOutingFailed: "Không thể bắt đầu ra ngoài",
    endOutingFailed: "Không thể kết thúc ra ngoài",
    startWatchFailed: "Không thể bắt đầu theo dõi bằng camera",
    locationNotAllowed: "Chưa cho phép truy cập vị trí.",
    cameraNotAllowed: "Chưa cho phép truy cập camera.",
    cameraPermissionTitle: "Cần quyền truy cập camera",
    cameraPermissionMessage:
      "Camera được dùng để phân tích hình ảnh ngay trên điện thoại. Hình ảnh không bao giờ được lưu hay gửi đi.",
    errorNotTracking: "Bạn không đang ra ngoài.",
    errorNotStarted:
      "Không thể khởi động. Vui lòng kiểm tra quyền của ứng dụng và đảm bảo không có ứng dụng khác đang dùng camera.",
  },

  parkRules: {
    noRules: "Không có quy định",
    reportPark: "Báo cáo công viên",
    reportRule: "Báo cáo",
    reportRuleLabel: "Báo cáo quy định này",
    translationFailed: "Không thể dịch nên đang hiển thị bản gốc (tiếng Anh)",
    keywords: (list: string) => `Từ khóa: ${list}`,
    disclaimer:
      "* Đây chỉ là một phần quy định được ghi lại từ biển báo và các nguồn khác. Việc không có trong danh sách không có nghĩa là được phép. Hãy luôn tuân theo biển báo tại chỗ, hướng dẫn của người quản lý và quan tâm đến những người xung quanh.",
  },

  ruleSearch: {
    title: "Tìm công viên gần đây theo quy định",
    back: "‹ Chọn quy định khác",
    loading: "Đang tải các công viên gần đây…",
    loadFailed:
      "Không thể tải các công viên gần đây. Vui lòng thử lại ở nơi có kết nối mạng.",
    filterPlaceholder: "Lọc quy định (ví dụ: chó, bóng)",
    noParksNearby: "Gần đây (khoảng 1 km) không có công viên nào đã có quy định.",
    noMatch: "Không tìm thấy",
    ruleSummary: (isShownPark: boolean, parkCount: number) =>
      `${isShownPark ? "Quy định của công viên đang xem · " : ""}Có ở ${parkCount} công viên gần đây`,
    parksWithRule: (count: number) => `Công viên có quy định này (${count})`,
    parksWithoutRule: (count: number) =>
      `Công viên chưa ghi nhận quy định này (${count})`,
    withoutCaution:
      "Trong số này có thể có công viên thực tế có quy định này nhưng chưa được ghi nhận. Hãy kiểm tra biển báo tại chỗ trước khi đi.",
    none: "Không có",
    parkSummary: (distance: string, ruleCount: number) =>
      `${distance} · ${ruleCount} quy định đã ghi nhận`,
    map: "Bản đồ",
    distanceHere: "Bạn đang ở đây",
    distanceAbout: (distance: string) => `Khoảng ${distance}`,
  },

  report: {
    ruleTitle: "Báo cáo quy định này",
    ruleMessage: (ruleText: string) =>
      `"${ruleText}"\n\nQuy định này có vấn đề gì?`,
    ruleNotHere: "Công viên này không có",
    ruleInappropriate: "Nội dung sai hoặc không phù hợp",
    parkTitle: "Báo cáo công viên này",
    parkMessage: (parkName: string) =>
      `"${parkName}"\n\nTên hoặc vị trí của công viên bị sai?`,
    parkWrong: "Sai tên hoặc vị trí",
    sent: "Đã gửi báo cáo",
    failed: "Không thể gửi báo cáo",
    thanks: "Cảm ơn bạn đã giúp đỡ.",
    thanksRule:
      "Cảm ơn bạn đã giúp đỡ. Khi nhiều người báo cáo cùng một nội dung, quy định này sẽ không còn hiển thị ở công viên này nữa (có thể mất đến một ngày).",
  },

  outing: {
    preciseLocationTitle: "Cần vị trí chính xác",
    preciseLocationMessage:
      "Vị trí được dùng để nhận biết khi bạn vào công viên. Vui lòng đặt vị trí thành \"Chính xác\" trong Cài đặt.",
    startedTitle: "Đã bắt đầu ra ngoài",
    cameraStartFailed:
      "Không thể khởi động camera nên bạn sẽ ra ngoài mà không có theo dõi bằng camera. Ứng dụng sẽ thử lại khi bạn mở lại.",
    cameraNotAllowed:
      "Chưa cho phép truy cập camera nên bạn sẽ ra ngoài mà không có theo dõi bằng camera.",
    notificationsNotAllowed:
      "Chưa cho phép thông báo nên bạn sẽ không nhận được thông báo về công viên và quy định.",
    backgroundNotAllowed:
      "Vị trí chưa được đặt là \"Luôn cho phép\" nên khi điện thoại dừng ghi, việc ghi sẽ chỉ tiếp tục khi bạn mở ứng dụng.",
  },

  tracker: {
    nativeMissing:
      "Không tìm thấy module gốc ParkTracker. Hãy khởi chạy bản development build (npx expo run:android) thay vì Expo Go.",
    androidOnly: "ParkTracker chỉ hỗ trợ Android.",
    backgroundTitle: "Vui lòng đặt vị trí thành \"Luôn cho phép\"",
    backgroundMessage:
      "Vị trí được dùng để báo cho bạn khi vào công viên gần đó, kể cả khi ứng dụng đã đóng.",
    backgroundMessageNextScreen:
      " Ở màn hình tiếp theo, hãy chọn \"Luôn cho phép\".",
    trackerNotStarted:
      "Dịch vụ vị trí chưa khởi động. Vui lòng kiểm tra quyền của ứng dụng.",
    watchNotStarted:
      "Theo dõi bằng camera chưa khởi động. Vui lòng kiểm tra quyền camera và đảm bảo không có ứng dụng khác đang dùng camera.",
    resetUnsupported: "Bản build này không hỗ trợ đặt lại thông báo vào công viên",
  },

  scanCamera: {
    shutter: "Chụp ảnh",
  },

  scanMap: {
    locating: "Đang lấy vị trí hiện tại…",
    locationFailed: "Không thể lấy vị trí.",
    searching: "Đang tìm công viên…",
    lookupFailed: "Không thể lấy thông tin công viên",
    notFound: "Không tìm thấy công viên ở vị trí này",
    readyToSubmit: "Nếu khu vực này đúng, hãy xác nhận",
    issues: {
      needPoints: "Chạm vào bản đồ để đặt các điểm bao quanh công viên",
      crossing: "Các đường bị cắt nhau. Hãy di chuyển hoặc xóa điểm",
      tooSmall: "Khu vực quá nhỏ",
      tooLarge: "Khu vực quá lớn. Chỉ khoanh vùng bên trong công viên",
      tooFar: "Hãy khoanh vùng gần nơi bạn đang đứng",
    },
    namePlaceholder: "Tên công viên (không bắt buộc)",
    undo: "Hoàn tác",
    clearAll: "Xóa tất cả",
    retake: "Chụp lại",
    decide: "Chọn công viên này",
  },

  scanConfirm: {
    reading: "Đang đọc biển báo…",
    noRules: "Không tìm thấy quy định nào",
    wrong: "✖ Không đúng",
    collect: "✔ Thêm vào bộ sưu tập",
    submitting: "Đang lưu…",
  },

  bonus: {
    badge: "Thưởng!",
    verifyMessage: (parkName: string | null) =>
      `Người khác đã tìm thấy quy định này ở ${parkName ?? "công viên này"}.`,
    suggestMessage: "Quy định này đã được tìm thấy ở một công viên khác gần đây.",
    question: (parkName: string | null) =>
      `Bạn có thấy quy định này ở ${parkName ?? "công viên này"}, nơi bạn đang ở không?`,
    accept: "Nhận (tôi đã thấy)",
    reject: "Tôi không thấy",
  },

  collection: {
    signs: "Biển báo đã chụp",
    parks: "Công viên đã đến",
    sortTitle: "Sắp xếp",
    sort: {
      recent: "Mới nhất",
      oldest: "Cũ nhất",
      rarest: "Hiếm nhất",
      commonest: "Phổ biến nhất",
      most: "Sưu tầm nhiều nhất",
      fewest: "Sưu tầm ít nhất",
    },
    share: (percent: string) => `${percent}% trên tổng số`,
    empty: "Chưa có gì trong bộ sưu tập.\nHãy chụp biển báo để sưu tầm thêm quy định!",
    loadFailed: "Không thể tải.\nMở lại tab để thử lại.",
  },

  you: {
    settings: "Cài đặt",
    language: "Ngôn ngữ",
    languageNote:
      "Thay đổi ngôn ngữ của ứng dụng, quy định công viên và thông báo khi ra ngoài. Nếu ứng dụng chưa hỗ trợ ngôn ngữ bạn chọn, ứng dụng sẽ hiển thị bằng tiếng Anh còn quy định sẽ hiển thị bằng ngôn ngữ đó (quy định trong thông báo sẽ thay đổi từ lần tải thông tin công viên tiếp theo).",
    cameraWatchSetting: "Theo dõi bằng camera khi ra ngoài",
    cameraWatchNote:
      "Khi tắt, camera sẽ không được dùng trong công viên và bạn chỉ nhận thông báo khi vào công viên.",
    openNotificationSettings: "Mở cài đặt thông báo",
    cameraPermissionTitle: "Cần quyền truy cập camera",
    cameraPermissionMessage:
      "Để dùng theo dõi bằng camera khi ra ngoài, vui lòng cho phép truy cập camera. Ứng dụng cũng sẽ hỏi lại vào lần ra ngoài tiếp theo.",

    statusSection: "Ra ngoài và quyền",
    outing: "Ra ngoài",
    outingActive: "Đang ra ngoài",
    outingPaused:
      "Đang ra ngoài (việc ghi đã dừng; sẽ tiếp tục khi bạn mở ứng dụng)",
    outingInactive: "Không ra ngoài",
    cameraWatch: "Theo dõi bằng camera",
    watchActive: (parkName: string) => `Đang theo dõi (${parkName})`,
    watchWaiting: "Đang chờ (bắt đầu khi bạn vào công viên có quy định)",
    watchStopped: "Đã dừng",
    location: "Vị trí",
    locationStatus: {
      precise: "Đã cho phép (chính xác)",
      approximate: "Chỉ vị trí gần đúng",
      denied: "Chưa cho phép",
      blocked: "Chưa cho phép (đổi trong Cài đặt)",
    },
    backgroundLocation: "Vị trí khi chạy nền",
    notifications: "Thông báo",
    camera: "Camera",
    allowed: "Đã cho phép",
    alwaysAllowed: "Luôn cho phép",
    notAllowed: "Chưa cho phép",
    openAppSettings: "Mở cài đặt ứng dụng",
    batterySettings: "Tối ưu hóa pin",
    batteryNote:
      "Nếu việc ghi thường bị dừng khi ra ngoài, hãy loại rulead khỏi chế độ tối ưu hóa pin.",

    privacy: "Quyền riêng tư",
    privacyText: [
      "• Khi ra ngoài, vị trí của bạn không được gửi lên máy chủ. Để lấy các công viên xung quanh, ứng dụng chỉ gửi tâm của một ô vuông khoảng 1 km. Việc bạn đang ở công viên nào chỉ được xác định trên điện thoại.",
      "• Khi ra ngoài, hình ảnh camera chỉ được phân tích trên điện thoại và không bao giờ được lưu hay gửi đi. Chỉ tên của những thứ đã thấy (ví dụ \"chó\") được ghi trên điện thoại để làm nhật ký.",
      "• Khi bạn ghi nhận một biển báo, ảnh biển báo, vị trí hiện tại và phạm vi công viên sẽ được gửi lên máy chủ (vị trí hiện tại cũng được gửi đến dịch vụ bản đồ để xác định phạm vi công viên).",
      "• Khi bạn gửi \"báo cáo\", thông tin quy định nào ở công viên nào sẽ được gửi lên máy chủ.",
      "• Để dịch quy định, các quy định đang hiển thị và ngôn ngữ của bạn sẽ được gửi lên máy chủ.",
    ].join("\n"),

    accountSection: "Tài khoản và dữ liệu",
    clearLocal: "Xóa dữ liệu trên điện thoại",
    clearLocalTitle: "Xóa dữ liệu trên điện thoại?",
    clearLocalMessage:
      "Thao tác này xóa dữ liệu lưu trên điện thoại: công viên đã đến, vị trí trong công viên, những thứ camera đã thấy và thông báo quy định (nhật ký sẽ trống). Bộ sưu tập vẫn được giữ lại.",
    clearLocalConfirm: "Xóa",
    clearLocalDone: "Đã xóa dữ liệu trên điện thoại",
    clearLocalFailed: "Không thể xóa",
    deleteAccount: "Xóa tài khoản",
    deleteTitle: "Xóa tài khoản của bạn?",
    deleteMessage:
      "Bộ sưu tập, báo cáo và câu trả lời xác nhận quy định của bạn sẽ bị xóa khỏi máy chủ, và dữ liệu trên điện thoại cũng sẽ bị xóa. Không thể hoàn tác.\n\nCông viên và quy định bạn đã ghi nhận sẽ được giữ lại như dữ liệu chung (không liên kết với bạn).",
    deleteConfirm: "Xóa",
    deleteDoneTitle: "Đã xóa tài khoản",
    deleteDoneMessage:
      "Bộ sưu tập và các dữ liệu khác đã bị xóa. Lần tới khi dùng ứng dụng, bạn sẽ bắt đầu với tài khoản mới.",
    deleteFailed: "Không thể xóa",
    deleteNote:
      "Nếu xóa tài khoản, bộ sưu tập và các dữ liệu khác sẽ bị xóa khỏi máy chủ, và lần tới bạn sẽ bắt đầu với tài khoản mới.",

    version: (version: string) => `rulead phiên bản ${version}`,
    debugUnlocked: "Đã hiển thị tùy chọn dành cho nhà phát triển",
  },

  diary: {
    androidOnly: "Nhật ký công viên chỉ có trên Android",
    loadFailed: "Không thể tải nhật ký",
    invalidDate: "Ngày không hợp lệ",
    emptyTitle: "Chưa có nhật ký",
    emptyText: `Nhấn "Ra ngoài" ở tab "${tabs.rules}" rồi đến công viên — con đường bạn đã đi và những gì camera thấy sẽ được ghi lại ở đây.`,
    previous: "Nhật ký trước",
    next: "Nhật ký sau",
    openCalendar: "Mở lịch",
    dayLabel: (year: number, month: number, day: number, weekday: number) =>
      `${WEEKDAYS[weekday] ?? ""}, ${day}/${month}/${year}`,
    parkOfDay: (position: number, count: number) =>
      `Công viên ${position}/${count} trong ngày`,
    recordOf: (position: number, count: number) =>
      `Bản ghi ${position}/${count}`,
    visitedAt: (time: string) => `Đến lúc ${time}`,
    stay: (duration: string, stayCount: number) =>
      ` (ở lại ${duration}${stayCount > 1 ? `, ${stayCount} lần` : ""})`,
    durationUnderMinute: "dưới 1 phút",
    duration: (hours: number, minutes: number) =>
      hours === 0
        ? `${minutes} phút`
        : minutes === 0
          ? `${hours} giờ`
          : `${hours} giờ ${minutes} phút`,
    expandMap: "Xem bản đồ lớn hơn",
    noMapData: "Không có dữ liệu bản đồ",
    legendPark: "Phạm vi công viên",
    legendTrack: "Đường đã đi",
    seenTitle: "Những thứ thấy nhiều nhất",
    seenNone: "Camera không phát hiện được gì",
    times: (count: number) => `${count} lần`,
    photosTitle: "Ảnh chụp ở đây",
    photosUnavailable: "Phiên bản ứng dụng này không hỗ trợ hiển thị ảnh",
    photosExplain:
      "Ảnh bạn chụp trong thời gian ở công viên được tìm và hiển thị ngay trên điện thoại. Ảnh không bao giờ được gửi ra ngoài ứng dụng.",
    photosAllow: "Cho phép truy cập ảnh",
    photosAllowInSettings: "Cho phép truy cập ảnh trong Cài đặt",
    photosNoStay: "Không có dữ liệu thời gian ở lại nên không thể tìm ảnh",
    photosLoadFailed: "Không thể tải ảnh",
    photosLimited: "Chỉ hiển thị những ảnh bạn đã cho phép truy cập",
    photosReselect: "Chọn lại ảnh",
    photosNone: "Không có ảnh nào chụp ở công viên này",
    photoTakenAt: (time: string) => `Ảnh chụp lúc ${time}`,
  },

  calendar: {
    title: "Lịch công viên",
    previousMonth: "Tháng trước",
    nextMonth: "Tháng sau",
    monthTitle: (year: number, month: number) => `Tháng ${month}, ${year}`,
    weekdays: WEEKDAYS,
    day: (month: number, day: number) => `${day} tháng ${month}`,
    dayWithParks: (month: number, day: number, parkCount: number) =>
      `${day} tháng ${month}, ${parkCount} công viên`,
    noRecords: "Không có bản ghi trong tháng này",
    summary: (dayCount: number, parkCount: number) =>
      `Đã đến ${parkCount} công viên trong ${dayCount} ngày`,
    enteredAt: (time: string) => `từ ${time}`,
  },

  native: {
    park: "công viên",
    channelTracking: "Ghi vị trí",
    channelEnter: "Khi vào công viên",
    channelWatch: "Theo dõi bằng camera",
    channelAlert: "Khi camera thấy thứ liên quan đến quy định",
    trackingTitle: "Đang kiểm tra các công viên gần đây",
    trackingText: "Bạn sẽ nhận thông báo khi vào công viên",
    outingEndedTitle: "Chào mừng bạn trở về",
    outingEndedText: "Bạn đã quay lại gần nơi xuất phát nên chuyến ra ngoài đã kết thúc",
    enteredTitle: "Bạn đã vào {park}",
    enteredMore: "Chạm để xem các quy định khác",
    enteredNoRule: "Chạm để xem quy định",
    watchingTitle: "Đang theo dõi quy định tại {park}",
    watchingText: "Hình ảnh được xử lý trên điện thoại, không được lưu hay gửi đi",
    watchIdleTitle: "Đang ra ngoài",
    watchIdleText:
      "Khi bạn vào công viên đã có quy định, camera sẽ theo dõi các quy định",
    watchStop: "Dừng",
    endOuting: "Kết thúc ra ngoài",
    alertTitle: "Chú ý quy định tại {park}",
    alertSeen: "Camera đã thấy \"{label}\"",
    alertSeenTap: "Camera đã thấy \"{label}\" · Chạm để xem chi tiết",
  },
};

export default vi;
