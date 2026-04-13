## ADDED Requirements

### Requirement: Combobox options signal previously captured species
The system MUST mark a Pokemon combobox option as a duplicate when the current playthrough already contains that species as a captured encounter.

#### Scenario: Duplicate species appears in option results
- **WHEN** a combobox option represents a species whose id already exists in the current playthrough with captured provenance
- **THEN** that option shows a visible duplicate indicator in its rendered row

#### Scenario: Species not yet captured stays unmarked
- **WHEN** a combobox option represents a species with no captured provenance in the current playthrough
- **THEN** that option renders without the duplicate indicator

### Requirement: Duplicate state uses canonical playthrough capture provenance
The system MUST derive combobox duplicate state from canonical playthrough encounter records, using stored capture provenance so later status changes do not remove duplicate visibility.

#### Scenario: Stored or deceased Pokemon still counts as duplicate
- **WHEN** a species was previously captured and later moved to another non-active status such as stored or deceased
- **THEN** combobox options for that species still render the duplicate indicator

#### Scenario: Non-captured provenance does not trigger duplicate state
- **WHEN** a playthrough contains a species only through non-captured provenance or no provenance data that indicates capture
- **THEN** combobox options for that species do not render the duplicate indicator

### Requirement: Duplicate indication preserves combobox behavior
The system MUST add duplicate signaling without changing option ordering, filtering, keyboard navigation, or selection behavior.

#### Scenario: Keyboard selection remains unchanged
- **WHEN** a user navigates combobox options with the keyboard and encounters duplicate-marked options
- **THEN** active-state movement, selection, and focus behavior match non-duplicate options

#### Scenario: Search and route ordering remain unchanged
- **WHEN** duplicate and non-duplicate options are shown together in a combobox result list
- **THEN** existing route-priority and search-result ordering rules remain unchanged
