import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  onAuthStateChanged,
  signOut,
} from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js';
import {
  getDatabase,
  ref,
  set,
  push,
  update,
  get,
  onValue,
  onChildAdded,
  onDisconnect,
  increment,
  remove,
} from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js';
import {
  getMessaging,
  getToken,
  onMessage,
} from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-messaging.js';

const firebaseConfig = {
  apiKey: 'AIzaSyD9vL8NaVCfEa9uTs45MmyT4ruw_YvknXA',
  authDomain: 'hummus-pasta.firebaseapp.com',
  databaseURL: 'https://hummus-pasta-default-rtdb.firebaseio.com',
  projectId: 'hummus-pasta',
  storageBucket: 'hummus-pasta.firebasestorage.app',
  messagingSenderId: '348557255133',
  appId: '1:348557255133:web:524bf31a2fc6cea2329634',
};

const VAPID_KEY =
  'BGkDNdGkNT7-AYbxGXAKqPObHl-vl9Y0n-MZXnnbQQRtcgS1XGXKIa5uo-W_s8a3F5WpF9Rk5Heg4PjRd5GGt3o';
const PUSH_SERVER_URL = 'https://hummus-server.onrender.com/send-push';
const TELEGRAM_BOT_USERNAME = 'hummus_ping_bot';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

let messaging = null;
try {
  messaging = getMessaging(app);
} catch {}

// אפשרויות עיצוב אווטר
const AVATAR_BASES = ['🦐', '🐱', '🐸', '🧸', '🐰', '🦊', '👽', '🤖', '🦄', '🐵'];
const AVATAR_COLORS = [
  '#FFE5EC',
  '#DCFCE7',
  '#E0F2FE',
  '#FEF3C7',
  '#F3E8FF',
  '#FFE4E6',
  '#1E293B',
];
const AVATAR_ACCS = ['', '👑', '😎', '🎀', '🎧', '🔥', '🌸', '✨'];

const DEFAULT_AVATAR = { base: '🦐', bg: '#FFE5EC', acc: '' };
let draftAvatar = { ...DEFAULT_AVATAR };

function renderAvatarHtml(av, sizeClass = 'sm') {
  const safe = { ...DEFAULT_AVATAR, ...(av || {}) };
  return `
    <span class="avatar-circle ${sizeClass}" style="background:${safe.bg}">
      <span class="av-base">${safe.base}</span>
      ${safe.acc ? `<span class="av-acc">${safe.acc}</span>` : ''}
    </span>`;
}

function updateAvatarPreview() {
  const prev = document.getElementById('avatar-preview');
  if (!prev) return;
  prev.style.background = draftAvatar.bg;
  prev.innerHTML = `
    <span class="av-base">${draftAvatar.base}</span>
    ${draftAvatar.acc ? `<span class="av-acc">${draftAvatar.acc}</span>` : ''}
  `;
  document
    .querySelectorAll('#av-bases .av-opt')
    .forEach((b) => b.classList.toggle('selected', b.dataset.val === draftAvatar.base));
  document
    .querySelectorAll('#av-colors .av-color-opt')
    .forEach((b) => b.classList.toggle('selected', b.dataset.val === draftAvatar.bg));
  document
    .querySelectorAll('#av-accs .av-opt')
    .forEach((b) => b.classList.toggle('selected', b.dataset.val === draftAvatar.acc));
}

function initAvatarStudio() {
  const basesEl = document.getElementById('av-bases');
  const colorsEl = document.getElementById('av-colors');
  const accsEl = document.getElementById('av-accs');
  if (!basesEl || !colorsEl || !accsEl) return;

  basesEl.innerHTML = AVATAR_BASES.map(
    (b) => `<button type="button" class="av-opt" data-val="${b}">${b}</button>`
  ).join('');
  colorsEl.innerHTML = AVATAR_COLORS.map(
    (c) =>
      `<button type="button" class="av-color-opt" data-val="${c}" style="background:${c}"></button>`
  ).join('');
  accsEl.innerHTML = AVATAR_ACCS.map(
    (a) =>
      `<button type="button" class="av-opt" data-val="${a}">${a || 'ללא'}</button>`
  ).join('');

  basesEl.querySelectorAll('.av-opt').forEach((btn) => {
    btn.addEventListener('click', () => {
      draftAvatar.base = btn.dataset.val;
      updateAvatarPreview();
    });
  });

  colorsEl.querySelectorAll('.av-color-opt').forEach((btn) => {
    btn.addEventListener('click', () => {
      draftAvatar.bg = btn.dataset.val;
      updateAvatarPreview();
    });
  });

  accsEl.querySelectorAll('.av-opt').forEach((btn) => {
    btn.addEventListener('click', () => {
      draftAvatar.acc = btn.dataset.val;
      updateAvatarPreview();
    });
  });

  updateAvatarPreview();
}
initAvatarStudio();

// מעבר בין מסכים
const tabButtons = document.querySelectorAll('.tab-btn');
const pageViews = document.querySelectorAll('.page-view');

function switchTab(tabName) {
  tabButtons.forEach((b) =>
    b.classList.toggle('active', b.dataset.tab === tabName)
  );
  pageViews.forEach((v) =>
    v.classList.toggle('active', v.id === `tab-${tabName}`)
  );
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

tabButtons.forEach((btn) => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

// רקע חי + לבבות במצב מלבלב
const canvas = document.getElementById('bg-canvas');
const ctx = canvas.getContext('2d');
let w = (canvas.width = window.innerWidth);
let h = (canvas.height = window.innerHeight);
window.addEventListener('resize', () => {
  w = canvas.width = window.innerWidth;
  h = canvas.height = window.innerHeight;
});

const orbs = Array.from({ length: 14 }, () => ({
  x: Math.random() * w,
  y: Math.random() * h,
  r: 6 + Math.random() * 12,
  vx: (Math.random() - 0.5) * 0.5,
  vy: (Math.random() - 0.5) * 0.5,
}));

const hearts = Array.from({ length: 24 }, () => ({
  x: Math.random() * w,
  y: Math.random() * h,
  size: 16 + Math.random() * 14,
  vy: 0.8 + Math.random() * 1.2,
  sway: Math.random() * Math.PI * 2,
  emoji: ['💖', '💗', '💕', '🌸'][Math.floor(Math.random() * 4)],
}));

(function loop() {
  ctx.clearRect(0, 0, w, h);
  const isBlossom = document.body.classList.contains('blossom');

  if (isBlossom) {
    hearts.forEach((hr) => {
      hr.y -= hr.vy;
      hr.sway += 0.03;
      hr.x += Math.sin(hr.sway) * 0.65;
      if (hr.y < -30) {
        hr.y = h + 20;
        hr.x = Math.random() * w;
      }
      ctx.font = `${hr.size}px serif`;
      ctx.fillText(hr.emoji, hr.x, hr.y);
    });
  } else {
    orbs.forEach((o) => {
      o.x = (o.x + o.vx + w) % w;
      o.y = (o.y + o.vy + h) % h;
      ctx.beginPath();
      ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(180, 131, 82, 0.14)';
      ctx.fill();
    });
  }
  requestAnimationFrame(loop);
})();

function playPopSound() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ac = new AudioCtx();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(580, ac.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ac.currentTime + 0.14);
    gain.gain.setValueAtTime(0.08, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.18);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start();
    osc.stop(ac.currentTime + 0.19);
  } catch {}
}

