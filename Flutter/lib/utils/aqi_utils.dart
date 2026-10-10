import 'package:flutter/material.dart';
import '../core/theme.dart';

class AQILevel {
  final int min;
  final int max;
  final String category;
  final Color color;
  final String alertAction;

  const AQILevel({
    required this.min,
    required this.max,
    required this.category,
    required this.color,
    required this.alertAction,
  });
}

class AQIUtils {
  // Matches Table I of IEEE Base Paper and Backend/utils/aqi.js exactly
  static const List<AQILevel> breakpoints = [
    AQILevel(
      min: 0,
      max: 50,
      category: 'Good',
      color: AppTheme.aqiGood,
      alertAction: 'none',
    ),
    AQILevel(
      min: 51,
      max: 100,
      category: 'Moderate',
      color: AppTheme.aqiModerate,
      alertAction: 'log_only',
    ),
    AQILevel(
      min: 101,
      max: 150,
      category: 'Unhealthy (SG)',
      color: AppTheme.aqiUnhealthySG,
      alertAction: 'dashboard_flag',
    ),
    AQILevel(
      min: 151,
      max: 200,
      category: 'Unhealthy',
      color: AppTheme.aqiUnhealthy,
      alertAction: 'push_notification',
    ),
    AQILevel(
      min: 201,
      max: 300,
      category: 'Very Unhealthy',
      color: AppTheme.aqiVeryUnhealthy,
      alertAction: 'push_notification_alert',
    ),
    AQILevel(
      min: 301,
      max: 500,
      category: 'Hazardous',
      color: AppTheme.aqiHazardous,
      alertAction: 'immediate_all_channels',
    ),
  ];

  static AQILevel classify(num? aqi) {
    if (aqi == null) return breakpoints.first;
    final clamped = aqi.clamp(0, 500).round();
    for (final bp in breakpoints) {
      if (clamped >= bp.min && clamped <= bp.max) {
        return bp;
      }
    }
    return breakpoints.last;
  }

  static String healthRecommendation(num? aqi) {
    final level = classify(aqi);
    switch (level.category) {
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
}
