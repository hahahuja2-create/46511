'use strict';

/* Velmora views, part 1: shell, auth, activity list and transaction details. */

const wordmark = (cls = '') => `<span class="wordmark ${cls}" role="img" aria-label="Velmora"><span>Velmora</span></span>`;
const markImg = (size = 40, cls = '') => `<img class="mark ${cls}" src="/assets/brand/velmora-mark.svg?v=vm1" width="${size}" height="${size}" alt="" decoding="async">`;
const brandLockup = (size = 38) => `${markImg(size)}${wordmark()}`;

function avatarHex(name, cls = '') {
  return `<span class="hexbadge ${cls}"><b>${esc(String(name || 'P').trim().charAt(0).toUpperCase() || 'P')}</b></span>`;
}

function emptyState(glyph, title, text = '', action = '') {
  return `<div class="empty"><span class="empty-ic">${icon(glyph)}</span><strong>${i18n.html(title)}</strong>${text ? `<p>${i18n.html(text)}</p>` : ''}${action}</div>`;
}

function sectionHead(title, action = '') { return `<div class="sec-head"><h2>${i18n.html(title)}</h2>${action}</div>`; }
const moreLink = (label, view) => `<button class="more-link" type="button" data-act="goto" data-view="${view}">${i18n.html(label)}${icon('chevron')}</button>`;

/* ----------------------------------------------------------------- shell */

const NAV_ITEMS = [['home', 'Home', 'home'], ['earn', 'VIP', 'crown'], ['assets', 'Wallet', 'wallet'], ['referrals', 'Referrals', 'users'], ['profile', 'Profile', 'user']];
const TAB_VIEWS = NAV_ITEMS.map(item => item[0]);

function navButton([view, label, glyph], mode) {
  if (view === 'earn' && S.user?.forgeEnabled) label = 'Forge';
  const active = S.view === view;
  return `<button class="${mode}-item ${active ? 'is-active' : ''}" type="button" data-act="goto" data-view="${view}" ${active ? 'aria-current="page"' : ''}><span class="nav-ic">${icon(glyph)}</span><span class="nav-lb">${i18n.html(label)}</span></button>`;
}

function accountMenu(name) {
  const items = [['profile', 'Profile', 'user'], ['support', 'Support', 'headset'], ['about', 'About', 'building'], ...(S.user.isAdmin ? [['admin', 'Admin', 'shield']] : [])];
  return `<span class="gh-menu"><button class="gh-avatar" type="button" data-act="menu-toggle" aria-haspopup="true" aria-expanded="false" aria-label="${i18n.html('Account')}">${avatarHex(name, 'is-sm')}${icon('chevronDown')}</button>
    <div class="gh-pop" role="menu"><div class="gh-pop-head">${avatarHex(name, 'is-sm')}<span><strong>${esc(name)}</strong><small>${esc(S.user.email)}</small></span></div>
      ${items.map(([v, l, g]) => `<button type="button" role="menuitem" data-act="goto" data-view="${v}">${icon(g)}<span>${i18n.html(l)}</span></button>`).join('')}
      <button type="button" role="menuitem" data-act="toggle-theme">${icon('moon')}<span>${i18n.html('Switch theme')}</span></button>
      <button type="button" role="menuitem" class="is-danger" data-act="logout">${icon('logout')}<span>${i18n.html('Sign out')}</span></button></div></span>`;
}

