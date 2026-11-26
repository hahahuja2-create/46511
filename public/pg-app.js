'use strict';

/*
 * Portgainy app screens: the membership pass, Home, the VIP levels page, Wallet and the Profile header.
 * One responsive layout serves phone and desktop; the shell (sidebar / dock) lives in pg-views.js.
 */

/* ------------------------------------------------------------------ VIP levels */

const VIP_TIERS = [
  { n: 1, name: 'Bronze', gem: '#cf8f5d' }, { n: 2, name: 'Silver', gem: '#cfd6df' }, { n: 3, name: 'Gold', gem: '#e3b95f' },
  { n: 4, name: 'Platinum', gem: '#a9c6da' }, { n: 5, name: 'Diamond', gem: '#8fe6ff' }, { n: 6, name: 'Black', gem: '#46403a' },
  { n: 7, name: 'Elite', gem: '#a78bfa' }, { n: 8, name: 'Sapphire', gem: '#60a5fa' }, { n: 9, name: 'Royal', gem: '#fbbf24' }
];
const nf0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

function vipState() {
  const bal = num(S.user.lockedBalance);
  let idx = -1;
  EARN_TIERS.forEach(([min], i) => { if (bal >= min) idx = i; });
  const next = EARN_TIERS[idx + 1] || null;
  const floor = idx < 0 ? 0 : EARN_TIERS[idx][0];
  return { bal, idx, tier: idx >= 0 ? VIP_TIERS[idx] : null, next, nextTier: next ? VIP_TIERS[idx + 1] : null, rate: idx >= 0 ? EARN_TIERS[idx][2] : 0,
    progress: next ? clamp((bal - floor) / (next[0] - floor), 0, 1) : 1 };
}

const tierRange = ([min, max]) => max ? `${nf0.format(min)} – <${nf0.format(max)}` : `${nf0.format(min)}+`;
const gemStyle = tier => `--gem:${tier ? tier.gem : 'var(--ink-4)'}`;
const levelName = tier => `VIP ${tier.n} <i>·</i> ${esc(i18n.text(tier.name))}`;

const qa = (act, glyph, label, { view = '', cls = '' } = {}) =>
  `<button class="qa ${cls}" type="button" data-act="${act}" ${view ? `data-view="${view}"` : ''}><span class="qa-ic">${icon(glyph)}</span><span>${i18n.html(label)}</span></button>`;

/* ------------------------------------------------------------ membership pass */

function claimControl(block = true) {
  const e = S.earn, active = earnActive(), ready = claimReady(), reward = active ? (e?.nextReward ?? 0) : 0;
  const cls = `btn btn-lg ${block ? 'btn-block' : ''}`;
  if (!active) return `<button class="${cls} btn-main" type="button" data-act="wallet-deposit">${icon('deposit')}${i18n.html('Add {amount} {currency}', { amount: usd(earnShortfall()), currency: 'USDT' })}</button>`;
  return `<button class="${cls} ${ready ? 'btn-main' : 'btn-dark'}" type="button" data-act="claim" data-claim-btn ${ready ? '' : 'disabled'}><span data-claim-label>${ready ? i18n.html('Claim reward') : i18n.html(reward > 0 ? 'Waiting for next claim' : 'No reward available')}</span></button>`;
}

function passCard({ detail = false } = {}) {
  const u = S.user, v = vipState(), forge = u.forgeEnabled, active = earnActive(), ready = !forge && claimReady();
  const e = S.earn;
  const level = forge ? i18n.html('Forge collector') : v.tier ? levelName(v.tier) : i18n.html('Not started');
  const timer = !forge && active ? (ready ? i18n.html('Ready') : e ? clock(e.nextClaimAt - serverNow()) : '--:--:--') : '—';
  return `<article class="pass tier-${v.tier ? v.tier.n : 0} ${ready ? 'is-ready' : ''}" style="${gemStyle(v.tier)}">
    <div class="pass-stripe" aria-hidden="true"><i></i><i></i><i></i></div>
    <div class="pass-top"><span class="pass-level"><i class="gem"></i><b>${level}</b></span><button class="eye-btn" type="button" data-act="toggle-hide" aria-label="${i18n.html(S.hide ? 'Show balances' : 'Hide balances')}">${icon(S.hide ? 'eyeOff' : 'eye')}</button></div>
    <div class="pass-bal"><small>${i18n.html('Total balance')}</small><strong><i>$</i><span data-total>${S.hide ? '••••••' : usd(totalValue())}</span></strong><span class="pnl-note">${i18n.html('Earned all-time')} <b>${money(u.earnedTotal)}</b> USDT</span></div>
    <div class="pass-row">
      <div><small>${i18n.html('Daily rate')}</small><b>${!forge && active ? `${earnRatePct()}%` : '—'}</b></div>
      <div><small>${i18n.html('Next claim')}</small><b ${!forge && active ? 'data-earn-timer' : ''}>${timer}</b></div>
      <div><small>${i18n.html('VIP balance')}</small><b>${money(u.lockedBalance)}</b></div>
    </div>
    ${forge ? '' : `<div class="pass-cta">${claimControl()}${detail ? '<p class="form-msg" id="earn-error" role="alert"></p>' : ''}</div>`}
    <div class="pass-foot"><span>${i18n.html('Member ID')} · ${esc(u.inviteCode)}</span><span class="pass-brand">PORTGAINY</span></div>
  </article>`;
}

