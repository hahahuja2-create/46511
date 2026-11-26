'use strict';

/* Portgainy views, part 2: wallet, deposit / withdraw / transfer sheets, history export and notifications. */

/* ---------------------------------------------------------------- assets */

function assetsView() {
  return walletPage();
}


function withdrawalsList() {
  const rows = S.wallet.withdrawals;
  if (!rows) return `<div class="skeleton-list"><i class="skeleton"></i><i class="skeleton"></i></div>`;
  if (!rows.length) return emptyState('withdraw', 'No withdrawals', 'Your withdrawal requests and their status will show here.');
  return `<ul class="acts">${rows.map(w => `<li class="act-li"><button class="act" type="button" data-act="open-tx" data-id="${esc(w.id)}" aria-label="${i18n.html('Transaction details')}"><span class="act-ic withdraw">${icon('withdraw')}</span><span class="act-copy"><b>${usd(w.amount)} USDT <em class="st withdrawal-state st-${esc(w.status)}">${esc(withdrawStatus(w))}</em></b><small>${i18n.html('{date} · to {address}', {date:dateText(w.createdAt),address:shortAddress(w.destination)})}</small></span><span class="act-amt">${S.hide ? '••••' : usd(w.netAmount)}<small>${i18n.html("net")}</small></span></button></li>`).join('')}</ul>`;
}

const shortAddress = value => (String(value || '').length > 14 ? `${value.slice(0, 6)}…${value.slice(-6)}` : String(value || ''));

