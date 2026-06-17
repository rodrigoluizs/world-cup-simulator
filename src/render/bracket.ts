import type { Team } from '../model/types'
import type { BracketRoundView, BracketTeam, KnockoutRound, KnockoutState, TieResult } from '../sim/bracket'
import type { FinalGoalEvent } from '../sim/final-timeline'

export const ROUND_LABELS: Record<KnockoutRound, string> = {
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

/** Render one round's ties into a container (no locked state — each tab shows its round). */
export function renderSingleRound(container: HTMLElement, roundView: BracketRoundView): void {
  container.innerHTML = ''
  roundView.ties.forEach((tie, index) => {
    const tieEl = document.createElement('div')
    tieEl.className = 'bracket-tie pending'
    tieEl.id = `tie-${roundView.round}-${index}`
    tieEl.innerHTML = `
      <div class="bt-team bt-home">${teamLabel(tie.home)}<span class="bt-score"></span></div>
      <div class="bt-team bt-away">${teamLabel(tie.away)}<span class="bt-score"></span></div>`
    container.append(tieEl)
  })
}

/** Build the live final scoreboard and minute counter skeleton (scores start at 0). */
export function renderFinalStage(container: HTMLElement, home: BracketTeam, away: BracketTeam): void {
  const homeFlag = home.team.flag ? `<div class="fs-flag">${home.team.flag}</div>` : ''
  const awayFlag = away.team.flag ? `<div class="fs-flag">${away.team.flag}</div>` : ''
  container.innerHTML = `
    <div class="final-stage">
      <div class="final-minute"><span class="final-minute-value">0</span>'</div>
      <div class="final-scoreboard">
        <div class="fs-team fs-home">
          ${homeFlag}
          <div class="fs-name">${home.team.name}</div>
        </div>
        <div class="fs-score">
          <span class="fs-score-home">0</span>
          <span class="fs-score-sep">–</span>
          <span class="fs-score-away">0</span>
        </div>
        <div class="fs-team fs-away">
          ${awayFlag}
          <div class="fs-name">${away.team.name}</div>
        </div>
      </div>
      <div class="final-et-badge" hidden>Extra Time</div>
      <div class="final-goals-feed"></div>
    </div>`
}

/** Advance the visible minute counter; shows ET badge when minute exceeds 90. */
export function tickFinalMinute(container: HTMLElement, minute: number): void {
  const el = container.querySelector<HTMLElement>('.final-minute-value')
  if (el) el.textContent = String(minute)
  if (minute > 90) {
    container.querySelector<HTMLElement>('.final-et-badge')?.removeAttribute('hidden')
  }
}

/**
 * Crown the champion inside the live final stage, keeping the scoreboard (both
 * flags + final score) and the goal-by-minute feed on screen.
 */
export function revealFinalChampion(container: HTMLElement, team: Team): void {
  const stage = container.querySelector<HTMLElement>('.final-stage')
  if (!stage || stage.querySelector('.final-champion')) return

  const flag = team.flag ? `<span class="final-champion-flag">${team.flag}</span>` : ''
  const banner = document.createElement('div')
  banner.className = 'final-champion'
  banner.innerHTML = `
    <div class="final-champion-label">World Champions</div>
    <div class="final-champion-name">${flag}<span>${team.name}</span></div>`
  stage.prepend(banner)

  // Mark the running clock as full-time now that the match is over.
  stage.querySelector<HTMLElement>('.final-minute')?.classList.add('full-time')
}

/** Flash a goal notification and update the live scoreline. */
export function revealFinalGoal(container: HTMLElement, goal: FinalGoalEvent): void {
  const homeEl = container.querySelector<HTMLElement>('.fs-score-home')
  const awayEl = container.querySelector<HTMLElement>('.fs-score-away')
  if (homeEl) homeEl.textContent = String(goal.homeScore)
  if (awayEl) awayEl.textContent = String(goal.awayScore)

  const feed = container.querySelector<HTMLElement>('.final-goals-feed')
  if (feed) {
    const item = document.createElement('div')
    item.className = `final-goal-event final-goal-${goal.side}`
    item.textContent = `⚽ ${goal.minute}' — ${goal.side === 'home' ? goal.homeScore : goal.awayScore}-${goal.side === 'home' ? goal.awayScore : goal.homeScore}`
    feed.prepend(item)
  }
}
