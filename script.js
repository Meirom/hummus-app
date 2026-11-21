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

const firebaseConfig = {
  apiKey: 'AIzaSyD9vL8NaVCfEa9uTs45MmyT4ruw_YvknXA',
  authDomain: 'hummus-pasta.firebaseapp.com',
  databaseURL: 'https://hummus-pasta-default-rtdb.firebaseio.com',
  projectId: 'hummus-pasta',
  storageBucket: 'hummus-pasta.firebasestorage.app',
  messagingSenderId: '348557255133',
  appId: '1:348557255133:web:524bf31a2fc6cea2329634',
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

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

const orbs = Array.from({ length: 16 }, () => ({
  x: Math.random() * w,
  y: Math.random() * h,
  r: 6 + Math.random() * 13,
  vx: (Math.random() - 0.5) * 0.55,
  vy: (Math.random() - 0.5) * 0.55,
}));

const hearts = Array.from({ length: 22 }, () => ({
  x: Math.random() * w,
  y: Math.random() * h,
  size: 14 + Math.random() * 14,
  vy: 0.7 + Math.random() * 1.1,
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
      hr.x += Math.sin(hr.sway) * 0.6;
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
      ctx.fillStyle = 'rgba(180, 131, 82, 0.17)';
      ctx.fill();
    });
  }
  requestAnimationFrame(loop);
})();

// צליל עדין להתראות חיות
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

// חישוב תאריך מקומי YYYY-MM-DD לרצף יומי
function getDayKey(offsetDays = 0) {
  const d = new Date(Date.now() + offsetDays * 86400000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

// פורמט "נראה לאחרונה"
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
  } catch {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      await updateProfile(cred.user, { displayName: name });
      await set(ref(db, `users/${cred.user.uid}`), {
        uid: cred.user.uid,
        name,
        email,
        score: 0,
        streak: 1,
        lastStreakDay: getDayKey(0),
        lastSeen: Date.now(),
      });
    } catch (e2) {
      authError.textContent = 'שגיאה בהתחברות: ' + e2.message;
    }
  }
});

document.getElementById('logout-btn').addEventListener('click', async () => {
  if (me) {
    await update(ref(db, `users/${me.uid}`), { lastSeen: Date.now() });
    await remove(ref(db, `online/${me.uid}`));
  }
  await signOut(auth);
});

function addSavedPoints(pts) {
  if (!me) return;
  update(ref(db, `users/${me.uid}`), {
    score: increment(pts),
  });
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

function renderPresenceList() {
  const listEl = document.getElementById('online-list');
  if (!me) return;

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
        : `נראתה לאחרונה: ${formatLastSeen(u.lastSeen || u.ts)}`;

      return `
      <div class="online-row ${isOnline ? 'is-online' : 'is-offline'}">
        <div class="online-info">
          <span class="online-name">
            <span class="${isOnline ? 'dot-green' : 'dot-gray'}"></span>
            ${u.name || 'חברה'} ${isMe ? '(את)' : ''}${streakBadge}
          </span>
          <small class="last-seen-tag">${statusText}</small>
        </div>
        ${
          !isMe && isOnline
            ? `<button class="solid-pill invite-btn" data-uid="${u.uid}" data-name="${u.name}" style="margin-top:0">הזמן לקרב ⚔️</button>`
            : ''
        }
      </div>`;
    })
    .join('');

  listEl.querySelectorAll('.invite-btn').forEach((btn) => {
    btn.addEventListener('click', () =>
      sendChallenge(btn.dataset.uid, btn.dataset.name)
    );
  });
}

