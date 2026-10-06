// Site content: one place to edit names, formats, conversion pages and FAQs.
// After editing, run:  node _build/build.mjs

export const SITE = {
  name: '3D File Tools',            // working name — change before launch
  url: 'https://tamvelate.github.io/3d-file-tools', // change to your own domain, no trailing slash
  contactEmail: 'hello@example.com', // change before applying for AdSense
  owner: 'Tam Vu',
  year: 2026,
};

// Every format the converter can open (import) and/or save (export).
// kind: 'mesh' = triangles/polygons, 'cad' = exact surfaces (tessellated on import), 'scene' = meshes + materials + hierarchy
export const FORMATS = {
  glb:  { name: 'GLB', full: 'glTF Binary', exts: ['glb'], kind: 'scene', open: true, save: true,
          use: 'web viewers, AR, e-commerce product pages, game engines',
          about: 'GLB is the single-file, binary version of glTF. Geometry, materials and textures are packed into one file, which is why it is the standard for 3D on the web, in AR and on product pages.' },
  gltf: { name: 'glTF', full: 'GL Transmission Format', exts: ['gltf'], kind: 'scene', open: true, save: true,
          use: 'web 3D, editing material data by hand',
          about: 'glTF stores the scene as readable JSON plus separate .bin and texture files. It holds the same data as GLB, just split into several files.' },
  obj:  { name: 'OBJ', full: 'Wavefront OBJ', exts: ['obj'], kind: 'mesh', open: true, save: true,
          use: 'exchanging meshes between almost any 3D program',
          about: 'OBJ is one of the oldest and most widely supported mesh formats. Geometry lives in the .obj file; colors and texture references live in a companion .mtl file.' },
  stl:  { name: 'STL', full: 'Stereolithography', exts: ['stl'], kind: 'mesh', open: true, save: true,
          use: '3D printing and slicers',
          about: 'STL describes a surface as a plain list of triangles, with no colors, materials or units. It is the default input for 3D printing slicers.' },
  ply:  { name: 'PLY', full: 'Polygon File Format', exts: ['ply'], kind: 'mesh', open: true, save: true,
          use: '3D scans and point clouds',
          about: 'PLY is common output from 3D scanners and photogrammetry tools. It can store vertex colors alongside the geometry.' },
  off:  { name: 'OFF', full: 'Object File Format', exts: ['off'], kind: 'mesh', open: true, save: true,
          use: 'geometry research and academic tools',
          about: 'OFF is a minimal text format listing vertices and faces, used mostly in geometry processing research.' },
  '3dm': { name: '3DM', full: 'Rhino 3D Model', exts: ['3dm'], kind: 'cad', open: true, save: true,
          use: 'Rhino, industrial and jewelry design',
          about: '3DM is the native file of Rhinoceros 3D. It can hold exact NURBS surfaces as well as meshes, and is widely used in product, footwear and jewelry design.' },
  step: { name: 'STEP', full: 'ISO 10303 STEP', exts: ['step', 'stp'], kind: 'cad', open: true, save: false,
          use: 'exchanging solid models between CAD programs',
          about: 'STEP is the neutral exchange format for engineering CAD. It stores exact solids and surfaces, so SolidWorks, Fusion, CATIA, Creo and others can all read it.' },
  iges: { name: 'IGES', full: 'Initial Graphics Exchange Specification', exts: ['iges', 'igs'], kind: 'cad', open: true, save: false,
          use: 'older CAD data exchange',
          about: 'IGES is the predecessor of STEP. It is still common in older engineering archives and in surface-heavy models.' },
  brep: { name: 'BREP', full: 'OpenCascade BREP', exts: ['brep'], kind: 'cad', open: true, save: false,
          use: 'OpenCascade-based CAD tools',
          about: 'BREP is the native boundary-representation file of the OpenCascade geometry kernel used by FreeCAD and other open-source CAD tools.' },
  fcstd: { name: 'FCStd', full: 'FreeCAD Document', exts: ['fcstd'], kind: 'cad', open: true, save: false,
          use: 'FreeCAD projects',
          about: 'FCStd is the native project file of FreeCAD, the open-source parametric CAD program.' },
  ifc:  { name: 'IFC', full: 'Industry Foundation Classes', exts: ['ifc'], kind: 'scene', open: true, save: false,
          use: 'BIM and architecture (Revit, ArchiCAD)',
          about: 'IFC is the open standard for building information models (BIM), exported by Revit, ArchiCAD and most architecture software.' },
  fbx:  { name: 'FBX', full: 'Autodesk FBX', exts: ['fbx'], kind: 'scene', open: true, save: false,
          use: 'Maya, 3ds Max, Unity, Unreal, animation',
          about: 'FBX is Autodesk’s interchange format for animation and games. It carries meshes, materials, hierarchy and animation between Maya, 3ds Max, Blender, Unity and Unreal.' },
  dae:  { name: 'DAE', full: 'COLLADA', exts: ['dae'], kind: 'scene', open: true, save: false,
          use: 'SketchUp exports and older game pipelines',
          about: 'DAE (COLLADA) is an XML-based scene format. SketchUp and many older tools export it.' },
  '3ds': { name: '3DS', full: '3D Studio', exts: ['3ds'], kind: 'scene', open: true, save: false,
          use: 'legacy 3ds Max and 3D Studio models',
          about: '3DS is the legacy format of Autodesk 3D Studio. Many older model libraries are still distributed as .3ds.' },
  '3mf': { name: '3MF', full: '3D Manufacturing Format', exts: ['3mf'], kind: 'mesh', open: true, save: false,
          use: 'modern 3D printing (Bambu, Prusa, Cura)',
          about: '3MF is the modern replacement for STL in 3D printing. It keeps colors, materials and units in a single zipped file.' },
  amf:  { name: 'AMF', full: 'Additive Manufacturing File', exts: ['amf'], kind: 'mesh', open: true, save: false,
          use: 'additive manufacturing',
          about: 'AMF is an XML format for additive manufacturing that, unlike STL, can store colors and materials.' },
  wrl:  { name: 'WRL', full: 'VRML', exts: ['wrl'], kind: 'scene', open: true, save: false,
          use: 'older web 3D and scientific visualisation',
          about: 'WRL (VRML) is an early web 3D format that is still exported by some CAD, scanning and scientific tools.' },
};

