'use strict';
const EARN_NOTICE_VERSION = 'vantirena-2026-11-v6';
let noticeSaving=false;
function earnTierTable() {
  return `<div class="earn-tiers"><table><thead><tr><th>${i18n.html('{account} balance', {account:'VIP'})}</th><th>${i18n.html('Daily rate')}</th></tr></thead><tbody>${EARN_TIERS.map(([min,max,rate])=>`<tr class="${S.user&&earnActive()&&earnRatePct()===rate?'is-current':''}"><td dir="ltr">${min.toLocaleString('en-US')} ${max?`– &lt;${max.toLocaleString('en-US')}`:'+'} USDT</td><td dir="ltr">${rate}%</td></tr>`).join('')}</tbody></table></div>`;
}
function earnNoticeContent() {
  return `<div class="earn-notice system-notice"><header><span class="tag tag-main">${i18n.html('Platform update')}</span><button class="sheet-x" type="button" data-act="dismiss-earn-notice" aria-label="${i18n.html('Close platform update')}">${icon('close')}</button></header>
    <h2 id="notice-title" tabindex="-1">${i18n.html('Welcome to {platform}', {platform:'Vantirena'})}</h2><p>${i18n.html('Here is what changed on the platform.')}</p>
    <section><h3>${i18n.html('A new name')}</h3><p>${i18n.html('{oldPlatform} is now {platform}. Your account, VIP balance, available balance and history stay exactly as they were.', {oldPlatform:'Vantira',platform:'Vantirena'})}</p></section>
    <section><h3>${i18n.html('Earn is now VIP')}</h3><p>${i18n.rich('{earn} starts at {strongStart}{minimum}{strongEnd}. Your {earn} balance at {claim} determines the rate for the {strongStart}whole balance{strongEnd}. At an exact boundary, the higher level applies.', {earn:'VIP',claim:'Claim',minimum:`${earnMin()} USDT`})}</p>${earnTierTable()}<p>${i18n.rich('Your first {claim} is available as soon as your {earn} balance reaches {strongStart}{minimum}{strongEnd}. After that, claim once per day when the countdown finishes. Rewards go to your {strongStart}available balance{strongEnd}, while your {earn} balance stays intact. Missed days do not accumulate.', {claim:'Claim',earn:'VIP',minimum:`${earnMin()} USDT`})}</p></section>
    <section><h3>${i18n.html('Markets and Trade are gone')}</h3><p>${i18n.html('{platform} now focuses on VIP levels, referrals and your USDT wallet. Crypto markets and trading are no longer part of the platform.', {platform:'Vantirena'})}</p></section>
    <section><h3>${i18n.html('Deposits, referrals and withdrawals')}</h3><p>${i18n.rich('Deposit {currency} through {strongStart}{network}{strongEnd} to your personal address. Confirmed deposits credit {earn}. Referral rewards credit your available balance: level {firstLevel} receives {levelOne} and level {secondLevel} receives {levelTwo} of claimed {earn} rewards. Withdraw from your available balance with your account password: {strongStart}{minimum} minimum, {fee} fee{strongEnd}.', {currency:'USDT',network:'TRON (TRC20)',earn:'VIP',firstLevel:'1',secondLevel:'2',levelOne:'10%',levelTwo:'5%',minimum:'10 USDT',fee:'2%'})}</p></section>
    <p class="fine">${i18n.html('Reward rates and program terms can change; future rewards are not guaranteed.')}</p>
    <p class="form-msg" id="notice-error" role="alert"></p><button class="btn btn-main btn-block" data-act="dismiss-earn-notice">${i18n.html('Got it')}${icon('check')}</button></div>`;
}
function showEarnNotice() {
  if(!S.user || S.user.earnNoticeSeen || S.earnNoticeActive)return;
  openSheet(earnNoticeContent(),{label:i18n.text('Platform update')});S.earnNoticeActive=true;
  sheetEl?.querySelector('#notice-title')?.focus({preventScroll:true});
}
async function dismissEarnNotice() {
  if (!S.earnNoticeActive || noticeSaving)return;
  noticeSaving=true;
  for(const button of sheetEl?.querySelectorAll('button')||[])button.disabled=true;
  try {
    const result=await api('/api/earn/notice/seen',{method:'POST',body:{version:EARN_NOTICE_VERSION}});
    S.user=result.user;S.earnNoticeActive=false;closeSheet();
  }catch(error){const el=document.querySelector('#notice-error');if(el)el.textContent=errMsg(error);for(const button of sheetEl?.querySelectorAll('button')||[])button.disabled=false;}
  finally {noticeSaving=false;}
}
document.addEventListener('keydown',event=>{
  if(!S.earnNoticeActive)return;
  if(event.key==='Escape'){event.preventDefault();dismissEarnNotice();}
  if(event.key==='Tab'){
    const buttons=[...sheetEl.querySelectorAll('button:not([disabled])')];if(!buttons.length)return;
    const first=buttons[0],last=buttons.at(-1);
    if(event.shiftKey&&(document.activeElement===first||document.activeElement.id==='notice-title')){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  }
});
