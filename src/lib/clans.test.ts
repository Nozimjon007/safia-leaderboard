import { describe, expect, it } from 'vitest';
import { CLAN_IDS, clanIdForMember, clanSizeCounts, computeClanAssignments, membersOfClan } from './clans';
import type { Member } from '../data/types';

function member(id: string, role = 'Baker'): Member {
  return { id, name: id, area: 'Site 1', shift: 'S1', role, avatarPhoto: null, fullBodyPhoto: null };
}

describe('computeClanAssignments', () => {
  it('assigns every member exactly one of the four clans', () => {
    const members = Array.from({ length: 17 }, (_, i) => member(`m${i}`));
    const assignments = computeClanAssignments(members);
    for (const m of members) {
      expect(CLAN_IDS).toContain(assignments[m.id]);
    }
    expect(Object.keys(assignments)).toHaveLength(17);
  });

  it('splits exactly evenly across 4 clans for a roster of 100', () => {
    const members = Array.from({ length: 100 }, (_, i) => member(`m${String(i).padStart(3, '0')}`));
    const counts = clanSizeCounts({ members });
    for (const id of CLAN_IDS) expect(counts[id]).toBe(25);
  });

  it('is deterministic — the same roster always produces the same assignments', () => {
    const members = Array.from({ length: 41 }, (_, i) => member(`m${i}`));
    const a = computeClanAssignments(members);
    const b = computeClanAssignments(members);
    expect(a).toEqual(b);
  });

  it('is independent of input array order — same set of ids, any order, same assignments', () => {
    const members = Array.from({ length: 30 }, (_, i) => member(`m${i}`));
    const shuffled = [...members].reverse();
    expect(computeClanAssignments(members)).toEqual(computeClanAssignments(shuffled));
  });

  it('membersOfClan returns exactly the members assigned to that clan, no others', () => {
    const members = Array.from({ length: 12 }, (_, i) => member(`m${i}`));
    const assignments = computeClanAssignments(members);
    for (const id of CLAN_IDS) {
      const clanMembers = membersOfClan(members, assignments, id);
      for (const m of clanMembers) expect(clanIdForMember(assignments, m.id)).toBe(id);
      expect(clanMembers.length).toBeGreaterThan(0);
    }
  });
});
