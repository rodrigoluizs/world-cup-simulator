import type { QualificationResult, QualifiedTeam } from '../sim/qualification'

function teamRow(qt: QualifiedTeam): string {
  const flag = qt.team.flag ? `<span class="team-flag">${qt.team.flag}</span>` : ''
  return `<tr>
    <td class="col-team">${flag}<span class="team-code">${qt.team.code}</span></td>
    <td class="col-group">${qt.group}</td>
  </tr>`
}

function section(title: string, teams: QualifiedTeam[]): string {
  if (teams.length === 0) return ''
  return `
    <div class="qual-section">
      <h3 class="qual-section-title">${title} <span class="qual-count">(${teams.length})</span></h3>
      <table class="qualification-table">
        <thead><tr><th class="col-team">Team</th><th class="col-group">Group</th></tr></thead>
        <tbody>${teams.map(teamRow).join('')}</tbody>
      </table>
    </div>`
}

/** Render the aggregate qualification panel into `container`. */
export function renderQualification(
  container: HTMLElement,
  result: QualificationResult,
  complete: boolean,
): void {
  const status = complete ? 'Group stage complete' : 'Qualifying in progress…'
  container.innerHTML = `
    <div class="qualification-panel">
      <h2 class="qual-title">Round of 32 Qualifiers</h2>
      <p class="qual-status">${status}</p>
      ${section('Group Winners', result.winners)}
      ${section('Runners-up', result.runnersUp)}
      ${section('Best Third-placed', result.bestThirds)}
    </div>`
}
