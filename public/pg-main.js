'use strict';

/* Vantira main: rendering, data loading and event wiring. */

const TITLES = { home: 'Home', earn: 'VIP', assets: 'Wallet', referrals: 'Referrals', profile: 'Profile', support: 'Support', about: 'About', admin: 'Admin' };

function renderLoading() {
  app.innerHTML = `<main class="loading" aria-label="Loading"><span class="loading-cube">${markImg(96, 'float')}</span><i class="xp is-lg"><b class="indeterminate"></b></i></main>`;
}

function render() {
  window.PortgainyForge?.dispose();
  TITLES.earn=S.user?.forgeEnabled?'Forge':'VIP';
  const active = document.activeElement;
  const keep = active && active.id && /^(admin-search|faq-search|chat-input|calc-amount)$/.test(active.id)
    ? { id: active.id, start: active.selectionStart, end: active.selectionEnd } : null;
  const y = S.renderedView === S.view ? window.scrollY : 0;
  S.renderedView = S.view;
  if (S.loading) renderLoading();
  else if (!S.user) { if (PUBLIC_VIEWS.includes(S.view)) renderPublic(); else renderAuth(); }
  else renderShell();
  document.title = S.user || PUBLIC_VIEWS.includes(S.view) ? `Vantira | ${i18n.text(TITLES[S.view] || 'Home')}` : 'Vantira';
  document.body.dataset.view = S.user ? S.view : (PUBLIC_VIEWS.includes(S.view) ? 'public' : 'auth');
  postRender();
  window.scrollTo(0, y);
  if (keep) { const el = document.getElementById(keep.id); if (el) { el.focus({ preventScroll: true }); try { el.setSelectionRange(keep.start, keep.end); } catch { /* not a text field */ } } }
}

function postRender() {
  if (!S.user) return;
  if (S.view === 'earn') updateCalc();
  if (S.view === 'earn' && S.user.forgeEnabled) PortgainyForge.mount();
  if (S.view === 'support') { const log = document.querySelector('#chat-log'); if (log) log.scrollTop = log.scrollHeight; }
  if (S.view === 'assets' && S.assetsTab === 'history') loadWalletLists();
  if (S.view === 'admin' && !S.admin) loadAdmin();
}

/* ----------------------------------------------------------------- data */

async function loadAll() {
  const id = S.user.id;
  const [activity, team, config, earn, referrals, forge] = await Promise.all([
    api('/api/activity'), api('/api/team'), api('/api/payment-config', { timeout: 15000 }).catch(() => ({})),
    api('/api/earn').catch(() => null), api('/api/earn/referrals').catch(() => null),
    S.user.forgeEnabled ? api('/api/forge').catch(() => null) : null
  ]);
  if (S.user?.id !== id) return;
  S.activities = activity.activities; S.team = team.team; S.earn = earn; S.referrals = referrals;
  S.forge=forge;
  if (earn) S.serverOffset = earn.serverTime - Date.now();
  applyPayConfig(config);
  try { await loadDepositAddress(); } catch { S.pay.wallet = null; }
}

async function refreshAccount() {
  const id = S.user.id;
  const [me, activity, earn, team, referrals, forge] = await Promise.all([
    api('/api/me', { timeout: 15000 }), api('/api/activity', { timeout: 15000 }), api('/api/earn').catch(() => null),
    api('/api/team').catch(() => null), api('/api/earn/referrals').catch(() => null),
    S.user.forgeEnabled ? api('/api/forge').catch(() => null) : null
  ]);
  if (S.user?.id !== id) return;
  S.user = me.user; S.activities = activity.activities;
  if (earn) { S.earn = earn; S.serverOffset = earn.serverTime - Date.now(); }
  if (team) S.team = team.team;
  if (referrals) S.referrals = referrals;
  if (forge) S.forge = forge;
}

async function loadWalletLists() {
  if (S.wallet.loading) return;
  S.wallet.loading = true;
  try {
    const data = await api('/api/wallet/withdrawals', { timeout: 15000 });
    S.wallet.withdrawals = data.withdrawals || [];
    const box = document.querySelector('#withdraw-status');
    if (box) box.innerHTML = `${sectionHead('Withdrawal requests')}${withdrawalsList()}`;
  } catch { S.wallet.withdrawals = S.wallet.withdrawals || []; }
  finally { S.wallet.loading = false; }
}

