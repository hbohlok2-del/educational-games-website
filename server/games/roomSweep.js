// A room launched from a saved quiz has no socket attached until someone
// joins it, so the usual "delete when both teams leave" cleanup never fires.
// Drop any room still waiting with no one connected to it after this long.
const UNCLAIMED_ROOM_TTL_MS = 15 * 60 * 1000;

function sweepUnclaimedRooms(nsp, rooms, now = Date.now()) {
  for (const room of rooms.values()) {
    if (room.status !== "waiting" || Object.values(room.teams).some(Boolean)) continue;
    const connected = nsp.adapter.rooms.get(room.code);
    if (connected && connected.size > 0) continue;
    if (room.createdAt && now - room.createdAt >= UNCLAIMED_ROOM_TTL_MS) rooms.delete(room.code);
  }
}

module.exports = { sweepUnclaimedRooms, UNCLAIMED_ROOM_TTL_MS };
