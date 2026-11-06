// Little Lives core — family definitions. Only Naomi is simulated until Stage 2 adds the other three.
export const NAOMI = {
  id: 'naomi', name: 'Naomi',
  personality: { neat: 0.8, social: 1.0, foodie: 1.15, cozy: 0.85, playful: 0.5 },
  prefs: { tea: 1.2, reading: 1.0, wake: 6.9 },
  rel: {
    darius: { label: 'Husband', affection: 82, trust: 85, friendship: 74, conflict: 8 },
    elias: { label: 'Son', affection: 88, trust: 70, friendship: 62, conflict: 18 },
    laila: { label: 'Daughter', affection: 92, trust: 80, friendship: 70, conflict: 6 },
  },
};
