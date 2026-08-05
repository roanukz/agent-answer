/**
 * Rule registry. Every rule module registers here; analyze() runs them all.
 * Order is presentation order within checks — scoring is order-independent.
 */

import type { Rule } from '../types.js'

// Check 1 — Self-contained sections
import orphanOpener from './orphan-opener.js'
import crossSectionPointer from './cross-section-pointer.js'
import genericHeading from './generic-heading.js'
import orphanAcronym from './orphan-acronym.js'
// Check 2 — Answer first (BLUF)
import preambleOpener from './preamble-opener.js'
import buriedSteps from './buried-steps.js'
import slowStart from './slow-start.js'
// Check 3 — Unresolved references
import danglingPointer from './dangling-pointer.js'
import bareDemonstrative from './bare-demonstrative.js'
import ambiguousIt from './ambiguous-it.js'
import relativeTime from './relative-time.js'
// Check 4 — One idea per section
import sectionTooLong from './section-too-long.js'
import topicShift from './topic-shift.js'
import noHeadings from './no-headings.js'
// Check 5 — Structure signals
import lowHeadingDensity from './low-heading-density.js'
import headingJump from './heading-jump.js'
import proseComparison from './prose-comparison.js'
import proseSequence from './prose-sequence.js'
import wallOfText from './wall-of-text.js'
// Strengths (positive findings, never deduct)
import strengths from './strengths.js'

export const ALL_RULES: readonly Rule[] = [
  orphanOpener,
  crossSectionPointer,
  genericHeading,
  orphanAcronym,
  preambleOpener,
  buriedSteps,
  slowStart,
  danglingPointer,
  bareDemonstrative,
  ambiguousIt,
  relativeTime,
  sectionTooLong,
  topicShift,
  noHeadings,
  lowHeadingDensity,
  headingJump,
  proseComparison,
  proseSequence,
  wallOfText,
  strengths
]

/** The 19 scoring rules (strengths emits only positive findings). */
export const SCORING_RULE_IDS: readonly string[] = ALL_RULES.filter(
  (r) => r.id !== 'strengths'
).map((r) => r.id)
