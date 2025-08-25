# Team Management Implementation Plan

## Overview

This document outlines the plan for implementing proper team management functionality in the Infinite Fusion Nuzlocke tracker. The current implementation has basic team display but lacks proper team management capabilities.

## Current State

### What's Already Implemented

- Basic team display in PC sheet with tabs (Team, Box, Graveyard)
- Team size limit validation (shows warning when > 6 Pokémon)
- Fusion support in team counting (fusions count as 1, non-fusions count head/body separately)
- Basic team member display with location information
- Team member status tracking (active, stored, deceased)

### What's Missing

- Team management actions (add/remove from team)
- Team validation and enforcement
- Team member reordering
- Team member status changes
- Proper team state management
- Team member details (levels, moves, etc.)

### Current Problem: Team Status Inference

**Critical Issue**: The current system infers team membership by checking encounter status values (`isPokemonActive`, `isPokemonStored`, `isPokemonDeceased`). This approach is:

- Fragile and error-prone
- Difficult to manage team composition
- Hard to implement team actions
- Not scalable for advanced team features

**Solution**: Implement a dedicated team member collection in the playthrough schema that explicitly tracks team composition.

## Implementation Requirements

### 1. Team State Management

#### Data Structure Updates

- Add `team` array to `Playthrough` type
- Add `teamMember` type for individual team members
- Add team validation rules
- **Replace encounter status inference with explicit team management**
- **New explicit team system will be the default for everyone**
- **Feature flag for optional encounter movement between locations**

```typescript
// New types needed
interface TeamMember {
  id: string;
  headEncounterId: string; // Reference to head encounter slot
  bodyEncounterId: string; // Reference to body encounter slot
  position: number; // Team position (0-5)
  // Note: Nickname is inferred from head slot encounter
  // Note: Status is inferred from the referenced encounters
  // Note: Moves, level, and other Pokémon data come from the referenced encounters
}

interface Team {
  members: TeamMember[];
  // Note: maxSize is always 6, isFull can be derived from members.length
}

// Updated Playthrough schema
interface Playthrough {
  id: string;
  name: string;
  encounters: Record<string, EncounterData>;
  team: Team; // NEW: Dedicated team collection (required)
  allowEncounterMovement: boolean; // Feature flag for moving encounters between locations
  gameMode: GameMode;
  // ... other fields
}
```

**Key Design Principle**: Team members reference encounter slots directly, with nickname and status inferred from those encounters. This maintains data consistency while providing explicit team structure.

**Simplified Team Logic**:

- Team size limit is always 6 (hardcoded constant)
- `isFull` can be computed as `team.members.length >= 6`
- No need to store derived values
- Status is computed from encounter data: `getTeamMemberStatus(teamMember, encounters)`
- Nickname is computed from head slot: `getTeamMemberNickname(teamMember, encounters)`

**Status and Nickname Inference**:

```typescript
function getTeamMemberStatus(
  teamMember: TeamMember,
  encounters: Record<string, EncounterData>
): 'active' | 'fainted' | 'boxed' {
  const headEncounter = encounters[teamMember.headEncounterId];
  const bodyEncounter = encounters[teamMember.bodyEncounterId];

  // Status logic based on encounter data
  if (
    isPokemonActive(headEncounter?.head) ||
    isPokemonActive(bodyEncounter?.body)
  ) {
    return 'active';
  } else if (
    isPokemonDeceased(headEncounter?.head) ||
    isPokemonDeceased(bodyEncounter?.body)
  ) {
    return 'fainted';
  } else {
    return 'boxed';
  }
}

function getTeamMemberNickname(
  teamMember: TeamMember,
  encounters: Record<string, EncounterData>
): string {
  const headEncounter = encounters[teamMember.headEncounterId];
  return (
    headEncounter?.head?.nickname || headEncounter?.head?.name || 'Unknown'
  );
}
```

**Team Member Selection Logic**:

- **Fused Encounters**: Can select from encounters that are already fused on a route
- **Individual Pokémon**: Can select from individual head/body slots, excluding those already used in other team slots
- **Validation**: Prevent duplicate usage of the same encounter slot across team members
- **Fusion Support**: Handle both fused and unfused Pokémon combinations

**Migration Strategy**: Replace encounter-based team inference with explicit team management for all users.

**Feature Flag Purpose**: The `allowEncounterMovement` flag controls whether users can move Pokémon encounters between different locations, which is separate from the core team management system.

#### Schema Migration Strategy

1. **Phase 1**: Add new team field to schema and implement migration logic
2. **Phase 2**: Migrate all existing playthroughs to use explicit team system
3. **Phase 3**: Remove old encounter-based team logic entirely
4. **Phase 4**: Update all UI components to use new team system

#### Store Updates

- Add team actions to playthrough store
- Implement team validation
- Add team persistence
- **Replace encounter-based team logic with explicit team management**
- **Migrate existing data to new system**

### 2. Team Management Actions

#### Core Actions

