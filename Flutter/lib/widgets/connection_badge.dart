import 'package:flutter/material.dart';
import '../core/socket_service.dart';
import '../core/theme.dart';

class ConnectionBadge extends StatelessWidget {
  final SocketStatus status;

  const ConnectionBadge({super.key, required this.status});

  @override
  Widget build(BuildContext context) {
    Color color;
    String label;

    switch (status) {
      case SocketStatus.connected:
        color = AppTheme.statusOnline;
        label = 'Live';
        break;
      case SocketStatus.connecting:
      case SocketStatus.reconnecting:
        color = AppTheme.statusWarning;
        label = 'Syncing';
        break;
      case SocketStatus.disconnected:
      case SocketStatus.error:
      default:
        color = AppTheme.statusOffline;
        label = 'Offline';
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.12),
        borderRadius: BorderRadius.circular(12),
        border: Border.parseBorder(
          BorderSide(color: color.withOpacity(0.3), width: 1),
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 6,
            height: 6,
            decoration: BoxDecoration(
              color: color,
              shape: BoxShape.circle,
              boxShadow: status == SocketStatus.connected
                  ? [BoxShadow(color: color.withOpacity(0.6), blurRadius: 4, spreadRadius: 1)]
                  : null,
            ),
          ),
          const SizedBox(width: 5),
          Text(
            label,
            style: TextStyle(
              color: color,
              fontSize: 11,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}
