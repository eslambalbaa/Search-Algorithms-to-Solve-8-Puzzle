        /* ---------- config ---------- */
        const IMAGES = {
            idle: 'assets/idle.jfif',
            busy: 'assets/animating.jfif',
            happy: 'assets/happy.jfif'
        };
        const TRANSPARENT_IMAGES = false;   // true = no frame/background behind Patrick
        const SPEEDS_MS = { 1: 900, 2: 650, 3: 450, 4: 280, 5: 150 };  // time per move

        /* ---------- elements ---------- */
        const $ = id => document.getElementById(id);
        const boardEl = $('board'), playBtn = $('playBtn'), boardInput = $('boardInput');
        const algoSelect = $('algoSelect'), speedEl = $('speed'), statusEl = $('status');
        const wrap = $('patrickWrap'), speech = $('speech');
        const pics = { idle: $('imgIdle'), busy: $('imgBusy'), happy: $('imgHappy') };
        const statsEls = { nodes: $('nodesExpanded'), depth: $('searchDepth'), time: $('runningTime') };
        const traceBtn = $('traceBtn'), tracePanel = $('tracePanel'), traceList = $('traceList');
        let traceInitial = null, traceMoves = [], traceIndex = 0;
        let isPlaybackRunning = false;
        const TRACE_PAGE_SIZE = 20; // Render one page at a time, even for very long DFS paths.

        function traceLength() { return traceInitial ? traceMoves.length + 1 : 0; }
        function formatCount(value) {
            const n = Number(value);
            return Number.isFinite(n) ? Math.round(n).toLocaleString() : '—';
        }
        function updateStats(data) {
            statsEls.nodes.textContent = data.nodes_expanded == null ? '—' : formatCount(data.nodes_expanded);
            statsEls.depth.textContent = data.search_depth == null ? (data.cost == null ? '—' : formatCount(data.cost)) : formatCount(data.search_depth);
            if (data.running_time == null || !Number.isFinite(Number(data.running_time))) statsEls.time.textContent = '—';
            else {
                const seconds = Number(data.running_time);
                statsEls.time.textContent = seconds < 1 ? `${(seconds * 1000).toFixed(2)} ms` : `${seconds.toFixed(3)} s`;
            }
        }
        function applyMoveToState(board, move) {
            const z = board.indexOf(0), m = String(move).toLowerCase();
            let target = z;
            if (m === 'u' || m === 'up') target -= 3;
            else if (m === 'd' || m === 'down') target += 3;
            else if (m === 'l' || m === 'left') { if (z % 3 === 0) return; target--; }
            else if (m === 'r' || m === 'right') { if (z % 3 === 2) return; target++; }
            if (target < 0 || target > 8) return;
            [board[z], board[target]] = [board[target], board[z]];
        }
        // Reconstruct one state on demand instead of storing an array for every move.
        function getTraceBoard(index) {
            if (!traceInitial) return null;
            const board = traceInitial.slice();
            for (let i = 0; i < index && i < traceMoves.length; i++) applyMoveToState(board, traceMoves[i]);
            return board;
        }
        function renderTrace() {
            traceList.innerHTML = '';
            const count = traceLength();
            if (!count) {
                $('traceCount').textContent = 'No solution loaded';
                $('tracePrev').disabled = $('traceNext').disabled = $('traceShowCurrent').disabled = true;
                return;
            }
            const pageCount = Math.ceil(count / TRACE_PAGE_SIZE);
            const pageIndex = Math.floor(traceIndex / TRACE_PAGE_SIZE);
            const first = pageIndex * TRACE_PAGE_SIZE;
            const last = Math.min(count, first + TRACE_PAGE_SIZE);
            const board = getTraceBoard(first);
            for (let index = first; index < last; index++) {
                if (index > first) applyMoveToState(board, traceMoves[index - 1]);
                const card = document.createElement('article');
                card.className = 'trace-step' + (index === traceIndex ? ' current' : '');
                const top = document.createElement('div'); top.className = 'trace-step-top';
                const label = document.createElement('span'); label.textContent = index === 0 ? 'Start' : `Step ${index.toLocaleString()}`;
                const move = document.createElement('span'); move.className = 'trace-move';
                move.textContent = index === 0 ? 'Initial state' : `Move: ${traceMoves[index - 1]}`;
                top.append(label, move); card.appendChild(top);
                const mini = document.createElement('div'); mini.className = 'mini-board'; mini.setAttribute('aria-label', `Board state ${index}`);
                board.forEach(value => {
                    const tile = document.createElement('div');
                    tile.className = 'mini-tile' + (value === 0 ? ' blank' : '');
                    tile.textContent = value === 0 ? ' ' : value;
                    mini.appendChild(tile);
                });
                card.appendChild(mini);
                const show = document.createElement('button');
                show.type = 'button'; show.textContent = 'Show on main board'; show.disabled = isPlaybackRunning;
                show.addEventListener('click', () => {
                    traceIndex = index;
                    if (!isPlaybackRunning) buildBoard(getTraceBoard(index));
                    renderTrace();
                });
                card.appendChild(show); traceList.appendChild(card);
            }
            $('traceCount').textContent = `Page ${(pageIndex + 1).toLocaleString()} of ${pageCount.toLocaleString()} · states ${(first + 1).toLocaleString()}–${last.toLocaleString()} of ${count.toLocaleString()}`;
            $('tracePrev').disabled = pageIndex <= 0;
            $('traceNext').disabled = pageIndex >= pageCount - 1;
            $('traceShowCurrent').disabled = isPlaybackRunning;
        }
        function loadTrace(initial, path) {
            traceInitial = Array.isArray(initial) ? initial.slice() : null;
            traceMoves = Array.isArray(path) ? path : [];
            traceIndex = 0;
            traceBtn.disabled = traceLength() < 2;
            tracePanel.hidden = true;
            traceBtn.setAttribute('aria-expanded', 'false');
            traceBtn.textContent = '☷ View solution trace';
            renderTrace();
        }
        traceBtn.addEventListener('click', () => {
            const opening = tracePanel.hidden;
            tracePanel.hidden = !opening;
            traceBtn.setAttribute('aria-expanded', String(opening));
            traceBtn.textContent = opening ? '✕ Hide solution trace' : '☷ View solution trace';
        });
        $('tracePrev').addEventListener('click', () => {
            const pageIndex = Math.floor(traceIndex / TRACE_PAGE_SIZE);
            if (pageIndex > 0) {
                traceIndex = (pageIndex - 1) * TRACE_PAGE_SIZE;
                if (!isPlaybackRunning) buildBoard(getTraceBoard(traceIndex));
                renderTrace();
            }
        });
        $('traceNext').addEventListener('click', () => {
            const pageIndex = Math.floor(traceIndex / TRACE_PAGE_SIZE);
            const nextIndex = (pageIndex + 1) * TRACE_PAGE_SIZE;
            if (nextIndex < traceLength()) {
                traceIndex = nextIndex;
                if (!isPlaybackRunning) buildBoard(getTraceBoard(traceIndex));
                renderTrace();
            }
        });
        $('traceShowCurrent').addEventListener('click', () => {
            if (!isPlaybackRunning) { const board = getTraceBoard(traceIndex); if (board) buildBoard(board); }
        });

        for (const k in pics) pics[k].src = IMAGES[k];
        wrap.classList.toggle('transparent', TRANSPARENT_IMAGES);

        /* ---------- ambient bubbles ---------- */
        (function makeBubbles() {
            const host = $('bubbles');
            for (let i = 0; i < 16; i++) {
                const b = document.createElement('span');
                const s = 8 + Math.random() * 30;
                b.className = 'bubble';
                b.style.cssText = `width:${s}px;height:${s}px;left:${Math.random() * 100}%;` +
                    `animation-duration:${9 + Math.random() * 12}s;animation-delay:${-Math.random() * 18}s`;
                host.appendChild(b);
            }
        })();

        /* ---------- twin vortices (WebGL: geometry is uploaded once, the GPU does the spinning) ---------- */
        const Vortices = (() => {
            const cv = $('vortex'), tintEl = document.querySelector('.tint'), glowEl = $('menuGlow');
            const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
            const TAU = Math.PI * 2, SEG = 72, NE = 9;
            const IDLE = reduce ? 0.06 : 0.32;                          // rad/s, calm
            const BUSY = reduce ? 0.5 : 4.6;                            // rad/s, while Patrick is solving

            /* palette: cyan outer flow, blue shell, sand-orange + Patrick-pink core (.lift = how much it brightens when busy) */
            const COLORS = [];
            const addColors = (list, lift) => { const first = COLORS.length; list.forEach(rgb => COLORS.push({ rgb, lift })); return first; };
            const C_CORE = addColors([[240, 160, 75], [247, 201, 139], [245, 162, 155], [224, 111, 106], [240, 160, 75]], .10);
            const C_MID = addColors([[47, 111, 214], [58, 130, 224], [91, 127, 208], [37, 87, 184], [122, 142, 224]], .42);
            const C_OUT = addColors([[63, 199, 221], [92, 200, 224], [53, 180, 212], [122, 214, 232], [59, 179, 184]], .35);
            const BG_CALM = [222, 244, 250], BG_BUSY = [30, 140, 185];  // far strands fade towards the page colour

            /* ---- geometry: every strand is a curve (radius, angle, height) sampled at SEG+1 points ---- */
            function rng(seed) { let s = seed >>> 0; return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296; }
            const lerp = (a, b, t) => a + (b - a) * t;
            const taper = (t, peak) => { const p = Math.pow(t, peak); return Math.pow(4 * p * (1 - p), .7); };

            function build(seed, q) {
                const r = rng(seed), S = [];
                const pick = (first, n) => first + ((r() * n) | 0);
                const mk = (ci, base, peak, fn) => {
                    const n = SEG + 1;
                    const st = { ci, R: new Float32Array(n), A: new Float32Array(n), Y: new Float32Array(n), W: new Float32Array(n) };
                    for (let k = 0; k < n; k++) {
                        const t = k / SEG, [rr, aa, yy] = fn(t);
                        st.R[k] = rr; st.A[k] = aa; st.Y[k] = yy;
                        st.W[k] = base * taper(t, peak);
                    }
                    S.push(st);
                };
                /* core: tight sand-orange / pink helices running the full height, flaring at the ends (axial stretching) */
                for (let i = 0, n = Math.round(18 * q); i < n; i++) {
                    const rb = .09 + r() * .17, turns = 4 + r() * 2.2, th0 = r() * TAU, ph = r() * TAU;
                    const y0 = -(.82 + r() * .15), y1 = .8 + r() * .18;
                    mk(pick(C_CORE, 5), .016 + r() * .007, 1, t => {
                        const y = lerp(y0, y1, t);
                        return [rb * (1 + .9 * Math.pow(Math.abs(y), 2.2)) + .015 * Math.sin(t * 11 + ph), th0 + TAU * turns * t, y];
                    });
                }
                /* shell: wide blue ribbons winding up and down around the core */
                for (let i = 0, n = Math.round(22 * q); i < n; i++) {
                    const r0 = .5 + r() * .6, rEnd = .2 + r() * .2, up = r() < .5 ? 1 : -1;
                    const yMax = .55 + r() * .42, turns = 2 + r() * 1.7, th0 = r() * TAU, y00 = (r() - .5) * .12;
                    mk(pick(C_MID, 5), .034 + r() * .02, 1, t =>
                        [rEnd + (r0 - rEnd) * Math.pow(1 - t, 1.5), th0 + TAU * turns * Math.pow(t, 1.3), y00 + up * yMax * Math.pow(t, 1.2)]);
                }
                /* outer: cyan streamlines that sweep in from far away and spiral inward (inward spiral) */
                for (let i = 0, n = Math.round(26 * q); i < n; i++) {
                    const r0 = 1.1 + r() * 1.3, rEnd = .35 + r() * .25, up = r() < .5 ? 1 : -1;
                    const yMax = .18 + Math.pow(r(), 1.2) * .8, turns = .9 + r() * 1.5, th0 = r() * TAU, y00 = (r() - .5) * .1;
                    mk(pick(C_OUT, 5), .030 + r() * .024, .72, t =>
                        [rEnd + (r0 - rEnd) * Math.pow(1 - t, 2.1), th0 + TAU * turns * Math.pow(t, 1.35), y00 + up * yMax * Math.pow(t, 1.7)]);
                }
                return S;
            }

            function makeVortex(seed, mirror, q) {
                const strands = build(seed, q), r = rng(seed ^ 0x9e3779b9);
                const flowable = strands.map((s, i) => i).filter(i => strands[i].ci >= C_MID);
                const parts = Array.from({ length: Math.round(22 * q) }, () => ({ s: flowable[(r() * flowable.length) | 0], u: r(), v: .05 + r() * .05 }));
                return { strands, mirror, parts, rot: r() * TAU, vbo: null, ibo: null, count: 0 };
            }

            /* ---- WebGL setup ---- */
            const GLATTR = { antialias: true, alpha: true, depth: true, premultipliedAlpha: true };
            let gl = cv.getContext('webgl', GLATTR) || cv.getContext('experimental-webgl', GLATTR);
            let PR = null, quadBuf = null, partBuf = null, glLost = false, L = null, R = null;
            const FLOATS = 15, STRIDE = FLOATS * 4;                     // prev(3) cur(3) next(3) width,side(2) rgb+lift(4)

            const VS_RIB = `
        attribute vec3 aPrev, aCur, aNext; attribute vec2 aMisc; attribute vec4 aCol;
        uniform vec2 uRes; uniform float uRot, uMirror, uCx, uRu, uHalfH, uCosT, uSinT, uE;
        varying float vDepth; varying vec4 vCol;
        vec3 proj(vec3 p) {
            float a = p.y + uRot, rp = p.x * uRu, Z = rp * sin(a), Yp = p.z * uHalfH;
            return vec3(uCx + rp * cos(a) * uMirror, uRes.y * .5 + (Yp * uCosT - Z * uSinT), (Z * uCosT + Yp * uSinT) / (uRu * 1.25));
        }
        void main() {
            vec3 c = proj(aCur), pv = proj(aPrev), nx = proj(aNext);
            vec2 dir = nx.xy - pv.xy; float l = length(dir);
            dir = l > 1e-4 ? dir / l : vec2(1., 0.);
            float f = clamp(c.z * .5 + .5, 0., 1.);
            float w = max(aMisc.x * uRu * (.7 + .45 * f) * (1. + .12 * uE), .7);
            vec2 pos = c.xy + vec2(-dir.y, dir.x) * aMisc.y * w * .5;
            gl_Position = vec4(pos / uRes * 2. - 1., clamp(-c.z * .4, -.99, .99), 1.);
            vDepth = c.z; vCol = aCol;
        }`;
            const FS_RIB = `
        precision mediump float;
        uniform vec3 uBg; uniform float uEf; varying float vDepth; varying vec4 vCol;
        void main() {
            float f = clamp(vDepth * .5 + .5, 0., 1.);
            vec3 c = vCol.rgb * (.78 + .22 * f);
            c += (1. - c) * (uEf * vCol.a + .10 * smoothstep(.72, .9, f));
            c = mix(c, uBg, .55 * (1. - f));
            gl_FragColor = vec4(c, 1.);
        }`;
            const VS_PART = `
        attribute vec4 aPos; uniform vec2 uRes; uniform float uDpr;
        void main() {
            gl_Position = vec4(aPos.xy / uRes * 2. - 1., clamp(-aPos.z * .4 - .01, -.99, .99), 1.);
            gl_PointSize = aPos.w * uDpr;
        }`;
            const FS_PART = `
        precision mediump float;
        void main() {
            float d = length(gl_PointCoord - .5) * 2.;
            float a = 1. - smoothstep(.88, 1., d);
            if (a < .02) discard;
            vec3 col = mix(vec3(1.), vec3(.106, .525, .71), smoothstep(.5, .75, d));
            gl_FragColor = vec4(col * a, a);
        }`;
            const VS_QUAD = `attribute vec2 aQ; void main() { gl_Position = vec4(aQ, 0., 1.); }`;
            const FS_QUAD = `
        #ifdef GL_FRAGMENT_PRECISION_HIGH
        precision highp float;
        #else
        precision mediump float;
        #endif
        uniform vec2 uRes; uniform float uDpr, uRu, uSinT, uHalo, uCx[2], uRip[2];
        vec4 over(vec4 s, vec4 d) { return s + d * (1. - s.a); }
        float ring(vec2 q, float rx, float thick) {
            float s = uSinT, e = sqrt(q.x * q.x + (q.y / s) * (q.y / s));
            vec2 g = vec2(q.x, q.y / (s * s)) / max(e, 1e-3);
            float dist = abs(e - rx) / max(length(g), 1e-3);
            return 1. - smoothstep(thick * .5 - .7, thick * .5 + .7, dist);
        }
        void main() {
            vec2 p = gl_FragCoord.xy / uDpr;
            vec4 acc = vec4(0.);
            for (int v = 0; v < 2; v++) {
                vec2 q = p - vec2(uCx[v], uRes.y * .5);
                float h = uHalo * (1. - clamp(length(q) / (uRu * 3.3), 0., 1.));
                acc = over(vec4(vec3(.627, .922, .973) * h, h), acc);
                for (int i = 0; i < 2; i++) {
                    float pr = uRip[i];
                    if (pr >= 0. && pr < 1.) {
                        float ease = 1. - pow(1. - pr, 3.), rx = uRu * (.3 + 2.7 * ease), k = 1. - pr;
                        float a1 = .85 * k * ring(q, rx, 5. * k + 1.5);
                        acc = over(vec4(vec3(1.) * a1, a1), acc);
                        float a2 = .55 * k * ring(q, rx * .94, 2. * k + .8);
                        acc = over(vec4(vec3(.106, .525, .71) * a2, a2), acc);
                    }
                }
            }
            gl_FragColor = acc;
        }`;

            function compile(type, src) {
                const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
                if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
                return s;
            }
            function program(vs, fs, attribs, uniforms) {
                const p = gl.createProgram();
                gl.attachShader(p, compile(gl.VERTEX_SHADER, vs)); gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
                attribs.forEach((a, i) => gl.bindAttribLocation(p, i, a));
                gl.linkProgram(p);
                if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
                const u = {}; uniforms.forEach(n => { u[n] = gl.getUniformLocation(p, n); });
                return { p, u };
            }
            function upload(v) {
                if (v.vbo) { gl.deleteBuffer(v.vbo); gl.deleteBuffer(v.ibo); }
                const n1 = SEG + 1, N = v.strands.length;
                const data = new Float32Array(N * n1 * 2 * FLOATS), idx = new Uint16Array(N * SEG * 6);
                let o = 0, ii = 0;
                v.strands.forEach((s, i) => {
                    const col = COLORS[s.ci].rgb, lift = COLORS[s.ci].lift, base = i * n1 * 2;
                    for (let k = 0; k < n1; k++) {
                        const kp = Math.max(k - 1, 0), kn = Math.min(k + 1, SEG);
                        for (let side = -1; side <= 1; side += 2) {
                            for (const j of [kp, k, kn]) { data[o++] = s.R[j]; data[o++] = s.A[j]; data[o++] = s.Y[j]; }
                            data[o++] = s.W[k]; data[o++] = side;
                            data[o++] = col[0] / 255; data[o++] = col[1] / 255; data[o++] = col[2] / 255; data[o++] = lift;
                        }
                    }
                    for (let k = 0; k < SEG; k++) {
                        const a = base + k * 2;
                        idx[ii++] = a; idx[ii++] = a + 1; idx[ii++] = a + 2; idx[ii++] = a + 1; idx[ii++] = a + 3; idx[ii++] = a + 2;
                    }
                });
                v.vbo = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, v.vbo); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
                v.ibo = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, v.ibo); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
                v.count = idx.length;
            }
            function initGL() {
                PR = {
                    rib: program(VS_RIB, FS_RIB, ['aPrev', 'aCur', 'aNext', 'aMisc', 'aCol'],
                        ['uRes', 'uRot', 'uMirror', 'uCx', 'uRu', 'uHalfH', 'uCosT', 'uSinT', 'uE', 'uEf', 'uBg']),
                    part: program(VS_PART, FS_PART, ['aPos'], ['uRes', 'uDpr']),
                    quad: program(VS_QUAD, FS_QUAD, ['aQ'], ['uRes', 'uDpr', 'uRu', 'uSinT', 'uHalo', 'uCx', 'uRip'])
                };
                quadBuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
                partBuf = gl.createBuffer();
                gl.clearColor(0, 0, 0, 0);
                gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
                if (L) { upload(L); upload(R); }
            }
            if (gl) {
                try { initGL(); }
                catch (err) { console.warn('Vortex WebGL disabled:', err); gl = null; }
            }
            if (!gl) cv.style.display = 'none';                         // the page still works, just without the vortices
            cv.addEventListener('webglcontextlost', e => { e.preventDefault(); glLost = true; });
            cv.addEventListener('webglcontextrestored', () => { try { initGL(); glLost = false; } catch (err) { gl = null; cv.style.display = 'none'; } });

            /* ---- layout ---- */
            const lowPower = (navigator.hardwareConcurrency || 8) <= 4;
            let W = 0, H = 0, dpr = 1, U = 100, halfH = 300, axis = 150, quality = 0;
            function layout() {
                W = innerWidth; H = innerHeight;
                dpr = Math.min(devicePixelRatio || 1, 1.5);
                cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
                if (gl) gl.viewport(0, 0, cv.width, cv.height);
                U = Math.max(70, Math.min(W * .115, H * .2));
                halfH = H * .43;
                axis = Math.max(U * .95, W * .12);
                const q = (W < 700 || lowPower) ? .6 : 1;
                if (q !== quality || !L) {
                    quality = q; L = makeVortex(7, 1, q); R = makeVortex(31, -1, q);
                    if (gl) { upload(L); upload(R); }
                }
            }
            let resizeT = 0;
            addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(layout, 120); });
            layout();

            /* ---- state: spin is a critically-damped spring, so it ramps up and coasts down smoothly ---- */
            let omega = IDLE, omegaV = 0, target = IDLE, time = 0, last = 0;
            let pulse = 0, pulseV = 0, flash = 0;
            let ripples = [];
            let lastTint = -1, lastLevel = -1, bubbleAnims = null;
            const partData = new Float32Array(64 * 4);

            function partPos(v, cx, Ru, cosT, sinT, out, o) {
                for (const p of v.parts) {
                    const s = v.strands[p.s], f = Math.min(SEG - 1e-3, p.u * SEG), k = f | 0, a = f - k;
                    let x = 0, y = 0, d = 0;
                    for (let m = 0; m < 2; m++) {
                        const j = k + m, w = m ? a : 1 - a, ang = s.A[j] + v.rot, rp = s.R[j] * Ru, Z = rp * Math.sin(ang), Yp = s.Y[j] * halfH;
                        x += w * (cx + rp * Math.cos(ang) * v.mirror);
                        y += w * (H * .5 + (Yp * cosT - Z * sinT));
                        d += w * (Z * cosT + Yp * sinT) / (Ru * 1.25);
                    }
                    const fz = Math.max(0, Math.min(1, d * .5 + .5)), z = .55 + .45 * fz;
                    out[o++] = x; out[o++] = y; out[o++] = d; out[o++] = 2 * (1.3 + 1.6 * z) * (Ru / U);
                }
                return o;
            }

            function enableAttribs(n) { for (let i = 0; i < 5; i++) i < n ? gl.enableVertexAttribArray(i) : gl.disableVertexAttribArray(i); }

            function render(e, cosT, sinT, Ru) {
                gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

                /* 1. halo + finish ripples (one full-screen quad) */
                gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND);
                let q = PR.quad; gl.useProgram(q.p);
                gl.uniform2f(q.u.uRes, W, H); gl.uniform1f(q.u.uDpr, dpr); gl.uniform1f(q.u.uRu, Ru); gl.uniform1f(q.u.uSinT, sinT);
                gl.uniform1f(q.u.uHalo, .10 + .30 * e + .28 * flash);
                gl.uniform1fv(q.u.uCx, [axis, W - axis]);
                gl.uniform1fv(q.u.uRip, [0, 1].map(i => ripples[i] && ripples[i].age >= 0 ? ripples[i].age / 1.7 : -1));
                gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf); enableAttribs(1);
                gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
                gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

                /* 2. the two vortices: opaque ribbons, depth-tested, one draw call each */
                gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LESS);
                const r = PR.rib; gl.useProgram(r.p);
                const k = BG_CALM.map((c, i) => (c + (BG_BUSY[i] - c) * .92 * e) / 255);
                gl.uniform2f(r.u.uRes, W, H); gl.uniform1f(r.u.uRu, Ru); gl.uniform1f(r.u.uHalfH, halfH);
                gl.uniform1f(r.u.uCosT, cosT); gl.uniform1f(r.u.uSinT, sinT); gl.uniform1f(r.u.uE, e); gl.uniform1f(r.u.uEf, e);
                gl.uniform3f(r.u.uBg, k[0], k[1], k[2]);
                enableAttribs(5);
                for (const [v, cx] of [[L, axis], [R, W - axis]]) {
                    gl.uniform1f(r.u.uCx, cx); gl.uniform1f(r.u.uMirror, v.mirror); gl.uniform1f(r.u.uRot, v.rot);
                    gl.bindBuffer(gl.ARRAY_BUFFER, v.vbo); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, v.ibo);
                    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, STRIDE, 0);
                    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, STRIDE, 12);
                    gl.vertexAttribPointer(2, 3, gl.FLOAT, false, STRIDE, 24);
                    gl.vertexAttribPointer(3, 2, gl.FLOAT, false, STRIDE, 36);
                    gl.vertexAttribPointer(4, 4, gl.FLOAT, false, STRIDE, 44);
                    gl.drawElements(gl.TRIANGLES, v.count, gl.UNSIGNED_SHORT, 0);
                }

                /* 3. particles riding the streamlines (depth-tested against the ribbons) */
                let o = partPos(L, axis, Ru, cosT, sinT, partData, 0);
                o = partPos(R, W - axis, Ru, cosT, sinT, partData, o);
                const pg = PR.part; gl.useProgram(pg.p);
                gl.uniform2f(pg.u.uRes, W, H); gl.uniform1f(pg.u.uDpr, dpr);
                gl.enable(gl.BLEND);
                gl.bindBuffer(gl.ARRAY_BUFFER, partBuf); gl.bufferData(gl.ARRAY_BUFFER, partData.subarray(0, o), gl.DYNAMIC_DRAW);
                enableAttribs(1); gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 0, 0);
                gl.drawArrays(gl.POINTS, 0, o / 4);
            }

            function frame(ts) {
                requestAnimationFrame(frame);
                const dt = Math.min(.05, last ? (ts - last) / 1000 : .016); last = ts; time += dt;

                const wn = target > omega ? 3.4 : 1.9;                    // quick-ish spin-up, slower coast-down
                omegaV += (wn * wn * (target - omega) - 2 * wn * omegaV) * dt;
                omega += omegaV * dt;
                const e = Math.max(0, Math.min(1, (omega - IDLE) / (BUSY - IDLE)));

                for (let i = 0; i < 2; i++) { pulseV += (-60 * pulse - 7 * pulseV) * dt / 2; pulse += pulseV * dt / 2; }
                flash *= Math.exp(-dt / .55);
                for (let i = ripples.length - 1; i >= 0; i--) { ripples[i].age += dt; if (ripples[i].age > 1.7) ripples.splice(i, 1); }

                L.rot += omega * dt; R.rot += omega * dt;                  // mirrored geometry, so the pair counter-rotates
                const flow = .6 + e * 2.6;
                for (const v of [L, R]) for (const p of v.parts) { p.u += p.v * flow * dt; if (p.u > 1) p.u = 0; }

                /* page-level effects: only opacity changes, which the compositor handles without repainting */
                if (Math.abs(e - lastTint) > .003) {
                    lastTint = e;
                    tintEl.style.opacity = (e * .92).toFixed(3);
                    glowEl.style.opacity = e.toFixed(3);
                }
                const level = Math.round(e * (NE - 1));
                if (level !== lastLevel) {
                    lastLevel = level;
                    if (!bubbleAnims) bubbleAnims = document.getAnimations().filter(a => a.animationName === 'rise');
                    const rate = 1 + 2.2 * level / (NE - 1);
                    bubbleAnims.forEach(a => { a.playbackRate = rate; });
                }

                if (gl && !glLost) {
                    const tilt = .34 + (reduce ? 0 : .035 * Math.sin(time * .35));
                    render(e, Math.cos(tilt), Math.sin(tilt), U * (1 + pulse));
                }
            }
            requestAnimationFrame(frame);

            return {
                energize() { target = BUSY; },
                calm(celebrate) {
                    target = IDLE;
                    if (celebrate && !reduce) { ripples = [{ age: 0 }, { age: -.22 }]; pulseV = 1.1; flash = 1; }
                },
                _debug: { get omega() { return omega; }, get gl() { return !!gl; } }
            };
        })();
        /* ---------- end vortices ---------- */

        /* ---------- Patrick states ---------- */
        function setPatrick(state, text) {
            wrap.dataset.state = state;
            for (const k in pics) pics[k].classList.toggle('show', k === state);
            if (text) { speech.textContent = text; speech.classList.add('show'); }
            else speech.classList.remove('show');
        }

        /* ---------- board (tiles slide instead of re-rendering) ---------- */
        const tileEls = new Map();   // value -> element
        let currentBoard = [];

        function cssPx(name) { return parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name)); }
        function posFor(idx) {
            const step = cssPx('--tile') + cssPx('--gap');
            return `translate(${(idx % 3) * step}px, ${Math.floor(idx / 3) * step}px)`;
        }

        function buildBoard(arr) {
            boardEl.innerHTML = '';
            tileEls.clear();
            currentBoard = [...arr];
            const step = cssPx('--tile') + cssPx('--gap');
            for (let i = 0; i < 9; i++) {           // blank sand pockets
                const slot = document.createElement('div');
                slot.className = 'slot';
                slot.style.left = `${cssPx('--gap') + (i % 3) * step}px`;
                slot.style.top = `${cssPx('--gap') + Math.floor(i / 3) * step}px`;
                boardEl.appendChild(slot);
            }
            arr.forEach((v, i) => {
                if (v === 0) return;
                const t = document.createElement('div');
                t.className = 'tile';
                t.textContent = v;
                t.style.transform = posFor(i);
                boardEl.appendChild(t);
                tileEls.set(v, t);
            });
        }
        function layoutBoard() { currentBoard.forEach((v, i) => v && (tileEls.get(v).style.transform = posFor(i))); }
        window.addEventListener('resize', () => { buildBoard(currentBoard); });

        function applyMove(move) {
            const z = currentBoard.indexOf(0);
            let t = z;
            const m = move.toLowerCase();
            if (m === 'u' || m === 'up') t -= 3;
            else if (m === 'd' || m === 'down') t += 3;
            else if (m === 'l' || m === 'left') { if (z % 3 === 0) return; t -= 1; }
            else if (m === 'r' || m === 'right') { if (z % 3 === 2) return; t += 1; }
            if (t < 0 || t > 8) return;

            const val = currentBoard[t];
            currentBoard[z] = val;
            currentBoard[t] = 0;
            const el = tileEls.get(val);
            el.style.transform = posFor(z);
            el.classList.remove('moved'); void el.offsetWidth; el.classList.add('moved');
        }

        /* ---------- input ---------- */
        function parseBoard(str) {
            const nums = str.trim().split(/[\s,]+/).map(Number);
            if (nums.length !== 9 || nums.some(n => !Number.isInteger(n))) return null;
            if ([...nums].sort((a, b) => a - b).join() !== '0,1,2,3,4,5,6,7,8') return null;
            return nums;
        }
        function setStatus(msg, isError = false) {
            statusEl.textContent = msg;
            statusEl.classList.toggle('error', isError);
        }

        boardInput.addEventListener('input', () => {
            const b = parseBoard(boardInput.value);
            boardInput.classList.toggle('invalid', !b);
            if (b && !playBtn.disabled) { buildBoard(b); setPatrick('idle'); setStatus('Patrick is ready. Pick an algorithm and press solve.'); }
        });

        speedEl.addEventListener('input', () =>
            document.documentElement.style.setProperty('--move-ms', SPEEDS_MS[speedEl.value] + 'ms'));
        document.documentElement.style.setProperty('--move-ms', SPEEDS_MS[speedEl.value] + 'ms');

        /* ---------- run ---------- */
        let runId = 0, abortCtl = null, wake = null;
        const stopBtn = $('stopBtn');
        const sleep = ms => new Promise(r => { const t = setTimeout(r, ms); wake = () => { clearTimeout(t); r(); }; });

        function setRunning(on) { playBtn.disabled = on; playBtn.hidden = on; stopBtn.hidden = !on; }

        function stopRun() {
            if (stopBtn.hidden) return;
            runId++;                                  // invalidates the run in progress
            if (abortCtl) abortCtl.abort();           // cancels a pending solver request
            if (wake) wake();                         // wakes the playback loop immediately
        }
        stopBtn.addEventListener('click', stopRun);
        addEventListener('keydown', e => { if (e.key === 'Escape') stopRun(); });

        playBtn.addEventListener('click', async () => {
            const start = parseBoard(boardInput.value);
            if (!start) {
                boardInput.classList.add('invalid');
                setStatus('Enter each number from 0 to 8 exactly once, separated by spaces.', true);
                return;
            }

            const myRun = ++runId, stopped = () => myRun !== runId;
            abortCtl = new AbortController();
            setRunning(true);
            Vortices.energize();
            let solved = false;
            stopConfetti();
            buildBoard(start);
            setPatrick('busy', 'Hmmmm…');
            setStatus('Patrick is thinking…');

            try {
                const response = await fetch('/run', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ algo: algoSelect.value, board: boardInput.value.trim() }),
                    signal: abortCtl.signal
                });
                if (!response.ok) throw new Error('Execution failed');
                const data = await response.json();
                if (stopped()) { setPatrick('idle'); setStatus('Stopped.'); return; }
                updateStats(data);
                if (Array.isArray(data.initial_board) && Array.isArray(data.path)) loadTrace(data.initial_board, data.path);
                isPlaybackRunning = true;
                renderTrace();

                if (!data.path || data.path.length === 0) {
                    setPatrick('idle');
                    setStatus('Nothing to solve: no solution found, or the board is already solved.');
                    return;
                }

                buildBoard(data.initial_board);
                await sleep(350);
                const total = data.path.length;
                setStatus(`Solving in ${total.toLocaleString()} moves…`);

                let done = 0;
                for (; done < total; done++) {
                    if (stopped()) break;
                    applyMove(data.path[done]);
                    setStatus(`Move ${(done + 1).toLocaleString()} of ${total.toLocaleString()}`);
                    await sleep(SPEEDS_MS[speedEl.value] + 90);
                }
                if (stopped()) {
                    setPatrick('idle');
                    setStatus(`Stopped after ${done.toLocaleString()} of ${total.toLocaleString()} moves.`);
                    return;
                }

                await sleep(250);
                if (stopped()) { setPatrick('idle'); setStatus('Stopped.'); return; }
                solved = true;
                celebrate(total);
            } catch (err) {
                if (err.name === 'AbortError') {
                    setPatrick('idle');
                    setStatus('Stopped.');
                } else {
                    console.error(err);
                    setPatrick('idle');
                    setStatus('Could not reach the solver. Check that server.py is running and output/main.exe exists.', true);
                }
            } finally {
                abortCtl = null;
                isPlaybackRunning = false;
                setRunning(false);
                traceBtn.disabled = traceLength() < 2;
                renderTrace();
                Vortices.calm(solved);
            }
        });

        function celebrate(moves) {
            setPatrick('happy', 'I did it!');
            setStatus(`Solved in ${moves} moves.`);
            [...tileEls.values()].forEach((t, i) => { t.style.setProperty('--d', i * 0.06 + 's'); t.classList.add('done'); });
            startConfetti();
            setTimeout(() => {
                tileEls.forEach(t => t.classList.remove('done'));
                speech.classList.remove('show');
            }, 5000);
        }

        /* ---------- confetti (no library) ---------- */
        const canvas = $('confetti'), ctx = canvas.getContext('2d');
        const COLORS = ['#f5a29b', '#b6e24b', '#8b5fc6', '#ffe066', '#5cc8e0', '#ffffff'];
        let parts = [], raf = null, spawnUntil = 0;

        function fit() { canvas.width = innerWidth * devicePixelRatio; canvas.height = innerHeight * devicePixelRatio; }
        addEventListener('resize', fit); fit();

        function burst(x, y, dirX, n) {
            for (let i = 0; i < n; i++) {
                parts.push({
                    x: x * devicePixelRatio, y: y * devicePixelRatio,
                    vx: dirX * (2 + Math.random() * 10) * devicePixelRatio,
                    vy: -(11 + Math.random() * 12) * devicePixelRatio,
                    size: (7 + Math.random() * 8) * devicePixelRatio,
                    rot: Math.random() * 6.28, vr: (Math.random() - .5) * .35,
                    color: COLORS[(Math.random() * COLORS.length) | 0],
                    star: Math.random() < .35, life: 0
                });
            }
        }
        function star(c, r) {
            c.beginPath();
            for (let i = 0; i < 10; i++) {
                const rad = i % 2 ? r * .45 : r;
                const a = (Math.PI / 5) * i - Math.PI / 2;
                c[i ? 'lineTo' : 'moveTo'](Math.cos(a) * rad, Math.sin(a) * rad);
            }
            c.closePath(); c.fill();
        }
        function tick(now) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            if (now < spawnUntil && Math.random() < .5) {          // gentle rain after the burst
                parts.push({
                    x: Math.random() * canvas.width, y: -20, vx: (Math.random() - .5) * 3, vy: 3 + Math.random() * 3,
                    size: (6 + Math.random() * 7) * devicePixelRatio, rot: Math.random() * 6.28, vr: (Math.random() - .5) * .3,
                    color: COLORS[(Math.random() * COLORS.length) | 0], star: Math.random() < .3, life: 0
                });
            }
            parts = parts.filter(p => p.y < canvas.height + 40 && p.life < 360);
            for (const p of parts) {
                p.vy += .32 * devicePixelRatio; p.vx *= .992;
                p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life++;
                ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.color;
                if (p.star) star(ctx, p.size * .8); else ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * .6);
                ctx.restore();
            }
            raf = (parts.length || now < spawnUntil) ? requestAnimationFrame(tick) : null;
        }
        function startConfetti() {
            if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
            burst(innerWidth * .12, innerHeight * .85, 1, 70);
            burst(innerWidth * .88, innerHeight * .85, -1, 70);
            spawnUntil = performance.now() + 2500;
            if (!raf) raf = requestAnimationFrame(tick);
        }
        function stopConfetti() { parts = []; spawnUntil = 0; ctx.clearRect(0, 0, canvas.width, canvas.height); }

        /* ---------- init ---------- */
        buildBoard(parseBoard(boardInput.value));
        setPatrick('idle');
