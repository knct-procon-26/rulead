import type { Messages, Week } from "./ja";

/** 繁體中文（台灣）的 UI 文言 */

const WEEKDAYS: Week = ["日", "一", "二", "三", "四", "五", "六"];

const tabs = {
  rules: "規則",
  diary: "日記",
  scan: "掃描",
  collection: "收藏",
  you: "我的",
};

const zhTW: Messages = {
  common: {
    ok: "確定",
    cancel: "取消",
    close: "關閉",
    reload: "重新載入",
    loading: "載入中…",
    processing: "處理中…",
    openSettings: "開啟設定",
    errorTitle: "錯誤",
    park: "公園",
    unnamedPark: "未命名的公園",
    tryAgainOnline: "請在網路連線穩定的地方再試一次。",
    locationNotAllowed: "未允許使用位置資訊。",
  },

  tabs,

  notFound: {
    title: "找不到頁面",
    message: "這個畫面不存在。",
    goHome: "回到首頁",
  },

  errors: {
    network: "無法連線到伺服器。請在網路連線穩定的地方再試一次。",
    server: "伺服器發生錯誤。請稍後再試。",
    rateLimited: "已達到今天的使用上限。請明天再使用。",
    blocked: "此帳號已被停用。",
    notASign: "無法辨識為規則告示牌。請讓告示牌完整進入框內後重新拍攝。",
    requestFailed: "處理失敗。",
  },

  rulesTab: {
    androidOnly: "外出與公園規則的顯示目前僅支援 Android。",
    readyTitle: "準備出門",
    readyDescription:
      "按下「外出」後，進入公園時會通知你該公園的規則。\n在已登錄規則的公園裡，會在手機內分析相機拍到的畫面，拍到與規則相關的東西時會通知你。",
    outingTitle: "外出中",
    outingDescription:
      "進入已登錄規則的公園後，這裡會顯示該公園的規則，並開始相機監看。\n回到出發地點附近時，會自動結束外出。",
    startOuting: "外出",
    endOuting: "結束外出",
    searchNearby: "依規則搜尋附近的公園",
    searchWithTheseRules: "用這些規則搜尋附近的公園",
    showCurrentPark: (parkName: string) =>
      `顯示目前所在公園（${parkName}）的規則`,
    loadingRules: "正在載入規則…",
    noRules: "這個公園還沒有登錄任何規則",
    parkNotSaved: "手機裡沒有這個公園的資料。\n外出時靠近公園，就會自動取得。",
    parkLoadFailed: "無法載入公園的資料。",
    watchOff: `相機監看已關閉（可在「${tabs.you}」分頁的設定中變更）。`,
    watching:
      "正在用相機監看規則。拍到與規則相關的東西時，該規則會以紅色顯示並發送通知。影像不會被儲存或傳送。",
    watchStopped: "相機監看已停止。",
    resumeWatch: "恢復相機監看",
    startOutingFailed: "無法開始外出",
    endOutingFailed: "無法結束外出",
    startWatchFailed: "無法開始相機監看",
    locationNotAllowed: "未允許使用位置資訊。",
    cameraNotAllowed: "未允許使用相機。",
    cameraPermissionTitle: "需要相機權限",
    cameraPermissionMessage:
      "用來在手機內分析相機拍到的畫面。影像不會被儲存或傳送。",
    errorNotTracking: "目前不在外出中。",
    errorNotStarted:
      "無法啟動。請確認權限設定，以及是否有其他 App 正在使用相機。",
  },

  parkRules: {
    noRules: "沒有規則",
    reportPark: "回報公園",
    reportRule: "回報",
    reportRuleLabel: "回報這條規則",
    translationFailed: "無法翻譯，因此以原文（英文）顯示",
    keywords: (list: string) => `關鍵字：${list}`,
    disclaimer:
      "※ 這裡列出的只是從告示牌等來源登錄的部分規則。沒有列出的事項不代表可以做。請優先遵守現場的告示牌與管理人員的指示，並顧及周圍的人。",
  },

  ruleSearch: {
    title: "依規則搜尋附近的公園",
    back: "‹ 重新選擇規則",
    loading: "正在載入附近的公園…",
    loadFailed: "無法載入附近的公園。請在網路連線穩定的地方再試一次。",
    filterPlaceholder: "篩選規則（例如：狗、球）",
    noParksNearby: "附近（約 1 公里內）沒有已登錄規則的公園。",
    noMatch: "找不到符合的規則",
    ruleSummary: (isShownPark: boolean, parkCount: number) =>
      `${isShownPark ? "目前顯示公園的規則・" : ""}附近有 ${parkCount} 座公園有此規則`,
    parksWithRule: (count: number) => `有這條規則的公園（${count}）`,
    parksWithoutRule: (count: number) => `未登錄這條規則的公園（${count}）`,
    withoutCaution:
      "其中也可能包含實際上有這條規則、只是尚未登錄的公園。前往前請確認現場的告示牌。",
    none: "沒有",
    parkSummary: (distance: string, ruleCount: number) =>
      `${distance}・已登錄 ${ruleCount} 條規則`,
    map: "地圖",
    distanceHere: "你所在的公園",
    distanceAbout: (distance: string) => `約 ${distance}`,
  },

  report: {
    ruleTitle: "回報這條規則",
    ruleMessage: (ruleText: string) => `「${ruleText}」\n\n有什麼問題呢？`,
    ruleNotHere: "這個公園沒有",
    ruleInappropriate: "內容有誤",
    parkTitle: "回報這個公園",
    parkMessage: (parkName: string) =>
      `「${parkName}」\n\n公園的名稱或位置不正確嗎？`,
    parkWrong: "名稱・位置不正確",
    sent: "已回報",
    failed: "無法回報",
    thanks: "感謝你的協助。",
    thanksRule:
      "感謝你的協助。當多人回報相同內容時，這個公園將不再顯示這條規則（最多需要一天才會反映）。",
  },

  outing: {
    preciseLocationTitle: "需要精確位置",
    preciseLocationMessage:
      "用來判斷你是否進入了公園。請在設定中將位置資訊設為「精確位置」。",
    startedTitle: "已開始外出",
    cameraStartFailed:
      "無法啟動相機，因此將在沒有相機監看的情況下外出。重新開啟 App 時會再試一次。",
    cameraNotAllowed: "未允許使用相機，因此將在沒有相機監看的情況下外出。",
    notificationsNotAllowed: "未允許通知，因此不會顯示公園與規則的通知。",
    backgroundNotAllowed:
      "位置資訊不是「一律允許」，因此手機停止記錄後，要等到開啟 App 才會恢復。",
  },

  tracker: {
    nativeMissing:
      "找不到 ParkTracker 原生模組。請使用開發版本（npx expo run:android）啟動，而不是 Expo Go。",
    androidOnly: "ParkTracker 僅支援 Android。",
    backgroundTitle: "請將位置資訊設為「一律允許」",
    backgroundMessage: "即使關閉 App，也能在你進入附近的公園時通知你。",
    backgroundMessageNextScreen: "請在下一個畫面選擇「一律允許」。",
    trackerNotStarted: "位置服務沒有啟動。請確認權限設定。",
    watchNotStarted:
      "相機監看沒有啟動。請確認相機權限，以及是否有其他 App 正在使用相機。",
    resetUnsupported: "此版本不支援重設入園通知",
  },

  scanCamera: {
    shutter: "拍照",
    hint: "請靠近拍攝，讓告示牌佔滿取景框。橫向的告示牌也可以把手機橫過來拍",
    permissionDenied:
      "拍攝告示牌需要相機權限。請在設定中允許存取相機。",
  },

  scanMap: {
    locating: "正在取得目前位置…",
    locationFailed: "無法取得位置資訊。",
    searching: "正在尋找公園…",
    lookupFailed: "無法取得公園的資料",
    notFound: "在這個位置找不到公園",
    readyToSubmit: "如果這個範圍沒問題，請按確定",
    issues: {
      needPoints: "請點選地圖，沿著公園周圍放置點",
      crossing: "線條交叉了。請移動或刪除點",
      tooSmall: "範圍太小",
      tooLarge: "範圍太大。請只圍住公園內部",
      tooFar: "請圍住你目前位置附近的範圍",
    },
    namePlaceholder: "公園名稱（選填）",
    undo: "復原一步",
    clearAll: "全部清除",
    retake: "重拍",
    decide: "確定是這個公園",
    nearbyTitle: "附近找到了公園",
    nearbyHint: "定位可能略有偏差。請選擇你所在的公園",
    drawOwn: "都不是（自己畫範圍）",
    chooseNearby: "從附近的公園中選擇",
    chooseOther: "選擇其他公園",
    guideTap: (n: number) => `請在地圖上點選公園的各個角（還需${n}個點）`,
    editTip: "點一下點可刪除，長按可移動",
  },

  scanConfirm: {
    reading: "正在讀取告示牌…",
    noRules: "找不到規則",
    wrong: "✖ 內容不正確",
    collect: "✔ 收藏",
    submitting: "登錄中…",
  },

  bonus: {
    badge: "獎勵！",
    verifyMessage: (parkName: string | null) =>
      `其他人在${parkName ?? "這個公園"}發現了這樣的規則。`,
    suggestMessage: "在附近的其他公園發現了這樣的規則。",
    question: (parkName: string | null) =>
      `你在現在所在的${parkName ?? "這個公園"}有看到這條規則嗎？`,
    accept: "收下（有看到）",
    reject: "沒有看到",
  },

  collection: {
    signs: "拍攝的告示牌",
    totalRules: "登錄的規則",
    sortTitle: "排序",
    sort: {
      recent: "最新",
      oldest: "最舊",
      rarest: "最稀有",
      commonest: "最常見",
      most: "收藏次數最多",
      fewest: "收藏次數最少",
    },
    share: (percent: string) => `佔全部的 ${percent}%`,
    empty: "還沒有收藏。\n拍攝告示牌，蒐集更多規則吧！",
    loadFailed: "無法載入。\n重新開啟分頁即可重新載入。",
  },

  you: {
    settings: "設定",
    language: "顯示語言",
    languageNote:
      "會變更 App 的顯示與規則的語言。若選擇 App 尚未支援的語言，App 會以英文顯示，只有規則以所選語言顯示。",
    cameraWatchSetting: "外出時的相機監看",
    cameraWatchNote: "關閉後，在公園裡不會使用相機，只會在進入公園時通知你。",
    openNotificationSettings: "開啟通知設定",
    cameraPermissionTitle: "需要相機權限",
    cameraPermissionMessage:
      "若要在外出時使用相機監看，請允許使用相機。下次開始外出時也會再次確認。",

    statusSection: "外出與權限",
    outing: "外出",
    outingActive: "外出中",
    outingPaused: "外出中（記錄已停止，開啟 App 後會恢復）",
    outingInactive: "未外出",
    cameraWatch: "相機監看",
    watchActive: (parkName: string) => `監看中（${parkName}）`,
    watchWaiting: "待命中（進入有規則的公園時開始）",
    watchStopped: "已停止",
    location: "位置資訊",
    locationStatus: {
      precise: "已允許（精確位置）",
      approximate: "僅大略位置",
      denied: "未允許",
      blocked: "未允許（請在設定中變更）",
    },
    backgroundLocation: "背景位置",
    notifications: "通知",
    camera: "相機",
    allowed: "已允許",
    alwaysAllowed: "一律允許",
    notAllowed: "未允許",
    openAppSettings: "開啟 App 設定",
    batterySettings: "電池最佳化設定",
    batteryNote: "如果外出時記錄經常中斷，請將 rulead 排除在電池最佳化之外。",

    privacy: "隱私",
    privacyText: [
      "・登錄告示牌時，會將告示牌的照片、目前位置與公園的範圍傳送到伺服器（為了查詢公園的範圍，目前位置也會傳送給地圖服務）。",
      "・為了翻譯規則，會將顯示中的規則與語言傳送到伺服器。",
    ].join("\n"),

    accountSection: "帳號與資料",
    clearLocal: "清除手機裡的記錄",
    clearLocalTitle: "要清除手機裡的記錄嗎？",
    clearLocalMessage:
      "將清除儲存在這支手機裡的記錄：去過的公園、在公園內的位置、相機看到的東西與規則通知（日記會變成空白）。收藏不會被清除。",
    clearLocalConfirm: "清除",
    clearLocalDone: "已清除手機裡的記錄",
    clearLocalFailed: "無法清除",
    deleteAccount: "刪除帳號",
    deleteTitle: "要刪除帳號嗎？",
    deleteMessage:
      "將從伺服器刪除你的收藏、回報與規則確認的回答，並清除這支手機裡的記錄。此操作無法復原。\n\n你登錄的公園與規則會作為大家的資料保留下來（不會與你連結）。",
    deleteConfirm: "刪除",
    deleteDoneTitle: "已刪除帳號",
    deleteDoneMessage: "已刪除收藏等資料。下次使用 App 時，會以新帳號開始。",
    deleteFailed: "無法刪除",
    deleteNote:
      "刪除帳號後，收藏等資料會從伺服器刪除，下次使用時會以新帳號開始。",

    version: (version: string) => `rulead 版本 ${version}`,
    debugUnlocked: "已顯示開發者選項",
  },

  diary: {
    androidOnly: "公園日記僅支援 Android 版",
    loadFailed: "無法載入日記",
    invalidDate: "日期不正確",
    emptyTitle: "還沒有日記",
    emptyText: `在「${tabs.rules}」分頁按下「外出」並造訪公園後，走過的路線與相機拍到的東西會記錄在這裡。`,
    previous: "上一篇日記",
    next: "下一篇日記",
    openCalendar: "開啟行事曆",
    dayLabel: (year: number, month: number, day: number, weekday: number) =>
      `${year}/${month}/${day}（週${WEEKDAYS[weekday] ?? ""}）`,
    parkOfDay: (position: number, count: number) =>
      `當天的公園 ${position} / ${count}`,
    recordOf: (position: number, count: number) =>
      `第 ${position} / ${count} 筆記錄`,
    visitedAt: (time: string) => `${time} 造訪`,
    stay: (duration: string, stayCount: number) =>
      `（停留 ${duration}${stayCount > 1 ? `・${stayCount} 次` : ""}）`,
    durationUnderMinute: "不到 1 分鐘",
    duration: (hours: number, minutes: number) =>
      hours === 0
        ? `${minutes} 分鐘`
        : minutes === 0
          ? `${hours} 小時`
          : `${hours} 小時 ${minutes} 分鐘`,
    expandMap: "放大顯示地圖",
    noMapData: "沒有地圖資料",
    legendPark: "公園範圍",
    legendTrack: "走過的路線",
    seenTitle: "常看到的東西",
    seenNone: "相機監看沒有發現任何東西",
    times: (count: number) => `${count} 次`,
    photosTitle: "在這裡拍的照片",
    photosUnavailable: "此版本的 App 不支援顯示照片",
    photosExplain:
      "只在手機內尋找並顯示你待在公園期間拍攝的照片。照片不會被傳送到 App 以外的地方。",
    photosAllow: "允許存取照片",
    photosAllowInSettings: "在設定中允許存取照片",
    photosNoStay: "沒有停留時間的記錄，因此無法尋找照片",
    photosLoadFailed: "無法載入照片",
    photosLimited: "僅顯示你允許存取的照片",
    photosReselect: "重新選擇照片",
    photosNone: "沒有在這個公園拍的照片",
    photoTakenAt: (time: string) => `${time} 拍攝的照片`,
  },

  calendar: {
    title: "公園行事曆",
    previousMonth: "上個月",
    nextMonth: "下個月",
    monthTitle: (year: number, month: number) => `${year}年${month}月`,
    weekdays: WEEKDAYS,
    day: (month: number, day: number) => `${month}月${day}日`,
    dayWithParks: (month: number, day: number, parkCount: number) =>
      `${month}月${day}日 ${parkCount} 座公園`,
    noRecords: "這個月沒有記錄",
    summary: (dayCount: number, parkCount: number) =>
      `${dayCount} 天・造訪了 ${parkCount} 座公園`,
    enteredAt: (time: string) => `${time} 起`,
  },

  native: {
    park: "公園",
    channelTracking: "位置記錄",
    channelEnter: "進入公園時",
    channelWatch: "相機監看",
    channelAlert: "拍到與規則相關的東西時",
    trackingTitle: "正在檢查附近的公園",
    trackingText: "進入公園時會通知你",
    outingEndedTitle: "歡迎回來",
    outingEndedText: "已回到出發地點附近，外出已結束",
    enteredTitle: "已進入{park}",
    enteredMore: "點一下查看其他規則",
    enteredNoRule: "點一下查看規則",
    watchingTitle: "正在監看{park}的規則",
    watchingText: "影像只在手機內處理，不會被儲存或傳送",
    watchIdleTitle: "外出中",
    watchIdleText: "進入已登錄規則的公園時，會用相機監看規則",
    watchStop: "停止",
    endOuting: "結束外出",
    alertTitle: "請注意{park}的規則",
    alertSeen: "拍到了「{label}」",
    alertSeenTap: "拍到了「{label}」・點一下查看詳情",
  },
};

export default zhTW;
