import 'device_model.dart';

class LocationModel {
  final String location;
  final int deviceCount;
  final int onlineCount;
  final int? averageAQI;
  final List<DeviceModel> devices;

  LocationModel({
    required this.location,
    required this.deviceCount,
    required this.onlineCount,
    this.averageAQI,
    required this.devices,
  });

  factory LocationModel.fromJson(Map<String, dynamic> json) {
    return LocationModel(
      location: json['location'] ?? 'Unknown Location',
      deviceCount: (json['deviceCount'] as num?)?.toInt() ?? 0,
      onlineCount: (json['onlineCount'] as num?)?.toInt() ?? 0,
      averageAQI: (json['averageAQI'] as num?)?.toInt(),
      devices: (json['devices'] as List<dynamic>?)
              ?.map((e) => DeviceModel.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }
}
