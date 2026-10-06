// Static site generator. No dependencies.  Run:  node _build/build.mjs
// Writes every page as <slug>/index.html at the repo root, plus sitemap.xml and robots.txt.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITE, FORMATS, SAVE_FORMATS, PAIRS, pairNotes, GENERAL_FAQ } from './content.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const pages = [];

const OPEN_EXTS = Object.values(FORMATS).flatMap((f) => f.exts);
const ACCEPT = [...OPEN_EXTS, 'zip', 'mtl', 'bin', 'png', 'jpg', 'jpeg', 'webp', 'bmp', 'tga'].map((e) => '.' + e).join(',');
const pairSlug = (a, b) => `${a}-to-${b}`;

const LOGO = `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 3 28 10v12L16 29 4 22V10z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M16 16 28 10 16 3 4 10z" fill="var(--select)" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M16 16v13" stroke="currentColor" stroke-width="2"/></svg>`;

function layout({ slug, title, description, body, scripts = [], jsonld = [], navKey = '' }) {
  const depth = slug ? slug.split('/').length : 0;
  const rel = depth ? '../'.repeat(depth) : './';
  const canonical = `${SITE.url}/${slug ? slug + '/' : ''}`;
  const nav = [
    ['', 'Convert', 'convert'], ['viewer/', 'Viewer', 'viewer'], ['compress-glb/', 'Compress GLB', 'compress'], ['formats/', 'Formats', 'formats'],
  ].map(([href, label, key]) => `<a href="${rel}${href}"${key === navKey ? ' aria-current="page"' : ''}>${label}</a>`).join('');
  const ld = jsonld.map((o) => `<script type="application/ld+json">${JSON.stringify(o)}</script>`).join('\n');
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${canonical}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:site_name" content="${esc(SITE.name)}">
<meta name="twitter:card" content="summary">
<link rel="icon" href="${rel}assets/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@100..125,400..800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${rel}assets/site.css">
<!-- AdSense: paste the <script async src="https://pagead2.googlesyndication.com/..."> tag here after approval -->
${ld}
</head>
<body>
<header class="site-head"><div class="wrap">
<a class="brand" href="${rel}">${LOGO}<span>${esc(SITE.name)}</span></a>
<nav class="nav" aria-label="Main">${nav}</nav>
</div></header>
<main>
${body}
</main>
<footer class="site-foot"><div class="wrap">
<span>© ${SITE.year} ${esc(SITE.name)}. Files are processed in your browser and never uploaded.</span>
<nav aria-label="Site"><a href="${rel}about/">About</a><a href="${rel}privacy/">Privacy</a><a href="${rel}terms/">Terms</a><a href="${rel}contact/">Contact</a></nav>
</div></footer>
<script>
// Opened straight from disk (file://): folder links need an explicit index.html.
if (location.protocol === 'file:') document.querySelectorAll('a[href]').forEach((a) => {
  const h = a.getAttribute('href');
  if (!/^[a-z]+:|^#/i.test(h) && h.endsWith('/')) a.setAttribute('href', h + 'index.html');
});
</script>
${scripts.map((s) => `<script src="${rel}${s}"></script>`).join('\n')}
</body>
</html>
`;
  pages.push({ slug, html });
}

function bench(target = 'glb') {
  const radios = SAVE_FORMATS.map((k) => `<label><input type="radio" name="fmt" value="${k}"${k === target ? ' checked' : ''}><span>${FORMATS[k].name}</span></label>`).join('');
  return `<div class="bench" data-bench>
  <div class="viewport" tabindex="0" aria-label="3D viewport. Press Enter to choose a file, or drop files here.">
    <div class="empty">
      <strong>Drop a 3D file here</strong>
      <span>STEP, IGES, 3DM, FBX, OBJ, STL, GLB, IFC and more. Add textures or a .zip for full materials.</span>
      <button type="button" class="pick" tabindex="-1">Choose files</button>
    </div>
    <div class="vp-tools" hidden><label class="light">Light <input type="range" min="0.3" max="2.5" step="0.1" value="1" data-light aria-label="Light brightness"></label><button type="button" data-fit>Fit view</button><button type="button" data-full>Full screen</button></div>
    <div class="status" aria-live="polite"></div>
    <input type="file" multiple accept="${ACCEPT}" hidden>
  </div>
  <div class="props">
    <div>
      <h2>File</h2>
      <div data-file><div class="file-meta">No file open</div></div>
      <dl class="stats" data-stats></dl>
    </div>
    <div>
      <h2 id="saveas">Save as</h2>
      <div class="formats-pick" role="radiogroup" aria-labelledby="saveas">${radios}</div>
    </div>
    <label class="field">Scale
      <select data-scale>
        <option value="1">Keep units</option>
        <option value="0.001">mm → m (CAD to glTF)</option>
        <option value="0.01">cm → m</option>
        <option value="0.0254">inch → m</option>
        <option value="1000">m → mm (glTF to CAD/print)</option>
        <option value="25.4">inch → mm</option>
      </select>
    </label>
    <div style="display:grid;gap:10px">
      <button type="button" class="btn" data-convert disabled>Save as GLB</button>
      <button type="button" class="btn secondary" data-open>Open a file</button>
      <p class="msg" data-msg role="status"></p>
    </div>
    <p class="privacy-note">Your file stays on this computer. Nothing is uploaded.</p>
  </div>
</div>`;
}

const BENCH_SCRIPTS = ['assets/vendor/o3dv.min.js', 'assets/common.js', 'assets/converter.js'];

function faqHtml(items) {
  return `<div class="faq">${items.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div>`;
}
function faqLd(items) {
  return { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: items.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) };
}
function appLd(name, url, description) {
  return { '@context': 'https://schema.org', '@type': 'WebApplication', name, url, description, applicationCategory: 'MultimediaApplication', operatingSystem: 'Any (runs in a web browser)', offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' } };
}

function formatTable(rel) {
  const rows = Object.entries(FORMATS).map(([k, f]) => `<tr><td><span class="fname">${f.name}</span><br><span class="ext">${f.exts.map((e) => '.' + e).join(' ')}</span></td><td>${esc(f.full)}<br><span class="ext">${esc(f.use)}</span></td><td class="c ${f.open ? 'yes' : 'no'}">${f.open ? 'Yes' : '—'}</td><td class="c ${f.save ? 'yes' : 'no'}">${f.save ? 'Yes' : '—'}</td></tr>`).join('');
  return `<div class="table-scroll"><table class="ftable"><thead><tr><th scope="col">Format</th><th scope="col">What it is</th><th scope="col">Open</th><th scope="col">Save</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function pairList(rel, list = PAIRS) {
  return `<ul class="pairs">${list.map(([a, b]) => `<li><a href="${rel}${pairSlug(a, b)}/">${FORMATS[a].name} to ${FORMATS[b].name}</a></li>`).join('')}</ul>`;
}

const STEPS = (fromName, toName) => `<ol class="steps">
<li>Drop your ${fromName} file onto the viewport, or click it to choose a file. Include texture files or a .zip if the model has them.</li>
<li>Check the preview and the stats: mesh count, triangles and size.</li>
<li>Pick ${toName} under “Save as”, adjust the scale if needed, and click Save. The file downloads straight from your browser.</li>
</ol>`;

// ---------- Home ----------
{
  const rel = './';
  const body = `
<div class="wrap">
  <section class="hero">
    <h1>Open, check and convert any 3D file in your browser</h1>
    <p>From CAD parts to textured product models: view STEP, IGES, Rhino, FBX, OBJ, STL, GLB and more, then save as GLB, OBJ, STL or 3DM. Nothing is uploaded.</p>
  </section>
  ${bench('glb')}
  <div class="ad-slot" data-ad="home-1"></div>

  <section class="block">
    <h2>Tools</h2>
    <div class="tools-grid">
      <a class="tool" href="${rel}"><strong>Convert</strong><span>Turn CAD, print and scene files into GLB, OBJ, STL, PLY or 3DM.</span></a>
      <a class="tool" href="${rel}viewer/"><strong>View and measure</strong><span>Inspect dimensions, triangle count, surface area, volume and watertightness.</span></a>
      <a class="tool" href="${rel}compress-glb/"><strong>Compress GLB</strong><span>Shrink heavy GLB files by resizing and merging textures. Geometry is untouched.</span></a>
    </div>
  </section>

  <section class="block">
    <h2>How it works</h2>
    ${STEPS('3D', 'the format you need')}
  </section>

  <section class="block">
    <h2>Supported formats</h2>
    ${formatTable(rel)}
  </section>

  <section class="block">
    <h2>Popular conversions</h2>
    ${pairList(rel)}
  </section>

  <section class="block">
    <h2>Questions</h2>
    ${faqHtml(GENERAL_FAQ)}
  </section>
</div>`;
  const desc = 'Free online 3D file converter and viewer. Convert STEP, IGES, 3DM, FBX, OBJ, STL, PLY, 3MF and IFC to GLB, OBJ, STL or 3DM in your browser. No upload.';
  layout({ slug: '', navKey: 'convert', title: `3D File Converter: STEP, FBX, OBJ, STL to GLB online | ${SITE.name}`, description: desc, body, scripts: BENCH_SCRIPTS,
    jsonld: [appLd(SITE.name, SITE.url + '/', desc), faqLd(GENERAL_FAQ)] });
}

// ---------- Viewer ----------
{
  const rel = '../';
  const faq = [
    ['What units are the measurements in?', 'The same units as the file. Most CAD and 3D-printing files use millimeters; glTF and GLB use meters. Formats like STL and OBJ don’t record units at all, so the numbers are shown as stored.'],
    ['What does watertight mean?', 'A watertight (two-manifold) mesh is fully closed: every edge is shared by exactly two triangles. Slicers need watertight meshes to print reliably, and volume can only be measured on a closed mesh.'],
    ['Can I view a model with its textures?', 'Yes. Select the model together with its texture images (and .mtl file for OBJ), or drop a .zip that contains them all.'],
    ...GENERAL_FAQ.slice(0, 3),
  ];
  const body = `
<div class="wrap">
  <section class="hero">
    <h1>Online 3D viewer with measurements</h1>
    <p>Open STEP, IGES, 3DM, FBX, OBJ, STL, GLB, IFC and more. See dimensions, triangle count, surface area, volume and whether the mesh is watertight.</p>
  </section>
  ${bench('glb')}
  <div class="ad-slot" data-ad="viewer-1"></div>
  <section class="block prose">
    <h2>What the numbers mean</h2>
    <p><strong>Size</strong> is the bounding box along each axis: the smallest box that fits the whole model. <strong>Triangles</strong> is the rendered polygon count, the main driver of how heavy a model is in web viewers and game engines. For web and AR, product models usually stay under a few hundred thousand triangles.</p>
    <p><strong>Surface area</strong> and <strong>volume</strong> are useful for estimating material, paint or print cost. Volume only appears when the mesh is <strong>watertight</strong>, because an open surface has no inside to measure.</p>
  </section>
  <section class="block"><h2>Questions</h2>${faqHtml(faq)}</section>
</div>`;
  const desc = 'Free online 3D viewer. Open STEP, IGES, 3DM, FBX, OBJ, STL, GLB and IFC files in your browser and measure size, triangles, surface area and volume.';
  layout({ slug: 'viewer', navKey: 'viewer', title: `Online 3D Viewer for STEP, FBX, OBJ, STL, GLB | ${SITE.name}`, description: desc, body, scripts: BENCH_SCRIPTS,
    jsonld: [appLd('3D Viewer', `${SITE.url}/viewer/`, desc), faqLd(faq)] });
}

// ---------- Compress GLB ----------
{
  const rel = '../';
  const faq = [
    ['Will compression change the shape of my model?', 'No. Only embedded texture images are changed. Every mesh, material, node and animation keeps its original data, so the geometry is identical to the original.'],
    ['Which texture size should I pick?', '2048 px is a good default for product viewers and e-commerce. Pick 1024 px for mobile AR or when the file must be very small. 4096 px keeps close-up detail for hero renders.'],
    ['Why did my file barely shrink?', 'If no texture is larger than the size you picked and no textures are duplicated, there is nothing to remove. In that case most of the size is geometry; reducing triangle count in your 3D program is the next step.'],
    ['Does it support Draco or KTX2?', 'Files that already use KTX2/Basis textures are kept as they are (duplicates are still merged). Draco-compressed geometry is passed through untouched.'],
  ];
  const body = `
<div class="wrap">
  <section class="hero">
    <h1>Compress GLB files without touching the geometry</h1>
    <p>Large GLB files are usually large because of textures. This tool merges duplicate textures and scales down oversized ones. Meshes, materials and parts stay exactly as they were.</p>
  </section>
  <div class="bench" data-compress>
    <div class="viewport" tabindex="0" aria-label="Drop a GLB file here, or press Enter to choose one.">
      <div class="empty">
        <strong>Drop a .glb file here</strong>
        <span>Files of several hundred megabytes work in a desktop browser.</span>
        <button type="button" class="pick" tabindex="-1">Choose file</button>
      </div>
      <input type="file" accept=".glb" hidden>
    </div>
    <div class="props">
      <div><h2>File</h2><div data-file><div class="file-meta">No file open</div></div></div>
      <label class="field">Max texture size
        <select data-maxdim>
          <option value="1024">1024 px (mobile, AR)</option>
          <option value="2048" selected>2048 px (web product viewer)</option>
          <option value="4096">4096 px (close-up detail)</option>
          <option value="0">Don’t resize, only merge duplicates</option>
        </select>
      </label>
      <div class="compress-out">
        <button type="button" class="btn" data-run disabled>Compress</button>
        <div class="bar"><i data-bar></i></div>
        <p class="msg" data-msg role="status"></p>
        <dl class="stats" data-stats></dl>
        <button type="button" class="btn" data-download hidden>Download compressed GLB</button>
        <button type="button" class="btn secondary" data-open>Open a file</button>
        <ul class="log" data-log aria-label="Progress log"></ul>
      </div>
      <p class="privacy-note">Your file stays on this computer. Nothing is uploaded.</p>
    </div>
  </div>
  <div class="ad-slot" data-ad="compress-1"></div>
  <section class="block prose">
    <h2>How the compression works</h2>
    <p>A GLB file is a container: a JSON description of the scene and one binary block holding vertex data and images. This tool rewrites only the image parts of that binary block.</p>
    <ol class="steps">
      <li>Identical textures, common when several materials reuse the same image, are stored once and shared.</li>
      <li>Textures larger than the size you pick are scaled down and saved as lossless PNG. Fully opaque images drop their unused alpha channel.</li>
      <li>Textures already within the limit are left byte-for-byte untouched, because re-encoding them in a browser would often make them larger.</li>
    </ol>
    <p>Need a GLB first? <a href="${rel}">Convert your file to GLB</a>, then compress it here.</p>
  </section>
  <section class="block"><h2>Questions</h2>${faqHtml(faq)}</section>
</div>`;
  const desc = 'Reduce GLB file size online. Merge duplicate textures and resize large ones while keeping meshes and materials identical. Runs in your browser, no upload.';
  layout({ slug: 'compress-glb', navKey: 'compress', title: `Compress GLB Online: Reduce glTF File Size | ${SITE.name}`, description: desc, body,
    scripts: ['assets/common.js', 'assets/compress.js'], jsonld: [appLd('GLB Compressor', `${SITE.url}/compress-glb/`, desc), faqLd(faq)] });
}

// ---------- Formats ----------
{
  const rel = '../';
  const sections = Object.entries(FORMATS).map(([k, f]) => {
    const related = PAIRS.filter(([a, b]) => a === k || b === k);
    return `<h3 id="${k}">${f.name}: ${esc(f.full)}</h3><p>${esc(f.about)} Typical use: ${esc(f.use)}.</p>${related.length ? pairList(rel, related) : ''}`;
  }).join('\n');
  const body = `
<div class="wrap">
  <section class="hero"><h1>3D file formats explained</h1><p>What each format is for, what it can store, and which ones this site can open and save.</p></section>
  ${formatTable(rel)}
  <section class="block prose">${sections}</section>
</div>`;
  layout({ slug: 'formats', navKey: 'formats', title: `3D File Formats Explained: STEP, GLB, FBX, OBJ, STL | ${SITE.name}`,
    description: 'A plain guide to 3D file formats: STEP, IGES, 3DM, FBX, OBJ, STL, GLB, glTF, PLY, 3MF, IFC and more. What each stores and when to use it.', body });
}

// ---------- Conversion pages ----------
for (const [a, b] of PAIRS) {
  const from = FORMATS[a], to = FORMATS[b], slug = pairSlug(a, b), rel = '../';
  const notes = pairNotes(a, b);
  const related = PAIRS.filter(([x, y]) => (x === a || y === b) && !(x === a && y === b)).slice(0, 10);
  const keeps = to.kind === 'scene' ? 'materials, colors and textures' : (b === '3dm' || b === 'obj') ? 'materials and colors' : 'the shape only';
  const faq = [
    [`Is this ${from.name} to ${to.name} converter free?`, `Yes. It runs in your browser, so there are no accounts, limits on the number of files, or watermarks.`],
    [`What does the ${to.name} file keep from my ${from.name}?`, `The geometry is always kept. ${to.name} also keeps ${keeps}${['stl', 'off', 'ply'].includes(b) ? '' : ' when the source file has them'}.${notes.length ? ' ' + notes[0] : ''}`],
    ...GENERAL_FAQ.slice(0, 2),
  ];
  const body = `
<div class="wrap">
  <section class="hero">
    <h1>Convert ${from.name} to ${to.name}</h1>
    <p>Turn ${esc(from.full)} files into ${esc(to.full)} for ${esc(to.use)}. Drop your .${from.exts[0]} file below, check it in the viewer, then save it as ${to.name}. Nothing is uploaded.</p>
  </section>
  ${bench(b)}
  <div class="ad-slot" data-ad="pair-1"></div>
  ${notes.length ? `<section class="block"><h2>Before you convert</h2><div class="notes">${notes.map((n) => `<p>${esc(n)}</p>`).join('')}</div></section>` : ''}
  <section class="block"><h2>How to convert ${from.name} to ${to.name}</h2>${STEPS(from.name, to.name)}</section>
  <section class="block prose">
    <h2>About the formats</h2>
    <h3>${from.name}</h3><p>${esc(from.about)}</p>
    <h3>${to.name}</h3><p>${esc(to.about)}</p>
  </section>
  <section class="block"><h2>Questions</h2>${faqHtml(faq)}</section>
  ${related.length ? `<section class="block"><h2>Related conversions</h2>${pairList(rel, related)}</section>` : ''}
</div>`;
  const desc = `Convert ${from.name} to ${to.name} online for free. Open .${from.exts[0]} files in your browser, preview them in 3D and save as .${to.exts[0]}. No upload, no sign-up.`;
  layout({ slug, navKey: 'convert', title: `${from.name} to ${to.name} Converter: Free, Online, No Upload | ${SITE.name}`, description: desc, body, scripts: BENCH_SCRIPTS,
    jsonld: [appLd(`${from.name} to ${to.name} Converter`, `${SITE.url}/${slug}/`, desc), faqLd(faq)] });
}

// ---------- Info pages ----------
const info = (slug, title, description, inner) => layout({ slug, title: `${title} | ${SITE.name}`, description,
  body: `<div class="wrap"><section class="hero"><h1>${esc(title)}</h1></section><section class="block prose" style="padding-top:8px">${inner}</section></div>` });

info('about', 'About', `About ${SITE.name}: free browser-based tools for opening, converting and compressing 3D files.`, `
<p>${esc(SITE.name)} is a set of free tools for people who work with 3D files every day: product and footwear designers, 3D artists, engineers and anyone who has received a file their software can’t open.</p>
<p>It started from a practical problem. Product teams pass models between CAD programs, rendering tools, web viewers and factories, and every step wants a different format. Most online converters upload your file to a server, which isn’t acceptable for unreleased product designs.</p>
<p>Everything here runs inside your browser. Files are read and converted on your own computer and are never sent anywhere. The conversion engine is built on the open-source <a href="https://github.com/kovacsv/Online3DViewer">Online 3D Viewer</a> library (MIT license), with CAD support from OpenCascade.</p>
<p>The site is made and maintained by ${esc(SITE.owner)}. Suggestions for new formats and tools are welcome on the <a href="../contact/">contact page</a>.</p>`);

info('privacy', 'Privacy policy', `Privacy policy for ${SITE.name}.`, `
<p>Last updated: October 2026.</p>
<h3>Your 3D files</h3>
<p>Files you open on this site are processed entirely in your web browser. They are not uploaded to, stored on, or viewable by any server operated by ${esc(SITE.name)}.</p>
<h3>Information collected automatically</h3>
<p>Like most websites, the hosting provider records standard server logs (IP address, browser type, pages requested, time of request) for security and reliability. We may use privacy-respecting analytics to count page views. This data is not used to identify you.</p>
<h3>Advertising and cookies</h3>
<p>This site may show ads served by Google AdSense. Third-party vendors, including Google, use cookies to serve ads based on your prior visits to this website or other websites. Google’s use of advertising cookies enables it and its partners to serve ads to you based on your visit to this site and/or other sites on the Internet.</p>
<p>You may opt out of personalized advertising by visiting <a href="https://www.google.com/settings/ads">Google Ads Settings</a>, or opt out of some third-party vendors’ use of cookies for personalized advertising at <a href="https://www.aboutads.info/choices/">www.aboutads.info</a>. For more on how Google uses data, see <a href="https://policies.google.com/technologies/partner-sites">How Google uses information from sites that use its services</a>.</p>
<p>Visitors from the European Economic Area, the UK and Switzerland are asked for consent before personalized ads are shown.</p>
<h3>Fonts</h3>
<p>Text on this site uses fonts loaded from Google Fonts, which receives your IP address when the fonts are requested.</p>
<h3>Contact</h3>
<p>Questions about this policy: <a href="mailto:${esc(SITE.contactEmail)}">${esc(SITE.contactEmail)}</a>.</p>`);

info('terms', 'Terms of use', `Terms of use for ${SITE.name}.`, `
<p>Last updated: October 2026.</p>
<p>${esc(SITE.name)} provides free tools to view, convert and compress 3D files. By using the site you agree to these terms.</p>
<h3>Your content</h3>
<p>You keep all rights to the files you open. Because processing happens in your browser, we never receive or store them. Only process files you have the right to use.</p>
<h3>No warranty</h3>
<p>The tools are provided “as is”, without warranty of any kind. Conversions between formats can lose information such as exact CAD surfaces, materials or animation. Always check converted files before using them in production, manufacturing or printing.</p>
<h3>Limitation of liability</h3>
<p>To the extent permitted by law, ${esc(SITE.name)} is not liable for any loss or damage arising from use of the site or of files produced by it.</p>
<h3>Third-party software</h3>
<p>The converter uses open-source components, including Online 3D Viewer (MIT), three.js (MIT), occt-import-js and OpenCascade (LGPL), rhino3dm (MIT) and web-ifc (MPL 2.0). Their licenses apply to those components.</p>
<h3>Changes</h3>
<p>These terms may be updated. Continued use of the site after a change means you accept the updated terms.</p>`);

info('contact', 'Contact', `Contact ${SITE.name}.`, `
<p>Found a file that won’t open, or need a format or tool that isn’t here yet? Send an email and include the file format and the program it came from.</p>
<p><a href="mailto:${esc(SITE.contactEmail)}">${esc(SITE.contactEmail)}</a></p>
<p>Please don’t attach confidential files. A description of the problem is usually enough.</p>`);

// ---------- 404 ----------
{
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Page not found | ${esc(SITE.name)}</title><meta name="robots" content="noindex"><link rel="stylesheet" href="${SITE.url}/assets/site.css"></head><body><main class="wrap"><section class="hero"><h1>Page not found</h1><p>This page doesn’t exist. <a href="${SITE.url}/">Open the 3D converter</a> or browse the <a href="${SITE.url}/formats/">format guide</a>.</p></section></main></body></html>`;
  fs.writeFileSync(path.join(ROOT, '404.html'), html);
}

// ---------- Write ----------
for (const p of pages) {
  const dir = path.join(ROOT, p.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), p.html);
}
const today = new Date().toISOString().slice(0, 10);
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map((p) => `  <url><loc>${SITE.url}/${p.slug ? p.slug + '/' : ''}</loc><lastmod>${today}</lastmod></url>`).join('\n')}
</urlset>
`);
fs.writeFileSync(path.join(ROOT, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE.url}/sitemap.xml\n`);
fs.writeFileSync(path.join(ROOT, 'assets', 'favicon.svg'), LOGO.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ').replace('var(--select)', '#f27a12').replace(/currentColor/g, '#17202a'));
console.log(`Built ${pages.length} pages.`);
