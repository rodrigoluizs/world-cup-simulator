import type { Team } from '../model/types'
import type { BracketTeam, KnockoutRound, KnockoutState, TieResult } from '../sim/bracket'

const ROUND_LABELS: Record<KnockoutRound, string> = {
  R32: 'Round of 32',
  R16: 'Round of 16',
  QF: 'Quarter-finals',
  SF: 'Semi-finals',
  '3P': 'Third place',
  F: 'Final',
}

function teamLabel(bt: BracketTeam): string {
  const flag = bt.team.flag ? `<span class="bt-flag">${bt.team.flag}</span>` : ''
  return `<span class="bt-name">${flag}<span class="bt-code">${bt.team.code}</span></span>
    <span class="bt-source">${bt.sourceLabel}</span>`
}

/** Draw the full bracket skeleton; all rounds except the first start locked (hidden). */
export function renderBracket(container: HTMLElement, bracket: KnockoutState): void {
  container.innerHTML = ''

  const wrap = document.createElement('div')
  wrap.className = 'bracket'

  for (const [roundIdx, round] of bracket.rounds.entries()) {
    const col = document.createElement('div')
    col.className = `bracket-round round-${round.round}`
    if (roundIdx > 0) col.classList.add('locked')

    const title = document.createElement('h3')
    title.className = 'bracket-round-title'
    title.textContent = ROUND_LABELS[round.round]
    col.append(title)

    round.ties.forEach((tie, index) => {
      const tieEl = document.createElement('div')
      tieEl.className = 'bracket-tie pending'
      tieEl.id = `tie-${round.round}-${index}`
      tieEl.innerHTML = `
        <div class="bt-team bt-home">${teamLabel(tie.home)}<span class="bt-score"></span></div>
        <div class="bt-team bt-away">${teamLabel(tie.away)}<span class="bt-score"></span></div>`
      col.append(tieEl)
    })

    wrap.append(col)
  }

  container.append(wrap)
}

/** Fill one tie's result into the bracket and highlight the winner. */
export function revealTie(
  container: HTMLElement,
  result: TieResult,
  round: KnockoutRound,
  index: number,
): void {
  const tieEl = container.querySelector(`#tie-${round}-${index}`)
  if (!tieEl) return

  tieEl.classList.remove('pending')
  tieEl.classList.add('revealed')
  if (result.decidedByTiebreak) tieEl.classList.add('tiebreak')

  const homeEl = tieEl.querySelector('.bt-home')
  const awayEl = tieEl.querySelector('.bt-away')
  homeEl?.querySelector('.bt-score')?.replaceChildren(document.createTextNode(String(result.homeGoals)))
  awayEl?.querySelector('.bt-score')?.replaceChildren(document.createTextNode(String(result.awayGoals)))

  const homeWon = result.winner === result.tie.home
  homeEl?.classList.toggle('winner', homeWon)
  awayEl?.classList.toggle('winner', !homeWon)
}

/** Remove the locked state from a round column, making it visible. */
export function revealRound(container: HTMLElement, round: KnockoutRound): void {
  container.querySelector<HTMLElement>(`.round-${round}`)?.classList.remove('locked')
}

/** Render the large, dominant champion finale. */
export function renderChampion(container: HTMLElement, team: Team): void {
  const flag = team.flag ? `<div class="champion-flag">${team.flag}</div>` : ''
  container.innerHTML = `
    <div class="champion">
      <div class="champion-label">World Champions</div>
      ${flag}
      <div class="champion-name">${team.name}</div>
    </div>`
}
