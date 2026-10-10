import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/theme.dart';
import '../providers/alerts_provider.dart';
import '../screens/dashboard/dashboard_screen.dart';
import '../screens/devices/devices_screen.dart';
import '../screens/analytics/analytics_screen.dart';
import '../screens/alerts/alerts_screen.dart';
import '../screens/profile/profile_screen.dart';
import '../screens/locations/locations_screen.dart';
import '../screens/history/history_screen.dart';
import '../screens/reports/reports_screen.dart';
import '../screens/settings/settings_screen.dart';

class NavigationShell extends StatefulWidget {
  const NavigationShell({super.key});

  @override
  State<NavigationShell> createState() => _NavigationShellState();
}

class _NavigationShellState extends State<NavigationShell> {
  int _currentIndex = 0;

  final List<Widget> _screens = const [
    DashboardScreen(),
    DevicesScreen(),
    AnalyticsScreen(),
    AlertsScreen(),
    _MoreMenuScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    final alertsProv = context.watch<AlertsProvider>();
    final unreadCount = alertsProv.unacknowledged.length;

    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: _screens,
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (idx) => setState(() => _currentIndex = idx),
        items: [
          const BottomNavigationBarItem(
            icon: Icon(Icons.dashboard_outlined),
            activeIcon: Icon(Icons.dashboard),
            label: 'Live',
          ),
          const BottomNavigationBarItem(
            icon: Icon(Icons.router_outlined),
            activeIcon: Icon(Icons.router),
            label: 'Devices',
          ),
          const BottomNavigationBarItem(
            icon: Icon(Icons.analytics_outlined),
            activeIcon: Icon(Icons.analytics),
            label: 'Analytics',
          ),
          BottomNavigationBarItem(
            icon: Badge(
              isLabelVisible: unreadCount > 0,
              label: Text('$unreadCount'),
              backgroundColor: AppTheme.statusDanger,
              child: const Icon(Icons.notifications_outlined),
            ),
            activeIcon: Badge(
              isLabelVisible: unreadCount > 0,
              label: Text('$unreadCount'),
              backgroundColor: AppTheme.statusDanger,
              child: const Icon(Icons.notifications),
            ),
            label: 'Alerts',
          ),
          const BottomNavigationBarItem(
            icon: Icon(Icons.menu),
            activeIcon: Icon(Icons.menu_open),
            label: 'More',
          ),
        ],
      ),
    );
  }
}

class _MoreMenuScreen extends StatelessWidget {
  const _MoreMenuScreen();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('AirGuard Menu'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _menuTile(
            context,
            icon: Icons.person_outline,
            title: 'Account & Profile',
            subtitle: 'Researcher credentials and preferences',
            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ProfileScreen())),
          ),
          _menuTile(
            context,
            icon: Icons.location_on_outlined,
            title: 'Locations & Micro-Zones',
            subtitle: 'Spatial distribution across campuses',
            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const LocationsScreen())),
          ),
          _menuTile(
            context,
            icon: Icons.history,
            title: 'Telemetry History Logs',
            subtitle: 'Raw sensor packet feed and timeline',
            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const HistoryScreen())),
          ),
          _menuTile(
            context,
            icon: Icons.assessment_outlined,
            title: 'Compliance Reports',
            subtitle: 'NAAQS, US-EPA, and WHO standards',
            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ReportsScreen())),
          ),
          _menuTile(
            context,
            icon: Icons.settings_outlined,
            title: 'Backend & Endpoint Settings',
            subtitle: 'Configure IP addresses and display units',
            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const SettingsScreen())),
          ),
        ],
      ),
    );
  }

  Widget _menuTile(
    BuildContext context, {
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: AppTheme.surfaceDark,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppTheme.borderDark),
      ),
      child: ListTile(
        leading: Container(
          width: 38,
          height: 38,
          decoration: BoxDecoration(
            color: AppTheme.accent.withOpacity(0.12),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, color: AppTheme.accent, size: 20),
        ),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
        subtitle: Text(subtitle, style: const TextStyle(color: AppTheme.textFaint, fontSize: 11)),
        trailing: const Icon(Icons.chevron_right, color: AppTheme.textFaint, size: 20),
        onTap: onTap,
      ),
    );
  }
}
