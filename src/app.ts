import type { Group, Standing, Team, Tournament } from './model/types'
import { renderBracket, revealRound, revealTie } from './render/bracket'
import { renderGroupGraph, revealResult } from './render/graph'
import { renderQualification } from './render/qualification'
import { renderStandings } from './render/standings'
import { createKnockout, isLastTieOfRound, nextRound } from './sim/bracket'
import { generateMatches } from './sim/schedule'
import { type GroupEntry, type QualificationResult, computeQualification } from './sim/qualification'
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
  /** Called once every group has finished, with the final qualification. */
  onComplete?: (qualification: QualificationResult) => void
}

export interface SimulationController {
  play(): void
  pause(): void
  setSpeed(multiplier: number): void
  isPlaying(): boolean
}

interface GroupSimOptions {
  rng?: Rng
  standingsContainer?: HTMLElement
  qualifierCount?: number
  onTick?: (standings: Standing[], complete: boolean) => void
}

interface GroupSimulation {
  revealNext(): void
  isComplete(): boolean
  standings(): Standing[]
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

function createGroupSimulation(
  container: HTMLElement,
  group: Group,
  opts: GroupSimOptions,
): GroupSimulation {
  const qualifierCount = opts.qualifierCount ?? 2
  const matches = generateMatches(group.teams)
  const results = simulateGroup(matches, opts.rng)

  renderGroupGraph(container, group, matches)

  let revealed = 0
  let currentStandings = computeStandings(group.teams, [])
  const panel = container.closest('.group-panel')

  function markComplete(): void {
    container.classList.add('complete')
    panel?.classList.add('complete')
  }

  function refresh(complete: boolean): void {
    currentStandings = computeStandings(group.teams, results.slice(0, revealed))
    if (opts.standingsContainer) {
      renderStandings(opts.standingsContainer, currentStandings, qualifierCount, complete)
    }
    opts.onTick?.(currentStandings, complete)
  }

  if (results.length === 0) {
    markComplete()
    refresh(true)
  } else {
    refresh(false)
  }

  return {
    revealNext() {
      if (revealed >= results.length) return
      revealResult(container, results[revealed], revealed)
      revealed++
      const complete = isComplete(revealed, results.length)
      refresh(complete)
      if (complete) markComplete()
    },
    isComplete() {
      return isComplete(revealed, results.length)
    },
    standings() {
      return currentStandings
    },
  }
}

function makeSharedClock(
  sims: GroupSimulation[],
  baseMs: number,
  qualPanel?: HTMLElement,
  entries?: { group: Group }[],
  onAllComplete?: (qualification: QualificationResult) => void,
): SimulationController {
  let speedMultiplier = 1
  let timer: ReturnType<typeof setInterval> | undefined

  function allDone(): boolean {
    return sims.every((s) => s.isComplete())
  }

  function buildQualification(): QualificationResult {
    const grouped: GroupEntry[] = (entries ?? []).map((e, i) => ({
      group: e.group,
      standings: sims[i].standings(),
    }))
    return computeQualification(grouped)
  }

  function refreshQual(complete: boolean): void {
    if (!qualPanel || !entries) return
    renderQualification(qualPanel, buildQualification(), complete)
  }

  function startTimer(): void {
    if (timer !== undefined) clearInterval(timer)
    const intervalMs = intervalForSpeed(speedMultiplier, baseMs)
    timer = setInterval(() => {
      for (const sim of sims) {
        if (!sim.isComplete()) sim.revealNext()
      }
      const done = allDone()
      refreshQual(done)
      if (done) {
        clearInterval(timer)
        timer = undefined
        onAllComplete?.(buildQualification())
      }
    }, intervalMs)
  }

  refreshQual(false)
  if (!allDone()) startTimer()

  return {
    play() {
      if (timer === undefined && !allDone()) startTimer()
    },
    pause() {
      if (timer !== undefined) {
        clearInterval(timer)
        timer = undefined
      }
    },
    setSpeed(multiplier: number) {
      speedMultiplier = multiplier
      if (timer !== undefined) startTimer()
    },
    isPlaying() {
      return timer !== undefined
    },
  }
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
  const sim = createGroupSimulation(container, group, {
    rng: opts.rng,
    standingsContainer: opts.standingsContainer,
    qualifierCount: opts.qualifierCount ?? 2,
  })
  return makeSharedClock([sim], baseMs)
}

/**
 * Render all groups in a tournament and reveal matches across all groups on
 * a single shared clock. Returns one controller for play/pause/speed.
 */
export function startTournament(
  groupContainers: { graphEl: HTMLElement; standingsEl: HTMLElement; group: Group }[],
  qualPanel: HTMLElement,
  opts: StartOptions = {},
): SimulationController {
  const baseMs = opts.intervalMs ?? DEFAULT_INTERVAL_MS
  const sims = groupContainers.map(({ graphEl, standingsEl, group }) =>
    createGroupSimulation(graphEl, group, {
      rng: opts.rng,
      standingsContainer: standingsEl,
      qualifierCount: opts.qualifierCount ?? 2,
    }),
  )
  return makeSharedClock(
    sims,
    baseMs,
    qualPanel,
    groupContainers.map(({ group }) => ({ group })),
    opts.onComplete,
  )
}

export interface KnockoutOptions {
  /** Delay between each tie reveal, in milliseconds. */
  intervalMs?: number
  /** Randomness source, injectable for testing. */
  rng?: Rng
  /** Called once the final is revealed, with the tournament winner. */
  onChampion?: (team: Team) => void
}

/**
 * Render the seeded knockout bracket, then reveal one tie at a time on a timer
 * until a champion is crowned. Returns a controller to play, pause, and change
 * speed, mirroring the group-stage clock.
 */
export function startKnockout(
  container: HTMLElement,
  qualification: QualificationResult,
  opts: KnockoutOptions = {},
): SimulationController {
  const baseMs = opts.intervalMs ?? DEFAULT_INTERVAL_MS
  const knockout = createKnockout(qualification, opts.rng)
  renderBracket(container, knockout)

  let speedMultiplier = 1
  let timer: ReturnType<typeof setInterval> | undefined

  function step(): void {
    const reveal = knockout.revealNextTie()
    if (reveal) {
      revealTie(container, reveal.result, reveal.round, reveal.index)
      if (isLastTieOfRound(knockout, reveal.round, reveal.index)) {
        const next = nextRound(reveal.round)
        if (next) revealRound(container, next)
      }
    }
    if (knockout.isComplete()) {
      if (timer !== undefined) {
        clearInterval(timer)
        timer = undefined
      }
      const champ = knockout.champion()
      if (champ) opts.onChampion?.(champ)
    }
  }

  function startTimer(): void {
    if (timer !== undefined) clearInterval(timer)
    timer = setInterval(step, intervalForSpeed(speedMultiplier, baseMs))
  }

  if (!knockout.isComplete()) startTimer()

  return {
    play() {
      if (timer === undefined && !knockout.isComplete()) startTimer()
    },
    pause() {
      if (timer !== undefined) {
        clearInterval(timer)
        timer = undefined
      }
    },
    setSpeed(multiplier: number) {
      speedMultiplier = multiplier
      if (timer !== undefined) startTimer()
    },
    isPlaying() {
      return timer !== undefined
    },
  }
}
