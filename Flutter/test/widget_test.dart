import 'package:flutter_test/flutter_test.dart';
import 'package:airguard_mobile/utils/aqi_utils.dart';

void main() {
  group('AQI Breakpoint & Health Recommendation Tests (IEEE Base Paper Table I)', () {
    test('Classifies 0-50 as Good', () {
      final level = AQIUtils.classify(25);
      expect(level.category, 'Good');
      expect(level.alertAction, 'none');
    });

    test('Classifies 51-100 as Moderate', () {
      final level = AQIUtils.classify(75);
      expect(level.category, 'Moderate');
      expect(level.alertAction, 'log_only');
    });

    test('Classifies 101-150 as Unhealthy (SG)', () {
      final level = AQIUtils.classify(125);
      expect(level.category, 'Unhealthy (SG)');
      expect(level.alertAction, 'dashboard_flag');
    });

    test('Classifies 151-200 as Unhealthy', () {
      final level = AQIUtils.classify(180);
      expect(level.category, 'Unhealthy');
      expect(level.alertAction, 'push_notification');
    });

    test('Classifies 201-300 as Very Unhealthy', () {
      final level = AQIUtils.classify(250);
      expect(level.category, 'Very Unhealthy');
      expect(level.alertAction, 'push_notification_alert');
    });

    test('Classifies 301-500 as Hazardous', () {
      final level = AQIUtils.classify(350);
      expect(level.category, 'Hazardous');
      expect(level.alertAction, 'immediate_all_channels');
    });
  });
}
