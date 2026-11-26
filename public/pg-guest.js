'use strict';

/* Portgainy guest shell: language and theme controls, the slim public chrome for About and Support,
   and the shared document handlers. There is no landing page: signed-out visitors go straight to sign-in. */

const lt = (source, parameters) => i18n.html(source, parameters);

function guestLanguage() {
  const code = store.read('pg_guest_lang', 'en');
  return PG_READY_LANGUAGES.includes(code) ? code : 'en';
}

function langSelect() {
  const options = PORTGAINY_LANGUAGES.filter(item => PG_READY_LANGUAGES.includes(item.code))
    .map(item => `<option value="${esc(item.code)}" ${item.code === i18n.language ? 'selected' : ''}>${esc(item.name)}</option>`).join('');
  return `<label class="lang-select">${icon('globe')}<span class="sr">${lt('Language')}</span><select data-land-lang aria-label="${lt('Language')}">${options}</select>${icon('chevronDown')}</label>`;
}

const themeButton = () => `<button class="theme-btn" type="button" data-act="toggle-theme" aria-label="${lt('Toggle theme')}"><span class="th-sun">${icon('sun')}</span><span class="th-moon">${icon('moon')}</span></button>`;

function guestHeader() {
  return `<header class="gx"><div class="gx-in">
    <button class="gx-brand" type="button" data-act="auth-open" data-mode="login" aria-label="Portgainy">${brandLockup(32)}</button>
    <nav class="gx-nav" aria-label="${lt('Main')}"><button type="button" data-act="goto" data-view="about">${lt('About')}</button><button type="button" data-act="goto" data-view="support">${lt('Support')}</button></nav>
    <span class="gx-right">${themeButton()}${langSelect()}
      <button class="btn btn-ghost btn-sm" type="button" data-act="auth-open" data-mode="login">${lt('Log in')}</button>
      <button class="btn btn-main btn-sm" type="button" data-act="auth-open" data-mode="signup">${lt('Sign up')}</button></span>
  </div></header>`;
}

function guestFooter() {
  return `<footer class="gf"><p>${lt('Reward rates and program terms can change and are not guaranteed. Nothing on Portgainy is investment advice. Only use funds you can afford to lose.')}</p>
    <div class="gf-bottom"><span>Portgainy &copy; 2026</span><span>${lt('Account currency')}: USDT</span></div></footer>`;
}

function renderPublic() {
  const view = S.view === 'support' ? supportView : aboutView;
  app.innerHTML = `<div class="guest is-inner">${guestHeader()}<main class="content public-content">${view()}</main>${guestFooter()}</div>`;
}

Object.assign(acts, {
  'auth-open': el => { S.authMode = el.dataset.mode === 'signup' ? 'signup' : 'login'; location.hash = S.authMode === 'signup' ? '#signup' : '#signin'; },
  'toggle-theme': () => { PGTheme.toggle(); if (S.view === 'profile') render(); },
  'menu-toggle': el => {
    const wrap = el.closest('.gh-menu'), open = wrap.classList.toggle('is-open');
    el.setAttribute('aria-expanded', String(open));
  }
});

document.addEventListener('change', async event => {
  const select = event.target.closest?.('[data-land-lang]');
  if (!select || !PG_READY_LANGUAGES.includes(select.value)) return;
  const previous = i18n.language;
  try { if (!await i18n.use(select.value)) return; store.write('pg_guest_lang', select.value); updateDocumentLanguage(); render(); }
  catch { await i18n.use(previous).catch(() => {}); select.value = previous; }
});

document.addEventListener('click', event => {
  for (const wrap of document.querySelectorAll('.gh-menu.is-open')) {
    if (!wrap.contains(event.target) || event.target.closest('.gh-pop button')) { wrap.classList.remove('is-open'); wrap.querySelector('.gh-avatar')?.setAttribute('aria-expanded', 'false'); }
  }
});

document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  for (const wrap of document.querySelectorAll('.gh-menu.is-open')) wrap.classList.remove('is-open');
});