function exportHistory() {
  const quoteCell = value => { const text = String(value ?? ''); return `"${(/^[=+@-]/.test(text) ? `'${text}` : text).replaceAll('"', '""')}"`; };
  const rows = [['Type', 'Date', 'Amount USDT', 'Status', 'Net USDT', 'Fee USDT', 'TxID'], ...S.activities.map(a => [activityTitle(a), a.at, num(a.amount), a.status || '', a.netAmount ?? '', a.fee ?? '', a.txid || ''])];
  const blob = new Blob(['﻿' + rows.map(r => r.map(quoteCell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url; link.download = 'portgainy-transactions.csv'; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ---------------------------------------------------------- wallet sheets */

function applyPayConfig(config = {}) {
  const mode = ['tron-watch-only', 'test-wallet', 'production-redirect'].includes(config.mode) ? config.mode : 'disabled';
  if (S.pay.mode !== mode || config.available !== true) S.pay.wallet = null;
  S.pay.mode = mode;
  S.pay.origin = mode === 'production-redirect' && config.origin === 'https://taskmall.app' ? config.origin : null;
  S.pay.available = mode !== 'disabled' && config.available === true;
  S.pay.withdrawals = mode !== 'disabled' && config.withdrawalsAvailable === true;
  S.pay.automaticWithdrawals = config.automaticWithdrawals === true;
  const min = Number(config.minimumWithdrawalAmount);
  S.pay.minimum = Number.isFinite(min) && min >= 10 ? min : 10;
  S.pay.depositMinimum = Number(config.minimumDepositAmount)||0;
  S.pay.networks = Array.isArray(config.networks) ? config.networks : [];
}

async function loadDepositAddress() {
  if (S.pay.mode !== 'tron-watch-only' || !S.pay.available || S.pay.wallet) return;
  S.pay.wallet = await api('/api/wallet/deposit-address', { method: 'POST', body: {}, timeout: 15000 });
}

let walletToken = 0;

async function openWallet(type) {
  if(S.user?.forgeEnabled && type==='transfer'){go('earn');return;}
  if (!S.user) return;
  const token = ++walletToken;
  const meta = { deposit: [i18n.text('Add funds'), i18n.text(S.user.forgeEnabled?'Deposit USDT to your wallet':'Deposit USDT to your VIP account')], withdraw: [i18n.text('Send USDT'), i18n.text(S.user.forgeEnabled?'Withdraw from your USDT wallet':'Withdraw from your available balance')], transfer: [i18n.text('Transfer'), i18n.text('Move USDT from your available balance to VIP')] }[type];
  openSheet(`${sheetHead(meta[0], meta[1])}<div class="sheet-loading"><i class="spinner"></i><span>${i18n.html(type === 'transfer' ? 'Preparing…' : 'Checking payment availability…')}</span></div>`, { label: meta[0] });
  try {
    if (type !== 'transfer') {
      applyPayConfig(await api('/api/payment-config', { timeout: 15000 }));
      if (type === 'deposit') await loadDepositAddress();
    }
    if (token !== walletToken) return;
    openSheet(walletSheet(type, meta), { label: meta[0] });
    bindWalletSheet(type);
  } catch (error) {
    if (token !== walletToken) return;
    openSheet(`${sheetHead(meta[0], meta[1])}${emptyState('info', 'Temporarily unavailable', errMsg(error), `<button class="btn btn-main btn-sm" data-act="retry-wallet" data-type="${type}">${i18n.html("Try again")}</button>`)}`, { label: meta[0] });
  }
}

function maxAmount() { return clamp(num(S.user.withdrawBalance), 0, 100000).toFixed(6).replace(/\.?0+$/, '') || '0'; }

function amountField(type) {
  const min = type === 'withdraw' ? S.pay.minimum : '0.000001';
  return `<div class="avail"><span>${i18n.html(S.user.forgeEnabled?'Available USDT balance':'Available balance')}</span><b data-wallet-available>${S.hide ? '••••••' : usdExact(S.user.withdrawBalance)} USDT</b></div>
    <label class="field"><span>${i18n.html("Amount")}</span><div class="control"><input id="wallet-amount" name="amount" type="number" inputmode="decimal" min="${min}" max="100000" step="0.000001" placeholder="0.00" required><b class="suffix">USDT</b><button class="max-btn" type="button" data-act="wallet-max">${i18n.html("MAX")}</button></div></label>${type === 'withdraw' ? `<p class="hint" id="withdrawal-minimum">${i18n.html('Minimum withdrawal request: {amount} {currency}.', {amount:S.pay.minimum,currency:'USDT'})}</p>` : ''}`;
}

function networkSelect() {
  if (S.pay.networks.length < 2) return S.pay.networks[0] ? `<input type="hidden" name="network" value="${esc(S.pay.networks[0].id)}"><div class="net-chip">${icon('globe')}${esc(S.pay.networks[0].label)}</div>` : '';
  return `<label class="field"><span>${i18n.html("Network")}</span><div class="control select">${icon('globe')}<select name="network" data-deposit-network>${S.pay.networks.map(n => `<option value="${esc(n.id)}">${esc(n.label)}</option>`).join('')}</select></div></label>`;
}

function walletSheet(type, meta) {
  const head = sheetHead(meta[0], meta[1]);
  const depositRule=S.user?.forgeEnabled?`<p class="note">${icon('info')}${i18n.html('Minimum credit: 10 USDT. Smaller confirmed deposits accumulate until the threshold is reached.')}${S.user.pendingDeposit?` ${i18n.html('Awaiting minimum')}: ${money(S.user.pendingDeposit)} USDT`:''}</p>`:'';
  const unavailable = text => `${head}${emptyState('info', 'Temporarily unavailable', text, `<button class="btn btn-main btn-sm" data-act="retry-wallet" data-type="${type}">${i18n.html("Try again")}</button>`)}`;
  if (type !== 'transfer' && S.pay.mode === 'production-redirect' && S.pay.origin) {
    return `${head}<p class="note">${icon('shield')}${i18n.html('For your security, this action opens on our verified payments site.')}</p><a class="btn btn-main btn-lg btn-block" href="${esc(S.pay.origin)}/?wallet=${type}#wallet" rel="noopener">${i18n.html('Continue securely')}${icon('external')}</a>`;
  }
  if (type === 'deposit') {
    if (!S.pay.available) return unavailable('Deposits are temporarily unavailable.');
    if (S.pay.mode === 'tron-watch-only') {
      const w = S.pay.wallet;
      if (!w) return unavailable('Deposits are temporarily unavailable.');
      return `${head}${depositRule}<div class="dep">
        <div class="dep-net"><span class="tag tag-main">USDT</span><span class="tag">TRON · TRC20</span></div>
        <div class="qr"><img class="deposit-qr" src="${esc(w.qr)}" width="180" height="180" alt="${i18n.html('Deposit QR code')}"></div>
        <label class="field"><span>${i18n.html("Deposit address")}</span><div class="control addr"><input id="dep-address" type="text" value="${esc(w.address)}" readonly><button class="max-btn" type="button" data-act="copy-address">${i18n.html("COPY")}</button></div></label>
        <ul class="steps"><li>${icon('shield')}${i18n.html('Send only {currency} on the {network} network.', {currency:'USDT',network:'TRON (TRC20)'})}</li><li>${icon('clock')}${i18n.html(S.user.forgeEnabled?'Confirmed deposits credit your USDT wallet once the 10 USDT threshold is met.':'Your balance updates automatically after blockchain confirmation.')}</li><li>${icon('earn')}${S.user.forgeEnabled?i18n.html('One USDT wallet for purchases, trading and withdrawals.'):i18n.html('Deposits credit your {account} account.', {account:'VIP'})}</li></ul>
        <a class="link-btn" href="${esc(w.explorer)}" target="_blank" rel="noopener noreferrer">${i18n.html('View address on {explorer}', {explorer:'TRONSCAN'})} ${icon('external')}</a></div>`;
    }
    const first = S.pay.networks[0] || { address: '' };
    return `${head}${depositRule}<form class="form modal-wallet-form" data-form="wallet" data-wallet-form="deposit" data-type="deposit">${networkSelect()}<label class="field"><span>${i18n.html("Deposit address")}</span><div class="control addr"><input id="dep-address" data-deposit-address type="text" value="${esc(first.address)}" readonly><button class="max-btn" type="button" data-act="copy-address">${i18n.html("COPY")}</button></div></label>
      <label class="field"><span>${i18n.html("Amount")}</span><div class="control"><input name="amount" type="number" min="${S.user.forgeEnabled?10:5}" step="0.01" placeholder="25.00" required><b class="suffix">USDT</b></div></label><p class="form-msg" role="alert"></p><button class="btn btn-main btn-lg btn-block" type="submit">${i18n.html(S.user.forgeEnabled?'Add funds':'Add to VIP balance')}</button></form>`;
  }
  if (type === 'withdraw') {
    if (!S.pay.withdrawals) return unavailable('Withdrawals are temporarily unavailable.');
    const strict = S.pay.mode === 'tron-watch-only';
    const fee = num(S.user.withdrawalFeeRate, 0.02), bps = BigInt(Math.round(fee * 10000));
    return `${head}<form class="form modal-wallet-form" data-form="wallet" data-wallet-form="withdraw" data-type="withdraw">${networkSelect()}${amountField('withdraw')}
      <label class="field"><span>${i18n.html("Wallet address")}</span><div class="control">${icon('wallet')}<input name="wallet" type="text" minlength="${strict ? 34 : 12}" maxlength="${strict ? 34 : 120}" placeholder="${i18n.html(strict ? 'TRON (TRC20) address' : 'USDT wallet address')}" autocomplete="off" spellcheck="false" required></div></label>
      ${strict ? `<label class="field"><span>${i18n.html("Confirm account password")}</span><div class="control">${icon('lock')}<input name="password" type="password" autocomplete="current-password" maxlength="128" required></div></label>` : ''}
      <div class="summary"><span>${i18n.html('Fee ({rate}%)', {rate:+(fee * 100).toFixed(2)})}</span><output data-withdraw-fee>0.00 USDT</output><span>${i18n.html("You receive")}</span><output data-withdraw-net>0.00 USDT</output></div>
      <p class="form-msg" role="alert"></p><button class="btn btn-main btn-lg btn-block" type="submit">${i18n.html("Request withdrawal")}</button>
      <p class="fine">${icon('info')}${i18n.html(S.pay.automaticWithdrawals ? 'Withdrawals are processed automatically when funds and network resources are available.' : 'Withdrawals are reviewed before they are sent.')} ${i18n.html('Never share your password or seed phrase with anyone.')}</p></form>`;
  }
  return `${head}<form class="form modal-wallet-form" data-form="wallet" data-wallet-form="transfer" data-type="transfer"><div class="route"><span>${icon('wallet')}Available</span>${icon('arrow')}<span>${icon('earn')}VIP</span></div>${amountField('transfer')}<p class="form-msg" role="alert"></p><button class="btn btn-main btn-lg btn-block" type="submit">${i18n.html("Transfer to VIP")}</button><p class="fine">${icon('info')}${i18n.html('Funds in VIP generate your daily reward. Move them back only through a withdrawal review.')}</p></form>`;
}

function bindWalletSheet(type) {
  const amount = document.querySelector('#wallet-amount');
  if (type === 'withdraw' && amount) {
    const bps = BigInt(Math.round(num(S.user.withdrawalFeeRate, 0.02) * 10000));
    const update = () => {
      let net = 0, fee = 0;
      if (/^\d+(\.\d{1,6})?$/.test(amount.value) && Number(amount.value) <= 100000) {
        const [whole, fraction = ''] = amount.value.split('.');
        const gross = BigInt(whole) * 1000000n + BigInt(fraction.padEnd(6, '0'));
        const cut = (gross * bps + 5000n) / 10000n;
        fee = Number(cut) / 1e6; net = Number(gross - cut) / 1e6;
      }
      document.querySelector('[data-withdraw-fee]').textContent = `${usdExact(fee)} USDT`;
      document.querySelector('[data-withdraw-net]').textContent = `${usdExact(net)} USDT`;
    };
    amount.addEventListener('input', update);
    document.querySelector('[data-act="wallet-max"]')?.addEventListener('click', () => setTimeout(update));
  }
  document.querySelector('[data-deposit-network]')?.addEventListener('change', event => {
    const field = document.querySelector('[data-deposit-address]');
    if (field) field.value = S.pay.networks.find(n => n.id === event.target.value)?.address || '';
  });
}

async function submitWallet(form) {
  if (S.busy) return;
  const type = form.dataset.type, data = new FormData(form), msg = form.querySelector('.form-msg'), button = form.querySelector('button[type="submit"]');
  const endpoints = { deposit: '/api/wallet/deposit', withdraw: '/api/wallet/withdraw', transfer: '/api/wallet/transfer' };
  const done = { deposit: i18n.text(S.user.forgeEnabled?'Deposit added to your USDT wallet':'Deposit added to VIP balance'), withdraw: i18n.text('Withdrawal requested'), transfer: i18n.text('Transferred to VIP') };
  const amount = data.get('amount');
  if (!(num(amount) > 0)) { msg.textContent = i18n.text('Enter a valid USDT amount.'); return; }
  S.busy = true; button.disabled = true; msg.textContent = '';
  try {
    const body = { amount };
    if (data.has('wallet')) body.wallet = data.get('wallet');
    if (data.has('network')) body.network = data.get('network');
    if (type === 'withdraw' && S.pay.mode === 'tron-watch-only') {
      form.dataset.requestKey ||= crypto.randomUUID();
      body.requestKey = form.dataset.requestKey; body.password = data.get('password');
    }
    const result = await api(endpoints[type], { method: 'POST', body });
    if (result.user) S.user = result.user;
    if (result.activities) S.activities = result.activities;
    closeSheet();
    await refreshAccount();
    render();
    toast(done[type], 'ok', type === 'withdraw' ? 'Request sent' : 'Done');
  } catch (error) {
    msg.textContent = errMsg(error); button.disabled = false;
  } finally { S.busy = false; }
}

/* ----------------------------------------------------------------- notices */

function openNotices() {
  const acts = S.activities.slice(0, 12);
  const promo = S.user.referralPromotion;
  openSheet(`${sheetHead('Notifications', 'Account activity')}${activityList(12)}${acts.length ? '' : ''}`, { label: 'Notifications' });
}
