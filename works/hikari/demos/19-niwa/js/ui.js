// 光の庭 — ui.js
// intro オーバーレイ / HUD / 保存・読込 / 植物カウンタ
// 連携はすべて ctx（bus / state）経由。他モジュールは import しない。

const STYLE = `
.niwa-intro {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 26px;
  background: radial-gradient(ellipse at 50% 62%, rgba(20, 20, 34, 0.92), rgba(10, 10, 15, 0.985) 70%);
  opacity: 1;
  transition: opacity 1.6s ease;
}
.niwa-intro.niwa-fading { opacity: 0; pointer-events: none; }
.niwa-intro-title {
  font-family: var(--serif, serif);
  font-weight: 500;
  font-size: clamp(34px, 7vw, 56px);
  letter-spacing: 0.32em;
  text-indent: 0.32em;
  color: var(--glow-white, #f4f2ec);
  text-shadow: 0 0 28px rgba(244, 242, 236, 0.5), 0 0 80px rgba(201, 168, 255, 0.25);
  animation: niwa-breathe 5.2s ease-in-out infinite;
}
@keyframes niwa-breathe {
  0%, 100% { text-shadow: 0 0 24px rgba(244, 242, 236, 0.4), 0 0 70px rgba(201, 168, 255, 0.18); }
  50%      { text-shadow: 0 0 36px rgba(244, 242, 236, 0.6), 0 0 100px rgba(201, 168, 255, 0.32); }
}
.niwa-intro-line {
  font-size: 13px;
  letter-spacing: 0.22em;
  line-height: 2.1;
  color: rgba(244, 242, 236, 0.55);
  text-align: center;
}
.niwa-intro-enter {
  margin-top: 10px;
  font-family: var(--serif, serif);
  font-size: 14px;
  letter-spacing: 0.3em;
  text-indent: 0.3em;
  color: var(--glow-gold, #ffd98a);
  background: transparent;
  border: 1px solid rgba(255, 217, 138, 0.45);
  border-radius: 999px;
  padding: 13px 40px;
  cursor: pointer;
  transition: background 0.4s, box-shadow 0.4s, color 0.4s;
}
.niwa-intro-enter:hover {
  background: rgba(255, 217, 138, 0.08);
  box-shadow: 0 0 32px rgba(255, 217, 138, 0.25);
}
.niwa-hud {
  transition: opacity 1.2s ease;
}
.niwa-hud.niwa-dimmed { opacity: 0.25; }
.niwa-actions {
  position: fixed;
  right: 26px;
  bottom: 118px;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  pointer-events: none;
}
.niwa-mini-btn {
  pointer-events: auto;
  font-family: var(--sans, sans-serif);
  font-size: 11px;
  letter-spacing: 0.18em;
  color: var(--dim, rgba(244, 242, 236, 0.45));
  background: rgba(244, 242, 236, 0.04);
  border: 1px solid rgba(244, 242, 236, 0.18);
  border-radius: 999px;
  padding: 6px 16px;
  cursor: pointer;
  transition: color 0.3s, border-color 0.3s, box-shadow 0.3s;
}
.niwa-mini-btn:hover {
  color: var(--glow-white, #f4f2ec);
  border-color: rgba(244, 242, 236, 0.4);
  box-shadow: 0 0 18px rgba(244, 242, 236, 0.12);
}
.niwa-count {
  font-family: var(--serif, serif);
  font-size: 11px;
  letter-spacing: 0.2em;
  color: var(--dimmer, rgba(244, 242, 236, 0.25));
  padding: 4px 2px;
}
.niwa-toast {
  position: fixed;
  left: 50%;
  bottom: 132px;
  transform: translateX(-50%);
  z-index: 30;
  font-family: var(--serif, serif);
  font-size: 13px;
  letter-spacing: 0.22em;
  color: var(--glow-gold, #ffd98a);
  text-shadow: 0 0 18px rgba(255, 217, 138, 0.4);
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.7s ease;
}
.niwa-toast.niwa-show { opacity: 1; }
/* --- スマホ縦(〜480px)。重なり回避とタッチターゲット拡大。デスクトップは不変 --- */
@media (max-width: 480px) {
  /* 音声バー(audio.jsが top:70/right:26 に置く)と「PROTOTYPE 19」が重ならないよう短く */
  .niwa-hud .hud-no { font-size: 10px; letter-spacing: 0.2em; }
  .niwa-hud .hud-title { font-size: 22px; }
  /* もどるリンクの指あたりを広く(レイアウトはほぼ不変) */
  .niwa-hud .hud-back { padding: 8px 12px 8px 0; margin-bottom: 2px; }
  /* ミニボタンを指で押せる大きさ(44px目安)に */
  .niwa-mini-btn { font-size: 12px; padding: 11px 18px; min-height: 42px; }
  /* hud-bottom(ヒント・タグ)に接しないよう少し上へ */
  .niwa-actions { bottom: 136px; }
  /* 中央下はパッドとボタン列で塞がるため、トーストは空(上)へ逃がす */
  .niwa-toast { bottom: auto; top: 132px; max-width: 86vw; }
}
`;

