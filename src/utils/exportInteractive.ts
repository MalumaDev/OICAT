import { useAppStore } from '../store/useAppStore';

function escHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const BASE_STYLE = `
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { background: #1a1a1a; color: #e8e8e8; font-family: system-ui, sans-serif; height: 100vh; display: flex; flex-direction: column; overflow: hidden; -webkit-font-smoothing: antialiased; }
.toolbar { display: flex; align-items: center; gap: 8px; padding: 6px 12px; background: #222; border-bottom: 1px solid #3a3a3a; flex-shrink: 0; }
.logo { font-weight: 700; font-size: 14px; color: #5a8dee; letter-spacing: 0.08em; }
.btn { background: #333; border: 1px solid #3a3a3a; color: #e8e8e8; padding: 4px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; }
.btn:hover { border-color: #5a8dee; }
`;

const PAN_ZOOM_JS = `
const MIN_SCALE = 0.05, MAX_SCALE = 50;
let t = { scale: __SCALE__, x: __TX__, y: __TY__ };
const imgs = document.querySelectorAll('.panel-img');

function apply() {
  const s = 'translate(' + t.x + 'px,' + t.y + 'px) scale(' + t.scale + ')';
  imgs.forEach(img => { img.style.transform = s; });
}

function resetView() { t = { scale: 1, x: 0, y: 0 }; apply(); }

apply();

document.getElementById('viewport').addEventListener('wheel', e => {
  e.preventDefault();
  const body = e.target.closest('.panel-body') || e.target.closest('#area');
  if (!body) return;
  const r = body.getBoundingClientRect();
  const cx = e.clientX - r.left, cy = e.clientY - r.top;
  const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
  const ns = Math.max(MIN_SCALE, Math.min(MAX_SCALE, t.scale * factor));
  const ratio = ns / t.scale;
  t = { scale: ns, x: cx - (cx - t.x) * ratio, y: cy - (cy - t.y) * ratio };
  apply();
}, { passive: false });

let panning = false, ps = {};
document.querySelectorAll('.panel-body, #area').forEach(el => {
  el.addEventListener('mousedown', e => {
    if (e.button !== 0) return;
    e.preventDefault();
    panning = true;
    ps = { x: e.clientX, y: e.clientY, tx: t.x, ty: t.y };
    el.classList.add('panning');
  });
});
window.addEventListener('mousemove', e => {
  if (!panning) return;
  t = { ...t, x: ps.tx + (e.clientX - ps.x), y: ps.ty + (e.clientY - ps.y) };
  apply();
});
window.addEventListener('mouseup', () => {
  panning = false;
  document.querySelectorAll('.panel-body, #area').forEach(el => el.classList.remove('panning'));
});
let tStart = {};
document.querySelectorAll('.panel-body, #area').forEach(el => {
  el.addEventListener('touchstart', e => { tStart = { x: e.touches[0].clientX, y: e.touches[0].clientY, tx: t.x, ty: t.y }; });
  el.addEventListener('touchmove', e => {
    e.preventDefault();
    t = { ...t, x: tStart.tx + (e.touches[0].clientX - tStart.x), y: tStart.ty + (e.touches[0].clientY - tStart.y) };
    apply();
  }, { passive: false });
});
`;

