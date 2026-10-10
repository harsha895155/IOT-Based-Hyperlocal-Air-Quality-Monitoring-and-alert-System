import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme.dart';
import '../../providers/devices_provider.dart';
import '../../utils/aqi_utils.dart';
import '../../utils/formatters.dart';
import 'device_detail_screen.dart';
import 'add_device_screen.dart';

class DevicesScreen extends StatelessWidget {
  const DevicesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final devicesProv = context.watch<DevicesProvider>();
    final devices = devicesProv.devices;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Fleet Devices'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add, size: 22),
            tooltip: 'Add New Device',
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const AddDeviceScreen()),
              );
            },
          ),
          IconButton(
            icon: const Icon(Icons.refresh, size: 20),
            tooltip: 'Refresh',
            onPressed: () => devicesProv.refresh(),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppTheme.accent,
        foregroundColor: Colors.black,
        icon: const Icon(Icons.add, size: 20),
        label: const Text('Add Device', style: TextStyle(fontWeight: FontWeight.bold)),
        onPressed: () {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => const AddDeviceScreen()),
          );
        },
      ),
      body: RefreshIndicator(
        color: AppTheme.accent,
        backgroundColor: AppTheme.surfaceDark,
        onRefresh: () => devicesProv.refresh(),
        child: devicesProv.isLoading && devices.isEmpty
            ? const Center(child: CircularProgressIndicator(color: AppTheme.accent))
            : devices.isEmpty
                ? Center(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 32),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.sensors_off_outlined, color: AppTheme.textFaint, size: 48),
                          const SizedBox(height: 12),
                          const Text(
                            'No Sensing Nodes Found',
                            style: TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.w600),
                          ),
                          const SizedBox(height: 6),
                          const Text(
                            'Connect an ESP32 node to your account to begin hyperlocal monitoring.',
                            textAlign: TextAlign.center,
                            style: TextStyle(color: AppTheme.textFaint, fontSize: 12),
                          ),
                          const SizedBox(height: 20),
                          ElevatedButton.icon(
                            icon: const Icon(Icons.add),
                            label: const Text('Add New Device'),
                            onPressed: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(builder: (_) => const AddDeviceScreen()),
                              );
                            },
                          ),
                          const SizedBox(height: 8),
                          TextButton(
                            onPressed: () => devicesProv.refresh(),
                            child: const Text('Retry Probe', style: TextStyle(color: AppTheme.textMuted)),
                          ),
                        ],
                      ),
                    ),
                  )
                : ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: devices.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 12),
                    itemBuilder: (context, idx) {
                      final dev = devices[idx];
                      final aqiLevel = dev.aqi != null ? AQIUtils.classify(dev.aqi) : null;

                      return InkWell(
                        onTap: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => DeviceDetailScreen(device: dev),
                            ),
                          );
                        },
                        borderRadius: BorderRadius.circular(14),
                        child: Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: AppTheme.surfaceDark,
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(color: AppTheme.borderDark),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Row(
                                    children: [
                                      Container(
                                        width: 8,
                                        height: 8,
                                        decoration: BoxDecoration(
                                          color: dev.isOnline ? AppTheme.statusOnline : AppTheme.statusOffline,
                                          shape: BoxShape.circle,
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      Text(
                                        dev.name,
                                        style: const TextStyle(
                                          color: AppTheme.textPrimary,
                                          fontSize: 15,
                                          fontWeight: FontWeight.w700,
                                        ),
                                      ),
                                    ],
                                  ),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                    decoration: BoxDecoration(
                                      color: dev.isOnline
                                          ? AppTheme.statusOnline.withOpacity(0.12)
                                          : AppTheme.statusOffline.withOpacity(0.12),
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    child: Text(
                                      dev.status,
                                      style: TextStyle(
                                        color: dev.isOnline ? AppTheme.statusOnline : AppTheme.textMuted,
                                        fontSize: 11,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 8),
                              Row(
                                children: [
                                  const Icon(Icons.place_outlined, size: 14, color: AppTheme.textFaint),
                                  const SizedBox(width: 4),
                                  Text(
                                    dev.location,
                                    style: const TextStyle(color: AppTheme.textMuted, fontSize: 12),
                                  ),
                                  const Spacer(),
                                  Text(
                                    'Last seen ${Formatters.timeAgo(dev.lastSeen)}',
                                    style: const TextStyle(color: AppTheme.textFaint, fontSize: 11),
                                  ),
                                ],
                              ),
                              const Divider(color: AppTheme.borderDark, height: 20),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      const Text('AQI', style: TextStyle(color: AppTheme.textFaint, fontSize: 10)),
                                      Text(
                                        dev.aqi != null ? dev.aqi!.round().toString() : '—',
                                        style: TextStyle(
                                          color: aqiLevel != null ? aqiLevel.color : AppTheme.textPrimary,
                                          fontSize: 16,
                                          fontWeight: FontWeight.w700,
                                        ),
                                      ),
                                    ],
                                  ),
                                  Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      const Text('TEMP', style: TextStyle(color: AppTheme.textFaint, fontSize: 10)),
                                      Text(
                                        dev.temperature != null ? '${dev.temperature!.toStringAsFixed(1)}°C' : '—',
                                        style: const TextStyle(
                                          color: AppTheme.textPrimary,
                                          fontSize: 14,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                    ],
                                  ),
                                  Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      const Text('HUMIDITY', style: TextStyle(color: AppTheme.textFaint, fontSize: 10)),
                                      Text(
                                        dev.humidity != null ? '${dev.humidity!.toStringAsFixed(1)}%' : '—',
                                        style: const TextStyle(
                                          color: AppTheme.textPrimary,
                                          fontSize: 14,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                    ],
                                  ),
                                  Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      const Text('GAS PPM', style: TextStyle(color: AppTheme.textFaint, fontSize: 10)),
                                      Text(
                                        dev.gasPPM != null ? '${dev.gasPPM!.toStringAsFixed(0)}' : '—',
                                        style: const TextStyle(
                                          color: AppTheme.textPrimary,
                                          fontSize: 14,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
      ),
    );
  }
}
