export type Week = readonly [
  string,
  string,
  string,
  string,
  string,
  string,
  string,
];

const WEEKDAYS: Week = ["日", "月", "火", "水", "木", "金", "土"];

const tabs = {
  rules: "ルール",
  diary: "日記",
  scan: "スキャン",
  collection: "コレクション",
  you: "マイページ",
};

const ja = {
  common: {
    ok: "OK",
    cancel: "キャンセル",
    close: "閉じる",
    reload: "再読み込み",
    loading: "読み込み中…",
    processing: "処理中…",
    openSettings: "設定を開く",
    errorTitle: "エラー",
    park: "公園",
    unnamedPark: "名前のない公園",
    tryAgainOnline: "電波の届く場所でもう一度お試しください。",
    locationNotAllowed: "位置情報の使用が許可されていません。",
  },

  tabs,

  notFound: {
    title: "ページが見つかりません",
    message: "この画面は存在しません。",
    goHome: "ホームに戻る",
  },

  errors: {
    network:
      "サーバーに接続できませんでした。電波の届く場所でもう一度お試しください。",
    server:
      "サーバーでエラーが発生しました。しばらくしてからもう一度お試しください。",
    rateLimited: "今日の利用上限に達しました。また明日お試しください。",
    blocked: "このアカウントは利用が停止されています。",
    notASign:
      "看板を読み取れませんでした。看板全体が枠に入るように撮り直してください。",
    requestFailed: "処理に失敗しました。",
  },

  rulesTab: {
    androidOnly:
      "外出機能と公園のルール表示は、今のところ Android 版のみ対応しています。",
    readyTitle: "おでかけの準備",
    readyDescription:
      "「外出する」を押しておくと、公園に入ったときにその公園のルールをお知らせします。\nルールが登録されている公園では、カメラの映像を端末内でチェックし、犬やボールなどルールに関わるものが映ったら通知します。",
    outingTitle: "外出中",
    outingDescription:
      "ルールが登録されている公園に入ると、ここにルールが表示され、カメラでの見守りが始まります。\n出発地点の近くに戻ると、外出は自動で終わります。",
    startOuting: "外出する",
    endOuting: "外出を終える",
    searchNearby: "近くの公園をルールで探す",
    searchWithTheseRules: "このルールで近くの公園を探す",
    showCurrentPark: (parkName: string) =>
      `今いる公園（${parkName}）のルールを表示`,
    loadingRules: "ルールを読み込んでいます…",
    noRules: "この公園にはまだルールが登録されていません",
    parkNotSaved:
      "この公園の情報が端末にありません。\n外出中に公園の近くへ行くと、自動で取得されます。",
    parkLoadFailed: "公園の情報を読み込めませんでした。",
    watchOff: `カメラでの見守りはオフです（「${tabs.you}」タブの設定で変更できます）。`,
    watching:
      "カメラで見守り中です。ルールに関わるものが映ると、そのルールが赤く表示され、通知が届きます。画像は保存も送信もしません。",
    watchStopped: "カメラでの見守りが止まっています。",
    resumeWatch: "カメラでの見守りを再開",
    startOutingFailed: "外出を始められませんでした",
    endOutingFailed: "外出を終えられませんでした",
    startWatchFailed: "カメラでの見守りを始められませんでした",
    locationNotAllowed: "位置情報の使用が許可されていません。",
    cameraNotAllowed: "カメラの使用が許可されていません。",
    cameraPermissionTitle: "カメラの許可が必要です",
    cameraPermissionMessage:
      "カメラの映像を端末内でチェックするために使います。画像の保存や送信はしません。",
    errorNotTracking: "外出中ではありません。",
    errorNotStarted:
      "起動できませんでした。権限の設定と、ほかのアプリがカメラを使っていないかを確認してください。",
  },

  parkRules: {
    noRules: "ルールがありません",
    reportPark: "公園を報告",
    reportRule: "報告",
    reportRuleLabel: "このルールを報告",
    translationFailed: "翻訳できなかったため、原文（英語）を表示しています",
    keywords: (list: string) => `キーワード: ${list}`,
    disclaimer:
      "※ ここに載っているのは、看板などから登録されたルールの一部です。載っていないからといって、してよいとは限りません。現地の看板や管理者の指示に従ってください。",
  },

  ruleSearch: {
    title: "近くの公園をルールで探す",
    back: "‹ ルールを選び直す",
    loading: "近くの公園を読み込んでいます…",
    loadFailed:
      "近くの公園を読み込めませんでした。電波の届く場所でもう一度お試しください。",
    filterPlaceholder: "ルールを絞り込む（例: 犬、ボール）",
    noParksNearby: "約1km以内に、ルールが登録された公園はありません。",
    noMatch: "見つかりませんでした",
    ruleSummary: (isShownPark: boolean, parkCount: number) =>
      `${isShownPark ? "表示中の公園のルール・" : ""}近くの${parkCount}か所の公園にあり`,
    parksWithRule: (count: number) => `このルールがある公園（${count}）`,
    parksWithoutRule: (count: number) => `このルールが未登録の公園（${count}）`,
    withoutCaution:
      "未登録なだけで、実際にはこのルールがある公園もあります。行く前に現地の看板を確認してください。",
    none: "ありません",
    parkSummary: (distance: string, ruleCount: number) =>
      `${distance}・登録されたルール ${ruleCount}件`,
    map: "地図",
    distanceHere: "今いる公園",
    distanceAbout: (distance: string) => `約${distance}`,
  },

  report: {
    ruleTitle: "このルールを報告",
    ruleMessage: (ruleText: string) =>
      `「${ruleText}」\n\nどんな問題がありますか？`,
    ruleNotHere: "この公園にない",
    ruleInappropriate: "内容がおかしい",
    parkTitle: "この公園を報告",
    parkMessage: (parkName: string) =>
      `「${parkName}」\n\n公園の名前や場所が違いますか？`,
    parkWrong: "名前・場所が違う",
    sent: "報告しました",
    failed: "報告できませんでした",
    thanks: "ご協力ありがとうございます。",
    thanksRule:
      "ご協力ありがとうございます。同じ報告が何人かから届くと、この公園ではこのルールが表示されなくなります（反映には最大1日かかります）。",
  },

  outing: {
    preciseLocationTitle: "正確な位置情報が必要です",
    preciseLocationMessage:
      "公園に入ったかどうかの判定に使います。設定で位置情報を「正確な位置」にしてください。",
    startedTitle: "外出を始めました",
    cameraStartFailed:
      "カメラを起動できなかったため、カメラでの見守りなしで外出します。アプリを開き直すと、もう一度起動を試みます。",
    cameraNotAllowed:
      "カメラが許可されていないため、カメラでの見守りなしで外出します。",
    notificationsNotAllowed:
      "通知が許可されていないため、公園やルールのお知らせは届きません。",
    backgroundNotAllowed:
      "位置情報が「常に許可」になっていないため、スマホが記録を止めると、次にアプリを開くまで再開しません。",
  },

  tracker: {
    nativeMissing:
      "ParkTracker ネイティブモジュールが見つかりません。Expo Go ではなく開発ビルド（npx expo run:android）で起動してください。",
    androidOnly: "ParkTracker は Android 専用です。",
    backgroundTitle: "位置情報を「常に許可」にしてください",
    backgroundMessage:
      "アプリを閉じているときも、公園に入ったことをお知らせするために使います。",
    backgroundMessageNextScreen: "次の画面で「常に許可」を選んでください。",
    trackerNotStarted:
      "位置情報サービスを起動できませんでした。権限の設定を確認してください。",
    watchNotStarted:
      "カメラでの見守りを起動できませんでした。カメラの権限と、ほかのアプリがカメラを使っていないかを確認してください。",
    resetUnsupported: "このビルドは入園通知のリセットに対応していません",
  },

  scanCamera: {
    shutter: "撮影する",
    hint: "看板が枠いっぱいに写るまで近づいて撮ってください。横長の看板はスマホを横向きにしてもOKです",
    permissionDenied:
      "看板を撮影するにはカメラの許可が必要です。設定からカメラへのアクセスを許可してください。",
  },

  scanMap: {
    locating: "現在地を取得しています…",
    locationFailed: "位置情報を取得できませんでした。",
    searching: "公園を探しています…",
    lookupFailed: "公園の情報を取得できませんでした",
    notFound: "この場所の公園が見つかりませんでした",
    readyToSubmit: "この範囲でよければ決定してください",
    issues: {
      needPoints: "地図をタップして、公園を囲むように点を置いてください",
      crossing: "線が交差しています。点を動かすか消してください",
      tooSmall: "範囲が狭すぎます",
      tooLarge: "範囲が広すぎます。公園の中だけを囲んでください",
      tooFar: "今いる場所の近くを囲んでください",
    },
    namePlaceholder: "公園の名前（任意）",
    undo: "1つ戻す",
    clearAll: "全部消す",
    retake: "撮り直す",
    decide: "この公園で決定",
    nearbyTitle: "近くに公園が見つかりました",
    nearbyHint:
      "位置情報が少しずれていることがあります。今いる公園を選んでください",
    drawOwn: "どれでもない（自分で範囲を描く）",
    chooseNearby: "近くの公園から選ぶ",
    chooseOther: "違う公園を選ぶ",
    guideTap: (n: number) => `公園の角を地図でタップしてください（あと${n}点）`,
    editTip: "点はタップで消せます。長押しすると動かせます",
  },

  scanConfirm: {
    reading: "看板を読み取っています…",
    noRules: "ルールが見つかりませんでした",
    wrong: "✖ 間違っています",
    collect: "✔ コレクションする",
    submitting: "登録中…",
  },

  bonus: {
    badge: "ボーナス！",
    verifyMessage: (parkName: string | null) =>
      `${parkName ?? "この公園"}では、ほかの人がこんなルールを見つけています。`,
    suggestMessage: "近くの別の公園で、こんなルールが見つかっています。",
    question: (parkName: string | null) =>
      `${parkName ?? "この公園"}で、このルールを見かけましたか？`,
    accept: "受け取る（見かけた）",
    reject: "見ていない",
  },

  collection: {
    signs: "撮影した看板",
    totalRules: "登録したルール",
    sortTitle: "並べ替え",
    sort: {
      recent: "新しい順",
      oldest: "古い順",
      rarest: "レア順",
      commonest: "レアじゃない順",
      most: "多い順",
      fewest: "少ない順",
    },
    share: (percent: string) => `全体の ${percent}%`,
    empty:
      "まだコレクションがありません。\n看板を撮影して、ルールを集めてみましょう。",
    loadFailed: "読み込めませんでした。\nタブを開き直すと再読み込みします。",
  },

  you: {
    settings: "設定",
    language: "表示する言語",
    languageNote:
      "アプリの表示とルールの言語が変わります。アプリが対応していない言語の場合、アプリの表示は英語になり、ルールだけが選んだ言語になります。",
    cameraWatchSetting: "外出中のカメラでの見守り",
    cameraWatchNote:
      "オフにすると公園でカメラを使わず、公園に入ったときの通知だけになります。",
    openNotificationSettings: "通知の設定を開く",
    cameraPermissionTitle: "カメラの許可が必要です",
    cameraPermissionMessage:
      "外出中にカメラで見守るには、カメラの使用を許可してください。次に外出を始めるときにも確認します。",

    statusSection: "外出と権限",
    outing: "外出",
    outingActive: "外出中",
    outingPaused: "外出中（記録が止まっています。アプリを開くと再開します）",
    outingInactive: "していない",
    cameraWatch: "カメラでの見守り",
    watchActive: (parkName: string) => `見守り中（${parkName}）`,
    watchWaiting: "待機中（ルールのある公園に入ると開始）",
    watchStopped: "停止",
    location: "位置情報",
    locationStatus: {
      precise: "許可（正確な位置）",
      approximate: "おおよその位置のみ",
      denied: "許可されていません",
      blocked: "許可されていません（設定から変更）",
    },
    backgroundLocation: "バックグラウンドの位置",
    notifications: "通知",
    camera: "カメラ",
    allowed: "許可",
    alwaysAllowed: "常に許可",
    notAllowed: "許可なし",
    openAppSettings: "アプリの設定を開く",
    batterySettings: "電池の最適化の設定",
    batteryNote:
      "外出中に記録が止まってしまう場合は、rulead を電池の最適化の対象から外してください。",

    privacy: "プライバシー",
    privacyText: [
      "・看板を登録するときは、看板の写真、現在地、公園の範囲をサーバーに送ります。公園の範囲を調べるため、現在地は地図サービスにも送ります。",
      "・ルールを翻訳するため、表示中のルールと言語をサーバーに送ります。",
    ].join("\n"),

    accountSection: "アカウントとデータ",
    clearLocal: "端末の記録を消す",
    clearLocalTitle: "端末の記録を消しますか？",
    clearLocalMessage:
      "この端末に保存されている、訪れた公園、公園内で歩いた道、カメラに映ったもの、ルールの通知履歴を消します（日記は空になります）。コレクションは消えません。",
    clearLocalConfirm: "消す",
    clearLocalDone: "端末の記録を消しました",
    clearLocalFailed: "消せませんでした",
    deleteAccount: "アカウントを削除する",
    deleteTitle: "アカウントを削除しますか？",
    deleteMessage:
      "コレクション、報告、ルール確認への回答をサーバーから削除し、この端末の記録も消します。元には戻せません。\n\nあなたが登録した公園とルールは、あなたとは結びつかない形で残ります。",
    deleteConfirm: "削除する",
    deleteDoneTitle: "アカウントを削除しました",
    deleteDoneMessage:
      "コレクションなどのデータを削除しました。次にアプリを開くと、新しいアカウントで始まります。",
    deleteFailed: "削除できませんでした",
    deleteNote:
      "削除するとコレクションなどのデータがサーバーから消え、次は新しいアカウントで始まります。",

    version: (version: string) => `rulead バージョン ${version}`,
    debugUnlocked: "開発者向けの項目を表示しました",
  },

  diary: {
    androidOnly: "公園日記は Android 版でのみ使えます",
    loadFailed: "日記を読み込めませんでした",
    invalidDate: "日付が正しくありません",
    emptyTitle: "まだ日記がありません",
    emptyText: `「${tabs.rules}」タブで「外出する」を押してから公園に行くと、歩いた道やカメラに映ったものがここに記録されます。`,
    previous: "前の日記",
    next: "次の日記",
    openCalendar: "カレンダーを開く",
    dayLabel: (year: number, month: number, day: number, weekday: number) =>
      `${year}/${month}/${day}（${WEEKDAYS[weekday] ?? ""}）`,
    parkOfDay: (position: number, count: number) =>
      `この日の公園 ${position} / ${count}`,
    recordOf: (position: number, count: number) =>
      `${position} / ${count} 件目の記録`,
    visitedAt: (time: string) => `${time} に訪問`,
    stay: (duration: string, stayCount: number) =>
      `（滞在 ${duration}${stayCount > 1 ? `・${stayCount}回` : ""}）`,
    durationUnderMinute: "1分未満",
    duration: (hours: number, minutes: number) =>
      hours === 0
        ? `${minutes}分`
        : minutes === 0
          ? `${hours}時間`
          : `${hours}時間${minutes}分`,
    expandMap: "地図を大きく表示",
    noMapData: "地図のデータがありません",
    legendPark: "公園の範囲",
    legendTrack: "歩いた道",
    seenTitle: "よく見かけたもの",
    seenNone: "カメラに映ったものはありません",
    times: (count: number) => `${count}回`,
    photosTitle: "ここで撮った写真",
    photosUnavailable: "このバージョンのアプリは写真の表示に対応していません",
    photosExplain:
      "公園にいた時間帯に撮った写真を、端末内で探して表示します。写真がアプリの外に送られることはありません。",
    photosAllow: "写真へのアクセスを許可",
    photosAllowInSettings: "設定で写真へのアクセスを許可",
    photosNoStay: "滞在時間の記録がないため、写真を探せません",
    photosLoadFailed: "写真を読み込めませんでした",
    photosLimited: "アクセスを許可した写真だけを表示しています",
    photosReselect: "写真を選び直す",
    photosNone: "この公園で撮った写真はありません",
    photoTakenAt: (time: string) => `${time} に撮影`,
  },

  calendar: {
    title: "公園カレンダー",
    previousMonth: "前の月",
    nextMonth: "次の月",
    monthTitle: (year: number, month: number) => `${year}年${month}月`,
    weekdays: WEEKDAYS,
    day: (month: number, day: number) => `${month}月${day}日`,
    dayWithParks: (month: number, day: number, parkCount: number) =>
      `${month}月${day}日 ${parkCount}か所の公園`,
    noRecords: "この月の記録はありません",
    summary: (dayCount: number, parkCount: number) =>
      `${dayCount}日・${parkCount}か所の公園を訪れました`,
    enteredAt: (time: string) => `${time}〜`,
  },

  native: {
    park: "公園",
    channelTracking: "位置情報の記録",
    channelEnter: "公園に入ったとき",
    channelWatch: "カメラでの見守り",
    channelAlert: "ルールに関わるものが映ったとき",
    trackingTitle: "近くの公園をチェック中",
    trackingText: "公園に入ると通知します",
    outingEndedTitle: "おかえりなさい",
    outingEndedText: "出発地点の近くに戻ったので、外出を終えました",
    enteredTitle: "{park}に入りました",
    enteredMore: "タップしてほかのルールも確認",
    enteredNoRule: "タップしてルールを確認",
    watchingTitle: "{park}でカメラ見守り中",
    watchingText: "画像は端末内で処理し、保存・送信しません",
    watchIdleTitle: "外出中",
    watchIdleText: "ルールが登録された公園に入ると、カメラでの見守りを始めます",
    watchStop: "停止",
    endOuting: "外出を終える",
    alertTitle: "{park}のルールに注意",
    alertSeen: "「{label}」が映りました",
    alertSeenTap: "「{label}」が映りました（タップで詳細）",
  },
};

export type Messages = typeof ja;

export default ja;
