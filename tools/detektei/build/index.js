// Builds a whole case from a case number, stage by stage. Each stage reads what earlier stages put on the context
// object c and adds its own results. The RNG is shared, so stage order is part of the case format.
import { pickAnswer } from "./answer.js";
import { layHouse } from "./house.js";
import { chooseProof } from "./proof.js";
import { castPeople } from "./people.js";
import { makeClues } from "./clues.js";
import { placeThings } from "./placement.js";
import { makeHints } from "./hints.js";
import { writeDialogue } from "./dialogue.js";
import { finish } from "./finish.js";

export function build(code, attempt) {
  const c = { code, attempt };
  pickAnswer(c);
  layHouse(c);
  chooseProof(c);
  castPeople(c);
  makeClues(c);
  placeThings(c);
  makeHints(c);
  writeDialogue(c);
  return finish(c);
}
