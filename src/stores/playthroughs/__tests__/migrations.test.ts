import { describe, expect, it } from "vitest";
import { ImportedPlaythroughSchema } from "../importSchema";
import {
  normalizeImportedPlaythrough,
  normalizePersistedPlaythrough,
} from "../migrations";

describe("Playthrough normalization", () => {
  it("repairs a legacy persisted shape without mutating its input", () => {
    const legacyData = {
      createdAt: Number.NaN,
      encounters: {
        route1: {
          artworkVariant: "legacy-sprite-key",
          body: {
            id: 4,
            name: "Charmander",
            nationalDexId: 4,
            status: "deceased",
            uid: "charmander-route1",
          },
          head: {
            id: 25,
            name: "Pikachu",
            nationalDexId: 25,
            status: "stored",
            uid: "pikachu-route1",
          },
          isFusion: true,
          updatedAt: 1_700_000_000,
        },
      },
      gameMode: "classic",
      id: "",
      name: "",
      remixMode: true,
      team: {
        members: {
          0: {
            bodyEncounterId: "route1:body",
            headEncounterId: "route1:head",
          },
        },
      },
      updatedAt: Number.POSITIVE_INFINITY,
    };

    const normalized = normalizePersistedPlaythrough(legacyData);

    expect(normalized.id).toMatch(/^playthrough_/);
    expect(normalized.name).toBe("Playthrough");
    expect(normalized.gameMode).toBe("remix");
    expect(normalized.version).toBe("1.0.0");
    expect(normalized.team.members[0]).toEqual({
      bodyPokemonUid: "",
      headPokemonUid: "",
    });
    expect(normalized.encounters?.route1).toEqual({
      body: {
        id: 4,
        name: "Charmander",
        nationalDexId: 4,
        originalReceivalStatus: "captured",
        status: "deceased",
        uid: "charmander-route1",
      },
      head: {
        id: 25,
        name: "Pikachu",
        nationalDexId: 25,
        originalReceivalStatus: "captured",
        status: "stored",
        uid: "pikachu-route1",
      },
      isFusion: true,
      updatedAt: 1_700_000_000,
    });
    expect(legacyData.encounters.route1.artworkVariant).toBe(
      "legacy-sprite-key",
    );
    expect(legacyData.encounters.route1.head).not.toHaveProperty(
      "originalReceivalStatus",
    );
  });

  it("is idempotent for a current Playthrough and preserves classic mode", () => {
    const current = {
      createdAt: 1,
      encounters: {},
      gameMode: "classic",
      id: "current",
      name: "Current Run",
      team: { members: [null, null, null, null, null, null] },
      updatedAt: 1,
      version: "1.0.0",
    };

    const normalized = normalizePersistedPlaythrough(current);

    expect(normalized).toEqual(current);
    expect(normalizePersistedPlaythrough(normalized)).toEqual(normalized);
    expect(normalized).not.toBe(current);
  });

  it("retains the current recovery behavior for malformed persisted data", () => {
    const normalized = normalizePersistedPlaythrough(null);

    expect(normalized.id).toMatch(/^playthrough_/);
    expect(normalized.name).toBe("Playthrough");
    expect(normalized.gameMode).toBe("classic");
    expect(normalized.team.members).toEqual([
      null,
      null,
      null,
      null,
      null,
      null,
    ]);
  });

  it("normalizes a legacy import envelope before validating its current shape", () => {
    const normalizedImport = normalizeImportedPlaythrough({
      exportedAt: "2026-05-11T00:00:00.000Z",
      playthrough: {
        createdAt: 1,
        encounters: {
          route1: {
            artworkVariant: "legacy-sprite-key",
            body: null,
            head: null,
            isFusion: false,
            updatedAt: 1,
          },
        },
        gameMode: "classic",
        id: "legacy-import",
        name: "Legacy Import",
        remixMode: true,
        team: {
          members: {
            0: {
              bodyEncounterId: "route1:body",
              headEncounterId: "route1:head",
            },
          },
        },
        updatedAt: 1,
      },
    });

    const parsed = ImportedPlaythroughSchema.parse(normalizedImport);

    expect(parsed.playthrough.gameMode).toBe("remix");
    expect(parsed.playthrough.team.members[0]).toEqual({
      bodyPokemonUid: "",
      headPokemonUid: "",
    });
    expect(parsed.playthrough.encounters?.route1).toEqual({
      body: null,
      head: null,
      isFusion: false,
      updatedAt: 1,
    });
  });

  it.each(["team", "gameMode", "version"] as const)(
    "fills a missing %s in an import without remixMode",
    (field) => {
      const legacyImport = {
        playthrough: {
          createdAt: 1,
          gameMode: "classic",
          id: "legacy-import",
          name: "Legacy Import",
          team: { members: [null, null, null, null, null, null] },
          updatedAt: 1,
          version: "1.0.0",
        },
      };
      delete legacyImport.playthrough[field];

      expect(() =>
        ImportedPlaythroughSchema.parse(
          normalizeImportedPlaythrough(legacyImport),
        ),
      ).not.toThrow();
    },
  );

  it("rejects malformed nested persisted data after migration", () => {
    const validPlaythrough = {
      createdAt: 1,
      encounters: {},
      gameMode: "classic",
      id: "current",
      name: "Current Run",
      team: { members: [null, null, null, null, null, null] },
      updatedAt: 1,
      version: "1.0.0",
    };

    expect(() =>
      normalizePersistedPlaythrough({
        ...validPlaythrough,
        customLocations: ["invalid"],
      }),
    ).toThrow("Invalid persisted playthrough");
    expect(() =>
      normalizePersistedPlaythrough({
        ...validPlaythrough,
        encounters: { route1: { body: null, head: null } },
      }),
    ).toThrow("Invalid persisted playthrough");
    expect(() =>
      normalizePersistedPlaythrough({
        ...validPlaythrough,
        team: { members: ["invalid", null, null, null, null, null] },
      }),
    ).toThrow("Invalid persisted playthrough");
  });

  it("leaves malformed import envelopes for their adapter to reject", () => {
    const malformedImport = {
      exportedAt: "2026-05-11T00:00:00.000Z",
      playthrough: null,
    };

    const normalizedImport = normalizeImportedPlaythrough(malformedImport);

    expect(normalizedImport).toBe(malformedImport);
    expect(() => ImportedPlaythroughSchema.parse(normalizedImport)).toThrow();
  });
});
