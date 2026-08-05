/**
 * Rule registry. Every rule module registers here; analyze() runs them all.
 */

import type { Rule } from '../types.js'

export const ALL_RULES: readonly Rule[] = []