/* ------------------------------------------------------------------- ascent */

function ladderCard() {
  const v = vipState();
  const line = !earnActive() ? i18n.html('Add {amount} USDT to reach VIP {n}', { amount: usd(earnShortfall()), n: 1 })
    : v.next ? i18n.html('Add {amount} USDT to reach VIP {n}', { amount: usd(Math.max(0, v.next[0] - v.bal)), n: v.idx + 2 }) : i18n.html('You have reached the highest VIP level');
  const rungs = EARN_TIERS.map((t, i) => `<li class="rung ${i <= v.idx ? 'is-done' : ''} ${i === v.idx + 1 ? 'is-next' : ''}" style="${gemStyle(VIP_TIERS[i])}"><i></i><b>${i + 1}</b></li>`).join('');
  return `<article class="card ladder"><div class="sec-head"><h2>${i18n.html('Your ascent')}</h2>${moreLink('VIP levels', 'earn')}</div>
    <p class="ladder-line">${line}</p>
    <ol class="rungs" style="--k:${(Math.max(v.idx, 0) + (v.next ? v.progress : 0)) / (EARN_TIERS.length - 1)}">${rungs}</ol></article>`;
}

/* --------------------------------------------------------------------- home */

function velHome() {
  const u = S.user;
  return `<div class="page vhome">
    <header class="vh-head"><small>${i18n.html('Welcome back')}</small><h1>${esc(u.name)}</h1></header>
    ${passCard()}
    <nav class="qas" aria-label="${i18n.html('Quick actions')}">${qa('wallet-deposit', 'plus', 'Top up', { cls: 'is-primary' })}${qa('wallet-withdraw', 'withdraw', 'Send')}${qa('goto', 'crown', 'VIP', { view: 'earn' })}${qa('goto', 'users', 'Referral', { view: 'referrals' })}</nav>
    ${u.forgeEnabled ? '' : ladderCard()}
    <article class="card">${sectionHead('Allocation')}${allocationBar()}</article>
    <section class="card home-activity">${sectionHead('Recent activity', moreLink('History', 'assets'))}${activityList(5)}</section>
    <button class="vh-invite" type="button" data-act="goto" data-view="referrals"><span><b>${i18n.html('Invite friends')}</b><small>${i18n.html('Share your link and grow your network')}</small></span><i>${i18n.html('Get my link')}${icon('chevron')}</i></button>
  </div>`;
}

/* ------------------------------------------------------------- VIP levels page */

function vipLevelList() {
  const v = vipState();
  return `<ol class="vlevels">${EARN_TIERS.map((t, i) => {
    const tier = VIP_TIERS[i], state = i === v.idx ? 'current' : i < v.idx ? 'reached' : 'locked';
    const label = state === 'current' ? 'Current' : state === 'reached' ? 'Reached' : 'Locked';
    return `<li class="vl is-${state}" style="${gemStyle(tier)}"><span class="vl-gem"><i>${tier.n}</i></span>
      <span class="vl-copy"><b>${levelName(tier)}</b><small>${tierRange(t)} USDT</small></span>
      <span class="vl-rate"><b>${t[2]}%</b><small>${i18n.html('per day')}</small></span>
      <em class="vl-state">${i18n.html(label)}</em></li>`;
  }).join('')}</ol>`;
}

