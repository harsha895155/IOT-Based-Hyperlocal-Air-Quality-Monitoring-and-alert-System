import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme.dart';
import '../../providers/readings_provider.dart';
import '../../utils/aqi_utils.dart';
import '../../utils/formatters.dart';

class HistoryScreen extends StatelessWidget {
  const HistoryScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final readingsProv = context.watch<ReadingsProvider>();
    final history = readingsProv.history;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Telemetry History'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, size: 20),
            onPressed: () => readingsProv.refresh(),
          ),
        ],
      ),
      body: RefreshIndicator(
        color: AppTheme.accent,
        backgroundColor: AppTheme.surfaceDark,
        onRefresh: () => readingsProv.refresh(),
        child: history.isEmpty
            ? const Center(
                child: Text(
                  'No historical telemetry recorded.',
                  style: TextStyle(color: AppTheme.textFaint),
                ),
              )
            : ListView.separated(
                padding: const EdgeInsets.all(16),
                itemCount: history.length,
                separatorBuilder: (_, __) => const SizedBox(height: 8),
                itemBuilder: (context, idx) {
                  final r = history[idx];
                  final level = AQIUtils.classify(r.airQuality);

                  return Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    decoration: BoxDecoration(
                      color: AppTheme.surfaceDark,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppTheme.borderDark),
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 44,
                          height: 44,
                          decoration: BoxDecoration(
                            color: level.color.withOpacity(0.12),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          alignment: Alignment.center,
                          child: Text(
                            r.airQuality.round().toString(),
                            style: TextStyle(
                              color: level.color,
                              fontSize: 16,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    level.category,
                                    style: TextStyle(
                                      color: level.color,
                                      fontSize: 13,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                  Text(
                                    Formatters.formatTime(r.createdAt),
                                    style: const TextStyle(
                                      color: AppTheme.textMuted,
                                      fontFamily: 'monospace',
                                      fontSize: 11,
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 4),
                              Text(
                                '${r.temperature.toStringAsFixed(1)}°C • ${r.humidity.toStringAsFixed(0)}% RH • ${r.gasPPM.toStringAsFixed(0)} ppm • Node: ${r.deviceId}',
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
    );
  }
}
