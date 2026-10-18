import {
  AdditiveBlending,
  BackSide,
  Color,
  CircleGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  PerspectiveCamera,
  RingGeometry,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  SRGBColorSpace,
  TextureLoader,
  Vector3,
  WebGLRenderer,
} from "three"
import { CITIES, HOME } from "../../data/geo.ts"
import { LEAD_MS } from "../../game/globe/wave.ts"
import { bezier, controlOf, landingOf, onSphere, RING_ANGLE, seedOf } from "../../game/globe/arc.ts"
import { nearestPop } from "../../game/globe/footprint.ts"
import type { Wave } from "../../game/globe/wave.ts"
import { DROP_COLOR, TYPE_COLOR } from "./palette.ts"

const RADIUS = 1
const ARCS = 640
const EDGES = 128
const SEGMENTS = 72
const TRAIL_S = 0.9
const RINGS = 24
const FOV = 26
const MASK_W = 1024
const MASK_H = 512
const ZOOM_MIN = 1
const ZOOM_MAX = 5
/** Pixels around a dot or an edge that count as pointing at it. */
const HIT_DOT_PX = 12
const HIT_EDGE_PX = 8

/** A point on the sphere at `lat`, `lon`, with the poles on Y and longitude 0 toward +Z once the globe is turned. */
/** Colours are written the way they show: these shaders skip the renderer's colour conversion. */
const rgb = (hex: number): [number, number, number] => [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255]
const vec3 = (hex: number) => `vec3(${rgb(hex).map((v) => v.toFixed(3)).join(", ")})`

const OCEAN = 0x0a0a0c
const OCEAN_LIT = 0x17171b
const LAND = 0xffffff
const GLOW = 0xffffff
const EDGE = 0x2dffb4
const HOME_COLOR = 0xffffff
const CITY_COLOR = 0xffffff
/** The soft light round each app server, and round each client city. */
const POP_GLOW = 0x7dffd0
const CITY_GLOW = 0xbfd9ff
/** The radius of the ring round a server, which is where nearby clients' edges land. */
const POP_RING = Math.sin(RING_ANGLE) * RADIUS

const SPHERE_VERTEX = /* glsl */ `
  varying vec3 vN; varying vec3 vW;
  void main() { vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`

/** The ocean: a matte near-black ball, a shade lighter on the side the sun is on, with a faint rim. */
const SPHERE_FRAGMENT = /* glsl */ `
  uniform vec3 sunDir; varying vec3 vN; varying vec3 vW;
  void main() {
    vec3 N = normalize(vN); vec3 V = normalize(cameraPosition - vW);
    float l = max(dot(N, sunDir), 0.0);
    vec3 col = mix(${vec3(OCEAN)}, ${vec3(OCEAN_LIT)}, pow(l, 1.4));
    float rim = pow(1.0 - max(dot(N, V), 0.0), 4.0);
    col += ${vec3(GLOW)} * rim * 0.07;
    gl_FragColor = vec4(col, 1.0);
  }`

const HALO_FRAGMENT = /* glsl */ `
  uniform vec3 sunDir; varying vec3 vN; varying vec3 vW;
  void main() {
    vec3 V = normalize(cameraPosition - vW);
    float i = pow(max(0.0, 0.66 - dot(normalize(vN), V)), 3.0);
    float side = 0.5 + 0.5 * smoothstep(-0.4, 0.6, dot(normalize(vW), sunDir));
    gl_FragColor = vec4(${vec3(GLOW)} * i * 0.22 * side, i * 0.3);
  }`

/** Land as a matrix of small discs, brighter where the sun lands and fading toward the edge. */
const DOTS_VERTEX = /* glsl */ `
  varying vec3 vN; varying vec3 vW;
  void main() {
    vec4 world = modelMatrix * instanceMatrix * vec4(position, 1.0);
    vec3 centre = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
    vN = normalize(centre); vW = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }`

const DOTS_FRAGMENT = /* glsl */ `
  uniform vec3 sunDir; varying vec3 vN; varying vec3 vW;
  void main() {
    vec3 V = normalize(cameraPosition - vW);
    float facing = max(dot(vN, V), 0.0);
    float lit = 0.44 + 0.3 * max(dot(vN, sunDir), 0.0);
    float a = smoothstep(0.02, 0.3, facing);
    gl_FragColor = vec4(${vec3(LAND)} * lit, a * (0.6 + 0.4 * facing));
  }`

