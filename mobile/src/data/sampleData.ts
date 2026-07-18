// Placeholder fixtures mirroring the design prototype's sample content.
// Finds/library/map/profile screens will be wired to the real API in a
// later pass — Score/Detail are already live (see lib/api.ts).

export const sampleFeatures = [
  { icon: '★', text: 'Shelling Score for any beach' },
  { icon: '📍', text: 'Log and map your finds' },
  { icon: '📖', text: 'Identify shells with the library' },
];

export const sampleBeachOptions = [
  { name: 'Captiva Island', sub: 'Lee County, FL' },
  { name: "Bowman's Beach", sub: 'Sanibel, FL' },
  { name: 'Marco Island', sub: 'Collier County, FL' },
];

export const sampleMapFinds = [
  { icon: '🐚', bg: '#F5E6E8', name: 'Junonia', sub: '~0.3 mi · 2h ago', badge: 'rare' as const },
  { icon: '🐚', bg: '#EDF3F2', name: 'Lightning Whelk', sub: '~0.5 mi · 4h ago', badge: 'uncommon' as const },
  { icon: '🐚', bg: null, name: 'Sand Dollar', sub: '~0.8 mi · 6h ago', badge: 'common' as const },
];

export const sampleLibraryShells = [
  { bg: '#F5E6E8', name: 'Junonia', sci: 'Scaphella junonia', badge: 'rare' as const },
  { bg: '#EDF3F2', name: 'Lightning Whelk', sci: 'Sinistrofulgur perversum', badge: 'uncommon' as const },
  { bg: null, name: 'Sand Dollar', sci: 'Mellita quinquiesperforata', badge: 'common' as const },
  { bg: '#FDF3E3', name: 'Florida Horse Conch', sci: 'Triplofusus giganteus', badge: 'uncommon' as const },
];

export const sampleSpeciesFacts = [
  ['Family', 'Volutidae'],
  ['Region', 'Gulf of Mexico'],
  ['Best season', 'Post-storm, winter'],
  ['Habitat', 'Offshore, deep sand'],
];

export const sampleProfileStats = [
  { val: '47', label: 'Total finds', tone: 'text' as const },
  { val: '3', label: 'Rare finds', tone: 'accentDeep' as const },
  { val: '12', label: 'Species', tone: 'text' as const },
];

export const sampleProfileFinds = [
  { icon: '🐚', bg: '#F5E6E8', name: 'Junonia', sub: 'Sanibel · Today 6:20am', badge: 'rare' as const },
  { icon: '🐚', bg: '#EDF3F2', name: 'Lightning Whelk', sub: 'Captiva · Yesterday', badge: 'uncommon' as const },
  { icon: '🐚', bg: null, name: 'Sand Dollar', sub: "Bowman's · Tue", badge: 'common' as const },
];

export const sampleSavedBeaches = [
  {
    name: 'Sanibel Island',
    sub: 'Fort Myers, FL',
    score: 78,
    condition: 'Best window: 6:15 – 9:30 AM · Low tide',
    alert: '🔔 Alert at score 70+',
    isHome: true,
    featured: true,
  },
  {
    name: 'Captiva Island',
    sub: 'Lee County, FL',
    score: 54,
    condition: 'Moderate · Wind picking up after noon',
    alert: '🔕 No alert set',
    isHome: false,
    featured: false,
  },
  {
    name: "Bowman's Beach",
    sub: 'Sanibel, FL',
    score: 71,
    condition: 'Good · Storm wrack from last night',
    alert: '🔔 Alert at score 65+',
    isHome: false,
    featured: false,
  },
];

export const sampleFindConditions = [
  { val: '78', label: 'Score' },
  { val: 'Low ↓', label: 'Tide' },
  { val: '6:20am', label: 'Found' },
  { val: 'SW', label: 'Wind' },
];

export const sampleConfirmConditions = [
  { val: '78', label: 'Score' },
  { val: 'Low', label: 'Tide' },
  { val: 'SW', label: 'Wind' },
];
