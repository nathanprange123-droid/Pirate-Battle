import type { GameConfig, WeaponConfig } from '../config'
import type {
  EndReason,
  EnemyKind,
  EnemyState,
  GameEvent,
  MatchOutcome,
  MatchStatus,
  PlayerIntent,
  ProjectileState,
  Rect,
  ShipState,
  Team,
} from './types'
import { buildIslandRects } from './islands'
import {
  circleIntersectsRect,
  circlesOverlap,
  clamp,
  pointInRect,
  pushCircleOutOfRect,
  separateCircles,
} from './collision'
import { angleDifference, rotateTowards } from './angles'
import { createRandom } from './random'

/**
 * Game rules. Knows nothing about rendering or input devices.
 * update() receives a time step in seconds, so behavior does not depend on FPS.
 */
export class World {
  readonly player: ShipState
  readonly enemies: EnemyState[] = []
  readonly projectiles: ProjectileState[] = []
  readonly islands: readonly Rect[]

  status: MatchStatus = 'running'
  endReason: EndReason | null = null
  /** Set once when the match ends. */
  outcome: MatchOutcome | null = null
  score = 0
  /** Seconds of active play so far. */
  elapsed = 0
  /** Seconds left in the match. */
  timeLeft: number

  private readonly config: GameConfig
  private readonly random: () => number
  private readonly events: GameEvent[] = []
  private nextId = 1
  private spawnTimer: number
  private spawnCount = 0
  /** Seconds until each player weapon can fire again. */
  private frontCooldown = 0
  private leftCooldown = 0
  private rightCooldown = 0

  constructor(config: GameConfig, seed: number) {
    this.config = config
    this.random = createRandom(seed)
    this.islands = buildIslandRects(config)
    this.timeLeft = config.match.duration
    this.spawnTimer = config.spawn.firstDelay

    const { spawn, radius, maxHealth } = config.player
    this.player = {
      x: spawn.x,
      y: spawn.y,
      angle: spawn.angle,
      radius,
      health: maxHealth,
      maxHealth,
    }
  }

  update(dt: number, intent: PlayerIntent): void {
    // After the match ends nothing moves, shoots, spawns or scores.
    if (this.status !== 'running') return

    this.elapsed += dt
    this.timeLeft = Math.max(0, this.timeLeft - dt)

    this.movePlayer(dt, intent)
    this.updatePlayerWeapons(dt, intent)
    this.updateSpawns(dt)
    this.updateEnemies(dt)
    this.updateProjectiles(dt)
    this.checkChaserContacts()
    this.removeDestroyedEnemies()
    this.checkMatchEnd()
  }

  /** Returns and clears the events produced since the last call. */
  drainEvents(): GameEvent[] {
    return this.events.splice(0)
  }

  // ---------- Match ----------

  private checkMatchEnd(): void {
    if (this.player.health <= 0) {
      const { x, y, angle } = this.player
      this.events.push({ type: 'shipDestroyed', x, y, angle, ship: 'player' })
      this.end('playerDestroyed')
    } else if (this.timeLeft <= 0) {
      this.end('timeUp')
    }
  }

  private end(reason: EndReason): void {
    this.status = 'ended'
    this.endReason = reason
    this.outcome = {
      score: this.score,
      durationSeconds: Math.round(this.elapsed * 10) / 10,
      endReason: reason,
    }
    this.events.push({ type: 'matchEnded', reason })
  }

  // ---------- Player ----------

  private movePlayer(dt: number, intent: PlayerIntent): void {
    const ship = this.player
    const { moveSpeed, turnSpeed } = this.config.player

    ship.angle += intent.turn * turnSpeed * dt

    if (intent.forward) {
      ship.x += Math.cos(ship.angle) * moveSpeed * dt
      ship.y += Math.sin(ship.angle) * moveSpeed * dt
    }

    this.resolveIslandAndEdges(ship)
  }

  private updatePlayerWeapons(dt: number, intent: PlayerIntent): void {
    this.frontCooldown = Math.max(0, this.frontCooldown - dt)
    this.leftCooldown = Math.max(0, this.leftCooldown - dt)
    this.rightCooldown = Math.max(0, this.rightCooldown - dt)

    const ship = this.player
    const { bowOffset, frontCannon, sideCannons } = this.config.player

    if (intent.fireFront && this.frontCooldown === 0) {
      const x = ship.x + Math.cos(ship.angle) * bowOffset
      const y = ship.y + Math.sin(ship.angle) * bowOffset
      this.spawnProjectile('player', x, y, ship.angle, frontCannon)
      this.events.push({ type: 'cannonFired', weapon: 'front' })
      this.frontCooldown = frontCannon.cooldown
    }

    if (intent.fireLeft && this.leftCooldown === 0) {
      this.fireBroadside(ship, -1)
      this.events.push({ type: 'cannonFired', weapon: 'broadside' })
      this.leftCooldown = sideCannons.cooldown
    }

    if (intent.fireRight && this.rightCooldown === 0) {
      this.fireBroadside(ship, 1)
      this.events.push({ type: 'cannonFired', weapon: 'broadside' })
      this.rightCooldown = sideCannons.cooldown
    }
  }

