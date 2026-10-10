import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'core/theme.dart';
import 'core/storage_service.dart';
import 'core/socket_service.dart';
import 'providers/auth_provider.dart';
import 'providers/readings_provider.dart';
import 'providers/devices_provider.dart';
import 'providers/alerts_provider.dart';
import 'providers/settings_provider.dart';
import 'widgets/navigation_shell.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await StorageService.init();

  // Connect live Socket.IO client in background
  SocketService().connect();

  runApp(const AirGuardApp());
}

class AirGuardApp extends StatelessWidget {
  const AirGuardApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => SettingsProvider()),
        ChangeNotifierProvider(create: (_) => ReadingsProvider()),
        ChangeNotifierProvider(create: (_) => DevicesProvider()),
        ChangeNotifierProvider(create: (_) => AlertsProvider()),
        ChangeNotifierProvider.value(value: SocketService()),
      ],
      child: MaterialApp(
        title: 'AirGuard Mobile',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.darkTheme,
        home: const NavigationShell(),
      ),
    );
  }
}
