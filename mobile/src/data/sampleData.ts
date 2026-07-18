// Placeholder fixtures mirroring the design prototype's sample content.
// Onboarding and the Find/LogConfirm condition chips are still fixture-driven
// — everything else has been wired to the real API (see lib/api.ts).

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

export const sampleProfileStats = [
  { val: '47', label: 'Total finds', tone: 'text' as const },
  { val: '3', label: 'Rare finds', tone: 'accentDeep' as const },
  { val: '12', label: 'Species', tone: 'text' as const },
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
