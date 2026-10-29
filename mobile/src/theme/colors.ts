// Field Survey Expedition Log / Tech Logbook Design Tokens
// Derived from stitch_skillradar_tech_logbook/field_survey_expedition_log/DESIGN.md

export const Colors = {
  // Physical Paper Grounds & Surfaces
  background: '#FFF9EB',             // Global canvas ground (unbleached rag paper)
  canvas: '#F1EBDD',                 // Masthead / Page ground
  surface: '#F7F2E7',                // Specimen card surface slip
  surfaceElevated: '#F7F2E7',
  surfaceContainer: '#EAE3D2',       // Telemetry & reason highlight box
  surfaceContainerLow: '#F9F3E5',
  surfaceContainerHigh: '#EEE8DA',
  surfaceContainerHighest: '#E8E2D4',
  surfaceContainerLowest: '#FFFFFF',

  // Structural Carbon Ink
  ink: '#1B1A17',                    // Solid carbon ink for borders, primary text, hard shadows
  border: '#1B1A17',
  borderLight: '#CFC6B0',            // Faded ruled lines & guidelines
  rule: '#CFC6B0',

  // Spot Inks & Accents
  primary: '#D9411E',                // Signal Vermilion (primary action stamps, active blips)
  primaryDark: '#B12401',
  primaryMuted: 'rgba(217, 65, 30, 0.12)',
  primaryHover: '#B12401',

  moss: '#4F6B4A',                   // Field Moss (verified, live, mastered competencies)
  emerald: '#4F6B4A',
  emeraldMuted: 'rgba(79, 107, 74, 0.15)',

  ochre: '#C99A2E',                  // Expedition Ochre (marginalia, draft/demo stamps)
  amber: '#C99A2E',
  amberMuted: 'rgba(201, 154, 46, 0.15)',

  rose: '#BA1A1A',                   // Warning / Dismiss / Error
  roseMuted: 'rgba(186, 26, 26, 0.12)',

  cyan: '#D9411E',                   // Replaced electric cyan with Signal Vermilion

  // Typography Inks
  text: '#1B1A17',                   // High contrast carbon text
  textSecondary: '#605E5A',          // Metadata, labels, secondary inscriptions
  secondaryText: '#605E5A',          // Alias for secondary inscriptions
  textMuted: '#8F7069',              // Marginalia, placeholders

  // Rubber-Stamp Badges
  badgeLive: '#4F6B4A',
  badgeLiveBg: 'transparent',
  badgeDemo: '#C99A2E',
  badgeDemoBg: 'transparent',
  badgeNew: '#1B1A17',
  badgeNewBg: 'transparent',
  badgeEmerging: '#D9411E',
  badgeEmergingBg: '#D9411E',
};

export const Fonts = {
  serif: 'serif',
  mono: 'monospace',
};