/* One top bar for every size: brand (or Back on inner pages), the menu on wide screens, alerts and Top up. */
function topBar(name) {
  const inner = !TAB_VIEWS.includes(S.view);
  const title = i18n.text(TITLES[S.view] || 'Home');
  return `<header class="rt-bar${inner ? ' is-inner' : ''}" id="ab"><div class="rt-in">
    <button class="rt-back" type="button" data-act="back" aria-label="${i18n.html('Back')}">${icon('chevronLeft')}</button>
    <button class="rt-brand" type="button" data-act="goto" data-view="home" aria-label="Velmora">${brandLockup(30)}</button>
    <b class="rt-title">${esc(title)}</b>
    <nav class="rt-nav" aria-label="${i18n.html('Main')}">${NAV_ITEMS.map(item => navButton(item, 'rt')).join('')}</nav>
    <span class="rt-right">
      <button class="icon-btn" type="button" data-act="open-notices" aria-label="${i18n.html('Notifications')}">${icon('bell')}${S.activities.length ? '<i class="dot"></i>' : ''}</button>
      <button class="btn btn-main btn-sm top-deposit" type="button" data-act="wallet-deposit">${icon('plus')}<span>${i18n.html('Top up')}</span></button>
      ${accountMenu(name)}
    </span></div></header>`;
}

function renderShell() {
  const views = { home: homeView, earn: earnView, assets: assetsView, referrals: referralsView, profile: profileView, support: supportView, about: aboutView, admin: adminView };
  const body = (views[S.view] || homeView)();
  const name = S.user.name || 'Member';
  app.innerHTML = `<div class="shell view-${S.view}">
    ${topBar(name)}
    <div class="stage">
      <main class="content" id="content">${S.platform?.localTestWallet ? `<p class="note">${icon('info')}Local testing · Account balances and deposits here are simulated. Do not send real crypto.</p>` : ''}${body}</main>
      <footer class="foot"><span>Velmora &copy; 2026</span><span>${i18n.html('Reward rates and program terms can change and are not guaranteed.')}</span></footer>
    </div>
    <nav class="rt-tabs" aria-label="${i18n.html('Primary')}">${NAV_ITEMS.map(item => navButton(item, 'tab')).join('')}</nav>
  </div>`;
}

/* ------------------------------------------------------------------ auth */

function renderAuth() {
  const signup = S.authMode === 'signup';
  app.innerHTML = `<main class="auth">
    <div class="auth-top"><span class="rail-brand">${brandLockup(30)}</span><span class="auth-tools"><button class="link-btn" data-act="goto" data-view="about">${i18n.html("About")}</button><button class="link-btn" data-act="goto" data-view="support">${i18n.html("Support")}</button>${themeButton()}${langSelect()}</span></div>
    <section class="auth-card">
      <div class="auth-head"><span class="auth-badge">${markImg(56)}</span><div><h1>${i18n.html(signup ? 'Join Velmora' : 'Welcome back')}</h1><p class="auth-lead">${i18n.html(signup ? 'Create your account in a minute.' : 'Sign in to continue to your workspace.')}</p></div></div>
      <div class="seg" role="tablist" aria-label="${i18n.html("Account")}">
        <button class="${!signup ? 'is-on' : ''}" type="button" role="tab" aria-selected="${!signup}" data-act="auth-mode" data-mode="login">${i18n.html("Sign in")}</button>
        <button class="${signup ? 'is-on' : ''}" type="button" role="tab" aria-selected="${signup}" data-act="auth-mode" data-mode="signup">${i18n.html("Create account")}</button>
      </div>
      <form class="form" id="auth-form" data-form="auth" novalidate>
        <label class="field"><span>${i18n.html("Email")}</span><div class="control">${icon('mail')}<input name="email" type="email" autocomplete="email" maxlength="120" placeholder="you@example.com" required></div></label>
        <label class="field"><span>${i18n.html("Password")}</span><div class="control">${icon('lock')}<input id="auth-password" name="password" type="password" autocomplete="${signup ? 'new-password' : 'current-password'}" minlength="8" maxlength="128" placeholder="${i18n.html("At least {value0} characters", {"value0":"8"})}" required><button class="eye" type="button" data-act="toggle-password" data-target="auth-password" aria-label="${i18n.html("Show password")}">${icon('eye')}</button></div></label>
        ${signup ? `<label class="field"><span>${i18n.html("Confirm password")}</span><div class="control">${icon('lock')}<input id="auth-confirm" name="confirm" type="password" autocomplete="new-password" minlength="8" maxlength="128" placeholder="${i18n.html("Repeat password")}" required><button class="eye" type="button" data-act="toggle-password" data-target="auth-confirm" aria-label="${i18n.html("Show password")}">${icon('eye')}</button></div></label>
        <label class="field"><span>${i18n.html("Invite code")} <em>${i18n.html("optional")}</em></span><div class="control">${icon('gift')}<input name="referral" type="text" maxlength="24" autocomplete="off" spellcheck="false" value="${esc(S.referralCode)}" placeholder="TM…"></div></label>` : ''}
        <p class="form-msg" id="auth-message" role="alert"></p>
        <button class="btn btn-main btn-lg btn-block" type="submit">${i18n.html(signup ? 'Create account' : 'Sign in')}${icon('arrow')}</button>
      </form>
      <p class="auth-fine">${i18n.html("By continuing you agree to use {value0} responsibly. Reward rates and program terms can change and are not guaranteed; only use funds you can afford to lose.", {"value0":"Velmora"})}</p>
    </section>
  </main>`;
}

