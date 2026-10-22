export const getAvailableTeamPositionsForMembers = <TeamMember>(
  members: readonly (TeamMember | null)[],
): number[] =>
  members.flatMap((member, index) => (member === null ? [index] : []));
