// Pokemon Search Web Worker using Comlink
// Load Comlink and Fuse.js from local files
importScripts('/comlink.js');
importScripts('/fuse.min.js');

let fuse = null;
let pokemonData = null;

const searchWorker = {
  initialize(pokemonList) {
    pokemonData = pokemonList;

    const fuseOptions = {
      keys: ['name'],
      threshold: 0.3,
      includeScore: true,
      minMatchCharLength: 2,
      shouldSort: true,
    };

    fuse = new Fuse(pokemonData, fuseOptions);
    return pokemonData.length;
  },

  search(query) {
    if (!fuse || !query?.trim()) {
      return [];
    }

    // Check if query is numeric (for ID searches)
    if (/^\d+$/.test(query.trim())) {
      const queryNum = parseInt(query, 10);
      return pokemonData
        .filter(p => p.id === queryNum || p.nationalDexId === queryNum)
        .map(p => ({ ...p, score: 0 }));
    }

    // Fuzzy search for names
    return fuse.search(query).map(result => ({
      ...result.item,
      score: result.score || 0
    }));
  }
};

Comlink.expose(searchWorker); 