function vipPage() {
  const u = S.user, rate = earnRatePct(), short = earnShortfall(), active = short === 0;
  const history = S.activities.filter(a => a.type === 'earn' || a.type === 'referral');
  const calcBase = Math.max(earnMin(), Math.round(num(u.lockedBalance)));
  const rewardBalance = num(S.earn?.earningBalance ?? u.lockedBalance);
  const appliedRate = S.earn?.rate == null ? rate : num(S.earn.rate) * 100;
  const reward = active ? (S.earn?.nextReward ?? rewardBalance * (appliedRate / 100)) : 0;
  const gate = active ? '' : `<article class="card gate"><div class="gate-top"><span>${icon('lock')}${i18n.html('{account} starts at {amount} {currency}', { account: 'VIP', amount: earnMin(), currency: 'USDT' })}</span><b>${i18n.html('{amount} {currency} to go', { amount: usd(short), currency: 'USDT' })}</b></div><i class="xp is-lg"><b style="width:${Math.round(clamp(num(u.lockedBalance) / earnMin(), 0, 1) * 100)}%"></b></i><p>${i18n.html('Your {account} balance is {balance} {currency}. Add {amount} {currency} more to unlock daily rewards.', { account: 'VIP', balance: money(u.lockedBalance), amount: usd(short), currency: 'USDT' })}</p></article>`;
  return `<div class="page vip">
    <header class="page-head"><div><h1>VIP</h1><p>${i18n.html('Your balance. Your daily reward.')}</p></div><span class="tag tag-main">${icon('clock')}${i18n.html('{duration} cycle', { duration: '24h' })}</span></header>
    <div class="vh-grid">
      <div class="vh-main">
        ${passCard({ detail: true })}
        ${gate}
        ${active ? `<article class="card reward"><div><small>${i18n.html('Next reward')}</small><strong>${usdExact(reward)} <span>USDT</span></strong></div><p>${i18n.html('Daily rate')}: ${appliedRate}% × ${i18n.html('VIP balance')}: ${usdExact(rewardBalance)} USDT = ${usdExact(reward)} USDT</p></article>` : ''}
        <section class="card">${sectionHead('VIP levels')}${vipLevelList()}<p class="fine">${i18n.html('The rate applies to your entire VIP balance at the time of Claim. Below {value0} {value1}, no daily reward is available.', { value0: String(earnMin()), value1: 'USDT' })}</p></section>
        <section class="card calc">${sectionHead('Reward calculator', `<span class="tag">${i18n.html('Estimate')}</span>`)}
          <label class="field"><span>${i18n.html('VIP balance')}</span><div class="control"><input id="calc-amount" type="number" inputmode="decimal" min="0" step="1" value="${calcBase}"><b class="suffix">USDT</b></div></label>
          <input id="calc-range" class="range" type="range" min="${earnMin()}" max="10000" step="10" value="${clamp(calcBase, earnMin(), 10000)}" aria-label="${i18n.html('Balance')}">
          <div class="calc-out" data-rate="${rate}"><span><small>${i18n.html('Daily')}</small><b data-calc="d">—</b></span><span><small>${i18n.html('{value0} days', { value0: '7' })}</small><b data-calc="w">—</b></span><span><small>${i18n.html('{value0} days', { value0: '30' })}</small><b data-calc="m">—</b></span></div>
          <p class="fine">${icon('info')}${i18n.html('Estimate for an unchanged balance and one claim per day. The calculator uses the VIP level for the entered balance. Future rewards are not guaranteed.')}</p></section>
      </div>
      <div class="vh-side">
        <section class="tiles">
          <article class="tile"><span class="tile-ic">${icon('crown')}</span><small>${i18n.html('VIP balance')}</small><strong>${money(u.lockedBalance)}</strong><div class="btn-row"><button class="btn btn-main btn-sm" data-act="wallet-deposit">${icon('deposit')}${i18n.html('Deposit')}</button><button class="btn btn-ghost btn-sm" data-act="wallet-transfer">${icon('transfer')}${i18n.html('Move')}</button></div></article>
          <article class="tile"><span class="tile-ic is-cyan">${icon('wallet')}</span><small>${i18n.html('Available balance')}</small><strong>${money(u.withdrawBalance)}</strong><div class="btn-row"><button class="btn btn-ghost btn-sm" data-act="wallet-withdraw">${icon('withdraw')}${i18n.html('Send')}</button></div></article>
        </section>
        <section class="rules">${[['clock', i18n.text('One claim per day'), i18n.text('Your first Claim is available when you start VIP. Later claims open when the countdown finishes. Missed days do not accumulate.')], ['wallet', i18n.text('Principal stays put'), i18n.text('Claims do not reduce your VIP balance. Rewards credit your available balance.')], ['users', i18n.text('Two referral levels'), i18n.text('Level {levelOne} earns {firstRate}% and level {levelTwo} earns {secondRate}% of each claimed reward.', { levelOne: 1, firstRate: 10, levelTwo: 2, secondRate: 5 })]].map(([g, t, d]) => `<article>${icon(g)}<div><b>${esc(t)}</b><p>${esc(d)}</p></div></article>`).join('')}</section>
        <section class="card">${sectionHead('VIP activity', moreLink('Referrals', 'referrals'))}${history.length ? `<ul class="acts">${history.slice(0, 12).map(a => `<li class="act"><span class="act-ic ${a.type}">${icon(activityIconFor(a))}</span><span class="act-copy"><b>${esc(activityTitle(a))}</b><small>${esc(dateText(a.at))}</small></span><span class="act-amt up">${S.hide ? '••••' : `+${usd(a.amount)}`}<small>USDT</small></span></li>`).join('')}</ul>` : emptyState('crown', 'No VIP activity yet', 'Your claims and referral rewards will be listed here.')}</section>
      </div>
    </div></div>`;
}

