const APP_VERSION = "2026.07.04.4";

const DEFAULT_SETTINGS = {
  baseDay: 1,
  windowMinutes: 30,
  passphraseHash: "",
};

const BUILT_IN_HOLIDAYS = {
  "2026-01-01": "새해",
  "2026-02-16": "설날 연휴",
  "2026-02-17": "설날",
  "2026-02-18": "설날 연휴",
  "2026-03-01": "삼일절",
  "2026-03-02": "대체공휴일",
  "2026-05-05": "어린이날",
  "2026-05-24": "부처님오신날",
  "2026-05-25": "대체공휴일",
  "2026-06-03": "전국동시지방선거",
  "2026-06-06": "현충일",
  "2026-08-15": "광복절",
  "2026-08-17": "대체공휴일",
  "2026-09-24": "추석 연휴",
  "2026-09-25": "추석",
  "2026-09-26": "추석 연휴",
  "2026-10-03": "개천절",
  "2026-10-05": "대체공휴일",
  "2026-10-09": "한글날",
  "2026-12-25": "기독탄신일",
  "2027-01-01": "새해",
  "2027-02-06": "설날 연휴",
  "2027-02-07": "설날",
  "2027-02-08": "설날 연휴",
  "2027-02-09": "대체공휴일",
  "2027-03-01": "삼일절",
  "2027-05-05": "어린이날",
  "2027-05-13": "부처님오신날",
  "2027-06-06": "현충일",
  "2027-06-07": "대체공휴일",
  "2027-08-15": "광복절",
  "2027-08-16": "대체공휴일",
  "2027-09-14": "추석 연휴",
  "2027-09-15": "추석",
  "2027-09-16": "추석 연휴",
  "2027-10-03": "개천절",
  "2027-10-04": "대체공휴일",
  "2027-10-09": "한글날",
  "2027-10-11": "대체공휴일",
  "2027-12-25": "기독탄신일",
  "2027-12-27": "대체공휴일",
  "2028-01-01": "새해",
  "2028-01-26": "설날 연휴",
  "2028-01-27": "설날",
  "2028-01-28": "설날 연휴",
  "2028-03-01": "삼일절",
  "2028-05-05": "어린이날ㆍ부처님오신날",
  "2028-06-06": "현충일",
  "2028-08-15": "광복절",
  "2028-10-02": "추석 연휴",
  "2028-10-03": "개천절ㆍ추석",
  "2028-10-04": "추석 연휴",
  "2028-10-09": "한글날",
  "2028-12-25": "기독탄신일",
};

const state = {
  settings: loadSettings(),
  customHolidays: loadCustomHolidays(),
  installPrompt: null,
};

const $ = (id) => document.getElementById(id);

function loadSettings() {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem("investmentBlockerSettings") || "{}") };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings() {
  localStorage.setItem("investmentBlockerSettings", JSON.stringify(state.settings));
}

function loadCustomHolidays() {
  try {
    return JSON.parse(localStorage.getItem("investmentBlockerCustomHolidays") || "{}");
  } catch {
    return {};
  }
}

function saveCustomHolidays() {
  localStorage.setItem("investmentBlockerCustomHolidays", JSON.stringify(state.customHolidays));
}

function ymd(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatKoreanDate(date) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(date);
}

function isWeekend(date) {
  return date.getDay() === 0 || date.getDay() === 6;
}

function holidayName(date) {
  const key = ymd(date);
  return state.customHolidays[key] || BUILT_IN_HOLIDAYS[key] || "";
}

function isHoliday(date) {
  return Boolean(holidayName(date));
}

function isBusinessDay(date) {
  return !isWeekend(date) && !isHoliday(date);
}

function getAllowedDate(year, monthIndex) {
  const baseDay = Math.max(1, Math.min(28, Number(state.settings.baseDay) || 1));
  const cursor = new Date(year, monthIndex, baseDay);
  const reasons = [];

  while (!isBusinessDay(cursor)) {
    if (isWeekend(cursor)) reasons.push(`${ymd(cursor)} 주말`);
    const holiday = holidayName(cursor);
    if (holiday) reasons.push(`${ymd(cursor)} ${holiday}`);
    cursor.setDate(cursor.getDate() + 1);
  }

  return {
    date: cursor,
    shifted: cursor.getDate() !== baseDay,
    reason: reasons.length ? `${reasons.join(", ")} 때문에 다음 평일로 이동` : "기준일이 평일이라 그대로 허용",
  };
}

