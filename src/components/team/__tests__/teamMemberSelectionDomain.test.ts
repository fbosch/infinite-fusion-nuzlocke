import { describe, expect, it } from "vitest";
import { type PokemonOptionType, PokemonStatus } from "@/loaders/pokemon";
import {
  filterAvailableTeamPokemon,
  flipTeamPokemonSelection,
  getTeamNicknameUpdate,
  getTeamSelectionNickname,
  initializeExistingTeamMemberSelection,
  selectTeamPokemon,
} from "../teamMemberSelectionDomain";

const pokemon = (uid: string, nickname?: string): PokemonOptionType => ({
  id: 25,
  name: "Pikachu",
  nationalDexId: 25,
  nickname,
  uid,
});

describe("team member selection domain", () => {
  it("prioritizes head nickname for fusion selections", () => {
    expect(
      getTeamSelectionNickname(
        pokemon("head", "Sparky"),
        pokemon("body", "Flame"),
      ),
    ).toBe("Sparky");
  });

  it("falls back to body nickname when head has none", () => {
    expect(
      getTeamSelectionNickname(pokemon("head"), pokemon("body", "Flame")),
    ).toBe("Flame");
  });

  it("falls back to body nickname when head nickname is blank", () => {
    expect(
      getTeamSelectionNickname(pokemon("head", ""), pokemon("body", "Flame")),
    ).toBe("Flame");
  });

  it("returns empty nickname when no selected pokemon has one", () => {
    expect(getTeamSelectionNickname(pokemon("head"), pokemon("body"))).toBe("");
    expect(getTeamSelectionNickname(null, null)).toBe("");
  });

  it("flips selections and uses the new head nickname", () => {
    const head = { locationId: "route-1", pokemon: pokemon("head", "Sparky") };
    const body = { locationId: "route-2", pokemon: pokemon("body", "Flame") };

    expect(flipTeamPokemonSelection(head, body)).toEqual({
      nickname: "Flame",
      previewNickname: "Flame",
      selectedBody: head,
      selectedHead: body,
    });
  });

  it("clears the nickname when flipping unnamed or empty selections", () => {
    expect(
      flipTeamPokemonSelection(
        { locationId: "route-1", pokemon: pokemon("head") },
        null,
      ),
    ).toMatchObject({
      nickname: "",
      previewNickname: "",
      selectedHead: null,
    });
    expect(flipTeamPokemonSelection(null, null).nickname).toBe("");
  });

  it("updates the head nickname before the body nickname", () => {
    expect(
      getTeamNicknameUpdate(
        pokemon("head", "Sparky"),
        pokemon("body", "Flame"),
        "Fusion",
      ),
    ).toEqual({ nickname: "Fusion", uid: "head" });
  });

  it("updates the body nickname for body-only selections", () => {
    expect(getTeamNicknameUpdate(null, pokemon("body"), "Flame")).toEqual({
      nickname: "Flame",
      uid: "body",
    });
  });

  it("skips unchanged and unaddressable nickname updates", () => {
    expect(
      getTeamNicknameUpdate(pokemon("head", "Sparky"), null, "Sparky"),
    ).toBeNull();
    expect(
      getTeamNicknameUpdate(
        { ...pokemon("head"), uid: undefined },
        null,
        "Sparky",
      ),
    ).toBeNull();
  });

  it("initializes existing slots from identity-resolved encounter selections", () => {
    const resolvedHead = {
      locationId: "route-1",
      pokemon: pokemon("head", "Encounter Nickname"),
    };
    const resolvedBody = {
      locationId: "route-2",
      pokemon: pokemon("body", "Body Nickname"),
    };
    const selection = initializeExistingTeamMemberSelection(
      {
        bodyPokemon: pokemon("body"),
        headPokemon: pokemon("head", "Stale Nickname"),
        isEmpty: false,
      },
      (uid) =>
        uid === "head" ? resolvedHead : uid === "body" ? resolvedBody : null,
    );

    expect(selection).toMatchObject({
      nickname: "Encounter Nickname",
      previewNickname: "Encounter Nickname",
      selectedBody: resolvedBody,
      selectedHead: resolvedHead,
      suggestedActiveSlot: null,
    });
  });

  it("suggests the missing head slot for body-only members", () => {
    const selection = initializeExistingTeamMemberSelection(
      { bodyPokemon: pokemon("body"), isEmpty: false },
      () => null,
    );

    expect(selection.suggestedActiveSlot).toBe("head");
  });

  it("filters unavailable, inactive, and deceased Pokemon while retaining edited members", () => {
    const selection = (uid: string, status?: PokemonOptionType["status"]) => ({
      locationId: `${uid}-location`,
      pokemon: { ...pokemon(uid), status },
    });
    const available = filterAvailableTeamPokemon(
      [
        selection("current", PokemonStatus.CAPTURED),
        selection("other", PokemonStatus.CAPTURED),
        selection("eligible", PokemonStatus.CAPTURED),
        selection("missed", PokemonStatus.MISSED),
        selection("deceased", PokemonStatus.DECEASED),
        selection("missing-status"),
      ],
      [
        { headPokemonUid: "current" },
        { bodyPokemonUid: "other", headPokemonUid: "current" },
      ],
      0,
      { headPokemon: pokemon("current"), isEmpty: false },
    );

    expect(available.map(({ pokemon }) => pokemon.uid)).toEqual([
      "current",
      "eligible",
    ]);
  });

  it("selects head pokemon and advances to body when body is empty", () => {
    const selected = selectTeamPokemon({
      activeSlot: "head",
      locationId: "route1",
      nickname: "",
      pokemon: pokemon("head", "Sparky"),
      previewNickname: "",
      selectedBody: null,
      selectedHead: null,
    });

    expect(selected.selectedHead?.pokemon.uid).toBe("head");
    expect(selected.selectedHead?.locationId).toBe("route1");
    expect(selected.selectedBody).toBeNull();
    expect(selected.activeSlot).toBe("body");
    expect(selected.nickname).toBe("Sparky");
    expect(selected.previewNickname).toBe("Sparky");
  });

  it("selects body pokemon while preserving head nickname priority", () => {
    const selected = selectTeamPokemon({
      activeSlot: "body",
      locationId: "route2",
      nickname: "Sparky",
      pokemon: pokemon("body", "Flame"),
      previewNickname: "Sparky",
      selectedBody: null,
      selectedHead: {
        locationId: "route1",
        pokemon: pokemon("head", "Sparky"),
      },
    });

    expect(selected.selectedHead?.pokemon.uid).toBe("head");
    expect(selected.selectedBody?.pokemon.uid).toBe("body");
    expect(selected.selectedBody?.locationId).toBe("route2");
    expect(selected.activeSlot).toBe("body");
    expect(selected.nickname).toBe("Sparky");
  });

  it("unselects an already selected head pokemon", () => {
    const selected = selectTeamPokemon({
      activeSlot: "body",
      locationId: "route1",
      nickname: "Sparky",
      pokemon: pokemon("head", "Sparky"),
      previewNickname: "Sparky",
      selectedBody: {
        locationId: "route2",
        pokemon: pokemon("body", "Flame"),
      },
      selectedHead: {
        locationId: "route1",
        pokemon: pokemon("head", "Sparky"),
      },
    });

    expect(selected.selectedHead).toBeNull();
    expect(selected.selectedBody?.pokemon.uid).toBe("body");
    expect(selected.activeSlot).toBe("head");
    expect(selected.nickname).toBe("");
  });

  it("keeps current state when selecting a new pokemon without an active slot", () => {
    const selected = selectTeamPokemon({
      activeSlot: null,
      locationId: "route3",
      nickname: "Custom Fusion",
      pokemon: pokemon("new", "Leaf"),
      previewNickname: "Custom Fusion",
      selectedBody: {
        locationId: "route2",
        pokemon: pokemon("body", "Flame"),
      },
      selectedHead: {
        locationId: "route1",
        pokemon: pokemon("head", "Sparky"),
      },
    });

    expect(selected.selectedHead?.pokemon.uid).toBe("head");
    expect(selected.selectedBody?.pokemon.uid).toBe("body");
    expect(selected.activeSlot).toBeNull();
    expect(selected.nickname).toBe("Custom Fusion");
  });
});
