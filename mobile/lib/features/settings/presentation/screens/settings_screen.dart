import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/providers/auth_provider.dart';

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        title: const Text('Settings', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, color: Colors.white),
          onPressed: () => context.pop(),
        ),
      ),
      body: ListView(
        children: [
          _buildSection('Account', [
            _buildTile(
              icon: Icons.person_outline,
              label: 'Edit Profile',
              onTap: () => context.push('/profile/edit'),
            ),
            _buildTile(
              icon: Icons.lock_outline,
              label: 'Change Password',
              onTap: () {},
            ),
            _buildTile(
              icon: Icons.phone_android,
              label: 'Phone Number',
              onTap: () {},
            ),
          ]),
          _buildSection('Privacy', [
            _buildSwitchTile(
              icon: Icons.visibility_outlined,
              label: 'Profile Visibility',
              subtitle: 'Allow others to find your profile',
              value: true,
              onChanged: (_) {},
            ),
            _buildSwitchTile(
              icon: Icons.location_on_outlined,
              label: 'Show Location',
              subtitle: 'Display your country/region',
              value: false,
              onChanged: (_) {},
            ),
            _buildTile(
              icon: Icons.block,
              label: 'Blocked Users',
              onTap: () {},
            ),
          ]),
          _buildSection('Notifications', [
            _buildSwitchTile(
              icon: Icons.notifications_outlined,
              label: 'Push Notifications',
              value: true,
              onChanged: (_) {},
            ),
            _buildSwitchTile(
              icon: Icons.chat_bubble_outline,
              label: 'Message Notifications',
              value: true,
              onChanged: (_) {},
            ),
            _buildSwitchTile(
              icon: Icons.card_giftcard,
              label: 'Gift Notifications',
              value: true,
              onChanged: (_) {},
            ),
          ]),
          _buildSection('Audio & Video', [
            _buildSwitchTile(
              icon: Icons.mic_outlined,
              label: 'Noise Cancellation',
              value: true,
              onChanged: (_) {},
            ),
            _buildTile(
              icon: Icons.volume_up_outlined,
              label: 'Audio Quality',
              trailing: const Text('High', style: TextStyle(color: AppColors.primary, fontSize: 13)),
              onTap: () {},
            ),
          ]),
          _buildSection('App', [
            _buildTile(
              icon: Icons.language,
              label: 'Language',
              trailing: const Text('English', style: TextStyle(color: Colors.white54, fontSize: 13)),
              onTap: () {},
            ),
            _buildTile(
              icon: Icons.color_lens_outlined,
              label: 'Theme',
              trailing: const Text('Dark', style: TextStyle(color: Colors.white54, fontSize: 13)),
              onTap: () {},
            ),
            _buildTile(
              icon: Icons.storage_outlined,
              label: 'Clear Cache',
              onTap: () => _showClearCacheDialog(context),
            ),
          ]),
          _buildSection('Support', [
            _buildTile(
              icon: Icons.help_outline,
              label: 'Help Center',
              onTap: () {},
            ),
            _buildTile(
              icon: Icons.bug_report_outlined,
              label: 'Report a Problem',
              onTap: () {},
            ),
            _buildTile(
              icon: Icons.info_outline,
              label: 'About VOXO',
              trailing: const Text('v1.0.0', style: TextStyle(color: Colors.white38, fontSize: 12)),
              onTap: () {},
            ),
            _buildTile(
              icon: Icons.description_outlined,
              label: 'Terms of Service',
              onTap: () {},
            ),
            _buildTile(
              icon: Icons.privacy_tip_outlined,
              label: 'Privacy Policy',
              onTap: () {},
            ),
          ]),
          _buildSection('Danger Zone', [
            _buildTile(
              icon: Icons.logout,
              label: 'Log Out',
              iconColor: Colors.orange,
              labelColor: Colors.orange,
              onTap: () => _showLogoutDialog(context, ref),
            ),
            _buildTile(
              icon: Icons.delete_forever_outlined,
              label: 'Delete Account',
              iconColor: Colors.red,
              labelColor: Colors.red,
              onTap: () => _showDeleteAccountDialog(context),
            ),
          ]),
          const SizedBox(height: 32),
        ],
      ),
    );
  }

  Widget _buildSection(String title, List<Widget> children) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 20, 16, 8),
          child: Text(title, style: const TextStyle(color: AppColors.primary, fontSize: 12, fontWeight: FontWeight.bold, letterSpacing: 0.5)),
        ),
        Container(
          decoration: const BoxDecoration(
            color: AppColors.card,
            border: Border(
              top: BorderSide(color: Colors.white10),
              bottom: BorderSide(color: Colors.white10),
            ),
          ),
          child: Column(children: children),
        ),
      ],
    );
  }

  Widget _buildTile({
    required IconData icon,
    required String label,
    String? subtitle,
    Widget? trailing,
    VoidCallback? onTap,
    Color? iconColor,
    Color? labelColor,
  }) {
    return InkWell(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: const BoxDecoration(
          border: Border(bottom: BorderSide(color: Colors.white10)),
        ),
        child: Row(
          children: [
            Icon(icon, color: iconColor ?? Colors.white70, size: 20),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(label, style: TextStyle(color: labelColor ?? Colors.white, fontSize: 14)),
                  if (subtitle != null)
                    Text(subtitle, style: const TextStyle(color: Colors.white38, fontSize: 11)),
                ],
              ),
            ),
            trailing ?? const Icon(Icons.chevron_right, color: Colors.white38, size: 18),
          ],
        ),
      ),
    );
  }

  Widget _buildSwitchTile({
    required IconData icon,
    required String label,
    String? subtitle,
    required bool value,
    required ValueChanged<bool> onChanged,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      decoration: const BoxDecoration(
        border: Border(bottom: BorderSide(color: Colors.white10)),
      ),
      child: Row(
        children: [
          Icon(icon, color: Colors.white70, size: 20),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: const TextStyle(color: Colors.white, fontSize: 14)),
                if (subtitle != null)
                  Text(subtitle, style: const TextStyle(color: Colors.white38, fontSize: 11)),
              ],
            ),
          ),
          Switch(
            value: value,
            onChanged: onChanged,
            activeColor: AppColors.primary,
          ),
        ],
      ),
    );
  }

  void _showLogoutDialog(BuildContext context, WidgetRef ref) {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: AppColors.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Log Out', style: TextStyle(color: Colors.white)),
        content: const Text('Are you sure you want to log out?', style: TextStyle(color: Colors.white70)),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.orange),
            onPressed: () {
              Navigator.pop(context);
              ref.read(authProvider.notifier).logout();
              context.go('/onboarding');
            },
            child: const Text('Log Out', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  void _showDeleteAccountDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: AppColors.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Delete Account', style: TextStyle(color: Colors.red)),
        content: const Text('This action is permanent and cannot be undone. All your data, coins, and history will be deleted.', style: TextStyle(color: Colors.white70)),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () => Navigator.pop(context),
            child: const Text('Delete', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  void _showClearCacheDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: AppColors.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Clear Cache', style: TextStyle(color: Colors.white)),
        content: const Text('This will clear locally cached images and data.', style: TextStyle(color: Colors.white70)),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
            onPressed: () {
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Cache cleared'), backgroundColor: AppColors.success),
              );
            },
            child: const Text('Clear', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }
}