  /** Fires three parallel shots out of one side. side: -1 = left, 1 = right. */
  private fireBroadside(ship: ShipState, side: -1 | 1): void {
    const { sideOffset, sideCannons } = this.config.player
    const direction = ship.angle + side * (Math.PI / 2)
    const forwardX = Math.cos(ship.angle)
    const forwardY = Math.sin(ship.angle)
    const outX = Math.cos(direction)
    const outY = Math.sin(direction)

    for (const slot of [-1, 0, 1]) {
      const along = slot * sideCannons.spacing
      const x = ship.x + forwardX * along + outX * sideOffset
      const y = ship.y + forwardY * along + outY * sideOffset
      this.spawnProjectile('player', x, y, direction, sideCannons)
    }
  }

  // ---------- Enemies ----------

  private updateSpawns(dt: number): void {
    this.spawnTimer -= dt
    if (this.spawnTimer > 0) return
    this.spawnTimer += this.config.spawn.interval

    if (this.enemies.length >= this.config.spawn.maxAlive) return

    const kind = this.pickEnemyKind()
    const point = this.findSpawnPoint(this.config[kind].radius)
    if (!point) return

    const angle = Math.atan2(this.player.y - point.y, this.player.x - point.x)
    this.addEnemy(kind, point.x, point.y, angle)
  }

  /** Adds an enemy at a position. Used by the spawner (and by test setups). */
  addEnemy(kind: EnemyKind, x: number, y: number, angle: number): EnemyState {
    const settings = this.config[kind]
    const enemy: EnemyState = {
      id: this.nextId++,
      kind,
      x,
      y,
      angle,
      radius: settings.radius,
      health: settings.maxHealth,
      maxHealth: settings.maxHealth,
      fireCooldown: kind === 'shooter' ? this.config.shooter.cannon.cooldown : 0,
    }
    this.enemies.push(enemy)
    this.spawnCount++
    return enemy
  }

  /** How many enemies appeared so far in this match. */
  get spawnedCount(): number {
    return this.spawnCount
  }

  /** The first two spawns are one of each type, so both always appear. */
  private pickEnemyKind(): EnemyKind {
    if (this.spawnCount === 0) return 'chaser'
    if (this.spawnCount === 1) return 'shooter'
    return this.random() < this.config.spawn.chaserChance ? 'chaser' : 'shooter'
  }