let adminRequest = 0;
async function loadAdmin() {
  if (!S.user?.isAdmin) return;
  const userId = S.user.id;
  const id = ++adminRequest;
  try {
    const [data, deposits, workingWallet, accounting, journal, forgeReport] = await Promise.all([
      api('/api/admin/overview', { timeout: 20000 }),
      api(`/api/admin/deposits?offset=${S.adminDepositOffset}`, { timeout: 20000 }).catch(() => null),
      api('/api/admin/working-wallet', { timeout: 20000 }).catch(() => null),
      api('/api/admin/accounting', { timeout: 20000 }).catch(() => null),
      api(`/api/admin/accounting/journal?offset=${S.adminJournalOffset}`, {timeout:20000}).catch(()=>null),
      S.user.forgeEnabled ? api('/api/admin/forge',{timeout:20000}).catch(()=>null) : null
    ]);
    if (id !== adminRequest || S.user?.id !== userId || !S.user?.isAdmin) return;
    data.depositInfo = deposits;
    data.workingWallet = workingWallet;
    data.accounting = accounting;
    data.journal = journal;
    data.forgeReport = forgeReport;
    S.admin = data;
  } catch (error) { if (id === adminRequest) toast(errMsg(error), 'error'); return; }
  if (S.view === 'admin' && !sheetEl && !isEditing()) render();
}

const isEditing = () => Boolean(document.activeElement?.matches?.('input, textarea, select, [contenteditable="true"]'));

/* ----------------------------------------------------------------- actions */

async function claimReward() {
  if (S.claimBusy || !claimReady()) return;
  S.claimBusy = true; S.claimKey ||= crypto.randomUUID();
  for (const b of document.querySelectorAll('[data-claim-btn]')) b.disabled = true;
  try {
    const result = await api('/api/earn/claim', { method: 'POST', body: { requestKey: S.claimKey } });
    S.user = result.user; S.activities = result.activities; S.earn = result.earn;
    S.serverOffset = result.earn.serverTime - Date.now(); S.claimKey = null;
    render(); burst(); buzz(24);    toast(i18n.text('{amount} USDT added to your available balance', {amount:usdExact(result.receipt.amount)}), 'ok', 'Reward claimed');
  } catch (error) {
    const label = document.querySelector('#earn-error');
    if (label) label.textContent = i18n.text('Could not claim. Refresh and try again.');
    toast('Could not claim. Refresh and try again.', 'error');
  } finally { S.claimBusy = false; updateTimers(); }
}

function burst() {
  const layer = document.createElement('div'); layer.className = 'burst'; layer.setAttribute('aria-hidden', 'true');
  const colors = ['#d9421f', '#ffd23f', '#2a8f82', '#17140f', '#2d58a7'];
  for (let i = 0; i < 26; i += 1) {
    const p = document.createElement('i'), angle = (Math.PI * 2 * i) / 26 + Math.random() * 0.4, dist = 80 + Math.random() * 140;
    p.style.cssText = `--dx:${Math.cos(angle) * dist}px;--dy:${Math.sin(angle) * dist - 40}px;--c:${colors[i % colors.length]};--r:${Math.random() * 360}deg`;
    layer.append(p);
  }
  document.body.append(layer); setTimeout(() => layer.remove(), 1200);
}

