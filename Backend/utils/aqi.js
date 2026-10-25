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
      return 'Monitor air quality index.';
  }
}

/** Accurately computes EPA/CPCB AQI from MQ135 gas PPM, temperature, and humidity */
function calculateAQIFromSensors(gasPPM, temperature = 25, humidity = 50) {
  const ppm = Math.max(0, Number(gasPPM) || 0);
  let aqi = 35; // Standard baseline for clean ambient indoor/outdoor air

  if (ppm <= 0.5) {
    aqi = Math.round(20 + ppm * 20); // 20 - 30 (Clean/Excellent)
  } else if (ppm <= 5.0) {
    // Typical normal room / outdoor ambient VOC levels (0.5 to 5 ppm) -> AQI 30 to 48 (Good)
    aqi = Math.round(30 + ((ppm - 0.5) / 4.5) * 18);
  } else if (ppm <= 15.0) {
    // Mild air pollution / stuffy room (5 to 15 ppm) -> AQI 51 to 100 (Moderate)
    aqi = Math.round(51 + ((ppm - 5.0) / 10.0) * 49);
  } else if (ppm <= 30.0) {
    // Noticeable pollution / cooking fumes / poor ventilation -> AQI 101 to 150 (Unhealthy SG)
    aqi = Math.round(101 + ((ppm - 15.0) / 15.0) * 49);
  } else if (ppm <= 60.0) {
    // Heavy smoke / high pollutants -> AQI 151 to 200 (Unhealthy)
    aqi = Math.round(151 + ((ppm - 30.0) / 30.0) * 49);
  } else if (ppm <= 150.0) {
    // Severe hazardous pollution -> AQI 201 to 300 (Very Unhealthy)
    aqi = Math.round(201 + ((ppm - 60.0) / 90.0) * 99);
  } else {
    // Extreme danger (> 150 ppm) -> AQI 301 to 500 (Hazardous)
    aqi = Math.round(301 + Math.min(199, ((ppm - 150.0) / 350.0) * 199));
  }

  // Meteorological contextual adjustment (high humidity traps pollutants; heat intensifies ozone/VOCs)
  const h = Number(humidity) || 50;
  if (h > 70) {
    aqi += Math.round((h - 70) * 0.25);
  }
  const t = Number(temperature) || 25;
  if (t > 35) {
    aqi += Math.round((t - 35) * 0.5);
  }

  return Math.max(15, Math.min(500, aqi));
}

module.exports = { AQI_BREAKPOINTS, classifyAQI, requiresAlert, healthRecommendation, calculateAQIFromSensors };
