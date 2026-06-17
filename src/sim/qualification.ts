import type { Group, Standing, Team } from '../model/types'

export interface QualifiedTeam {
  team: Team
  group: string
  position: number
}

export interface QualificationResult {
  winners: QualifiedTeam[]
  runnersUp: QualifiedTeam[]
  bestThirds: QualifiedTeam[]
}

export interface GroupEntry {
  group: Group
  standings: Standing[]
}

const standingComparator = (a: Standing, b: Standing): number =>
  b.points - a.points || b.goalDiff - a.goalDiff || b.goalsFor - a.goalsFor

/** Extract a group's letter from its name, e.g. "Group A" → "A". */
export function groupLetter(groupName: string): string {
  const parts = groupName.trim().split(/\s+/)
  return parts[parts.length - 1]
}

/**
 * Compute the advancing set from group-stage standings.
 * Returns all winners, all runners-up, and the 8 best third-placed teams
 * (ranked by Pts → GD → GF, consistent with per-group standings order).
 * Safe to call on partial results — bestThirds may have fewer than 8 entries.
 */
export function computeQualification(entries: GroupEntry[]): QualificationResult {
  const winners: QualifiedTeam[] = []
  const runnersUp: QualifiedTeam[] = []
  const thirds: Standing[] = []
  const thirdGroups: string[] = []

  for (const { group, standings } of entries) {
    if (standings.length > 0) {
      winners.push({ team: standings[0].team, group: group.name, position: 1 })
    }
    if (standings.length > 1) {
      runnersUp.push({ team: standings[1].team, group: group.name, position: 2 })
    }
    if (standings.length > 2) {
      thirds.push(standings[2])
      thirdGroups.push(group.name)
    }
  }

  const sortedThirds = thirds
    .map((s, i) => ({ s, groupName: thirdGroups[i] }))
    .sort((a, b) => standingComparator(a.s, b.s))

  const bestThirds: QualifiedTeam[] = sortedThirds.slice(0, 8).map(({ s, groupName }) => ({
    team: s.team,
    group: groupName,
    position: 3,
  }))

  return { winners, runnersUp, bestThirds }
}