/* ------------------------------------------------------------------ wallet */

function walletRow({ name, sub, amount, fiat }) {
  return `<div class="wr">${usdtMark(40)}<span class="wr-name"><b>${name}</b><small>${sub}</small></span><span class="wr-amt"><b>${amount}</b><small>${fiat}</small></span></div>`;
}

function walletPage() {
  const u = S.user, forge = u.forgeEnabled, tab = S.assetsTab === 'history' ? 'history' : 'overview';
  const rows = [];
  rows.push(walletRow({ name: i18n.html(forge ? 'USDT wallet' : 'Available balance'), sub: i18n.html('Rewards and withdrawals'), amount: money(u.withdrawBalance), fiat: `$${S.hide ? '••••' : usd(u.withdrawBalance)}` }));
  if (!forge) rows.push(walletRow({ name: i18n.html('VIP'), sub: i18n.html('Principal for daily rewards'), amount: money(u.lockedBalance), fiat: `$${S.hide ? '••••' : usd(u.lockedBalance)}` }));
  if (num(u.reservedBalance) > 0) rows.push(walletRow({ name: i18n.html('Reserved'), sub: i18n.html('Pending withdrawals'), amount: money(u.reservedBalance), fiat: `$${S.hide ? '••••' : usd(u.reservedBalance)}` }));
  const filters = [['all', 'All'], ['deposit', 'Deposits'], ['withdraw', 'Withdrawals'], ['transfer', 'Transfers'], ['rewards', 'Rewards']];
  const body = tab === 'overview' ? `
      <button class="wl-row" type="button" data-act="goto" data-view="earn"><span class="wl-ic">${icon(forge ? 'layers' : 'crown')}</span><span class="wl-copy"><b>${i18n.html(forge ? 'Forge' : 'VIP')}</b><small>${forge ? `${S.forge?.cores?.length || 0} ${i18n.html('Cores')} · ${money(S.forge?.pending || 0)} USDT ${i18n.html('ready')}` : earnActive() ? i18n.html('Your VIP account is active') : i18n.html('Add funds to start earning')}</small></span>${icon('chevron')}</button>
      <section class="card"><div class="sec-head"><h2>${i18n.html('Balances')}</h2></div><div class="wrs">${rows.join('')}</div></section>
      <section class="card">${sectionHead('Allocation')}${allocationBar()}</section>`
    : `<section class="card"><div class="sec-head"><h2>${i18n.html('Transactions')}</h2><button class="btn btn-ghost btn-sm" type="button" data-act="export-history" ${S.activities.length ? '' : 'disabled'}>${icon('download')}${i18n.html('CSV')}</button></div>
      <div class="chips">${filters.map(([k, l]) => `<button class="${S.historyFilter === k ? 'is-on' : ''}" type="button" data-act="history-filter" data-filter="${k}">${i18n.html(l)}</button>`).join('')}</div>
      <div id="history-body">${activityList(0, S.historyFilter)}</div></section>
      <section class="card" id="withdraw-status">${sectionHead('Withdrawal requests')}${withdrawalsList()}</section>`;
  return `<div class="page pwallet">
    <div class="pw-tabs" role="tablist"><button class="${tab === 'overview' ? 'is-on' : ''}" type="button" role="tab" data-act="assets-tab" data-tab="overview">${i18n.html('Assets')}</button><button class="${tab === 'history' ? 'is-on' : ''}" type="button" role="tab" data-act="assets-tab" data-tab="history">${i18n.html('History')}</button></div>
    <section class="pw-card"><div class="pass-stripe" aria-hidden="true"><i></i><i></i><i></i></div><div class="pw-top"><span>${i18n.html('Total balance')}<button class="eye-btn" type="button" data-act="toggle-hide" aria-label="${i18n.html(S.hide ? 'Show balances' : 'Hide balances')}">${icon(S.hide ? 'eyeOff' : 'eye')}</button></span></div>
      <strong class="pw-num"><i>$</i><span data-total>${S.hide ? '••••••' : usd(totalValue())}</span></strong>
      <div class="qas">${qa('wallet-deposit', 'plus', 'Top up', { cls: 'is-primary' })}${qa('wallet-withdraw', 'withdraw', 'Withdraw')}${forge ? qa('goto', 'layers', 'Forge', { view: 'earn' }) : qa('wallet-transfer', 'transfer', 'Transfer')}${qa('assets-history', 'receipt', 'History')}</div></section>
    <div class="pw-body">${body}</div></div>`;
}

