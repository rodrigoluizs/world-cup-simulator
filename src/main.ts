import { add } from './math'

// Placeholder entry point so `vite build` and the dev server have something to
// render. The real UI arrives via /planner.
const app = document.querySelector<HTMLDivElement>('#app')
if (app) {
  app.textContent = `Scaffold ready — 1 + 1 = ${add(1, 1)}`
}
