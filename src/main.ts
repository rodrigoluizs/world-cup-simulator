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
    <div class="tournament-layout">
      <div class="groups-grid">${groupsHtml}</div>
      <aside id="qualification" class="qualification-aside"></aside>
    </div>
    <section id="knockout" class="knockout-stage" hidden></section>
    <section id="champion-stage" class="champion-stage" hidden></section>
  `

  const playPauseBtn = app.querySelector<HTMLButtonElement>('#play-pause')!
  const speedSelect = app.querySelector<HTMLSelectElement>('#speed')!
  const qualPanel = app.querySelector<HTMLElement>('#qualification')!
  const tournamentLayout = app.querySelector<HTMLElement>('.tournament-layout')!
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

  // When the group phase ends, clear the groups screen and play out the bracket.
  function startKnockoutPhase(qualification: QualificationResult): void {
    tournamentLayout.hidden = true
    knockoutEl.hidden = false
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
    knockoutEl.hidden = true
    knockoutEl.innerHTML = ''
    championEl.hidden = true
    championEl.innerHTML = ''
    tournamentLayout.hidden = false
    app.querySelectorAll('.group-panel, .graph-container').forEach((el) => {
      el.classList.remove('complete')
    })
    startGroupPhase()
  })

  startGroupPhase()
}