async function showPromotionNotice() {
  const p = S.user?.referralPromotion;
  if (!p?.announcementPending || S.noticeRequested || sheetEl) return;
  S.noticeRequested = true;
  try {
    const result = await api('/api/earn/promotion/announcement', { method: 'POST', body: {} });
    S.user.referralPromotion = result.promotion;
    if (result.show && S.user) {
      const pr = result.promotion;
      openSheet(`<div class="notice"><span class="tag tag-main">${pr.status === 'unlocked' ? 'Unlocked' : '10-day offer'}</span><div class="promo-rate big"><b>${Math.round(pr.baseRate * 100)}%</b>${icon('arrow')}<b class="hi">${Math.round(pr.boostedRate * 100)}%</b></div><h2>${pr.status === 'unlocked' ? '10% daily VIP rate unlocked' : 'Unlock up to 10% daily VIP'}</h2><p>Invite ${pr.requiredReferrals} active friends within your personal 10-day window. An active referral has at least ${pr.minimumDepositUSDT} USDT in confirmed deposits. Existing active referrals count too.</p><div class="prog"><span>Active referrals</span><b>${pr.qualifyingReferrals} / ${pr.requiredReferrals}</b></div><i class="xp is-lg"><b style="width:${Math.round(clamp(pr.qualifyingReferrals / pr.requiredReferrals, 0, 1) * 100)}%"></b></i><div class="sheet-actions"><button class="btn btn-ghost" data-act="close-sheet">Got it</button><button class="btn btn-main" data-act="goto" data-view="referrals">View referrals${icon('arrow')}</button></div></div>`, { label: 'Referral offer' });
    }
  } catch { setTimeout(() => { S.noticeRequested = false; }, 30000); }
}

async function adminDecision(action, id) {
  if (S.busy) return;
  if (S.adminArmed?.id !== id || S.adminArmed.action !== action) {
    S.adminArmed = { id, action };
    clearTimeout(adminDecision.timer);
    adminDecision.timer = setTimeout(() => { if (S.adminArmed?.id === id) { S.adminArmed = null; if (S.view === 'admin') render(); } }, 6000);
    render(); return;
  }
  S.adminArmed = null; S.busy = true; render();
  try {
    await api(`/api/admin/withdrawals/${encodeURIComponent(id)}/${action}`, { method: 'POST', body: {} });
    toast(action === 'confirm' ? 'Withdrawal marked as sent' : 'Withdrawal rejected', 'ok');
  } catch (error) { toast(errMsg(error), 'error'); } finally { S.busy = false; }
  await loadAdmin(); render();
}

/* ------------------------------------------------------------------ timers */

function updateTimers() {
  const e = S.earn;
  if (e) {
    const ms = e.nextClaimAt - serverNow(), ready = claimReady();
    for (const el of document.querySelectorAll('[data-earn-timer]')) { if (ready) { const label = i18n.text('Ready'); if (el.textContent !== label) el.textContent = label; } else el.textContent = clock(ms); }
    for (const button of document.querySelectorAll('[data-claim-btn]')) {
      button.disabled = !ready || S.claimBusy;
      button.classList.toggle('btn-main', ready); button.classList.toggle('btn-dark', !ready);
    }
    if (ready && !S.readyRendered && !isEditing()) { S.readyRendered = true; if (['home', 'earn'].includes(S.view) && !sheetEl) render(); }
    if (!ready) S.readyRendered = false;
  }
}

setInterval(updateTimers, 1000);

let refreshRunning = false;
setInterval(async () => {
  if (refreshRunning || !S.user || document.hidden || S.busy || sheetEl) return;
  refreshRunning = true;
  const id = S.user.id, before = S.user.lockedBalance;
  try {
    const [me, activity, config] = await Promise.all([api('/api/me', { timeout: 15000 }), api('/api/activity', { timeout: 15000 }), api('/api/payment-config', { timeout: 15000 }).catch(() => null)]);
    if (S.user?.id !== id) return;
    const credited = me.user.lockedBalance > before && activity.activities.some(a => a.type === 'deposit' && !S.activities.some(p => p.id === a.id));
    const changed = JSON.stringify(me.user) !== JSON.stringify(S.user) || JSON.stringify(activity.activities) !== JSON.stringify(S.activities);
    S.user = me.user; S.activities = activity.activities;
    if (config) applyPayConfig(config);
    if (changed) { await refreshAccount().catch(() => {}); if (!sheetEl && !isEditing() && S.view !== 'profile') render(); }
    if (credited) toast('A confirmed USDT deposit was credited.', 'ok', 'Deposit received');
  } catch { /* network interruptions never change displayed balances */ } finally { refreshRunning = false; }
}, 20000);

