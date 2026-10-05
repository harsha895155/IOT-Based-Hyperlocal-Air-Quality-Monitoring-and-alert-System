// Shared AQI breakpoint table — mirrors Table I in the accompanying
// IEEE paper. Kept in one place so the alert engine, the reading
// model, and any future reporting code never disagree about category
// boundaries.

const AQI_BREAKPOINTS = [
  { min: 0,   max: 50,  category: 'Good',            alertAction: 'none' },
  { min: 51,  max: 100, category: 'Moderate',         alertAction: 'log_only' },
  { min: 101, max: 150, category: 'Unhealthy (SG)',   alertAction: 'dashboard_flag' },
  { min: 151, max: 200, category: 'Unhealthy',        alertAction: 'push_notification' },
  { min: 201, max: 300, category: 'Very Unhealthy',   alertAction: 'push_notification_alert' },
  { min: 301, max: 500, category: 'Hazardous',        alertAction: 'immediate_all_channels' },
];

/** Returns the breakpoint row (category + alert action) for a given AQI value. */
function classifyAQI(aqi) {
  const clamped = Math.max(0, Math.min(500, Math.round(aqi)));
  return (
    AQI_BREAKPOINTS.find((bp) => clamped >= bp.min && clamped <= bp.max) ||
    AQI_BREAKPOINTS[AQI_BREAKPOINTS.length - 1]
  );
}

/** True once a reading's category requires raising an Alert document. */
function requiresAlert(aqi) {
  return classifyAQI(aqi).alertAction !== 'none' && classifyAQI(aqi).alertAction !== 'log_only';
}

/** Plain-language health recommendation shown on the dashboard/app. */
function healthRecommendation(aqi) {
  const { category } = classifyAQI(aqi);
  switch (category) {
    case 'Good':
      return 'Air quality is satisfactory. Enjoy normal outdoor activity.';
    case 'Moderate':
      return 'Air quality is acceptable. Unusually sensitive individuals should consider reducing prolonged exertion outdoors.';
    case 'Unhealthy (SG)':
      return 'Sensitive groups (children, elderly, respiratory conditions) should reduce prolonged outdoor exertion.';
    case 'Unhealthy':
      return 'Everyone may begin to experience health effects. Limit prolonged outdoor exertion.';
    case 'Very Unhealthy':
      return 'Health alert: everyone may experience more serious health effects. Avoid outdoor exertion.';
    case 'Hazardous':
      return 'Health emergency: the entire population is at risk. Stay indoors and keep windows closed.';
    default:
      return 'Air quality data unavailable.';
  }
}

module.exports = { AQI_BREAKPOINTS, classifyAQI, requiresAlert, healthRecommendation };
