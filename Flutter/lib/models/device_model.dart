class DeviceCoordinates {
  final double lat;
  final double lng;

  DeviceCoordinates({required this.lat, required this.lng});

  factory DeviceCoordinates.fromJson(Map<String, dynamic> json) {
    return DeviceCoordinates(
      lat: (json['lat'] as num?)?.toDouble() ?? 14.4426,
      lng: (json['lng'] as num?)?.toDouble() ?? 79.9865,
    );
  }
}

class DeviceModel {
  final String id;
  final String deviceId;
  final String name;
  final String location;
  final String type;
  final List<String> sensors;
  final DeviceCoordinates coordinates;
  final String status;
  final DateTime? lastSeen;
  final double? aqi;
  final double? temperature;
  final double? humidity;
  final double? gasPPM;

  DeviceModel({
    required this.id,
    required this.deviceId,
    required this.name,
    required this.location,
    required this.type,
    required this.sensors,
    required this.coordinates,
    required this.status,
    this.lastSeen,
    this.aqi,
    this.temperature,
    this.humidity,
    this.gasPPM,
  });

  bool get isOnline => status == 'Online';

  factory DeviceModel.fromJson(Map<String, dynamic> json) {
    return DeviceModel(
      id: json['deviceId'] ?? json['id'] ?? '',
      deviceId: json['deviceId'] ?? json['id'] ?? '',
      name: json['name'] ?? json['deviceId'] ?? 'Node',
      location: json['location'] ?? 'Central Station',
      type: json['type'] ?? 'ESP32 Sensing Node',
      sensors: (json['sensors'] as List<dynamic>?)?.map((e) => e.toString()).toList() ??
          ['MQ135', 'DHT22'],
      coordinates: json['coordinates'] is Map<String, dynamic>
          ? DeviceCoordinates.fromJson(json['coordinates'])
          : DeviceCoordinates(lat: 14.4426, lng: 79.9865),
      status: json['status'] ?? 'Offline',
      lastSeen: json['lastSeen'] != null ? DateTime.tryParse(json['lastSeen'].toString()) : null,
      aqi: (json['aqi'] as num?)?.toDouble(),
      temperature: (json['temperature'] as num?)?.toDouble(),
      humidity: (json['humidity'] as num?)?.toDouble(),
      gasPPM: (json['gasPPM'] as num?)?.toDouble(),
    );
  }
}
