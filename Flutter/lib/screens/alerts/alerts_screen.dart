import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme.dart';
import '../../providers/alerts_provider.dart';
import '../../utils/aqi_utils.dart';
import '../../utils/formatters.dart';

class AlertsScreen extends StatelessWidget {
  const AlertsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final alertsProv = context.watch<AlertsProvider>();
    final alerts = alertsProv.alerts;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Alert Subsystem'),
        actions: [
          if (alertsProv.unacknowledged.isNotEmpty)
            TextButton(
              onPressed: () => alertsProv.acknowledgeAll(),
              child: const Text('Ack All', style: TextStyle(color: AppTheme.accent)),
            ),
          IconButton(
            icon: const Icon(Icons.refresh, size: 20),
            onPressed: () => alertsProv.refresh(),
          ),
        ],
      ),
      body: RefreshIndicator(
        color: AppTheme.accent,
        backgroundColor: AppTheme.surfaceDark,
        onRefresh: () => alertsProv.refresh(),
        child: alertsProv.isLoading && alerts.isEmpty
            ? const Center(child: CircularProgressIndicator(color: AppTheme.accent))
            : alerts.isEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.verified_outlined, color: AppTheme.statusOnline, size: 52),
                        const SizedBox(height: 12),
                        const Text(
                          'All Ambient Readings Normal',
                          style: TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.w700),
                        ),
                        const SizedBox(height: 6),
                        const Text(
                          'No threshold exceedances or hazardous events flagged.',
                          style: TextStyle(color: AppTheme.textFaint, fontSize: 12),
                        ),
                      ],
                    ),
                  )
                : ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: alerts.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 10),
                    itemBuilder: (context, idx) {
                      final a = alerts[idx];
                      final level = AQIUtils.classify(a.airQuality);

                      return Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: AppTheme.surfaceDark,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: a.acknowledged ? AppTheme.borderDark : level.color.withOpacity(0.4),
                          ),
                        ),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              width: 32,
                              height: 32,
                              decoration: BoxDecoration(
                                color: level.color.withOpacity(0.12),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Icon(Icons.warning_amber_rounded, color: level.color, size: 18),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(
                                        '${a.category} (AQI ${a.airQuality.round()})',
                                        style: TextStyle(
                                          color: level.color,
                                          fontSize: 13,
                                          fontWeight: FontWeight.w700,
                                        ),
                                      ),
                                      Text(
                                        Formatters.timeAgo(a.createdAt),
                                        style: const TextStyle(color: AppTheme.textFaint, fontSize: 11),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    a.message,
                                    style: const TextStyle(color: AppTheme.textPrimary, fontSize: 12),
                                  ),
                                  const SizedBox(height: 6),
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(
                                        'Station: ${a.deviceId}',
                                        style: const TextStyle(color: AppTheme.textFaint, fontSize: 11),
                                      ),
                                      if (!a.acknowledged)
                                        InkWell(
                                          onTap: () => alertsProv.acknowledge(a.id),
                                          child: Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                            decoration: BoxDecoration(
                                              color: AppTheme.surfaceRaised,
                                              borderRadius: BorderRadius.circular(6),
                                              border: Border.all(color: AppTheme.borderDark),
                                            ),
                                            child: const Text(
                                              'Acknowledge',
                                              style: TextStyle(
                                                color: AppTheme.accent,
                                                fontSize: 11,
                                                fontWeight: FontWeight.w600,
                                              ),
                                            ),
                                          ),
                                        )
                                      else
                                        const Text(
                                          '✓ Acknowledged',
                                          style: TextStyle(color: AppTheme.textFaint, fontSize: 11),
                                        ),
                                    ],
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
