import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import 'constants.dart';
import '../models/user_model.dart';

class StorageService {
  static SharedPreferences? _prefs;

  static Future<void> init() async {
    _prefs ??= await SharedPreferences.getInstance();
  }

  // Auth Token
  static Future<void> saveToken(String token) async {
    await init();
    await _prefs?.setString(AppConstants.keyAuthToken, token);
  }

  static Future<String?> getToken() async {
    await init();
    return _prefs?.getString(AppConstants.keyAuthToken);
  }

  static Future<void> clearToken() async {
    await init();
    await _prefs?.remove(AppConstants.keyAuthToken);
  }

  // User Model
  static Future<void> saveUser(UserModel user) async {
    await init();
    await _prefs?.setString(AppConstants.keyUserJson, jsonEncode(user.toJson()));
  }

  static Future<UserModel?> getUser() async {
    await init();
    final jsonStr = _prefs?.getString(AppConstants.keyUserJson);
    if (jsonStr == null) return null;
    try {
      return UserModel.fromJson(jsonDecode(jsonStr));
    } catch (_) {
      return null;
    }
  }

  static Future<void> clearUser() async {
    await init();
    await _prefs?.remove(AppConstants.keyUserJson);
  }

  // Base API URL
  static Future<String> getBaseUrl() async {
    await init();
    return _prefs?.getString(AppConstants.keyApiBaseUrl) ?? AppConstants.defaultLocalUrl;
  }

  static Future<void> saveBaseUrl(String url) async {
    await init();
    await _prefs?.setString(AppConstants.keyApiBaseUrl, url);
  }

  // Selected Device
  static Future<String?> getSelectedDevice() async {
    await init();
    return _prefs?.getString(AppConstants.keySelectedDevice);
  }

  static Future<void> saveSelectedDevice(String deviceId) async {
    await init();
    await _prefs?.setString(AppConstants.keySelectedDevice, deviceId);
  }

  // Temp Unit
  static Future<String> getTempUnit() async {
    await init();
    return _prefs?.getString(AppConstants.keyTempUnit) ?? 'C';
  }

  static Future<void> saveTempUnit(String unit) async {
    await init();
    await _prefs?.setString(AppConstants.keyTempUnit, unit);
  }

  static Future<void> clearAll() async {
    await init();
    await _prefs?.clear();
  }
}
