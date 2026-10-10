import 'package:flutter/foundation.dart';
import '../core/api_client.dart';
import '../core/storage_service.dart';
import '../models/user_model.dart';

class AuthProvider extends ChangeNotifier {
  UserModel? _user;
  String? _token;
  bool _isGuest = false;
  bool _isLoading = true;
  String? _error;

  UserModel? get user => _user;
  String? get token => _token;
  bool get isAuthenticated => _user != null && _token != null && !_isGuest;
  bool get isGuest => _isGuest;
  bool get isLoading => _isLoading;
  String? get error => _error;

  AuthProvider() {
    restoreSession();
  }

  Future<void> restoreSession() async {
    _isLoading = true;
    notifyListeners();

    try {
      final token = await StorageService.getToken();
      final user = await StorageService.getUser();

      if (token != null && token.isNotEmpty) {
        _token = token;
        _user = user;
        _isGuest = false;

        // Verify session in background with GET /api/auth/me
        try {
          final refreshed = await ApiClient.getMe();
          _user = refreshed;
        } catch (_) {
          // Token still kept for offline / transient network disconnect
        }
      } else {
        _isGuest = true; // Default to public guest monitoring
      }
    } catch (e) {
      _isGuest = true;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> login(String email, String password) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final res = await ApiClient.login(email, password);
      _user = res['user'] as UserModel;
      _token = res['token'] as String;
      _isGuest = false;
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> register(String name, String email, String password) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final res = await ApiClient.register(name, email, password);
      _user = res['user'] as UserModel;
      _token = res['token'] as String;
      _isGuest = false;
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  void continueAsGuest() {
    _isGuest = true;
    _user = null;
    _token = null;
    _error = null;
    notifyListeners();
  }

  Future<void> logout() async {
    await StorageService.clearToken();
    await StorageService.clearUser();
    _user = null;
    _token = null;
    _isGuest = true;
    notifyListeners();
  }
}
