var e=1920,t=1080,n={push:1/7,dim:1/.8,calm:1/2,warp:1/.85},r=class{constructor(n){this.canvas=n,this.ok=!1,this.t=0,this.state={mix:0,has:0,mouse:[0,0],push:0,warp:0,calm:1,dim:1},this._to={push:0,warp:0,calm:1,dim:1},this._mixTarget=0,this._mouseTarget=[0,0];let r=n.getContext(`webgl2`,{alpha:!1,antialias:!1,depth:!1,stencil:!1,powerPreference:`high-performance`,desynchronized:!0,preserveDrawingBuffer:!1});if(!r)return;this.gl=r;let i=(e,t)=>{let n=r.createShader(e);if(r.shaderSource(n,t),r.compileShader(n),!r.getShaderParameter(n,r.COMPILE_STATUS))throw Error(r.getShaderInfoLog(n)||`shader`);return n};try{let n=r.createProgram();if(r.attachShader(n,i(r.VERTEX_SHADER,`#version 300 es
void main(){
  // full-screen triangle from gl_VertexID — no buffers, no VAO, nothing to bind
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`)),r.attachShader(n,i(r.FRAGMENT_SHADER,`#version 300 es
precision highp float;
out vec4 fragColor;

uniform sampler2D uStill;
uniform sampler2D uLive;
uniform vec2  uRes;         // canvas size in device px
uniform vec2  uImg;         // aspect of the source image (w,h) for cover-fit
uniform float uTime;
uniform float uMix;         // 0 still .. 1 live
uniform float uHas;         // 0 = no image yet: draw the procedural sky instead
uniform vec2  uMouse;       // -1..1 parallax
uniform float uPush;        // 0..1 slow dolly-in once loading starts
uniform float uWarp;        // 0..1 the dive at hand-off
uniform float uCalm;        // 1 while idle, ->0 as the live game (which has its own vfx) takes over
uniform float uDim;         // global exposure, dips under the loading UI

// Where the light is in the vista. At the menu's hour that is not the sun — it is the waystone, so the
// shafts radiate out of the crystal. Move this if the still is ever re-shot from a different pose.
const vec2 SUN = vec2(0.600, 0.740);

// ---- cheap value noise -----------------------------------------------------------------------
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1,0)), f.x), mix(h21(i + vec2(0,1)), h21(i + vec2(1,1)), f.x), f.y);
}
float fbm(vec2 p){ return 0.58 * vnoise(p) + 0.30 * vnoise(p * 2.07) + 0.12 * vnoise(p * 4.13); }

// ---- the stand-in sky, for the frames before the vista has decoded --------------------------
// Matched to the vista it stands in for: a violet night, a rose band on the mountain ring, an aether
// glow where the waystone is, and a dark field underneath. Never a black frame, and never a wrong one.
vec3 proceduralSky(vec2 uv){
  vec3 c = mix(vec3(0.055, 0.048, 0.115), vec3(0.145, 0.105, 0.255), pow(uv.y, 0.85));
  c = mix(c, vec3(0.42, 0.26, 0.35), pow(max(0.0, 1.0 - abs(uv.y - 0.66) * 4.2), 2.0));   // rose ridge band
  c += vec3(0.30, 0.24, 0.62) * pow(max(0.0, 1.0 - length((uv - SUN) * vec2(1.7, 1.0)) * 2.4), 3.0);
  float ridge = 0.545 + 0.055 * fbm(vec2(uv.x * 3.1 + 4.0, 0.5));
  c = mix(c, vec3(0.052, 0.075, 0.055), smoothstep(ridge + 0.012, ridge - 0.012, uv.y));   // the meadow
  return c;
}

// ---- the source picture, cover-fitted, with parallax + dolly --------------------------------
vec2 sourceUv(vec2 uv){
  float sa = uRes.x / uRes.y, ia = uImg.x / uImg.y;
  // COVER, and the direction matters: a screen WIDER than the picture keeps all of u and crops v; a
  // narrower one keeps all of v and crops u. Getting this backwards samples outside [0,1] and
  // CLAMP_TO_EDGE smears the border pixels across a third of the frame.
  vec2 f = sa > ia ? vec2(1.0, ia / sa) : vec2(sa / ia, 1.0);
  vec2 c = (uv - 0.5) * f;
  c *= 1.0 / (1.0 + 0.055 * uPush + 0.022);                     // a hair of headroom so parallax never samples off-image
  c += uMouse * vec2(0.011, 0.007) + vec2(0.0, -0.004 * uPush);
  c += vec2(sin(uTime * 0.045) * 0.0035, cos(uTime * 0.037) * 0.0026);   // never perfectly still
  return c + 0.5;
}

void main(){
  vec2 uv = gl_FragCoord.xy / uRes;

  // the dive: radial swirl + pinch toward the middle, only in the last second before hand-off
  if (uWarp > 0.001) {
    vec2 d = uv - 0.5; d.x *= uRes.x / uRes.y;
    float r = length(d);
    float a = uWarp * 2.0 * exp(-r * 2.4);
    d = mat2(cos(a), -sin(a), sin(a), cos(a)) * d;
    d *= 1.0 - uWarp * 0.42 * exp(-r * 1.6);
    d.x /= uRes.x / uRes.y;
    uv = d + 0.5;
  }

  vec2 su = sourceUv(uv);
  vec3 still = uHas > 0.5 ? texture(uStill, su).rgb : proceduralSky(uv);
  vec3 col = mix(still, texture(uLive, su).rgb, uMix);

  // ---- sun shafts. A 6-tap radial smear of whatever is already bright, which is what a god ray IS.
  // Costs 6 samples of the layer that is on screen; skipped entirely on the far side of the frame.
  float shaft = 0.0;
  vec2 toSun = SUN - uv;
  float sunFall = exp(-length(toSun * vec2(uRes.x / uRes.y, 1.0)) * 1.35);
  if (sunFall > 0.012) {
    vec2 step6 = toSun * 0.14;
    vec2 p = uv;
    for (int i = 0; i < 6; i++) {
      p += step6;
      vec3 s = uHas > 0.5 ? texture(uStill, sourceUv(p)).rgb : proceduralSky(p);
      s = mix(s, texture(uLive, sourceUv(p)).rgb, uMix);
      shaft += max(0.0, dot(s, vec3(0.30, 0.42, 0.22)) - 0.44);
    }
    // striated, drifting — a clean radial gradient reads as a lens flare, not as light through air
    float stri = 0.55 + 0.45 * fbm(vec2(atan(toSun.y, toSun.x) * 5.2, uTime * 0.06));
    shaft *= sunFall * stri * 0.085;
  }
  col += vec3(1.00, 0.80, 0.52) * shaft * (0.55 + 0.45 * uCalm);

  // ---- drifting aether motes: 3 parallax layers of a hashed grid. Saturated violet-gold, DIM.
  vec2 asp = vec2(uRes.x / uRes.y, 1.0);
  float motes = 0.0;
  for (int L = 0; L < 3; L++) {
    float fl = float(L);
    float sc = 9.0 + fl * 7.0;
    vec2 q = (uv * asp + uMouse * (0.006 + 0.010 * fl)) * sc;
    q.y -= uTime * (0.055 + 0.045 * fl);              // they rise
    q.x += sin(uTime * 0.13 + fl * 2.1 + q.y * 0.4) * 0.16;
    vec2 gi = floor(q), gf = fract(q) - 0.5;
    float rnd = h21(gi + fl * 37.0);
    if (rnd > 0.90) {                                  // ~10% of cells carry a mote
      float tw = 0.55 + 0.45 * sin(uTime * (1.1 + rnd * 2.0) + rnd * 30.0);
      motes += smoothstep(0.16, 0.0, length(gf)) * tw * (0.30 - 0.07 * fl);
    }
  }
  col += mix(vec3(0.42, 0.33, 0.95), vec3(0.95, 0.74, 0.34), 0.35) * motes * 0.55 * uCalm;

  // ---- haze drift across the lower third: the air moves even when the picture cannot
  float band = smoothstep(0.62, 0.18, uv.y) * smoothstep(0.02, 0.20, uv.y);
  float haze = fbm(vec2(uv.x * 2.6 - uTime * 0.014, uv.y * 4.0 + uTime * 0.008));
  col = mix(col, col * vec3(1.06, 1.00, 1.10) + vec3(0.055, 0.044, 0.085), band * haze * 0.30 * uCalm);

  // ---- grade: a touch of contrast and saturation, then vignette + grain, then the loading dip
  col = (col - 0.5) * 1.045 + 0.5;
  col = mix(vec3(dot(col, vec3(0.299, 0.587, 0.114))), col, 1.10);
  float vig = smoothstep(1.28, 0.34, length((uv - vec2(0.5, 0.48)) * vec2(1.05, 1.0)));
  col *= mix(0.52, 1.0, vig);
  col *= uDim;
  col += (h21(gl_FragCoord.xy + fract(uTime) * 71.3) - 0.5) * 0.022;   // film grain

  fragColor = vec4(max(col, 0.0), 1.0);
}`)),r.linkProgram(n),!r.getProgramParameter(n,r.LINK_STATUS))throw Error(r.getProgramInfoLog(n)||`link`);this.prog=n,r.useProgram(n),this.u={};for(let e of[`uStill`,`uLive`,`uRes`,`uImg`,`uTime`,`uMix`,`uHas`,`uMouse`,`uPush`,`uWarp`,`uCalm`,`uDim`])this.u[e]=r.getUniformLocation(n,e);r.uniform1i(this.u.uStill,0),r.uniform1i(this.u.uLive,1),r.uniform2f(this.u.uImg,e,t),this.texStill=this._makeTex(r),this.texLive=this._makeTex(r),this.vao=r.createVertexArray(),r.bindVertexArray(this.vao),this.ok=!0}catch(e){this.error=String(e?.message||e)}}_makeTex(e){let t=e.createTexture();return e.bindTexture(e.TEXTURE_2D,t),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),e.texImage2D(e.TEXTURE_2D,0,e.RGB,1,1,0,e.RGB,e.UNSIGNED_BYTE,new Uint8Array([26,20,48])),t}setSize(e,t){this.ok&&(this.canvas.width!==e||this.canvas.height!==t)&&(this.canvas.width=e,this.canvas.height=t,this.gl.viewport(0,0,e,t))}_upload(n,r){let i=this.gl;i.bindTexture(i.TEXTURE_2D,n),i.texImage2D(i.TEXTURE_2D,0,i.RGB,i.RGB,i.UNSIGNED_BYTE,r),i.uniform2f(this.u.uImg,r.width||e,r.height||t)}setStill(e){if(!this.ok||!e){e?.close?.();return}this._upload(this.texStill,e),this.state.has=1,e.close?.()}setLive(e){if(!this.ok||!e){e?.close?.();return}this._upload(this.texLive,e),this._mixTarget=1,e.close?.()}crossTo(e){if(!this.ok||!e){e?.close?.();return}let t=this._mixTarget<.5;this._upload(t?this.texLive:this.texStill,e),this._mixTarget=+!!t,this.state.has=1,e.close?.()}set(e){e.mouse&&(this._mouseTarget=e.mouse);for(let t of[`push`,`warp`,`dim`,`calm`])e[t]!==void 0&&(this._to[t]=e[t])}frame(e){if(!this.ok)return;let t=this.gl,r=this.state;this.t+=e,r.mix+=Math.min(1,e/(this.fadeSecs||2.4))*(this._mixTarget-r.mix),r.mouse[0]+=(this._mouseTarget[0]-r.mouse[0])*Math.min(1,e*3.2),r.mouse[1]+=(this._mouseTarget[1]-r.mouse[1])*Math.min(1,e*3.2);for(let t in n){let i=this._to[t]-r[t],a=n[t]*e;r[t]=Math.abs(i)<=a?this._to[t]:r[t]+Math.sign(i)*a}t.useProgram(this.prog),t.bindVertexArray(this.vao),t.activeTexture(t.TEXTURE0),t.bindTexture(t.TEXTURE_2D,this.texStill),t.activeTexture(t.TEXTURE1),t.bindTexture(t.TEXTURE_2D,this.texLive),t.uniform2f(this.u.uRes,this.canvas.width,this.canvas.height),t.uniform1f(this.u.uTime,this.t),t.uniform1f(this.u.uMix,r.mix),t.uniform1f(this.u.uHas,r.has),t.uniform2f(this.u.uMouse,r.mouse[0],r.mouse[1]),t.uniform1f(this.u.uPush,r.push),t.uniform1f(this.u.uWarp,r.warp**1.8*1.2),t.uniform1f(this.u.uCalm,r.calm*(1-.72*r.mix)),t.uniform1f(this.u.uDim,r.dim),t.drawArrays(t.TRIANGLES,0,3)}dispose(){let e=this.gl;if(e){try{e.deleteTexture(this.texStill),e.deleteTexture(this.texLive),e.deleteVertexArray(this.vao),e.deleteProgram(this.prog),e.getExtension(`WEBGL_lose_context`)?.loseContext()}catch{}this.ok=!1}}};export{r as t};