/**
 * Fixed-size particle pool in screen space. Structure-of-arrays over typed
 * arrays: no per-particle objects, so a splash never triggers garbage
 * collection mid-animation (a classic source of dropped frames on phones).
 */
export class ParticlePool {
  private readonly x: Float32Array
  private readonly y: Float32Array
  private readonly vx: Float32Array
  private readonly vy: Float32Array
  private readonly life: Float32Array
  private readonly maxLife: Float32Array
  private readonly size: Float32Array
  private active = 0

  constructor(readonly capacity: number) {
    this.x = new Float32Array(capacity)
    this.y = new Float32Array(capacity)
    this.vx = new Float32Array(capacity)
    this.vy = new Float32Array(capacity)
    this.life = new Float32Array(capacity)
    this.maxLife = new Float32Array(capacity)
    this.size = new Float32Array(capacity)
  }

  get count(): number {
    return this.active
  }

  /** Adds a particle; silently drops it when the pool is full (a splash is decoration, not data). */
  spawn(x: number, y: number, vx: number, vy: number, life: number, size: number): void {
    if (this.active >= this.capacity) return
    const i = this.active++
    this.x[i] = x
    this.y[i] = y
    this.vx[i] = vx
    this.vy[i] = vy
    this.life[i] = life
    this.maxLife[i] = life
    this.size[i] = size
  }

  update(dt: number, gravity: number): void {
    let i = 0
    while (i < this.active) {
      this.life[i]! -= dt
      if (this.life[i]! <= 0) {
        // Swap-remove keeps the live particles packed at the front.
        const last = --this.active
        this.x[i] = this.x[last]!
        this.y[i] = this.y[last]!
        this.vx[i] = this.vx[last]!
        this.vy[i] = this.vy[last]!
        this.life[i] = this.life[last]!
        this.maxLife[i] = this.maxLife[last]!
        this.size[i] = this.size[last]!
        continue
      }
      this.vy[i]! += gravity * dt
      this.x[i]! += this.vx[i]! * dt
      this.y[i]! += this.vy[i]! * dt
      i++
    }
  }

  draw(ctx: CanvasRenderingContext2D, color: string): void {
    if (this.active === 0) return
    ctx.fillStyle = color
    for (let i = 0; i < this.active; i++) {
      ctx.globalAlpha = Math.min(1, (this.life[i]! / this.maxLife[i]!) * 1.5)
      ctx.beginPath()
      ctx.arc(this.x[i]!, this.y[i]!, this.size[i]!, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }

  clear(): void {
    this.active = 0
  }
}