// Service Worker + רישום FCM Token לשרת
let swRegistration = null;
if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('./sw.js')
    .then((reg) => {
      swRegistration = reg;
    })
    .catch(() => {});
}

async function registerPushToken() {
  if (!me || !messaging || !('Notification' in window)) return;
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return;

  try {
    const reg = swRegistration || (await navigator.serviceWorker.ready);
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: reg,
    });
    if (token) {
      await update(ref(db, `users/${me.uid}`), { fcmToken: token });
    }
  } catch {}
}

if (messaging) {
  onMessage(messaging, (payload) => {
    const title = payload?.notification?.title || 'חומוס על פסטה 🦐';
    const body = payload?.notification?.body || 'יש לך צפצוף חדש!';
    showLiveAlert(title, body);
  });
}

async function triggerPushServer({ targetUid, title, body }) {
  try {
    await fetch(PUSH_SERVER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUid, title, body }),
    });
  } catch {}
}

async function showDeviceNotification(title, body) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  if (swRegistration && swRegistration.showNotification) {
    await swRegistration.showNotification(title, {
      body,
      dir: 'rtl',
      lang: 'he',
      vibrate: [200, 100, 200],
    });
  }
}

document.getElementById('enable-notify-btn')?.addEventListener('click', async () => {
  if (!me) {
    showLiveAlert('התחברות נדרשת', 'קודם צריך להתחבר לחשבון באתר 😉');
    return;
  }

  window.open(
    `https://t.me/${TELEGRAM_BOT_USERNAME}?start=${me.uid}`,
    '_blank'
  );

  if ('Notification' in window) {
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      await registerPushToken();
    }
  }

  showLiveAlert(
    '📲 חיבור לטלגרם נפתח!',
    'לחצי Start בבוט בטלגרם כדי לחבר אוטומטית ולקבל צפצופים 🦐🔥'
  );
});

