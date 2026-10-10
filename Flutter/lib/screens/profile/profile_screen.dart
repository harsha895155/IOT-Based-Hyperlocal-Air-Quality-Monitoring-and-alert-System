import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme.dart';
import '../../providers/auth_provider.dart';
import '../auth/login_screen.dart';
import '../settings/settings_screen.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final user = auth.user;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Account & Profile'),
        actions: [
          IconButton(
            icon: const Icon(Icons.settings_outlined, size: 20),
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const SettingsScreen()),
              );
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            // Avatar & Name Card
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: AppTheme.surfaceDark,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppTheme.borderDark),
              ),
              child: Column(
                children: [
                  Container(
                    width: 68,
                    height: 68,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: const LinearGradient(
                        colors: [AppTheme.accent, Color(0xFF6366F1)],
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: AppTheme.accent.withOpacity(0.3),
                          blurRadius: 12,
                          spreadRadius: 2,
                        ),
                      ],
                    ),
                    alignment: Alignment.center,
                    child: Text(
                      auth.isGuest ? 'G' : (user?.name.isNotEmpty == true ? user!.name[0].toUpperCase() : 'U'),
                      style: const TextStyle(color: Colors.white, fontSize: 26, fontWeight: FontWeight.w800),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    auth.isGuest ? 'Guest Observer' : (user?.name ?? 'User'),
                    style: const TextStyle(color: AppTheme.textPrimary, fontSize: 18, fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    auth.isGuest ? 'Public monitoring view' : (user?.email ?? ''),
                    style: const TextStyle(color: AppTheme.textFaint, fontSize: 12),
                  ),
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                    decoration: BoxDecoration(
                      color: auth.isGuest
                          ? AppTheme.textFaint.withOpacity(0.12)
                          : AppTheme.accent.withOpacity(0.12),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: auth.isGuest ? AppTheme.borderDark : AppTheme.accent.withOpacity(0.4),
                      ),
                    ),
                    child: Text(
                      auth.isGuest ? 'ROLE: GUEST' : 'ROLE: ${user?.role.toUpperCase() ?? 'USER'}',
                      style: TextStyle(
                        color: auth.isGuest ? AppTheme.textMuted : AppTheme.accent,
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 20),

            if (auth.isGuest) ...[
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppTheme.surfaceDark,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppTheme.borderDark),
                ),
                child: Column(
                  children: [
                    const Icon(Icons.lock_outline, color: AppTheme.accent, size: 36),
                    const SizedBox(height: 10),
                    const Text(
                      'Sign In for Full Access',
                      style: TextStyle(color: AppTheme.textPrimary, fontSize: 15, fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      'Log in with your AirGuard research account to configure hardware thresholds and access system health diagnostics.',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: AppTheme.textMuted, fontSize: 12, height: 1.4),
                    ),
                    const SizedBox(height: 16),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(builder: (_) => const LoginScreen()),
                          );
                        },
                        child: const Text('Sign In / Register'),
                      ),
                    ),
                  ],
                ),
              ),
            ] else ...[
              Container(
                decoration: BoxDecoration(
                  color: AppTheme.surfaceDark,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppTheme.borderDark),
                ),
                child: Column(
                  children: [
                    ListTile(
                      leading: const Icon(Icons.tune, color: AppTheme.accent, size: 20),
                      title: const Text('App & Hardware Settings', style: TextStyle(fontSize: 14)),
                      trailing: const Icon(Icons.chevron_right, color: AppTheme.textFaint),
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => const SettingsScreen()),
                        );
                      },
                    ),
                    const Divider(color: AppTheme.borderDark, height: 1),
                    ListTile(
                      leading: const Icon(Icons.logout, color: AppTheme.statusDanger, size: 20),
                      title: const Text('Sign Out', style: TextStyle(color: AppTheme.statusDanger, fontSize: 14)),
                      onTap: () => auth.logout(),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
