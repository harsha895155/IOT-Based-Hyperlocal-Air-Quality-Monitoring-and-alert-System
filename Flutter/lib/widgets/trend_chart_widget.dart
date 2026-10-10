import 'package:flutter/material.dart';
import '../core/theme.dart';
import '../models/reading_model.dart';

class TrendChartWidget extends StatefulWidget {
  final List<ReadingModel> readings;

  const TrendChartWidget({super.key, required this.readings});

  @override
  State<TrendChartWidget> createState() => _TrendChartWidgetState();
}

class _TrendChartWidgetState extends State<TrendChartWidget> {
  String _selectedMetric = 'aqi'; // 'aqi', 'temperature', 'gasPPM'

  @override
  Widget build(BuildContext context) {
    if (widget.readings.isEmpty) {
      return Container(
        height: 180,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: AppTheme.surfaceDark,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppTheme.borderDark),
        ),
        child: const Text(
          'No telemetry points recorded yet',
          style: TextStyle(color: AppTheme.textFaint, fontSize: 12),
        ),
      );
    }

    final reversed = widget.readings.reversed.toList();
    List<double> values = [];
    Color lineColor = AppTheme.accent;
    String unit = '';

    if (_selectedMetric == 'aqi') {
      values = reversed.map((r) => r.airQuality).toList();
      lineColor = AppTheme.accent;
      unit = 'AQI';
    } else if (_selectedMetric == 'temperature') {
      values = reversed.map((r) => r.temperature).toList();
      lineColor = const Color(0xFFF59E0B);
      unit = '°C';
    } else {
      values = reversed.map((r) => r.humidity).toList();
      lineColor = const Color(0xFF06B6D4);
      unit = '%';
    }

    return Container(
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
              const Text(
                'TELEMETRY TREND',
                style: TextStyle(
                  color: AppTheme.textFaint,
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.8,
                ),
              ),
              Row(
                children: [
                  _metricChip('AQI', 'aqi'),
                  const SizedBox(width: 4),
                  _metricChip('Temp', 'temperature'),
                  const SizedBox(width: 4),
                  _metricChip('Humidity', 'humidity'),
                ],
              ),
            ],
          ),
          const SizedBox(height: 16),
          SizedBox(
            height: 140,
            width: double.infinity,
            child: CustomPaint(
              painter: _SparklinePainter(
                values: values,
                lineColor: lineColor,
                isAQI: _selectedMetric == 'aqi',
              ),
            ),
          ),
          const SizedBox(height: 10),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Min: ${values.reduce((a, b) => a < b ? a : b).toStringAsFixed(1)} $unit',
                style: const TextStyle(color: AppTheme.textMuted, fontSize: 10),
              ),
              Text(
                'Avg: ${(values.reduce((a, b) => a + b) / values.length).toStringAsFixed(1)} $unit',
                style: const TextStyle(color: AppTheme.textMuted, fontSize: 10),
              ),
              Text(
                'Max: ${values.reduce((a, b) => a > b ? a : b).toStringAsFixed(1)} $unit',
                style: const TextStyle(color: AppTheme.textMuted, fontSize: 10),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _metricChip(String label, String key) {
    final active = _selectedMetric == key;
    return GestureDetector(
      onTap: () => setState(() => _selectedMetric = key),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
        decoration: BoxDecoration(
          color: active ? AppTheme.surfaceRaised : Colors.transparent,
          borderRadius: BorderRadius.circular(6),
          border: Border.all(
            color: active ? AppTheme.accent.withOpacity(0.4) : Colors.transparent,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: active ? AppTheme.accent : AppTheme.textFaint,
            fontSize: 10,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
    );
  }
}

class _SparklinePainter extends CustomPainter {
  final List<double> values;
  final Color lineColor;
  final bool isAQI;

  _SparklinePainter({
    required this.values,
    required this.lineColor,
    required this.isAQI,
  });

  @override
  void paint(Canvas canvas, Size size) {
    if (values.length < 2) return;

    double min = values.reduce((a, b) => a < b ? a : b);
    double max = values.reduce((a, b) => a > b ? a : b);
    if (min == max) {
      min -= 1;
      max += 1;
    }

    // Grid baseline
    final gridPaint = Paint()
      ..color = AppTheme.borderDark
      ..strokeWidth = 1;
    canvas.drawLine(Offset(0, size.height), Offset(size.width, size.height), gridPaint);
    canvas.drawLine(Offset(0, size.height / 2), Offset(size.width, size.height / 2), gridPaint);

    // Draw EPA Reference Line at 50 & 100 if in AQI mode (Base Paper Fig. 4)
    if (isAQI && max > 50) {
      final refPaint = Paint()
        ..color = AppTheme.aqiModerate.withOpacity(0.3)
        ..strokeWidth = 1
        ..style = PaintingStyle.stroke;
      final y50 = size.height - ((50 - min) / (max - min) * size.height).clamp(0.0, size.height);
      canvas.drawLine(Offset(0, y50), Offset(size.width, y50), refPaint);
    }

    final path = Path();
    final fillPath = Path();

    final stepX = size.width / (values.length - 1);

    for (int i = 0; i < values.length; i++) {
      final x = i * stepX;
      final normalized = (values[i] - min) / (max - min);
      final y = size.height - (normalized * size.height);

      if (i == 0) {
        path.moveTo(x, y);
        fillPath.moveTo(x, size.height);
        fillPath.lineTo(x, y);
      } else {
        path.lineTo(x, y);
        fillPath.lineTo(x, y);
      }

      if (i == values.length - 1) {
        fillPath.lineTo(x, size.height);
        fillPath.close();
      }
    }

    // Fill gradient
    final fillGradient = LinearGradient(
      begin: Alignment.topCenter,
      end: Alignment.bottomCenter,
      colors: [
        lineColor.withOpacity(0.25),
        lineColor.withOpacity(0.0),
      ],
    );
    final fillPaint = Paint()
      ..shader = fillGradient.createShader(Rect.fromLTWH(0, 0, size.width, size.height))
      ..style = PaintingStyle.fill;
    canvas.drawPath(fillPath, fillPaint);

    // Stroke line
    final linePaint = Paint()
      ..color = lineColor
      ..strokeWidth = 2.5
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;
    canvas.drawPath(path, linePaint);
  }

  @override
  bool shouldRepaint(covariant _SparklinePainter oldDelegate) {
    return oldDelegate.values != values || oldDelegate.lineColor != lineColor;
  }
}
