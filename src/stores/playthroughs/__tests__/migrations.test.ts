import { describe, expect, it } from "vitest";
import {
  normalizeImportedPlaythrough,
  normalizePersistedPlaythrough,
} from "../migrations";
import { ImportedPlaythroughSchema } from "../types";

describe("Playthrough normalization", () => {
  it("repairs a legacy persisted shape without mutating its input", () => {
    const legacyData = {
      id: "",
      name: "",
      remixMode: true,
      gameMode: "classic",
      createdAt: Number.NaN,
      updatedAt: Number.POSITIVE_INFINITY,
      encounters: {
        route1: {
          head: {
            id: 25,
            name: "Pikachu",
            nationalDexId: 25,
            status: "stored",
            uid: "pikachu-route1",
          },
          body: {
            id: 4,
            name: "Charmander",
            nationalDexId: 4,
            status: "deceased",
            uid: "charmander-route1",
          },
          isFusion: true,
          updatedAt: 1_700_000_000,
          artworkVariant: "legacy-sprite-key",
        },
      },
      team: {
        members: {
          0: {
            headEncounterId: "route1:head",
            bodyEncounterId: "route1:body",
          },
        },
      },
    };

    const normalized = normalizePersistedPlaythrough(legacyData);

    expect(normalized.id).toMatch(/^playthrough_/);
    expect(normalized.name).toBe("Playthrough");
    expect(normalized.gameMode).toBe("remix");
    expect(normalized.version).toBe("1.0.0");
    expect(normalized.team.members[0]).toEqual({
      headPokemonUid: "",
      bodyPokemonUid: "",
    });
    expect(normalized.encounters?.route1).toEqual({
      head: {
        id: 25,
        name: "Pikachu",
        nationalDexId: 25,
        status: "stored",
        originalReceivalStatus: "captured",
        uid: "pikachu-route1",
      },
      body: {
        id: 4,
        name: "Charmander",
        nationalDexId: 4,
        status: "deceased",
        originalReceivalStatus: "captured",
        uid: "charmander-route1",
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
      id: "current",
      name: "Current Run",
      gameMode: "classic",
      version: "1.0.0",
      team: { members: [null, null, null, null, null, null] },
      encounters: {},
      createdAt: 1,
      updatedAt: 1,
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
        id: "legacy-import",
        name: "Legacy Import",
        remixMode: true,
        gameMode: "classic",
        team: {
          members: {
            0: {
              headEncounterId: "route1:head",
              bodyEncounterId: "route1:body",
            },
          },
        },
        encounters: {
          route1: {
            head: null,
            body: null,
            isFusion: false,
            updatedAt: 1,
            artworkVariant: "legacy-sprite-key",
          },
        },
        createdAt: 1,
        updatedAt: 1,
      },
    });

    const parsed = ImportedPlaythroughSchema.parse(normalizedImport);

    expect(parsed.playthrough.gameMode).toBe("remix");
    expect(parsed.playthrough.team.members[0]).toEqual({
      headPokemonUid: "",
      bodyPokemonUid: "",
    });
    expect(parsed.playthrough.encounters?.route1).toEqual({
      head: null,
      body: null,
      isFusion: false,
      updatedAt: 1,
    });
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
