/**
 * Real FIFA World Cup winning years keyed by Team.code.
 * West Germany titles are stored under "GER".
 * Only teams that have won at least once appear here.
 * All editions: 1930–2022 (22 tournaments).
 */
const TITLES: Record<string, number[]> = {
  BRA: [1958, 1962, 1970, 1994, 2002],
  GER: [1954, 1974, 1990, 2014],
  ITA: [1934, 1938, 1982, 2006],
  ARG: [1978, 1986, 2022],
  FRA: [1998, 2018],
  URU: [1930, 1950],
  ENG: [1966],
  ESP: [2010],
}

/** Returns the prior real winning years for a team code, ascending. Empty array for never-winners. */
export function titleYearsFor(code: string): number[] {
  return TITLES[code] ?? []
}
