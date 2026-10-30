const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../src/playground.html'), 'utf8');
const code = source.split('// PHYSICS_START')[1].split('// PHYSICS_END')[0];
const physics = vm.runInNewContext(code + '\n({fieldAt,localAt,trace,surfaceStats})');
const {fieldAt,localAt,trace,surfaceStats} = physics;
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