function el(tag, cls, text) {
  const d = document.createElement(tag);
  if (cls) d.className = cls;
  if (text != null) d.textContent = text;
  return d;
}

let refs = {
  hudEls: [],
  countEl: null,
  toastEl: null,
  toastTimer: 0,
  lastCount: -1,
};

function photoFilename(d) {
  const p = (n) => String(n).padStart(2, '0');
  return 'hikari-niwa-' + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate())
    + '-' + p(d.getHours()) + p(d.getMinutes()) + '.png';
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => { try { URL.revokeObjectURL(url); } catch (e) {} }, 1000);
}

function showToast(msg) {
  const t = refs.toastEl;
  if (!t) return;
  t.textContent = msg;
  t.classList.add('niwa-show');
  clearTimeout(refs.toastTimer);
  refs.toastTimer = setTimeout(() => t.classList.remove('niwa-show'), 2200);
}

export default {
  name: 'ui',

  init(ctx) {
    try {
      const root = (ctx && ctx.dom && ctx.dom.root) || document.body;
      const bus = ctx && ctx.bus;
      const state = ctx && ctx.state;

      // ---- style 注入 ----
      const style = document.createElement('style');
      style.textContent = STYLE;
      document.head.appendChild(style);

      // ---- HUD 上 ----
      const hudTop = el('div', 'hud-top niwa-hud niwa-dimmed');
      // #ui-root > * { pointer-events:auto }（ID指定）が shared.css の
      // .hud-top { pointer-events:none } に勝ってしまうため、inline で打ち消す。
      // 内側の .hud-title-block / .niwa-mini-btn 等が各自 auto に戻す。
      hudTop.style.pointerEvents = 'none';
      const block = el('div', 'hud-title-block');
      const back = el('a', 'hud-back', '← もどる');
      back.href = '../../index.html';
      block.appendChild(back);
      block.appendChild(el('div', 'hud-no', 'PROTOTYPE 19'));
      block.appendChild(el('div', 'hud-title', '光の庭'));
      hudTop.appendChild(block);
      root.appendChild(hudTop);

      // ---- HUD 下 ----
      const hudBottom = el('div', 'hud-bottom niwa-hud niwa-dimmed');
      hudBottom.style.pointerEvents = 'none';
      hudBottom.appendChild(el('div', 'hud-hint',
        '左下に種を描いて、丘に触れると植わります。風が庭を揺らします。'));
      const tech = el('div', 'hud-tech');
      const row1 = el('div', 'tech-row');
      row1.appendChild(el('span', 'tech-label', '試作'));
      row1.appendChild(el('span', 'tech-tag', 'Three.js modules'));
      const row2 = el('div', 'tech-row');
      row2.appendChild(el('span', 'tech-label', '本実装'));
      row2.appendChild(el('span', 'tech-tag primary', 'Unity URP (C#)'));
      tech.appendChild(row1);
      tech.appendChild(row2);
      hudBottom.appendChild(tech);
      root.appendChild(hudBottom);

      // ---- 右下の小さな操作列 ----
      const actions = el('div', 'niwa-actions niwa-hud niwa-dimmed');
      actions.style.pointerEvents = 'none'; // ボタンは .niwa-mini-btn が auto に戻す
      const countEl = el('div', 'niwa-count', '灯る草花 — 0');
      const saveBtn = el('button', 'niwa-mini-btn', '保存');
      const loadBtn = el('button', 'niwa-mini-btn', 'よみがえらせる');
      saveBtn.addEventListener('click', () => {
        try {
          if (bus) bus.emit('garden:save');
          showToast('庭を保存しました ✦');
        } catch (e) { console.warn('[ui] save', e); }
      });
      loadBtn.addEventListener('click', () => {
        try { if (bus) bus.emit('garden:load'); }
        catch (e) { console.warn('[ui] load', e); }
      });
      const photoBtn = el('button', 'niwa-mini-btn', '写真にのこす');
      photoBtn.addEventListener('click', () => {
        try {
          const r = ctx && ctx.renderer;
          const canvas = r && r.domElement;
          if (!r || !canvas || !ctx.scene || !ctx.camera) {
            showToast('写真にできませんでした');
            return;
          }
          // preserveDrawingBuffer なしのため、描画直後にバッファを読む
          r.render(ctx.scene, ctx.camera);
          const filename = photoFilename(new Date());
          if (canvas.toBlob) {
            canvas.toBlob((blob) => {
              try {
                if (!blob) { showToast('写真にできませんでした'); return; }
                downloadBlob(blob, filename);
                showToast('庭を写真にのこしました ✦');
              } catch (e) {
                console.warn('[ui] photo', e);
                showToast('写真にできませんでした');
              }
            }, 'image/png');
          } else {
            const a = document.createElement('a');
            a.href = canvas.toDataURL('image/png');
            a.download = filename;
            a.click();
            showToast('庭を写真にのこしました ✦');
          }
        } catch (e) {
          console.warn('[ui] photo', e);
          showToast('写真にできませんでした');
        }
      });
      actions.appendChild(countEl);
      actions.appendChild(saveBtn);
      actions.appendChild(loadBtn);
      actions.appendChild(photoBtn);
      root.appendChild(actions);

      refs.hudEls = [hudTop, hudBottom, actions];
      refs.countEl = countEl;

      // ---- トースト ----
      const toast = el('div', 'niwa-toast');
      toast.style.pointerEvents = 'none';
      root.appendChild(toast);
      refs.toastEl = toast;

      // ---- intro オーバーレイ ----
      const intro = el('div', 'niwa-intro');
      intro.appendChild(el('div', 'niwa-intro-title', '光の庭'));
      intro.appendChild(el('div', 'niwa-intro-line',
        '夜の丘に、光の種をひとつ。\n描いたかたちが、灯る草花になる。'));
      const enter = el('button', 'niwa-intro-enter', '庭へ入る');
      intro.appendChild(enter);
      root.appendChild(intro);
      intro.querySelector('.niwa-intro-line').style.whiteSpace = 'pre-line';

      let entered = false;
      enter.addEventListener('click', () => {
        if (entered) return;
        entered = true;
        try {
          intro.classList.add('niwa-fading');
          intro.style.pointerEvents = 'none'; // フェード中の透明な幕が入力を遮らないように
          setTimeout(() => { try { intro.remove(); } catch (e) {} }, 1700);
          if (state) state.started = true;
          refs.hudEls.forEach((h) => h.classList.remove('niwa-dimmed'));
          if (bus) bus.emit('app:start');
        } catch (e) { console.warn('[ui] start', e); }
      });
    } catch (e) {
      console.warn('[ui] init failed', e);
    }
  },

  update(dt, t, ctx) {
    try {
      const n = (ctx && ctx.state && ctx.state.plantCount) | 0;
      if (n !== refs.lastCount && refs.countEl) {
        refs.lastCount = n;
        refs.countEl.textContent = '灯る草花 — ' + n;
      }
    } catch (e) {
      // 静かに握る（毎フレームの警告は出さない）
    }
  },
};
