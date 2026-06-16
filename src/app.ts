import type { Group } from './model/types'
import { renderGroupGraph, revealResult } from './render/graph'
import { renderStandings } from './render/standings'
import { generateMatches } from './sim/schedule'
import { computeStandings } from './sim/standings'
import { type Rng, simulateGroup } from './sim/simulate'

export interface StartOptions {
  /** Delay between each match reveal, in milliseconds. */
  intervalMs?: number
  /** Randomness source, injectable for testing. */
  rng?: Rng
  /** Container to render the standings table into. */
  standingsContainer?: HTMLElement
  /** How many top teams qualify (default 2). */
  qualifierCount?: number
}

export interface SimulationController {
  play(): void
  pause(): void
  setSpeed(multiplier: number): void
  isPlaying(): boolean
}

const DEFAULT_INTERVAL_MS = 1200

/** True once every match has been revealed (drives the completion signal). */
export function isComplete(revealed: number, total: number): boolean {
  return total > 0 && revealed >= total
}

/** Map a speed multiplier (1/2/4/8) to a reveal interval in milliseconds. */
export function intervalForSpeed(multiplier: number, baseMs = DEFAULT_INTERVAL_MS): number {
  return Math.round(baseMs / multiplier)
}

/**
 * Render the group's empty graph, then reveal one random match result at a
 * time on a timer until the group is complete. Returns a controller to
 * play, pause, and change speed. Safe to call again to re-run.
 */
export function startSimulation(
  container: HTMLElement,
  group: Group,
  opts: StartOptions = {},
): SimulationController {
  const baseMs = opts.intervalMs ?? DEFAULT_INTERVAL_MS
  const standingsContainer = opts.standingsContainer
  const qualifierCount = opts.qualifierCount ?? 2

  const matches = generateMatches(group.teams)
  const results = simulateGroup(matches, opts.rng)

  renderGroupGraph(container, group, matches)

  let revealed = 0
  let speedMultiplier = 1
  let timer: ReturnType<typeof setInterval> | undefined

  function updateStandings(complete: boolean): void {
    if (!standingsContainer) return
    const partialResults = results.slice(0, revealed)
    const standings = computeStandings(group.teams, partialResults)
    renderStandings(standingsContainer, standings, qualifierCount, complete)
  }

  function startTimer(): void {
    if (timer !== undefined) clearInterval(timer)
    const intervalMs = intervalForSpeed(speedMultiplier, baseMs)
    timer = setInterval(() => {
      revealResult(container, results[revealed], revealed)
      revealed++
      const complete = isComplete(revealed, results.length)
      updateStandings(complete)
      if (complete) {
        clearInterval(timer)
        timer = undefined
        container.classList.add('complete')
      }
    }, intervalMs)
  }

  if (results.length === 0) {
    container.classList.add('complete')
    updateStandings(true)
  } else {
    updateStandings(false)
    startTimer()
  }

  return {
    play() {
      if (timer === undefined && !isComplete(revealed, results.length)) {
        startTimer()
      }
    },
    pause() {
      if (timer !== undefined) {
        clearInterval(timer)
        timer = undefined
      }
    },
    setSpeed(multiplier: number) {
      speedMultiplier = multiplier
      if (timer !== undefined) {
        startTimer()
      }
    },
    isPlaying() {
      return timer !== undefined
    },
  }
}