/* ------------------------------------------------------------------ home */








function activityIconFor(a) {
  return { earn: 'earn', topup: 'earn', referral: 'users', deposit: 'deposit', withdraw: 'withdraw', transfer: 'transfer', spot: a.side === 'BUY' ? 'trendUp' : 'trendDown', welcome: 'sparkles', task: 'check', vip: 'crown' }[a.type] || 'receipt';
}

function activityTitle(a) {
  switch (a.type) {
    case 'forge_purchase': return i18n.text('Forge Core purchase');
    case 'forge_upgrade': return i18n.text('Forge Core upgrade');
    case 'forge_reward': return i18n.text('Forge rewards collected');
    case 'earn': return i18n.text('Daily VIP claim');
    case 'referral': return a.source==='forge'?i18n.text('Forge referral rewards collected'):i18n.text('Referral reward · Level {level}', {level:a.level || 1});
    case 'deposit': return i18n.text(S.user?.forgeEnabled ? (a.status==='below-minimum'?'Deposit awaiting minimum':'USDT deposit') : 'VIP deposit');
    case 'withdraw': return i18n.text('Withdrawal request');
    case 'transfer': return i18n.text('Transfer to VIP');
    case 'spot': return i18n.text('{action} {asset}', {action:i18n.text(a.side === 'BUY' ? 'Bought' : 'Sold'),asset:a.base || ''}).trim();
    case 'welcome': return i18n.text('Welcome to Velmora');
    case 'topup': return i18n.text('VIP minimum top-up');
    case 'task': return i18n.text('Task reward (legacy)');
    case 'vip': return a.vipName ? i18n.text('Membership purchase · {name} (legacy)', {name:a.vipName}) : i18n.text('Membership purchase (legacy)');
    default: return i18n.text('Account activity');
  }
}

function activityAmount(a) {
  if(a.type==='deposit'&&a.creditedAmount!==undefined)return a.status==='below-minimum'?{text:usd(a.amount),cls:''}:{text:`+${usd(a.creditedAmount)}`,cls:'up'};
  if (!a.amount) return { text: '—', cls: '' };
  if (a.type === 'withdraw' || a.type === 'vip' || a.type==='forge_purchase' || a.type==='forge_upgrade') return { text: `-${usd(a.amount)}`, cls: 'down' };
  if (a.type === 'transfer') return { text: `${usd(a.amount)}`, cls: '' };
  if (a.type === 'spot') return { text: `${a.side === 'BUY' ? '-' : '+'}${usd(a.amount)}`, cls: a.side === 'BUY' ? 'down' : 'up' };
  return { text: `+${usd(a.amount)}`, cls: 'up' };
}

