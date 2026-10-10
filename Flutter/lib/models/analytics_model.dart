class AnalyticsSummary {
  final double minAQI;
  final double maxAQI;
  final double avgAQI;
  final double avgTemp;
  final double avgHumidity;
  final double avgGasPPM;
  final int totalSamples;

  AnalyticsSummary({
    required this.minAQI,
    required this.maxAQI,
    required this.avgAQI,
    required this.avgTemp,
    required this.avgHumidity,
    required this.avgGasPPM,
    required this.totalSamples,
  });

  factory AnalyticsSummary.fromJson(Map<String, dynamic>? json) {
    if (json == null) {
      return AnalyticsSummary(
        minAQI: 0,
        maxAQI: 0,
        avgAQI: 0,
        avgTemp: 0,
        avgHumidity: 0,
        avgGasPPM: 0,
        totalSamples: 0,
      );
    }
    return AnalyticsSummary(
      minAQI: (json['minAQI'] as num?)?.toDouble() ?? 0.0,
      maxAQI: (json['maxAQI'] as num?)?.toDouble() ?? 0.0,
      avgAQI: (json['avgAQI'] as num?)?.toDouble() ?? 0.0,
      avgTemp: (json['avgTemp'] as num?)?.toDouble() ?? 0.0,
      avgHumidity: (json['avgHumidity'] as num?)?.toDouble() ?? 0.0,
      avgGasPPM: (json['avgGasPPM'] as num?)?.toDouble() ?? 0.0,
      totalSamples: (json['totalSamples'] as num?)?.toInt() ?? 0,
    );
  }
}

class HourlyTrend {
  final int hour;
  final double avgAQI;
  final double avgTemp;
  final double avgHumidity;
  final double avgGasPPM;
  final int sampleCount;

  HourlyTrend({
    required this.hour,
    required this.avgAQI,
    required this.avgTemp,
    required this.avgHumidity,
    required this.avgGasPPM,
    required this.sampleCount,
  });

  factory HourlyTrend.fromJson(Map<String, dynamic> json) {
    return HourlyTrend(
      hour: (json['hour'] as num?)?.toInt() ?? 0,
      avgAQI: (json['avgAQI'] as num?)?.toDouble() ?? 0.0,
      avgTemp: (json['avgTemp'] as num?)?.toDouble() ?? 0.0,
      avgHumidity: (json['avgHumidity'] as num?)?.toDouble() ?? 0.0,
      avgGasPPM: (json['avgGasPPM'] as num?)?.toDouble() ?? 0.0,
      sampleCount: (json['sampleCount'] as num?)?.toInt() ?? 0,
    );
  }
}

class AnalyticsModel {
  final AnalyticsSummary summary;
  final List<HourlyTrend> hourlyTrends;

  AnalyticsModel({
    required this.summary,
    required this.hourlyTrends,
  });

  factory AnalyticsModel.fromJson(Map<String, dynamic> json) {
    return AnalyticsModel(
      summary: AnalyticsSummary.fromJson(json['summary']),
      hourlyTrends: (json['hourlyTrends'] as List<dynamic>?)
              ?.map((e) => HourlyTrend.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }
}
