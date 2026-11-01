import { KINDS, ROOMS, layoutRoom } from "../furniture.js";
import { fmtTime } from "../util.js";

// Rooms and where everybody was; the times.
export function layHouse(c) {
  const { M, R, core, suspects, trueAlibi, victim } = c;
  // ---------- rooms and where everybody was ----------
  // The scene plus two more rooms off the hall. The murderer hides the weapon in a room where no truthful person
  // sat; truthful people sat together in the other one. When the body was moved, the murder room is the
  // murderer's own alibi room and the weapon went into the scene with the body.
  const rooms = R.shuffle(ROOMS).slice(0, 3).map((r, i) => layoutRoom(r, i === 0 ? victim : null));
  const [S, A, B] = rooms;
  const roomOf = (x) => rooms.find((r) => r.furniture.includes(x));
  const roomOfLeaf = (l) => rooms.find((r) => l.id.startsWith(`${r.id}.`));
  const acts = (r) => r.furniture.filter((x) => KINDS[x.kind].activity);
  const usedActs = new Set();
  const takeIn = (rs, orElse) => {
    const o = R.shuffle(rs.flatMap(acts)).filter((x) => !usedActs.has(x));
    if (!o.length) { if (orElse) return orElse(); throw new Error("no activity left"); }
    usedActs.add(o[0]);
    return o[0];
  };
  const hideRoom = core === "moved" ? S : R.pick([A, B]);
  const calm = core === "moved" ? null : hideRoom === A ? B : A; // where truthful people sat
  const mF = core === "moved" ? takeIn([A, B]) : null;
  const MR = core === "moved" ? roomOf(mF) : S;
  const quiet = core === "moved" ? (MR === A ? B : A) : calm;
  for (const s of suspects) {
    const fu = s === M ? mF || takeIn(trueAlibi ? [A, B].filter((r) => r !== hideRoom || core === "staged") : [A, B])
      : s.role === "H" ? takeIn([quiet], () => { s.role = "L"; return takeIn([A, B]); }) : takeIn([A, B]);
    s.claim = { f: fu, room: roomOf(fu), act: KINDS[fu.kind].activity };
  }

  // Times: the murder on a quarter hour, so a clock chimes. The watch shows it, unless the murderer moved the hands.
  const T = 21 * 60 + 45 + 15 * R.int(5);
  const time = fmtTime(T);
  const watchAt = core === "staged" ? T + 45 + 5 * R.int(5) : T + R.int(4);
  const watch = fmtTime(watchAt);
  const servedAt = T - 45 - 5 * R.int(4);
  const served = fmtTime(servedAt);
  const keyAt = core === "poison" ? servedAt : T; // the moment that matters for an alibi
  for (const s of suspects) {
    s.from = s === M && core === "staged" ? T + 15 + 5 * R.int(3)
      : s === M && core === "poison" ? servedAt + 10 + 5 * R.int(3)
      : core === "poison" ? servedAt - 10 - 5 * R.int(4) : T - 30 - 5 * R.int(5);
    s.until = watchAt + 20 + 5 * R.int(4);
  }

  Object.assign(c, { MR, S, hideRoom, keyAt, roomOf, roomOfLeaf, rooms, served, time, watch });
}
