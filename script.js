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
  if (me) switchTab('club');
});

document.getElementById('save-avatar-btn')?.addEventListener('click', async () => {
  if (!me) return;
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
        avatar: { ...DEFAULT_AVATAR },
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
  switchTab('club');
});

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
          !isMe && isOnline
            ? `<button class="solid-pill invite-btn" data-uid="${u.uid}" data-name="${u.name}" style="margin-top:0">דו-קרב ⚔️</button>`
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

// מאזינים חיים אחרי התחברות
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

  const myAv = { ...DEFAULT_AVATAR, ...(existing?.avatar || {}) };
  draftAvatar = { ...myAv };
  updateAvatarPreview();

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

  me = { uid: user.uid, name: displayName, email: user.email, avatar: myAv };
  authModal.classList.add('hidden');
  userBadge.innerHTML = `${renderAvatarHtml(myAv, 'xs')} <span>${me.name}</span>`;
  if (myStreakEl) myStreakEl.textContent = `🔥 ${newStreak}`;

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
      switchTab('games');
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
          const opts = memberNames.length > 0 ? memberNames : ['מירום', 'ריטה', 'אור', 'שרה'];
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
  input.value =
