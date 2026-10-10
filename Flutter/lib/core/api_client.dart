import 'dart:convert';
import 'package:http/http.dart' as http;
import 'constants.dart';
import 'storage_service.dart';
import '../models/user_model.dart';
import '../models/device_model.dart';
import '../models/reading_model.dart';
import '../models/alert_model.dart';
import '../models/location_model.dart';
import '../models/analytics_model.dart';

class ApiException implements Exception {
  final String message;
  final int? statusCode;
  ApiException(this.message, [this.statusCode]);

  @override
  String toString() => message;
}

class ApiClient {
  static Future<String> _getUrl(String path) async {
    final base = await StorageService.getBaseUrl();
    final cleanBase = base.endsWith('/') ? base.substring(0, base.length - 1) : base;
    final cleanPath = path.startsWith('/') ? path : '/$path';
    return '$cleanBase$cleanPath';
  }

  static Future<Map<String, String>> _headers({bool needsAuth = false}) async {
    final headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (needsAuth) {
      final token = await StorageService.getToken();
      if (token != null && token.isNotEmpty) {
        headers['Authorization'] = 'Bearer $token';
      }
    }
    return headers;
  }

  // ---- Auth Endpoints ----

  static Future<Map<String, dynamic>> login(String email, String password) async {
    final url = await _getUrl('/api/auth/login');
    final response = await http
        .post(
          Uri.parse(url),
          headers: await _headers(),
          body: jsonEncode({'email': email, 'password': password}),
        )
        .timeout(const Duration(seconds: AppConstants.pingTimeoutSeconds));

    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      final token = data['token'] as String;
      final user = UserModel.fromJson(data['user']);
      await StorageService.saveToken(token);
      await StorageService.saveUser(user);
      return {'user': user, 'token': token};
    } else {
      throw ApiException(data['error'] ?? 'Login failed. Please check credentials.', response.statusCode);
    }
  }

  static Future<Map<String, dynamic>> register(String name, String email, String password) async {
    final url = await _getUrl('/api/auth/register');
    final response = await http
        .post(
          Uri.parse(url),
          headers: await _headers(),
          body: jsonEncode({'name': name, 'email': email, 'password': password}),
        )
        .timeout(const Duration(seconds: AppConstants.pingTimeoutSeconds));

    final data = jsonDecode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      final token = data['token'] as String;
      final user = UserModel.fromJson(data['user']);
      await StorageService.saveToken(token);
      await StorageService.saveUser(user);
      return {'user': user, 'token': token};
    } else {
      throw ApiException(data['error'] ?? 'Registration failed.', response.statusCode);
    }
  }

  static Future<UserModel> getMe() async {
    final url = await _getUrl('/api/auth/me');
    final response = await http
        .get(Uri.parse(url), headers: await _headers(needsAuth: true))
        .timeout(const Duration(seconds: AppConstants.pingTimeoutSeconds));

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      final user = UserModel.fromJson(data);
      await StorageService.saveUser(user);
      return user;
    } else {
      throw ApiException('Session expired or unauthorized', response.statusCode);
    }
  }

  // ---- Devices Endpoints ----

  static Future<List<DeviceModel>> getDevices() async {
    final url = await _getUrl('/api/devices');
    final response = await http
        .get(Uri.parse(url), headers: await _headers(needsAuth: true))
        .timeout(const Duration(seconds: AppConstants.pingTimeoutSeconds));

    if (response.statusCode == 200) {
      final List<dynamic> list = jsonDecode(response.body);
      return list.map((e) => DeviceModel.fromJson(e as Map<String, dynamic>)).toList();
    }
    throw ApiException('Failed to load fleet devices.', response.statusCode);
  }

  static Future<Map<String, dynamic>> checkDeviceId(String id) async {
    final url = await _getUrl('/api/devices/check-id/$id');
    final response = await http
        .get(Uri.parse(url), headers: await _headers(needsAuth: true))
        .timeout(const Duration(seconds: AppConstants.pingTimeoutSeconds));

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw ApiException('Failed to validate device identifier.', response.statusCode);
  }

  static Future<Map<String, dynamic>> createProvisionSession(String deviceId) async {
    final url = await _getUrl('/api/devices/provision-session');
    final response = await http
        .post(
          Uri.parse(url),
          headers: await _headers(needsAuth: true),
          body: jsonEncode({'deviceId': deviceId}),
        )
        .timeout(const Duration(seconds: AppConstants.pingTimeoutSeconds));

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return jsonDecode(response.body);
    }
    final data = jsonDecode(response.body);
    throw ApiException(data['error'] ?? 'Failed to initialize provisioning session.', response.statusCode);
  }

  static Future<Map<String, dynamic>> registerDevice(Map<String, dynamic> payload) async {
    final url = await _getUrl('/api/devices');
    final response = await http
        .post(
          Uri.parse(url),
          headers: await _headers(needsAuth: true),
          body: jsonEncode(payload),
        )
        .timeout(const Duration(seconds: AppConstants.pingTimeoutSeconds));

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return jsonDecode(response.body);
    }
    final data = jsonDecode(response.body);
    throw ApiException(data['error'] ?? 'Device registration failed.', response.statusCode);
  }

  static Future<Map<String, dynamic>> verifyDevice(String deviceId) async {
    final url = await _getUrl('/api/devices/verify/$deviceId');
    final response = await http
        .get(Uri.parse(url), headers: await _headers(needsAuth: true))
        .timeout(const Duration(seconds: AppConstants.pingTimeoutSeconds));

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    final data = jsonDecode(response.body);
    throw ApiException(data['error'] ?? 'Device verification probe failed.', response.statusCode);
  }

  static Future<bool> deleteDevice(String deviceId) async {
    final url = await _getUrl('/api/devices/$deviceId');
    final response = await http
        .delete(Uri.parse(url), headers: await _headers(needsAuth: true))
        .timeout(const Duration(seconds: AppConstants.pingTimeoutSeconds));

    return response.statusCode == 200;
  }

  // ---- Locations Endpoints ----

  static Future<List<LocationModel>> getLocations() async {
    final url = await _getUrl('/api/locations');
    final response = await http
        .get(Uri.parse(url), headers: await _headers())
        .timeout(const Duration(seconds: AppConstants.pingTimeoutSeconds));

    if (response.statusCode == 200) {
      final List<dynamic> list = jsonDecode(response.body);
      return list.map((e) => LocationModel.fromJson(e as Map<String, dynamic>)).toList();
    }
    throw ApiException('Failed to load locations.', response.statusCode);
  }

  // ---- Readings Endpoints ----

  static Future<ReadingModel?> getLatestReading({String? deviceId}) async {
    var path = '/api/readings/latest';
    if (deviceId != null && deviceId.isNotEmpty && deviceId != 'all') {
      path += '?deviceId=$deviceId';
    }
    final url = await _getUrl(path);
    final response = await http
        .get(Uri.parse(url), headers: await _headers())
        .timeout(const Duration(seconds: AppConstants.pingTimeoutSeconds));

    if (response.statusCode == 200) {
      return ReadingModel.fromJson(jsonDecode(response.body));
    } else if (response.statusCode == 404) {
      return null;
    }
    throw ApiException('Failed to fetch latest reading.', response.statusCode);
  }

  static Future<List<ReadingModel>> getReadingHistory({
    String? deviceId,
    int limit = 30,
    String? from,
    String? to,
  }) async {
    final queryParams = <String, String>{'limit': limit.toString()};
    if (deviceId != null && deviceId.isNotEmpty && deviceId != 'all') {
      queryParams['deviceId'] = deviceId;
    }
    if (from != null) queryParams['from'] = from;
    if (to != null) queryParams['to'] = to;

    final base = await _getUrl('/api/readings/history');
    final uri = Uri.parse(base).replace(queryParameters: queryParams);

    final response = await http
        .get(uri, headers: await _headers())
        .timeout(const Duration(seconds: AppConstants.pingTimeoutSeconds));

    if (response.statusCode == 200) {
      final decoded = jsonDecode(response.body);
      final List<dynamic> list = decoded is List ? decoded : decoded['data'] ?? [];
      return list.map((e) => ReadingModel.fromJson(e as Map<String, dynamic>)).toList();
    }
    throw ApiException('Failed to load telemetry history.', response.statusCode);
  }

  // ---- Alerts Endpoints ----

  static Future<List<AlertModel>> getAlerts({String? deviceId, bool? acknowledged}) async {
    final queryParams = <String, String>{};
    if (deviceId != null && deviceId.isNotEmpty && deviceId != 'all') {
      queryParams['deviceId'] = deviceId;
    }
    if (acknowledged != null) {
      queryParams['acknowledged'] = acknowledged.toString();
    }

    final base = await _getUrl('/api/alerts');
    final uri = Uri.parse(base).replace(queryParameters: queryParams);

    final response = await http
        .get(uri, headers: await _headers())
        .timeout(const Duration(seconds: AppConstants.pingTimeoutSeconds));

    if (response.statusCode == 200) {
      final List<dynamic> list = jsonDecode(response.body);
      return list.map((e) => AlertModel.fromJson(e as Map<String, dynamic>)).toList();
    }
    throw ApiException('Failed to load system alerts.', response.statusCode);
  }

  static Future<bool> acknowledgeAlert(String alertId) async {
    final url = await _getUrl('/api/alerts/$alertId/acknowledge');
    final response = await http
        .patch(Uri.parse(url), headers: await _headers(needsAuth: true))
        .timeout(const Duration(seconds: AppConstants.pingTimeoutSeconds));

    return response.statusCode == 200;
  }

  static Future<bool> acknowledgeAll({String? deviceId}) async {
    final url = await _getUrl('/api/alerts/acknowledge-all');
    final response = await http
        .patch(
          Uri.parse(url),
          headers: await _headers(needsAuth: true),
          body: jsonEncode({'deviceId': deviceId ?? 'all'}),
        )
        .timeout(const Duration(seconds: AppConstants.pingTimeoutSeconds));

    return response.statusCode == 200;
  }

  // ---- Analytics Endpoints ----

  static Future<AnalyticsModel> getAnalytics({String? deviceId, String? from, String? to}) async {
    final queryParams = <String, String>{};
    if (deviceId != null && deviceId.isNotEmpty && deviceId != 'all') {
      queryParams['deviceId'] = deviceId;
    }
    if (from != null) queryParams['from'] = from;
    if (to != null) queryParams['to'] = to;

    final base = await _getUrl('/api/analytics');
    final uri = Uri.parse(base).replace(queryParameters: queryParams);

    final response = await http
        .get(uri, headers: await _headers())
        .timeout(const Duration(seconds: AppConstants.pingTimeoutSeconds));

    if (response.statusCode == 200) {
      return AnalyticsModel.fromJson(jsonDecode(response.body));
    }
    throw ApiException('Failed to load analytics trends.', response.statusCode);
  }

  // ---- System Health Endpoint ----

  static Future<Map<String, dynamic>> getHealth() async {
    final url = await _getUrl('/api/health');
    final response = await http
        .get(Uri.parse(url), headers: await _headers())
        .timeout(const Duration(seconds: AppConstants.pingTimeoutSeconds));

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw ApiException('Health check probe timed out.', response.statusCode);
  }

  // ---- Reverse Geocoding ----

  static Future<Map<String, dynamic>?> reverseGeocode(double lat, double lng) async {
    try {
      final base = await _getUrl('/api/weather/reverse');
      final uri = Uri.parse(base).replace(queryParameters: {'lat': lat.toString(), 'lng': lng.toString()});
      final response = await http
          .get(uri, headers: await _headers())
          .timeout(const Duration(seconds: 8));

      if (response.statusCode == 200) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      }
    } catch (_) {}
    return null;
  }
}
