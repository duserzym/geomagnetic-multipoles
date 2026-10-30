const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../src/playground.html'), 'utf8');
const code = source.split('// PHYSICS_START')[1].split('// PHYSICS_END')[0];
const physics = vm.runInNewContext(code + '\n({fieldAt,localAt,trace,surfaceStats,potentialAt,axisFromAngles,geographicBasis})');
const {fieldAt,localAt,trace,surfaceStats,potentialAt,axisFromAngles,geographicBasis} = physics;
const rad = Math.PI / 180;
const close = (a,b,epsilon=1e-7) => assert.ok(Math.abs(a-b)<epsilon, String(a)+' != '+String(b));

test('dipole inclination and GAD inversion agree at all probe latitudes', () => {
  for(let lat=-85;lat<=85;lat+=5) {
    const v=localAt(lat,[1,0,0]);
    close(v.I,Math.atan(2*Math.tan(lat*rad))/rad);
    close(v.inferred,lat);
  }
});
test('Cartesian field agrees with the negative numerical gradient of the potential', () => {
  function potential(p,w) {
    const r=Math.hypot(...p),mu=p[1]/r;
    const P=[mu,(3*mu*mu-1)/2,(5*mu*mu*mu-3*mu)/2];
    return w.reduce((v,a,j)=>v-a*Math.pow(r,-j-2)*P[j],0);
  }
  const p=[1.4,.6,.3],w=[1,.13,.17],h=1e-5,b=fieldAt(p,w);
  for(let j=0;j<3;j++) {
    const a=p.slice(),c=p.slice();a[j]+=h;c[j]-=h;
    close(b[j],-(potential(a,w)-potential(c,w))/(2*h),1e-8);
  }
});
test('surface projection agrees with the printed equations', () => {
  for(let lat=-85;lat<=85;lat+=5)for(const w of [[1,0,.15],[.8,-.2,.4],[0,.5,0]]) {
    const s=Math.sin(lat*rad),c=Math.cos(lat*rad),[D,Q,O]=w,v=localAt(lat,w);
    close(v.north,c*(D+3*Q*s+1.5*O*(5*s*s-1)));
    close(v.down,2*D*s+1.5*Q*(3*s*s-1)+2*O*(5*s*s*s-3*s));
    const b=fieldAt([c,s,0],w);
    close(v.north,-s*b[0]+c*b[1]);close(v.down,-c*b[0]-s*b[1]);
  }
});
test('positive octupole ratio shallows midlatitude inclinations in both hemispheres', () => {
  for(const lat of [10,20,30,45,60,75]) {
    const dip=localAt(lat,[1,0,0]);
    assert.ok(localAt(lat,[1,0,.15]).I<dip.I);
    assert.ok(localAt(lat,[1,0,-.15]).I>dip.I);
    close(localAt(-lat,[1,0,.15]).I,-localAt(lat,[1,0,.15]).I);
  }
  const v=localAt(30,[1,0,.15]);
  close(v.I,38.877170369813015);
  close(v.inferred,21.955364483506308);
});
test('degrees 1, 2 and 3 decay as r^-3, r^-4 and r^-5', () => {
  for(let j=0;j<3;j++) {
    const w=[0,0,0];w[j]=1;
    const p=[1.2,.8,.4],b=fieldAt(p,w),bb=fieldAt(p.map(x=>2*x),w);
    b.forEach((x,k)=>close(bb[k],x/Math.pow(2,j+3)));
  }
});
test('superposition is linear and exterior field is divergence-free and curl-free', () => {
  const p=[1.4,.6,.3],w=[1,.1,.15],h=1e-5,b=fieldAt(p,w);
  const parts=w.map((a,j)=>fieldAt(p,w.map((v,k)=>k===j?a:0)));
  b.forEach((v,j)=>close(v,parts.reduce((sum,b)=>sum+b[j],0)));
  const db=[0,1,2].map(j=>{
    const a=p.slice(),b=p.slice();a[j]+=h;b[j]-=h;
    return fieldAt(a,w).map((v,k)=>(v-fieldAt(b,w)[k])/(2*h));
  });
  close(db[0][0]+db[1][1]+db[2][2],0,1e-8);
  close(db[1][2]-db[2][1],0,1e-8);
  close(db[2][0]-db[0][2],0,1e-8);
  close(db[0][1]-db[1][0],0,1e-8);
});
test('octupole radial polarity boundaries and meridional separatrices have the stated latitudes', () => {
  const boundary=Math.asin(Math.sqrt(3/5))/rad,separatrix=Math.asin(1/Math.sqrt(5))/rad;
  for(const lat of [0,-boundary,boundary])close(localAt(lat,[0,0,1]).down,0);
  for(const lat of [-separatrix,separatrix])close(localAt(lat,[0,0,1]).north,0);
  close(boundary,50.7684795164,1e-8);close(separatrix,26.5650511771,1e-8);
});
test('surface color scale extrema and zero-field values are finite', () => {
  close(surfaceStats([1,0,0]).maxRadial,2);
  close(surfaceStats([1,0,0]).maxStrength,2);
  close(surfaceStats([0,.5,0]).maxRadial,1.5);
  close(surfaceStats([0,0,.5]).maxRadial,2);
  close(surfaceStats([0,0,0]).maxStrength,0);
  assert.equal(localAt(30,[0,0,0]).I,null);
  assert.equal(localAt(30,[0,0,0]).inferred,null);
});
test('forward and backward exterior branches are symmetric and remain outside Earth', () => {
  const s=Math.sin(70*rad)*1.003,c=Math.cos(70*rad)*1.003,w=[1,0,.15];
  const south=trace([c,-s,0],w,1),north=trace([c,s,0],w,-1);
  assert.ok(south.length>20);assert.equal(south.length,north.length);
  south.forEach((p,j)=>{
    assert.ok(Math.hypot(...p)>=.99999);
    close(p[0],north[j][0]);close(p[1],-north[j][1]);
  });
});

