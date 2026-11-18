import { RubricDefinition, RubricLevel } from '../types';

export const CBC_RUBRIC_DEFINITIONS: Record<RubricLevel, RubricDefinition> = {
  EE1: {
    code: 'EE1',
    minMark: 90,
    maxMark: 100,
    points: 8,
    description: 'Exceeding Expectation',
    color: 'bg-emerald-600 text-white border-emerald-700',
  },
  EE2: {
    code: 'EE2',
    minMark: 75,
    maxMark: 89,
    points: 7,
    description: 'Exceeding Expectation',
    color: 'bg-emerald-500 text-white border-emerald-600',
  },
  ME1: {
    code: 'ME1',
    minMark: 58,
    maxMark: 74,
    points: 6,
    description: 'Meeting Expectation',
    color: 'bg-blue-600 text-white border-blue-700',
  },
  ME2: {
    code: 'ME2',
    minMark: 41,
    maxMark: 57,
    points: 5,
    description: 'Meeting Expectation',
    color: 'bg-cyan-600 text-white border-cyan-700',
  },
  AE1: {
    code: 'AE1',
    minMark: 31,
    maxMark: 40,
    points: 4,
    description: 'Approaching Expectation',
    color: 'bg-amber-500 text-white border-amber-600',
  },
  AE2: {
    code: 'AE2',
    minMark: 21,
    maxMark: 30,
    points: 3,
    description: 'Approaching Expectation',
    color: 'bg-amber-600 text-white border-amber-700',
  },
  BE1: {
    code: 'BE1',
    minMark: 11,
    maxMark: 20,
    points: 2,
    description: 'Below Expectation',
    color: 'bg-rose-500 text-white border-rose-600',
  },
  BE2: {
    code: 'BE2',
    minMark: 1,
    maxMark: 10,
    points: 1,
    description: 'Below Expectation',
    color: 'bg-rose-700 text-white border-rose-800',
  },
};

export const RUBRIC_LEVEL_ORDER: RubricLevel[] = ['EE1', 'EE2', 'ME1', 'ME2', 'AE1', 'AE2', 'BE1', 'BE2'];

/**
 * Converts a raw mark (0-100) into its CBC 8-level rubric representation
 */
export function markToRubric(marks: number): {
  level: RubricLevel;
  points: number;
  description: string;
} {
  const clamped = Math.max(0, Math.min(100, Math.round(marks)));

  if (clamped >= 90) {
    return { level: 'EE1', points: 8, description: 'Exceeding Expectation' };
  } else if (clamped >= 75) {
    return { level: 'EE2', points: 7, description: 'Exceeding Expectation' };
  } else if (clamped >= 58) {
    return { level: 'ME1', points: 6, description: 'Meeting Expectation' };
  } else if (clamped >= 41) {
    return { level: 'ME2', points: 5, description: 'Meeting Expectation' };
  } else if (clamped >= 31) {
    return { level: 'AE1', points: 4, description: 'Approaching Expectation' };
  } else if (clamped >= 21) {
    return { level: 'AE2', points: 3, description: 'Approaching Expectation' };
  } else if (clamped >= 11) {
    return { level: 'BE1', points: 2, description: 'Below Expectation' };
  } else {
    return { level: 'BE2', points: 1, description: 'Below Expectation' };
  }
}

/**
 * Converts average CBC rubric points (1–8) into its nearest CBC 8-level rubric representation
 */
export function pointsToRubric(points: number): {
  level: RubricLevel;
  points: number;
  description: string;
} {
  const rounded = Math.max(1, Math.min(8, Math.round(points)));
  const matched =
    Object.values(CBC_RUBRIC_DEFINITIONS).find((def) => def.points === rounded) ||
    CBC_RUBRIC_DEFINITIONS.ME2;
  return {
    level: matched.code,
    points: matched.points,
    description: matched.description,
  };
}

/**
 * Returns the min/max marks for a rubric level
 */
export function rubricToMarkRange(level: RubricLevel): { min: number; max: number; points: number } {
  const def = CBC_RUBRIC_DEFINITIONS[level];
  return { min: def.minMark, max: def.maxMark, points: def.points };
}

/**
 * Validates whether entered marks and selected rubric conflict
 */
export function validateMarksRubricConflict(
  marks: number | null | undefined,
  rubric: RubricLevel
): { valid: boolean; error?: string } {
  if (marks === null || marks === undefined || isNaN(marks)) {
    return { valid: true };
  }

  const def = CBC_RUBRIC_DEFINITIONS[rubric];
  if (!def) {
    return { valid: false, error: 'Invalid rubric level' };
  }

  if (marks < def.minMark || marks > def.maxMark) {
    return {
      valid: false,
      error: `Conflict: Mark ${marks}% does not fall within ${rubric} range (${def.minMark}–${def.maxMark}%).`,
    };
  }

  return { valid: true };
}

/**
 * Grade 9 KJSEA Placement Score Calculation
 * placement_score = (kjsea_points / 8 * 60) + (sba_score * 20 / 100) + (kpsea_score * 20 / 100)
 */
export function computeKjseaPlacementScore(
  kjseaAveragePoints: number,
  sbaScore: number = 0,
  kpseaScore: number = 0
): number {
  const kjseaPart = (Math.min(8, Math.max(1, kjseaAveragePoints)) / 8) * 60;
  const sbaPart = (Math.min(100, Math.max(0, sbaScore)) * 20) / 100;
  const kpseaPart = (Math.min(100, Math.max(0, kpseaScore)) * 20) / 100;
  return Number((kjseaPart + sbaPart + kpseaPart).toFixed(1));
}

/**
 * Recommended pathway mapping based on student's placement score and preference
 */
export function recommendPathway(
  placementScore: number,
  preference?: string
): { recommended: string; rationale: string } {
  if (placementScore >= 75) {
    return {
      recommended: preference || 'STEM',
      rationale: 'High aptitude demonstrated across national assessments and foundational competencies.',
    };
  } else if (placementScore >= 55) {
    return {
      recommended: preference || 'Social Sciences',
      rationale: 'Solid competence suited for humanities, languages, business and civic education pathways.',
    };
  } else {
    return {
      recommended: preference || 'Arts & Sports',
      rationale: 'Practical psychomotor and creative vocational pathways recommended for skills specialization.',
    };
  }
}
