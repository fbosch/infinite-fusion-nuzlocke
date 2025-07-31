import { PokemonSchema } from '@/loaders/pokemon';
import { z } from 'zod';

export type Pokemon = z.infer<typeof PokemonSchema>;

export interface PokemonApiResponse {
  data: Pokemon[];
  count: number;
  total: number;
}

export interface PokemonApiParams {
  ids?: number[];
  search?: string;
  type?: string;
  limit?: number;
}

class PokemonApiService {
  private baseUrl: string;

  constructor() {
    // Use absolute URL in test environment, relative in browser
    this.baseUrl =
      typeof window === 'undefined'
        ? 'http://localhost:3000/api/pokemon'
        : '/api/pokemon';
  }

  private async makeRequest(
    params: PokemonApiParams = {}
  ): Promise<PokemonApiResponse> {
    const searchParams = new URLSearchParams();

    if (params.ids && params.ids.length > 0) {
      searchParams.append('ids', params.ids.join(','));
    }

    if (params.search) {
      searchParams.append('search', params.search);
    }

    if (params.type) {
      searchParams.append('type', params.type);
    }

    if (params.limit) {
      searchParams.append('limit', params.limit.toString());
    }

    const url = `${this.baseUrl}?${searchParams.toString()}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(
        `Pokemon API error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();

    // Validate the response
    const validatedData = z
      .object({
        data: z.array(PokemonSchema),
        count: z.number(),
        total: z.number(),
      })
      .safeParse(data);

    if (!validatedData.success) {
      console.error('Invalid API response:', validatedData.error.issues);
      throw new Error('Invalid API response format');
    }

    return validatedData.data;
  }

  async getAllPokemon(): Promise<Pokemon[]> {
    const response = await this.makeRequest();
    return response.data;
  }

  async getPokemonByIds(ids: number[]): Promise<Pokemon[]> {
    const response = await this.makeRequest({ ids });
    return response.data;
  }

  async getPokemonById(id: number): Promise<Pokemon | null> {
    const response = await this.makeRequest({ ids: [id] });
    return response.data[0] || null;
  }

  async searchPokemon(query: string, limit?: number): Promise<Pokemon[]> {
    const response = await this.makeRequest({ search: query, limit });
    return response.data;
  }

  async getPokemonByType(type: string): Promise<Pokemon[]> {
    const response = await this.makeRequest({ type });
    return response.data;
  }

  async getPokemonCount(): Promise<number> {
    const response = await this.makeRequest({ limit: 1 });
    return response.total;
  }
}

// Export a singleton instance
const pokemonApiService = new PokemonApiService();
export default pokemonApiService;