export function buildSideBySideHtml(): string {
  const { views, images, transform } = useAppStore.getState();

  const panelsData = views.map((v) => {
    const img = v.imageId ? images.find((i) => i.id === v.imageId) : null;
    return { label: v.label, dataUrl: img?.dataUrl ?? null };
  });

  const panelsHTML = panelsData
    .map(
      (p, i) => `
    <div class="panel">
      <div class="panel-header">${escHtml(p.label)}</div>
      <div class="panel-body" data-panel="${i}">
        ${p.dataUrl ? `<img class="panel-img" src="${p.dataUrl}" draggable="false" />` : '<span style="color:#666;font-size:12px;margin:auto">No image</span>'}
      </div>
    </div>`
    )
    .join('\n');

  const js = PAN_ZOOM_JS
    .replace('__SCALE__', String(transform.scale))
    .replace('__TX__', String(transform.x))
    .replace('__TY__', String(transform.y));

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>OICAT – Side by Side</title>
  <style>
    ${BASE_STYLE}
    .panels { display: flex; flex: 1; gap: 2px; background: #1a1a1a; overflow: hidden; }
    .panel { flex: 1; display: flex; flex-direction: column; background: #222; border: 1px solid #3a3a3a; border-radius: 4px; overflow: hidden; min-width: 0; }
    .panel-header { padding: 4px 8px; background: #2a2a2a; border-bottom: 1px solid #3a3a3a; font-size: 12px; font-weight: 500; flex-shrink: 0; }
    .panel-body { flex: 1; position: relative; overflow: hidden; cursor: grab; user-select: none; display: flex; }
    .panel-body.panning { cursor: grabbing; }
    .panel-img { position: absolute; top: 0; left: 0; max-width: none; max-height: none; pointer-events: none; transform-origin: 0 0; }
  </style>
</head>
<body>
  <div class="toolbar">
    <span class="logo">OICAT</span>
    <button class="btn" onclick="resetView()">Reset View</button>
  </div>
  <div id="viewport" class="panels">
${panelsHTML}
  </div>
  <script>${js}</script>
</body>
</html>`;
}

export function buildSliderHtml(): string {
  const { sliderLeftId, sliderRightId, images, sliderPosition, transform } =
    useAppStore.getState();

  const leftImg = sliderLeftId ? images.find((i) => i.id === sliderLeftId) : null;
  const rightImg = sliderRightId ? images.find((i) => i.id === sliderRightId) : null;
  const leftName = escHtml(leftImg?.name ?? 'Left');
  const rightName = escHtml(rightImg?.name ?? 'Right');

  const js = PAN_ZOOM_JS
    .replace('__SCALE__', String(transform.scale))
    .replace('__TX__', String(transform.x))
    .replace('__TY__', String(transform.y));

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>OICAT – Slider</title>
  <style>
    ${BASE_STYLE}
    .labels { display: flex; gap: 16px; padding: 6px 12px; background: #222; border-bottom: 1px solid #3a3a3a; font-size: 12px; color: #999; flex-shrink: 0; }
    .label { display: flex; align-items: center; gap: 6px; overflow: hidden; }
    .dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .label-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    #area { flex: 1; position: relative; overflow: hidden; cursor: grab; user-select: none; }
    #area.panning { cursor: grabbing; }
    .layer { position: absolute; inset: 0; }
    .panel-img { position: absolute; top: 0; left: 0; max-width: none; max-height: none; pointer-events: none; transform-origin: 0 0; }
    .handle { position: absolute; top: 0; bottom: 0; width: 20px; transform: translateX(-50%); z-index: 10; cursor: col-resize; }
    .handle-line { position: absolute; left: 50%; top: 0; bottom: 0; width: 2px; transform: translateX(-50%); background: rgba(255,255,255,0.85); box-shadow: 0 0 4px rgba(0,0,0,0.5); pointer-events: none; }
    .handle-grip { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); background: rgba(255,255,255,0.9); border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; gap: 2px; font-size: 13px; color: #222; box-shadow: 0 2px 8px rgba(0,0,0,0.4); pointer-events: none; }
  </style>
</head>
<body>
  <div class="toolbar">
    <span class="logo">OICAT</span>
    <button class="btn" onclick="resetView()">Reset View</button>
  </div>
  <div class="labels">
    <div class="label"><div class="dot" style="background:#5a8dee"></div><span class="label-text" title="${leftName}">${leftName}</span></div>
    <div class="label"><div class="dot" style="background:#e08855"></div><span class="label-text" title="${rightName}">${rightName}</span></div>
  </div>
  <div id="viewport" style="flex:1;display:flex;overflow:hidden;">
    <div id="area">
      <div class="layer" id="right-layer">
        ${rightImg ? `<img class="panel-img" id="right-img" src="${rightImg.dataUrl}" draggable="false" />` : ''}
      </div>
      <div class="layer" id="left-layer" style="clip-path:inset(0 ${100 - sliderPosition}% 0 0)">
        ${leftImg ? `<img class="panel-img" id="left-img" src="${leftImg.dataUrl}" draggable="false" />` : ''}
      </div>
      <div class="handle" id="handle" style="left:${sliderPosition}%">
        <div class="handle-line"></div>
        <div class="handle-grip"><span>‹</span><span>›</span></div>
      </div>
    </div>
  </div>
  <script>
    ${js}

    let sliderPos = ${sliderPosition};
    const area = document.getElementById('area');
    const leftLayer = document.getElementById('left-layer');
    const handle = document.getElementById('handle');

    function applySlider() {
      leftLayer.style.clipPath = 'inset(0 ' + (100 - sliderPos) + '% 0 0)';
      handle.style.left = sliderPos + '%';
    }

    handle.addEventListener('mousedown', e => {
      e.preventDefault(); e.stopPropagation();
      const onMove = ev => {
        const r = area.getBoundingClientRect();
        sliderPos = Math.max(0, Math.min(100, ((ev.clientX - r.left) / r.width) * 100));
        applySlider();
      };
      const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    });

    handle.addEventListener('touchmove', e => {
      e.stopPropagation();
      const r = area.getBoundingClientRect();
      sliderPos = Math.max(0, Math.min(100, ((e.touches[0].clientX - r.left) / r.width) * 100));
      applySlider();
    });
  </script>
</body>
</html>`;
}
