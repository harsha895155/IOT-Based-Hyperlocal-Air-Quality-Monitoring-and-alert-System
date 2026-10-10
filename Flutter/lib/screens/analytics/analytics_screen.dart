import 'package:flutter/material.dart';
import '../../core/api_client.dart';
import '../../core/theme.dart';
import '../../models/analytics_model.dart';
import '../../utils/aqi_utils.dart';

class AnalyticsScreen extends StatefulWidget {
  const AnalyticsScreen({super.key});

  @override
  State<AnalyticsScreen> createState() => _AnalyticsScreenState();
}

class _AnalyticsScreenState extends State<AnalyticsScreen> {
  AnalyticsModel? _data;
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetch();
  }

  Future<void> _fetch() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final res = await ApiClient.getAnalytics();
      setState(() => _data = res);
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Diurnal Analytics'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, size: 20),
            onPressed: _fetch,
          ),
        ],
      ),
      body: RefreshIndicator(
        color: AppTheme.accent,
        backgroundColor: AppTheme.surfaceDark,
        onRefresh: _fetch,
        child: _isLoading && _data == null
            ? const Center(child: CircularProgressIndicator(color: AppTheme.accent))
            : _error != null
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(_error!, style: const TextStyle(color: AppTheme.textMuted)),
                        const SizedBox(height: 12),
                        ElevatedButton(onPressed: _fetch, child: const Text('Retry')),
                      ],
                    ),
                  )
                : SingleChildScrollView(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Summary Statistics Matrix
                        const Text(
                          '24-HOUR STATISTICAL AGGREGATION',
                          style: TextStyle(
                            color: AppTheme.textFaint,
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 0.8,
                          ),
                        ),
                        const SizedBox(height: 12),
                        Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: AppTheme.surfaceDark,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: AppTheme.borderDark),
                          ),
                          child: Column(
                            children: [
                              _statRow('Total Validated Samples', '${_data!.summary.totalSamples} frames'),
                              const Divider(color: AppTheme.borderDark, height: 16),
                              _statRow('Minimum AQI', _data!.summary.minAQI.round().toString()),
                              _statRow('Average AQI', _data!.summary.avgAQI.round().toString()),
                              _statRow('Maximum AQI', _data!.summary.maxAQI.round().toString()),
                              const Divider(color: AppTheme.borderDark, height: 16),
                              _statRow('Average Temperature', '${_data!.summary.avgTemp.toStringAsFixed(1)}°C'),
                              _statRow('Average Humidity', '${_data!.summary.avgHumidity.toStringAsFixed(1)}%'),
                              _statRow('Average Gas Concentration', '${_data!.summary.avgGasPPM.toStringAsFixed(1)} ppm'),
                            ],
                          ),
                        ),

                        const SizedBox(height: 20),

                        // Diurnal Hourly Breakdown Table
                        const Text(
                          'HOURLY DIURNAL PATTERNS',
                          style: TextStyle(
                            color: AppTheme.textFaint,
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 0.8,
                          ),
                        ),
                        const SizedBox(height: 12),
                        Container(
                          decoration: BoxDecoration(
                            color: AppTheme.surfaceDark,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: AppTheme.borderDark),
                          ),
                          child: ListView.separated(
                            shrinkWrap: true,
                            physics: const NeverScrollableScrollPhysics(),
                            itemCount: _data!.hourlyTrends.length,
                            separatorBuilder: (_, __) => const Divider(color: AppTheme.borderDark, height: 1),
                            itemBuilder: (context, idx) {
                              final h = _data!.hourlyTrends[idx];
                              final aqiLevel = AQIUtils.classify(h.avgAQI);
                              final hourStr = '${h.hour < 10 ? '0' : ''}${h.hour}:00';

                              return Padding(
                                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                                child: Row(
                                  children: [
                                    Text(
                                      hourStr,
                                      style: const TextStyle(
                                        color: AppTheme.textMuted,
                                        fontFamily: 'monospace',
                                        fontSize: 13,
                                      ),
                                    ),
                                    const SizedBox(width: 16),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            'AQI ${h.avgAQI.round()} (${aqiLevel.category})',
                                            style: TextStyle(
                                              color: aqiLevel.color,
                                              fontSize: 13,
                                              fontWeight: FontWeight.w700,
                                            ),
                                          ),
                                          Text(
                                            '${h.avgTemp.toStringAsFixed(1)}°C • ${h.avgHumidity.toStringAsFixed(0)}% RH • ${h.sampleCount} pts',
                                            style: const TextStyle(color: AppTheme.textFaint, fontSize: 11),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                              );
                            },
                          ),
                        ),
                      ],
                    ),
                  ),
      ),
    );
  }

  Widget _statRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: AppTheme.textMuted, fontSize: 12)),
          Text(
            value,
            style: const TextStyle(color: AppTheme.textPrimary, fontSize: 13, fontWeight: FontWeight.w700),
          ),
        ],
      ),
    );
  }
}
