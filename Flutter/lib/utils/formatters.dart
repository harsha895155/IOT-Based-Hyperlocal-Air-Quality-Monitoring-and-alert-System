import 'package:intl/intl.dart';

class Formatters {
  static String timeAgo(DateTime? date) {
    if (date == null) return 'Never';
    final elapsed = DateTime.now().difference(date);
    if (elapsed.inSeconds < 45) return 'just now';
    if (elapsed.inMinutes < 60) return '${elapsed.inMinutes}m ago';
    if (elapsed.inHours < 24) return '${elapsed.inHours}h ago';
    if (elapsed.inDays < 7) return '${elapsed.inDays}d ago';
    return DateFormat('MMM d, y').format(date);
  }

  static String formatDateTime(DateTime? date) {
    if (date == null) return '—';
    return DateFormat('MMM d, y • h:mm a').format(date);
  }

  static String formatTime(DateTime? date) {
    if (date == null) return '—';
    return DateFormat('h:mm a').format(date);
  }

  static double toFahrenheit(double celsius) {
    return (celsius * 9 / 5) + 32;
  }
}
