// Shared helpers: byte formatting, ZIP (store, no compression), browser download.
(function () {
  'use strict';

  function fmtBytes(n) {
    if (n >= 1e9) return (n / 1e9).toFixed(2) + ' GB';
    if (n >= 1e6) return (n / 1e6).toFixed(1) + ' MB';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + ' KB';
    return n + ' B';
  }

  const CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[n] = c;
    }
    return t;
  })();
  function crc32(buf) {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) crc = CRC_TABLE[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  // files: [{ name, bytes: Uint8Array }] -> Blob of a .zip
  function zipFiles(files) {
    const enc = new TextEncoder();
    const locals = [], centrals = [];
    let offset = 0;
    for (const f of files) {
      const name = enc.encode(f.name);
      const crc = crc32(f.bytes);
      const lh = new Uint8Array(30 + name.length);
      let dv = new DataView(lh.buffer);
      dv.setUint32(0, 0x04034b50, true); dv.setUint16(4, 20, true); dv.setUint16(6, 0x0800, true);
      dv.setUint16(8, 0, true); dv.setUint16(10, 0, true); dv.setUint16(12, 0x0021, true);
      dv.setUint32(14, crc, true); dv.setUint32(18, f.bytes.length, true); dv.setUint32(22, f.bytes.length, true);
      dv.setUint16(26, name.length, true); dv.setUint16(28, 0, true); lh.set(name, 30);

      const ch = new Uint8Array(46 + name.length);
      dv = new DataView(ch.buffer);
      dv.setUint32(0, 0x02014b50, true); dv.setUint16(4, 20, true); dv.setUint16(6, 20, true);
      dv.setUint16(8, 0x0800, true); dv.setUint16(10, 0, true); dv.setUint16(12, 0, true); dv.setUint16(14, 0x0021, true);
      dv.setUint32(16, crc, true); dv.setUint32(20, f.bytes.length, true); dv.setUint32(24, f.bytes.length, true);
      dv.setUint16(28, name.length, true); dv.setUint32(42, offset, true); ch.set(name, 46);

      locals.push(lh, f.bytes); centrals.push(ch);
      offset += lh.length + f.bytes.length;
    }
    const cdSize = centrals.reduce((s, c) => s + c.length, 0);
    const end = new Uint8Array(22);
    const dv = new DataView(end.buffer);
    dv.setUint32(0, 0x06054b50, true); dv.setUint16(8, files.length, true); dv.setUint16(10, files.length, true);
    dv.setUint32(12, cdSize, true); dv.setUint32(16, offset, true);
    return new Blob([...locals, ...centrals, end]);
  }

  function saveBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 15000);
  }

  // Size the workbench so it fits on screen below the page title (desktop only; CSS uses --bench-h).
  function sizeBench() {
    const bench = document.querySelector('.bench');
    if (!bench) return;
    const top = bench.getBoundingClientRect().top + window.scrollY;
    const h = Math.max(480, window.innerHeight - top - 20);
    document.documentElement.style.setProperty('--bench-h', h + 'px');
  }
  sizeBench();
  window.addEventListener('resize', sizeBench);

  window.T3D = { fmtBytes, zipFiles, saveBlob };
})();
