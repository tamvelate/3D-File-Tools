// Workbench: open a 3D file, show it, list its stats, save it as another format.
// Built on the Online 3D Viewer engine (MIT) in assets/vendor/o3dv.min.js.
(function () {
  'use strict';
  const bench = document.querySelector('[data-bench]');
  if (!bench || !window.OV) return;
  const { fmtBytes, zipFiles, saveBlob } = window.T3D;

  const $ = (sel) => bench.querySelector(sel);
  const viewport = $('.viewport');
  const emptyEl = $('.empty');
  const statusEl = $('.status');
  const input = $('input[type=file]');
  const fileBox = $('[data-file]');
  const statsEl = $('[data-stats]');
  const convertBtn = $('[data-convert]');
  const openBtn = $('[data-open]');
  const msgEl = $('[data-msg]');
  const scaleSel = $('[data-scale]');
  const toolsEl = $('.vp-tools');

  let viewer = null;
  let loader = null;
  let model = null;
  let baseName = 'model';

  const BINARY = { glb: true, stl: true, ply: true, '3dm': true };

  function setMsg(text, kind) {
    msgEl.textContent = text || '';
    msgEl.className = 'msg' + (kind ? ' ' + kind : '');
  }
  function setStatus(text) { statusEl.textContent = text || ''; }

  function ensureViewer() {
    if (viewer) return;
    const canvas = document.createElement('canvas');
    viewport.prepend(canvas);
    viewer = new OV.Viewer();
    viewer.Init(canvas);
    viewer.SetBackgroundColor(new OV.RGBAColor(0, 0, 0, 0));
    let lastH = 0;
    const resize = () => {
      viewer.Resize(viewport.clientWidth, viewport.clientHeight);
      // The panel can grow when stats appear, which changes the viewport height: re-frame the model.
      if (model && Math.abs(viewport.clientHeight - lastH) > 20) fitView();
      lastH = viewport.clientHeight;
    };
    resize();
    new ResizeObserver(resize).observe(viewport);
    loader = new OV.ThreeModelLoader();
    // Neutral studio lighting so PBR materials (GLB, FBX…) aren't dark without an environment.
    viewer.SetEnvironmentMapSettings(new OV.EnvironmentSettings(studioFaces(), false));
  }

  // Procedural soft-box studio: six canvas faces (posx, negx, posy, negy, posz, negz) as data URLs.
  function studioFaces() {
    const S = 256;
    const face = (top, bottom, boxes) => {
      const c = document.createElement('canvas'); c.width = c.height = S;
      const g = c.getContext('2d');
      const grad = g.createLinearGradient(0, 0, 0, S);
      grad.addColorStop(0, top); grad.addColorStop(1, bottom);
      g.fillStyle = grad; g.fillRect(0, 0, S, S);
      g.filter = 'blur(10px)';
      g.fillStyle = '#ffffff';
      boxes.forEach(([x, y, w, h]) => g.fillRect(x * S, y * S, w * S, h * S));
      return c.toDataURL('image/png');
    };
    return [
      face('#d9d9d9', '#8a8a8a', [[0.2, 0.15, 0.6, 0.35]]),  // +x key soft box
      face('#cfcfcf', '#808080', [[0.3, 0.2, 0.4, 0.25]]),   // -x fill
      face('#f2f2f2', '#f2f2f2', [[0.15, 0.15, 0.7, 0.7]]),  // +y top light
      face('#5f5f5f', '#5f5f5f', []),                        // -y floor
      face('#d4d4d4', '#858585', [[0.1, 0.2, 0.25, 0.4]]),   // +z
      face('#d4d4d4', '#858585', [[0.65, 0.2, 0.25, 0.4]]),  // -z rim
    ];
  }

  let lightLevel = 1;
  function applyLight() {
    if (!viewer) return;
    const sm = viewer.shadingModel;
    // 1 = engine default for plain (Phong) models; PBR models get a brighter environment baseline.
    if (viewer.scene) viewer.scene.environmentIntensity = lightLevel;
    if (sm && sm.ambientLight) sm.ambientLight.intensity = Math.PI * lightLevel;
    if (sm && sm.directionalLight) sm.directionalLight.intensity = Math.PI * lightLevel;
    viewer.Render();
  }

  function fitView() {
    if (!viewer || !model) return;
    const sphere = viewer.GetBoundingSphere(() => true);
    viewer.AdjustClippingPlanesToSphere(sphere);
    viewer.SetUpVector(OV.Direction.Y, false);
    viewer.FitSphereToWindow(sphere, false);
  }

  function num(n, d) {
    return Number(n).toLocaleString('en-US', { maximumFractionDigits: d == null ? 2 : d });
  }

  function renderStats() {
    const rows = [
      ['Meshes', num(model.MeshCount(), 0)],
      ['Materials', num(model.MaterialCount(), 0)],
      ['Vertices', num(model.VertexCount(), 0)],
      ['Triangles', num(model.TriangleCount(), 0)],
    ];
    try {
      const box = OV.GetBoundingBox(model);
      const sx = box.max.x - box.min.x, sy = box.max.y - box.min.y, sz = box.max.z - box.min.z;
      rows.push(['Size (X × Y × Z)', `${num(sx)} × ${num(sy)} × ${num(sz)}`]);
    } catch (e) { /* empty model */ }
    statsEl.innerHTML = rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');

    // Volume, area and watertightness are slower — compute after first paint, skip on huge meshes.
    if (model.TriangleCount() > 1500000) return;
    setTimeout(() => {
      if (!model) return;
      try {
        const area = OV.CalculateSurfaceArea(model);
        const solid = OV.IsTwoManifold(model);
        let extra = `<dt>Surface area</dt><dd>${num(area)}</dd>`;
        extra += `<dt>Watertight</dt><dd>${solid ? 'Yes' : 'No'}</dd>`;
        if (solid) extra += `<dt>Volume</dt><dd>${num(OV.CalculateVolume(model))}</dd>`;
        statsEl.insertAdjacentHTML('beforeend', extra);
      } catch (e) { /* skip extras */ }
    }, 50);
  }

  function loadFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    ensureViewer();
    if (loader.InProgress()) return;

    const main = files.find((f) => !/\.(mtl|bin|png|jpe?g|webp|bmp|tga|gif|tiff?|dds|ktx2?)$/i.test(f.name)) || files[0];
    baseName = main.name.replace(/\.[^.]+$/, '') || 'model';
    const total = files.reduce((s, f) => s + f.size, 0);
    fileBox.innerHTML = '';
    const n = document.createElement('div'); n.className = 'file-name'; n.textContent = main.name;
    const m = document.createElement('div'); m.className = 'file-meta';
    m.textContent = fmtBytes(total) + (files.length > 1 ? ` in ${files.length} files` : '');
    fileBox.append(n, m);

    model = null;
    convertBtn.disabled = true;
    statsEl.innerHTML = '';
    setMsg('');
    emptyEl.hidden = true;
    viewer.Clear();

    loader.LoadModel(OV.InputFilesFromFileObjects(files), new OV.ImportSettings(), {
      onLoadStart: () => setStatus('Reading file…'),
      onFileListProgress: () => {},
      onFileLoadProgress: () => {},
      onImportStart: () => setStatus('Importing model…'),
      onVisualizationStart: () => setStatus('Preparing preview…'),
      onModelFinished: (importResult, threeObject) => {
        model = importResult.model;
        viewer.SetMainObject(threeObject);
        applyLight();
        fitView();
        viewport.classList.add('has-model');
        toolsEl.hidden = false;
        setStatus('Drag to rotate, scroll to zoom');
        renderStats();
        convertBtn.disabled = false;
        if (importResult.missingFiles && importResult.missingFiles.length) {
          setMsg('Missing referenced files: ' + importResult.missingFiles.join(', ') + '. Select them together with the model to keep textures.', 'error');
        }
      },
      onTextureLoaded: () => viewer.Render(),
      onLoadError: (err) => {
        setStatus('');
        emptyEl.hidden = false;
        viewport.classList.remove('has-model');
        let text = 'This file could not be opened.';
        if (err && err.code === OV.ImportErrorCode.NoImportableFile) {
          text = 'No supported 3D file found. Check the format list below, or export to STEP, FBX, OBJ or GLB from your 3D program first.';
        } else if (err && err.code === OV.ImportErrorCode.ImportFailed) {
          text = 'The file was found but could not be read' + (err.message ? ` (${err.message})` : '') + '. It may be damaged or use an unsupported version.';
        }
        setMsg(text, 'error');
      },
    });
  }

  function convert() {
    if (!model) return;
    const ext = (bench.querySelector('input[name=fmt]:checked') || {}).value || 'glb';
    const scale = parseFloat(scaleSel ? scaleSel.value : '1') || 1;
    const settings = new OV.ExporterSettings({
      transformation: new OV.Transformation(new OV.Matrix().CreateScale(scale, scale, scale)),
    });
    convertBtn.disabled = true;
    setMsg('Converting…');
    // Let the message paint before the (synchronous) export runs.
    setTimeout(() => {
      new OV.Exporter().Export(model, settings, BINARY[ext] ? OV.FileFormat.Binary : OV.FileFormat.Text, ext, {
        onSuccess: (files) => {
          const out = files.map((f) => ({ name: f.GetName(), bytes: new Uint8Array(f.GetBufferContent()) }));
          if (out.length === 1) {
            saveBlob(new Blob([out[0].bytes]), `${baseName}.${ext}`);
            setMsg(`Saved ${baseName}.${ext} (${fmtBytes(out[0].bytes.length)}).`, 'ok');
          } else {
            const zip = zipFiles(out);
            saveBlob(zip, `${baseName}-${ext}.zip`);
            setMsg(`Saved ${baseName}-${ext}.zip with ${out.length} files (${fmtBytes(zip.size)}).`, 'ok');
          }
          convertBtn.disabled = false;
        },
        onError: () => {
          setMsg(`This model could not be saved as ${ext.toUpperCase()}. Try another format.`, 'error');
          convertBtn.disabled = false;
        },
      });
    }, 30);
  }

  // Events
  const pick = () => input.click();
  emptyEl.addEventListener('click', pick);
  openBtn.addEventListener('click', pick);
  viewport.addEventListener('keydown', (e) => {
    if (!model && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); pick(); }
  });
  input.addEventListener('change', () => { loadFiles(input.files); input.value = ''; });
  ['dragenter', 'dragover'].forEach((t) => bench.addEventListener(t, (e) => { e.preventDefault(); viewport.classList.add('drag'); }));
  ['dragleave', 'drop'].forEach((t) => bench.addEventListener(t, (e) => { e.preventDefault(); if (t === 'drop' || e.target === viewport) viewport.classList.remove('drag'); }));
  bench.addEventListener('drop', (e) => loadFiles(e.dataTransfer.files));
  convertBtn.addEventListener('click', convert);
  $('[data-fit]').addEventListener('click', fitView);
  $('[data-light]').addEventListener('input', (e) => { lightLevel = parseFloat(e.target.value); applyLight(); });
  const fullBtn = $('[data-full]');
  const canFull = viewport.requestFullscreen || viewport.webkitRequestFullscreen;
  if (!canFull) fullBtn.hidden = true;
  fullBtn.addEventListener('click', () => {
    const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
    if (fsEl) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    else canFull.call(viewport);
  });
  const onFs = () => {
    const on = !!(document.fullscreenElement || document.webkitFullscreenElement);
    fullBtn.textContent = on ? 'Exit full screen' : 'Full screen';
    setTimeout(fitView, 100);
  };
  document.addEventListener('fullscreenchange', onFs);
  document.addEventListener('webkitfullscreenchange', onFs);
  bench.querySelectorAll('input[name=fmt]').forEach((r) => r.addEventListener('change', () => {
    convertBtn.textContent = 'Save as ' + r.value.toUpperCase();
  }));
  const checked = bench.querySelector('input[name=fmt]:checked');
  if (checked) convertBtn.textContent = 'Save as ' + checked.value.toUpperCase();

  window.__bench = { loadFiles, convert, get model() { return model; } }; // used by tests
})();
