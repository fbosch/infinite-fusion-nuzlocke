import { describe, it, expect, beforeAll } from 'vitest'
import fs from 'fs/promises'
import path from 'path'

interface Location {
  name: string
  routeId: number | null
  order: number
  region: string
  description: string
}

interface RouteEncounter {
  routeName: string
  pokemonIds: number[]
  routeId: number
}

describe('Data Integrity Tests', () => {
  let locations: Location[]
  let classicEncounters: RouteEncounter[]
  let remixEncounters: RouteEncounter[]

  beforeAll(async () => {
    const dataDir = path.join(process.cwd(), 'data')

    // Load all data files
    const [locationsData, classicData, remixData] = await Promise.all([
      fs.readFile(path.join(dataDir, 'locations.json'), 'utf-8'),
      fs.readFile(path.join(dataDir, 'route-encounters-classic.json'), 'utf-8'),
      fs.readFile(path.join(dataDir, 'route-encounters-remix.json'), 'utf-8')
    ])

    locations = JSON.parse(locationsData)
    classicEncounters = JSON.parse(classicData)
    remixEncounters = JSON.parse(remixData)
  })

  describe('Route Encounter Coverage', () => {
    it('should have encounter data for every location with a routeId in classic mode', () => {
      // Get all locations that have a routeId
      const locationsWithRouteId = locations.filter(loc => loc.routeId !== null)

      // Create a map of routeId to classic encounters for quick lookup
      const classicRouteIdMap = new Map<number, RouteEncounter>()
      classicEncounters.forEach(encounter => {
        classicRouteIdMap.set(encounter.routeId, encounter)
      })

      const missingEncounters: Location[] = []

      // Check each location with routeId
      locationsWithRouteId.forEach(location => {
        if (!classicRouteIdMap.has(location.routeId!)) {
          missingEncounters.push(location)
        }
      })

      if (missingEncounters.length > 0) {
        const missingDetails = missingEncounters.map(loc =>
          `- ${loc.name} (routeId: ${loc.routeId})`
        ).join('\n')

        throw new Error(
          `Missing classic encounter data for ${missingEncounters.length} location(s):\n${missingDetails}`
        )
      }

      expect(missingEncounters).toHaveLength(0)
    })

    it('should have encounter data for every location with a routeId in remix mode', () => {
      // Get all locations that have a routeId
      const locationsWithRouteId = locations.filter(loc => loc.routeId !== null)

      // Create a map of routeId to remix encounters for quick lookup
      const remixRouteIdMap = new Map<number, RouteEncounter>()
      remixEncounters.forEach(encounter => {
        remixRouteIdMap.set(encounter.routeId, encounter)
      })

      const missingEncounters: Location[] = []

      // Check each location with routeId
      locationsWithRouteId.forEach(location => {
        if (!remixRouteIdMap.has(location.routeId!)) {
          missingEncounters.push(location)
        }
      })

      if (missingEncounters.length > 0) {
        const missingDetails = missingEncounters.map(loc =>
          `- ${loc.name} (routeId: ${loc.routeId})`
        ).join('\n')

        throw new Error(
          `Missing remix encounter data for ${missingEncounters.length} location(s):\n${missingDetails}`
        )
      }

      expect(missingEncounters).toHaveLength(0)
    })

    it('should not have orphaned encounter data (encounters without corresponding locations)', () => {
      // Get all routeIds from locations
      const locationRouteIds = new Set(
        locations
          .filter(loc => loc.routeId !== null)
          .map(loc => loc.routeId!)
      )

      // Check classic encounters
      const orphanedClassicEncounters = classicEncounters.filter(
        encounter => !locationRouteIds.has(encounter.routeId)
      )

      // Check remix encounters  
      const orphanedRemixEncounters = remixEncounters.filter(
        encounter => !locationRouteIds.has(encounter.routeId)
      )

      const errors: string[] = []

      if (orphanedClassicEncounters.length > 0) {
        const orphanedDetails = orphanedClassicEncounters.map(enc =>
          `- ${enc.routeName} (routeId: ${enc.routeId})`
        ).join('\n')
        errors.push(`Orphaned classic encounters:\n${orphanedDetails}`)
      }

      if (orphanedRemixEncounters.length > 0) {
        const orphanedDetails = orphanedRemixEncounters.map(enc =>
          `- ${enc.routeName} (routeId: ${enc.routeId})`
        ).join('\n')
        errors.push(`Orphaned remix encounters:\n${orphanedDetails}`)
      }

      if (errors.length > 0) {
        throw new Error(errors.join('\n\n'))
      }

      expect(orphanedClassicEncounters).toHaveLength(0)
      expect(orphanedRemixEncounters).toHaveLength(0)
    })

    it('should have valid Pokemon IDs in all encounter tables', () => {
      const invalidClassicEncounters: string[] = []
      const invalidRemixEncounters: string[] = []

      // Check classic encounters
      classicEncounters.forEach(encounter => {
        if (!encounter.pokemonIds || encounter.pokemonIds.length === 0) {
          invalidClassicEncounters.push(
            `${encounter.routeName} (routeId: ${encounter.routeId}) has no Pokemon`
          )
        } else {
          encounter.pokemonIds.forEach(pokemonId => {
            if (!Number.isInteger(pokemonId) || pokemonId <= 0) {
              invalidClassicEncounters.push(
                `${encounter.routeName} (routeId: ${encounter.routeId}) has invalid Pokemon ID: ${pokemonId}`
              )
            }
          })
        }
      })

      // Check remix encounters
      remixEncounters.forEach(encounter => {
        if (!encounter.pokemonIds || encounter.pokemonIds.length === 0) {
          invalidRemixEncounters.push(
            `${encounter.routeName} (routeId: ${encounter.routeId}) has no Pokemon`
          )
        } else {
          encounter.pokemonIds.forEach(pokemonId => {
            if (!Number.isInteger(pokemonId) || pokemonId <= 0) {
              invalidRemixEncounters.push(
                `${encounter.routeName} (routeId: ${encounter.routeId}) has invalid Pokemon ID: ${pokemonId}`
              )
            }
          })
        }
      })

      const errors: string[] = []
      if (invalidClassicEncounters.length > 0) {
        errors.push(`Invalid classic encounters:\n${invalidClassicEncounters.join('\n')}`)
      }
      if (invalidRemixEncounters.length > 0) {
        errors.push(`Invalid remix encounters:\n${invalidRemixEncounters.join('\n')}`)
      }

      if (errors.length > 0) {
        throw new Error(errors.join('\n\n'))
      }

      expect(invalidClassicEncounters).toHaveLength(0)
      expect(invalidRemixEncounters).toHaveLength(0)
    })
  })

  describe('Data Consistency', () => {
    it('should have consistent routeId values between locations and encounters', () => {
      const locationRouteIds = new Set(
        locations
          .filter(loc => loc.routeId !== null)
          .map(loc => loc.routeId!)
      )

      const classicRouteIds = new Set(classicEncounters.map(enc => enc.routeId))
      const remixRouteIds = new Set(remixEncounters.map(enc => enc.routeId))

      // Check if all location routeIds exist in both encounter sets
      const missingInClassic = [...locationRouteIds].filter(id => !classicRouteIds.has(id))
      const missingInRemix = [...locationRouteIds].filter(id => !remixRouteIds.has(id))

      const errors: string[] = []
      if (missingInClassic.length > 0) {
        errors.push(`RouteIds missing in classic encounters: ${missingInClassic.join(', ')}`)
      }
      if (missingInRemix.length > 0) {
        errors.push(`RouteIds missing in remix encounters: ${missingInRemix.join(', ')}`)
      }

      if (errors.length > 0) {
        throw new Error(errors.join('\n'))
      }

      expect(missingInClassic).toHaveLength(0)
      expect(missingInRemix).toHaveLength(0)
    })

    it('should have unique routeIds in each encounter file', () => {
      // Check for duplicate routeIds in classic encounters
      const classicRouteIds: number[] = []
      const classicDuplicates: number[] = []

      classicEncounters.forEach(encounter => {
        if (classicRouteIds.includes(encounter.routeId)) {
          classicDuplicates.push(encounter.routeId)
        } else {
          classicRouteIds.push(encounter.routeId)
        }
      })

      // Check for duplicate routeIds in remix encounters
      const remixRouteIds: number[] = []
      const remixDuplicates: number[] = []

      remixEncounters.forEach(encounter => {
        if (remixRouteIds.includes(encounter.routeId)) {
          remixDuplicates.push(encounter.routeId)
        } else {
          remixRouteIds.push(encounter.routeId)
        }
      })

      const errors: string[] = []
      if (classicDuplicates.length > 0) {
        errors.push(`Duplicate routeIds in classic encounters: ${[...new Set(classicDuplicates)].join(', ')}`)
      }
      if (remixDuplicates.length > 0) {
        errors.push(`Duplicate routeIds in remix encounters: ${[...new Set(remixDuplicates)].join(', ')}`)
      }

      if (errors.length > 0) {
        throw new Error(errors.join('\n'))
      }

      expect(classicDuplicates).toHaveLength(0)
      expect(remixDuplicates).toHaveLength(0)
    })
  })
}) 