# Token to Water — domain glossary

| Term | Meaning |
| --- | --- |
| **Token** | A unit of text processed by an AI model. The only user input. |
| **Water per token** | Litres of water attributed to one token: `LITERS_PER_TOKEN` (0.001 L = 1 mL) × the user's **water factor** (0.1–10). A deliberately round reference, not a measurement. |
| **Tier** | One rung of the 20-step volume ladder, from a water drop (0.05 mL) to all water on Earth. Defined in `src/constants/scales.ts`. |
| **Active tier** | The smallest tier that can hold the current volume. It is the container on screen, filling from 0 to 100 %. |
| **Fill** | Share of the active tier's volume that is full. Drawn by *area*, so narrow necks fill quickly and wide basins slowly. |
| **Overflow** | Crossing 100 % of a tier: the camera zooms out to the next one, and the previous tier stays beside it, full, for scale. |
| **Equivalence** | The human sentence: "Equivalent to 1 bucket and 1 large bottle", "About 10.5 large pools", "0.4 of a drop". Greedy: biggest container that fits, at most one smaller term. |
| **Countable / unique tier** | Countable tiers read as "3 buckets"; unique bodies of water (Amazon, Mediterranean, Atlantic, Earth) read as "2.4 × the Mediterranean Sea". |
| **Quality tier** | `high` or `low` (battery saver). Chosen from device hints, then lowered automatically if the frame rate stays under 45 FPS. |