/** A soft round glow: a gaussian halo round a small bright core, breathing slowly, added to what is behind it. */
const GLOW_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`

const GLOW_FRAGMENT = /* glsl */ `
  uniform vec3 uColor; uniform float uTime; uniform float uPhase; uniform float uStrength; uniform float uCore;
  varying vec2 vUv;
  void main() {
    float d = length(vUv - 0.5) * 2.0;
    float breath = 0.86 + 0.14 * sin(uTime * 1.4 + uPhase);
    float halo = exp(-d * d * 3.2) * 0.3 + exp(-d * d * 12.0) * 0.14;
    float core = exp(-d * d * 120.0) * uCore;
    float a = (halo * uStrength * breath + core) * (1.0 - smoothstep(0.7, 1.0, d));
    gl_FragColor = vec4(mix(uColor, vec3(1.0), clamp(core, 0.0, 1.0) * 0.6), a);
  }`

/** The ribbon every comet and edge is drawn as: a strip of segments along a quadratic curve, widened in screen space. */
const BEZIER = /* glsl */ `
  vec3 bez(float t, vec3 a, vec3 c, vec3 b) { float u = 1.0 - t; return u * u * a + 2.0 * u * t * c + t * t * b; }
  vec4 ribbon(float t, float side, vec3 a, vec3 c, vec3 b, float width, float aspect) {
    vec3 p = bez(t, a, c, b); vec3 q = bez(min(1.0, t + 0.012), a, c, b);
    vec4 c0 = projectionMatrix * viewMatrix * modelMatrix * vec4(p, 1.0);
    vec4 c1 = projectionMatrix * viewMatrix * modelMatrix * vec4(q, 1.0);
    vec2 dir = normalize((c1.xy / c1.w - c0.xy / c0.w) * vec2(aspect, 1.0) + 1e-5);
    vec2 nrm = vec2(-dir.y, dir.x);
    return c0 + vec4(nrm.x / aspect, nrm.y, 0.0, 0.0) * side * width * c0.w;
  }`

const ARC_VERTEX = /* glsl */ `
  attribute float aT; attribute float aSide;
  attribute vec3 aA; attribute vec3 aC; attribute vec3 aB; attribute vec3 aColor; attribute vec2 aInfo;
  uniform float uNow; uniform float uAspect; uniform float uDur;
  varying float vT; varying float vSide; varying float vHead; varying vec3 vColor; varying float vDrop; varying float vAge;
  ${BEZIER}
  void main() {
    float age = (uNow - aInfo.x) / uDur;
    vT = aT; vSide = aSide; vColor = aColor; vDrop = aInfo.y; vAge = age; vHead = clamp(age, 0.0, 1.0);
    if (age < 0.0 || age > 1.0 + ${TRAIL_S.toFixed(2)} / uDur) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
    float behind = clamp(vHead - aT, 0.0, 1.0);
    float w = 0.0022 + 0.0045 * exp(-behind * 24.0) * step(aT, vHead);
    gl_Position = ribbon(aT, aSide, aA, aC, aB, w, uAspect);
  }`

/** A comet: a white-hot head, a solid coloured tail that thins out, and the colour turning to the drop colour as it lands. */
const ARC_FRAGMENT = /* glsl */ `
  varying float vT; varying float vSide; varying float vHead; varying vec3 vColor; varying float vDrop; varying float vAge;
  void main() {
    float behind = vHead - vT;
    if (behind < 0.0) discard;
    float trail = exp(-behind * 4.0);
    float landed = smoothstep(0.96, 1.05, vAge);
    float fade = 1.0 - smoothstep(1.0, 1.0 + ${TRAIL_S.toFixed(2)} / 0.9, vAge);
    vec3 col = mix(mix(vColor, vec3(1.0), 0.4), ${vec3(DROP_COLOR)}, vDrop * landed);
    float s = 1.0 - abs(vSide);
    float glow = pow(s, 4.0) * 0.6 + pow(s, 12.0) * 0.9;
    gl_FragColor = vec4(col, (0.15 + trail * 0.85) * glow * fade);
  }`

/** The standing edge from a city to the home region: always drawn, so a still frame shows it too. */
const EDGE_VERTEX = /* glsl */ `
  attribute float aT; attribute float aSide;
  attribute vec3 aA; attribute vec3 aC; attribute vec3 aB; attribute vec3 aInfo; attribute float aDelay;
  uniform float uAspect; uniform float uWidth;
  varying float vT; varying float vSide; varying float vHot; varying float vDrop; varying float vDelay;
  ${BEZIER}
  void main() {
    vT = aT; vSide = aSide; vHot = aInfo.y; vDrop = aInfo.z; vDelay = aDelay;
    gl_Position = ribbon(aT, aSide, aA, aC, aB, (0.02 + 0.003 * aInfo.y) * uWidth, uAspect);
  }`

/**
 * While a wave plays (`uMode` 1) each edge is drawn out from its city to the home region, one after another, and then
 * pulses keep running along it toward the server. At rest (0) it is a steady line.
 */
const EDGE_FRAGMENT = /* glsl */ `
  uniform float uAlpha; uniform float uRun; uniform float uMode;
  varying float vT; varying float vSide; varying float vHot; varying float vDrop; varying float vDelay;
  void main() {
    float s = 1.0 - abs(vSide);
    float edge = pow(s, 3.5) + 0.3 * s * s * s;
    if (uMode > 0.5) edge = pow(s, 5.0);
    float ends = smoothstep(0.0, 0.03, vT) * smoothstep(1.0, 0.97, vT);
    vec3 col = mix(${vec3(EDGE)}, ${vec3(DROP_COLOR)}, clamp(vDrop * 4.0, 0.0, 1.0));
    float a = uAlpha;
    if (uMode > 0.5) {
      // Each edge has its own rhythm: now and then it drops out for a moment, then draws again from its city.
      float seed = fract(sin(vDelay * 91.7 + 3.1) * 43758.5453);
      float period = 8.0 + 6.0 * seed;
      float along = uRun + seed * period;
      float cycle = floor(along / period);
      float c = mod(along, period);
      float gap = 0.25 + 0.6 * fract(sin(cycle * 12.9898 + vDelay * 78.233) * 43758.5453);
      if (c < gap) discard;
      float p = clamp((c - gap) / 0.9, 0.0, 1.0);
      p = 1.0 - pow(1.0 - p, 3.0);
      if (vT > p) discard;
      float tip = (1.0 - step(0.999, p)) * smoothstep(0.14, 0.0, p - vT);
      float band = fract(vT * 3.0 - uRun * 0.9);
      float pulse = smoothstep(0.0, 0.1, band) * (1.0 - smoothstep(0.1, 0.45, band));
      a = 0.55 + 0.6 * pulse + 0.6 * tip;
      col = mix(col, vec3(1.0), 0.35 * pulse + 0.6 * tip);
    }
    col = mix(col, vec3(1.0), vHot * 0.5);
    gl_FragColor = vec4(col, min(1.4, a + 0.45 * vHot) * edge * ends);
  }`

interface Departure {
  readonly at: number
  readonly a: Vector3
  readonly b: Vector3
  /** The server the request is for, where its landing ring opens. */
  readonly pop: Vector3
  readonly color: readonly [number, number, number]
  readonly dropped: boolean
}

interface Place {
  readonly city: string
  readonly point: Vector3
  readonly share: number
  readonly dot: Mesh
  readonly halo: Mesh
}

/** One deployed point of presence: a bright core in a soft glow, inside a thin ring where nearby clients' edges land. */
interface PopMark {
  readonly point: Vector3
  readonly meshes: readonly Mesh[]
  readonly glow: Mesh | null
  readonly home: boolean
  /** Switched off: a dim dot with no glow, and no traffic routed to it. */
  readonly idle: boolean
}

/** Where a client city's traffic goes: from its dot to the server that serves it. */
interface Route {
  readonly start: Vector3
  readonly pop: Vector3
  readonly popId: string
  readonly end: Vector3
}

interface Standing {
  readonly city: string
  readonly a: Vector3
  readonly c: Vector3
  readonly b: Vector3
}

/** Where a label belongs on the canvas: a city's dot, the middle of its edge, or the home region. */
export interface Note {
  readonly id: string
  readonly kind: "home" | "pop" | "city" | "edge"
  readonly city: string
  readonly x: number
  readonly y: number
  /** False when it is on the far side of the ball. */
  readonly seen: boolean
}

/** What the pointer is over: a city's dot, an edge from a city to the home region, or the home region itself. */
export interface Hover {
  readonly kind: "city" | "edge" | "home" | "pop"
  readonly city: string
  /** Where on the canvas, in CSS pixels, so a tooltip can sit beside it. */
  readonly x: number
  readonly y: number
}

/** A soft glow sprite, `radius` across from its middle, lying flat on the sphere at `at`. */
function glowSprite(time: { value: number }, radius: number, color: number, strength: number, core: number, phase: number): Mesh {
  return new Mesh(
    new CircleGeometry(radius, 32),
    new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      side: DoubleSide,
      uniforms: { uTime: time, uColor: { value: new Color(color) }, uStrength: { value: strength }, uCore: { value: core }, uPhase: { value: phase } },
      vertexShader: GLOW_VERTEX,
      fragmentShader: GLOW_FRAGMENT,
    }),
  )
}

const FORWARD = new Vector3(0, 0, 1)

/** Lays a flat mesh on the sphere at `at`, facing outward. */
function faceOut(mesh: Mesh, at: Vector3): Mesh {
  mesh.position.copy(at)
  mesh.quaternion.setFromUnitVectors(FORWARD, at.clone().normalize())
  return mesh
}

/** A ribbon mesh with `capacity` instances, each carrying the per-instance attributes named in `sizes` (floats per instance). */
function ribbonMesh<K extends string>(capacity: number, sizes: Record<K, number>, material: ShaderMaterial, order: number): { mesh: Mesh; buffers: Record<K, InstancedBufferAttribute> } {
  const base = new InstancedBufferGeometry()
  const t: number[] = []
  const side: number[] = []
  const index: number[] = []
  for (let k = 0; k <= SEGMENTS; k++) {
    for (const sd of [-1, 1]) {
      t.push(k / SEGMENTS)
      side.push(sd)
    }
    if (k < SEGMENTS) index.push(k * 2, k * 2 + 1, k * 2 + 2, k * 2 + 1, k * 2 + 3, k * 2 + 2)
  }
  base.setAttribute("position", new Float32BufferAttribute(new Float32Array(t.length * 3), 3))
  base.setAttribute("aT", new Float32BufferAttribute(t, 1))
  base.setAttribute("aSide", new Float32BufferAttribute(side, 1))
  base.setIndex(index)
  const buffers = {} as Record<K, InstancedBufferAttribute>
  for (const name of Object.keys(sizes) as K[]) {
    const attribute = new InstancedBufferAttribute(new Float32Array(capacity * sizes[name]), sizes[name])
    attribute.setUsage(35048)
    base.setAttribute(name, attribute)
    buffers[name] = attribute
  }
  base.instanceCount = 0
  const mesh = new Mesh(base, material)
  mesh.frustumCulled = false
  mesh.renderOrder = order
  return { mesh, buffers }
}

/**
 * The globe, in the dot-matrix style of cobe: a matte near-black ball with land as a field of white dots. Every city in the audience has a dot and a standing edge to the home region; a comet flies along that
 * edge for each request. It reads the clock each frame and owns nothing the store does.
 */
export class GlobeScene {
  private readonly renderer: WebGLRenderer
  private readonly scene = new Scene()
  private readonly camera = new PerspectiveCamera(FOV, 1, 0.1, 100)
  private readonly globe = new Group()
  private readonly arcs: Mesh
  private readonly arcBuffers: Record<"aA" | "aC" | "aB" | "aColor" | "aInfo", InstancedBufferAttribute>
  private readonly arcUniforms = { uNow: { value: 0 }, uAspect: { value: 1 }, uDur: { value: LEAD_MS / 1000 } }
  private readonly edges: Mesh
  private readonly edgeBuffers: Record<"aA" | "aC" | "aB" | "aInfo" | "aDelay", InstancedBufferAttribute>
  private readonly edgeUniforms = { uAspect: { value: 1 }, uWidth: { value: 1 }, uAlpha: { value: 1.0 }, uRun: { value: 0 }, uMode: { value: 0 } }
  private readonly rings: Mesh[] = []
  private readonly ringBorn: number[] = []
  private readonly places = new Group()
  /** Shared by every glow, so they all breathe on the one clock. */
  private readonly glowTime = { value: 0 }
  private placed: Place[] = []
  private standing: Standing[] = []
  /** The clock every departure is timed on: the stream runs on it from the moment the scene is made, and never restarts. */
  private readonly origin = performance.now()
  /** Whether any traffic has been queued yet; until then the edges stay steady lines. */
  private fed = false
  private departures: Departure[] = []
  private sent = 0
  private next = 0
  private landed = 0
  private landings: { at: number; pop: Vector3 }[] = []
  private slow = 0
  private frames = 0
  private pixelRatio: number
  private zoom = 1
  private hot: Hover | null = null
  private drops = new Map<string, number>()
  private destroyed = false
  /** Set once the player turns or zooms the globe, so the next wave does not put it back. */
  private turned = false
  private zoomed = false
  private audience: Wave["audience"] | null = null
  /** Called when the land arrives, so a still globe can draw itself again. */
  onLoad: () => void = () => {}
  /** Called after every frame with where the labels go, so the DOM can follow the globe. Without one, the labels are not projected. */
  onNotes: ((notes: readonly Note[]) => void) | null = null
  private readonly sun = new Vector3(-0.35, 0.45, 0.85).normalize()
  private readonly home = onSphere(HOME.lat, HOME.lon, RADIUS * 1.004)
  /** Deployed points of presence, by city id; the home city is always here. */
  private pops: readonly string[] = [HOME.id]
  private popMarks = new Map<string, PopMark>()
  private routes = new Map<string, Route>()

  private constructor(host: HTMLElement, renderer: WebGLRenderer) {
    this.renderer = renderer
    this.pixelRatio = Math.min(2, window.devicePixelRatio || 1)
    this.camera.position.set(0, 0, 4)
    this.scene.add(this.globe)

    const day = new TextureLoader().load(`${import.meta.env.BASE_URL}earth/earth-day.jpg`, () => {
      this.readLand(day.image as CanvasImageSource)
      day.dispose()
      if (!this.destroyed) this.onLoad()
    })

    const sun = { value: this.sun }
    this.globe.add(new Mesh(new SphereGeometry(RADIUS, 96, 72), new ShaderMaterial({ uniforms: { sunDir: sun }, vertexShader: SPHERE_VERTEX, fragmentShader: SPHERE_FRAGMENT })))
    this.scene.add(
      new Mesh(
        new SphereGeometry(RADIUS * 1.12, 96, 64),
        new ShaderMaterial({ transparent: true, depthWrite: false, side: BackSide, blending: AdditiveBlending, uniforms: { sunDir: sun }, vertexShader: SPHERE_VERTEX, fragmentShader: HALO_FRAGMENT }),
      ),
    )

    const arcs = ribbonMesh(ARCS, { aA: 3, aC: 3, aB: 3, aColor: 3, aInfo: 2 }, new ShaderMaterial({ transparent: true, depthWrite: false, blending: AdditiveBlending, side: DoubleSide, uniforms: this.arcUniforms, vertexShader: ARC_VERTEX, fragmentShader: ARC_FRAGMENT }), 3)
    this.arcs = arcs.mesh
    this.arcBuffers = arcs.buffers
    const edges = ribbonMesh(EDGES, { aA: 3, aC: 3, aB: 3, aInfo: 3, aDelay: 1 }, new ShaderMaterial({ transparent: true, depthWrite: false, blending: AdditiveBlending, side: DoubleSide, uniforms: this.edgeUniforms, vertexShader: EDGE_VERTEX, fragmentShader: EDGE_FRAGMENT }), 2)
    this.edges = edges.mesh
    this.edgeBuffers = edges.buffers
    this.globe.add(this.edges, this.arcs, this.places)

    // A ring that opens at the server each time a request lands.
    for (let i = 0; i < RINGS; i++) {
      const ring = new Mesh(new RingGeometry(POP_RING, POP_RING * 1.06, 48), new MeshBasicMaterial({ color: POP_GLOW, transparent: true, opacity: 0, side: DoubleSide, blending: AdditiveBlending, depthWrite: false }))
      this.globe.add(ring)
      this.rings.push(ring)
      this.ringBorn.push(-10)
    }
    this.setPops([HOME.id])

    this.sizeTo(host)
    this.orient(this.home)
  }

  static create(host: HTMLElement): GlobeScene {
    const renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" })
    renderer.outputColorSpace = SRGBColorSpace
    renderer.setClearColor(0x000000, 0)
    renderer.domElement.className = "globe-canvas"
    host.appendChild(renderer.domElement)
    return new GlobeScene(host, renderer)
  }

  /** Reads the day map once: land is whatever is not blue water. Builds the matrix of land dots. */
  private readLand(image: CanvasImageSource): void {
    if (this.destroyed) return
    const canvas = document.createElement("canvas")
    canvas.width = MASK_W
    canvas.height = MASK_H
    const ctx = canvas.getContext("2d", { willReadFrequently: true })
    if (!ctx) return
    ctx.drawImage(image, 0, 0, MASK_W, MASK_H)
    const pixels = ctx.getImageData(0, 0, MASK_W, MASK_H).data
    const land = (lat: number, lon: number) => {
      const x = Math.min(MASK_W - 1, Math.max(0, Math.floor(((lon + 180) / 360) * MASK_W)))
      const y = Math.min(MASK_H - 1, Math.max(0, Math.floor(((90 - lat) / 180) * MASK_H)))
      const i = (y * MASK_W + x) * 4
      const r = pixels[i]
      const g = pixels[i + 1]
      const b = pixels[i + 2]
      return (r > 200 && g > 200 && b > 200) || !(b > r * 1.25 && b > g * 0.95)
    }
    const matrices: Matrix4[] = []
    const dummy = new Object3D()
    const rows = 150
    for (let row = 0; row < rows; row++) {
      const lat = 90 - ((row + 0.5) / rows) * 180
      const count = Math.max(1, Math.round(Math.cos((lat * Math.PI) / 180) * rows * 2))
      for (let k = 0; k < count; k++) {
        const lon = -180 + ((k + 0.5) / count) * 360
        if (!land(lat, lon)) continue
        dummy.position.copy(onSphere(lat, lon, RADIUS * 1.002))
        dummy.lookAt(dummy.position.clone().multiplyScalar(2))
        dummy.updateMatrix()
        matrices.push(dummy.matrix.clone())
      }
    }
    const mesh = new InstancedMesh(
      new CircleGeometry(0.0085, 6),
      new ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { sunDir: { value: this.sun } }, vertexShader: DOTS_VERTEX, fragmentShader: DOTS_FRAGMENT }),
      matrices.length,
    )
    matrices.forEach((m, i) => mesh.setMatrixAt(i, m))
    mesh.instanceMatrix.needsUpdate = true
    this.globe.add(mesh)
  }

  private sizeTo(host: HTMLElement): void {
    const width = Math.max(1, host.clientWidth)
    const height = Math.max(1, host.clientHeight)
    this.renderer.setPixelRatio(this.pixelRatio)
    this.renderer.setSize(width, height, false)
    this.camera.aspect = width / height
    // The whole ball fills the smaller side of the pane; zoom then closes in on it.
    const half = Math.tan((FOV * Math.PI) / 360) * 0.86 * Math.min(1, width / height)
    this.camera.position.z = 1 / half
    this.camera.zoom = this.zoom
    this.camera.updateProjectionMatrix()
    this.arcUniforms.uAspect.value = width / height
    this.edgeUniforms.uAspect.value = width / height
  }

  /** Scales the width of every edge; a small globe draws them wider so they still read. */
  setEdgeWidth(scale: number): void {
    this.edgeUniforms.uWidth.value = scale
  }

  resize(host: HTMLElement): void {
    if (!this.destroyed) this.sizeTo(host)
  }

  /** Closes in on the globe by `factor` (above 1) or backs off (below 1), between the whole ball and five times that. */
  zoomBy(factor: number): void {
    this.zoomed = true
    this.zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, this.zoom * factor))
    this.camera.zoom = this.zoom
    this.camera.updateProjectionMatrix()
  }

  /** Turns the globe so `direction` (a point on its surface) faces the camera. */
  private orient(direction: Vector3): void {
    const target = direction.clone().normalize()
    const yaw = -Math.atan2(target.x, target.z)
    const pitch = Math.asin(Math.max(-1, Math.min(1, target.y)))
    this.globe.rotation.set(pitch * 0.9, yaw, 0, "YXZ")
  }

  /** Spins the globe by a drag of `dx`, `dy` pixels. The audience stops pulling it back until `resetView`. */
  turn(dx: number, dy: number): void {
    if (this.destroyed) return
    this.turned = true
    // A closer view turns more slowly, so the same drag moves the same patch of land.
    const k = 0.008 / this.zoom
    this.globe.rotation.y += dx * k
    this.globe.rotation.x = Math.max(-1.3, Math.min(1.3, this.globe.rotation.x + dy * k))
  }

  /** Faces the audience again at full view. */
  resetView(audience: Wave["audience"] | null = this.audience): void {
    this.turned = false
    this.zoomed = false
    if (audience) this.setAudience(audience)
  }

  /** Puts a dot on every city of the audience with an edge to the home region, and turns toward the middle of them unless the player has turned it. */
  setAudience(audience: Wave["audience"]): void {
    this.audience = audience
    for (const old of this.places.children.splice(0)) {
      const mesh = old as Mesh
      mesh.geometry.dispose()
      ;(mesh.material as MeshBasicMaterial).dispose()
    }
    this.placed = []
    this.standing = []
    const buffers = this.edgeBuffers
    const served = new Map<string, number>()
    audience.slice(0, EDGES).forEach((a) => {
      const city = CITIES[a.city]
      if (!city) return
      const i = this.standing.length
      const route = this.routeOf(a.city)
      const point = route.start
      const size = 0.011 + 0.02 * a.share
      const halo = glowSprite(this.glowTime, size * 5, CITY_GLOW, 0.3, 0, i * 0.7)
      const dot = new Mesh(new CircleGeometry(size, 24), new MeshBasicMaterial({ color: CITY_COLOR, side: DoubleSide }))
      for (const mesh of [halo, dot]) {
        faceOut(mesh, point)
        this.places.add(mesh)
      }
      this.placed.push({ city: a.city, point, share: a.share, dot, halo })
      served.set(route.popId, (served.get(route.popId) ?? 0) + a.share)
      const control = controlOf(point, route.end)
      this.standing.push({ city: a.city, a: point, c: control, b: route.end })
      buffers.aA.setXYZ(i, point.x, point.y, point.z)
      buffers.aC.setXYZ(i, control.x, control.y, control.z)
      buffers.aB.setXYZ(i, route.end.x, route.end.y, route.end.z)
      buffers.aInfo.setXYZ(i, Math.min(1, a.share * 3), 0, this.drops.get(a.city) ?? 0)
      buffers.aDelay.setX(i, i * 0.14)
    })
    // The busier a server, the brighter it glows.
    for (const [id, mark] of this.popMarks) {
      if (!mark.glow) continue
      const material = mark.glow.material as ShaderMaterial
      material.uniforms.uStrength!.value = (mark.home ? 0.8 : 0.6) + Math.min(1, (served.get(id) ?? 0) * 2.5) * 0.4
    }
    this.pushEdges()
    if (!this.turned) {
      const middle = onSphere(HOME.lat, HOME.lon)
      for (const place of this.placed) middle.addScaledVector(place.point.clone().normalize(), place.share)
      this.orient(middle)
      if (!this.zoomed) this.fit(middle)
    }
  }

  /** Closes in until the audience and the home region take up about two thirds of the disc, so a local audience is not a speck. */
  private fit(middle: Vector3): void {
    const centre = middle.clone().normalize()
    const spread = Math.max(this.home.angleTo(centre), ...this.placed.map((p) => p.point.angleTo(centre)))
    this.zoom = Math.max(ZOOM_MIN, Math.min(3, 0.66 / Math.sin(Math.min(Math.PI / 2, Math.max(0.12, spread)))))
    this.camera.zoom = this.zoom
    this.camera.updateProjectionMatrix()
  }

  private pushEdges(): void {
    for (const attribute of Object.values(this.edgeBuffers)) attribute.needsUpdate = true
    ;(this.edges.geometry as InstancedBufferGeometry).instanceCount = this.standing.length
  }

  /**
   * Shows the deployed points of presence, and routes every city's traffic to the one nearest it. Each one is a bright core
   * in a soft glow, inside a thin ring; the home point is the larger.
   */
  setPops(pops: readonly string[], idle: readonly string[] = []): void {
    this.pops = pops.length > 0 ? pops : [HOME.id]
    this.routes.clear()
    for (const old of this.popMarks.values()) {
      for (const mesh of old.meshes) {
        this.globe.remove(mesh)
        mesh.geometry.dispose()
        ;(mesh.material as { dispose: () => void }).dispose()
      }
    }
    this.popMarks.clear()
    for (const id of idle) {
      const city = CITIES[id]
      if (!city || this.pops.includes(id)) continue
      const point = onSphere(city.lat, city.lon, RADIUS * 1.006)
      const dot = new Mesh(new CircleGeometry(0.012, 20), new MeshBasicMaterial({ color: 0x8a8f98, transparent: true, opacity: 0.8, side: DoubleSide }))
      const ring = new Mesh(new RingGeometry(POP_RING * 0.96, POP_RING, 40), new MeshBasicMaterial({ color: 0x8a8f98, transparent: true, opacity: 0.18, side: DoubleSide, depthWrite: false }))
      const meshes = [ring, dot]
      meshes.forEach((mesh, k) => this.globe.add(faceOut(mesh, onSphere(city.lat, city.lon, RADIUS * (1.004 + 0.002 * k)))))
      this.popMarks.set(id, { point, meshes, glow: null, home: id === HOME.id, idle: true })
    }
    this.pops.forEach((id, i) => {
      const city = CITIES[id]
      if (!city) return
      const home = id === HOME.id
      const point = onSphere(city.lat, city.lon, RADIUS * 1.006)
      const glow = glowSprite(this.glowTime, home ? 0.24 : 0.19, POP_GLOW, 1, 0.5, i * 1.3)
      const core = new Mesh(new CircleGeometry(home ? 0.02 : 0.015, 28), new MeshBasicMaterial({ color: HOME_COLOR, side: DoubleSide }))
      const ring = new Mesh(new RingGeometry(POP_RING * 0.96, POP_RING * 1.0, 56), new MeshBasicMaterial({ color: POP_GLOW, transparent: true, opacity: 0.16, side: DoubleSide, blending: AdditiveBlending, depthWrite: false }))
      const meshes = [glow, ring, core]
      meshes.forEach((mesh, k) => this.globe.add(faceOut(mesh, onSphere(city.lat, city.lon, RADIUS * (1.004 + 0.002 * k)))))
      this.popMarks.set(id, { point, meshes, glow, home, idle: false })
    })
    if (this.audience) this.setAudience(this.audience)
  }

  /** Where a city's requests go: to the nearest deployed point of presence, landing on its ring when the city is close to it. */
  private routeOf(city: string): Route {
    const cached = this.routes.get(city)
    if (cached) return cached
    const at = CITIES[city]!
    const popId = nearestPop(city, this.pops)
    const target = CITIES[popId] ?? HOME
    const start = onSphere(at.lat, at.lon, RADIUS * 1.004)
    const pop = onSphere(target.lat, target.lon, RADIUS * 1.004)
    const route = { start, pop, popId: CITIES[popId] ? popId : HOME.id, end: landingOf(start, pop, seedOf(city)) }
    this.routes.set(city, route)
    return route
  }

  /** Tints each city's edge toward red by the share of its last wave that was dropped. Pass an empty map to clear it. */
  setDrops(drops: ReadonlyMap<string, number>): void {
    this.drops = new Map(drops)
    this.standing.forEach((s, i) => this.edgeBuffers.aInfo.setZ(i, this.drops.get(s.city) ?? 0))
    this.pushEdges()
  }

  /** Lights up what the pointer is over, or nothing. */
  setHover(hover: Hover | null): void {
    const same = this.hot?.kind === hover?.kind && this.hot?.city === hover?.city
    this.hot = hover
    if (same) return
    this.standing.forEach((s, i) => this.edgeBuffers.aInfo.setY(i, hover?.kind === "edge" && hover.city === s.city ? 1 : 0))
    this.pushEdges()
    for (const place of this.placed) {
      const on = hover?.city === place.city && (hover.kind === "city" || hover.kind === "edge")
      place.dot.scale.setScalar(on ? 1.7 : 1)
      place.halo.scale.setScalar(on ? 1.7 : 1)
    }
    for (const [id, mark] of this.popMarks) {
      const served = hover && (hover.kind === "city" || hover.kind === "edge") && this.routeOf(hover.city).popId === id
      const on = ((hover?.kind === "home" || hover?.kind === "pop") && hover.city === id) || served
      for (const mesh of mark.meshes) mesh.scale.setScalar(on ? 1.35 : 1)
    }
  }

  /** Whether `p` (in world space) is on the side of the ball the camera sees. */
  private seen(p: Vector3): boolean {
    const c = this.camera.position
    const d = p.clone().sub(c)
    const b = c.dot(d)
    const disc = b * b - d.lengthSq() * (c.lengthSq() - RADIUS * RADIUS * 0.99)
    if (disc <= 0) return true
    const t = (-b - Math.sqrt(disc)) / d.lengthSq()
    return t >= 0.999 || t <= 0
  }

  private screenOf(local: Vector3, w: number, h: number): { x: number; y: number; seen: boolean } {
    const world = local.clone().applyMatrix4(this.globe.matrixWorld)
    const ndc = world.clone().project(this.camera)
    return { x: ((ndc.x + 1) / 2) * w, y: ((1 - ndc.y) / 2) * h, seen: this.seen(world) }
  }

  /** What the pointer is over, at `x`, `y` in CSS pixels from the canvas's top left. A dot beats an edge. */
  hitTest(x: number, y: number): Hover | null {
    if (this.destroyed) return null
    const canvas = this.renderer.domElement
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    this.camera.updateMatrixWorld()
    this.globe.updateMatrixWorld(true)
    let dot: { hover: Hover; d: number } | null = null
    const nearDot = (hover: Hover, d: number) => {
      if (d <= HIT_DOT_PX && (!dot || d < dot.d)) dot = { hover, d }
    }
    for (const [id, mark] of this.popMarks) {
      const at = this.screenOf(mark.point, w, h)
      if (at.seen) nearDot({ kind: mark.home ? "home" : "pop", city: id, x: at.x, y: at.y }, Math.hypot(at.x - x, at.y - y))
    }
    for (const place of this.placed) {
      const at = this.screenOf(place.point, w, h)
      if (at.seen) nearDot({ kind: "city", city: place.city, x: at.x, y: at.y }, Math.hypot(at.x - x, at.y - y))
    }
    if (dot) return (dot as { hover: Hover }).hover
    let edge: { hover: Hover; d: number } | null = null
    for (const standing of this.standing) {
      let prev = this.screenOf(standing.a, w, h)
      for (let k = 1; k <= 24; k++) {
        const next = this.screenOf(bezier(standing.a, standing.c, standing.b, k / 24), w, h)
        if (prev.seen && next.seen) {
          const dx = next.x - prev.x
          const dy = next.y - prev.y
          const u = Math.max(0, Math.min(1, ((x - prev.x) * dx + (y - prev.y) * dy) / (dx * dx + dy * dy || 1)))
          const d = Math.hypot(prev.x + dx * u - x, prev.y + dy * u - y)
          if (d <= HIT_EDGE_PX && (!edge || d < edge.d)) edge = { hover: { kind: "edge", city: standing.city, x, y }, d }
        }
        prev = next
      }
    }
    return edge ? (edge as { hover: Hover }).hover : null
  }

  /** Where the home region, each city and the middle of each edge are on the canvas right now. */
  notes(): Note[] {
    const canvas = this.renderer.domElement
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    this.camera.updateMatrixWorld()
    this.globe.updateMatrixWorld(true)
    const at = (id: string, kind: Note["kind"], city: string, local: Vector3): Note => ({ id, kind, city, ...this.screenOf(local, w, h) })
    return [
      ...[...this.popMarks].map(([id, mark]) => at(mark.home ? "home" : `pop:${id}`, mark.home ? "home" : "pop", id, mark.point)),
      ...this.placed.map((p) => at(`city:${p.city}`, "city", p.city, p.point)),
      ...this.standing.map((e) => at(`edge:${e.city}`, "edge", e.city, bezier(e.a, e.c, e.b, 0.5))),
    ]
  }

  /**
   * Queues one burst of traffic to leave its clients at `now` (a `performance.now()` reading). Bursts go on one clock, so
   * the stream runs on and nothing resets between them. Whatever has already launched keeps flying.
   */
  feed(wave: Wave, now: number): void {
    this.fed = true
    this.departures.splice(0, this.next)
    this.landings.splice(0, this.landed)
    this.next = 0
    this.landed = 0
    const start = now - this.origin
    for (const phase of wave.phases) {
      for (const unit of phase.units) {
        if (!CITIES[unit.city]) continue
        const route = this.routeOf(unit.city)
        const at = start + phase.startMs + unit.at - LEAD_MS
        this.departures.push({
          at,
          a: route.start,
          b: route.end,
          pop: route.pop,
          color: rgb(TYPE_COLOR[unit.type]),
          dropped: unit.fate.kind === "dropped",
        })
        this.landings.push({ at: at + LEAD_MS, pop: route.pop })
      }
    }
    this.departures.sort((x, y) => x.at - y.at)
    this.landings.sort((x, y) => x.at - y.at)
  }

  private launch(d: Departure): void {
    const slot = this.sent % ARCS
    const control = controlOf(d.a, d.b)
    const b = this.arcBuffers
    b.aA.setXYZ(slot, d.a.x, d.a.y, d.a.z)
    b.aC.setXYZ(slot, control.x, control.y, control.z)
    b.aB.setXYZ(slot, d.b.x, d.b.y, d.b.z)
    b.aColor.setXYZ(slot, d.color[0], d.color[1], d.color[2])
    b.aInfo.setXY(slot, d.at / 1000, d.dropped ? 1 : 0)
    for (const attribute of Object.values(b)) attribute.needsUpdate = true
    this.sent++
    ;(this.arcs.geometry as InstancedBufferGeometry).instanceCount = Math.min(ARCS, this.sent)
  }

  /** Draws the globe at `now` (a `performance.now()` reading). `still` draws one frame at rest, launching and turning nothing. Returns whether the wave on it is over. */
  frame(now: number, still: boolean): boolean {
    if (this.destroyed) return true
    const elapsed = now - this.origin
    this.arcUniforms.uNow.value = elapsed / 1000
    this.edgeUniforms.uRun.value = elapsed / 1000
    this.glowTime.value = elapsed / 1000
    this.edgeUniforms.uMode.value = this.fed ? 1 : 0
    if (!still) {
      while (this.next < this.departures.length && this.departures[this.next].at <= elapsed) this.launch(this.departures[this.next++])
      while (this.landed < this.landings.length && this.landings[this.landed]!.at <= elapsed) {
        const slot = this.landed % RINGS
        this.ringBorn[slot] = now
        faceOut(this.rings[slot]!, this.landings[this.landed]!.pop)
        this.landed++
      }
    }
    this.rings.forEach((ring, i) => {
      const k = (now - this.ringBorn[i]) / 900
      const material = ring.material as MeshBasicMaterial
      material.opacity = k >= 0 && k < 1 ? 0.45 * (1 - k) * (1 - k) : 0
      ring.scale.setScalar(1 + Math.max(0, k) * 1.8)
    })
    if (!still && !this.turned) this.globe.rotation.y += Math.sin(now / 4000) * 0.0004
    const before = performance.now()
    this.renderer.render(this.scene, this.camera)
    this.onNotes?.(this.notes())
    this.watchSpeed(performance.now() - before)
    return false
  }

  /** Steps the pixel ratio down when frames run long, as the GitHub globe does, so a slow machine keeps its frame rate. */
  private watchSpeed(ms: number): void {
    this.frames++
    this.slow += ms > 20 ? 1 : 0
    if (this.frames < 90) return
    if (this.slow > 30 && this.pixelRatio > 1) {
      this.pixelRatio = Math.max(1, this.pixelRatio - 0.5)
      this.renderer.setPixelRatio(this.pixelRatio)
      this.renderer.setSize(this.renderer.domElement.clientWidth, this.renderer.domElement.clientHeight, false)
    }
    this.frames = 0
    this.slow = 0
  }

  destroy(): void {
    if (this.destroyed) return
    this.destroyed = true
    this.scene.traverse((object) => {
      const mesh = object as Mesh
      mesh.geometry?.dispose()
      const material = mesh.material as { dispose?: () => void } | { dispose?: () => void }[] | undefined
      if (Array.isArray(material)) material.forEach((m) => m.dispose?.())
      else material?.dispose?.()
    })
    this.renderer.dispose()
    this.renderer.forceContextLoss()
    this.renderer.domElement.remove()
  }
}