// אונליין + רצף יומי + הזמנות + שיאים + קיר הצ'אט + בקשות ושיפורים
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    me = null;
    authModal.classList.remove('hidden');
    userBadge.textContent = 'לא מחוברת';
    return;
  }

  connectedAt = Date.now();
  const userRef = ref(db, `users/${user.uid}`);
  const userSnap = await get(userRef);
  const existing = userSnap.val();
  const displayName =
    existing?.name ||
    user.displayName ||
    authName.value.trim() ||
    user.email.split('@')[0];

  const today = getDayKey(0);
  const yesterday = getDayKey(-1);
  let newStreak = 1;

  if (existing) {
    if (existing.lastStreakDay === today) {
      newStreak = existing.streak || 1;
    } else if (existing.lastStreakDay === yesterday) {
      newStreak = (existing.streak || 1) + 1;
    }
    await update(userRef, {
      uid: user.uid,
      name: displayName,
      streak: newStreak,
      lastStreakDay: today,
      lastSeen: Date.now(),
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
    });
  }

  me = { uid: user.uid, name: displayName, email: user.email };
  authModal.classList.add('hidden');
  userBadge.textContent = `מחוברת: ${me.name} 🦐`;
  myStreakEl.textContent = `🔥 ${newStreak}`;

  const myOnlineRef = ref(db, `online/${me.uid}`);
  await set(myOnlineRef, { uid: me.uid, name: me.name, ts: Date.now() });
  onDisconnect(myOnlineRef).remove();
  onDisconnect(ref(db, `users/${me.uid}/lastSeen`)).set(Date.now());

  // שידור חי לכל החבורה שמירום/מישהי התחברה עכשיו
  await push(ref(db, 'liveEvents'), {
    type: 'join',
    byUid: me.uid,
    byName: me.name,
    ts: Date.now(),
  });

  onValue(ref(db, `users/${me.uid}`), (snap) => {
    const val = snap.val() || {};
    myScoreEl.textContent = val.score || 0;
    myStreakEl.textContent = `🔥 ${val.streak || 1}`;
  });

  onValue(ref(db, 'online'), (snap) => {
    cachedOnlineUsers = snap.val() || {};
    renderPresenceList();
  });

  const myInviteRef = ref(db, `invites/${me.uid}`);
  const inviteToast = document.getElementById('invite-toast');
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
    lb.innerHTML = all
      .slice(0, 10)
      .map(
        (u, idx) =>
          `<div class="lb-row"><span>${idx === 0 ? '👑 ' : `${idx + 1}. `}${
            u.name
          } <small>(🔥 ${u.streak || 1})</small></span><b>${
            u.score || 0
          }</b></div>`
      )
      .join('');
  });

  onValue(ref(db, 'chatWall'), (snap) => {
    const items = Object.values(snap.val() || {})
      .reverse()
      .slice(0, 25);
    const boardEl = document.getElementById('board-list');
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

  onValue(ref(db, 'requests'), (snap) => {
    const raw = snap.val() || {};
    const entries = Object.entries(raw)
      .map(([id, val]) => ({ id, ...val }))
      .sort((a, b) => (b.ts || 0) - (a.ts || 0));

    const reqListEl = document.getElementById('requests-list');
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
          r.done ? 'בוצע ✅' : 'סמן כטופל'
        }</button>
            <button class="mini-btn del-req" data-id="${r.id}">מחק 🗑️</button>
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

// מאזין חי לאירועי כניסה + קריאות "תתחברו עכשיו!"
onChildAdded(ref(db, 'liveEvents'), (snap) => {
  const ev = snap.val();
  if (!ev || !me) return;
  if ((ev.ts || 0) <= connectedAt - 1000) return;

  if (ev.type === 'join' && ev.byUid !== me.uid) {
    showLiveAlert('🟢 חברה התחברה!', `${ev.byName} נכנסה עכשיו לאתר 🦐`);
  } else if (ev.type === 'ping') {
    showLiveAlert(
      '🚨 קריאה דחופה מהלובי!',
      `${ev.byName} קוראת לכולן להתחבררר עכשיו!! 🔥`
    );
  }
});

// כפתור "תתחברו עכשיו!!"
document.getElementById('ping-all-btn').addEventListener('click', async () => {
  if (!me) return;
  await push(ref(db, 'liveEvents'), {
    type: 'ping',
    byUid: me.uid,
    byName: me.name,
    ts: Date.now(),
  });
});

// מאזין ייעודי שמקפיץ התראה רק לבקשות חדשות שנשלחות אחרי שהדף נטען
onChildAdded(ref(db, 'requests'), (snap) => {
  const val = snap.val();
  if (!val) return;
  if ((val.ts || 0) > connectedAt - 1000) {
    showRequestPopup(val);
  }
});

document.getElementById('request-send').addEventListener('click', async () => {
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

document.getElementById('board-send').addEventListener('click', async () => {
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
    document.getElementById('duel-p1').textContent = m.p1Name;
    document.getElementById('duel-p2').textContent = m.p2Name;
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
      statusEl.textContent = `🏆 ${m.winner} ניצחה בדו-קרב (+10 נקודות לחשבון)!`;
    }
  });
}

document.getElementById('live-pull-btn').addEventListener('click', () => {
  if (!activeMatchId || !myRole) return;
  const delta = myRole === 'p1' ? -5 : 5;
  update(ref(db, `matches/${activeMatchId}`), {
    pos: increment(delta),
  });
});

// מאגר ציטוטים מגוון
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
document.getElementById('quote-btn').addEventListener('click', () => {
  let idx;
  do {
    idx = Math.floor(Math.random() * chatQuotes.length);
  } while (idx === lastQuoteIdx && chatQuotes.length > 1);
  lastQuoteIdx = idx;
  document.getElementById('hero-quote').textContent = chatQuotes[idx];
});

// מצב מלבלב (לבבות עפים) + מצב לילה (נוחות לעיניים)
const blossomBtn = document.getElementById('blossom-toggle');
const psychoBtn = document.getElementById('psycho-toggle');

blossomBtn.addEventListener('click', () => {
  const on = document.body.classList.toggle('blossom');
  if (on) {
    document.body.classList.remove('psycho');
    psychoBtn.textContent = 'מצב לילה 🌙';
  }
  blossomBtn.textContent = on ? 'רגיל ☀️' : 'מלבלב 💖';
});

psychoBtn.addEventListener('click', () => {
  const on = document.body.classList.toggle('psycho');
  if (on) {
    document.body.classList.remove('blossom');
    blossomBtn.textContent = 'מלבלב 💖';
  }
  psychoBtn.textContent = on ? 'רגיל ☀️' : 'מצב לילה 🌙';
});

// טריוויה מורחבת עם ערבוב שאלות
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
  if (curRound >= shuffledTrivia.length) {
    shuffledTrivia = [...triviaPool].sort(() => Math.random() - 0.5);
    curRound = 0;
  }
  const quizBox = document.getElementById('quiz-box');
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

// משחק סולו עם קומבו ובונוס זהב
const startBtn = document.getElementById('start-game');
const arena = document.getElementById('arena');
let score = 0,
  left = 12,
  streak = 0,
  spawner,
  clock;

startBtn.addEventListener('click', () => {
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