export const SAVE_FORMATS = ['glb', 'gltf', 'obj', 'stl', 'ply', 'off', '3dm'];

// Conversion landing pages. Each gets its own URL, e.g. /stl-to-glb/
export const PAIRS = [
  ['stl', 'glb'], ['obj', 'glb'], ['fbx', 'glb'], ['step', 'glb'], ['step', 'stl'], ['step', 'obj'],
  ['iges', 'stl'], ['iges', 'glb'], ['3dm', 'stl'], ['3dm', 'glb'], ['3dm', 'obj'], ['dae', 'glb'],
  ['ply', 'glb'], ['ply', 'stl'], ['3mf', 'stl'], ['3mf', 'glb'], ['ifc', 'glb'], ['3ds', 'glb'],
  ['fbx', 'obj'], ['fbx', 'stl'], ['glb', 'stl'], ['glb', 'obj'], ['gltf', 'glb'], ['glb', 'gltf'],
  ['obj', 'stl'], ['stl', 'obj'], ['wrl', 'stl'], ['fcstd', 'stl'], ['obj', '3dm'], ['stl', '3dm'],
];

// Notes that depend on what the source and target formats can hold.
export function pairNotes(fromKey, toKey) {
  const from = FORMATS[fromKey], to = FORMATS[toKey];
  const notes = [];
  if (from.kind === 'cad' && fromKey !== '3dm') {
    notes.push(`${from.name} stores exact curved surfaces. To save as ${to.name}, they are turned into triangles (tessellated). The result looks the same but can no longer be edited as a CAD solid.`);
  }
  if (fromKey === '3dm' && to.kind !== 'cad') {
    notes.push(`NURBS surfaces in the Rhino file are turned into triangles. Meshes already in the file are kept as they are.`);
  }
  if (['stl', 'off'].includes(toKey)) {
    notes.push(`${to.name} has no colors, materials or textures, so only the shape is saved.`);
  }
  if (toKey === 'ply') {
    notes.push(`PLY keeps the geometry; materials and textures are not saved.`);
  }
  if (toKey === 'obj') {
    notes.push(`OBJ saves materials in a separate .mtl file and textures as separate images, so the download is a .zip containing all of them. Keep them in the same folder.`);
  }
  if (toKey === 'gltf') {
    notes.push(`glTF is saved as a .gltf file plus a .bin file and any textures, delivered together in a .zip.`);
  }
  if ((from.kind === 'cad' || ['stl', '3mf', 'amf', 'step', 'iges'].includes(fromKey)) && ['glb', 'gltf'].includes(toKey)) {
    notes.push(`glTF assumes meters, while CAD and print files are usually in millimeters. If the model looks 1000× too large in your viewer, set Scale to “mm → m” before converting.`);
  }
  if (fromKey === 'fbx') {
    notes.push(`FBX files from 2011 or later (FBX 7.x) open best. Animation is not carried over; the converter saves the model in its rest pose.`);
  }
  if (fromKey === 'obj' || fromKey === 'gltf') {
    notes.push(`If your ${from.name} uses separate texture or ${fromKey === 'obj' ? '.mtl' : '.bin'} files, select them together with the main file (or drop a .zip) so materials come through.`);
  }
  return notes;
}

export const GENERAL_FAQ = [
  ['Are my files uploaded anywhere?',
   'No. Conversion runs inside your browser on your own computer. Your files never leave your device, which makes the tools safe to use with unreleased product designs.'],
  ['Is there a file size limit?',
   'There is no fixed limit. The practical limit is your computer’s memory: files up to a few hundred megabytes work in a current desktop browser. Very large CAD assemblies can take a minute to tessellate.'],
  ['Which formats can I open?',
   'GLB, glTF, OBJ, STL, PLY, OFF, 3DM, STEP, IGES, BREP, FCStd, IFC, FBX, DAE, 3DS, 3MF, AMF and WRL. You can also drop a .zip that contains a model and its textures.'],
  ['Which formats can I save to?',
   'GLB, glTF, OBJ, STL, PLY, OFF and 3DM.'],
  ['Why can’t I save to STEP or FBX?',
   'Saving to STEP would require rebuilding exact CAD surfaces from triangles, which no converter can do reliably. FBX is a closed format without a free browser writer. For FBX workflows, GLB is accepted by Blender, Unity, Unreal and Maya.'],
  ['What about SolidWorks, CATIA, 3DXML, Blender or Maya files?',
   'Native files from these programs (.sldprt, .catpart, .3dxml, .blend, .ma/.mb, .max, .c4d) can only be read by their own software. Export to STEP, FBX, OBJ or GLB from that program first, then use these tools.'],
];
