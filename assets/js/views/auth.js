import { CONFIG } from '../config.js';
import { S, esc, toast, applyUi } from '../core.js';
import { t } from '../i18n.js';
import { pageHead, needLogin } from './components.js';
import { linkBoxHTML, wireLinkBox } from './studentpage.js';

const langOptions = (sel) => Object.entries(CONFIG.languages).filter(([, L]) => L.enabled)
  .map(([c, L]) => `<option value="${c}"${c === sel ? ' selected' : ''}>${esc(L.name)} — ${esc(L.ar)}</option>`).join('');

const errMsg = (e) => {
  const m = e?.message || String(e);
  if (/Invalid login/i.test(m)) return 'الإيميل أو كلمة المرور غير صحيحة';
  if (/Email not confirmed/i.test(m)) return 'أكّد بريدك أولًا من الرسالة التي وصلتك';
  if (/rate limit/i.test(m)) return 'محاولات كثيرة، انتظر قليلًا ثم أعد المحاولة';
  return m;
};

export function login(app) {
  if (S.me) { location.hash = ['supervisor', 'admin'].includes(S.me.role) ? '#/supervisor' : '#/me'; return; }
  app.innerHTML = `${pageHead(t('login'))}
  <div class="wrap" style="max-width:520px;padding-top:24px">
    <form class="card stack" id="f">
      <div class="field"><label for="em">${t('email')}</label><input id="em" type="email" required autocomplete="email" inputmode="email"></div>
      <div class="field"><label for="pw">${t('password')}</label><input id="pw" type="password" autocomplete="current-password" ${S.db.mode === 'local' ? '' : 'required'} minlength="6"></div>
      <button class="btn primary" type="submit">${t('login')}</button>
      <div class="row between small">
        <button class="btn ghost sm" type="button" id="magic">✉ ${t('magic')}</button>
        <button class="btn ghost sm" type="button" id="reset">نسيت كلمة المرور؟</button>
      </div>
      <p class="small center">${t('or')} <a href="#/signup">${t('signup')}</a></p>
      ${S.db.mode === 'local' ? `<p class="notice small">وضع التجربة: جرّب حساب المشرف <b dir="ltr">mushrif@demo.test</b> أو الطالبة <b dir="ltr">amina@demo.test</b> (بلا كلمة مرور).</p>` : ''}
    </form>
  </div>`;
  const em = app.querySelector('#em');
  app.querySelector('#f').onsubmit = async (e) => {
    e.preventDefault();
    try { await S.db.signIn({ email: em.value, password: app.querySelector('#pw').value }); }
    catch (er) { toast(errMsg(er), 4000); }
  };
  app.querySelector('#magic').onclick = async () => {
    if (!em.value) return toast(t('email'));
    try { await S.db.magicLink(em.value); toast('أُرسل رابط الدخول إلى بريدك ✉', 5000); } catch (er) { toast(errMsg(er), 4000); }
  };
  app.querySelector('#reset').onclick = async () => {
    if (!em.value) return toast(t('email'));
    try { await S.db.resetPassword(em.value); toast('أُرسل رابط تغيير كلمة المرور ✉', 5000); } catch (er) { toast(errMsg(er), 4000); }
  };
}

export function signup(app) {
  if (S.me) { location.hash = ['supervisor', 'admin'].includes(S.me.role) ? '#/supervisor' : '#/me'; return; }
  app.innerHTML = `${pageHead(t('signup'))}
  <div class="wrap" style="max-width:560px;padding-top:24px">
    <form class="card stack" id="f">
      <div class="field"><label>${t('iam')}</label>
        <div class="seg">
          <label><input type="radio" name="role" value="student" checked><span>🌱 ${t('student')}</span></label>
          <label><input type="radio" name="role" value="supervisor"><span>🎓 ${t('supervisorRole')}</span></label>
        </div></div>
      <div class="field"><label for="nm">${t('name')}</label><input id="nm" required autocomplete="name"></div>
      <div class="field"><label for="em">${t('email')}</label><input id="em" type="email" required autocomplete="email" inputmode="email"></div>
      <div class="field"><label for="pw">${t('password')}</label><input id="pw" type="password" ${S.db.mode === 'local' ? '' : 'required'} minlength="6" autocomplete="new-password"></div>
      <div class="field"><label for="lg">${t('yourLang')}</label><select id="lg">${langOptions(S.lang)}</select></div>
      <div class="field"><label for="ct">${t('country')}</label><input id="ct" autocomplete="country-name"></div>
      ${localStorage.getItem('subul-join') ? `<p class="notice small">🔗 ${t('join')}: <b dir="ltr">${esc(localStorage.getItem('subul-join'))}</b></p>` : ''}
      <p class="small muted hidden" id="sup-note" lang="ar">طلب الإشراف يُراجَع من إدارة المنصة قبل تفعيله. ستدخل الآن طالبًا، وتظهر لوحة المشرف بعد الاعتماد.</p>
      <button class="btn primary" type="submit">${t('signup')}</button>
      <p class="small center">${t('or')} <a href="#/login">${t('login')}</a></p>
    </form>
  </div>`;
  app.querySelectorAll('[name=role]').forEach((r) => r.onchange = () =>
    app.querySelector('#sup-note').classList.toggle('hidden', !(r.value === 'supervisor' && r.checked) || S.db.mode === 'local'));
  app.querySelector('#f').onsubmit = async (e) => {
    e.preventDefault();
    const v = (id) => app.querySelector(id).value.trim();
    const data = { email: v('#em'), password: app.querySelector('#pw').value, full_name: v('#nm'), lang: v('#lg'), country: v('#ct'),
                   role: app.querySelector('[name=role]:checked').value };
    S.lang = data.lang;
    try {
      const r = await S.db.signUp(data);
      if (r === 'confirm') app.querySelector('#f').innerHTML = `<p class="center" lang="ar" style="font-size:1.1rem">✉ أرسلنا رسالة تأكيد إلى <b dir="ltr">${esc(data.email)}</b>.<br>افتحها واضغط الرابط، ثم ادخل.</p>`;
    } catch (er) { toast(errMsg(er), 4500); }
  };
}

