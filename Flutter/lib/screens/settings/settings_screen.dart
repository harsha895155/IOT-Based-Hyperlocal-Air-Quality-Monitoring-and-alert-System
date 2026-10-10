import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants.dart';
import '../../core/theme.dart';
import '../../providers/settings_provider.dart';
import '../../providers/readings_provider.dart';
import '../../core/api_client.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final _customUrlController = TextEditingController();
  Map<String, dynamic>? _healthInfo;
  bool _isCheckingHealth = false;

  @override
  void initState() {
    super.initState();
    _customUrlController.text = context.read<SettingsProvider>().baseUrl;
  }

  void _probeHealth() async {
    setState(() => _isCheckingHealth = true);
    try {
      final res = await ApiClient.getHealth();
      setState(() => _healthInfo = res);
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Health probe failed: $e')),
      );
    } finally {
      setState(() => _isCheckingHealth = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final settings = context.watch<SettingsProvider>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('System Settings'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Backend Server Configuration
            const Text(
              'BACKEND SERVER ENDPOINT',
              style: TextStyle(
                color: AppTheme.textFaint,
                fontSize: 11,
                fontWeight: FontWeight.w700,
                letterSpacing: 0.8,
              ),
            ),
            const SizedBox(height: 10),
            Container(
              decoration: BoxDecoration(
                color: AppTheme.surfaceDark,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppTheme.borderDark),
              ),
              child: Column(
                children: [
                  RadioListTile<String>(
                    title: const Text('Android Emulator', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                    subtitle: const Text(AppConstants.defaultLocalUrl, style: TextStyle(color: AppTheme.textFaint, fontSize: 11)),
                    value: AppConstants.defaultLocalUrl,
                    groupValue: settings.baseUrl,
                    activeColor: AppTheme.accent,
                    onChanged: (val) {
                      if (val != null) {
                        settings.setBaseUrl(val);
                        context.read<ReadingsProvider>().refresh();
                      }
                    },
                  ),
                  const Divider(color: AppTheme.borderDark, height: 1),
                  RadioListTile<String>(
                    title: const Text('Local Wi-Fi LAN', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                    subtitle: const Text(AppConstants.defaultLanUrl, style: TextStyle(color: AppTheme.textFaint, fontSize: 11)),
                    value: AppConstants.defaultLanUrl,
                    groupValue: settings.baseUrl,
                    activeColor: AppTheme.accent,
                    onChanged: (val) {
                      if (val != null) {
                        settings.setBaseUrl(val);
                        context.read<ReadingsProvider>().refresh();
                      }
                    },
                  ),
                  const Divider(color: AppTheme.borderDark, height: 1),
                  RadioListTile<String>(
                    title: const Text('Production Cloud (Render)', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                    subtitle: const Text(AppConstants.defaultProdUrl, style: TextStyle(color: AppTheme.textFaint, fontSize: 11)),
                    value: AppConstants.defaultProdUrl,
                    groupValue: settings.baseUrl,
                    activeColor: AppTheme.accent,
                    onChanged: (val) {
                      if (val != null) {
                        settings.setBaseUrl(val);
                        context.read<ReadingsProvider>().refresh();
                      }
                    },
                  ),
                ],
              ),
            ),

            const SizedBox(height: 20),

            // Display Units
            const Text(
              'DISPLAY PREFERENCES',
              style: TextStyle(
                color: AppTheme.textFaint,
                fontSize: 11,
                fontWeight: FontWeight.w700,
                letterSpacing: 0.8,
              ),
            ),
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: AppTheme.surfaceDark,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppTheme.borderDark),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Temperature Unit', style: TextStyle(fontSize: 14)),
                  Row(
                    children: [
                      _unitToggle('°C', 'C', settings),
                      const SizedBox(width: 6),
                      _unitToggle('°F', 'F', settings),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 20),

            // System Health Diagnostic Probe
            const Text(
              'HEALTH & CLOUD DIAGNOSTICS',
              style: TextStyle(
                color: AppTheme.textFaint,
                fontSize: 11,
                fontWeight: FontWeight.w700,
                letterSpacing: 0.8,
              ),
            ),
            const SizedBox(height: 10),
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
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Backend Health Probe', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                      ElevatedButton(
                        onPressed: _isCheckingHealth ? null : _probeHealth,
                        child: _isCheckingHealth
                            ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                            : const Text('Ping Health'),
                      ),
                    ],
                  ),
                  if (_healthInfo != null) ...[
                    const SizedBox(height: 12),
                    const Divider(color: AppTheme.borderDark),
                    const SizedBox(height: 8),
                    Text('Status: ${_healthInfo!['status']}', style: const TextStyle(color: AppTheme.statusOnline, fontWeight: FontWeight.w700)),
                    Text('Uptime: ${_healthInfo!['uptimeSeconds']}s', style: const TextStyle(color: AppTheme.textMuted, fontSize: 12)),
                    Text('Database: ${_healthInfo!['database']?['status']}', style: const TextStyle(color: AppTheme.textMuted, fontSize: 12)),
                    Text('Clients: ${_healthInfo!['socketIO']?['connectedClients']}', style: const TextStyle(color: AppTheme.textMuted, fontSize: 12)),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _unitToggle(String label, String key, SettingsProvider settings) {
    final active = settings.tempUnit == key;
    return GestureDetector(
      onTap: () => settings.setTempUnit(key),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: active ? AppTheme.accent : AppTheme.surfaceRaised,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: active ? Colors.black : AppTheme.textPrimary,
            fontWeight: FontWeight.w700,
            fontSize: 12,
          ),
        ),
      ),
    );
  }
}
