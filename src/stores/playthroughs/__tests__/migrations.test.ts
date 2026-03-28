import { describe, expect, it } from "vitest";
import {
  cleanupRemixMode,
  type MigrationData,
  migratePlaythrough,
  migrateRemixMode,
  migrateTeamField,
  migrateVersion,
} from "../migrations";

type LegacyTeamMember = {
  headEncounterId: string;
  bodyEncounterId: string;
} | null;

type TeamWithMembers = {
  members: LegacyTeamMember[];
};

function getTeamMembers(result: MigrationData): LegacyTeamMember[] {
  const team = result.team as TeamWithMembers | undefined;
  expect(team).toBeDefined();
  return team?.members;
}

describe("Migration Functions", () => {
  describe("migrateRemixMode", () => {
    it("should migrate remixMode to gameMode when gameMode is classic", () => {
      const data: MigrationData = {
        id: "test",
        name: "Test",
        remixMode: true,
        gameMode: "classic",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const result = migrateRemixMode(data);

      expect(result.gameMode).toBe("remix");
      expect(result.remixMode).toBeUndefined();
      expect(result.version).toBe("1.0.0");
    });

    it("should not migrate when remixMode is undefined", () => {
      const data: MigrationData = {
        id: "test",
        name: "Test",
        gameMode: "classic",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const result = migrateRemixMode(data);

      expect(result.gameMode).toBe("classic");
      expect(result.remixMode).toBeUndefined();
    });

    it("should not migrate when gameMode is not classic", () => {
      const data: MigrationData = {
        id: "test",
        name: "Test",
        remixMode: true,
        gameMode: "remix",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const result = migrateRemixMode(data);

      expect(result.gameMode).toBe("remix");
      expect(result.remixMode).toBe(true);
    });
  });

  describe("migrateTeamField", () => {
    it("should create default team when no team field exists", () => {
      const data: MigrationData = {
        id: "test",
        name: "Test",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const result = migrateTeamField(data);
      const teamMembers = getTeamMembers(result);

      expect(teamMembers).toHaveLength(6);
      expect(teamMembers.every((member) => member === null)).toBe(true);
    });

    it("should handle existing team with array members", () => {
      const data: MigrationData = {
        id: "test",
        name: "Test",
        team: {
          members: [
            { headEncounterId: "loc1:head", bodyEncounterId: "loc1:body" },
            null,
            { headEncounterId: "loc2:head", bodyEncounterId: "loc2:body" },
          ],
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const result = migrateTeamField(data);
      const teamMembers = getTeamMembers(result);

      expect(teamMembers).toHaveLength(6);
      expect(teamMembers[0]).toEqual({
        headEncounterId: "loc1:head",
        bodyEncounterId: "loc1:body",
      });
      expect(teamMembers[1]).toBeNull();
      expect(teamMembers[2]).toEqual({
        headEncounterId: "loc2:head",
        bodyEncounterId: "loc2:body",
      });
      expect(teamMembers[3]).toBeNull();
      expect(teamMembers[4]).toBeNull();
      expect(teamMembers[5]).toBeNull();
    });

    it("should handle existing team with record members", () => {
      const data: MigrationData = {
        id: "test",
        name: "Test",
        team: {
          members: {
            0: { headEncounterId: "loc1:head", bodyEncounterId: "loc1:body" },
            2: { headEncounterId: "loc2:head", bodyEncounterId: "loc2:body" },
          },
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const result = migrateTeamField(data);
      const teamMembers = getTeamMembers(result);

      expect(teamMembers).toHaveLength(6);
      expect(teamMembers[0]).toEqual({
        headEncounterId: "loc1:head",
        bodyEncounterId: "loc1:body",
      });
      expect(teamMembers[1]).toBeNull();
      expect(teamMembers[2]).toEqual({
        headEncounterId: "loc2:head",
        bodyEncounterId: "loc2:body",
      });
      expect(teamMembers[3]).toBeNull();
      expect(teamMembers[4]).toBeNull();
      expect(teamMembers[5]).toBeNull();
    });

    it("should handle invalid team structure", () => {
      const data: MigrationData = {
        id: "test",
        name: "Test",
        team: { invalid: "structure" },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const result = migrateTeamField(data);
      const teamMembers = getTeamMembers(result);

      expect(teamMembers).toHaveLength(6);
      expect(teamMembers.every((member) => member === null)).toBe(true);
    });
  });

  describe("migrateVersion", () => {
    it("should add version when undefined", () => {
      const data: MigrationData = {
        id: "test",
        name: "Test",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const result = migrateVersion(data);

      expect(result.version).toBe("1.0.0");
    });

    it("should preserve existing version", () => {
      const data: MigrationData = {
        id: "test",
        name: "Test",
        version: "2.0.0",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const result = migrateVersion(data);

      expect(result.version).toBe("2.0.0");
    });
  });

  describe("cleanupRemixMode", () => {
    it("should remove remixMode field", () => {
      const data: MigrationData = {
        id: "test",
        name: "Test",
        remixMode: true,
        gameMode: "classic",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const result = cleanupRemixMode(data);

      expect(result.remixMode).toBeUndefined();
      expect(result.gameMode).toBe("classic");
      expect(result.id).toBe("test");
      expect(result.name).toBe("Test");
    });

    it("should handle data without remixMode", () => {
      const data: MigrationData = {
        id: "test",
        name: "Test",
        gameMode: "classic",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const result = cleanupRemixMode(data);

      expect(result.remixMode).toBeUndefined();
      expect(result.gameMode).toBe("classic");
    });
  });

  describe("migratePlaythrough", () => {
    it("should apply all migrations in sequence", () => {
      const data: MigrationData = {
        id: "test",
        name: "Test",
        remixMode: true,
        gameMode: "classic",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const result = migratePlaythrough(data);

      // Should have migrated remixMode to gameMode
      expect(result.gameMode).toBe("remix");
      expect(result.remixMode).toBeUndefined();

      // Should have added version
      expect(result.version).toBe("1.0.0");

      // Should have added team
      const teamMembers = getTeamMembers(result);
      expect(teamMembers).toHaveLength(6);
      expect(teamMembers.every((member) => member === null)).toBe(true);
    });

    it("should handle data that needs no migration", () => {
      const data: MigrationData = {
        id: "test",
        name: "Test",
        gameMode: "remix",
        version: "2.0.0",
        team: { members: Array.from({ length: 6 }, () => null) },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const result = migratePlaythrough(data);

      // Should preserve existing values
      expect(result.gameMode).toBe("remix");
      expect(result.version).toBe("2.0.0");
      expect(result.team).toBeDefined();
      expect(result.remixMode).toBeUndefined(); // Should still be cleaned up
    });
  });
});
