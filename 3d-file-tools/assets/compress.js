// Compress GLB: dedup identical textures and downscale oversized ones. Geometry is never touched.
(function () {
  'use strict';
  const root = document.querySelector('[data-compress]');
  if (!root) return;
  const { fmtBytes, saveBlob } = window.T3D;
  const $ = (s) => root.querySelector(s);
  const viewport = $('.viewport'), emptyEl = $('.empty'), input = $('input[type=file]');
  const fileBox = $('[data-file]'), runBtn = $('[data-run]'), openBtn = $('[data-open]');
  const msgEl = $('[data-msg]'), logEl = $('[data-log]'), bar = $('[data-bar]'), statsEl = $('[data-stats]');
  const dlBtn = $('[data-download]'), maxDimSel = $('[data-maxdim]');
  let currentFile = null, outputBytes = null, outputName = 'optimized.glb';

  function setMsg(t, k) { msgEl.textContent = t || ''; msgEl.className = 'msg' + (k ? ' ' + k : ''); }
  function log(t) { const li = document.createElement('li'); li.textContent = t; logEl.appendChild(li); logEl.scrollTop = logEl.scrollHeight; }
  function setProgress(p) { bar.style.width = Math.max(0, Math.min(100, p)) + '%'; }

  function pickFile(file) {
    if (!file) return;
    if (!/\.glb$/i.test(file.name)) { setMsg('Choose a .glb file. To compress another format, convert it to GLB first.', 'error'); return; }
    currentFile = file; outputBytes = null; dlBtn.hidden = true; statsEl.innerHTML = ''; logEl.innerHTML = ''; setProgress(0);
    setMsg('');
    fileBox.innerHTML = '';
    const n = document.createElement('div'); n.className = 'file-name'; n.textContent = file.name;
    const m = document.createElement('div'); m.className = 'file-meta'; m.textContent = fmtBytes(file.size);
    fileBox.append(n, m);
    emptyEl.querySelector('strong').textContent = file.name;
    emptyEl.querySelector('span').textContent = fmtBytes(file.size) + ' ready to compress';
    runBtn.disabled = false;
  }

  // ---------- Core GLB rebuild ----------
  function align4(n) { return (n + 3) & ~3; }

  async function hashBytes(bytes) {
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    const arr = new Uint8Array(digest);
    let hex = '';
    for (let i = 0; i < arr.length; i++) hex += arr[i].toString(16).padStart(2, '0');
    return hex;
  }

  function sniffMime(bytes) {
    if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png';
    if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8) return 'image/jpeg';
    return null;
  }

  async function decodeAndResize(bytes, mimeType, maxDim) {
    const mt = mimeType || sniffMime(bytes);
    if (!mt) return null; // unknown/unsupported format (e.g. KTX2/Basis) — caller keeps original bytes
    const blob = new Blob([bytes], { type: mt });
    let bitmap;
    try {
      bitmap = await createImageBitmap(blob);
    } catch (e) {
      return null; // undecodable in this browser — keep original bytes
    }
    const w0 = bitmap.width, h0 = bitmap.height;
    const needsResize = maxDim > 0 && (w0 > maxDim || h0 > maxDim);
    if (!needsResize) {
      // Browsers' canvas PNG encoder is markedly weaker than a tuned native
      // one (no optimal filtering / high-effort deflate): re-encoding a
      // texture that doesn't even need resizing routinely made it BIGGER
      // than the original, not smaller. So below the target size, the
      // original bytes already win — leave them untouched.
      bitmap.close && bitmap.close();
      return null;
    }
    const scale = Math.min(maxDim / w0, maxDim / h0);
    const w = Math.max(1, Math.round(w0 * scale));
    const h = Math.max(1, Math.round(h0 * scale));

    // Draw once with alpha so we can losslessly check whether the texture
    // actually uses transparency.
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { alpha: true });
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close && bitmap.close();

    let hasAlpha = false;
    const pixels = ctx.getImageData(0, 0, w, h).data;
    for (let i = 3; i < pixels.length; i += 4) {
      if (pixels[i] !== 255) { hasAlpha = true; break; }
    }

    let outBlob;
    if (hasAlpha) {
      outBlob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    } else {
      // Fully opaque: re-draw onto an alpha:false canvas so the encoder
      // drops the alpha channel entirely — smaller, still lossless since
      // every pixel was opaque anyway.
      const opaqueCanvas = document.createElement('canvas');
      opaqueCanvas.width = w;
      opaqueCanvas.height = h;
      const octx = opaqueCanvas.getContext('2d', { alpha: false });
      octx.drawImage(canvas, 0, 0);
      outBlob = await new Promise((resolve) => opaqueCanvas.toBlob(resolve, 'image/png'));
    }
    if (!outBlob) return null;
    const buf = await outBlob.arrayBuffer();
    return new Uint8Array(buf);
  }

  async function optimizeGlb(arrayBuffer, { maxDim, onProgress }) {
    const dv = new DataView(arrayBuffer);
    if (dv.getUint32(0, true) !== 0x46546c67) throw new Error("Not a valid GLB file (bad magic number — doesn't start with 'glTF').");
    const totalLength = dv.getUint32(8, true);

    let offset = 12, jsonBytes = null, binBytes = null;
    while (offset < totalLength) {
      const chunkLength = dv.getUint32(offset, true);
      const chunkType = dv.getUint32(offset + 4, true);
      const chunkStart = offset + 8;
      if (chunkType === 0x4e4f534a) jsonBytes = new Uint8Array(arrayBuffer, chunkStart, chunkLength);
      else if (chunkType === 0x004e4942) binBytes = new Uint8Array(arrayBuffer, chunkStart, chunkLength);
      offset = chunkStart + chunkLength;
    }
    if (!jsonBytes) throw new Error('No JSON chunk found in this GLB file.');
    const json = JSON.parse(new TextDecoder('utf-8').decode(jsonBytes));
    if (!binBytes) throw new Error('This GLB file has no embedded binary (BIN) chunk — nothing to optimize.');

    const materialsBefore = (json.materials || []).length;
    const meshesBefore = (json.meshes || []).length;
    const nodesBefore = (json.nodes || []).length;
    const images = json.images || [];
    const bufferViews = json.bufferViews || [];

    onProgress(`Parsed: ${materialsBefore} materials, ${meshesBefore} meshes, ${nodesBefore} nodes, ${images.length} images`);

    for (const bv of bufferViews) {
      if ((bv.buffer || 0) !== 0) throw new Error('This GLB uses multiple binary buffers, which this tool doesn’t support yet.');
    }
    if (!json.buffers || json.buffers.length !== 1) throw new Error('Expected exactly one embedded buffer in this GLB file.');

    const imageBufferViewIndices = new Set();
    for (const img of images) {
      if (img.bufferView != null) imageBufferViewIndices.add(img.bufferView);
    }

    const writes = [];
    const placedByHash = new Map();
    let writeOffset = 0;
    let dedupedCount = 0;
    let resizedCount = 0;
    let processed = 0;
    const totalImages = imageBufferViewIndices.size;

    for (let i = 0; i < bufferViews.length; i++) {
      const bv = bufferViews[i];
      const origBytes = binBytes.subarray(bv.byteOffset || 0, (bv.byteOffset || 0) + bv.byteLength);

      if (!imageBufferViewIndices.has(i)) {
        writeOffset = align4(writeOffset);
        writes.push({ offset: writeOffset, bytes: origBytes });
        bv.byteOffset = writeOffset;
        bv.byteLength = origBytes.length;
        writeOffset += origBytes.length;
        continue;
      }

      processed++;
      const hash = await hashBytes(origBytes);
      const existing = placedByHash.get(hash);
      if (existing) {
        dedupedCount++;
        bv.byteOffset = existing.offset;
        bv.byteLength = existing.length;
        onProgress(`Optimizing textures... (${processed}/${totalImages}) — reused identical image`, true);
        continue;
      }

      const matchingImages = images.filter((im) => im.bufferView === i);
      const imgEntry = matchingImages[0];
      let newBytes = await decodeAndResize(origBytes, imgEntry && imgEntry.mimeType, maxDim);
      if (newBytes) {
        resizedCount++;
        matchingImages.forEach((im) => { im.mimeType = 'image/png'; });
      } else {
        newBytes = origBytes; // undecodable format — keep as-is, still dedup-eligible by hash
      }

      writeOffset = align4(writeOffset);
      writes.push({ offset: writeOffset, bytes: newBytes });
      placedByHash.set(hash, { offset: writeOffset, length: newBytes.length });
      bv.byteOffset = writeOffset;
      bv.byteLength = newBytes.length;
      writeOffset += newBytes.length;

      onProgress(`Optimizing textures... (${processed}/${totalImages})`, true);
      if (processed % 4 === 0) await new Promise((r) => setTimeout(r, 0));
    }

    onProgress('Rebuilding buffer...');
    const finalBufLen = align4(writeOffset);
    const newBin = new Uint8Array(finalBufLen);
    for (const w of writes) newBin.set(w.bytes, w.offset);

    json.buffers[0].byteLength = finalBufLen;
    delete json.buffers[0].uri;

    onProgress('Encoding output file...');
    let jsonStr = JSON.stringify(json);
    const jsonPad = (4 - (jsonStr.length % 4)) % 4;
    jsonStr += ' '.repeat(jsonPad);
    const jsonOut = new TextEncoder().encode(jsonStr);

    const binPad = (4 - (newBin.length % 4)) % 4;
    const binOut = binPad ? (() => { const b = new Uint8Array(newBin.length + binPad); b.set(newBin, 0); return b; })() : newBin;

    const totalLen = 12 + 8 + jsonOut.length + 8 + binOut.length;
    const out = new Uint8Array(totalLen);
    const odv = new DataView(out.buffer);
    odv.setUint32(0, 0x46546c67, true);
    odv.setUint32(4, 2, true);
    odv.setUint32(8, totalLen, true);

    let o = 12;
    odv.setUint32(o, jsonOut.length, true); o += 4;
    odv.setUint32(o, 0x4e4f534a, true); o += 4;
    out.set(jsonOut, o); o += jsonOut.length;

    odv.setUint32(o, binOut.length, true); o += 4;
    odv.setUint32(o, 0x004e4942, true); o += 4;
    out.set(binOut, o);

    return {
      bytes: out,
      materialsBefore, meshesBefore, nodesBefore,
      materialsAfter: materialsBefore, meshesAfter: meshesBefore, nodesAfter: nodesBefore,
      dedupedCount, resizedCount, totalImages,
    };
  }


  runBtn.addEventListener('click', async () => {
    if (!currentFile) return;
    runBtn.disabled = true; dlBtn.hidden = true; outputBytes = null; logEl.innerHTML = ''; statsEl.innerHTML = '';
    setMsg('Compressing…'); setProgress(5);
    try {
      const buf = await currentFile.arrayBuffer();
      let prog = 15;
      const r = await optimizeGlb(buf, {
        maxDim: parseInt(maxDimSel.value, 10),
        onProgress: (t) => { log(t); prog = Math.min(92, prog + 2); setProgress(prog); },
      });
      outputBytes = r.bytes;
      outputName = currentFile.name.replace(/\.glb$/i, '') + '_compressed.glb';
      setProgress(100);
      const rows = [
        ['Original', fmtBytes(currentFile.size)],
        ['Compressed', fmtBytes(r.bytes.length)],
        ['Reduction', Math.max(0, (1 - r.bytes.length / currentFile.size) * 100).toFixed(1) + '%'],
        ['Textures resized', r.resizedCount + ' of ' + r.totalImages],
        ['Duplicates merged', String(r.dedupedCount)],
        ['Meshes kept', r.meshesAfter + ' / ' + r.meshesBefore],
        ['Materials kept', r.materialsAfter + ' / ' + r.materialsBefore],
      ];
      statsEl.innerHTML = rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
      setMsg(r.bytes.length < currentFile.size ? 'Done. Geometry and materials are unchanged.' : 'Done, but this file was already compact: no textures needed resizing.', 'ok');
      dlBtn.hidden = false;
    } catch (err) {
      setMsg('Could not compress this file: ' + (err && err.message ? err.message : String(err)), 'error');
      setProgress(0);
    } finally {
      runBtn.disabled = false;
    }
  });

  dlBtn.addEventListener('click', () => { if (outputBytes) saveBlob(new Blob([outputBytes], { type: 'model/gltf-binary' }), outputName); });
  const pick = () => input.click();
  emptyEl.addEventListener('click', pick);
  openBtn.addEventListener('click', pick);
  viewport.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
  input.addEventListener('change', () => { pickFile(input.files[0]); input.value = ''; });
  ['dragenter', 'dragover'].forEach((t) => root.addEventListener(t, (e) => { e.preventDefault(); viewport.classList.add('drag'); }));
  ['dragleave', 'drop'].forEach((t) => root.addEventListener(t, (e) => { e.preventDefault(); viewport.classList.remove('drag'); }));
  root.addEventListener('drop', (e) => pickFile(e.dataTransfer.files[0]));
  window.__compress = { pickFile, run: () => runBtn.click(), get output() { return outputBytes; } };
})();
