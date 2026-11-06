// Little Lives — WebGL2 renderer: skinning, shadowed key light, interior point lights, DOF post
(function () {
  const { M4, V } = LL;
  const MAX_BONES = 40, MAX_LIGHTS = 8;

  const VS = `#version 300 es
  precision highp float;
  layout(location=0) in vec3 aPos; layout(location=1) in vec3 aNrm; layout(location=2) in vec2 aUv;
  layout(location=3) in vec4 aCol; layout(location=4) in vec2 aMat; layout(location=5) in vec2 aJ; layout(location=6) in vec2 aW;
  uniform mat4 uModel, uViewProj, uShadowMat; uniform mat4 uBones[${MAX_BONES}]; uniform float uSkinned;
  out vec3 vP; out vec3 vN; out vec2 vUv; out vec4 vCol; out vec2 vMat; out vec4 vSh;
  void main(){
    vec4 p = vec4(aPos,1.0); vec3 n = aNrm;
    if(uSkinned > 0.5){
      mat4 s = uBones[int(aJ.x)]*aW.x + uBones[int(aJ.y)]*aW.y;
      p = s*p; n = mat3(s)*n;
    }
    vec4 w = uModel*p; vP = w.xyz; vN = normalize(mat3(uModel)*n); vUv = aUv; vCol = aCol; vMat = aMat;
    vSh = uShadowMat*(w + vec4(vN*0.035,0.0));
    gl_Position = uViewProj*w;
  }`;
  const FS = `#version 300 es
  precision highp float; precision highp sampler2DShadow;
  in vec3 vP; in vec3 vN; in vec2 vUv; in vec4 vCol; in vec2 vMat; in vec4 vSh;
  uniform sampler2D uTex; uniform sampler2DShadow uShadow; uniform vec4 uTint; uniform float uWrap, uInterior, uEmis, uRim, uUnlit, uExposure;
  uniform vec3 uEye, uKeyDir, uKeyCol, uSky, uGround; uniform vec2 uShadowTexel;
  uniform vec4 uLP[${MAX_LIGHTS}]; uniform vec4 uLC[${MAX_LIGHTS}]; uniform int uNL; uniform vec4 uRoom; uniform float uRoomFloor;
  out vec4 o;
  float shadow(){
    vec3 s = vSh.xyz/vSh.w*0.5+0.5; if(s.x<0.0||s.x>1.0||s.y<0.0||s.y>1.0) return 1.0;
    float sum=0.0; s.z -= 0.0018;
    for(int x=-1;x<=1;x++) for(int y=-1;y<=1;y++) sum += texture(uShadow, vec3(s.xy+vec2(x,y)*uShadowTexel*1.4, s.z));
    return sum/9.0;
  }
  vec3 aces(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14),0.0,1.0); }
  void main(){
    vec4 tx = texture(uTex, vUv);
    vec3 base = vCol.rgb * tx.rgb * uTint.rgb;
    float alpha = tx.a * uTint.a; if(alpha < 0.02) discard;
    if(uUnlit > 0.5){ o = vec4(pow(aces(base*uEmis), vec3(1.0/2.2)), alpha); return; }
    vec3 N = normalize(vN); if(!gl_FrontFacing) N = -N;
    vec3 Vd = normalize(uEye - vP);
    float shin = mix(6.0, 140.0, vMat.x), spec = vCol.a;
    float w = uWrap;
    float ndl = max((dot(N,uKeyDir)+w)/(1.0+w), 0.0);
    float sh = shadow();
    vec3 H = normalize(uKeyDir+Vd);
    vec3 col = base * uKeyCol * ndl * sh;
    col += uKeyCol * spec * pow(max(dot(N,H),0.0), shin) * sh * (shin+8.0)/40.0;
    // subsurface-ish warm terminator for skin
    col += base * uKeyCol * vec3(0.25,0.06,0.03) * w * max(0.0, 1.0-abs(dot(N,uKeyDir))) * sh;
    // hemisphere ambient
    vec3 amb = mix(uGround, uSky, N.y*0.5+0.5);
    // ambient occlusion-ish darkening toward room corners/floor
    float ao = 1.0;
    if(uInterior > 0.5){
      float dx = min(vP.x-uRoom.x, uRoom.y-vP.x), dz = vP.z-uRoom.z, dy = vP.y-uRoomFloor;
      ao = 0.62 + 0.38*smoothstep(0.0,1.3,min(min(dx,dz+0.2),dy+0.35));
    }
    col += base * amb * ao;
    if(uInterior > 0.5){
      for(int i=0;i<${MAX_LIGHTS};i++){ if(i>=uNL) break;
        vec3 L = uLP[i].xyz - vP; float d = length(L); L/=d; float R = uLP[i].w;
        float fall = clamp(1.0 - pow(d/R,4.0),0.0,1.0); fall = fall*fall/(1.0+d*d*0.35);
        float nl = max((dot(N,L)+w*0.6)/(1.0+w*0.6),0.0);
        vec3 lc = uLC[i].rgb*uLC[i].a*fall;
        col += base*lc*nl*ao;
        vec3 h2 = normalize(L+Vd);
        col += lc*spec*pow(max(dot(N,h2),0.0), shin)*(shin+8.0)/60.0;
      }
    }
    // soft rim for doll-like characters
    float rim = pow(1.0-max(dot(N,Vd),0.0), 3.0);
    col += base * rim * uRim * (uSky*0.6+uKeyCol*0.4);
    col += base * (vMat.y + uEmis);
    o = vec4(pow(aces(col*uExposure), vec3(1.0/2.2)), alpha);
  }`;
  const SVS = `#version 300 es
  layout(location=0) in vec3 aPos; layout(location=5) in vec2 aJ; layout(location=6) in vec2 aW;
  uniform mat4 uModel, uViewProj; uniform mat4 uBones[${MAX_BONES}]; uniform float uSkinned;
  void main(){ vec4 p=vec4(aPos,1.0); if(uSkinned>0.5){ mat4 s=uBones[int(aJ.x)]*aW.x+uBones[int(aJ.y)]*aW.y; p=s*p; } gl_Position=uViewProj*uModel*p; }`;
  const SFS = `#version 300 es
  precision mediump float; out vec4 o; void main(){ o=vec4(1.0); }`;
  const PVS = `#version 300 es
  layout(location=0) in vec3 aPos; layout(location=1) in vec4 aCol; layout(location=2) in vec2 aOff;
  uniform mat4 uViewProj; uniform vec3 uRight, uUp; out vec4 vCol; out vec2 vO;
  void main(){ vCol=aCol; vO=aOff; vec3 p=aPos+(uRight*aOff.x+uUp*aOff.y)*aCol.a; gl_Position=uViewProj*vec4(p,1.0); }`;
  const PFS = `#version 300 es
  precision mediump float; in vec4 vCol; in vec2 vO; uniform float uAlpha; out vec4 o;
  void main(){ float d = length(vO); if(d>1.0) discard; float a = (1.0-d*d); o = vec4(vCol.rgb, a*a*uAlpha); }`;
  const QVS = `#version 300 es
  out vec2 vUv; void main(){ vec2 p=vec2((gl_VertexID<<1)&2, gl_VertexID&2); vUv=p; gl_Position=vec4(p*2.0-1.0,0.0,1.0); }`;
  const QFS = `#version 300 es
  precision highp float; in vec2 vUv; uniform sampler2D uC, uD; uniform vec2 uRes; uniform float uNear, uFar, uFocus, uAperture, uMaxR, uVig, uTime;
  out vec4 o;
  float lin(float d){ float z=d*2.0-1.0; return 2.0*uNear*uFar/(uFar+uNear-z*(uFar-uNear)); }
  float coc(float z){ return clamp(abs(1.0/uFocus - 1.0/z)*uAperture*uFocus, 0.0, 1.0)*uMaxR; }
  void main(){
    float z = lin(texture(uD,vUv).r);
    float c0 = coc(z);
    vec3 acc = texture(uC,vUv).rgb; float wsum = 1.0;
    vec3 glow = vec3(0.0);
    const float GA = 2.39996;
    for(int i=1;i<28;i++){
      float r = sqrt(float(i)/27.0); float a = float(i)*GA;
      vec2 off = vec2(cos(a),sin(a))*r;
      vec2 uv = vUv + off*c0/uRes;
      float zs = lin(texture(uD,uv).r); float cs = coc(zs);
      float w = (zs < z) ? clamp(cs/max(c0,0.5),0.0,1.0) : 1.0; // background samples behind sharp fg don't bleed
      w *= smoothstep(r*c0-1.0, r*c0+1.0, cs+1.0);
      vec3 s = texture(uC,uv).rgb; acc += s*w; wsum += w;
      vec3 g = texture(uC, vUv + off*14.0/uRes).rgb; glow += max(g-0.86, 0.0);
    }
    vec3 col = acc/wsum + glow*0.09;
    vec2 q = vUv-0.5; col *= 1.0 - dot(q,q)*uVig;
    col = mix(col, col*vec3(1.03,0.99,0.94), 0.5);
    float n = fract(sin(dot(vUv*uRes+uTime, vec2(12.9898,78.233)))*43758.5453);
    col += (n-0.5)/255.0*1.5;
    o = vec4(col,1.0);
  }`;

  function compile(gl, vs, fs) {
    const p = gl.createProgram();
    for (const [t, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]]) {
      const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error('Shader: ' + gl.getShaderInfoLog(s));
      gl.attachShader(p, s);
    }
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('Link: ' + gl.getProgramInfoLog(p));
    const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) { const info = gl.getActiveUniform(p, i); const name = info.name.replace('[0]', ''); u[name] = gl.getUniformLocation(p, info.name); }
    return { p, u };
  }

  class Renderer {
    constructor(canvas, opts = {}) {
      this.canvas = canvas;
      const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: !!opts.preserve });
      if (!gl) throw new Error('WebGL2 is not available on this device.');
      this.gl = gl;
      this.mobile = opts.mobile;
      this.main = compile(gl, VS, FS); this.shad = compile(gl, SVS, SFS); this.post = compile(gl, QVS, QFS); this.part = compile(gl, PVS, PFS);
      this.white = this.texture(null);
      this.shadowSize = this.mobile ? 1024 : 2048;
      this._shadowFbo();
      this.samples = Math.min(4, gl.getParameter(gl.MAX_SAMPLES) || 0);
      this.partBuf = gl.createBuffer(); this.partVao = gl.createVertexArray();
      gl.bindVertexArray(this.partVao); gl.bindBuffer(gl.ARRAY_BUFFER, this.partBuf);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 36, 0);
      gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 36, 12);
      gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 36, 28);
      gl.bindVertexArray(null);
      this.emptyVao = gl.createVertexArray();
      this.boneIdent = new Float32Array(MAX_BONES * 16); for (let i = 0; i < MAX_BONES; i++) this.boneIdent.set(M4.ident(), i * 16);
      this.stats = { draws: 0, tris: 0 };
    }
    _shadowFbo() {
      const gl = this.gl, S = this.shadowSize;
      this.shTex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, this.shTex);
      gl.texStorage2D(gl.TEXTURE_2D, 1, gl.DEPTH_COMPONENT24, S, S);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE);
      this.shFbo = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, this.shFbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this.shTex, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
    resize(w, h) {
      const gl = this.gl;
      if (this.W === w && this.H === h) return;
      this.W = w; this.H = h; this.canvas.width = w; this.canvas.height = h;
      const del = (o, f) => o && gl[f](o);
      del(this.msFbo, 'deleteFramebuffer'); del(this.msCol, 'deleteRenderbuffer'); del(this.msDep, 'deleteRenderbuffer');
      del(this.rtFbo, 'deleteFramebuffer'); del(this.rtCol, 'deleteTexture'); del(this.rtDep, 'deleteTexture');
      const tex = (fmt) => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texStorage2D(gl.TEXTURE_2D, 1, fmt, w, h);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); return t; };
      this.rtCol = tex(gl.RGBA8); this.rtDep = tex(gl.DEPTH_COMPONENT24);
      gl.bindTexture(gl.TEXTURE_2D, this.rtDep); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      this.rtFbo = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, this.rtFbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.rtCol, 0);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this.rtDep, 0);
      this.msFbo = null;
      if (this.samples > 1) {
        this.msFbo = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, this.msFbo);
        this.msCol = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, this.msCol); gl.renderbufferStorageMultisample(gl.RENDERBUFFER, this.samples, gl.RGBA8, w, h);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, this.msCol);
        this.msDep = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, this.msDep); gl.renderbufferStorageMultisample(gl.RENDERBUFFER, this.samples, gl.DEPTH_COMPONENT24, w, h);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.msDep);
        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) this.msFbo = null;
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
    upload(m) {
      const gl = this.gl;
      const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
      const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, m.data, gl.STATIC_DRAW);
      const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, m.index, gl.STATIC_DRAW);
      const S = LL.MeshBuilder.STRIDE * 4;
      const at = [[0, 3, 0], [1, 3, 3], [2, 2, 6], [3, 4, 8], [4, 2, 12], [5, 2, 14], [6, 2, 16]];
      for (const [l, n, o] of at) { gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, n, gl.FLOAT, false, S, o * 4); }
      gl.bindVertexArray(null);
      return { vao, count: m.count };
    }
    texture(canvas, opt = {}) {
      const gl = this.gl; const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
      if (!canvas) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));
      else gl.texImage2D(gl.TEXTURE_2D, 0, opt.linear ? gl.RGBA : gl.SRGB8_ALPHA8, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      const wrap = opt.clamp ? gl.CLAMP_TO_EDGE : gl.REPEAT;
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
      const ext = gl.getExtension('EXT_texture_filter_anisotropic');
      if (ext) gl.texParameterf(gl.TEXTURE_2D, ext.TEXTURE_MAX_ANISOTROPY_EXT, 4);
      return t;
    }
    // scene: {items, cam:{view,proj,eye}, env:{keyDir,keyCol,sky,ground,lights:[{p,r,c,i}]}, shadowBox, post:{focus,aperture}, particles}
    render(scene) {
      const gl = this.gl; const env = scene.env;
      this.stats.draws = 0; this.stats.tris = 0;
      // shadow pass
      const kd = V.norm(env.keyDir), sc = scene.shadowCenter, R = scene.shadowRadius;
      const lpos = V.add(sc, V.scale(kd, R * 2));
      const lview = M4.lookAt(lpos, sc, Math.abs(kd[1]) > 0.95 ? [0, 0, 1] : [0, 1, 0]);
      const lproj = M4.ortho(-R, R, -R, R, 0.1, R * 4);
      const lvp = M4.mul(lproj, lview);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.shFbo); gl.viewport(0, 0, this.shadowSize, this.shadowSize);
      gl.clear(gl.DEPTH_BUFFER_BIT); gl.enable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE); gl.colorMask(false, false, false, false);
      gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(1.5, 3);
      const sp = this.shad; gl.useProgram(sp.p); gl.uniformMatrix4fv(sp.u.uViewProj, false, lvp);
      for (const it of scene.items) {
        if (!it.visible || it.noShadow || (it.tint && it.tint[3] < 0.99)) continue;
        gl.uniformMatrix4fv(sp.u.uModel, false, it.model);
        gl.uniform1f(sp.u.uSkinned, it.bones ? 1 : 0); if (it.bones) gl.uniformMatrix4fv(sp.u.uBones, false, it.bones);
        gl.bindVertexArray(it.mesh.vao); gl.drawElements(gl.TRIANGLES, it.mesh.count, gl.UNSIGNED_INT, 0);
      }
      gl.disable(gl.POLYGON_OFFSET_FILL); gl.colorMask(true, true, true, true);
      // main pass
      const target = this.msFbo || this.rtFbo;
      gl.bindFramebuffer(gl.FRAMEBUFFER, target); gl.viewport(0, 0, this.W, this.H);
      const bg = env.clear || [0.1, 0.08, 0.07];
      gl.clearColor(bg[0], bg[1], bg[2], 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      const mp = this.main, u = mp.u; gl.useProgram(mp.p);
      const vp = M4.mul(scene.cam.proj, scene.cam.view);
      gl.uniformMatrix4fv(u.uViewProj, false, vp); gl.uniformMatrix4fv(u.uShadowMat, false, lvp);
      gl.uniform3fv(u.uEye, scene.cam.eye); gl.uniform3fv(u.uKeyDir, kd); gl.uniform3fv(u.uKeyCol, env.keyCol);
      gl.uniform1f(u.uExposure, env.exposure || 0.9); gl.uniform3fv(u.uSky, env.sky); gl.uniform3fv(u.uGround, env.ground);
      gl.uniform2f(u.uShadowTexel, 1 / this.shadowSize, 1 / this.shadowSize);
      gl.uniform4fv(u.uRoom, env.room || [-100, 100, -100, 100]); gl.uniform1f(u.uRoomFloor, env.roomFloor || 0);
      const L = env.lights.filter((l) => l.i > 0.001).slice(0, MAX_LIGHTS);
      const lp = new Float32Array(MAX_LIGHTS * 4), lc = new Float32Array(MAX_LIGHTS * 4);
      L.forEach((l, k) => { lp.set([l.p[0], l.p[1], l.p[2], l.r], k * 4); lc.set([l.c[0], l.c[1], l.c[2], l.i], k * 4); });
      gl.uniform4fv(u.uLP, lp); gl.uniform4fv(u.uLC, lc); gl.uniform1i(u.uNL, L.length);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.shTex); gl.uniform1i(u.uShadow, 1);
      gl.activeTexture(gl.TEXTURE0); gl.uniform1i(u.uTex, 0);
      const opaque = [], blend = [];
      for (const it of scene.items) if (it.visible) ((it.tint && it.tint[3] < 0.99) || it.blend ? blend : opaque).push(it);
      const eye = scene.cam.eye;
      blend.sort((a, b) => V.dist(eye, [b.model[12], b.model[13], b.model[14]]) - V.dist(eye, [a.model[12], a.model[13], a.model[14]]));
      const draw = (it) => {
        gl.uniformMatrix4fv(u.uModel, false, it.model);
        gl.uniform1f(u.uSkinned, it.bones ? 1 : 0); if (it.bones) gl.uniformMatrix4fv(u.uBones, false, it.bones);
        gl.bindTexture(gl.TEXTURE_2D, it.tex || this.white);
        gl.uniform4fv(u.uTint, it.tint || [1, 1, 1, 1]);
        gl.uniform1f(u.uWrap, it.wrap || 0); gl.uniform1f(u.uInterior, it.interior ? 1 : 0);
        gl.uniform1f(u.uEmis, it.emis || 0); gl.uniform1f(u.uRim, it.rim || 0); gl.uniform1f(u.uUnlit, it.unlit ? 1 : 0);
        gl.bindVertexArray(it.mesh.vao); gl.drawElements(gl.TRIANGLES, it.mesh.count, gl.UNSIGNED_INT, 0);
        this.stats.draws++; this.stats.tris += it.mesh.count / 3;
      };
      gl.disable(gl.BLEND); gl.depthMask(true);
      opaque.forEach(draw);
      gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);
      blend.forEach(draw);
      // particles
      if (scene.particles && scene.particles.length) {
        const P = scene.particles; const data = new Float32Array(P.length * 6 * 9);
        const offs = [[-1, -1], [1, -1], [1, 1], [-1, -1], [1, 1], [-1, 1]];
        let k = 0;
        for (const p of P) for (const o of offs) { data.set([p.p[0], p.p[1], p.p[2], p.c[0], p.c[1], p.c[2], p.s, o[0], o[1]], k); k += 9; }
        const pp = this.part; gl.useProgram(pp.p);
        gl.uniformMatrix4fv(pp.u.uViewProj, false, vp);
        const v = scene.cam.view; gl.uniform3f(pp.u.uRight, v[0], v[4], v[8]); gl.uniform3f(pp.u.uUp, v[1], v[5], v[9]);
        gl.uniform1f(pp.u.uAlpha, 1);
        gl.bindVertexArray(this.partVao); gl.bindBuffer(gl.ARRAY_BUFFER, this.partBuf); gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
        // per-particle alpha is baked into colour via premultiplied fade
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
        gl.drawArrays(gl.TRIANGLES, 0, P.length * 6);
      }
      gl.depthMask(true); gl.disable(gl.BLEND);
      if (this.msFbo) {
        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.msFbo); gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this.rtFbo);
        gl.blitFramebuffer(0, 0, this.W, this.H, 0, 0, this.W, this.H, gl.COLOR_BUFFER_BIT, gl.NEAREST);
        gl.blitFramebuffer(0, 0, this.W, this.H, 0, 0, this.W, this.H, gl.DEPTH_BUFFER_BIT, gl.NEAREST);
      }
      // post
      gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, this.W, this.H); gl.disable(gl.DEPTH_TEST);
      const q = this.post; gl.useProgram(q.p);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.rtCol); gl.uniform1i(q.u.uC, 0);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.rtDep); gl.uniform1i(q.u.uD, 1);
      gl.uniform2f(q.u.uRes, this.W, this.H); gl.uniform1f(q.u.uNear, scene.cam.near); gl.uniform1f(q.u.uFar, scene.cam.far);
      gl.uniform1f(q.u.uFocus, scene.post.focus); gl.uniform1f(q.u.uAperture, scene.post.aperture);
      gl.uniform1f(q.u.uMaxR, scene.post.maxR * (this.H / 900)); gl.uniform1f(q.u.uVig, 0.9); gl.uniform1f(q.u.uTime, (performance.now() % 1000));
      gl.bindVertexArray(this.emptyVao); gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.enable(gl.DEPTH_TEST); gl.activeTexture(gl.TEXTURE0);
    }
  }
  Renderer.MAX_BONES = MAX_BONES;
  LL.Renderer = Renderer;
})();
