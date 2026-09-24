# 0001 — Store ocean volumes in litres, correcting the brief

- **Status:** Accepted
- **Date:** 2026-09-24

## Context

The product brief listed the scale tiers with "exact" volumes. Two of them are
1,000× too small:

| Tier | Brief | Published figure | In litres |
| --- | --- | --- | --- |
| Mediterranean Sea | 3.75 × 10¹⁵ L | ≈ 3.75 million km³ | 3.75 × 10¹⁸ L |
| Atlantic Ocean | 3.1 × 10¹⁷ L | ≈ 310 million km³ (NOAA) | 3.1 × 10²⁰ L |

The brief's numbers are the published volumes in **cubic metres** labelled as
litres. The other geographic tiers are correct in litres (Amazon daily
discharge ≈ 18 km³ = 1.8 × 10¹³ L; all water on Earth ≈ 1.386 billion km³ =
1.386 × 10²¹ L, USGS).

With the brief's values the Atlantic would hold 0.02 % of Earth's water; the
real share is about 22 %. The app's whole purpose is honest scale comparison,
so a 1,000× error on two rungs undermines it.

## Decision

`src/constants/scales.ts` stores both bodies of water in litres from the
published km³ figures. `src/constants/scales.test.ts` pins them to those
sources ("Atlantic holds between 20 % and 25 % of all water on Earth").

## Consequences

- The ladder stays strictly increasing either way, so no other logic changes.
- The Mediterranean → Atlantic → Earth steps become 83× and 4.5× instead of
  83× and 4,500×, which also makes the final zoom-out read correctly.
- To revert to the brief's figures, change the two constants and the pinned
  test together.
