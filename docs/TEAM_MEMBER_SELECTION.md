# Team Member Selection Feature

## Overview

The team member selection feature allows users to add Pokémon to their team from available encounters at different locations. This feature integrates with the existing encounter system and team management.

## How It Works

### 1. Team Slots Display

- Empty team slots are displayed as clickable buttons with a "Click to add" label
- Filled slots show the current team member with their fusion sprite
- Hover effects provide visual feedback for interactive elements

### 2. Team Member Selection Modal

When clicking on an empty team slot, a modal opens with:

- **Location Selection Panel (Left)**: Lists all locations with available encounters
- **Encounter Selection Panel (Right)**: Shows available Pokémon for the selected location
- **Search and Filters**: Search by Pokémon name, filter by fusion type
- **Encounter Details**: Pokémon sprite, name, national dex number, and encounter sources

### 3. Adding Team Members

1. Click on an empty team slot
2. Select a location from the left panel
3. Choose a Pokémon from the available encounters
4. The system automatically:
   - Creates an encounter record for the selected location
   - Adds the Pokémon to the team at the selected position
   - Closes the modal

## Technical Implementation

### Components

- `TeamSlots`: Main team display component with clickable empty slots
- `TeamMemberSelectionModal`: Modal for selecting team members from encounters

### Data Flow

1. **Location Data**: Fetches available locations with encounters using `getLocationsWithEncounters()`
2. **Encounter Data**: Uses `useEncountersForLocation()` hook to get Pokémon for selected locations
3. **Team Management**: Integrates with existing `updateEncounter()` and `addToTeam()` functions

### Key Functions

- `updateEncounter()`: Creates encounter records in the playthrough
- `addToTeam()`: Adds encounters to team positions
- `getLocationsWithEncounters()`: Retrieves location data with available encounters

## User Experience Features

### Visual Feedback

- Hover effects on empty slots
- Clear "Click to add" instruction text
- Loading states during data fetching
- Responsive design for different screen sizes

### Search and Filtering

- Real-time search by Pokémon name
- Filter options for fusion vs non-fusion encounters
- Encounter source information display

### Accessibility

- Proper ARIA labels and keyboard navigation
- Screen reader friendly interface
- High contrast design for both light and dark themes

## Future Enhancements

### Planned Features

- **Team Validation**: Check for duplicate Pokémon or invalid team compositions
- **Level Requirements**: Ensure team members meet level requirements
- **Evolution Tracking**: Track evolution states and requirements
- **Team Stats**: Display team statistics and weaknesses

### Potential Improvements

- **Drag and Drop**: Allow reordering team members by dragging
- **Bulk Operations**: Add multiple team members at once
- **Team Templates**: Save and load team configurations
- **Export/Import**: Share team configurations between users

## Usage Examples

### Basic Team Building

```typescript
// User clicks empty slot
// Modal opens showing available locations
// User selects "Route 1"
// Modal shows available encounters: Pidgey, Rattata, etc.
// User selects Pidgey
// Pidgey is added to the team at the selected position
```

### Advanced Team Management

```typescript
// User has existing team members
// Clicks on different empty slot
// Can see which encounters are already used
// System prevents duplicate encounters
// User can build diverse team from different locations
```

## Integration Points

### Existing Systems

- **Encounter System**: Leverages current encounter data and management
- **Team Store**: Integrates with Valtio-based state management
- **Location Data**: Uses existing location and encounter APIs
- **Pokémon Data**: Connects to Pokémon database and sprite system

### Data Persistence

- Team changes are automatically saved to IndexedDB
- Encounter records are created and stored with the playthrough
- All changes trigger automatic save operations

## Error Handling

### Common Scenarios

- **No Encounters Available**: Shows appropriate message when location has no encounters
- **Network Issues**: Graceful fallback for data loading failures
- **Invalid Selections**: Prevents adding invalid team members
- **Storage Errors**: Handles save failures gracefully

### User Feedback

- Loading indicators during data fetching
- Error messages for failed operations
- Success confirmations for completed actions
- Clear instructions for user actions

## Testing

### Component Testing

- Unit tests for modal functionality
- Integration tests for team management
- User interaction testing
- Error scenario testing

### Data Validation

- Encounter data integrity checks
- Team composition validation
- Location data verification
- Save/load operation testing
