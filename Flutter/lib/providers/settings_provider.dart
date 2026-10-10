import 'package:flutter/foundation.dart';
import '../core/constants.dart';
import '../core/storage_service.dart';
import '../core/socket_service.dart';

class SettingsProvider extends ChangeNotifier {
  String _baseUrl = AppConstants.defaultLocalUrl;
  String _tempUnit = 'C';

  String get baseUrl => _baseUrl;
  String get tempUnit => _tempUnit;
  bool get isCelsius => _tempUnit == 'C';

  SettingsProvider() {
    init();
  }

  Future<void> init() async {
    _baseUrl = await StorageService.getBaseUrl();
    _tempUnit = await StorageService.getTempUnit();
    notifyListeners();
  }

  Future<void> setBaseUrl(String url) async {
    if (_baseUrl != url) {
      _baseUrl = url;
      await StorageService.saveBaseUrl(url);

      // Reconnect socket to new base
      SocketService().disconnect();
      SocketService().connect();

      notifyListeners();
    }
  }

  Future<void> setTempUnit(String unit) async {
    if (_tempUnit != unit) {
      _tempUnit = unit;
      await StorageService.saveTempUnit(unit);
      notifyListeners();
    }
  }
}