export async function profile(app) {
  const me = S.me; if (!me) return needLogin();
  const sup = ['supervisor', 'admin'].includes(me.role);
  const links = await S.db.links().catch(() => []);
  const invite = me.supervisor_code ? `${location.origin}${location.pathname}#/join/${me.supervisor_code}` : '';
  app.innerHTML = `${pageHead('👤 ' + esc(me.full_name || me.email), `<span dir="ltr">${esc(me.email)}</span> · ${esc(me.role)}`)}
  <div class="wrap grid-2" style="padding-top:24px">
    <form class="card stack" id="pf">
      <div class="field"><label for="nm">${t('name')}</label><input id="nm" value="${esc(me.full_name || '')}"></div>
      <div class="field"><label for="lg">${t('yourLang')}</label><select id="lg">${langOptions(me.lang)}</select></div>
      <div class="field"><label for="ct">${t('country')}</label><input id="ct" value="${esc(me.country || '')}"></div>
      ${!sup ? `<div class="field"><label for="sd" lang="ar">تاريخ النطق بالشهادة (اختياري)</label><input id="sd" type="date" value="${esc(me.shahada_date || '')}"></div>` : ''}
      <button class="btn primary">${t('save')}</button>
    </form>
    <div class="stack">
      ${sup ? `<div class="card stack"><h3>🔗 ${t('myCode')}</h3>
          <p style="font-family:var(--lat);font-size:2rem;font-weight:800;letter-spacing:.2em;color:var(--green-2)" dir="ltr">${esc(me.supervisor_code || '—')}</p>
          ${invite ? `<label>${t('inviteLink')}</label><input readonly dir="ltr" value="${esc(invite)}" id="inv">
          <div class="row"><button class="btn sm" id="cp">📋 ${t('copy')}</button>
            <a class="btn sm" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(invite)}">${t('shareWA')}</a></div>` : ''}
          <p class="small muted" lang="ar">أرسل الرابط لطالبك: يفتحه، فيسجّل أو يدخل بحسابه، فيصلك طلب الربط في «لوحة المشرف» لتوافق عليه. أو يكتب الرمز في صفحته الشخصية.</p></div>`
        : `<div class="card stack"><h3>🎓 ${t('linkedWith')}</h3>
          ${links.filter((l) => l.status === 'active').map((l) => `<div class="row between"><span>✅ <b>${esc(l.other.full_name || l.other.email || '')}</b></span><a class="btn sm" href="#/me/chat">💬</a></div>`).join('') || '<p class="muted small">—</p>'}
          </div>${linkBoxHTML(links)}`}
      ${me.role === 'supervisor_pending' ? `<p class="notice" lang="ar">طلب الإشراف قيد المراجعة من الإدارة.</p>` : ''}
      <button class="btn" id="out">${t('logout')}</button>
    </div>
  </div>`;
  app.querySelector('#pf').onsubmit = async (e) => {
    e.preventDefault();
    const patch = { full_name: app.querySelector('#nm').value.trim(), lang: app.querySelector('#lg').value, country: app.querySelector('#ct').value.trim() };
    if (!sup) patch.shahada_date = app.querySelector('#sd').value || null;
    try { await S.db.updateMe(patch); S.lang = patch.lang; localStorage.removeItem('subul-ui'); applyUi(); toast('✓'); } catch (er) { toast(errMsg(er)); }
  };
  app.querySelector('#cp')?.addEventListener('click', () => { navigator.clipboard?.writeText(invite); app.querySelector('#inv').select(); toast(t('copied')); });
  if (!sup) wireLinkBox(app, () => profile(app));
  app.querySelector('#out').onclick = async () => { await S.db.signOut(); location.hash = '#/'; };
}

// رابط الدعوة من المشرف: #/join/CODE
export async function join(app, code) {
  localStorage.setItem('subul-join', code.toUpperCase());
  if (S.me) {
    const r = S.me.role === 'student' ? await S.db.linkWithCode(code).catch(() => 'error') : 'self';
    localStorage.removeItem('subul-join');
    app.innerHTML = `<div class="wrap" style="max-width:560px;padding-top:30px"><div class="card stack center">
      <h2>🔗 ${t('join')}</h2>
      <p>${r === 'pending' ? t('sentRequest') : r === 'active' ? t('linked') + ' ✓' : r === 'self' ? 'هذا الرابط للطلاب.' : 'الرمز غير صحيح'}</p>
      <a class="btn primary" href="#/me">${t('myPage')}</a></div></div>`;
    return;
  }
  app.innerHTML = `<div class="wrap" style="max-width:560px;padding-top:30px"><div class="card stack center">
    <h2>🔗 ${t('join')}</h2><p class="muted" dir="ltr" style="font-family:var(--lat);font-size:1.4rem;letter-spacing:.2em">${esc(code.toUpperCase())}</p>
    <p>${t('signup')} ${t('or')} ${t('login')} — ${t('sentRequest')}</p>
    <div class="row" style="justify-content:center"><a class="btn primary" href="#/signup">${t('signup')}</a><a class="btn" href="#/login">${t('login')}</a></div></div></div>`;
}
