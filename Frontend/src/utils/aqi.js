// Mirrors Backend/utils/aqi.js — kept in sync manually since frontend
// and backend are separate deployable apps. If you change the
// breakpoints on one side, change them here too.

export const AQI_LEVELS = [
  { min: 0, max: 50, category: 'Good', color: 'var(--aqi-good)' },
  { min: 51, max: 100, category: 'Moderate', color: 'var(--aqi-moderate)' },
  { min: 101, max: 150, category: 'Unhealthy (SG)', color: 'var(--aqi-unhealthy-sg)' },
  { min: 151, max: 200, category: 'Unhealthy', color: 'var(--aqi-unhealthy)' },
  { min: 201, max: 300, category: 'Very Unhealthy', color: 'var(--aqi-very-unhealthy)' },
  { min: 301, max: 500, category: 'Hazardous', color: 'var(--aqi-hazardous)' },
];

export function classifyAQI(aqi) {
  const clamped = Math.max(0, Math.min(500, Math.round(aqi ?? 0)));
  return AQI_LEVELS.find((l) => clamped >= l.min && clamped <= l.max) || AQI_LEVELS[AQI_LEVELS.length - 1];
}

export function healthRecommendation(aqi) {
  const { category } = classifyAQI(aqi);
  const map = {
    Good: 'Air quality is satisfactory. Enjoy normal outdoor activity.',
    Moderate: 'Acceptable air quality. Unusually sensitive individuals should limit prolonged exertion outdoors.',
    'Unhealthy (SG)': 'Sensitive groups should reduce prolonged outdoor exertion.',
    Unhealthy: 'Everyone may begin to feel effects. Limit prolonged outdoor exertion.',
    'Very Unhealthy': 'Health alert — avoid outdoor exertion.',
    Hazardous: 'Health emergency — stay indoors, keep windows closed.',
  };
  return map[category] || 'Air quality data unavailable.';
}
