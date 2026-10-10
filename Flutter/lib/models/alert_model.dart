class AlertModel {
  final String id;
  final String deviceId;
  final String location;
  final double airQuality;
  final String category;
  final String message;
  final int seenCount;
  final DateTime lastSeen;
  final bool acknowledged;
  final DateTime createdAt;

  AlertModel({
    required this.id,
    required this.deviceId,
    required this.location,
    required this.airQuality,
    required this.category,
    required this.message,
    required this.seenCount,
    required this.lastSeen,
    required this.acknowledged,
    required this.createdAt,
  });

  factory AlertModel.fromJson(Map<String, dynamic> json) {
    return AlertModel(
      id: json['_id'] ?? json['id'] ?? '',
      deviceId: json['deviceId']?.toString() ?? 'unknown',
      location: json['location']?.toString() ?? 'GIST Campus',
      airQuality: (json['airQuality'] as num?)?.toDouble() ?? 0.0,
      category: json['category']?.toString() ?? 'Unhealthy',
      message: json['message']?.toString() ?? 'Air quality alert.',
      seenCount: (json['seenCount'] as num?)?.toInt() ?? 1,
      lastSeen: json['lastSeen'] != null
          ? DateTime.tryParse(json['lastSeen'].toString()) ?? DateTime.now()
          : DateTime.now(),
      acknowledged: json['acknowledged'] == true,
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'].toString()) ?? DateTime.now()
          : DateTime.now(),
    );
  }

  AlertModel copyWith({bool? acknowledged}) {
    return AlertModel(
      id: id,
      deviceId: deviceId,
      location: location,
      airQuality: airQuality,
      category: category,
      message: message,
      seenCount: seenCount,
      lastSeen: lastSeen,
      acknowledged: acknowledged ?? this.acknowledged,
      createdAt: createdAt,
    );
  }
}
