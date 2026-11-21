/* Build relief/<S>/<col>_<row>.webp: sharp terrain tiles for zoomed-in maps (2026-11-21). The source is the same
   Natural Earth raster as src/img/relief.webp, "Cross Blended Hypsometric Tints with Shaded Relief and Water"
   (public domain), at full resolution (HYP_HR_SR_W.tif, 21600x10800, from naturalearthdata.com; the base relief came
   from the 10800x5400 version, so colours match: per-channel fit slope 0.93-0.98, equal means), reprojected onto the game's map frame (Natural Earth 1,
   960x500 map units) at S pixels per unit. Tiles are TILE px plus PAD px on every side (so neighbours overlap and no
   seam shows); tiles entirely outside the globe are skipped; outside the globe is transparent.
   Usage (from tests/, which has d3): node ../scripts/make_relief_tiles.js <source.tif> <out dir> <sharp dir> [S ...] */
const d3 = require(require.resolve('d3', {paths:[process.cwd()]}));
const fs = require('fs'), path = require('path');
const [src, outDir, sharpDir, ...levels] = process.argv.slice(2);
const sharp = require(sharpDir);
const W = 960, H = 500, TILE = 512, PAD = 2;
const proj = d3.geoNaturalEarth1().fitExtent([[6,6],[W-6,H-6]], {type:'Sphere'});
(async () => {
  sharp.cache(false);
  const {data, info} = await sharp(src, {limitInputPixels:false}).removeAlpha().raw().toBuffer({resolveWithObject:true});
  const sw = info.width, sh = info.height, ch = info.channels;
  console.log('source', sw, sh, ch);
  for (const S of (levels.length ? levels : ['8', '16']).map(Number)) {
    const OW = W*S, OH = H*S, cols = Math.ceil(OW/TILE), rows = Math.ceil(OH/TILE), T = TILE + 2*PAD;
    const dir = path.join(outDir, String(S)); fs.mkdirSync(dir, {recursive:true});
    let n = 0, bytes = 0;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const buf = Buffer.alloc(T*T*4); let any = false;
      for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
        const mx = (c*TILE - PAD + x + 0.5)/S, my = (r*TILE - PAD + y + 0.5)/S;
        const ll = proj.invert([mx, my]);
        if (!ll || isNaN(ll[0]) || Math.abs(ll[0]) > 180.0001 || Math.abs(ll[1]) > 90.0001) continue;
        const back = proj(ll); if (!back || Math.hypot(back[0]-mx, back[1]-my) > 0.3/S + 0.05) continue;
        const fx = (ll[0]+180)/360*sw - 0.5, fy = (90-ll[1])/180*sh - 0.5;
        const x0 = Math.max(0, Math.min(sw-1, Math.floor(fx))), y0 = Math.max(0, Math.min(sh-1, Math.floor(fy)));
        const x1 = Math.min(sw-1, x0+1), y1 = Math.min(sh-1, y0+1), tx = fx-x0, ty = fy-y0, o = (y*T+x)*4;
        for (let k = 0; k < 3; k++) {
          const v = data[(y0*sw+x0)*ch+k]*(1-tx)*(1-ty) + data[(y0*sw+x1)*ch+k]*tx*(1-ty) + data[(y1*sw+x0)*ch+k]*(1-tx)*ty + data[(y1*sw+x1)*ch+k]*tx*ty;
          buf[o+k] = Math.round(v);
        }
        buf[o+3] = 255; any = true;
      }
      if (!any) continue;
      const file = path.join(dir, c + '_' + r + '.webp');
      const res = await sharp(buf, {raw:{width:T, height:T, channels:4}}).webp({quality:72, alphaQuality:60, effort:5}).toFile(file);
      n++; bytes += res.size;
    }
    console.log('level', S, cols+'x'+rows, 'tiles', n, (bytes/1048576).toFixed(1), 'MB');
  }
})();
