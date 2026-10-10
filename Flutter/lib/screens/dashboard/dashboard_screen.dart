import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme.dart';
import '../../core/socket_service.dart';
import '../../providers/readings_provider.dart';
import '../../providers/devices_provider.dart';
import '../../providers/alerts_provider.dart';
import '../../providers/settings_provider.dart';
import '../../utils/formatters.dart';
import '../../widgets/aqi_gauge.dart';
import '../../widgets/metric_card.dart';
import '../../widgets/trend_chart_widget.dart';
import '../../widgets/alert_banner.dart';
import '../../widgets/connection_badge.dart';

class DashboardScreen extends StatelessWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final readingsProv = context.watch<ReadingsProvider>();
    final devicesProv = context.watch<DevicesProvider>();
    final alertsProv = context.watch<AlertsProvider>();
    final settingsProv = context.watch<SettingsProvider>();
    final socketService = context.watch<SocketService>();

    final reading = readingsProv.latest;
    final activeAlerts = alertsProv.unacknowledged;
    final devices = devicesProv.devices;

    final tempVal = reading?.temperature;
    String displayTemp = '—';
    String tempUnit = '°C';
    if (tempVal != null) {
      if (settingsProv.isCelsius) {
        displayTemp = tempVal.toStringAsFixed(1);
        tempUnit = '°C';
      } else {
        displayTemp = Formatters.toFahrenheit(tempVal).toStringAsFixed(1);
        tempUnit = '°F';
      }
    }

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              width: 10,
              height: 10,
              decoration: const BoxDecoration(
                shape: BoxShape.circle,
                gradient: LinearGradient(
                  colors: [AppTheme.accent, Color(0xFF6366F1)],
                ),
              ),
            ),
            const SizedBox(width: 8),
            const Text('AirGuard Live'),
          ],
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: ConnectionBadge(status: socketService.status),
          ),
        ],
      ),
      body: RefreshIndicator(
        color: AppTheme.accent,
        backgroundColor: AppTheme.surfaceDark,
        onRefresh: () async {
          await Future.wait([
            readingsProv.refresh(),
            devicesProv.refresh(),
            alertsProv.refresh(),
          ]);
        },
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Device / Station Selector
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                decoration: BoxDecoration(
                  color: AppTheme.surfaceDark,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppTheme.borderDark),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.router_outlined, color: AppTheme.accent, size: 18),
                    const SizedBox(width: 10),
                    Expanded(
                      child: DropdownButtonHideUnderline(
                        child: DropdownButton<String>(
                          value: devices.any((d) => d.deviceId == readingsProv.selectedDeviceId)
                              ? readingsProv.selectedDeviceId
                              : (devices.isNotEmpty ? devices.first.deviceId : 'esp32-node-01'),
                          dropdownColor: AppTheme.surfaceRaised,
                          isExpanded: true,
                          icon: const Icon(Icons.arrow_drop_down, color: AppTheme.textFaint),
                          items: devices.isEmpty
                              ? [
                                  const DropdownMenuItem(
                                    value: 'esp32-node-01',
                                    child: Text('AIRGUARD-001 (Default Node)'),
                                  )
                                ]
                              : devices.map((d) {
                                  return DropdownMenuItem(
                                    value: d.deviceId,
                                    child: Text(
                                      '${d.name} (${d.location})',
                                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                                    ),
                                  );
                                }).toList(),
                          onChanged: (val) {
                            if (val != null) readingsProv.setSelectedDevice(val);
                          },
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 14),

              // Active Alerts Banner (if any)
              if (activeAlerts.isNotEmpty)
                ...activeAlerts.take(2).map(
                      (a) => AlertBanner(
                        alert: a,
                        onDismiss: () => alertsProv.acknowledge(a.id),
                      ),
                    ),

              // Primary AQI Gauge
              AQIGauge(
                aqi: reading?.airQuality,
                lastUpdated: reading != null ? 'Updated ${Formatters.timeAgo(reading.createdAt)}' : 'Awaiting signal',
              ),

              const SizedBox(height: 16),

              // Environmental Telemetry 4-Card Grid
              GridView.count(
                crossAxisCount: 2,
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
                childAspectRatio: 1.25,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                children: [
                  MetricCard(
                    label: 'Temperature',
                    value: displayTemp,
                    unit: tempUnit,
                    subtitle: 'DHT22 Sensor',
                    icon: Icons.thermostat_outlined,
                    iconColor: const Color(0xFFF59E0B),
                  ),
                  MetricCard(
                    label: 'Humidity',
                    value: reading != null ? reading.humidity.toStringAsFixed(1) : '—',
                    unit: '%',
                    subtitle: 'Relative Moisture',
                    icon: Icons.water_drop_outlined,
                    iconColor: const Color(0xFF06B6D4),
                  ),
                  MetricCard(
                    label: 'Gas Chamber',
                    value: reading != null ? reading.gasPPM.toStringAsFixed(1) : '—',
                    unit: 'ppm',
                    subtitle: 'MQ-135 (GPIO 34)',
                    icon: Icons.air_outlined,
                    iconColor: const Color(0xFFA855F7),
                  ),
                  MetricCard(
                    label: 'Fleet Nodes',
                    value: '${devicesProv.onlineCount}/${devicesProv.totalCount}',
                    unit: 'online',
                    subtitle: 'Smart City Fleet',
                    icon: Icons.hub_outlined,
                    iconColor: AppTheme.statusOnline,
                  ),
                ],
              ),

              const SizedBox(height: 16),

              // Historical Telemetry Sparkline / Trend (Figure 4 EPA scale)
              TrendChartWidget(readings: readingsProv.history),

              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }
}
