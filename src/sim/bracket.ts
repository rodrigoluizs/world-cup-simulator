import type { Team } from '../model/types'
import { groupLetter, type QualificationResult } from './qualification'
import { type Rng, simulateMatch } from './simulate'
import { placeThirds } from './thirds-placement'

/** The rounds of the knockout stage, in the order they are played/revealed. */
export type KnockoutRound = 'R32' | 'R16' | 'QF' | 'SF' | '3P' | 'F'

/** A team in the bracket, tagged with where it came from (for display). */
export interface BracketTeam {
  team: Team
  /** e.g. "Winner A", "Runner-up C", "3rd E". */
  sourceLabel: string
}

/** A single knockout tie between two bracket teams. */
export interface Tie {
  home: BracketTeam
  away: BracketTeam
}

/** The outcome of a tie — always has exactly one winner (no draws survive). */
export interface TieResult {
  tie: Tie
  homeGoals: number
  awayGoals: number
  winner: BracketTeam
  loser: BracketTeam
  /** True when a level scoreline was broken by extra time / penalties. */
  decidedByTiebreak: boolean
}

/** One revealed tie, tagged with its round and position within that round. */
export interface RevealedTie {
  round: KnockoutRound
  index: number
  result: TieResult
}

/** A round of the bracket: its ties and their (precomputed) results. */
export interface BracketRoundView {
  round: KnockoutRound
  ties: Tie[]
  results: TieResult[]
}

/** A fully-computed knockout stage, revealed one tie at a time. */
export interface KnockoutState {
  rounds: BracketRoundView[]
  totalTies: number
  /** Reveal the next tie in order; null once every tie is revealed. */
  revealNextTie(): RevealedTie | null
  isComplete(): boolean
  /** The tournament winner, available only once the final is revealed. */
  champion(): Team | null
  /** The round the most recently revealed (or next) tie belongs to. */
  currentRound(): KnockoutRound
}

/** A slot in the Round-of-32 skeleton, resolved against the qualified teams. */
type SlotSpec =
  | { kind: 'winner'; letter: string }
  | { kind: 'runnerUp'; letter: string }
  | { kind: 'third'; slot: number }

const W = (letter: string): SlotSpec => ({ kind: 'winner', letter })
const R = (letter: string): SlotSpec => ({ kind: 'runnerUp', letter })
const T = (slot: number): SlotSpec => ({ kind: 'third', slot })

/**
 * The 16 Round-of-32 ties, in bracket order so that adjacent pairs feed the
 * same Round-of-16 tie. Every group winner and runner-up appears exactly once,
 * and the eight third-place slots (0..7) are each used once.
 */
const R32_SKELETON: ReadonlyArray<readonly [SlotSpec, SlotSpec]> = [
  [W('A'), T(0)],
  [W('B'), R('C')],
  [W('D'), T(1)],
  [W('E'), R('F')],
  [W('G'), T(2)],
  [W('H'), R('I')],
  [W('J'), T(3)],
  [W('K'), R('L')],
  [W('C'), T(4)],
  [R('A'), R('B')],
  [W('F'), T(5)],
  [R('D'), R('E')],
  [W('I'), T(6)],
  [R('G'), R('H')],
  [W('L'), T(7)],
  [R('J'), R('K')],
]

/**
 * Build the 16 Round-of-32 ties from a finished group stage: group winners and
 * runners-up take their fixed slots, and the eight best thirds are placed via
 * the allocation in `thirds-placement`.
 */
export function seedBracket(qualification: QualificationResult): Tie[] {
  const winnerByLetter = new Map(
    qualification.winners.map((q) => [groupLetter(q.group), q.team]),
  )
  const runnerUpByLetter = new Map(
    qualification.runnersUp.map((q) => [groupLetter(q.group), q.team]),
  )
  const thirdByLetter = new Map(
    qualification.bestThirds.map((q) => [groupLetter(q.group), q.team]),
  )
  const placement = placeThirds(qualification.bestThirds.map((q) => groupLetter(q.group)))

  const resolve = (spec: SlotSpec): BracketTeam => {
    switch (spec.kind) {
      case 'winner': {
        const team = winnerByLetter.get(spec.letter)
        if (!team) throw new Error(`No winner for group ${spec.letter}`)
        return { team, sourceLabel: `Winner ${spec.letter}` }
      }
      case 'runnerUp': {
        const team = runnerUpByLetter.get(spec.letter)
        if (!team) throw new Error(`No runner-up for group ${spec.letter}`)
        return { team, sourceLabel: `Runner-up ${spec.letter}` }
      }
      case 'third': {
        const letter = placement[String(spec.slot)]
        const team = letter ? thirdByLetter.get(letter) : undefined
        if (!team) throw new Error(`No third for slot ${spec.slot}`)
        return { team, sourceLabel: `3rd ${letter}` }
      }
    }
  }

  return R32_SKELETON.map(([home, away]) => ({ home: resolve(home), away: resolve(away) }))
}

