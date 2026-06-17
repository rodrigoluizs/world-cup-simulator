import type { Group, Standing, Team, Tournament } from './model/types'
import {
  renderChampion,
  renderFinalStage,
  renderSingleRound,
  revealFinalGoal,
  revealTie,
  tickFinalMinute,
} from './render/bracket'
import { renderGroupGraph, revealResult } from './render/graph'
import { renderQualification } from './render/qualification'
import { renderStandings } from './render/standings'
import { createKnockout, type KnockoutRound } from './sim/bracket'
import { buildFinalTimeline, type FinalTimeline } from './sim/final-timeline'
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
  /** Called once the champion is crowned (after the finale animation). */
  onChampion?: (team: Team) => void
  /** Called whenever the active round advances to a new stage. */
  onRoundChange?: (round: KnockoutRound) => void
  /** Returns the container element for a given knockout round (all non-Final rounds). */
  containerForRound?: (round: KnockoutRound) => HTMLElement
  /** Where the goal-by-goal Final plays; if omitted the champion fires immediately. */
  finalContainer?: HTMLElement
}

/**
 * Render the seeded knockout bracket into per-round containers, then reveal
 * one tie at a time on a timer until the Final. The Final plays goal-by-goal
 * in finalContainer before crowning the champion. Returns a controller to
 * play, pause, and change speed.
 */
export function startKnockout(
  qualification: QualificationResult,
  opts: KnockoutOptions = {},
): SimulationController {
  const baseMs = opts.intervalMs ?? DEFAULT_INTERVAL_MS
  const knockout = createKnockout(qualification, opts.rng)

  // Render each non-Final round into its own container
  for (const roundView of knockout.rounds) {
    if (roundView.round !== 'F') {
      const container = opts.containerForRound?.(roundView.round)
      if (container) renderSingleRound(container, roundView)
    } else if (opts.finalContainer && roundView.ties[0]) {
      renderFinalStage(opts.finalContainer, roundView.ties[0].home, roundView.ties[0].away)
    }
  }

  let speedMultiplier = 1
  let timer: ReturnType<typeof setInterval> | undefined
  let lastRound: KnockoutRound | null = null
  let finaleTimeline: FinalTimeline | null = null
  let finaleMinute = 0
  let finaleGoalIndex = 0

  function startFinaleTimer(): void {
    if (timer !== undefined) clearInterval(timer)
    if (!finaleTimeline || !opts.finalContainer) return
    const ft = finaleTimeline
    const fc = opts.finalContainer
    const tickMs = Math.max(16, Math.round(4500 / (ft.finalMinute + 1) / speedMultiplier))
    timer = setInterval(() => {
      tickFinalMinute(fc, finaleMinute)
      while (
        finaleGoalIndex < ft.goals.length &&
        ft.goals[finaleGoalIndex].minute <= finaleMinute
      ) {
        revealFinalGoal(fc, ft.goals[finaleGoalIndex])
        finaleGoalIndex++
      }
      finaleMinute++
      if (finaleMinute > ft.finalMinute) {
        clearInterval(timer)
        timer = undefined
        finaleTimeline = null
        const champ = knockout.champion()
        if (champ) {
          renderChampion(fc, champ)
          opts.onChampion?.(champ)
        }
      }
    }, tickMs)
  }

  function startTimer(): void {
    if (timer !== undefined) clearInterval(timer)
    if (finaleTimeline !== null) {
      startFinaleTimer()
    } else {
      timer = setInterval(step, intervalForSpeed(speedMultiplier, baseMs))
    }
  }

  function step(): void {
    const reveal = knockout.revealNextTie()
    if (!reveal) return

    if (reveal.round !== lastRound) {
      lastRound = reveal.round
      opts.onRoundChange?.(reveal.round)
    }

    if (reveal.round === 'F') {
      clearInterval(timer)
      timer = undefined
      if (opts.finalContainer) {
        finaleTimeline = buildFinalTimeline(reveal.result, opts.rng)
        finaleMinute = 0
        finaleGoalIndex = 0
        startFinaleTimer()
      } else {
        const champ = knockout.champion()
        if (champ) opts.onChampion?.(champ)
      }
      return
    }

    const container = opts.containerForRound?.(reveal.round)
    if (container) revealTie(container, reveal.result, reveal.round, reveal.index)
  }

  if (!knockout.isComplete()) startTimer()

  return {
    play() {
      const pending = !knockout.isComplete() || finaleTimeline !== null
      if (timer === undefined && pending) startTimer()
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
