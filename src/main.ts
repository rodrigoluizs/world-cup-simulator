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
      <button id="run" type="button">Simulate group</button>
      <span id="status" class="status">${group.teams.length} teams</span>
    </header>
    <div id="graph" class="graph-container"></div>
  `

  const graph = app.querySelector<HTMLDivElement>('#graph')!
  const button = app.querySelector<HTMLButtonElement>('#run')!

  const run = () => startSimulation(graph, group, { intervalMs: 1200 })
  button.addEventListener('click', run)
  run()
}