setInterval(() => { if (S.view === 'admin' && S.user?.isAdmin && !document.hidden && !S.busy && !S.adminArmed && document.activeElement?.id !== 'admin-search') loadAdmin(); }, 20000);

/* ------------------------------------------------------------------ events */

const acts = {
  'dismiss-earn-notice': dismissEarnNotice,
  goto: el => go(el.dataset.view),
  'auth-mode': el => { S.authMode = el.dataset.mode; S.view = S.authMode === 'signup' ? 'signup' : 'signin'; history.replaceState(null, '', `#${S.view}`); render(); },
  'toggle-password': el => {
    const input = document.getElementById(el.dataset.target); if (!input) return;
    const show = input.type === 'password'; input.type = show ? 'text' : 'password';
    el.innerHTML = icon(show ? 'eyeOff' : 'eye'); el.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
  },
  'toggle-hide': () => { S.hide = !S.hide; store.write('pg_hide', S.hide); render(); },
  'open-notices': openNotices,
  back: () => { buzz(4); if (S.navCount > 0 && history.length > 1) history.back(); else go('home'); },
  'close-sheet': () => closeSheet(),
  'open-tx': el => openTx(el.dataset.id),
  'copy-value': async el => { if (el.dataset.value && await copyText(el.dataset.value)) { buzz(6); toast('Copied to clipboard'); } },
  'wallet-deposit': () => openWallet('deposit'), 'wallet-withdraw': () => openWallet('withdraw'), 'wallet-transfer': () => openWallet('transfer'),
  'retry-wallet': el => openWallet(el.dataset.type),
  'wallet-max': () => { const input = document.querySelector('#wallet-amount'); if (input) { input.value = maxAmount(); input.dispatchEvent(new Event('input', { bubbles: true })); } },
  'copy-address': async el => { const v = document.querySelector('#dep-address')?.value; if (v && await copyText(v)) { el.textContent = i18n.text('COPIED'); setTimeout(() => { el.textContent = i18n.text('COPY'); }, 1500); } },
  claim: claimReward,
  'copy-invite': async () => { if (await copyText(S.team?.inviteCode || S.user.inviteCode)) toast('Invite code copied'); },
  'copy-invite-link': async () => { if (await copyText(inviteUrl(S.team?.inviteCode || S.user.inviteCode))) toast('Invite link copied'); },
  'share-invite': async () => {
    const url = inviteUrl(S.team?.inviteCode || S.user.inviteCode);
    if (navigator.share) { try { await navigator.share({ title: 'Vantira', text: 'Join me on Vantira and start climbing the VIP levels.', url }); return; } catch { /* cancelled */ } }
    if (await copyText(url)) toast('Invite link copied');
  },
  logout: async () => {
    try { await api('/api/auth/logout', { method: 'POST', body: {} }); } catch { /* cookie is cleared by the server when reachable */ }
    Object.assign(S, { user: null, activities: [], team: null, earn: null, referrals: null, portfolio: null, admin: null, view: 'home', wallet: { withdrawals: null, deposits: null } });
    await useAccountLanguage(null);
    history.replaceState(null, '', location.pathname); closeSheet(true); render();
  },
  'assets-tab': el => { S.assetsTab = el.dataset.tab; render(); },
  'history-filter': el => { S.historyFilter = el.dataset.filter; render(); },
  'export-history': exportHistory,
  'chat-suggest': el => sendChat(el.dataset.text, i18n.text(el.dataset.text)),
  'admin-tab': el => { S.adminTab = el.dataset.tab; render(); },
  'admin-deposit-page': el => { const offset = Number(el.dataset.offset); if (Number.isSafeInteger(offset) && offset >= 0) { S.adminDepositOffset = offset; loadAdmin(); } },
  'admin-journal-page': el => { const offset = Number(el.dataset.offset); if (Number.isSafeInteger(offset) && offset >= 0) { S.adminJournalOffset = offset; loadAdmin(); } },
  'admin-filter': el => { S.adminFilter = el.dataset.filter; render(); },
  'admin-refresh': () => loadAdmin(),
  'admin-confirm': el => adminDecision('confirm', el.dataset.id),
  'admin-reject': el => adminDecision('reject', el.dataset.id),
  'admin-copy': async el => { if (await copyText(el.dataset.value)) toast('Copied'); }
};

