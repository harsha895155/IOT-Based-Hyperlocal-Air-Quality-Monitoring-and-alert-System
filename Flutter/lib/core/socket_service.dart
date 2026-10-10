import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:socket_io_client/socket_io_client.dart' as IO;
import 'storage_service.dart';
import '../models/reading_model.dart';
import '../models/alert_model.dart';

enum SocketStatus {
  disconnected,
  connecting,
  connected,
  reconnecting,
  error,
}

class SocketService extends ChangeNotifier {
  static final SocketService _instance = SocketService._internal();
  factory SocketService() => _instance;
  SocketService._internal();

  IO.Socket? _socket;
  SocketStatus _status = SocketStatus.disconnected;

  // Streams / Listeners
  final _readingController = StreamController<ReadingModel>.broadcast();
  final _alertController = StreamController<AlertModel>.broadcast();
  final _deviceStatusController = StreamController<Map<String, dynamic>>.broadcast();

  Stream<ReadingModel> get onReading => _readingController.stream;
  Stream<AlertModel> get onAlert => _alertController.stream;
  Stream<Map<String, dynamic>> get onDeviceStatus => _deviceStatusController.stream;

  SocketStatus get status => _status;
  bool get isConnected => _status == SocketStatus.connected;

  Future<void> connect() async {
    if (_socket != null && _socket!.connected) return;

    final baseUrl = await StorageService.getBaseUrl();
    _setStatus(SocketStatus.connecting);

    try {
      _socket = IO.io(
        baseUrl,
        IO.OptionBuilder()
            .setTransports(['websocket', 'polling'])
            .disableAutoConnect()
            .enableReconnection()
            .setReconnectionDelay(2000)
            .setReconnectionAttempts(10)
            .build(),
      );

      _socket!.onConnect((_) {
        debugPrint('[SocketService] Connected to $baseUrl');
        _setStatus(SocketStatus.connected);
      });

      _socket!.onDisconnect((_) {
        debugPrint('[SocketService] Disconnected');
        _setStatus(SocketStatus.disconnected);
      });

      _socket!.onConnectError((err) {
        debugPrint('[SocketService] Connect Error: $err');
        _setStatus(SocketStatus.error);
      });

      _socket!.onReconnecting((_) {
        debugPrint('[SocketService] Reconnecting...');
        _setStatus(SocketStatus.reconnecting);
      });

      // AirGuard specific telemetry events emitted by server.js & readingsController.js
      _socket!.on('reading', (data) {
        if (data is Map<String, dynamic>) {
          try {
            final reading = ReadingModel.fromJson(data);
            _readingController.add(reading);
          } catch (e) {
            debugPrint('[SocketService] Reading parse error: $e');
          }
        }
      });

      _socket!.on('alert', (data) {
        if (data is Map<String, dynamic>) {
          try {
            final alert = AlertModel.fromJson(data);
            _alertController.add(alert);
          } catch (e) {
            debugPrint('[SocketService] Alert parse error: $e');
          }
        }
      });

      _socket!.on('device_status', (data) {
        if (data is Map<String, dynamic>) {
          _deviceStatusController.add(data);
        }
      });

      _socket!.connect();
    } catch (e) {
      debugPrint('[SocketService] Connection exception: $e');
      _setStatus(SocketStatus.error);
    }
  }

  void disconnect() {
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
    _setStatus(SocketStatus.disconnected);
  }

  void _setStatus(SocketStatus s) {
    if (_status != s) {
      _status = s;
      notifyListeners();
    }
  }

  @override
  void dispose() {
    disconnect();
    _readingController.close();
    _alertController.close();
    _deviceStatusController.close();
    super.dispose();
  }
}
