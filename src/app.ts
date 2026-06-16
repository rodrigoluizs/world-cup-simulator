import type { Group } from './model/types'
import { renderGroupGraph, revealResult } from './render/graph'
import { generateMatches } from './sim/schedule'
import { type Rng, simulateGroup } from './sim/simulate'

export interface StartOptions {
  /** Delay between each match reveal, in milliseconds. */
  intervalMs?: number
  /** Randomness source, injectable for testing. */
  rng?: Rng
}

const DEFAULT_INTERVAL_MS = 1200

/** Track the active reveal timer per container so re-runs cancel the old one. */
const activeTimers = new WeakMap<HTMLElement, ReturnType<typeof setInterval>>()

/** True once every match has been revealed (drives the completion signal). */
export function isComplete(revealed: number, total: number): boolean {
  return total > 0 && revealed >= total
}

/**
 * Render the group's empty graph, then reveal one random match result at a
 * time on a timer until the group is complete. Safe to call again to re-run.
 */
export function startSimulation(container: HTMLElement, group: Group, opts: StartOptions = {}): void {
  const intervalMs = opts.intervalMs ?? DEFAULT_INTERVAL_MS

  const previous = activeTimers.get(container)
  if (previous !== undefined) {
    clearInterval(previous)
    activeTimers.delete(container)
  }

  const matches = generateMatches(group.teams)
  const results = simulateGroup(matches, opts.rng)

  renderGroupGraph(container, group, matches)

  if (results.length === 0) {
    container.classList.add('complete')
    return
  }

  let revealed = 0
  const timer = setInterval(() => {
    revealResult(container, results[revealed], revealed)
    revealed++
    if (isComplete(revealed, results.length)) {
      clearInterval(timer)
      activeTimers.delete(container)
      container.classList.add('complete')
    }
  }, intervalMs)
  activeTimers.set(container, timer)
}
