import 'package:flutter/material.dart';
import '../core/theme.dart';
import '../utils/aqi_utils.dart';

class AQIGauge extends StatelessWidget {
  final double? aqi;
  final String? lastUpdated;

  const AQIGauge({
    super.key,
    required this.aqi,
    this.lastUpdated,
  });

  @override
  Widget build(BuildContext context) {
    final level = AQIUtils.classify(aqi);
    final advice = AQIUtils.healthRecommendation(aqi);
    final aqiDisplay = aqi != null ? aqi!.round().toString() : '—';

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppTheme.surfaceDark,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.borderDark),
        boxShadow: const [
          BoxShadow(
            color: Colors.black26,
            blurRadius: 10,
            offset: Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'AIR QUALITY INDEX',
                style: TextStyle(
                  color: AppTheme.textFaint,
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.8,
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: level.color.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: level.color.withOpacity(0.4)),
                ),
                child: Text(
                  level.category,
                  style: TextStyle(
                    color: level.color,
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              Text(
                aqiDisplay,
                style: TextStyle(
                  color: level.color,
                  fontSize: 54,
                  fontWeight: FontWeight.w800,
                  letterSpacing: -1.5,
                ),
              ),
              const SizedBox(width: 8),
              const Text(
                'AQI',
                style: TextStyle(
                  color: AppTheme.textMuted,
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const Spacer(),
              if (lastUpdated != null)
                Text(
                  lastUpdated!,
                  style: const TextStyle(
                    color: AppTheme.textFaint,
                    fontSize: 11,
                  ),
                ),
            ],
          ),
          const SizedBox(height: 12),
          // Visual scale range indicator (0 to 500)
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: SizedBox(
              height: 6,
              child: Stack(
                children: [
                  Container(
                    decoration: const BoxDecoration(
                      gradient: LinearGradient(
                        colors: [
                          AppTheme.aqiGood,
                          AppTheme.aqiModerate,
                          AppTheme.aqiUnhealthySG,
                          AppTheme.aqiUnhealthy,
                          AppTheme.aqiVeryUnhealthy,
                          AppTheme.aqiHazardous,
                        ],
                      ),
                    ),
                  ),
                  if (aqi != null)
                    Align(
                      alignment: Alignment(
                        ((aqi!.clamp(0, 500) / 500) * 2) - 1,
                        0,
                      ),
                      child: Container(
                        width: 8,
                        height: 8,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.black, width: 1.5),
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 14),
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: level.color.withOpacity(0.08),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: level.color.withOpacity(0.2)),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(Icons.health_and_safety_outlined, color: level.color, size: 18),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    advice,
                    style: TextStyle(
                      color: AppTheme.textPrimary.withOpacity(0.9),
                      fontSize: 12,
                      height: 1.35,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