function getDayKey(offsetDays = 0) {
  const d = new Date(Date.now() + offsetDays * 86400000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

function formatLastSeen(ts) {
  if (!ts) return 'לא ידוע';
  const diffSec = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (diffSec < 60) return 'ממש עכשיו';
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `לפני ${mins} דק'`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `לפני ${hrs} שעות`;
  const days = Math.floor(hrs / 24);
  return `לפני ${days} ימים`;
}

// התחברות
const authModal = document.getElementById('auth-modal');
const authName = document.getElementById('auth-name');
const authEmail = document.getElementById('auth-email');
const authPass = document.getElementById('auth-pass');
const authError = document.getElementById('auth-error');
const userBadge = document.getElementById('active-user-badge');
const myScoreEl = document.getElementById('my-saved-score');
const myStreakEl = document.getElementById('my-streak-num');

let me = null;
let activeMatchId = null;
let myRole = null;
let connectedAt = Date.now();
let toastTimer = null;
let liveAlertTimer = null;
let cachedAllUsers = {};
let cachedOnlineUsers = {};

userBadge.addEventListener('click', () => {
  if (me) switchTab('avatar');
});

document.getElementById('save-avatar-btn')?.addEventListener('click', async () => {
  if (!me) return;
  try {
    await update(ref(db, `users/${me.uid}`), {
      avatar: { ...draftAvatar },
    });
    await update(ref(db, `online/${me.uid}`), {
      avatar: { ...draftAvatar },
    });
    const msg = document.getElementById('avatar-saved-msg');
    if (msg) {
      msg.textContent = 'האווטר נשמר ומוצג לכולן! ✨';
      setTimeout(() => (msg.textContent = ''), 3000);
    }
  } catch (err) {
    console.error(err);
  }
});

document.getElementById('auth-submit').addEventListener('click', async () => {
  const email = authEmail.value.trim();
  const pass = authPass.value.trim();
  const name = authName.value.trim() || email.split('@')[0];
  authError.textContent = '';

  if (!email || pass.length < 6) {
    authError.textContent = 'יש להזין מייל תקין וסיסמה של לפחות 6 תווים.';
    return;
  }

  try {
    await signInWithEmailAndPassword(auth, email, pass);
  } catch (loginErr) {
    if (loginErr.code === 'auth/user-not-found') {
      try {
        const cred = await createUserWithEmailAndPassword(auth, email, pass);
        await updateProfile(cred.user, { displayName: name });
        try {
          await set(ref(db, `users/${cred.user.uid}`), {
            uid: cred.user.uid,
            name,
            email,
            score: 0,
            streak: 1,
            lastStreakDay: getDayKey(0),
            lastSeen: Date.now(),
            avatar: { ...DEFAULT_AVATAR },
          });
        } catch (dbErr) {
          console.error(dbErr);
        }
      } catch (e2) {
        authError.textContent =
          e2.code === 'auth/email-already-in-use'
            ? 'המייל כבר רשום — בדקי שהסיסמה נכונה ✨'
            : 'שגיאה בהרשמה: ' + e2.message;
      }
    } else if (
      loginErr.code === 'auth/invalid-credential' ||
      loginErr.code === 'auth/wrong-password'
    ) {
      authError.textContent =
        'המייל קיים או שהפרטים לא תואמים — בדקי סיסמה בלי לפתוח חשבון חדש 😉';
    } else {
      authError.textContent = 'שגיאה בהתחברות: ' + loginErr.message;
    }
  }
});

document.getElementById('logout-btn').addEventListener('click', async () => {
  if (me) {
    try {
      await update(ref(db, `users/${me.uid}`), { lastSeen: Date.now() });
      await remove(ref(db, `online/${me.uid}`));
    } catch {}
  }
  await signOut(auth);
});

function addSavedPoints(pts) {
  if (!me) return;
  update(ref(db, `users/${me.uid}`), {
    score: increment(pts),
  }).catch((err) => console.error(err));
}

function showRequestPopup(reqData) {
  const toast = document.getElementById('request-toast');
  const txt = document.getElementById('request-toast-text');
  txt.textContent = `${reqData.by} שלחה: "${reqData.text}"`;
  toast.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add('hidden'), 7000);
}

function showLiveAlert(title, message) {
  const toast = document.getElementById('live-alert-toast');
  document.getElementById('live-alert-title').textContent = title;
  document.getElementById('live-alert-text').textContent = message;
  toast.classList.remove('hidden');
  playPopSound();
  clearTimeout(liveAlertTimer);
  liveAlertTimer = setTimeout(() => toast.classList.add('hidden'), 6500);
}

document.getElementById('close-live-alert').addEventListener('click', () => {
  document.getElementById('live-alert-toast').classList.add('hidden');
});

document.getElementById('close-request-toast').addEventListener('click', () => {
  document.getElementById('request-toast').classList.add('hidden');
});

document.getElementById('open-requests-tab').addEventListener('click', () => {
  document.getElementById('request-toast').classList.add('hidden');
  switchTab('requests');
});

async function sendBeep(targetUid, targetName) {
  if (!me || !targetUid) return;
  try {
    await push(ref(db, `pendingBeeps/${targetUid}`), {
      byUid: me.uid,
      byName: me.name,
      ts: Date.now(),
    });
    await push(ref(db, 'liveEvents'), {
      type: 'beep',
      targetUid,
      targetName,
      byUid: me.uid,
      byName: me.name,
      ts: Date.now(),
    });
    await triggerPushServer({
      targetUid,
      title: '📣 צפצוף מחומוס על פסטה!',
      body: `${me.name} מצפצפת לך להיכנס עכשיו! 🦐`,
    });
    showLiveAlert('📣 צפצפת!', `נשלח צפצוף ל-${targetName}`);
  } catch (err) {
    console.error(err);
  }
}

function renderPresenceList() {
  const listEl = document.getElementById('online-list');
  if (!me || !listEl) return;

  const combined = new Map();
  Object.entries(cachedAllUsers).forEach(([uid, u]) => {
    combined.set(uid, { uid, ...u });
  });
  Object.entries(cachedOnlineUsers).forEach(([uid, u]) => {
    const prev = combined.get(uid) || {};
    combined.set(uid, { ...prev, uid, ...u });
  });

  const allList = Array.from(combined.values()).sort((a, b) => {
    const aOn = Boolean(cachedOnlineUsers[a.uid]);
    const bOn = Boolean(cachedOnlineUsers[b.uid]);
    if (aOn !== bOn) return aOn ? -1 : 1;
    return (b.lastSeen || b.ts || 0) - (a.lastSeen || a.ts || 0);
  });

  if (allList.length === 0) {
    listEl.innerHTML = '<p>אין עדיין משתמשות רשומות</p>';
    return;
  }

  listEl.innerHTML = allList
    .map((u) => {
      const isMe = u.uid === me.uid;
      const isOnline = Boolean(cachedOnlineUsers[u.uid]);
      const streakBadge = u.streak > 1 ? ` · 🔥 ${u.streak}` : '';
      const statusText = isOnline
        ? 'מחוברת עכשיו'
        : `נראתה: ${formatLastSeen(u.lastSeen || u.ts)}`;

      return `
      <div class="online-row ${isOnline ? 'is-online' : 'is-offline'}">
        <div class="online-user-cell">
          ${renderAvatarHtml(u.avatar, 'md')}
          <div class="online-info">
            <span class="online-name">
              <span class="${isOnline ? 'dot-green' : 'dot-gray'}"></span>
              ${u.name || 'חברה'} ${isMe ? '(את)' : ''}${streakBadge}
            </span>
            <small class="last-seen-tag">${statusText}</small>
          </div>
        </div>
        ${
          !isMe
            ? `<div style="display:flex; gap:6px; flex-wrap:wrap;">
                <button class="glass-pill beep-btn" data-uid="${u.uid}" data-name="${u.name}" style="margin-top:0">צפצפי 📣</button>
                ${
                  isOnline
                    ? `<button class="solid-pill invite-btn" data-uid="${u.uid}" data-name="${u.name}" style="margin-top:0">דו-קרב ⚔️</button>`
                    : ''
                }
              </div>`
            : ''
        }
      </div>`;
    })
    .join('');

  listEl.querySelectorAll('.beep-btn').forEach((btn) => {
    btn.addEventListener('click', () =>
      sendBeep(btn.dataset.uid, btn.dataset.name)
    );
  });

  listEl.querySelectorAll('.invite-btn').forEach((btn) => {
    btn.addEventListener('click', () =>
      sendChallenge(btn.dataset.uid, btn.dataset.name)
    );
  });
}

// ==========================================
// טורניר איקס-עיגול נוק-אאוט לייב (משעמם בשיעור)
// ==========================================
const TTT_WIN_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

function checkTttWinner(board) {
  for (const [a, b, c] of TTT_WIN_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return null;
}

function buildRoundMatches(playersArr, roundNum) {
  const shuffled = [...playersArr].sort(() => Math.random() - 0.5);
  const matches = {};
  let idx = 0;
  for (let i = 0; i < shuffled.length; i += 2) {
    const p1 = shuffled[i];
    const p2 = shuffled[i + 1];
    const mId = `r${roundNum}_m${idx++}`;
    if (!p2) {
      matches[mId] = {
        id: mId,
        p1,
        p2: null,
        board: Array(9).fill(''),
        p1Moves: [],
        p2Moves: [],
        turn: 'p1',
        winnerUid: p1.uid,
        winnerName: p1.name,
        status: 'bye',
      };
    } else {
      matches[mId] = {
        id: mId,
        p1,
        p2,
        board: Array(9).fill(''),
        p1Moves: [],
        p2Moves: [],
        turn: 'p1',
        winnerUid: null,
        winnerName: null,
        status: 'playing',
      };
    }
  }
  return matches;
}

let cachedTttTourney = null;
let rewardedChampionKey = null;

function renderTttTournament() {
  const root = document.getElementById('ttt-tournament-root');
  if (!root || !me) return;

  const t = cachedTttTourney;

  if (!t || t.status === 'lobby') {
    const playersMap = t?.players || {};
    const playersList = Object.values(playersMap);
    const amIIn = Boolean(playersMap[me.uid]);

    root.innerHTML = `
      <p style="margin-bottom:10px; font-weight:700;">מי שבכיתה ומשעמם לה — נכנסת לכאן! כשכולן בפנים לוחצים על התחלת הסיבוב הראשון 👇</p>
      <div class="ttt-lobby-players">
        ${
          playersList.length === 0
            ? '<span style="color:var(--muted)">עדיין אף אחת לא נכנסה ללובי הטורניר...</span>'
            : playersList
                .map(
                  (p) =>
                    `<span class="ttt-player-chip">${renderAvatarHtml(
                      p.avatar,
                      'xs'
                    )} ${p.name}</span>`
                )
                .join('')
        }
      </div>
      <div class="hero-actions">
        ${
          amIIn
            ? `<button id="ttt-leave-btn" class="glass-pill">צאי מהלובי</button>`
            : `<button id="ttt-join-btn" class="solid-pill ping-btn">נכנסת לטורניר 🙋‍♀️</button>`
        }
        <button id="ttt-start-btn" class="solid-pill" ${
          playersList.length < 2 ? 'disabled style="opacity:0.45"' : ''
        }>התחילו סיבוב (${playersList.length} שחקניות) 🚀</button>
      </div>
    `;

    document.getElementById('ttt-join-btn')?.addEventListener('click', async () => {
      await set(ref(db, `tttTournament/players/${me.uid}`), {
        uid: me.uid,
        name: me.name,
        avatar: me.avatar || DEFAULT_AVATAR,
      });
      if (!t) {
        await update(ref(db, 'tttTournament'), { status: 'lobby' });
      }
    });

    document.getElementById('ttt-leave-btn')?.addEventListener('click', async () => {
      await remove(ref(db, `tttTournament/players/${me.uid}`));
    });

    document.getElementById('ttt-start-btn')?.addEventListener('click', async () => {
      if (playersList.length < 2) return;
      const matches = buildRoundMatches(playersList, 1);
      await set(ref(db, 'tttTournament'), {
        status: 'playing',
        round: 1,
        players: playersMap,
        matches,
        champion: null,
        tourneyId: Date.now(),
      });
    });
    return;
  }

  if (t.status === 'finished' && t.champion) {
    const champKey = `${t.tourneyId}_${t.champion.uid}`;
    if (t.champion.uid === me.uid && rewardedChampionKey !== champKey) {
      rewardedChampionKey = champKey;
      addSavedPoints(15);
    }

    root.innerHTML = `
      <div class="ttt-champ-box">
        <div style="font-size:2.6rem;">👑🏆👑</div>
        <h3 style="margin:6px 0;">אלופת השיעור: ${t.champion.name}!</h3>
        <p style="color:var(--muted); font-weight:700;">ניצחה את כל המנצחות וגרפה +15 נקודות לטבלת השיאים 🔥</p>
        <button id="ttt-reset-btn" class="solid-pill" style="margin-top:14px;">טורניר חדש 🔁</button>
      </div>
    `;

    document.getElementById('ttt-reset-btn')?.addEventListener('click', async () => {
      await set(ref(db, 'tttTournament'), { status: 'lobby', players: {} });
    });
    return;
  }

  const matchesList = Object.values(t.matches || {});
  const roundNum = t.round || 1;
  const myMatch = matchesList.find(
    (m) => m.p1?.uid === me.uid || m.p2?.uid === me.uid
  );
  const allDone = matchesList.length > 0 && matchesList.every((m) => m.status !== 'playing');

  let myArenaHtml = '';
  if (myMatch) {
    if (myMatch.status === 'bye') {
      myArenaHtml = `
        <div class="ttt-my-arena">
          <strong>🍀 קיבלת עלייה אוטומטית לשלב הבא!</strong>
          <p style="font-size:0.86rem; color:var(--muted); margin-top:4px;">מחכים ששאר המשחקים בסיבוב ${roundNum} יסתיימו...</p>
        </div>`;
    } else {
      const amIP1 = myMatch.p1.uid === me.uid;
      const myMark = amIP1 ? 'p1' : 'p2';
      const p1Emoji = myMatch.p1.avatar?.base || '❌';
      const p2Emoji = myMatch.p2.avatar?.base === p1Emoji ? '⭕' : (myMatch.p2.avatar?.base || '⭕');
      const board = Array.isArray(myMatch.board) ? myMatch.board : Array(9).fill('');
      const p1Moves = myMatch.p1Moves || [];
      const p2Moves = myMatch.p2Moves || [];
      const isMyTurn = myMatch.status === 'playing' && myMatch.turn === myMark;

      const fadingIndex =
        myMatch.status === 'playing'
          ? myMatch.turn === 'p1' && p1Moves.length >= 3
            ? p1Moves[0]
            : myMatch.turn === 'p2' && p2Moves.length >= 3
            ? p2Moves[0]
            : -1
          : -1;

      const bannerText =
        myMatch.status === 'done'
          ? `🏆 ${myMatch.winnerName} ניצחה ועלתה לשלב הבא!`
          : isMyTurn
          ? '🔥 תורך! שימי סימן בלוח'
          : `⏳ תור של ${amIP1 ? myMatch.p2.name : myMatch.p1.name}...`;

      myArenaHtml = `
        <div class="ttt-my-arena">
          <div class="ttt-vs-bar">
            <span>${p1Emoji} ${myMatch.p1.name}</span>
            <span class="vs-badge">VS</span>
            <span>${p2Emoji} ${myMatch.p2.name}</span>
          </div>
          <div class="ttt-turn-banner ${isMyTurn ? 'my-turn' : ''}">${bannerText}</div>
          <div class="ttt-board">
            ${board
              .map((cell, idx) => {
                const symbol = cell === 'p1' ? p1Emoji : cell === 'p2' ? p2Emoji : '';
                const isFading = idx === fadingIndex;
                const disabled = !isMyTurn || Boolean(cell);
                return `<button class="ttt-cell ${isFading ? 'fading' : ''}" data-idx="${idx}" ${
                  disabled ? 'disabled' : ''
                }>${symbol}</button>`;
              })
              .join('')}
          </div>
          <small style="color:var(--muted);">⚡ מצב אינסופי: לכל אחת יש עד 3 סימנים — הרביעי מעלים את הישן כדי שלא יהיה תיקו!</small>
        </div>
      `;
    }
  }

  const otherMatchesHtml = matchesList
    .map((m) => {
      if (m.status === 'bye') {
        return `<div class="ttt-match-card done"><b>🍀 ${m.p1.name}</b><small>עלתה אוטומטית לשלב הבא</small></div>`;
      }
      const statusLine =
        m.status === 'done'
          ? `✅ מנצחת: <b>${m.winnerName}</b>`
          : `⚔️ משחקות עכשיו...`;
      return `
        <div class="ttt-match-card ${m.status === 'done' ? 'done' : ''}">
          <div><b>${m.p1.name}</b> נגד <b>${m.p2.name}</b></div>
          <small>${statusLine}</small>
        </div>`;
    })
    .join('');

  root.innerHTML = `
    <div class="ttt-round-header">
      <div>
        <strong>סיבוב ${roundNum} בביצוע 🔥</strong>
        <span style="display:block; font-size:0.82rem; color:var(--muted);">
          ${allDone ? 'כל הלוחות סיימו! אפשר להמשיך לשלב המנצחות' : 'משחקות במקביל — כל מנצחת עולה אוטומטית'}
        </span>
      </div>
      <div class="hero-actions">
        ${
          allDone
            ? `<button id="ttt-next-round-btn" class="solid-pill ping-btn">לשלב הבא / הכרזת אלופה 🏆</button>`
            : ''
        }
        <button id="ttt-abort-btn" class="mini-btn">אפסי טורניר</button>
      </div>
    </div>
    ${myArenaHtml}
    <div>
      <strong style="font-size:0.9rem;">כל המשחקים בסיבוב ${roundNum}:</strong>
      <div class="ttt-matches-grid">${otherMatchesHtml}</div>
    </div>
  `;

  root.querySelectorAll('.ttt-cell').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!myMatch || myMatch.status !== 'playing') return;
      const idx = Number(btn.dataset.idx);
      const amIP1 = myMatch.p1.uid === me.uid;
      const myMark = amIP1 ? 'p1' : 'p2';
      if (myMatch.turn !== myMark) return;

      const board = Array.isArray(myMatch.board) ? [...myMatch.board] : Array(9).fill('');
      if (board[idx]) return;

      const movesKey = amIP1 ? 'p1Moves' : 'p2Moves';
      const moves = Array.isArray(myMatch[movesKey]) ? [...myMatch[movesKey]] : [];

      if (moves.length >= 3) {
        const oldestIdx = moves.shift();
        board[oldestIdx] = '';
      }
      moves.push(idx);
      board[idx] = myMark;

      const winMark = checkTttWinner(board);
      const updates = {
        board,
        [movesKey]: moves,
        turn: amIP1 ? 'p2' : 'p1',
      };

      if (winMark) {
        const winnerObj = winMark === 'p1' ? myMatch.p1 : myMatch.p2;
        updates.status = 'done';
        updates.winnerUid = winnerObj.uid;
        updates.winnerName = winnerObj.name;
      }

      await update(ref(db, `tttTournament/matches/${myMatch.id}`), updates);
    });
  });

  document.getElementById('ttt-next-round-btn')?.addEventListener('click', async () => {
    const winners = matchesList
      .map((m) => (m.winnerUid === m.p1?.uid ? m.p1 : m.p2))
      .filter(Boolean);

    if (winners.length <= 1) {
      await update(ref(db, 'tttTournament'), {
        status: 'finished',
        champion: winners[0] || null,
      });
    } else {
      const nextRound = roundNum + 1;
      const nextMatches = buildRoundMatches(winners, nextRound);
      await update(ref(db, 'tttTournament'), {
        round: nextRound,
        matches: nextMatches,
      });
    }
  });

  document.getElementById('ttt-abort-btn')?.addEventListener('click', async () => {
    await set(ref(db, 'tttTournament'), { status: 'lobby', players: {} });
  });
}

