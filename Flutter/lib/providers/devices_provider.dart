import 'dart:async';
import 'package:flutter/foundation.dart';
import '../core/api_client.dart';
import '../core/socket_service.dart';
import '../models/device_model.dart';

class DevicesProvider extends ChangeNotifier {
  List<DeviceModel> _devices = [];
  bool _isLoading = true;
  String? _error;
  StreamSubscription? _socketSub;

  List<DeviceModel> get devices => _devices;
  bool get isLoading => _isLoading;
  String? get error => _error;

  int get onlineCount => _devices.where((d) => d.isOnline).length;
  int get totalCount => _devices.length;

  DevicesProvider() {
    init();
  }

  void init() {
    refresh();

    // Listen to real-time device status changes
    _socketSub = SocketService().onDeviceStatus.listen((statusData) {
      final devId = statusData['deviceId']?.toString();
      if (devId != null) {
        final idx = _devices.indexWhere((d) => d.deviceId == devId);
        if (idx != -1) {
          // Refresh list to pick up updated fields
          refreshSilently();
        }
      }
    });
  }

  Future<void> refresh() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _devices = await ApiClient.getDevices();
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> refreshSilently() async {
    try {
      _devices = await ApiClient.getDevices();
      notifyListeners();
    } catch (_) {}
  }

  DeviceModel? getDeviceById(String id) {
    try {
      return _devices.firstWhere((d) => d.id == id || d.deviceId == id);
    } catch (_) {
      return null;
    }
  }

  Future<int?> pingDevice() async {
    final start = DateTime.now();
    try {
      await ApiClient.getHealth();
      return DateTime.now().difference(start).inMilliseconds;
    } catch (_) {
      return null;
    }
  }

  @override
  void dispose() {
    _socketSub?.cancel();
    super.dispose();
  }
}