function activityList(limit = 0, filter = 'all') {
  let rows = S.activities;
  if (filter !== 'all') rows = rows.filter(a => (filter === 'trades' ? a.type === 'spot' : filter === 'rewards' ? ['earn', 'referral','forge_reward'].includes(a.type) : a.type === filter));
  if (limit) rows = rows.slice(0, limit);
  if (!rows.length) return emptyState('receipt', 'Nothing here yet', 'Your activity will appear as soon as you use your account.');
  return `<ul class="acts">${rows.map(a => {
    const amt = activityAmount(a);
    const status = a.type === 'withdraw' && a.status ? `<em class="st st-${esc(a.status)}">${esc(withdrawStatus(a))}</em>` : '';
    return `<li class="act-li"><button class="act" type="button" data-act="open-tx" data-id="${esc(a.id)}" aria-label="${i18n.html('Transaction details')}: ${esc(activityTitle(a))}"><span class="act-ic ${a.type}">${icon(activityIconFor(a))}</span><span class="act-copy"><b>${esc(activityTitle(a))}</b><small>${esc(dateText(a.at))} ${status}</small></span><span class="act-amt ${amt.cls}">${S.hide ? '••••' : esc(amt.text)}<small>USDT</small></span></button></li>`;
  }).join('')}</ul>`;
}

/* ---- Transaction details: opened by tapping a row in History, Home activity or Withdrawal requests ---- */
const TX_HASH = /^[a-f0-9]{64}$/;
const TX_STEPS = ['Requested', 'Processing', 'Sent'];
const TX_REACHED = { requested: 1, approved: 2, submitted: 2, confirmed: 3 };