// מאזינים חיים אחרי התחברות
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    me = null;
    authModal.classList.remove('hidden');
    userBadge.textContent = 'לא מחוברת';
    return;
  }

  connectedAt = Date.now();
  const fallbackName =
    user.displayName || authName.value.trim() || user.email?.split('@')[0] || 'חברה';

  // מציגים מיד שהמשתמש מחובר וסוגרים את המודאל
  me = { uid: user.uid, name: fallbackName, email: user.email, avatar: { ...DEFAULT_AVATAR } };
  authModal.classList.add('hidden');
  userBadge.innerHTML = `${renderAvatarHtml(me.avatar, 'xs')} <span>${me.name}</span>`;

  let existing = null;
  try {
    const userRef = ref(db, `users/${user.uid}`);
    const userSnap = await get(userRef);
    existing = userSnap.val();
  } catch (err) {
    console.error(err);
  }

  const displayName = existing?.name || fallbackName;
  const myAv = { ...DEFAULT_AVATAR, ...(existing?.avatar || {}) };
  draftAvatar = { ...myAv };
  updateAvatarPreview();

  me = { uid: user.uid, name: displayName, email: user.email, avatar: myAv };
  userBadge.innerHTML = `${renderAvatarHtml(myAv, 'xs')} <span>${me.name}</span>`;

  const today = getDayKey(0);
  const yesterday = getDayKey(-1);
  let newStreak = 1;

  if (existing) {
    if (existing.lastStreakDay === today) {
      newStreak = existing.streak || 1;
    } else if (existing.lastStreakDay === yesterday) {
      newStreak = (existing.streak || 1) + 1;
    }
  }
  if (myStreakEl) myStreakEl.textContent = `🔥 ${newStreak}`;

  try {
    const userRef = ref(db, `users/${user.uid}`);
    if (existing) {
      await update(userRef, {
        uid: user.uid,
        name: displayName,
        streak: newStreak,
        lastStreakDay: today,
        lastSeen: Date.now(),
        avatar: myAv,
      });
    } else {
      await set(userRef, {
        uid: user.uid,
        name: displayName,
        email: user.email,
        score: 0,
        streak: 1,
        lastStreakDay: today,
        lastSeen: Date.now(),
        avatar: myAv,
      });
    }
  } catch (err) {
    console.error(err);
  }

  if ('Notification' in window && Notification.permission === 'granted') {
    await registerPushToken();
  }

  try {
    const pendingSnap = await get(ref(db, `pendingBeeps/${me.uid}`));
    const pendingVal = pendingSnap.val();
    if (pendingVal) {
      const beepList = Object.values(pendingVal);
      if (beepList.length > 0) {
        const lastBeep = beepList[beepList.length - 1];
        showLiveAlert(
          '📣 צפצופים בזמן שלא היית!',
          beepList.length === 1
            ? `${lastBeep.byName} צפצפה לך וקראה לך להיכנס 🦐`
            : `${beepList.length} צפצופים מחכים לך — האחרון מ-${lastBeep.byName} 🦐`
        );
        showDeviceNotification(
          '📣 צפצוף מחומוס על פסטה!',
          `${lastBeep.byName} צפצפה לך — היכנסי עכשיו!`
        );
      }
      await remove(ref(db, `pendingBeeps/${me.uid}`));
    }
  } catch (err) {
    console.error(err);
  }

  try {
    const myOnlineRef = ref(db, `online/${me.uid}`);
    await set(myOnlineRef, {
      uid: me.uid,
      name: me.name,
      avatar: myAv,
      ts: Date.now(),
    });
    onDisconnect(myOnlineRef).remove();
    onDisconnect(ref(db, `users/${me.uid}/lastSeen`)).set(Date.now());

    await push(ref(db, 'liveEvents'), {
      type: 'join',
      byUid: me.uid,
      byName: me.name,
      ts: Date.now(),
    });
  } catch (err) {
    console.error(err);
  }

  onValue(ref(db, 'tttTournament'), (snap) => {
    cachedTttTourney = snap.val();
    renderTttTournament();
  });

  onValue(ref(db, `users/${me.uid}`), (snap) => {
    const val = snap.val() || {};
    if (myScoreEl) myScoreEl.textContent = val.score || 0;
    if (myStreakEl) myStreakEl.textContent = `🔥 ${val.streak || 1}`;
    if (val.avatar && me) {
      me.avatar = val.avatar;
      userBadge.innerHTML = `${renderAvatarHtml(val.avatar, 'xs')} <span>${me.name}</span>`;
    }
  });

  onValue(ref(db, 'online'), (snap) => {
    cachedOnlineUsers = snap.val() || {};
    renderPresenceList();
  });

  const myInviteRef = ref(db, `invites/${me.uid}`);
  const inviteToast = document.getElementById('invite-toast');
  let lastNotifiedInviteId = null;

  onValue(myInviteRef, (snap) => {
    const inv = snap.val();
    if (!inv) {
      inviteToast.classList.add('hidden');
      return;
    }
    document.getElementById(
      'invite-text'
    ).textContent = `⚔️ ${inv.fromName} מזמינה אותך לדו-קרב!`;
    inviteToast.classList.remove('hidden');

    if (inv.matchId && inv.matchId !== lastNotifiedInviteId) {
      lastNotifiedInviteId = inv.matchId;
      showDeviceNotification(
        '⚔️ הזמנה לדו-קרב!',
        `${inv.fromName} מזמינה אותך לקרב בחומוס על פסטה!`
      );
    }

    document.getElementById('accept-invite').onclick = async () => {
      await remove(myInviteRef);
      await update(ref(db, `matches/${inv.matchId}`), {
        status: 'playing',
        p2Name: me.name,
      });
      switchTab('duel');
      joinMatch(inv.matchId, 'p2');
    };

    document.getElementById('decline-invite').onclick = async () => {
      await remove(myInviteRef);
    };
  });

  onValue(ref(db, 'users'), (snap) => {
    cachedAllUsers = snap.val() || {};
    renderPresenceList();

    const all = Object.values(cachedAllUsers).sort(
      (a, b) => (b.score || 0) - (a.score || 0)
    );
    const lb = document.getElementById('leaderboard');
    if (lb) {
      lb.innerHTML = all
        .slice(0, 10)
        .map(
          (u, idx) =>
            `<div class="lb-row">
              <span class="lb-user-cell">
                <b>${idx === 0 ? '👑' : `${idx + 1}.`}</b>
                ${renderAvatarHtml(u.avatar, 'sm')}
                <span>${u.name} <small>(🔥 ${u.streak || 1})</small></span>
              </span>
              <b>${u.score || 0}</b>
            </div>`
        )
        .join('');
    }
  });

  onValue(ref(db, 'chatWall'), (snap) => {
    const items = Object.values(snap.val() || {})
      .reverse()
      .slice(0, 25);
    const boardEl = document.getElementById('board-list');
    if (!boardEl) return;
    if (items.length === 0) {
      boardEl.innerHTML = '<p>עדיין אין יציאות בקיר — תהיי הראשונה!</p>';
      return;
    }
    boardEl.innerHTML = items
      .map(
        (it) =>
          `<div class="board-item"><span>${it.text}</span><b>${it.by}</b></div>`
      )
      .join('');
  });

  // משחק "מי זה?"
  onValue(ref(db, 'secrets'), (snap) => {
    const raw = snap.val() || {};
    const entries = Object.entries(raw)
      .map(([id, val]) => ({ id, ...val }))
      .sort((a, b) => (b.ts || 0) - (a.ts || 0));

    const secretsEl = document.getElementById('secrets-list');
    if (!secretsEl) return;
    if (entries.length === 0) {
      secretsEl.innerHTML = '<p>אין עדיין סודות — תזרקי עובדה שלא יודעים עלייך!</p>';
      return;
    }

    const memberNames = Array.from(
      new Set(
        Object.values(cachedAllUsers)
          .map((u) => u.name)
          .filter(Boolean)
      )
    );

    secretsEl.innerHTML = entries
      .map((s) => {
        const guesses = s.guesses || {};
        const myGuess = guesses[me.uid];
        const isAuthor = s.authorUid === me.uid;
        const guessCount = Object.keys(guesses).length;

        let actionHtml = '';
        if (s.revealed) {
          actionHtml = `<div class="secret-revealed">🎭 זו הייתה <b>${s.authorName}</b>! (${guessCount} ניחשו)</div>`;
        } else if (isAuthor) {
          actionHtml = `
            <div class="secret-meta">
              <span>הסוד שלך (${guessCount} ניחושים)</span>
              <button class="mini-btn reveal-secret" data-id="${s.id}">חשפי שזו אני 👀</button>
            </div>`;
        } else if (myGuess) {
          actionHtml = `<div class="secret-meta"><span>ניחשת: <b>${myGuess}</b> · מחכים לחשיפה ⏳</span></div>`;
        } else {
          const opts =
            memberNames.length > 0 ? memberNames : ['מירום', 'ריטה', 'אור', 'שרה'];
          actionHtml = `
            <div class="guess-row">
              ${opts
                .map(
                  (name) =>
                    `<button class="mini-btn guess-btn" data-id="${s.id}" data-guess="${name}">${name}</button>`
                )
                .join('')}
            </div>`;
        }

        return `
        <div class="secret-item">
          <p class="secret-text">"${s.text}"</p>
          ${actionHtml}
        </div>`;
      })
      .join('');

    secretsEl.querySelectorAll('.guess-btn').forEach((b) => {
      b.addEventListener('click', async () => {
        await update(ref(db, `secrets/${b.dataset.id}/guesses`), {
          [me.uid]: b.dataset.guess,
        });
        addSavedPoints(1);
      });
    });

    secretsEl.querySelectorAll('.reveal-secret').forEach((b) => {
      b.addEventListener('click', async () => {
        await update(ref(db, `secrets/${b.dataset.id}`), {
          revealed: true,
        });
      });
    });
  });

  onValue(ref(db, 'requests'), (snap) => {
    const raw = snap.val() || {};
    const entries = Object.entries(raw)
      .map(([id, val]) => ({ id, ...val }))
      .sort((a, b) => (b.ts || 0) - (a.ts || 0));

    const reqListEl = document.getElementById('requests-list');
    if (!reqListEl) return;
    if (entries.length === 0) {
      reqListEl.innerHTML = '<p>אין עדיין בקשות או שיפורים.</p>';
      return;
    }
    reqListEl.innerHTML = entries
      .map(
        (r) => `
        <div class="request-item ${r.done ? 'done' : ''}">
          <div>
            <b>${r.by}:</b> <span>${r.text}</span>
          </div>
          <div class="req-actions">
            <button class="mini-btn toggle-done" data-id="${
              r.id
            }" data-done="${Boolean(r.done)}">${
          r.done ? 'בוצע ✅' : 'טופל'
        }</button>
            <button class="mini-btn del-req" data-id="${r.id}">🗑️</button>
          </div>
        </div>`
      )
      .join('');

    reqListEl.querySelectorAll('.toggle-done').forEach((b) => {
      b.addEventListener('click', () => {
        update(ref(db, `requests/${b.dataset.id}`), {
          done: b.dataset.done !== 'true',
        });
      });
    });

    reqListEl.querySelectorAll('.del-req').forEach((b) => {
      b.addEventListener('click', () => {
        remove(ref(db, `requests/${b.dataset.id}`));
      });
    });
  });
});

