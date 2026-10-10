import 'package:flutter/material.dart';
import '../../core/theme.dart';

class ReportsScreen extends StatefulWidget {
  const ReportsScreen({super.key});

  @override
  State<ReportsScreen> createState() => _ReportsScreenState();
}

class _ReportsScreenState extends State<ReportsScreen> {
  String _selectedStandard = 'NAAQS'; // 'NAAQS', 'EPA', 'WHO'

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Compliance Reports'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Standard selector pills
            Row(
              children: [
                _standardChip('NAAQS (India)', 'NAAQS'),
                const SizedBox(width: 8),
                _standardChip('US-EPA', 'EPA'),
                const SizedBox(width: 8),
                _standardChip('WHO Guidelines', 'WHO'),
              ],
            ),

            const SizedBox(height: 18),

            // Compliance status card
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
                        '$_selectedStandard COMPLIANCE',
                        style: const TextStyle(
                          color: AppTheme.textFaint,
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.8,
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                        decoration: BoxDecoration(
                          color: AppTheme.statusOnline.withOpacity(0.12),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: const Text(
                          '94.2% Satisfactory',
                          style: TextStyle(
                            color: AppTheme.statusOnline,
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  const Text(
                    'Micro-station air safety compliance calculated against official environmental standards over the active monitoring window.',
                    style: TextStyle(color: AppTheme.textMuted, fontSize: 13, height: 1.4),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 16),

            // Regulatory Thresholds reference table
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
                    'REGULATORY THRESHOLDS & BENCHMARKS',
                    style: TextStyle(
                      color: AppTheme.textFaint,
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.8,
                    ),
                  ),
                  const SizedBox(height: 12),
                  _tableRow('Standard Benchmark', _selectedStandard),
                  _tableRow('Sampling Interval', '15 Seconds (Real-Time)'),
                  _tableRow('Sensor Transducers', 'MQ-135 + DHT22 (Dual-Core)'),
                  _tableRow('Exceedance Threshold', 'AQI > 100 (Unhealthy SG)'),
                  _tableRow('Permissible Limit', '50 AQI (Clean Air Standard)'),
                ],
              ),
            ),

            const SizedBox(height: 20),

            // Export action
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                icon: const Icon(Icons.download_outlined, size: 18),
                label: const Text('Export Compliance Audit Log (CSV)'),
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Compliance report generated successfully.'),
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

  Widget _standardChip(String label, String key) {
    final active = _selectedStandard == key;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _selectedStandard = key),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 8),
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: active ? AppTheme.surfaceRaised : AppTheme.surfaceDark,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: active ? AppTheme.accent : AppTheme.borderDark,
            ),
          ),
          child: Text(
            label,
            style: TextStyle(
              color: active ? AppTheme.accent : AppTheme.textMuted,
              fontSize: 11,
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
      ),
    );
  }

  Widget _tableRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
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