/**
 * Resolve one tie to a single winner. Reuses the group match scoring model; a
 * level scoreline is broken by an extra-time / penalties coin flip so there is
 * always exactly one winner.
 */
export function resolveTie(tie: Tie, rng: Rng = Math.random): TieResult {
  const { homeGoals, awayGoals } = simulateMatch({ home: tie.home.team, away: tie.away.team }, rng)

  let homeWins: boolean
  let decidedByTiebreak: boolean
  if (homeGoals !== awayGoals) {
    homeWins = homeGoals > awayGoals
    decidedByTiebreak = false
  } else {
    homeWins = rng() < 0.5
    decidedByTiebreak = true
  }

  return {
    tie,
    homeGoals,
    awayGoals,
    winner: homeWins ? tie.home : tie.away,
    loser: homeWins ? tie.away : tie.home,
    decidedByTiebreak,
  }
}

/** Pair this round's winners into the next round's ties, preserving order. */
export function advanceRound(results: TieResult[]): Tie[] {
  const ties: Tie[] = []
  for (let i = 0; i + 1 < results.length; i += 2) {
    ties.push({ home: results[i].winner, away: results[i + 1].winner })
  }
  return ties
}

/** The complete knockout round sequence in play order. */
export const ROUND_ORDER: ReadonlyArray<KnockoutRound> = ['R32', 'R16', 'QF', 'SF', '3P', 'F']

/** The round that follows `round`, or null if `round` is the final. */
export function nextRound(round: KnockoutRound): KnockoutRound | null {
  const idx = ROUND_ORDER.indexOf(round)
  return idx >= 0 && idx < ROUND_ORDER.length - 1 ? ROUND_ORDER[idx + 1] : null
}

/** True when `index` is the last tie in `round` according to the bracket state. */
export function isLastTieOfRound(
  bracket: KnockoutState,
  round: KnockoutRound,
  index: number,
): boolean {
  const roundView = bracket.rounds.find((r) => r.round === round)
  return roundView !== undefined && index === roundView.ties.length - 1
}

/**
 * Precompute the entire knockout stage from a finished group stage and return a
 * controller that reveals ties one at a time, in playing order: Round of 32,
 * Round of 16, Quarter-finals, Semi-finals, the third-place playoff, and the
 * final. The champion is only available once the final tie is revealed.
 */
export function createKnockout(
  qualification: QualificationResult,
  rng: Rng = Math.random,
): KnockoutState {
  const playRound = (ties: Tie[]): TieResult[] => ties.map((tie) => resolveTie(tie, rng))

  const r32Ties = seedBracket(qualification)
  const r32 = playRound(r32Ties)
  const r16Ties = advanceRound(r32)
  const r16 = playRound(r16Ties)
  const qfTies = advanceRound(r16)
  const qf = playRound(qfTies)
  const sfTies = advanceRound(qf)
  const sf = playRound(sfTies)

  const thirdPlaceTie: Tie = { home: sf[0].loser, away: sf[1].loser }
  const finalTie: Tie = { home: sf[0].winner, away: sf[1].winner }
  const thirdPlace = resolveTie(thirdPlaceTie, rng)
  const final = resolveTie(finalTie, rng)

  const rounds: BracketRoundView[] = [
    { round: 'R32', ties: r32Ties, results: r32 },
    { round: 'R16', ties: r16Ties, results: r16 },
    { round: 'QF', ties: qfTies, results: qf },
    { round: 'SF', ties: sfTies, results: sf },
    { round: '3P', ties: [thirdPlaceTie], results: [thirdPlace] },
    { round: 'F', ties: [finalTie], results: [final] },
  ]

  const flat: RevealedTie[] = []
  for (const r of rounds) {
    r.results.forEach((result, index) => flat.push({ round: r.round, index, result }))
  }

  let revealed = 0

  return {
    rounds,
    totalTies: flat.length,
    revealNextTie() {
      if (revealed >= flat.length) return null
      return flat[revealed++]
    },
    isComplete() {
      return revealed >= flat.length
    },
    champion() {
      return revealed >= flat.length ? final.winner.team : null
    },
    currentRound() {
      const i = Math.min(revealed, flat.length - 1)
      return flat[i].round
    },
  }
}