function allocationBar() {
  const u = S.user;
  const parts = u.forgeEnabled
    ? [[i18n.text('USDT wallet'), num(u.withdrawBalance), 'var(--cyan)'], [i18n.text('Pending withdrawals'), num(u.reservedBalance), 'var(--amber)']]
    : [[i18n.text('Available'), num(u.withdrawBalance), 'var(--cyan)'], [i18n.text('VIP'), num(u.lockedBalance), 'var(--accent)'], [i18n.text('Reserved'), num(u.reservedBalance), 'var(--amber)']];
  const sum = parts.reduce((s, p) => s + p[1], 0);
  const bar = sum > 0 ? parts.filter(p => p[1] > 0).map(p => `<i style="flex:${p[1]};background:${p[2]}" title="${esc(p[0])}"></i>`).join('') : '<i style="flex:1;background:var(--line-2)"></i>';
  return `<div class="alloc-bar">${bar}</div><ul class="alloc-legend">${parts.map(p => `<li><i style="background:${p[2]}"></i><span>${esc(p[0])}</span><b>${sum > 0 ? ((p[1] / sum) * 100).toFixed(1) : '0.0'}%</b></li>`).join('')}</ul>`;
}

/* ----------------------------------------------------------------- profile */

function profileHead() {
  const u = S.user, forge = u.forgeEnabled, r = stats(), v = vipState();
  const levelValue = forge ? i18n.html('Forge collector') : v.tier ? levelName(v.tier) : i18n.html('Not started');
  return `<section class="pp-head"><div class="pp-id"><span class="pp-avatar" style="${gemStyle(v.tier)}">${esc(String(u.name || 'V').trim().charAt(0).toUpperCase() || 'V')}</span><span class="pp-name"><b>${esc(u.name)}</b><small>${i18n.html('ID')}: ${esc(u.inviteCode)}<button type="button" data-act="copy-invite" aria-label="${i18n.html('Copy code')}">${icon('copy')}</button></small></span>
      <button class="pp-edit" type="button" data-act="focus-name" aria-label="${i18n.html('Edit profile')}">${icon('settings')}<span>${i18n.html('Edit profile')}</span></button></div>
    <div class="pp-tiles"><button type="button" data-act="goto" data-view="earn"><span class="pp-ic" style="${gemStyle(v.tier)}">${icon('crown')}</span><small>${i18n.html(forge ? 'Collection' : 'VIP level')}</small><b>${levelValue}</b></button>
      <button type="button" data-act="goto" data-view="referrals"><span class="pp-ic">${icon('users')}</span><small>${i18n.html('Invites')}</small><b>${r.invites} <em>${i18n.html('members')}</em></b></button></div></section>`;
}

Object.assign(acts, {
  'assets-history': () => { S.assetsTab = 'history'; go('assets'); },
  'focus-name': () => { const input = document.querySelector('form[data-form="profile"] input[name="name"]'); input?.scrollIntoView({ block: 'center', behavior: 'smooth' }); setTimeout(() => input?.focus({ preventScroll: true }), 250); }
});