onChildAdded(ref(db, 'liveEvents'), async (snap) => {
  const ev = snap.val();
  if (!ev || !me) return;
  if ((ev.ts || 0) <= connectedAt - 1000) return;

  if (ev.type === 'join' && ev.byUid !== me.uid) {
    showLiveAlert('🟢 חברה התחברה!', `${ev.byName} נכנסה עכשיו לאתר 🦐`);
    showDeviceNotification('חומוס על פסטה 🦐', `${ev.byName} נכנסה עכשיו לאתר!`);
  } else if (ev.type === 'ping') {
    showLiveAlert(
      '🚨 קריאה דחופה מהלובי!',
      `${ev.byName} קוראת לכולן להתחבררר עכשיו!! 🔥`
    );
    if (ev.byUid !== me.uid) {
      showDeviceNotification('🚨 קריאה דחופה!', `${ev.byName} קוראת לכולן להתחבר עכשיו!`);
    }
  } else if (ev.type === 'beep' && ev.targetUid === me.uid) {
    showLiveAlert(
      '📣 מישהי מצפצפת לך!',
      `${ev.byName} קוראת לך להיכנס עכשיו!! 🦐`
    );
    showDeviceNotification(
      '📣 צפצוף מחומוס על פסטה!',
      `${ev.byName} מצפצפת לך להיכנס עכשיו!`
    );
    await remove(ref(db, `pendingBeeps/${me.uid}`));
  }
});