function isSameDate(a, b) {
  return ymd(a) === ymd(b);
}

async function sha256(text) {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function getUnlockUntilKey() {
  return `investmentUnlockUntil:${ymd(new Date())}`;
}

function getUnlockUntil() {
  return Number(localStorage.getItem(getUnlockUntilKey()) || "0");
}

function setUnlockUntil(minutes) {
  localStorage.setItem(getUnlockUntilKey(), String(Date.now() + minutes * 60 * 1000));
}

function resetToday() {
  localStorage.removeItem(getUnlockUntilKey());
}

function render() {
  const today = new Date();
  const allowed = getAllowedDate(today.getFullYear(), today.getMonth());
  const allowedToday = isSameDate(today, allowed.date);
  const unlocked = getUnlockUntil() > Date.now();
  const remainingMs = Math.max(0, getUnlockUntil() - Date.now());

  $("allowed-date").textContent = formatKoreanDate(allowed.date);
  $("allowed-reason").textContent = allowed.reason;
  $("today-card").classList.toggle("allowed", allowedToday);
  $("today-card").classList.toggle("blocked", !allowedToday);

  if (allowedToday && unlocked) {
    $("status-pill").textContent = `${state.settings.windowMinutes}분 확인 허용 중`;
    $("today-status").textContent = "열 수 있음";
    $("today-message").textContent = `${Math.ceil(remainingMs / 60000)}분 뒤 자동으로 다시 잠김`;
    $("rule-text").textContent = "오늘은 월 1회 허용일이고, 해제 절차가 완료되었습니다. 매매 전 리밸런싱 계획만 확인하세요.";
    $("unlock-button").disabled = true;
  } else if (allowedToday) {
    $("status-pill").textContent = "오늘만 허용일";
    $("today-status").textContent = "절차 필요";
    $("today-message").textContent = `집에 보관한 문장 입력 후 ${state.settings.windowMinutes}분만 확인`;
    $("rule-text").textContent = `오늘은 허용일입니다. 그래도 바로 열지 말고, 집에 보관한 문장으로 한 번 더 멈춘 뒤 ${state.settings.windowMinutes}분만 확인하세요.`;
    $("unlock-button").disabled = false;
  } else {
    $("status-pill").textContent = "차단일";
    $("today-status").textContent = "열지 않음";
    $("today-message").textContent = `다음 허용일: ${formatKoreanDate(allowed.date)}`;
    $("rule-text").textContent = "오늘은 투자앱을 열지 않는 날입니다. 판단은 다음 허용일 하루로 미룹니다.";
    $("unlock-button").disabled = true;
    $("unlock-box").hidden = true;
  }

  renderMonths(today);
  renderSettings();
  renderCustomHolidays();
}

function renderMonths(today) {
  const list = $("month-list");
  list.innerHTML = "";
  for (let i = 0; i < 6; i += 1) {
    const month = new Date(today.getFullYear(), today.getMonth() + i, 1);
    const allowed = getAllowedDate(month.getFullYear(), month.getMonth());
    const item = document.createElement("div");
    item.className = "month-item";
    item.innerHTML = `
      <div>
        <strong>${month.getFullYear()}년 ${month.getMonth() + 1}월</strong>
        <span>${allowed.reason}</span>
      </div>
      <strong>${allowed.date.getMonth() + 1}/${allowed.date.getDate()}</strong>
    `;
    list.appendChild(item);
  }
}

function renderSettings() {
  $("base-day-input").value = state.settings.baseDay;
  $("window-minutes-input").value = state.settings.windowMinutes;
  $("confirm-button").textContent = `${state.settings.windowMinutes}분 확인 허용`;
}

function renderCustomHolidays() {
  const list = $("custom-holiday-list");
  const entries = Object.entries(state.customHolidays).sort(([a], [b]) => a.localeCompare(b));
  list.innerHTML = entries.length ? "" : "<p class=\"setting-note\">추가한 휴일이 없습니다.</p>";

  entries.forEach(([date, name]) => {
    const item = document.createElement("div");
    item.className = "holiday-item";
    item.innerHTML = `<div><strong>${date}</strong><span>${name}</span></div>`;
    const button = document.createElement("button");
    button.className = "ghost-button";
    button.type = "button";
    button.textContent = "삭제";
    button.addEventListener("click", () => {
      delete state.customHolidays[date];
      saveCustomHolidays();
      render();
    });
    item.appendChild(button);
    list.appendChild(item);
  });
}

function bindEvents() {
  $("unlock-button").addEventListener("click", () => {
    $("unlock-box").hidden = false;
    $("passphrase-input").focus();
  });

  $("confirm-button").addEventListener("click", async () => {
    const phrase = $("passphrase-input").value.trim();
    const feedback = $("unlock-feedback");

    if (!state.settings.passphraseHash) {
      feedback.textContent = "먼저 차단 설정에서 집에 보관할 해제 문장을 저장하세요.";
      return;
    }

    if (!phrase) {
      feedback.textContent = "해제 문장을 입력하세요.";
      return;
    }

    const hash = await sha256(phrase);
    if (hash !== state.settings.passphraseHash) {
      feedback.textContent = "문장이 다릅니다. 오늘 바로 열 필요가 있는지 다시 생각하세요.";
      return;
    }

    setUnlockUntil(Number(state.settings.windowMinutes) || 30);
    $("passphrase-input").value = "";
    feedback.textContent = "확인 시간이 열렸습니다. 끝나면 다시 잠깁니다.";
    render();
  });

  $("install-button").addEventListener("click", async () => {
    if (!state.installPrompt) {
      $("install-help").textContent = "Chrome 오른쪽 위 ⋮ 메뉴에서 '앱 설치' 또는 '홈 화면에 추가'를 누르세요.";
      return;
    }

    state.installPrompt.prompt();
    const result = await state.installPrompt.userChoice;
    state.installPrompt = null;
    $("install-help").textContent =
      result.outcome === "accepted" ? "설치가 시작되었습니다." : "설치를 취소했습니다. 필요하면 다시 메뉴에서 설치하세요.";
  });

  $("reset-button").addEventListener("click", () => {
    resetToday();
    render();
  });

  $("save-settings").addEventListener("click", async () => {
    state.settings.baseDay = Math.max(1, Math.min(28, Number($("base-day-input").value) || 1));
    state.settings.windowMinutes = Number($("window-minutes-input").value) || 30;
    const phrase = $("passphrase-setting").value.trim();
    if (phrase) {
      state.settings.passphraseHash = await sha256(phrase);
      $("passphrase-setting").value = "";
    }
    saveSettings();
    render();
  });

  $("add-holiday").addEventListener("click", () => {
    const date = $("holiday-date-input").value;
    const name = $("holiday-name-input").value.trim() || "추가 휴일";
    if (!date) return;
    state.customHolidays[date] = name;
    $("holiday-date-input").value = "";
    $("holiday-name-input").value = "";
    saveCustomHolidays();
    render();
  });
}

function setupInstallPrompt() {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    state.installPrompt = event;
    $("install-help").textContent = "설치 준비 완료. 버튼을 누르면 홈 화면에 추가됩니다.";
  });

  window.addEventListener("appinstalled", () => {
    state.installPrompt = null;
    $("install-help").textContent = "설치 완료. 다음 실행부터 자동 업데이트를 확인합니다.";
  });
}

function setupServiceWorkerAutoUpdate() {
  if (!("serviceWorker" in navigator)) return;

  let refreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register("./service-worker.js");

      if (registration.waiting) {
        registration.waiting.postMessage({ type: "SKIP_WAITING" });
      }

      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;
        if (!worker) return;

        worker.addEventListener("statechange", () => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) {
            worker.postMessage({ type: "SKIP_WAITING" });
          }
        });
      });

      await registration.update();
    } catch {
      // The app still works without service worker updates.
    }
  });
}

setupServiceWorkerAutoUpdate();
setupInstallPrompt();

bindEvents();
render();
setInterval(render, 30000);
