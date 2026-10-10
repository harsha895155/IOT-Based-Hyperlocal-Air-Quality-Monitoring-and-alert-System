class ReadingModel {
  final String? id;
  final String deviceId;
  final double temperature;
  final double humidity;
  final double gasPPM;
  final double airQuality;
  final String category;
  final DateTime createdAt;

  ReadingModel({
    this.id,
    required this.deviceId,
    required this.temperature,
    required this.humidity,
    required this.gasPPM,
    required this.airQuality,
    required this.category,
    required this.createdAt,
  });

  factory ReadingModel.fromJson(Map<String, dynamic> json) {
    return ReadingModel(
      id: json['_id'] ?? json['id'],
      deviceId: json['deviceId']?.toString() ?? 'unknown',
      temperature: (json['temperature'] as num?)?.toDouble() ?? 0.0,
      humidity: (json['humidity'] as num?)?.toDouble() ?? 0.0,
      gasPPM: (json['gasPPM'] as num?)?.toDouble() ?? 0.0,
      airQuality: (json['airQuality'] as num?)?.toDouble() ?? 0.0,
      category: json['category']?.toString() ?? 'Moderate',
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'].toString()) ?? DateTime.now()
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'deviceId': deviceId,
      'temperature': temperature,
      'humidity': humidity,
      'gasPPM': gasPPM,
      'airQuality': airQuality,
      'category': category,
      'createdAt': createdAt.toIso8601String(),
    };
  }
}