document.addEventListener('click', event => {
  const el = event.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const handler = acts[el.dataset.act];
  if (!handler) return;
  event.preventDefault();
  if (el.classList.contains('tab-item')) buzz(6);
  if (sheetEl && el.dataset.act === 'goto') closeSheet(true);
  handler(el, event);
});

document.addEventListener('input', event => {
  const t = event.target;
  if (t.id === 'faq-search') { S.faqQuery = t.value; document.querySelector('#faq-list').innerHTML = faqList(filterFaq(t.value)); }
  else if (t.id === 'admin-search') { S.adminSearch = t.value; const results = document.querySelector('#admin-users-results'); if (results && S.admin) results.innerHTML = adminUserResults(S.admin.users); }
  else if (t.id === 'calc-amount') { const r = document.querySelector('#calc-range'); if (r) r.value = clamp(num(t.value), earnMin(), 10000); updateCalc(); }
  else if (t.id === 'calc-range') { const a = document.querySelector('#calc-amount'); if (a) a.value = t.value; updateCalc(); }
});

document.addEventListener('change', async event => {
  const select = event.target;
  if (select.id !== 'profile-language' || !S.user || !PG_READY_LANGUAGES.includes(select.value)) return;
  const code = select.value, userId = S.user.id, previous = i18n.language;
  if (code === previous && code === S.user.language) return;
  select.disabled = true;
  try {
    if (!await i18n.use(code)) return;
    if (S.user?.id !== userId) { await useAccountLanguage(S.user); return; }
    const result = await api('/api/profile/language', { method:'PATCH', body:{ language:code } });
    if (S.user?.id !== userId) { await useAccountLanguage(S.user); return; }
    S.user = result.user;
    updateDocumentLanguage();
    render();
  } catch (error) {
    await i18n.use(previous).catch(() => {});
    if (S.user?.id === userId) { select.value = previous; toast(errMsg(error), 'error'); }
  } finally { if (select.isConnected) select.disabled = false; }
});

document.addEventListener('submit', async event => {
  const form = event.target.closest('form[data-form]');
  if (!form) return;
  event.preventDefault();
  const kind = form.dataset.form;
  if (kind === 'auth') return submitAuth(form);
  if (kind === 'wallet') return submitWallet(form);
  if (kind === 'owner-sweep' || kind === 'owner-sweep-cancel') {
    if (S.busy) return;
    const data = new FormData(form), msg = form.querySelector('.form-msg'), button = form.querySelector('button[type="submit"]');
    const cancel = kind === 'owner-sweep-cancel';
    const body = cancel ? {id:form.dataset.id,password:data.get('password')} : {amount:data.get('amount'),password:data.get('password'),requestKey:form.dataset.requestKey ||= crypto.randomUUID()};
    S.busy = true; button.disabled = true; msg.textContent = '';
    try {
      await api(cancel ? '/api/admin/working-wallet/cancel' : '/api/admin/working-wallet/sweep', {method:'POST',body});
      toast(cancel ? 'Transfer cancelled.' : 'Transfer requested. It will appear after network confirmation.', 'ok');
      form.querySelector('input:focus')?.blur();
      await loadAdmin();
    } catch (error) { msg.textContent = errMsg(error); button.disabled = false; }
    finally { S.busy = false; }
    return;
  }
  if (kind === 'profile') {
    const msg = form.querySelector('#profile-msg'), button = form.querySelector('button[type="submit"]');
    if (S.busy) return; S.busy = true; button.disabled = true;
    try { const result = await api('/api/profile', { method: 'PATCH', body: { name: new FormData(form).get('name') } }); S.user = result.user; render(); toast('Name updated'); }
    catch (error) { msg.textContent = errMsg(error); button.disabled = false; } finally { S.busy = false; }
  }
  if (kind === 'chat') { const input = form.querySelector('#chat-input'), text = input.value; input.value = ''; sendChat(text); }
});

