import type { Group, Match, MatchResult } from '../model/types'

/**
 * Render the group's matches as a clean card list. Each card has an id
 * `match-<index>` so revealResult can locate it by index.
 */
export function renderGroupGraph(container: HTMLElement, _group: Group, matches: Match[]): void {
  container.innerHTML = ''
  container.classList.remove('complete')

  const list = document.createElement('ul')
  list.className = 'match-list'

  matches.forEach((match, i) => {
    const li = document.createElement('li')
    li.className = 'match-card'
    li.id = `match-${i}`

    const homeFlag = match.home.flag ? `<span class="mc-flag">${match.home.flag}</span>` : ''
    const awayFlag = match.away.flag ? `<span class="mc-flag">${match.away.flag}</span>` : ''

    li.innerHTML = `
      <div class="mc-team mc-home">
        ${homeFlag}<span class="mc-code">${match.home.code}</span>
      </div>
      <div class="mc-score pending">
        <span class="mc-score-home"></span>
        <span class="mc-score-sep">vs</span>
        <span class="mc-score-away"></span>
      </div>
      <div class="mc-team mc-away">
        <span class="mc-code">${match.away.code}</span>${awayFlag}
      </div>`

    list.append(li)
  })

  container.append(list)
}

/** Fill the result slot for the match at `index` with its scoreline. */
export function revealResult(container: HTMLElement, result: MatchResult, index: number): void {
  const card = container.querySelector<HTMLElement>(`#match-${index}`)
  if (!card) return

  const scoreEl = card.querySelector<HTMLElement>('.mc-score')
  const sepEl = card.querySelector<HTMLElement>('.mc-score-sep')
  const homeScoreEl = card.querySelector<HTMLElement>('.mc-score-home')
  const awayScoreEl = card.querySelector<HTMLElement>('.mc-score-away')

  if (homeScoreEl) homeScoreEl.textContent = String(result.homeGoals)
  if (awayScoreEl) awayScoreEl.textContent = String(result.awayGoals)
  if (sepEl) sepEl.textContent = '–'

  if (scoreEl) {
    scoreEl.classList.remove('pending')
    if (result.homeGoals > result.awayGoals) {
      scoreEl.classList.add('revealed')
      card.classList.add('home-wins')
    } else if (result.awayGoals > result.homeGoals) {
      scoreEl.classList.add('revealed')
      card.classList.add('away-wins')
    } else {
      scoreEl.classList.add('draw')
    }
  }
}