function dateTimeText(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(i18n.language === 'en' ? 'en-US' : i18n.language, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(date);
}

/* A wallet activity merged with the live withdrawal record (which knows the full address and the TXID). */
function txRecord(id) {
  const a = S.activities.find(item => item.id === id) || null;
  const w = S.wallet?.withdrawals?.find(item => item.id === id) || null;
  if (!a && !w) return null;
  if (!w) return a;
  const base = a || { id: w.id, type: 'withdraw', network: 'USDT TRC20', at: w.createdAt };
  return { ...base, amount: w.amount ?? base.amount, fee: w.fee ?? base.fee, netAmount: w.netAmount ?? base.netAmount, status: w.status || base.status, wallet: w.destination || base.wallet, txid: w.txid || base.txid, automatic: w.automatic ?? base.automatic };
}

function txStatus(a) {
  if (a.type === 'withdraw') return { key: a.status || 'pending', text: withdrawStatus(a) };
  if (a.type === 'deposit') return a.status === 'below-minimum' ? { key: 'pending', text: i18n.text('Awaiting minimum') } : { key: 'confirmed', text: i18n.text('Confirmed') };
  return { key: 'confirmed', text: i18n.text('Completed') };
}

function txTracker(a) {
  const reached = TX_REACHED[a.status];
  if (!reached) return '';
  return `<ol class="tx-track" aria-label="${i18n.html('Withdrawal progress')}">${TX_STEPS.map((label, i) => `<li class="${i < reached ? 'is-done' : i === reached ? 'is-now' : ''}"><i>${i < reached ? icon('check') : ''}</i><span>${i18n.html(label)}</span></li>`).join('')}</ol>`;
}

function txCopy(value, label) {
  return `<button class="tx-copy" type="button" data-act="copy-value" data-value="${esc(value)}" aria-label="${i18n.html('Copy')}: ${esc(label)}">${icon('copy')}</button>`;
}

function txDetailRows(a) {
  const rows = [];
  const add = (label, value, extra = '') => { if (value !== '' && value !== undefined && value !== null) rows.push(`<div${extra ? ' class="is-long"' : ''}><dt>${i18n.html(label)}</dt><dd${extra}>${value}</dd></div>`); };
  const mono = ' class="mono"';
  const hash = TX_HASH.test(a.txid || '') ? a.txid : '';
  const address = a.type === 'withdraw' ? (a.wallet || '') : (a.address || '');
  const hidden = '••••';
  add('Date', esc(dateTimeText(a.at)));
  add('Network', esc(a.network || (a.type === 'deposit' || a.type === 'withdraw' ? 'USDT TRC20' : '')));
  if (a.type === 'withdraw') {
    add('Amount', S.hide ? hidden : `${usd(a.amount)} USDT`);
    add('Fee', S.hide ? hidden : `${usd(a.fee)} USDT`);
    add('You receive', S.hide ? hidden : `<b>${usd(a.netAmount)} USDT</b>`);
    if (address) add('To address', `${esc(address)} ${txCopy(address, i18n.text('Address'))}`, mono);
    add('Transaction ID', hash ? `${esc(hash)} ${txCopy(hash, i18n.text('Transaction ID'))}` : (['rejected', 'failed'].includes(a.status) ? '' : `<span class="muted">${i18n.html('Shown once the transfer is sent')}</span>`), hash ? mono : '');
  } else if (a.type === 'deposit') {
    add('Deposited', S.hide ? hidden : `${usd(a.amount)} USDT`);
    if (a.creditedAmount !== undefined) add('Credited', S.hide ? hidden : `<b>${usd(a.creditedAmount)} USDT</b>`);
    if (num(a.heldAmount) > 0) add('Held until minimum', S.hide ? hidden : `${usd(a.heldAmount)} USDT`);
    if (address) add('Deposit address', `${esc(address)} ${txCopy(address, i18n.text('Address'))}`, mono);
    add('Transaction ID', hash ? `${esc(hash)} ${txCopy(hash, i18n.text('Transaction ID'))}` : '', mono);
    if (a.blockNumber) add('Block', esc(String(a.blockNumber)));
  } else {
    if (a.amount) add('Amount', S.hide ? hidden : `${usd(a.amount)} USDT`);
    if (a.type === 'spot') { add('Pair', esc(a.symbol || (a.base ? `${a.base}/USDT` : ''))); add('Price', a.price ? `${price(a.price)} USDT` : ''); add('Quantity', a.quantity ? esc(qty(a.quantity)) : ''); }
    if (a.type === 'referral' && a.level) add('Level', esc(String(a.level)));
  }
  add('Reference', `${esc(String(a.id || '').slice(0, 8))} ${txCopy(a.id, i18n.text('Reference'))}`, mono);
  return rows.join('');
}

function txSheet(a) {
  const amt = activityAmount(a), st = txStatus(a);
  const hash = TX_HASH.test(a.txid || '') ? a.txid : '';
  return `${sheetHead('Transaction details')}
    <div class="tx-hero"><span class="act-ic ${esc(a.type)}">${icon(activityIconFor(a))}</span>
      <strong class="tx-amt ${amt.cls}">${S.hide ? '••••' : esc(amt.text)}<small>USDT</small></strong>
      <span class="tx-title">${esc(activityTitle(a))}</span>
      <em class="st st-${esc(st.key)}">${esc(st.text)}</em></div>
    ${a.type === 'withdraw' ? txTracker(a) : ''}
    <dl class="tx-list">${txDetailRows(a)}</dl>
    ${hash ? `<a class="btn btn-ghost tx-explorer" href="https://tronscan.org/#/transaction/${hash}" target="_blank" rel="noopener noreferrer">${i18n.html('View on {explorer}', { explorer: 'TRONSCAN' })} ${icon('external')}</a>` : ''}`;
}

function openTx(id) {
  const record = txRecord(id);
  if (record) openSheet(txSheet(record), { label: 'Transaction details' });
}

const WITHDRAW_STATUS = { requested: 'Under review', approved: 'Approved', submitted: 'Awaiting confirmation', confirmed: 'Sent', rejected: 'Rejected', pending: 'Pending', failed: 'Failed' };
const withdrawStatus = item => item.automatic && ['requested', 'approved'].includes(item.status) ? i18n.text('Processing') : (WITHDRAW_STATUS[item.status] ? i18n.text(WITHDRAW_STATUS[item.status]) : item.status);


/* A medal stepper for the six balance tiers, shown on phones. */

function homeView() {
  return velHome();
}
