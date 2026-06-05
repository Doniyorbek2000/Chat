import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/providers/auth_provider.dart';
import '../../../../core/constants/api_constants.dart';

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  bool _loading = true;

  // Maxfiylik
  bool _profileVisible = true;
  bool _showOnline = true;
  bool _showLocation = false;

  // Bildirishnomalar
  bool _notifyGifts = true;
  bool _notifyFollowers = true;
  bool _notifyMessages = true;
  bool _notifySystem = true;

  // Audio
  bool _noiseCancellation = true;

  // Ilova
  String _currentLanguage = 'uz';

  @override
  void initState() {
    super.initState();
    _loadSettings();
  }

  Future<void> _loadSettings() async {
    try {
      final api = ref.read(apiClientProvider);
      final response = await api.get(ApiConstants.settingsMe);
      final data = response.data as Map<String, dynamic>? ?? {};
      if (mounted) {
        setState(() {
          _profileVisible = (data['profileVisible'] as bool?) ?? true;
          _showOnline = (data['showOnline'] as bool?) ?? true;
          _showLocation = (data['showLocation'] as bool?) ?? false;
          _notifyGifts = (data['notifyGifts'] as bool?) ?? true;
          _notifyFollowers = (data['notifyFollowers'] as bool?) ?? true;
          _notifyMessages = (data['notifyMessages'] as bool?) ?? true;
          _notifySystem = (data['notifySystem'] as bool?) ?? true;
          _noiseCancellation = (data['noiseCancellation'] as bool?) ?? true;
          _currentLanguage = (data['language'] as String?) ?? 'uz';
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _patchSetting(Map<String, dynamic> data) async {
    try {
      final api = ref.read(apiClientProvider);
      await api.patch(ApiConstants.settingsMe, data: data);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text("Saqlashda xatolik: $e"),
            backgroundColor: AppColors.error,
          ),
        );
      }
    }
  }

  String _languageLabel(String code) {
    switch (code) {
      case 'ru':
        return 'Русский';
      case 'en':
        return 'English';
      default:
        return "O'zbek";
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        title: const Text(
          'Sozlamalar',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, color: Colors.white),
          onPressed: () => context.pop(),
        ),
      ),
      body: _loading
          ? const Center(
              child: CircularProgressIndicator(color: AppColors.primary),
            )
          : ListView(
              children: [
                // Hisob
                _buildSection(
                  "Hisob",
                  [
                    _buildTile(
                      icon: Icons.person_outline,
                      label: "Profilni tahrirlash",
                      onTap: () => context.push('/profile/edit'),
                    ),
                    _buildTile(
                      icon: Icons.lock_outline,
                      label: "Parolni o'zgartirish",
                      onTap: () => context.push('/settings/change-password'),
                    ),
                    _buildTile(
                      icon: Icons.link,
                      label: "Bog'langan hisoblar",
                      onTap: () => context.push('/settings/linked-accounts'),
                    ),
                  ],
                ).animate().fadeIn(duration: 300.ms).slideY(begin: 0.05),

                // Maxfiylik
                _buildSection(
                  "Maxfiylik",
                  [
                    _buildSwitchTile(
                      icon: Icons.visibility_outlined,
                      label: "Profil ko'rinishi",
                      value: _profileVisible,
                      onChanged: (v) {
                        setState(() => _profileVisible = v);
                        _patchSetting({'profileVisible': v});
                      },
                    ),
                    _buildSwitchTile(
                      icon: Icons.wifi_tethering,
                      label: "Online holatni ko'rsatish",
                      value: _showOnline,
                      onChanged: (v) {
                        setState(() => _showOnline = v);
                        _patchSetting({'showOnline': v});
                      },
                    ),
                    _buildSwitchTile(
                      icon: Icons.location_on_outlined,
                      label: "Joylashuvni ko'rsatish",
                      value: _showLocation,
                      onChanged: (v) {
                        setState(() => _showLocation = v);
                        _patchSetting({'showLocation': v});
                      },
                    ),
                    _buildTile(
                      icon: Icons.block,
                      label: "Bloklangan foydalanuvchilar",
                      onTap: () => context.push('/settings/blocked'),
                    ),
                  ],
                ).animate().fadeIn(duration: 350.ms).slideY(begin: 0.05),

                // Bildirishnomalar
                _buildSection(
                  "Bildirishnomalar",
                  [
                    _buildSwitchTile(
                      icon: Icons.card_giftcard,
                      label: "Sovg'a bildirgi",
                      value: _notifyGifts,
                      onChanged: (v) {
                        setState(() => _notifyGifts = v);
                        _patchSetting({'notifyGifts': v});
                      },
                    ),
                    _buildSwitchTile(
                      icon: Icons.person_add_outlined,
                      label: "Kuzatuvchi bildirgi",
                      value: _notifyFollowers,
                      onChanged: (v) {
                        setState(() => _notifyFollowers = v);
                        _patchSetting({'notifyFollowers': v});
                      },
                    ),
                    _buildSwitchTile(
                      icon: Icons.chat_bubble_outline,
                      label: "Xabar bildirgi",
                      value: _notifyMessages,
                      onChanged: (v) {
                        setState(() => _notifyMessages = v);
                        _patchSetting({'notifyMessages': v});
                      },
                    ),
                    _buildSwitchTile(
                      icon: Icons.notifications_outlined,
                      label: "Tizim bildirgi",
                      value: _notifySystem,
                      onChanged: (v) {
                        setState(() => _notifySystem = v);
                        _patchSetting({'notifySystem': v});
                      },
                    ),
                  ],
                ).animate().fadeIn(duration: 400.ms).slideY(begin: 0.05),

                // Audio
                _buildSection(
                  "Audio",
                  [
                    _buildSwitchTile(
                      icon: Icons.mic_outlined,
                      label: "Shovqin yo'q qilish",
                      value: _noiseCancellation,
                      onChanged: (v) {
                        setState(() => _noiseCancellation = v);
                        _patchSetting({'noiseCancellation': v});
                      },
                    ),
                  ],
                ).animate().fadeIn(duration: 450.ms).slideY(begin: 0.05),

                // Ilova
                _buildSection(
                  "Ilova",
                  [
                    _buildTile(
                      icon: Icons.language,
                      label: "Til",
                      trailing: Text(
                        _languageLabel(_currentLanguage),
                        style: const TextStyle(
                          color: Colors.white54,
                          fontSize: 13,
                        ),
                      ),
                      onTap: () async {
                        await context.push('/settings/language');
                        _loadSettings();
                      },
                    ),
                    _buildTile(
                      icon: Icons.storage_outlined,
                      label: "Keshni tozalash",
                      onTap: () => _showClearCacheDialog(context),
                    ),
                  ],
                ).animate().fadeIn(duration: 500.ms).slideY(begin: 0.05),

                // Qo'llab-quvvatlash
                _buildSection(
                  "Qo'llab-quvvatlash",
                  [
                    _buildTile(
                      icon: Icons.bug_report_outlined,
                      label: "Muammoni xabar qilish",
                      onTap: () => context.push('/settings/feedback'),
                    ),
                    _buildTile(
                      icon: Icons.privacy_tip_outlined,
                      label: "Maxfiylik siyosati",
                      onTap: () =>
                          context.push('/settings/policy/privacy-policy'),
                    ),
                    _buildTile(
                      icon: Icons.description_outlined,
                      label: "Foydalanish shartlari",
                      onTap: () =>
                          context.push('/settings/policy/terms-of-service'),
                    ),
                    _buildTile(
                      icon: Icons.info_outline,
                      label: "VOXO haqida",
                      trailing: const Text(
                        'v1.0.0',
                        style: TextStyle(color: Colors.white38, fontSize: 12),
                      ),
                      onTap: () => _showAboutDialog(context),
                    ),
                  ],
                ).animate().fadeIn(duration: 550.ms).slideY(begin: 0.05),

                // Xavfli zona
                _buildSection(
                  "Xavfli zona",
                  [
                    _buildTile(
                      icon: Icons.logout,
                      label: "Chiqish",
                      iconColor: Colors.orange,
                      labelColor: Colors.orange,
                      onTap: () => _showLogoutDialog(context),
                    ),
                    _buildTile(
                      icon: Icons.delete_forever_outlined,
                      label: "Hisobni o'chirish",
                      iconColor: Colors.red,
                      labelColor: Colors.red,
                      onTap: () => context.push('/settings/delete-account'),
                    ),
                  ],
                ).animate().fadeIn(duration: 600.ms).slideY(begin: 0.05),

                const SizedBox(height: 40),
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
          child: Text(
            title,
            style: const TextStyle(
              color: AppColors.primary,
              fontSize: 12,
              fontWeight: FontWeight.bold,
              letterSpacing: 0.5,
            ),
          ),
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
    required VoidCallback onTap,
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
                  Text(
                    label,
                    style: TextStyle(
                      color: labelColor ?? Colors.white,
                      fontSize: 14,
                    ),
                  ),
                  if (subtitle != null)
                    Text(
                      subtitle,
                      style: const TextStyle(
                        color: Colors.white38,
                        fontSize: 11,
                      ),
                    ),
                ],
              ),
            ),
            if (trailing != null) trailing,
            if (trailing == null)
              const Icon(Icons.chevron_right, color: Colors.white38, size: 18),
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
                Text(
                  label,
                  style: const TextStyle(color: Colors.white, fontSize: 14),
                ),
                if (subtitle != null)
                  Text(
                    subtitle,
                    style: const TextStyle(color: Colors.white38, fontSize: 11),
                  ),
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

  void _showLogoutDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: AppColors.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text(
          'Chiqish',
          style: TextStyle(color: Colors.white),
        ),
        content: const Text(
          'Haqiqatan ham chiqmoqchimisiz?',
          style: TextStyle(color: Colors.white70),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Bekor qilish'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.orange),
            onPressed: () {
              Navigator.pop(context);
              ref.read(authProvider.notifier).logout();
              context.go('/onboarding');
            },
            child: const Text(
              'Chiqish',
              style: TextStyle(color: Colors.white),
            ),
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
        title: const Text(
          'Keshni tozalash',
          style: TextStyle(color: Colors.white),
        ),
        content: const Text(
          'Bu amal mahalliy kesh va rasmlarni tozalaydi.',
          style: TextStyle(color: Colors.white70),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Bekor qilish'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
            onPressed: () {
              Navigator.pop(context);
              PaintingBinding.instance.imageCache.clear();
              PaintingBinding.instance.imageCache.clearLiveImages();
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Kesh tozalandi'),
                  backgroundColor: AppColors.success,
                ),
              );
            },
            child: const Text(
              'Tozalash',
              style: TextStyle(color: Colors.white),
            ),
          ),
        ],
      ),
    );
  }

  void _showAboutDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: AppColors.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text(
          'VOXO haqida',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                color: AppColors.primary,
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Icon(Icons.mic, color: Colors.white, size: 36),
            ),
            const SizedBox(height: 16),
            const Text(
              'VOXO',
              style: TextStyle(
                color: Colors.white,
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 4),
            const Text(
              'Versiya 1.0.0',
              style: TextStyle(color: Colors.white54, fontSize: 13),
            ),
            const SizedBox(height: 12),
            const Text(
              'VOXO — ovozli chat va jonli efir platformasi.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.white70, fontSize: 13),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Yopish'),
          ),
        ],
      ),
    );
  }
}
