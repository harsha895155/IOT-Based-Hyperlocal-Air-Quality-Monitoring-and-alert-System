import 'dart:async';
import 'package:flutter/foundation.dart';
import '../core/api_client.dart';
import '../core/socket_service.dart';
import '../models/alert_model.dart';

class AlertsProvider extends ChangeNotifier {
  List<AlertModel> _alerts = [];
  bool _isLoading = true;
  String? _error;
  StreamSubscription? _socketSub;

  List<AlertModel> get alerts => _alerts;
  List<AlertModel> get unacknowledged => _alerts.where((a) => !a.acknowledged).toList();
  bool get isLoading => _isLoading;
  String? get error => _error;

  AlertsProvider() {
    init();
  }

  void init() {
    refresh();

    // Listen to real-time incoming alerts pushed by backend
    _socketSub = SocketService().onAlert.listen((newAlert) {
      // Prepend to list
      _alerts.insert(0, newAlert);
      notifyListeners();
    });
  }

  Future<void> refresh() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _alerts = await ApiClient.getAlerts();
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> acknowledge(String alertId) async {
    try {
      final success = await ApiClient.acknowledgeAlert(alertId);
      if (success) {
        final idx = _alerts.indexWhere((a) => a.id == alertId);
        if (idx != -1) {
          _alerts[idx] = _alerts[idx].copyWith(acknowledged: true);
          notifyListeners();
        }
      }
      return success;
    } catch (_) {
      return false;
    }
  }

  Future<bool> acknowledgeAll({String? deviceId}) async {
    try {
      final success = await ApiClient.acknowledgeAll(deviceId: deviceId);
      if (success) {
        _alerts = _alerts.map((a) => a.copyWith(acknowledged: true)).toList();
        notifyListeners();
      }
      return success;
    } catch (_) {
      return false;
    }
  }

  @override
  void dispose() {
    _socketSub?.cancel();
    super.dispose();
  }
}
