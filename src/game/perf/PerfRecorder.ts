/** One summary of how the game performed while recording. */
export interface PerfReport {
  durationSeconds: number
  frames: number
  averageFps: number
  /** Frame time (ms) that 95% of frames stay under. */
  p95FrameMs: number
  p99FrameMs: number
  maxFrameMs: number
  /** Frames slower than 33 ms (below 30 FPS). */
  slowFrames: number
  /** Lowest average FPS over any one-second window. */
  worstSecondFps: number
  entities: { average: number; max: number }
  /** Entity count once per second (enemies + projectiles + effects). */
  entityTimeline: number[]
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)
  return sorted[Math.max(0, index)]
}

const round = (value: number) => Math.round(value * 100) / 100

/**
 * Records frame times and entity counts. Enabled with ?perf in the URL.
 * Plain arrays of numbers: a 3-minute battle is about 11,000 frames.
 */
export class PerfRecorder {
  private frameMs: number[] = []
  private entityCounts: number[] = []
  private timeline: number[] = []
  private sinceSample = 0

  record(frameMs: number, entities: number): void {
    this.frameMs.push(frameMs)
    this.entityCounts.push(entities)
    this.sinceSample += frameMs
    if (this.sinceSample >= 1000) {
      this.sinceSample -= 1000
      this.timeline.push(entities)
    }
  }

  reset(): void {
    this.frameMs = []
    this.entityCounts = []
    this.timeline = []
    this.sinceSample = 0
  }

  report(): PerfReport {
    const totalMs = this.frameMs.reduce((sum, ms) => sum + ms, 0)
    const sorted = [...this.frameMs].sort((a, b) => a - b)

    // Worst one-second window.
    let worstSecondFps = Infinity
    let windowMs = 0
    let windowFrames = 0
    for (const ms of this.frameMs) {
      windowMs += ms
      windowFrames += 1
      if (windowMs >= 1000) {
        worstSecondFps = Math.min(worstSecondFps, (windowFrames * 1000) / windowMs)
        windowMs = 0
        windowFrames = 0
      }
    }

    const entityTotal = this.entityCounts.reduce((sum, n) => sum + n, 0)
    return {
      durationSeconds: round(totalMs / 1000),
      frames: this.frameMs.length,
      averageFps: totalMs > 0 ? round((this.frameMs.length * 1000) / totalMs) : 0,
      p95FrameMs: round(percentile(sorted, 95)),
      p99FrameMs: round(percentile(sorted, 99)),
      maxFrameMs: round(sorted[sorted.length - 1] ?? 0),
      slowFrames: this.frameMs.filter((ms) => ms > 33.4).length,
      worstSecondFps: Number.isFinite(worstSecondFps) ? round(worstSecondFps) : 0,
      entities: {
        average: this.entityCounts.length ? round(entityTotal / this.entityCounts.length) : 0,
        max: Math.max(0, ...this.entityCounts),
      },
      entityTimeline: this.timeline,
    }
  }
}
