import type { Messages, Week } from "./ja";

const WEEKDAYS: Week = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const monthName = (month: number) => MONTHS[month - 1] ?? String(month);

const plural = (count: number, one: string, other: string) =>
  count === 1 ? one : other;

const tabs = {
  rules: "Rules",
  diary: "Diary",
  scan: "Scan",
  collection: "Collection",
  you: "You",
};

const en: Messages = {
  common: {
    ok: "OK",
    cancel: "Cancel",
    close: "Close",
    reload: "Reload",
    loading: "Loading…",
    processing: "Working…",
    openSettings: "Open settings",
    errorTitle: "Error",
    park: "Park",
    unnamedPark: "Unnamed park",
    tryAgainOnline: "Please try again where you have a connection.",
    locationNotAllowed: "Location access is not allowed.",
  },

  tabs,

  notFound: {
    title: "Oops!",
    message: "This screen doesn't exist.",
    goHome: "Go to home screen!",
  },

  errors: {
    network:
      "Couldn't connect to the server. Please try again where you have a connection.",
    server: "Something went wrong on the server. Please try again later.",
    rateLimited:
      "You've reached today's usage limit. Please try again tomorrow.",
    blocked: "This account has been suspended.",
    notASign:
      "This doesn't look like a rule sign. Retake the photo with the sign inside the frame.",
    requestFailed: "Something went wrong.",
  },

  rulesTab: {
    androidOnly:
      "Outings and park rules are currently available on Android only.",
    readyTitle: "Ready to go out",
    readyDescription:
      "Tap \"Go out\" and we'll show you a park's rules when you enter it.\nIn parks with registered rules, what the camera sees is checked on this device, and you'll be notified when something related to a rule appears.",
    outingTitle: "On an outing",
    outingDescription:
      "When you enter a park with registered rules, its rules will appear here and the camera watch will start.\nYour outing ends automatically when you return near where you started.",
    startOuting: "Go out",
    endOuting: "End outing",
    searchNearby: "Find nearby parks by rule",
    searchWithTheseRules: "Find nearby parks with these rules",
    showCurrentPark: (parkName: string) =>
      `Show rules of the park you're in (${parkName})`,
    loadingRules: "Loading rules…",
    noRules: "No rules have been registered for this park yet",
    parkNotSaved:
      "This park's information isn't on this device yet.\nIt's downloaded automatically when you're near the park during an outing.",
    parkLoadFailed: "Couldn't load the park's information.",
    watchOff: `The camera watch is turned off (you can change this in the "${tabs.you}" tab).`,
    watching:
      "The camera is watching for the rules. When something related to a rule appears, the rule turns red and you'll get a notification. Images are never saved or sent.",
    watchStopped: "The camera watch has stopped.",
    resumeWatch: "Resume camera watch",
    startOutingFailed: "Couldn't start the outing",
    endOutingFailed: "Couldn't end the outing",
    startWatchFailed: "Couldn't start the camera watch",
    locationNotAllowed: "Location access is not allowed.",
    cameraNotAllowed: "Camera access is not allowed.",
    cameraPermissionTitle: "Camera access needed",
    cameraPermissionMessage:
      "The camera is used to check what it sees on this device. Images are never saved or sent.",
    errorNotTracking: "You're not on an outing.",
    errorNotStarted:
      "Couldn't start. Please check the app's permissions and make sure no other app is using the camera.",
  },

  parkRules: {
    noRules: "No rules",
    reportPark: "Report park",
    reportRule: "Report",
    reportRuleLabel: "Report this rule",
    translationFailed:
      "Couldn't translate, so the rules are shown in the original (English)",
    keywords: (list: string) => `Keyword: ${list}`,
    disclaimer:
      "* These are only some of the rules, registered from signs and other sources. Something not listed here isn't necessarily allowed. Always follow the signs on site and the park staff, and be considerate of the people around you.",
  },

  ruleSearch: {
    title: "Find nearby parks by rule",
    back: "‹ Choose another rule",
    loading: "Loading nearby parks…",
    loadFailed:
      "Couldn't load nearby parks. Please try again where you have a connection.",
    filterPlaceholder: "Filter rules (e.g. dog, ball)",
    noParksNearby:
      "There are no parks with registered rules nearby (about 1 km).",
    noMatch: "No matches",
    ruleSummary: (isShownPark: boolean, parkCount: number) =>
      `${isShownPark ? "Rule of the park shown · " : ""}At ${parkCount} ${plural(parkCount, "park", "parks")} nearby`,
    parksWithRule: (count: number) => `Parks with this rule (${count})`,
    parksWithoutRule: (count: number) =>
      `Parks without this rule registered (${count})`,
    withoutCaution:
      "Some of these parks may actually have this rule even though it isn't registered. Check the signs on site before you go.",
    none: "None",
    parkSummary: (distance: string, ruleCount: number) =>
      `${distance} · ${ruleCount} registered ${plural(ruleCount, "rule", "rules")}`,
    map: "Map",
    distanceHere: "You're here",
    distanceAbout: (distance: string) => `About ${distance}`,
  },

  report: {
    ruleTitle: "Report this rule",
    ruleMessage: (ruleText: string) => `"${ruleText}"\n\nWhat's wrong with it?`,
    ruleNotHere: "Not at this park",
    ruleInappropriate: "Wrong or inappropriate",
    parkTitle: "Report this park",
    parkMessage: (parkName: string) =>
      `"${parkName}"\n\nIs the park's name or location wrong?`,
    parkWrong: "Wrong name or location",
    sent: "Report sent",
    failed: "Couldn't send the report",
    thanks: "Thank you for your help.",
    thanksRule:
      "Thank you for your help. When several people report the same thing, this rule will no longer be shown for this park (it may take up to a day).",
  },

  outing: {
    preciseLocationTitle: "Precise location needed",
    preciseLocationMessage:
      'It\'s used to detect when you enter a park. Please set location to "Precise" in Settings.',
    startedTitle: "Your outing has started",
    cameraStartFailed:
      "The camera couldn't be started, so you're going out without the camera watch. It will retry when you reopen the app.",
    cameraNotAllowed:
      "Camera access isn't allowed, so you're going out without the camera watch.",
    notificationsNotAllowed:
      "Notifications aren't allowed, so you won't be notified about parks or rules.",
    backgroundNotAllowed:
      "Location isn't set to \"Allow all the time\", so if your phone stops recording, it won't resume until you open the app.",
  },

  tracker: {
    nativeMissing:
      "The ParkTracker native module wasn't found. Launch a development build (npx expo run:android) instead of Expo Go.",
    androidOnly: "ParkTracker is available on Android only.",
    backgroundTitle: 'Please set location to "Allow all the time"',
    backgroundMessage:
      "It's used to let you know when you enter a nearby park, even when the app is closed.",
    backgroundMessageNextScreen:
      ' On the next screen, choose "Allow all the time".',
    trackerNotStarted:
      "The location service didn't start. Please check the app's permissions.",
    watchNotStarted:
      "The camera watch didn't start. Please check the camera permission and make sure no other app is using the camera.",
    resetUnsupported: "This build doesn't support resetting park notifications",
  },

  scanCamera: {
    shutter: "Take photo",
    hint: "Get close so the sign fills the frame. For wide signs, you can turn your phone sideways",
  },

  scanMap: {
    locating: "Getting your location…",
    locationFailed: "Couldn't get your location.",
    searching: "Looking for the park…",
    lookupFailed: "Couldn't get the park's information",
    notFound: "No park was found at this location",
    readyToSubmit: "If this area looks right, confirm it",
    issues: {
      needPoints: "Tap the map to place points around the park",
      crossing: "The lines cross. Move or remove a point",
      tooSmall: "The area is too small",
      tooLarge: "The area is too large. Outline only the park",
      tooFar: "Outline an area near where you are",
    },
    namePlaceholder: "Park name (optional)",
    undo: "Undo",
    clearAll: "Clear all",
    retake: "Retake",
    decide: "Use this park",
    nearbyTitle: "Parks found nearby",
    nearbyHint: "Your location may be a little off. Choose the park you're in",
    drawOwn: "None of these (draw the area)",
    chooseNearby: "Choose a nearby park",
    chooseOther: "Choose a different park",
    guideTap: (n: number) =>
      `Tap the park's corners on the map (${n} more ${n === 1 ? "point" : "points"})`,
    editTip: "Tap a point to remove it. Long-press to move it",
  },

  scanConfirm: {
    reading: "Reading the sign…",
    noRules: "No rules were found",
    wrong: "✖ It's wrong",
    collect: "✔ Collect",
    submitting: "Saving…",
  },

  bonus: {
    badge: "Bonus!",
    verifyMessage: (parkName: string | null) =>
      `Others have found this rule at ${parkName ?? "this park"}.`,
    suggestMessage: "This rule has been found at another park nearby.",
    question: (parkName: string | null) =>
      `Have you seen this rule at ${parkName ?? "this park"}, where you are now?`,
    accept: "Collect it (I saw it)",
    reject: "I didn't see it",
  },

  collection: {
    signs: "Signs photographed",
    parks: "Parks visited",
    sortTitle: "Sort",
    sort: {
      recent: "Newest",
      oldest: "Oldest",
      rarest: "Rarest",
      commonest: "Most common",
      most: "Most collected",
      fewest: "Fewest collected",
    },
    share: (percent: string) => `${percent}% of all`,
    empty: "No collection yet.\nPhotograph signs and collect more rules!",
    loadFailed: "Couldn't load.\nReopen the tab to try again.",
  },

  you: {
    settings: "Settings",
    language: "Language",
    languageNote:
      "Changes the language of the app, park rules and notifications during outings. If the app isn't available in the language you choose, the app is shown in English and the rules in that language (rules in notifications change from the next time park information is downloaded).",
    cameraWatchSetting: "Camera watch during outings",
    cameraWatchNote:
      "When off, the camera isn't used in parks and you'll only be notified when you enter a park.",
    openNotificationSettings: "Open notification settings",
    cameraPermissionTitle: "Camera access needed",
    cameraPermissionMessage:
      "To use the camera watch during outings, please allow camera access. We'll also ask the next time you go out.",

    statusSection: "Outing and permissions",
    outing: "Outing",
    outingActive: "On an outing",
    outingPaused:
      "On an outing (recording has stopped; it resumes when you open the app)",
    outingInactive: "Not out",
    cameraWatch: "Camera watch",
    watchActive: (parkName: string) => `Watching (${parkName})`,
    watchWaiting: "Waiting (starts when you enter a park with rules)",
    watchStopped: "Stopped",
    location: "Location",
    locationStatus: {
      precise: "Allowed (precise)",
      approximate: "Approximate only",
      denied: "Not allowed",
      blocked: "Not allowed (change in Settings)",
    },
    backgroundLocation: "Background location",
    notifications: "Notifications",
    camera: "Camera",
    allowed: "Allowed",
    alwaysAllowed: "Allowed all the time",
    notAllowed: "Not allowed",
    openAppSettings: "Open app settings",
    batterySettings: "Battery optimization",
    batteryNote:
      "If recording often stops during outings, exclude rulead from battery optimization.",

    privacy: "Privacy",
    privacyText: [
      "• During outings, your location is not sent to the server. Only the center of a roughly 1 km square area is sent to get nearby parks, and which park you're in is determined on this device.",
      '• During outings, camera images are checked on this device only and are never saved or sent. Only the names of what was seen (such as "Dog") are recorded on this device for the diary.',
      "• When you register a sign, the photo of the sign, your location and the park's area are sent to the server (your location is also sent to a map service to find the park's area).",
      "• When you send a report, which rule at which park is sent to the server.",
      "• To translate the rules, the rules shown and your language are sent to the server.",
    ].join("\n"),

    accountSection: "Account and data",
    clearLocal: "Clear records on this device",
    clearLocalTitle: "Clear records on this device?",
    clearLocalMessage:
      "This clears the records saved on this device: parks visited, locations inside parks, what the camera saw and rule notifications (your diary will be empty). Your collection is kept.",
    clearLocalConfirm: "Clear",
    clearLocalDone: "Records on this device have been cleared",
    clearLocalFailed: "Couldn't clear",
    deleteAccount: "Delete account",
    deleteTitle: "Delete your account?",
    deleteMessage:
      "Your collection, reports and answers to rule checks will be deleted from the server, and the records on this device will be cleared. This can't be undone.\n\nParks and rules you registered will remain as shared data (not linked to you).",
    deleteConfirm: "Delete",
    deleteDoneTitle: "Your account has been deleted",
    deleteDoneMessage:
      "Your collection and other data have been deleted. Next time you use the app, you'll start with a new account.",
    deleteFailed: "Couldn't delete",
    deleteNote:
      "If you delete your account, your collection and other data are removed from the server, and you'll start with a new account next time.",

    version: (version: string) => `rulead version ${version}`,
    debugUnlocked: "Developer options are now shown",
  },

  diary: {
    androidOnly: "The park diary is available on Android only",
    loadFailed: "Couldn't load the diary",
    invalidDate: "Invalid date",
    emptyTitle: "No diary entries yet",
    emptyText: `Tap "Go out" in the "${tabs.rules}" tab and visit a park — the paths you walked and what the camera saw will be recorded here.`,
    previous: "Previous entry",
    next: "Next entry",
    openCalendar: "Open calendar",
    dayLabel: (year: number, month: number, day: number, weekday: number) =>
      `${WEEKDAYS[weekday] ?? ""}, ${month}/${day}/${year}`,
    parkOfDay: (position: number, count: number) =>
      `Park ${position} of ${count} this day`,
    recordOf: (position: number, count: number) =>
      `Entry ${position} of ${count}`,
    visitedAt: (time: string) => `Visited at ${time}`,
    stay: (duration: string, stayCount: number) =>
      ` (stayed ${duration}${stayCount > 1 ? `, ${stayCount} visits` : ""})`,
    durationUnderMinute: "under 1 min",
    duration: (hours: number, minutes: number) =>
      hours === 0
        ? `${minutes} min`
        : minutes === 0
          ? `${hours} h`
          : `${hours} h ${minutes} min`,
    expandMap: "Show larger map",
    noMapData: "No map data",
    legendPark: "Park area",
    legendTrack: "Your path",
    seenTitle: "Things seen most",
    seenNone: "The camera watch didn't find anything",
    times: (count: number) => `${count} ${plural(count, "time", "times")}`,
    photosTitle: "Photos taken here",
    photosUnavailable: "This version of the app can't show photos",
    photosExplain:
      "Photos taken while you were in the park are found and shown on this device only. Your photos are never sent outside the app.",
    photosAllow: "Allow access to photos",
    photosAllowInSettings: "Allow access to photos in Settings",
    photosNoStay: "There's no record of your stay, so photos can't be found",
    photosLoadFailed: "Couldn't load photos",
    photosLimited: "Showing only the photos you allowed access to",
    photosReselect: "Choose photos again",
    photosNone: "No photos were taken at this park",
    photoTakenAt: (time: string) => `Photo taken at ${time}`,
  },

  calendar: {
    title: "Park calendar",
    previousMonth: "Previous month",
    nextMonth: "Next month",
    monthTitle: (year: number, month: number) => `${monthName(month)} ${year}`,
    weekdays: WEEKDAYS,
    day: (month: number, day: number) => `${monthName(month)} ${day}`,
    dayWithParks: (month: number, day: number, parkCount: number) =>
      `${monthName(month)} ${day}, ${parkCount} ${plural(parkCount, "park", "parks")}`,
    noRecords: "No records this month",
    summary: (dayCount: number, parkCount: number) =>
      `Visited ${parkCount} ${plural(parkCount, "park", "parks")} on ${dayCount} ${plural(dayCount, "day", "days")}`,
    enteredAt: (time: string) => `from ${time}`,
  },

  native: {
    park: "the park",
    channelTracking: "Location recording",
    channelEnter: "When you enter a park",
    channelWatch: "Camera watch",
    channelAlert: "When something related to a rule is seen",
    trackingTitle: "Checking for nearby parks",
    trackingText: "You'll be notified when you enter a park",
    outingEndedTitle: "Welcome back",
    outingEndedText:
      "You're back near where you started, so your outing has ended",
    enteredTitle: "You entered {park}",
    enteredMore: "Tap to see the other rules",
    enteredNoRule: "Tap to see the rules",
    watchingTitle: "Watching the rules at {park}",
    watchingText: "Images are processed on this device and never saved or sent",
    watchIdleTitle: "On an outing",
    watchIdleText:
      "When you enter a park with registered rules, the camera will watch for them",
    watchStop: "Stop",
    endOuting: "End outing",
    alertTitle: "Mind the rules at {park}",
    alertSeen: '"{label}" was seen',
    alertSeenTap: '"{label}" was seen · Tap for details',
  },
};

export default en;
