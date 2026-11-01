# Detektei: how a case is built (version 7)

`case.js` builds a whole case from a case number. Both devices run the same code, so both build the same case. The interrogator sees the suspects; the field agent sees the rooms; codes carry clues and hints across.

## From the answer outwards

1. **Answer.** Three suspects with different initials. One is the murderer. Each innocent either tells the truth about where they were (H) or lies to hide a secret (L). The case also picks a cause of death, a weapon, a decoy of the same cause, and two grudges per suspect. One grudge is live; the other was settled before tonight.
2. **Twists.** At most one in how it was done (`staged` watch, `moved` body, `poison` in advance) and at most one around it (`lovers`, `frame`).
3. **Proof.** Each innocent is ruled out by a different route:
   - **A, trace.** A trace fits the murderer and exactly one innocent: a hair colour group on the weapon, a footprint, ash, or which hand struck. The interrogator sees that it doesn't fit the third suspect.
   - **B, alibi.** A truthful suspect's activity shows in the room (embers, cocoa, a played game) and covers the moment that matters: the murder, or the drink in a poisoning.
   - **C, witness.** A third person saw the liar wherever the liar really was. Lovers give each other away.

   The traits a trace uses are set per case so that it fits exactly two suspects. A trace never fits only one.
4. **House.** Truthful people sit together in one room. The weapon goes into a room where nobody truthful sat, and the witness sees it from the hall. Papers go into drawers, hidden places and locks. Red herrings fill about two in five of the remaining spots.
5. **Dialogue.** It follows from the facts. Moods come from each suspect's temper when cornered, never from their part in the case. The murderer, and sometimes an innocent, reports a sighting that leads to a red herring.

## Deductions and the solver

Every piece of evidence that proves something is recorded in `k.deductions`. Each deduction lists the tokens it needs and the fact it establishes:

- **Tokens:** `clue:x` is a clue entered. `q:sid:qid` is a question asked. `o:sid:dim` is a trait seen with "Look closely". `ev:x` is an event, such as a broken lie or a confrontation that made someone talk.
- **Facts:**
  - `who`: the murderer is one of a list.
  - `weapon`: the weapon is one of a list.
  - `mot+`: s had grudge m.
  - `mot-`: s's grudge m was settled.
  - A fact with `by` comes from a suspect's word. It holds unless that suspect is the murderer, because only the murderer lies about others.

`solve()` has two layers:

- **Availability.** Nodes say what each detective can reach. Clues and hints cross only by exchange, and each exchange is a round.
- **Deduction.** After each round the detectives pool what they know. The facts then filter all accusations (suspect × weapon × motive).

`validate()` accepts a case only if all of these hold:
- exactly the true accusation survives at the end;
- it takes two to four exchanges;
- at least two suspects survive before the first exchange;
- no fact names the murderer on its own;
- every clue and hint can be reached.

About 90% of case numbers pass on the first attempt; the rest retry with a new attempt number.

## Locks

Locks are lock objects (a strongbox, padlocked tin or attaché case placed on a fitting spot) or furniture parts that take a lock (desk drawer, chest, jewellery box, and so on). A case has up to two locks, of different kinds:

- **date:** day and month, 4 digits, from one of three dated keepsakes;
- **phone:** the last three digits of one of three telephone numbers on calling cards.

One suspect knows which keepsake or card counts. A lock always guards a paper the deduction can use.

## Checking it

```sh
node --test tests/*.test.mjs
node scripts/detektei-metrics.mjs 1000
```

The metrics script reports:
- exchange rounds;
- how many accusations are left after each round;
- twists, proof routes and locks;
- the **lookup detector**: any line, mood, look or belonging shown by suspects who turn out to be the murderer three times in four or more often.

The tests require the detector to find nothing. Run on version 5, it flagged the murderer's angry reactions (100%) and the belonging under the body (83%).