const axes = [axisFromAngles(32,47),axisFromAngles(79,-120),axisFromAngles(146,12)];
const dot = (a,b) => a.reduce((v,x,j)=>v+x*b[j],0);
const closeVector = (a,b,epsilon=1e-8) => a.forEach((v,j)=>close(v,b[j],epsilon));
// Rodrigues rotation about an arbitrary, non-geographic axis.
function rotate(p) {
  const a=[2/3,-1/3,2/3],angle=.81,c=Math.cos(angle),s=Math.sin(angle),d=dot(a,p);
  const cross=[a[1]*p[2]-a[2]*p[1],a[2]*p[0]-a[0]*p[2],a[0]*p[1]-a[1]*p[0]];
  return p.map((v,j)=>c*v+s*cross[j]+(1-c)*d*a[j]);
}
test('zero tilt reproduces all axial outputs regardless of azimuth or longitude', () => {
  const aligned=[-170,29,180].map(a=>axisFromAngles(0,a)),w=[.85,-.21,.18];
  for(const lat of [-90,-62,-13,0,30,84,90])for(const lon of [-180,-57,0,94,180]) {
    const a=localAt(lat,w),b=localAt(lat,w,aligned,lon);
    for(const key of ['north','east','down','magnitude','I'])close(a[key],b[key]);
  }
});
test('tilted field agrees with negative finite-difference potential gradient', () => {
  for(const p of [[1.4,.6,.3],[-.8,1.2,-.5],[0,1.7,0]])for(const w of [[1,.13,.17],[0,-.2,.4]]) {
    const h=1e-5,b=fieldAt(p,w,axes);
    for(let j=0;j<3;j++) {
      const a=p.slice(),c=p.slice();a[j]+=h;c[j]-=h;
      close(b[j],-(potentialAt(a,w,axes)-potentialAt(c,w,axes))/(2*h),1e-8);
    }
  }
});
test('analytic tilted dipole and independently rotated component linearity', () => {
  const p=[1.4,-.7,.8],w=[.9,-.21,.32],r=Math.hypot(...p),rhat=p.map(v=>v/r),a=axes[0];
  const expected=a.map((v,j)=>w[0]/r**3*(v-3*dot(a,rhat)*rhat[j]));
  closeVector(fieldAt(p,[w[0],0,0],axes),expected);
  const parts=w.map((v,j)=>fieldAt(p,w.map((x,k)=>k===j?v:0),axes));
  closeVector(fieldAt(p,w,axes),[0,1,2].map(j=>parts.reduce((sum,b)=>sum+b[j],0)));
});
test('field, potential and full 3D traces are covariant under a common rotation', () => {
  const p=[1.2,.8,.4],w=[1,.1,.15],rotatedAxes=axes.map(rotate);
  closeVector(fieldAt(rotate(p),w,rotatedAxes),rotate(fieldAt(p,w,axes)));
  close(potentialAt(rotate(p),w,rotatedAxes),potentialAt(p,w,axes));
  const seed=geographicBasis(51,37).radial.map(v=>v*1.003),b=fieldAt(seed,w,axes),direction=dot(seed,b)>0?1:-1;
  const a=trace(seed,w,direction,axes),c=trace(rotate(seed),w,direction,rotatedAxes);
  assert.ok(a.length>10);assert.equal(a.length,c.length);
  a.forEach((point,j)=>{assert.ok(Math.hypot(...point)>=.99999);closeVector(rotate(point),c[j]);});
  assert.ok(a.some(point=>Math.abs(dot(point,geographicBasis(51,37).east))>.02),'trace must leave its seed meridian');
});
test('axis reversal preserves even degree and reverses odd degree, with radial decay', () => {
  const p=[1.2,.8,.4],reversed=axes.map(a=>a.map(v=>-v));
  for(let j=0;j<3;j++) {
    const w=[0,0,0];w[j]=1;
    const b=fieldAt(p,w,axes),c=fieldAt(p,w,reversed),sign=j===1?1:-1;
    closeVector(c,b.map(v=>sign*v));
    closeVector(fieldAt(p.map(v=>2*v),w,axes),b.map(v=>v/2**(j+3)));
  }
});
test('longitude-aware probe includes east and full horizontal magnitude', () => {
  const eastAxis=[axisFromAngles(90,90),[0,1,0],[0,1,0]];
  const a=localAt(0,[1,0,0],eastAxis,0);
  close(a.north,0);close(a.down,0);close(a.east,1);close(a.horizontal,1);
  close(a.I,0);close(a.declination,90);assert.equal(a.inferred,null);
  const b=localAt(0,[1,0,0],eastAxis,90);
  close(b.down,2);close(b.horizontal,0);close(b.I,90);assert.equal(b.declination,null);
  const w=[1,.2,.3],v=localAt(36,w,axes,-71),basis=geographicBasis(36,-71),field=fieldAt(basis.radial,w,axes);
  close(v.north,dot(field,basis.north));close(v.east,dot(field,basis.east));close(v.down,-dot(field,basis.radial));
  close(v.I,Math.atan2(v.down,Math.hypot(v.north,v.east))/rad);
  close(v.declination,Math.atan2(v.east,v.north)/rad);
  assert.ok(Math.abs(v.I-localAt(36,w,axes,30).I)>1);
});
test('zero, cancellation, near-zero and reversed polarity avoid spurious directions or latitude', () => {
  for(const w of [[0,0,0],[1e-12,0,0],[1,0,2/3]]) {
    const v=localAt(0,w);
    assert.equal(v.I,null);assert.equal(v.declination,null);assert.equal(v.inferred,null);
  }
  const reversed=localAt(30,[1,0,0],[[0,-1,0],[0,1,0],[0,1,0]]);
  close(Math.abs(reversed.declination),180);assert.equal(reversed.inferred,null);
  const v=localAt(36,[1,.2,.3],axes,-71);
  if(v.north>1e-9)close(v.inferred,Math.atan2(v.down,2*v.horizontal)/rad);
});
test('tilted surface normalization samples the full sphere and exact component poles', () => {
  const s=surfaceStats([1,0,0],axes);close(s.maxRadial,2);close(s.maxStrength,2);
  for(const lat of [-60,0,45])for(const lon of [-150,-30,80]) {
    const v=localAt(lat,[1,0,0],axes,lon);
    assert.ok(v.magnitude<=s.maxStrength+1e-8);assert.ok(Math.abs(v.down)<=s.maxRadial+1e-8);
  }
});
test('saved state migrates v1 and clamps malformed v2 orientation values', () => {
  const stateCode=source.split('// STATE_START')[1].split('// STATE_END')[0];
  const context=vm.createContext({state:{},initial:{weights:[1,0,.15],orientations:[[0,0],[0,0],[0,0]]},examples:{gad:[1,0,0]}});
  vm.runInContext(stateCode,context);
  context.restore({modelContent:{version:1,weights:[.8,.1,.2],latitude:-42,view:'meridian'}});
  assert.deepEqual(JSON.parse(JSON.stringify(context.state.orientations)),[[0,0],[0,0],[0,0]]);
  assert.equal(context.state.longitude,0);assert.equal(context.state.latitude,-42);
  context.restore({modelContent:{version:2,orientations:[[999,-999],[NaN,Infinity],null],longitude:999,vectorPlane:'ne'}});
  assert.deepEqual(JSON.parse(JSON.stringify(context.state.orientations)),[[180,-180],[0,0],[0,0]]);
  assert.equal(context.state.longitude,180);assert.equal(context.state.vectorPlane,'ne');
});
