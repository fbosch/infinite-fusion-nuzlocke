import { describe, expect, it } from "vitest";
import { type PokemonOptionType, PokemonStatus } from "@/loaders/pokemon";
import { getSummaryCardDisplay } from "../summaryCardModel";

const pokemon = (
  id: number,
  status: PokemonOptionType["status"] = PokemonStatus.CAPTURED,
): PokemonOptionType => ({
  id,
  name: `Pokemon ${id}`,
  nationalDexId: id,
  status,
});

describe("getSummaryCardDisplay", () => {
  it("uses displayed IDs for a non-fusion Pokédex link", () => {
    const display = getSummaryCardDisplay({
      bodyPokemon: pokemon(1),
      headPokemon: pokemon(25),
      isFusion: false,
      isTeamMember: false,
    });

    expect(display.link).toBe("https://infinitefusiondex.com/details/25");
  });

  it("keeps requested team fusions visible even when one member is stored", () => {
    const display = getSummaryCardDisplay({
      bodyPokemon: pokemon(1, PokemonStatus.STORED),
      headPokemon: pokemon(25),
      isFusion: true,
      isTeamMember: true,
    });

    expect(display.displayPokemon).toMatchObject({ isFusion: true });
    expect(display.link).toBe("https://infinitefusiondex.com/details/25.1");
  });

  it("only marks a fusion deceased when both original members are deceased", () => {
    const display = getSummaryCardDisplay({
      bodyPokemon: pokemon(1),
      headPokemon: pokemon(25, PokemonStatus.DECEASED),
      isFusion: true,
      isTeamMember: false,
    });

    expect(display.isDeceased).toBe(false);
  });
});