document.getElementById('ping-all-btn')?.addEventListener('click', async () => {
  if (!me) return;
  await push(ref(db, 'liveEvents'), {
    type: 'ping',
    byUid: me.uid,
    byName: me.name,
    ts: Date.now(),
  });
});

onChildAdded(ref(db, 'requests'), (snap) => {
  const val = snap.val();
  if (!val) return;
  if ((val.ts || 0) > connectedAt - 1000) {
    showRequestPopup(val);
  }
});

document.getElementById('secret-send')?.addEventListener('click', async () => {
  const input = document.getElementById('secret-input');
  const txt = input.value.trim();
  if (!txt || !me) return;
  await push(ref(db, 'secrets'), {
    text: txt,
    authorUid: me.uid,
    authorName: me.name,
    revealed: false,
    ts: Date.now(),
  });
  addSavedPoints(2);
  input.value = '';
});

document.getElementById('request-send')?.addEventListener('click', async () => {
  const input = document.getElementById('request-input');
  const txt = input.value.trim();
  if (!txt || !me) return;
  await push(ref(db, 'requests'), {
    text: txt,
    by: me.name,
    done: false,
    ts: Date.now(),
  });
  addSavedPoints(1);
  input.value = '';
});

document.getElementById('board-send')?.addEventListener('click', async () => {
  const input = document.getElementById('board-input');
  const txt = input.value.trim();
  if (!txt || !me) return;
  await push(ref(db, 'chatWall'), {
    text: txt,
    by: me.name,
    ts: Date.now(),
  });
  addSavedPoints(1);
  input.value = '';
});