async function submitAuth(form) {
  if (S.busy) return;
  const data = new FormData(form), msg = document.querySelector('#auth-message'), button = form.querySelector('button[type="submit"]');
  const signup = S.authMode === 'signup', email = String(data.get('email') || '').trim();
  if (!email || !data.get('password')) { msg.textContent = i18n.text('Enter your email and password.'); return; }
  if (signup && data.get('password') !== data.get('confirm')) { msg.textContent = i18n.text('Passwords do not match.'); return; }
  S.busy = true; button.disabled = true; msg.textContent = '';
  try {
    const result = await api(signup ? '/api/auth/signup' : '/api/auth/login', { method: 'POST', body: { name: nameFromEmail(email), email, password: data.get('password'), referral: data.get('referral') } });
    S.user = result.user; await useAccountLanguage(S.user); S.view = 'home'; S.referralCode = '';
    const url = new URL(location.href); url.searchParams.delete('ref'); history.replaceState(null, '', `${url.pathname}${url.search}#home`);
    await loadAll(); render(); showEarnNotice();
    if (signup) toast('Account created. Welcome to Vantira.', 'ok', 'Welcome');
  } catch (error) { msg.textContent = errMsg(error); button.disabled = false; } finally { S.busy = false; }
}

/* ---------------------------------------------------- phone app behaviours */

// The app bar gains a hairline once the page scrolls beneath it.
window.addEventListener('scroll', () => { document.querySelector('#ab')?.classList.toggle('is-scrolled', window.scrollY > 6); }, { passive: true });

// Pull down from the top of a page to refresh balances.
(() => {
  const indicator = document.createElement('div');
  indicator.className = 'ptr'; indicator.setAttribute('aria-hidden', 'true'); indicator.innerHTML = '<i class="spinner"></i>';
  document.body.append(indicator);
  let y0 = null;
  document.addEventListener('touchstart', event => {
    y0 = (window.scrollY > 0 || !S.user || sheetEl || event.touches.length !== 1 || !isPhone()) ? null : event.touches[0].clientY;
  }, { passive: true });
  document.addEventListener('touchmove', event => {
    if (y0 === null) return;
    const dy = event.touches[0].clientY - y0;
    if (dy <= 0) { indicator.style.opacity = 0; return; }
    const d = Math.min(dy * 0.5, 72);
    indicator.style.transform = `translate(-50%, ${d}px)`; indicator.style.opacity = String(Math.min(1, d / 48));
    indicator.classList.toggle('is-ready', d >= 58);
  }, { passive: true });
  const finish = async () => {
    if (y0 === null) return;
    y0 = null;
    const ready = indicator.classList.contains('is-ready');
    if (ready) {
      buzz(10); indicator.classList.add('is-loading');
      try { await refreshAccount(); if (!sheetEl && !isEditing()) render(); } catch { /* keep showing the last data */ }
    }
    indicator.classList.remove('is-ready', 'is-loading'); indicator.style.transform = ''; indicator.style.opacity = 0;
  };
  document.addEventListener('touchend', finish); document.addEventListener('touchcancel', finish);
})();

/* -------------------------------------------------------------------- init */

async function init() {
  const params = new URLSearchParams(location.search);
  const ref = (params.get('ref') || '').trim().toUpperCase();
  if (ref) { S.referralCode = ref.slice(0, 24); S.authMode = 'signup'; }
  renderLoading();
  const parsed = parseHash(); S.view = parsed.view || (ref ? 'signup' : 'home'); S.params = parsed.params;
  if (S.view === 'signin' || S.view === 'signup') S.authMode = S.view === 'signup' ? 'signup' : 'login';
  S.platform=await api('/api/platform-config').catch(()=>({forgeEnabled:false}));
  try {
    const me = await api('/api/me');
    S.user = me.user;
    await useAccountLanguage(S.user);
    await loadAll();
    if (S.view === 'admin' && !S.user.isAdmin) S.view = 'home';
  } catch { S.user = null; await useAccountLanguage(null); }
  S.loading = false;
  render();
  showEarnNotice();
  if (S.user) {
      const intent = params.get('wallet');
    if (!S.earnNoticeActive && ['deposit', 'withdraw', 'transfer'].includes(intent)) openWallet(intent);
  }
}

// Deferred scripts that extend the action table load after this file, so start once they have all run.
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
