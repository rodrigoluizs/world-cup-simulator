import './style.css'
import { type SimulationController, startKnockout, startTournament } from './app'
import tournamentData from './data/tournament.json'
import type { Tournament } from './model/types'
import { ROUND_LABELS } from './render/bracket'
import { ROUND_ORDER, type KnockoutRound } from './sim/bracket'
import type { QualificationResult } from './sim/qualification'

const tournament = tournamentData as Tournament

/** Pause after the last group match lands so its highlight is seen before the bracket opens. */
const GROUP_FINISH_PAUSE_MS = 1500

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

  const knockoutTabsHtml = ROUND_ORDER.map(
    (round) =>
      `<button class="tab-btn" id="tab-${round}" role="tab"
        aria-selected="false" aria-controls="panel-${round}" disabled>${ROUND_LABELS[round]}</button>`,
  ).join('')

  const knockoutPanelsHtml = ROUND_ORDER.map((round) =>
    round === 'F'
      ? `<div id="panel-F" class="tab-panel" hidden role="tabpanel">
           <div class="final-container" id="final-container"></div>
         </div>`
      : `<div id="panel-${round}" class="tab-panel" hidden role="tabpanel">
           <div class="round-panel" id="round-container-${round}"></div>
         </div>`,
  ).join('')

  app.innerHTML = `
    <header class="app-header">
      <h1><img class="app-logo" src="${import.meta.env.BASE_URL}world-cup-logo.png" alt="" /><span class="app-title">2026 FIFA World Cup</span></h1>
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
      <a href="https://github.com/rodrigoluizs/world-cup-simulator" target="_blank" rel="noopener noreferrer" class="github-link" aria-label="Star on GitHub">
        <svg class="github-icon" viewBox="0 0 16 16" aria-hidden="true" fill="currentColor">
          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38
            0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01
            1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95
            0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27
            2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82
            1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01
            2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
        </svg>
      </a>
    </header>
    <nav class="tab-bar" role="tablist">
      <button class="tab-btn tab-btn--active" id="tab-groups" role="tab"
        aria-selected="true" aria-controls="panel-groups">Group Stage</button>
      ${knockoutTabsHtml}
    </nav>
    <div id="panel-groups" class="tab-panel" role="tabpanel">
      <div class="tournament-layout">
        <div class="groups-grid">${groupsHtml}</div>
        <aside id="qualification" class="qualification-aside"></aside>
      </div>
    </div>
    ${knockoutPanelsHtml}
  `

  const playPauseBtn = app.querySelector<HTMLButtonElement>('#play-pause')!
  const speedSelect = app.querySelector<HTMLSelectElement>('#speed')!
  const qualPanel = app.querySelector<HTMLElement>('#qualification')!
  const groupsPanel = app.querySelector<HTMLElement>('#panel-groups')!
  const groupsTabBtn = app.querySelector<HTMLButtonElement>('#tab-groups')!
  const finalContainer = app.querySelector<HTMLElement>('#final-container')!
  const titleEl = app.querySelector<HTMLElement>('.app-header h1')!

  // Hidden "Mineirazo" modifier: armed by secretly clicking the title before
  // pressing Play. When armed, the tournament is rigged to a Brazil 7-1 Germany
  // final; the title shows a Brazil-colours gradient to confirm it is on.
  let mineirazoArmed = false

  const knockoutTabBtns = new Map<KnockoutRound, HTMLButtonElement>()
  const roundContainers = new Map<KnockoutRound, HTMLElement>()
  for (const round of ROUND_ORDER) {
    knockoutTabBtns.set(round, app.querySelector<HTMLButtonElement>(`#tab-${round}`)!)
    if (round !== 'F') {
      roundContainers.set(round, app.querySelector<HTMLElement>(`#round-container-${round}`)!)
    }
  }

  function buildGroupContainers() {
    return tournament.groups.map((group) => {
      const graphEl = app!.querySelector<HTMLElement>(`[data-group="${group.name}"]`)!
      const standingsEl = graphEl.closest('.sim-layout')!.querySelector<HTMLElement>('.standings-container')!
      return { graphEl, standingsEl, group }
    })
  }

  const currentSpeed = (): number => Number(speedSelect.value)

  let controller: SimulationController

  function setActiveStage(stage: 'groups' | KnockoutRound): void {
    groupsTabBtn.classList.remove('tab-btn--active')
    groupsTabBtn.setAttribute('aria-selected', 'false')
    groupsPanel.hidden = true
    for (const round of ROUND_ORDER) {
      const btn = knockoutTabBtns.get(round)!
      btn.classList.remove('tab-btn--active')
      btn.setAttribute('aria-selected', 'false')
      app!.querySelector<HTMLElement>(`#panel-${round}`)!.hidden = true
    }
    if (stage === 'groups') {
      groupsTabBtn.classList.add('tab-btn--active')
      groupsTabBtn.setAttribute('aria-selected', 'true')
      groupsPanel.hidden = false
    } else {
      const btn = knockoutTabBtns.get(stage)!
      btn.classList.add('tab-btn--active')
      btn.setAttribute('aria-selected', 'true')
      app!.querySelector<HTMLElement>(`#panel-${stage}`)!.hidden = false
    }
  }

  function startKnockoutPhase(qualification: QualificationResult): void {
    knockoutTabBtns.get('R32')!.disabled = false
    setActiveStage('R32')
    controller = startKnockout(qualification, {
      mineirazo: mineirazoArmed,
      containerForRound: (round) => roundContainers.get(round)!,
      finalContainer,
      onRoundChange: (round) => {
        const btn = knockoutTabBtns.get(round)
        if (btn) btn.disabled = false
        setActiveStage(round)
      },
      onChampion: () => {},
    })
    controller.setSpeed(currentSpeed())
    updatePlayPauseButton()
  }

  function startGroupPhase(autoplay = true): void {
    controller = startTournament(buildGroupContainers(), qualPanel, {
      mineirazo: mineirazoArmed,
      onComplete: (qualification) => {
        // Hold on the group stage briefly so the final match's highlight is
        // visible before the view jumps to the knockout bracket.
        setTimeout(() => startKnockoutPhase(qualification), GROUP_FINISH_PAUSE_MS)
      },
    })
    controller.setSpeed(currentSpeed())
    // On first load the simulation waits for the user to press Play.
    if (!autoplay) controller.pause()
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

  groupsTabBtn.addEventListener('click', () => setActiveStage('groups'))
  for (const round of ROUND_ORDER) {
    const btn = knockoutTabBtns.get(round)!
    btn.addEventListener('click', () => {
      if (!btn.disabled) setActiveStage(round)
    })
  }

  // Tear the running tournament back down to a fresh group stage (used by both
  // the groups-grid reset and the hidden modifier toggle).
  function resetTournamentUI(): void {
    controller.pause()
    for (const round of ROUND_ORDER) {
      const btn = knockoutTabBtns.get(round)!
      btn.disabled = true
      btn.classList.remove('tab-btn--active')
      btn.setAttribute('aria-selected', 'false')
      app!.querySelector<HTMLElement>(`#panel-${round}`)!.hidden = true
    }
    app!.querySelectorAll('.group-panel, .graph-container').forEach((el) => {
      el.classList.remove('complete')
    })
    setActiveStage('groups')
  }

  // Clicking the groups grid resets and re-runs from the start
  app.querySelector('.groups-grid')!.addEventListener('click', () => {
    resetTournamentUI()
    startGroupPhase()
  })

  // Secretly click the title to arm/disarm the Mineirazo modifier. Re-runs the
  // group stage so the rig takes effect, but stays paused so the user presses Play.
  titleEl.addEventListener('click', () => {
    mineirazoArmed = !mineirazoArmed
    titleEl.classList.toggle('mineirazo', mineirazoArmed)
    resetTournamentUI()
    startGroupPhase(false)
  })

  startGroupPhase(false)
}
