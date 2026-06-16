import './style.css'
import { startSimulation } from './app'
import groupData from './data/group.json'
import type { Group } from './model/types'

const group = groupData as Group

const app = document.querySelector<HTMLDivElement>('#app')
if (app) {
  app.innerHTML = `
    <header class="app-header">
      <h1>2026 World Cup — ${group.name}</h1>
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
    <div class="sim-layout">
      <div id="graph" class="graph-container"></div>
      <div id="standings" class="standings-container"></div>
    </div>
  `

  const graph = app.querySelector<HTMLDivElement>('#graph')!
  const standingsEl = app.querySelector<HTMLDivElement>('#standings')!
  const playPauseBtn = app.querySelector<HTMLButtonElement>('#play-pause')!
  const speedSelect = app.querySelector<HTMLSelectElement>('#speed')!

  let controller = startSimulation(graph, group, { standingsContainer: standingsEl })

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

  graph.addEventListener('click', () => {
    controller = startSimulation(graph, group, {
      standingsContainer: standingsEl,
      intervalMs: 1200 / Number(speedSelect.value),
    })
    updatePlayPauseButton()
  })
}
