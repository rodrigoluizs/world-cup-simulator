import type { Group, Match, MatchResult } from '../model/types'

const SVG_NS = 'http://www.w3.org/2000/svg' as const
const SIZE = 600
const CENTER = SIZE / 2
const RADIUS = 220
const NODE_R = 36

function el<K extends keyof SVGElementTagNameMap>(
  name: K,
  attrs: Record<string, string>,
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG_NS, name)
  for (const [key, value] of Object.entries(attrs)) {
    node.setAttribute(key, value)
  }
  return node
}

/** Positions for n nodes evenly spaced on a ring, first node at top. */
function ringPositions(count: number): Array<{ x: number; y: number }> {
  const positions: Array<{ x: number; y: number }> = []
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 - Math.PI / 2
    positions.push({
      x: CENTER + RADIUS * Math.cos(angle),
      y: CENTER + RADIUS * Math.sin(angle),
    })
  }
  return positions
}

/**
 * Draw the group as a node/edge graph: teams as nodes on a ring, every match
 * as an edge with an empty result slot (`#match-<index>`) to be filled later.
 */
export function renderGroupGraph(container: HTMLElement, group: Group, matches: Match[]): void {
  container.innerHTML = ''
  container.classList.remove('complete')

  const svg = el('svg', {
    viewBox: `0 0 ${SIZE} ${SIZE}`,
    class: 'graph',
    role: 'img',
    'aria-label': `${group.name} match graph`,
  })

  const indexByCode = new Map(group.teams.map((t, i) => [t.code, i]))
  const positions = ringPositions(group.teams.length)

  // Edges first so the team nodes paint on top of them.
  matches.forEach((match, i) => {
    const a = positions[indexByCode.get(match.home.code) ?? 0]
    const b = positions[indexByCode.get(match.away.code) ?? 0]

    svg.append(
      el('line', {
        x1: `${a.x}`,
        y1: `${a.y}`,
        x2: `${b.x}`,
        y2: `${b.y}`,
        class: 'edge',
      }),
    )

    const label = el('text', {
      id: `match-${i}`,
      x: `${(a.x + b.x) / 2}`,
      y: `${(a.y + b.y) / 2}`,
      class: 'result pending',
      'text-anchor': 'middle',
      'dominant-baseline': 'central',
    })
    label.textContent = 'vs'
    svg.append(label)
  })

  positions.forEach((p, i) => {
    svg.append(
      el('circle', { cx: `${p.x}`, cy: `${p.y}`, r: `${NODE_R}`, class: 'node' }),
    )
    const text = el('text', {
      x: `${p.x}`,
      y: `${p.y}`,
      class: 'node-label',
      'text-anchor': 'middle',
      'dominant-baseline': 'central',
    })
    const t = group.teams[i]
    text.textContent = t.flag ? `${t.flag} ${t.code}` : t.code
    svg.append(text)
  })

  container.append(svg)
}

/** Fill the result slot for the match at `index` with its scoreline. */
export function revealResult(container: HTMLElement, result: MatchResult, index: number): void {
  const label = container.querySelector(`#match-${index}`)
  if (!label) return
  label.textContent = `${result.homeGoals}–${result.awayGoals}`
  label.classList.remove('pending')
  label.classList.add('revealed')
}