- **Add to Team**: Move Pokémon from box to team
- **Remove from Team**: Move Pokémon from team to box
- **Reorder Team**: Change team member positions
- **Faint Pokémon**: Mark Pokémon as fainted (move to graveyard)
- **Heal Pokémon**: Restore fainted Pokémon (if allowed by rules)

#### Validation Rules

- Team size cannot exceed 6 Pokémon
- All team members must have nicknames
- Fainted Pokémon cannot be in active team
- Team must be valid before saving
- **Team members must reference valid encounters**

### 3. UI Components

#### Team Management Interface

- **Team Builder**: Drag-and-drop interface for building team
- **Team Member Card**: Detailed view of each team member
- **Team Status**: Visual indicators for team health and status
- **Team Actions**: Buttons for team management actions

#### Team Member Details

- **Level Display**: Show current level
- **Move List**: Display learned moves
- **Status Indicators**: Visual status (healthy, poisoned, etc.)
- **Evolution Status**: Show evolution progress

### 4. Team Validation

#### Business Rules

- **Size Limit**: Maximum 6 Pokémon in team
- **Nickname Requirement**: All team members must have nicknames
- **Status Validation**: Only healthy Pokémon can be in active team
- **Fusion Rules**: Proper fusion counting and validation
- **Reference Integrity**: Team members must reference valid encounters

#### Error Handling

- Clear error messages for validation failures
- Prevention of invalid team states
- Graceful degradation when team is invalid

## Implementation Phases

### Phase 1: Core Team State

- [ ] Update data types and schemas
- [ ] Add team field to Playthrough schema (optional)
- [ ] Implement team state management
- [ ] Add basic team validation
- [ ] Update persistence layer
- [ ] **Create migration logic for existing data**

### Phase 2: Team Management Actions

- [ ] Implement add/remove team actions
- [ ] Add team reordering functionality
- [ ] Implement team member status changes
- [ ] Add team validation enforcement
- [ ] **Migrate existing encounter-based team logic**

### Phase 3: Enhanced UI

- [ ] Create team builder interface
- [ ] Add team member detail views
- [ ] Implement drag-and-drop reordering
- [ ] Add team status indicators
- [ ] **Remove old inference-based team display**

### Phase 4: Advanced Features

- [ ] **Team weakness/resistance analysis** - Show type coverage and vulnerabilities
- [ ] Remove: Team templates and presets (not needed)
- [ ] Remove: Team analysis and suggestions (not needed)
- [ ] Remove: Team export/import functionality (not needed)
- [ ] Remove: Team history tracking (not needed)

## Technical Considerations

### Performance

- Efficient team state updates
- Minimal re-renders during team changes
- Optimized team validation
- **Direct team queries instead of encounter filtering**
- **Efficient type analysis calculations**

### Data Consistency

- Ensure team state is always valid
- Handle edge cases (e.g., Pokémon deletion)
- Maintain referential integrity
- **Keep team and encounter data synchronized**

### User Experience

- Intuitive team management interface
- Clear feedback for all actions
- Smooth animations and transitions
- Mobile-friendly design

## Testing Requirements

### Unit Tests

- Team validation logic
- Team management actions
- Team state management
- Team persistence
- **Migration logic for existing data**
- **Type analysis calculations**

### Integration Tests

- Team creation and modification
- Team validation enforcement
- Team persistence and recovery
- Team-encounter synchronization
- **Type coverage analysis accuracy**

### User Acceptance Tests

- Team building workflow
- Team management actions
- Error handling scenarios
- Performance with large teams
- **Data migration from old system**
- **Type analysis usefulness**

## Success Criteria

### Functional Requirements

- [ ] Users can add/remove Pokémon from team
- [ ] Team size limit is enforced
- [ ] Team validation prevents invalid states
- [ ] Team changes are persisted correctly
- [ ] Team reordering works smoothly
- [ ] **Team membership is explicit, not inferred**
- [ ] **Type weakness analysis provides useful insights**

### Non-Functional Requirements

- [ ] Team management is responsive (< 100ms for actions)
- [ ] Team validation is accurate and helpful
- [ ] UI is intuitive and accessible
- [ ] Team data is consistent and reliable
- [ ] **Team queries are efficient and direct**
- [ ] **Type analysis is fast and accurate**

## Future Enhancements

### Advanced Team Features

- **Team Type Analysis**: Weakness/resistance coverage analysis

## Conclusion

This implementation plan provides a roadmap for building comprehensive team management functionality. The phased approach allows for incremental development and testing while ensuring core functionality is solid before adding advanced features.

**The key insight is moving away from inferring team status from encounter data to maintaining a dedicated team collection.** This will result in a robust and user-friendly team management system that enhances the Nuzlocke tracking experience.

**Focus on essential features**: Team management, validation, and type analysis. Avoid unnecessary complexity that doesn't add value to the Nuzlocke experience.

The key is to start with solid data structures and validation, then build the UI and user experience on top of that foundation. This will result in a robust and user-friendly team management system that enhances the Nuzlocke tracking experience.
