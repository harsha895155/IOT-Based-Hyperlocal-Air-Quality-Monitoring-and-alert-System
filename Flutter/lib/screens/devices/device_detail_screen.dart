import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme.dart';
import '../../models/device_model.dart';
import '../../providers/devices_provider.dart';
import '../../providers/readings_provider.dart';
import '../../utils/aqi_utils.dart';
import '../../utils/formatters.dart';
import '../../widgets/metric_card.dart';

class DeviceDetailScreen extends StatefulWidget {
  final DeviceModel device;

  const DeviceDetailScreen({super.key, required this.device});

  @override
  State<DeviceDetailScreen> createState() => _DeviceDetailScreenState();
}

class _DeviceDetailScreenState extends State<DeviceDetailScreen> {
  int? _pingMs;
  bool _isPinging = false;

  void _runPing() async {
    setState(() => _isPinging = true);
    final ms = await context.read<DevicesProvider>().pingDevice();
    if (mounted) {
      setState(() {
        _pingMs = ms;
        _isPinging = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final dev = widget.device;
    final aqiLevel = dev.aqi != null ? AQIUtils.classify(dev.aqi) : null;

    return Scaffold(
      appBar: AppBar(
        title: Text(dev.name),
        actions: [
          TextButton.icon(
            icon: _isPinging
                ? const SizedBox(
                    width: 12,
                    height: 12,
                    child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.accent),
                  )
                : const Icon(Icons.bolt, size: 16, color: AppTheme.accent),
            label: Text(
              _pingMs != null ? '${_pingMs}ms' : 'Echo Ping',
              style: const TextStyle(color: AppTheme.accent, fontSize: 12),
            ),
            onPressed: _isPinging ? null : _runPing,
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header card
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: AppTheme.surfaceDark,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppTheme.borderDark),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        dev.deviceId,
                        style: const TextStyle(
                          color: AppTheme.accent,
                          fontFamily: 'monospace',
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: dev.isOnline
                              ? AppTheme.statusOnline.withOpacity(0.12)
                              : AppTheme.statusOffline.withOpacity(0.12),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          dev.status,
                          style: TextStyle(
                            color: dev.isOnline ? AppTheme.statusOnline : AppTheme.textMuted,
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    dev.name,
                    style: const TextStyle(
                      color: AppTheme.textPrimary,
                      fontSize: 22,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Station: ${dev.location} • Last packet: ${Formatters.timeAgo(dev.lastSeen)}',
                    style: const TextStyle(color: AppTheme.textFaint, fontSize: 12),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 16),

            // Live Metrics
            GridView.count(
              crossAxisCount: 2,
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
              childAspectRatio: 1.3,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              children: [
                MetricCard(
                  label: 'Air Quality Index',
                  value: dev.aqi != null ? dev.aqi!.round().toString() : '—',
                  unit: aqiLevel != null ? aqiLevel.category : '',
                  subtitle: 'US-EPA / NAAQS',
                  icon: Icons.air,
                  iconColor: aqiLevel != null ? aqiLevel.color : AppTheme.accent,
                ),
                MetricCard(
                  label: 'Temperature',
                  value: dev.temperature != null ? dev.temperature!.toStringAsFixed(1) : '—',
                  unit: '°C',
                  subtitle: 'DHT22 Sensor',
                  icon: Icons.thermostat_outlined,
                  iconColor: const Color(0xFFF59E0B),
                ),
                MetricCard(
                  label: 'Humidity',
                  value: dev.humidity != null ? dev.humidity!.toStringAsFixed(1) : '—',
                  unit: '%',
                  subtitle: 'Relative Moisture',
                  icon: Icons.water_drop_outlined,
                  iconColor: const Color(0xFF06B6D4),
                ),
                MetricCard(
                  label: 'Gas Chamber',
                  value: dev.gasPPM != null ? dev.gasPPM!.toStringAsFixed(0) : '—',
                  unit: 'ppm',
                  subtitle: 'MQ-135 Sensor',
                  icon: Icons.cloud_outlined,
                  iconColor: const Color(0xFFA855F7),
                ),
              ],
            ),

            const SizedBox(height: 16),

            // Hardware Specifications (Base Paper Section V)
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppTheme.surfaceDark,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppTheme.borderDark),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'HARDWARE SPECIFICATIONS & PINOUTS',
                    style: TextStyle(
                      color: AppTheme.textFaint,
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.8,
                    ),
                  ),
                  const SizedBox(height: 14),
                  _specRow('Microcontroller', 'ESP32-WROOM-32 (Xtensa Dual-Core)'),
                  _specRow('Gas Chamber', 'MQ-135 (Analog GPIO 34 / ADC1)'),
                  _specRow('Temp & Humidity', 'DHT22 (Digital GPIO 27)'),
                  _specRow('Sampling Rate', '15 Seconds Non-blocking FreeRTOS'),
                  _specRow('Watchdog Threshold', '60 Seconds Timeout'),
                  _specRow('Interface Protocol', 'HTTP REST / JSON / Socket.IO'),
                ],
              ),
            ),

            const SizedBox(height: 20),

            // Set as active monitoring station button
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                icon: const Icon(Icons.check_circle_outline, size: 18),
                label: const Text('Set as Active Monitoring Node'),
                onPressed: () {
                  context.read<ReadingsProvider>().setSelectedDevice(dev.deviceId);
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('Switched active monitoring station to ${dev.name}'),
                      duration: const Duration(seconds: 2),
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _specRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: AppTheme.textMuted, fontSize: 12)),
          Text(
            value,
            style: const TextStyle(color: AppTheme.textPrimary, fontSize: 12, fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
  }
}
