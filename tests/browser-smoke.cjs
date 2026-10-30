// Optional browser QA: NODE_PATH=<directory containing playwright> node tests/browser-smoke.cjs
// Start npm run preview first, or set PREVIEW_URL to another local preview.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const url=process.env.PREVIEW_URL||'http://127.0.0.1:8000';
const output=process.env.QA_OUTPUT||path.join(__dirname,'../work/qa');
fs.mkdirSync(output,{recursive:true});
(async()=>{
  const browser=await chromium.launch({headless:true});
  const errors=[];
  try {
    const page=await browser.newPage({viewport:{width:1440,height:1400}});
    page.on('pageerror',e=>errors.push(String(e)));
    await page.goto(url);
    const f=page.frameLocator('#codex-visualization');
    await f.locator('#geomag-lab[data-ready=true]').waitFor();
    assert.equal(await f.locator('#gm-webgl-error').isHidden(),true,'3D rendering must initialize');
    const value=id=>f.locator('#'+id).textContent();
    const range=async(id,value)=>{
      await f.locator('#'+id).evaluate((el,v)=>{el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));},String(value));
    };
    assert.equal(await value('gm-i'),'+38.9°');
    // A real keyboard interaction verifies the range control's native input event.
    await f.locator('#gm-d-tilt').focus();await page.keyboard.press('ArrowRight');
    assert.equal(await value('gm-d-tilt-value'),'1°');
    await range('gm-d-tilt',90);await range('gm-d-azimuth',90);
    await range('gm-q',0);await range('gm-o',0);await range('gm-lat',0);await range('gm-lon',0);
    assert.equal(await value('gm-declination'),'+90.0°');
    assert.equal(await value('gm-i'),'0.0°');
    assert.equal(await value('gm-ned'),'0.00 / +1.00 / 0.00');
    await f.locator('#gm-vector-plane').selectOption('ne');
    assert.match(await f.locator('#gm-vector').textContent(),/East ↓/);
    await range('gm-lon',90);
    assert.equal(await value('gm-i'),'+90.0°');
    assert.equal(await value('gm-declination'),'Undefined');
    // Every component gets a distinct orientation and contributes to the same model.
    await range('gm-d-tilt',25);await range('gm-d-azimuth',-35);
    await range('gm-q',.23);await range('gm-q-tilt',75);await range('gm-q-azimuth',110);
    await range('gm-o',.17);await range('gm-o-tilt',140);await range('gm-o-azimuth',-80);
    await range('gm-lat',35);await range('gm-lon',45);
    const tiltedInclination=await value('gm-i');
    await page.reload();await f.locator('#geomag-lab[data-ready=true]').waitFor();
    assert.equal(await value('gm-i'),tiltedInclination,'reload must restore orientation and longitude');
    for(const [id,v] of [['gm-q-tilt','75'],['gm-o-azimuth','-80'],['gm-lon','45'],['gm-vector-plane','ne']])assert.equal(await f.locator('#'+id).inputValue(),v);
    assert.equal(await f.locator('#gm-example').inputValue(),'custom');
    for(const view of ['meridian','equator','3d']) {
      await f.locator('#gm-view').selectOption(view);
      if(view==='meridian')assert.match(await value('gm-scene-note'),/Camera projection onto 45° E meridian/);
      if(view==='equator')assert.match(await value('gm-scene-note'),/geographic north/);
      for(const display of ['arrows','both','lobes','lines']) {
        await f.locator('#gm-display').selectOption(display);
        const note=await value('gm-scene-note');
        if(display==='lobes')assert.match(note,/Glyph radius: normalized \|Bᵣ\|/);
        if(display==='arrows')assert.match(note,/Vectors at r = R/);
        if(view==='meridian') {
          assert.match(note,/Camera projection onto 45° E meridian/);
          if(['lines','both'].includes(display))assert.match(note,/3D traces may leave plane/);
          else assert.doesNotMatch(note,/traces/);
        }
      }
    }
    for(const color of ['inclination','strength','radial','polarity','neutral'])await f.locator('#gm-color').selectOption(color);
    await f.locator('#gm-color').selectOption('inclination');
    await f.locator('#gm-display').selectOption('both');
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const screenshotThroughChart=async(filename)=>{
      await page.evaluate(()=>scrollTo(0,0));
      const box=await f.locator('#gm-inclination').boundingBox();
      await page.setViewportSize({width:page.viewportSize().width,height:Math.ceil(box.y+box.height+40)});
      await page.screenshot({path:path.join(output,filename)});
    };
    await screenshotThroughChart('oriented-desktop.png');
    // Mobile layout must keep every control reachable without page-wide overflow.
    await page.setViewportSize({width:390,height:1000});
    await f.locator('#gm-lon').scrollIntoViewIfNeeded();
    const overflow=await f.locator('#geomag-lab').evaluate(el=>({width:innerWidth,scroll:document.documentElement.scrollWidth,fields:[...el.querySelectorAll('.gm-component')].map(x=>x.getBoundingClientRect().width)}));
    assert.ok(overflow.scroll<=overflow.width+1,JSON.stringify(overflow));
    assert.ok(overflow.fields.every(w=>w>250),'mobile cards should stack');
    await range('gm-o-tilt',141);assert.equal(await value('gm-o-tilt-value'),'141°');
    await screenshotThroughChart('oriented-mobile.png');
    await page.setViewportSize({width:1440,height:1400});
    await f.locator('#gm-reset-axes').click();
    for(const n of ['d','q','o'])for(const k of ['tilt','azimuth'])assert.equal(await f.locator('#gm-'+n+'-'+k).inputValue(),'0');
    assert.equal(await f.locator('#gm-q').inputValue(),'0.23','reset preserves amplitudes');
    await f.locator('#gm-example').selectOption('shallow');
    assert.equal(await f.locator('#gm-o').inputValue(),'0.15');
    assert.equal(await f.locator('#gm-o-tilt').inputValue(),'0');
    for(const n of ['d','q','o'])await range('gm-'+n,0);
    assert.equal(await value('gm-i'),'Undefined');assert.equal(await value('gm-declination'),'Undefined');
    assert.equal(await value('gm-inferred'),'—');
    // Simulate a real old localStorage save, then reload the standalone wrapper.
    await page.evaluate(()=>{
      const key=Object.keys(localStorage).find(k=>k.startsWith('codex:visualization-widget-state-v2:')&&!k.endsWith(':share-size-v1'));
      localStorage.setItem(key,JSON.stringify({modelContent:{version:1,weights:[1,0,.15],latitude:30,view:'meridian'},privateContent:{azimuth:.4,elevation:.2,zoom:1}}));
    });
    await page.reload();await f.locator('#geomag-lab[data-ready=true]').waitFor();
    assert.equal(await value('gm-i'),'+38.9°');assert.equal(await f.locator('#gm-lon').inputValue(),'0');
    assert.equal(await f.locator('#gm-d-tilt').inputValue(),'0');
    // KaTeX must accept the scientific manual without silently rendering errors.
    assert.equal(await f.locator('.katex-error').count(),0);
    assert.deepEqual(errors,[]);
    const report={result:'passed',checks:['WebGL','keyboard slider','east-only dipole','longitude/vertical declination','independent axes','persistence/reload','all cameras/displays/colors','mobile layout/input','axial reset/presets','null field','v1 migration','KaTeX','no page errors'],screenshots:['oriented-desktop.png','oriented-mobile.png']};
    fs.writeFileSync(path.join(output,'browser-results.json'),JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify(report));
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
