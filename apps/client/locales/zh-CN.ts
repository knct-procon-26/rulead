import type { Messages, Week } from "./ja";

/** 简体中文的 UI 文言 */

const WEEKDAYS: Week = ["日", "一", "二", "三", "四", "五", "六"];

const tabs = {
  rules: "规则",
  diary: "日记",
  scan: "扫描",
  collection: "收藏",
  you: "我的",
};

const zhCN: Messages = {
  common: {
    ok: "确定",
    cancel: "取消",
    close: "关闭",
    reload: "重新加载",
    loading: "加载中…",
    processing: "处理中…",
    openSettings: "打开设置",
    errorTitle: "错误",
    park: "公园",
    unnamedPark: "未命名的公园",
    tryAgainOnline: "请在网络通畅的地方重试。",
    locationNotAllowed: "未允许使用位置信息。",
  },

  tabs,

  notFound: {
    title: "找不到页面",
    message: "该页面不存在。",
    goHome: "返回首页",
  },

  errors: {
    network: "无法连接到服务器。请在网络通畅的地方重试。",
    server: "服务器出错了。请稍后重试。",
    rateLimited: "已达到今天的使用上限。请明天再使用。",
    blocked: "该账号已被停用。",
    notASign: "无法识别为规则告示牌。请让告示牌完整进入取景框后重新拍摄。",
    requestFailed: "处理失败。",
  },

  rulesTab: {
    androidOnly: "外出和公园规则的显示目前仅支持 Android。",
    readyTitle: "准备出门",
    readyDescription:
      "点击“外出”后，进入公园时会提示你该公园的规则。\n在已登记规则的公园里，会在手机上分析相机拍到的画面，拍到与规则相关的东西时会通知你。",
    outingTitle: "外出中",
    outingDescription:
      "进入已登记规则的公园后，这里会显示该公园的规则，并开始相机监看。\n回到出发地点附近时，会自动结束外出。",
    startOuting: "外出",
    endOuting: "结束外出",
    searchNearby: "按规则查找附近的公园",
    searchWithTheseRules: "用这些规则查找附近的公园",
    showCurrentPark: (parkName: string) =>
      `显示当前所在公园（${parkName}）的规则`,
    loadingRules: "正在加载规则…",
    noRules: "这个公园还没有登记任何规则",
    parkNotSaved: "手机上没有这个公园的信息。\n外出时靠近公园，就会自动获取。",
    parkLoadFailed: "无法加载公园的信息。",
    watchOff: `相机监看已关闭（可在“${tabs.you}”页的设置中更改）。`,
    watching:
      "正在用相机监看规则。拍到与规则相关的东西时，该规则会显示为红色并发送通知。图像不会被保存或上传。",
    watchStopped: "相机监看已停止。",
    resumeWatch: "恢复相机监看",
    startOutingFailed: "无法开始外出",
    endOutingFailed: "无法结束外出",
    startWatchFailed: "无法开始相机监看",
    locationNotAllowed: "未允许使用位置信息。",
    cameraNotAllowed: "未允许使用相机。",
    cameraPermissionTitle: "需要相机权限",
    cameraPermissionMessage:
      "用于在手机上分析相机拍到的画面。图像不会被保存或上传。",
    errorNotTracking: "当前不在外出中。",
    errorNotStarted:
      "无法启动。请检查权限设置，以及是否有其他应用正在使用相机。",
  },

  parkRules: {
    noRules: "没有规则",
    reportPark: "反馈公园",
    reportRule: "反馈",
    reportRuleLabel: "反馈这条规则",
    translationFailed: "无法翻译，因此显示原文（英文）",
    keywords: (list: string) => `关键词：${list}`,
    disclaimer:
      "※ 这里列出的只是从告示牌等来源登记的部分规则。未列出的事项不代表可以做。请优先遵守现场告示牌和管理人员的指示，并照顾周围的人。",
  },

  ruleSearch: {
    title: "按规则查找附近的公园",
    back: "‹ 重新选择规则",
    loading: "正在加载附近的公园…",
    loadFailed: "无法加载附近的公园。请在网络通畅的地方重试。",
    filterPlaceholder: "筛选规则（例如：狗、球）",
    noParksNearby: "附近（约 1 公里内）没有已登记规则的公园。",
    noMatch: "没有找到匹配的规则",
    ruleSummary: (isShownPark: boolean, parkCount: number) =>
      `${isShownPark ? "当前显示公园的规则・" : ""}附近有 ${parkCount} 个公园有此规则`,
    parksWithRule: (count: number) => `有这条规则的公园（${count}）`,
    parksWithoutRule: (count: number) => `未登记这条规则的公园（${count}）`,
    withoutCaution:
      "其中也可能包括实际上有这条规则、只是尚未登记的公园。前往前请确认现场的告示牌。",
    none: "无",
    parkSummary: (distance: string, ruleCount: number) =>
      `${distance}・已登记 ${ruleCount} 条规则`,
    map: "地图",
    distanceHere: "你所在的公园",
    distanceAbout: (distance: string) => `约 ${distance}`,
  },

  report: {
    ruleTitle: "反馈这条规则",
    ruleMessage: (ruleText: string) => `“${ruleText}”\n\n有什么问题？`,
    ruleNotHere: "这个公园没有",
    ruleInappropriate: "内容有误",
    parkTitle: "反馈这个公园",
    parkMessage: (parkName: string) =>
      `“${parkName}”\n\n公园的名称或位置不对吗？`,
    parkWrong: "名称或位置不对",
    sent: "已反馈",
    failed: "无法反馈",
    thanks: "感谢你的帮助。",
    thanksRule:
      "感谢你的帮助。当多人反馈相同内容时，这个公园将不再显示这条规则（最多需要一天生效）。",
  },

  outing: {
    preciseLocationTitle: "需要精确位置",
    preciseLocationMessage:
      "用于判断你是否进入了公园。请在设置中将位置信息设为“精确位置”。",
    startedTitle: "已开始外出",
    cameraStartFailed:
      "无法启动相机，因此将在没有相机监看的情况下外出。重新打开应用时会重试。",
    cameraNotAllowed: "未允许使用相机，因此将在没有相机监看的情况下外出。",
    notificationsNotAllowed: "未允许通知，因此不会显示公园和规则的通知。",
    backgroundNotAllowed:
      "位置信息不是“始终允许”，因此手机停止记录后，要等到打开应用才会恢复。",
  },

  tracker: {
    nativeMissing:
      "找不到 ParkTracker 原生模块。请使用开发版本（npx expo run:android）启动，而不是 Expo Go。",
    androidOnly: "ParkTracker 仅支持 Android。",
    backgroundTitle: "请将位置信息设为“始终允许”",
    backgroundMessage: "即使关闭应用，也能在你进入附近的公园时通知你。",
    backgroundMessageNextScreen: "请在下一个页面选择“始终允许”。",
    trackerNotStarted: "位置服务没有启动。请检查权限设置。",
    watchNotStarted:
      "相机监看没有启动。请检查相机权限，以及是否有其他应用正在使用相机。",
    resetUnsupported: "此版本不支持重置入园通知",
  },

  scanCamera: {
    shutter: "拍照",
    hint: "请靠近拍摄，让告示牌占满取景框。横向的告示牌也可以把手机横过来拍",
  },

  scanMap: {
    locating: "正在获取当前位置…",
    locationFailed: "无法获取位置信息。",
    searching: "正在查找公园…",
    lookupFailed: "无法获取公园的信息",
    notFound: "在这个位置没有找到公园",
    readyToSubmit: "如果这个范围没问题，请点击确定",
    issues: {
      needPoints: "请点击地图，沿公园周围放置点",
      crossing: "线条交叉了。请移动或删除点",
      tooSmall: "范围太小",
      tooLarge: "范围太大。请只圈出公园内部",
      tooFar: "请圈出你当前位置附近的范围",
    },
    namePlaceholder: "公园名称（选填）",
    undo: "撤销一步",
    clearAll: "全部清除",
    retake: "重拍",
    decide: "确定是这个公园",
    nearbyTitle: "附近找到了公园",
    nearbyHint: "定位可能略有偏差。请选择你所在的公园",
    drawOwn: "都不是（自己画范围）",
    chooseNearby: "从附近的公园中选择",
    chooseOther: "选择其他公园",
    guideTap: (n: number) => `请在地图上点击公园的各个角（还需${n}个点）`,
    editTip: "点击点可删除，长按可移动",
  },

  scanConfirm: {
    reading: "正在读取告示牌…",
    noRules: "没有找到规则",
    wrong: "✖ 内容不对",
    collect: "✔ 收藏",
    submitting: "登记中…",
  },

  bonus: {
    badge: "奖励！",
    verifyMessage: (parkName: string | null) =>
      `其他人在${parkName ?? "这个公园"}发现了这样的规则。`,
    suggestMessage: "在附近的其他公园发现了这样的规则。",
    question: (parkName: string | null) =>
      `你在现在所在的${parkName ?? "这个公园"}看到过这条规则吗？`,
    accept: "领取（看到过）",
    reject: "没看到",
  },

  collection: {
    signs: "拍摄的告示牌",
    parks: "去过的公园",
    sortTitle: "排序",
    sort: {
      recent: "最新",
      oldest: "最早",
      rarest: "最稀有",
      commonest: "最常见",
      most: "收藏次数最多",
      fewest: "收藏次数最少",
    },
    share: (percent: string) => `占全部的 ${percent}%`,
    empty: "还没有收藏。\n拍摄告示牌，收集更多规则吧！",
    loadFailed: "无法加载。\n重新打开该页即可重新加载。",
  },

  you: {
    settings: "设置",
    language: "显示语言",
    languageNote:
      "会更改应用界面、公园规则和外出时通知的语言。如果选择应用尚未支持的语言，应用界面会显示为英文，规则则显示为所选语言（通知中的规则从下次获取公园信息时开始更改）。",
    cameraWatchSetting: "外出时的相机监看",
    cameraWatchNote: "关闭后，在公园里不会使用相机，只会在进入公园时通知你。",
    openNotificationSettings: "打开通知设置",
    cameraPermissionTitle: "需要相机权限",
    cameraPermissionMessage:
      "如需在外出时使用相机监看，请允许使用相机。下次开始外出时也会再次确认。",

    statusSection: "外出和权限",
    outing: "外出",
    outingActive: "外出中",
    outingPaused: "外出中（记录已停止，打开应用后会恢复）",
    outingInactive: "未外出",
    cameraWatch: "相机监看",
    watchActive: (parkName: string) => `监看中（${parkName}）`,
    watchWaiting: "待命中（进入有规则的公园时开始）",
    watchStopped: "已停止",
    location: "位置信息",
    locationStatus: {
      precise: "已允许（精确位置）",
      approximate: "仅大致位置",
      denied: "未允许",
      blocked: "未允许（请在设置中更改）",
    },
    backgroundLocation: "后台位置",
    notifications: "通知",
    camera: "相机",
    allowed: "已允许",
    alwaysAllowed: "始终允许",
    notAllowed: "未允许",
    openAppSettings: "打开应用设置",
    batterySettings: "电池优化设置",
    batteryNote: "如果外出时记录经常中断，请将 rulead 排除在电池优化之外。",

    privacy: "隐私",
    privacyText: [
      "・外出时不会将你的当前位置发送到服务器。获取周围公园时，只会发送约 1 公里见方区块的中心点。你在哪个公园里，只在手机上判断。",
      "・外出时相机的画面只在手机上分析，图像不会被保存或上传。只会把看到的东西的名称（例如“狗”）记录在手机上，用于日记。",
      "・登记告示牌时，会将告示牌的照片、当前位置和公园的范围发送到服务器（为了查询公园的范围，当前位置也会发送给地图服务）。",
      "・提交“反馈”时，会将哪个公园的哪条规则发送到服务器。",
      "・为了翻译规则，会将显示中的规则和语言发送到服务器。",
    ].join("\n"),

    accountSection: "账号和数据",
    clearLocal: "清除手机上的记录",
    clearLocalTitle: "要清除手机上的记录吗？",
    clearLocalMessage:
      "将清除保存在这部手机上的记录：去过的公园、在公园内的位置、相机看到的东西和规则通知（日记会变为空白）。收藏不会被清除。",
    clearLocalConfirm: "清除",
    clearLocalDone: "已清除手机上的记录",
    clearLocalFailed: "无法清除",
    deleteAccount: "删除账号",
    deleteTitle: "要删除账号吗？",
    deleteMessage:
      "将从服务器删除你的收藏、反馈和规则确认的回答，并清除这部手机上的记录。此操作无法撤销。\n\n你登记的公园和规则会作为大家的数据保留下来（不会与你关联）。",
    deleteConfirm: "删除",
    deleteDoneTitle: "已删除账号",
    deleteDoneMessage: "已删除收藏等数据。下次使用应用时，会以新账号开始。",
    deleteFailed: "无法删除",
    deleteNote:
      "删除账号后，收藏等数据会从服务器删除，下次使用时会以新账号开始。",

    version: (version: string) => `rulead 版本 ${version}`,
    debugUnlocked: "已显示开发者选项",
  },

  diary: {
    androidOnly: "公园日记仅支持 Android 版",
    loadFailed: "无法加载日记",
    invalidDate: "日期不正确",
    emptyTitle: "还没有日记",
    emptyText: `在“${tabs.rules}”页点击“外出”并去公园后，走过的路线和相机拍到的东西会记录在这里。`,
    previous: "上一篇日记",
    next: "下一篇日记",
    openCalendar: "打开日历",
    dayLabel: (year: number, month: number, day: number, weekday: number) =>
      `${year}/${month}/${day}（周${WEEKDAYS[weekday] ?? ""}）`,
    parkOfDay: (position: number, count: number) =>
      `当天的公园 ${position} / ${count}`,
    recordOf: (position: number, count: number) =>
      `第 ${position} / ${count} 条记录`,
    visitedAt: (time: string) => `${time} 到访`,
    stay: (duration: string, stayCount: number) =>
      `（停留 ${duration}${stayCount > 1 ? `・${stayCount} 次` : ""}）`,
    durationUnderMinute: "不到 1 分钟",
    duration: (hours: number, minutes: number) =>
      hours === 0
        ? `${minutes} 分钟`
        : minutes === 0
          ? `${hours} 小时`
          : `${hours} 小时 ${minutes} 分钟`,
    expandMap: "放大显示地图",
    noMapData: "没有地图数据",
    legendPark: "公园范围",
    legendTrack: "走过的路线",
    seenTitle: "常看到的东西",
    seenNone: "相机监看没有发现任何东西",
    times: (count: number) => `${count} 次`,
    photosTitle: "在这里拍的照片",
    photosUnavailable: "此版本的应用不支持显示照片",
    photosExplain:
      "只在手机上查找并显示你在公园期间拍摄的照片。照片不会被发送到应用以外的地方。",
    photosAllow: "允许访问照片",
    photosAllowInSettings: "在设置中允许访问照片",
    photosNoStay: "没有停留时间的记录，因此无法查找照片",
    photosLoadFailed: "无法加载照片",
    photosLimited: "仅显示你允许访问的照片",
    photosReselect: "重新选择照片",
    photosNone: "没有在这个公园拍的照片",
    photoTakenAt: (time: string) => `${time} 拍摄的照片`,
  },

  calendar: {
    title: "公园日历",
    previousMonth: "上个月",
    nextMonth: "下个月",
    monthTitle: (year: number, month: number) => `${year}年${month}月`,
    weekdays: WEEKDAYS,
    day: (month: number, day: number) => `${month}月${day}日`,
    dayWithParks: (month: number, day: number, parkCount: number) =>
      `${month}月${day}日 ${parkCount} 个公园`,
    noRecords: "这个月没有记录",
    summary: (dayCount: number, parkCount: number) =>
      `${dayCount} 天・去了 ${parkCount} 个公园`,
    enteredAt: (time: string) => `${time} 起`,
  },

  native: {
    park: "公园",
    channelTracking: "位置记录",
    channelEnter: "进入公园时",
    channelWatch: "相机监看",
    channelAlert: "拍到与规则相关的东西时",
    trackingTitle: "正在检查附近的公园",
    trackingText: "进入公园时会通知你",
    outingEndedTitle: "欢迎回来",
    outingEndedText: "已回到出发地点附近，外出已结束",
    enteredTitle: "已进入{park}",
    enteredMore: "点击查看其他规则",
    enteredNoRule: "点击查看规则",
    watchingTitle: "正在监看{park}的规则",
    watchingText: "图像只在手机上处理，不会被保存或上传",
    watchIdleTitle: "外出中",
    watchIdleText: "进入已登记规则的公园时，会用相机监看规则",
    watchStop: "停止",
    endOuting: "结束外出",
    alertTitle: "请注意{park}的规则",
    alertSeen: "拍到了“{label}”",
    alertSeenTap: "拍到了“{label}”・点击查看详情",
  },
};

export default zhCN;
