import 'package:flutter/material.dart';
import '../core/theme.dart';
import '../models/alert_model.dart';
import '../utils/aqi_utils.dart';

class AlertBanner extends StatelessWidget {
  final AlertModel alert;
  final VoidCallback? onDismiss;

  const AlertBanner({
    super.key,
    required this.alert,
    this.onDismiss,
  });

  @override
  Widget build(BuildContext context) {
    final level = AQIUtils.classify(alert.airQuality);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: level.color.withOpacity(0.12),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: level.color.withOpacity(0.35)),
      ),
      child: Row(
        children: [
          Icon(Icons.warning_amber_rounded, color: level.color, size: 20),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${alert.category.toUpperCase()} ALERT — ${alert.deviceId}',
                  style: TextStyle(
                    color: level.color,
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  alert.message,
                  style: const TextStyle(
                    color: AppTheme.textPrimary,
                    fontSize: 12,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          if (onDismiss != null)
            IconButton(
              icon: const Icon(Icons.check_circle_outline, size: 18),
              color: level.color,
              onPressed: onDismiss,
              tooltip: 'Acknowledge alert',
            ),
        ],
      ),
    );
  }
}
