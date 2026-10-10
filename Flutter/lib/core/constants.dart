/// AirGuard Core Constants & Configuration
class AppConstants {
  static const String appName = 'AirGuard';
  static const String appVersion = '1.0.0';

  // Default API Endpoints
  // Android Emulator: http://10.0.2.2:5001
  // Local Wi-Fi LAN: http://192.168.1.6:5001
  // Cloud Production: https://iot-based-hyperlocal-air-quality.onrender.com
  static const String defaultLocalUrl = 'http://10.0.2.2:5001';
  static const String defaultLanUrl = 'http://192.168.1.6:5001';
  static const String defaultProdUrl = 'https://iot-based-hyperlocal-air-quality.onrender.com';

  // Storage Keys
  static const String keyAuthToken = 'airguard_auth_token';
  static const String keyUserJson = 'airguard_user_data';
  static const String keyApiBaseUrl = 'airguard_api_base_url';
  static const String keySelectedDevice = 'airguard_selected_device';
  static const String keyTempUnit = 'airguard_temp_unit'; // 'C' or 'F'
  static const String keyThemeMode = 'airguard_theme_mode';

  // Default Polling & Timers
  static const int pollIntervalSeconds = 15;
  static const int pingTimeoutSeconds = 8;
}
