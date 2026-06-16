import type { Standing } from '../model/types'

/** Render the classic group standings table into `container`. */
export function renderStandings(
  container: HTMLElement,
  standings: Standing[],
  qualifierCount: number,
  complete: boolean,
): void {
  container.innerHTML = `
    <table class="standings">
      <thead>
        <tr>
          <th class="col-team">Team</th>
          <th title="Played">P</th>
          <th title="Won">W</th>
          <th title="Drawn">D</th>
          <th title="Lost">L</th>
          <th title="Goals For">GF</th>
          <th title="Goals Against">GA</th>
          <th title="Goal Difference">GD</th>
          <th title="Points">Pts</th>
        </tr>
      </thead>
      <tbody>
        ${standings
          .map((s, i) => {
            const flag = s.team.flag ? `<span class="team-flag">${s.team.flag}</span>` : ''
            const qualified = complete && i < qualifierCount ? ' qualified' : ''
            const gd = s.goalDiff > 0 ? `+${s.goalDiff}` : `${s.goalDiff}`
            return `<tr class="standing-row${qualified}">
              <td class="col-team">${flag}<span class="team-code">${s.team.code}</span></td>
              <td>${s.played}</td>
              <td>${s.won}</td>
              <td>${s.drawn}</td>
              <td>${s.lost}</td>
              <td>${s.goalsFor}</td>
              <td>${s.goalsAgainst}</td>
              <td>${gd}</td>
              <td class="col-pts">${s.points}</td>
            </tr>`
          })
          .join('')}
      </tbody>
    </table>
  `
}