async function sendChallenge(targetUid, targetName) {
  const matchId = `${me.uid}_${targetUid}_${Date.now()}`;
  await set(ref(db, `matches/${matchId}`), {
    p1Uid: me.uid,
    p1Name: me.name,
    p2Uid: targetUid,
    p2Name: targetName,
    pos: 50,
    status: 'waiting',
  });
  await set(ref(db, `invites/${targetUid}`), {
    matchId,
    fromUid: me.uid,
    fromName: me.name,
  });
  switchTab('duel');
  joinMatch(matchId, 'p1');
}

function joinMatch(matchId, role) {
  activeMatchId = matchId;
  myRole = role;
  const pullBtn = document.getElementById('live-pull-btn');
  const statusEl = document.getElementById('duel-status');

  onValue(ref(db, `matches/${matchId}`), (snap) => {
    const m = snap.val();
    if (!m) return;
    const p1User = cachedAllUsers[m.p1Uid];
    const p2User = cachedAllUsers[m.p2Uid];
    document.getElementById('duel-p1').innerHTML = `${renderAvatarHtml(
      p1User?.avatar,
      'sm'
    )} ${m.p1Name}`;
    document.getElementById('duel-p2').innerHTML = `${renderAvatarHtml(
      p2User?.avatar,
      'sm'
    )} ${m.p2Name}`;
    document.getElementById('tug-fill').style.width = `${m.pos}%`;
    document.getElementById('tug-marker').style.left = `${m.pos}%`;

    if (m.status === 'waiting') {
      pullBtn.disabled = true;
      statusEl.textContent = `⏳ מחכים ש-${m.p2Name} תאשר את ההזמנה...`;
    } else if (m.status === 'playing') {
      pullBtn.disabled = false;
      statusEl.textContent = '🔥 הקרב חי! תלחצי הכי מהר שאפשר!!';
      if (m.pos <= 5) {
        update(ref(db, `matches/${matchId}`), {
          status: 'done',
          winner: m.p1Name,
        });
        if (myRole === 'p1') addSavedPoints(10);
      } else if (m.pos >= 95) {
        update(ref(db, `matches/${matchId}`), {
          status: 'done',
          winner: m.p2Name,
        });
        if (myRole === 'p2') addSavedPoints(10);
      }
    } else if (m.status === 'done') {
      pullBtn.disabled = true;
      statusEl.textContent = `🏆 ${m.winner} ניצחה בדו-קרב (+10 נקודות)!`;
    }
  });
}

document.getElementById('live-pull-btn')?.addEventListener('click', () => {
  if (!activeMatchId || !myRole) return;
  const delta = myRole === 'p1' ? -5 : 5;
  update(ref(db, `matches/${activeMatchId}`), {
    pos: increment(delta),
  });
});

