import './style.css'
import { type SimulationController, startKnockout, startTournament } from './app'
import tournamentData from './data/tournament.json'
import type { Tournament } from './model/types'
import { renderChampion } from './render/bracket'
import type { QualificationResult } from './sim/qualification'

const tournament = tournamentData as Tournament

const app = document.querySelector<HTMLDivElement>('#app')
if (app) {
  const groupsHtml = tournament.groups
    .map(
      (g) => `
    <div class="group-panel">
      <h2 class="group-title">${g.name}</h2>
      <div class="sim-layout">
        <div class="graph-container" data-group="${g.name}"></div>
        <div class="standings-container"></div>
      </div>
    </div>`,
    )
    .join('')

  app.innerHTML = `
    <header class="app-header">
      <h1>2026 FIFA World Cup</h1>
      <div class="playback-controls">
        <button id="play-pause" type="button" class="btn-play" aria-label="Play">▶ Play</button>
        <label class="speed-label">
          Speed
          <select id="speed" aria-label="Playback speed">
            <option value="1">1×</option>
            <option value="2">2×</option>
            <option value="4">4×</option>
            <option value="8">8×</option>
          </select>
        </label>
      </div>
    </header>
    <nav class="tab-bar" role="tablist">
      <button class="tab-btn tab-btn--active" id="tab-groups" role="tab"
        aria-selected="true" aria-controls="panel-groups">Group Stage</button>
      <button class="tab-btn" id="tab-knockouts" role="tab"
        aria-selected="false" aria-controls="panel-knockouts" disabled>Knockouts</button>
    </nav>
    <div id="panel-groups" class="tab-panel" role="tabpanel">
      <div class="tournament-layout">
        <div class="groups-grid">${groupsHtml}</div>
        <aside id="qualification" class="qualification-aside"></aside>
      </div>
    </div>
    <div id="panel-knockouts" class="tab-panel" hidden role="tabpanel">
      <section id="knockout" class="knockout-stage"></section>
      <section id="champion-stage" class="champion-stage" hidden></section>
    </div>
  `

  const playPauseBtn = app.querySelector<HTMLButtonElement>('#play-pause')!
  const speedSelect = app.querySelector<HTMLSelectElement>('#speed')!
  const qualPanel = app.querySelector<HTMLElement>('#qualification')!
  const groupsPanel = app.querySelector<HTMLElement>('#panel-groups')!
  const knockoutsPanel = app.querySelector<HTMLElement>('#panel-knockouts')!
  const groupsTabBtn = app.querySelector<HTMLButtonElement>('#tab-groups')!
  const knockoutsTabBtn = app.querySelector<HTMLButtonElement>('#tab-knockouts')!
  const knockoutEl = app.querySelector<HTMLElement>('#knockout')!
  const championEl = app.querySelector<HTMLElement>('#champion-stage')!

  function buildGroupContainers() {
    return tournament.groups.map((group) => {
      const graphEl = app!.querySelector<HTMLElement>(`[data-group="${group.name}"]`)!
      const standingsEl = graphEl.closest('.sim-layout')!.querySelector<HTMLElement>('.standings-container')!
      return { graphEl, standingsEl, group }
    })
  }

  const currentSpeed = (): number => Number(speedSelect.value)

  let controller: SimulationController

  function setActiveTab(tab: 'groups' | 'knockouts'): void {
    const isGroups = tab === 'groups'
    groupsPanel.hidden = !isGroups
    knockoutsPanel.hidden = isGroups
    groupsTabBtn.classList.toggle('tab-btn--active', isGroups)
    knockoutsTabBtn.classList.toggle('tab-btn--active', !isGroups)
    groupsTabBtn.setAttribute('aria-selected', String(isGroups))
    knockoutsTabBtn.setAttribute('aria-selected', String(!isGroups))
  }

  function startKnockoutPhase(qualification: QualificationResult): void {
    knockoutsTabBtn.disabled = false
    setActiveTab('knockouts')
    controller = startKnockout(knockoutEl, qualification, {
      onChampion: (team) => {
        championEl.hidden = false
        renderChampion(championEl, team)
      },
    })
    controller.setSpeed(currentSpeed())
    updatePlayPauseButton()
  }

  function startGroupPhase(): void {
    controller = startTournament(buildGroupContainers(), qualPanel, {
      onComplete: startKnockoutPhase,
    })
    controller.setSpeed(currentSpeed())
    updatePlayPauseButton()
  }

  function updatePlayPauseButton(): void {
    if (controller.isPlaying()) {
      playPauseBtn.textContent = '⏸ Pause'
      playPauseBtn.classList.replace('btn-play', 'btn-pause')
      playPauseBtn.setAttribute('aria-label', 'Pause')
    } else {
      playPauseBtn.textContent = '▶ Play'
      playPauseBtn.classList.replace('btn-pause', 'btn-play')
      playPauseBtn.setAttribute('aria-label', 'Play')
    }
  }

  playPauseBtn.addEventListener('click', () => {
    if (controller.isPlaying()) {
      controller.pause()
    } else {
      controller.play()
    }
    updatePlayPauseButton()
  })

  speedSelect.addEventListener('change', () => {
    controller.setSpeed(Number(speedSelect.value))
  })

  app.querySelector('.groups-grid')!.addEventListener('click', () => {
    controller.pause()
    knockoutEl.innerHTML = ''
    championEl.hidden = true
    championEl.innerHTML = ''
    knockoutsTabBtn.disabled = true
    setActiveTab('groups')
    app!.querySelectorAll('.group-panel, .graph-container').forEach((el) => {
      el.classList.remove('complete')
    })
    startGroupPhase()
  })

  startGroupPhase()
}
