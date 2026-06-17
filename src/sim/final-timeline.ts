import type { TieResult } from './bracket'
import type { Rng } from './simulate'

export interface FinalGoalEvent {
  minute: number
  side: 'home' | 'away'
  homeScore: number
  awayScore: number
}

export interface FinalTimeline {
  goals: FinalGoalEvent[]
  extraTime: boolean
  finalMinute: number
}

/**
 * Build a deterministic goal-by-goal playback script for the championship match.
 * Goals are distributed across regulation (1..90); a tiebreak scoreline extends
 * the counter into extra time (91..120).
 */
export function buildFinalTimeline(result: TieResult, rng: Rng = Math.random): FinalTimeline {
  const { homeGoals, awayGoals, decidedByTiebreak } = result
  const totalGoals = homeGoals + awayGoals
  const extraTime = decidedByTiebreak

  const minutes: number[] = []
  for (let i = 0; i < totalGoals; i++) {
    minutes.push(1 + Math.floor(rng() * 90))
  }
  minutes.sort((a, b) => a - b)

  // Assign goals to sides then Fisher-Yates shuffle so the order is random
  const sides: Array<'home' | 'away'> = []
  for (let i = 0; i < homeGoals; i++) sides.push('home')
  for (let i = 0; i < awayGoals; i++) sides.push('away')
  for (let i = sides.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const tmp = sides[i]
    sides[i] = sides[j]
    sides[j] = tmp
  }

  const goals: FinalGoalEvent[] = []
  let homeScore = 0
  let awayScore = 0
  for (let i = 0; i < totalGoals; i++) {
    const side = sides[i]
    if (side === 'home') homeScore++
    else awayScore++
    goals.push({ minute: minutes[i], side, homeScore, awayScore })
  }

  // Extra time: a random minute between 91 and 120
  const finalMinute = extraTime ? 90 + 1 + Math.floor(rng() * 30) : 90

  return { goals, extraTime, finalMinute }
}