// ציטוטים
const chatQuotes = [
  'ריטה: "בגילגול הבא עדיף להיות שרימפס" 🦐',
  'אור: "שכחו את המזוודה באבו דאבי" 🧳',
  'ליאם: "שורד על מלפפונים (בקושי)" 🥒',
  'שרה: "אני 100 חברים😝😝😝"',
  'עינת: "יש לי דייט / שעת אפס באמת?" ✨',
  'מירום: "אייס קפה טבעוני ופונקציות עד השמיים ☕"',
  'החבורה: "האוטובוס הבריז והדלת נעולה, שלקלק" 🚌',
];
let lastQuoteIdx = -1;
document.getElementById('quote-btn')?.addEventListener('click', () => {
  let idx;
  do {
    idx = Math.floor(Math.random() * chatQuotes.length);
  } while (idx === lastQuoteIdx && chatQuotes.length > 1);
  lastQuoteIdx = idx;
  document.getElementById('hero-quote').textContent = chatQuotes[idx];
});

// מצב מלבלב + מצב לילה
const blossomBtn = document.getElementById('blossom-toggle');
const psychoBtn = document.getElementById('psycho-toggle');

blossomBtn?.addEventListener('click', () => {
  const on = document.body.classList.toggle('blossom');
  if (on) document.body.classList.remove('psycho');
  blossomBtn.classList.toggle('active-mode', on);
  psychoBtn?.classList.remove('active-mode');
});

psychoBtn?.addEventListener('click', () => {
  const on = document.body.classList.toggle('psycho');
  if (on) document.body.classList.remove('blossom');
  psychoBtn.classList.toggle('active-mode', on);
  blossomBtn?.classList.remove('active-mode');
});

// טריוויה
const triviaPool = [
  {
    q: '"היא פשוט צועקת על כל המסדרון לשרה היי סבתאאאאא"',
    ans: 'ריטה',
    opts: ['ריטה', 'אור', 'ליאם', 'עינת'],
  },
  {
    q: '"3143 מטר הר ואנחנו בתוך העננים"',
    ans: 'אור',
    opts: ['שרה', 'אור', 'ריטה', 'ליאם'],
  },
  {
    q: '"שורד על מלפפונים (בקושי)"',
    ans: 'ליאם',
    opts: ['ליאם', 'ריטה', 'אור', 'שרה'],
  },
  {
    q: '"אייס קפה טבעוני — חקירת פונקציות קל, טריגו לא"',
    ans: 'מירום',
    opts: ['עינת', 'שרה', 'מירום', 'ריטה'],
  },
  {
    q: '"שכחו את המזוודה באבו דאבי" 🧳',
    ans: 'אור',
    opts: ['אור', 'ריטה', 'שרה', 'ליאם'],
  },
  {
    q: '"אני 100 חברים😝😝😝"',
    ans: 'שרה',
    opts: ['עינת', 'שרה', 'מירום', 'אור'],
  },
  {
    q: '"בגילגול הבא עדיף להיות שרימפס" 🦐',
    ans: 'ריטה',
    opts: ['ליאם', 'עינת', 'ריטה', 'אור'],
  },
];

let shuffledTrivia = [...triviaPool].sort(() => Math.random() - 0.5);
let curRound = 0;

function renderTrivia() {
  const quizBox = document.getElementById('quiz-box');
  if (!quizBox) return;
  if (curRound >= shuffledTrivia.length) {
    shuffledTrivia = [...triviaPool].sort(() => Math.random() - 0.5);
    curRound = 0;
  }
  const item = shuffledTrivia[curRound];
  quizBox.innerHTML = `
    <p style="font-weight:800">${item.q}</p>
    <div class="choice-grid">${item.opts
      .map((o) => `<button class="choice-card" data-val="${o}">${o}</button>`)
      .join('')}</div>
    <div id="fb" class="feedback-line"></div>`;
  quizBox.querySelectorAll('.choice-card').forEach((btn) => {
    btn.addEventListener('click', () => {
      const fb = document.getElementById('fb');
      if (btn.dataset.val === item.ans) {
        addSavedPoints(2);
        fb.textContent = 'בול!! +2 נקודות לחשבון 🔥';
      } else {
        fb.textContent = `לאא זה ${item.ans} 😂`;
      }
      curRound++;
      setTimeout(renderTrivia, 750);
    });
  });
}
renderTrivia();

// תפוס את החומוס
const startBtn = document.getElementById('start-game');
const arena = document.getElementById('arena');
let score = 0,
  left = 12,
  streak = 0,
  spawner,
  clock;

startBtn?.addEventListener('click', () => {
  clearInterval(spawner);
  clearInterval(clock);
  arena.innerHTML = '';
  score = 0;
  left = 12;
  streak = 0;
  document.getElementById('score').textContent = '0';
  document.getElementById('timer').textContent = '12';
  document.getElementById('combo').textContent = 'x1';
  startBtn.disabled = true;

  spawner = setInterval(() => {
    const t = document.createElement('button');
    const r = Math.random();
    const isBad = r < 0.25;
    const isGold = !isBad && r > 0.85;

    t.className = isBad
      ? 'spud-target burnt'
      : isGold
      ? 'spud-target gold'
      : 'spud-target';
    t.textContent = isBad
      ? ['קו הבריז', 'טריגו', 'דלת נעולה'][Math.floor(Math.random() * 3)]
      : isGold
      ? '🦐 שלקלק (+3)'
      : ['חומוס', 'פסטה', 'אייס קפה', 'שוקולד פנדה'][
          Math.floor(Math.random() * 4)
        ];

    t.style.left = `${16 + Math.random() * 68}%`;
    t.style.top = `${20 + Math.random() * 60}%`;

    t.addEventListener('click', () => {
      if (isBad) {
        streak = 0;
        score = Math.max(0, score - 3);
      } else {
        streak++;
        const mult = streak >= 5 ? 2 : 1;
        score += (isGold ? 3 : 1) * mult;
      }
      document.getElementById('combo').textContent =
        streak >= 5 ? 'x2 🔥' : 'x1';
      document.getElementById('score').textContent = score;
      t.remove();
    });

    arena.appendChild(t);
    setTimeout(() => t.remove(), 880);
  }, 380);

  clock = setInterval(() => {
    left--;
    document.getElementById('timer').textContent = left;
    if (left <= 0) {
      clearInterval(spawner);
      clearInterval(clock);
      startBtn.disabled = false;
      if (score > 0) addSavedPoints(score);
      arena.innerHTML = `<h3>נגמר! +${score} נקודות נוספו לחשבון שלך 🦐</h3>`;
    }
  }, 1000);
});