  /** Random free spot: away from the player, islands and other enemies. */
  private findSpawnPoint(radius: number): { x: number; y: number } | null {
    const { width, height } = this.config.arena
    const { edgeMargin, minDistanceFromPlayer, maxAttempts } = this.config.spawn
    const minX = edgeMargin + radius
    const minY = edgeMargin + radius

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const x = minX + this.random() * (width - minX * 2)
      const y = minY + this.random() * (height - minY * 2)

      const tooCloseToPlayer = circlesOverlap(
        x, y, radius,
        this.player.x, this.player.y, minDistanceFromPlayer,
      )
      if (tooCloseToPlayer) continue

      const onIsland = this.islands.some((rect) => circleIntersectsRect(x, y, radius + 8, rect))
      if (onIsland) continue

      const onEnemy = this.enemies.some((e) => circlesOverlap(x, y, radius, e.x, e.y, e.radius))
      if (onEnemy) continue

      return { x, y }
    }
    return null
  }

  private updateEnemies(dt: number): void {
    for (const enemy of this.enemies) {
      if (enemy.kind === 'chaser') this.updateChaser(enemy, dt)
      else this.updateShooter(enemy, dt)
    }

    // Keep ships from stacking on top of each other.
    for (let i = 0; i < this.enemies.length; i++) {
      for (let j = i + 1; j < this.enemies.length; j++) {
        separateCircles(this.enemies[i], this.enemies[j], 0.5)
      }
    }
    for (const enemy of this.enemies) {
      // Shooters cannot push through the player; Chasers explode on contact instead.
      if (enemy.kind === 'shooter') separateCircles(this.player, enemy, 0)
      this.resolveIslandAndEdges(enemy)
    }
  }

  private updateChaser(enemy: EnemyState, dt: number): void {
    const { moveSpeed, turnSpeed } = this.config.chaser
    const target = Math.atan2(this.player.y - enemy.y, this.player.x - enemy.x)
    enemy.angle = rotateTowards(enemy.angle, target, turnSpeed * dt)
    enemy.x += Math.cos(enemy.angle) * moveSpeed * dt
    enemy.y += Math.sin(enemy.angle) * moveSpeed * dt
  }

  private updateShooter(enemy: EnemyState, dt: number): void {
    const settings = this.config.shooter
    const dx = this.player.x - enemy.x
    const dy = this.player.y - enemy.y
    const distance = Math.hypot(dx, dy)
    const target = Math.atan2(dy, dx)

    enemy.angle = rotateTowards(enemy.angle, target, settings.turnSpeed * dt)

    if (distance > settings.preferredDistance) {
      enemy.x += Math.cos(enemy.angle) * settings.moveSpeed * dt
      enemy.y += Math.sin(enemy.angle) * settings.moveSpeed * dt
    }

    enemy.fireCooldown = Math.max(0, enemy.fireCooldown - dt)
    const aimed = Math.abs(angleDifference(enemy.angle, target)) <= settings.aimTolerance
    if (distance <= settings.attackRange && aimed && enemy.fireCooldown === 0) {
      const x = enemy.x + Math.cos(enemy.angle) * settings.bowOffset
      const y = enemy.y + Math.sin(enemy.angle) * settings.bowOffset
      this.spawnProjectile('enemy', x, y, enemy.angle, settings.cannon)
      this.events.push({ type: 'cannonFired', weapon: 'enemy' })
      enemy.fireCooldown = settings.cannon.cooldown
    }
  }

  /** A Chaser touching the player explodes. It hurts the player and gives no points. */
  private checkChaserContacts(): void {
    for (const enemy of this.enemies) {
      if (enemy.kind !== 'chaser' || enemy.health <= 0) continue
      const touching = circlesOverlap(
        enemy.x, enemy.y, enemy.radius,
        this.player.x, this.player.y, this.player.radius,
      )
      if (!touching) continue

      enemy.health = 0
      this.events.push({ type: 'rammed', x: enemy.x, y: enemy.y })
      this.events.push({
        type: 'shipDestroyed',
        x: enemy.x,
        y: enemy.y,
        angle: enemy.angle,
        ship: enemy.kind,
      })
      this.damagePlayer(this.config.chaser.contactDamage, enemy.x, enemy.y)
    }
  }

  private removeDestroyedEnemies(): void {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      if (this.enemies[i].health <= 0) this.enemies.splice(i, 1)
    }
  }

  // ---------- Projectiles ----------

  private spawnProjectile(
    team: Team,
    x: number,
    y: number,
    angle: number,
    weapon: WeaponConfig,
  ): void {
    this.projectiles.push({
      id: this.nextId++,
      team,
      x,
      y,
      vx: Math.cos(angle) * weapon.projectileSpeed,
      vy: Math.sin(angle) * weapon.projectileSpeed,
      radius: this.config.projectileRadius,
      damage: weapon.damage,
      timeLeft: weapon.lifetime,
    })
    this.events.push({ type: 'shot', team, x, y })
  }

  private updateProjectiles(dt: number): void {
    const { width, height } = this.config.arena

    // Walk backwards so removing items does not skip the next one.
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i]
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.timeLeft -= dt

      let remove = p.timeLeft <= 0 || p.x < 0 || p.x > width || p.y < 0 || p.y > height

      if (!remove && this.islands.some((rect) => pointInRect(p.x, p.y, rect))) {
        this.events.push({ type: 'splash', x: p.x, y: p.y })
        remove = true
      }

      if (!remove) remove = this.tryHit(p)

      // Removing right after the first hit guarantees damage is applied only once.
      if (remove) this.projectiles.splice(i, 1)
    }
  }

  /** Applies damage if the projectile touches a valid target. Returns true on hit. */
  private tryHit(p: ProjectileState): boolean {
    if (p.team === 'player') {
      for (const enemy of this.enemies) {
        if (enemy.health <= 0) continue
        if (circlesOverlap(p.x, p.y, p.radius, enemy.x, enemy.y, enemy.radius)) {
          this.damageEnemy(enemy, p.damage, p.x, p.y)
          return true
        }
      }
      return false
    }

    const player = this.player
    if (circlesOverlap(p.x, p.y, p.radius, player.x, player.y, player.radius)) {
      this.damagePlayer(p.damage, p.x, p.y)
      return true
    }
    return false
  }

  private damageEnemy(enemy: EnemyState, amount: number, x: number, y: number): void {
    enemy.health = Math.max(0, enemy.health - amount)
    this.events.push({ type: 'hit', x, y, target: 'enemy' })
    if (enemy.health === 0) {
      this.score += 1
      this.events.push({ type: 'scored' })
      this.events.push({
        type: 'shipDestroyed',
        x: enemy.x,
        y: enemy.y,
        angle: enemy.angle,
        ship: enemy.kind,
      })
    }
  }

  private damagePlayer(amount: number, x: number, y: number): void {
    this.player.health = Math.max(0, this.player.health - amount)
    this.events.push({ type: 'hit', x, y, target: 'player' })
  }

  // ---------- Shared ----------

  private resolveIslandAndEdges(ship: ShipState): void {
    for (const island of this.islands) {
      pushCircleOutOfRect(ship, island)
    }
    const { width, height } = this.config.arena
    ship.x = clamp(ship.x, ship.radius, width - ship.radius)
    ship.y = clamp(ship.y, ship.radius, height - ship.radius)
  }
}
