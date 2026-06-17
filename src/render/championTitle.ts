import { type Team } from '../model/types'
import { titleYearsFor } from '../data/worldCupTitles'

/** Returns the English ordinal suffix for a positive integer (1st, 2nd, 3rd, 4th…). */
export function ordinal(n: number): string {
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`
  switch (n % 10) {
    case 1: return `${n}st`
    case 2: return `${n}nd`
    case 3: return `${n}rd`
    default: return `${n}th`
  }
}

export interface ChampionTitleSummary {
  count: number
  isFirst: boolean
  priorYears: number[]
  html: string
}

/**
 * Builds the title-history summary for a champion.
 * count = prior real titles + this simulated win.
 * isFirst = true when the team has never won the real tournament.
 */
export function championTitleSummary(team: Team): ChampionTitleSummary {
  const priorYears = titleYearsFor(team.code)
  const count = priorYears.length + 1
  const isFirst = priorYears.length === 0

  const headline = isFirst
    ? `${team.name} wins their first title!`
    : `${team.name} wins their ${ordinal(count)} title!`

  const yearsLine = isFirst
    ? ''
    : `<span class="final-champion-prior-years">${priorYears.map(y => y < 2000 ? String(y).slice(-2) : y).join(', ')}</span>`

  const html = isFirst
    ? `<div class="final-champion-titles">${headline}</div>`
    : `<div class="final-champion-titles">${headline}<br>${yearsLine}</div>`

  return { count, isFirst, priorYears, html }
}
