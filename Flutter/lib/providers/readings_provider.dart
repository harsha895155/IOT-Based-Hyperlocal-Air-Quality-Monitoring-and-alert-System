import 'dart:async';
import 'package:flutter/foundation.dart';
import '../core/api_client.dart';
import '../core/socket_service.dart';
import '../core/storage_service.dart';
import '../models/reading_model.dart';

class ReadingsProvider extends ChangeNotifier {
  ReadingModel? _latest;
  List<ReadingModel> _history = [];
  String _selectedDeviceId = 'esp32-node-01';
  bool _isLoading = true;
  String? _error;
  Timer? _pollingTimer;
  StreamSubscription? _socketSub;

  ReadingModel? get latest => _latest;
  List<ReadingModel> get history => _history;
  String get selectedDeviceId => _selectedDeviceId;
  bool get isLoading => _isLoading;
  String? get error => _error;

  ReadingsProvider() {
    init();
  }

  Future<void> init() async {
    final saved = await StorageService.getSelectedDevice();
    if (saved != null && saved.isNotEmpty) {
      _selectedDeviceId = saved;
    }

    // Subscribe to real-time socket events
    _socketSub = SocketService().onReading.listen((reading) {
      if (reading.deviceId == _selectedDeviceId || _selectedDeviceId == 'all') {
        _latest = reading;
        // Prepend to history and limit to 30
        _history.insert(0, reading);
        if (_history.length > 50) {
          _history = _history.sublist(0, 50);
        }
        notifyListeners();
      }
    });

    await refresh();

    // Setup periodic polling fallback every 15s (matching sensor sampling cadence)
    _pollingTimer = Timer.periodic(const Duration(seconds: 15), (_) {
      fetchLatestSilently();
    });
  }

  void setSelectedDevice(String deviceId) {
    if (_selectedDeviceId != deviceId) {
      _selectedDeviceId = deviceId;
      StorageService.saveSelectedDevice(deviceId);
      refresh();
    }
  }

  Future<void> refresh() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final results = await Future.wait([
        ApiClient.getLatestReading(deviceId: _selectedDeviceId),
        ApiClient.getReadingHistory(deviceId: _selectedDeviceId, limit: 30),
      ]);

      _latest = results[0] as ReadingModel?;
      _history = results[1] as List<ReadingModel>;
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> fetchLatestSilently() async {
    try {
      final r = await ApiClient.getLatestReading(deviceId: _selectedDeviceId);
      if (r != null) {
        _latest = r;
        notifyListeners();
      }
    } catch (_) {}
  }

  @override
  void dispose() {
    _pollingTimer?.cancel();
    _socketSub?.cancel();
    super.dispose();
  }
}
