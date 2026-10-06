# 3D File Tools

Free, browser-only tools to open, inspect, convert and compress 3D files.
Files never leave the user's computer.

- **Convert**: opens GLB, glTF, OBJ, STL, PLY, OFF, 3DM, STEP, IGES, BREP, FCStd, IFC, FBX, DAE, 3DS, 3MF, AMF, WRL (or a .zip with textures). Saves as GLB, glTF, OBJ, STL, PLY, OFF, 3DM, with a unit-scale option.
- **Viewer**: 3D preview plus mesh/material/triangle counts, bounding-box size, surface area, volume, watertight check.
- **Compress GLB**: merges duplicate textures and downsizes oversized ones. Geometry untouched.
- **30 conversion landing pages** (`/stl-to-glb/`, `/step-to-stl/` …) for search traffic, plus a format guide, About, Privacy, Terms, Contact, sitemap and robots.txt.

## Project layout

```
_build/content.mjs   ← edit here: site name, domain, email, formats, conversion pages, FAQ
_build/build.mjs     ← page templates + generator
assets/site.css      ← all styling
assets/converter.js  ← open / view / convert workbench
assets/compress.js   ← GLB texture compression
assets/common.js     ← zip + download helpers
assets/vendor/       ← Online 3D Viewer engine (MIT, see o3dv-LICENSE.md)
index.html, */index.html, sitemap.xml, robots.txt, 404.html  ← GENERATED, don't edit by hand
```

## Edit and rebuild

Requires Node.js 18+. No npm install needed.

```bash
node _build/build.mjs
```

Then open the folder with any static server to test, e.g. `npx serve .` and visit http://localhost:3000.
(Opening `index.html` by double-click won't load the CAD engine, because browsers block workers on `file://`.)

## Add a new conversion page

Add a pair to `PAIRS` in `_build/content.mjs`, e.g. `['dae', 'stl']`, then rebuild.
Both formats must exist in `FORMATS`; the target must be one of `SAVE_FORMATS`.

## Deploy

**Test now (GitHub Pages):** push this folder as repo `3D-File-Tools`, then Settings → Pages → Deploy from branch `main`, folder `/ (root)`. URL: https://tamvelate.github.io/3D-File-Tools/

**For ads (Cloudflare Pages, free, commercial use allowed):**
1. Buy a domain.
2. Cloudflare dashboard → Workers & Pages → Create → Pages → Connect to Git → pick this repo. Build command: `node _build/build.mjs`, output directory: `/`.
3. Add the custom domain in the Pages project.
4. Set `SITE.url` in `_build/content.mjs` to `https://yourdomain.com` and rebuild/push.

CAD helper libraries (OpenCascade, rhino3dm, web-ifc, Draco) load on demand from cdn.jsdelivr.net only when a STEP/IGES/BREP/FCStd, 3DM, IFC or Draco file is opened.

## Launch checklist (before applying for AdSense)

- [ ] Pick final name + domain; update `SITE.name`, `SITE.url`, `SITE.contactEmail`.
- [ ] Deploy on the custom domain; check every page loads.
- [ ] Google Search Console: verify domain, submit `/sitemap.xml`.
- [ ] Add analytics (Google Analytics or Cloudflare Web Analytics).
- [ ] Write 5–10 more guide articles (e.g. "Why is my GLB so big", "STEP vs STL for 3D printing").
- [ ] Apply for AdSense; paste its script tag where the `<!-- AdSense -->` comment is in `build.mjs`, add `ads.txt` at the root.
- [ ] Turn on AdSense's "Privacy & messaging" consent message for EEA/UK visitors (the Privacy page already says this).
- [ ] Fill the `<div class="ad-slot">` placeholders with ad units.

## License

© 2026 Tam Vu. Third-party components keep their own licenses (Online 3D Viewer MIT, three.js MIT, OpenCascade/occt-import-js LGPL, rhino3dm MIT, web-ifc MPL-2.0).
