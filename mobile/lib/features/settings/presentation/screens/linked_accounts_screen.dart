import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import 'package:shimmer/shimmer.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/providers/auth_provider.dart';
import '../../../../core/constants/api_constants.dart';

class LinkedAccountsScreen extends ConsumerStatefulWidget {
  const LinkedAccountsScreen({super.key});

  @override
  ConsumerState<LinkedAccountsScreen> createState() =>
      _LinkedAccountsScreenState();
}

class _LinkedAccountsScreenState extends ConsumerState<LinkedAccountsScreen> {
  bool _loading = true;
  Map<String, dynamic> _linkedAccounts = {};

  @override
  void initState() {
    super.initState();
    _loadLinkedAccounts();
  }

  Future<void> _loadLinkedAccounts() async {
    setState(() => _loading = true);
    try {
      final api = ref.read(apiClientProvider);
      final response = await api.get(ApiConstants.settingsLinkedAccounts);
      final data = response.data as Map<String, dynamic>? ?? {};
      if (mounted) {
        setState(() {
          _linkedAccounts = data;
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _showComingSoon(String provider) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text("$provider bog'lanishi tez orada qo'shiladi"),
        backgroundColor: AppColors.surface,
      ),
    );
  }

  void _showPhoneDialog() {
    final phoneCtrl = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text(
          "Telefon raqam",
          style: TextStyle(color: Colors.white),
        ),
        content: TextField(
          controller: phoneCtrl,
          keyboardType: TextInputType.phone,
          style: const TextStyle(color: Colors.white),
          decoration: InputDecoration(
            hintText: "+998 90 123 45 67",
            hintStyle: const TextStyle(color: Colors.white24),
            filled: true,
            fillColor: AppColors.card,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide.none,
            ),
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Bekor qilish'),
          ),
          ElevatedButton(
            style:
                ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
            onPressed: () async {
              final phone = phoneCtrl.text.trim();
              if (phone.isEmpty) return;
              Navigator.pop(ctx);
              try {
                final api = ref.read(apiClientProvider);
                await api.post(ApiConstants.sendOtp, data: {
                  'phone': phone,
                  'countryCode': '+998',
                });
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text("SMS-kod yuborildi"),
                      backgroundColor: AppColors.success,
                    ),
                  );
                }
              } catch (e) {
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text("Xatolik: $e"),
                      backgroundColor: AppColors.error,
                    ),
                  );
                }
              }
            },
            child: const Text(
              "Yuborish",
              style: TextStyle(color: Colors.white),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        title: const Text(
          "Bog'langan hisoblar",
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, color: Colors.white),
          onPressed: () => context.pop(),
        ),
      ),
      body: _loading
          ? _buildShimmer()
          : _buildAccountsList(),
    );
  }

  Widget _buildAccountsList() {
    final phone = _linkedAccounts['phone'] as String?;
    final email = _linkedAccounts['email'] as String?;
    final googleLinked =
        (_linkedAccounts['google'] as bool?) ?? (phone != null && false);
    final appleLinked = (_linkedAccounts['apple'] as bool?) ?? false;

    final accounts = [
      _AccountItem(
        icon: Icons.phone,
        label: "Telefon",
        identifier: phone,
        isLinked: phone != null && phone.isNotEmpty,
        onTap: (phone == null || phone.isEmpty)
            ? _showPhoneDialog
            : () => _showComingSoon("Telefon"),
      ),
      _AccountItem(
        icon: Icons.email_outlined,
        label: "Email",
        identifier: email,
        isLinked: email != null && email.isNotEmpty,
        onTap: () => _showComingSoon("Email"),
      ),
      _AccountItem(
        iconAsset: 'google',
        label: "Google",
        isLinked: googleLinked,
        onTap: () => _showComingSoon("Google"),
      ),
      _AccountItem(
        icon: Icons.apple,
        label: "Apple",
        isLinked: appleLinked,
        onTap: () => _showComingSoon("Apple"),
      ),
    ];

    return ListView.builder(
      padding: const EdgeInsets.symmetric(vertical: 8),
      itemCount: accounts.length,
      itemBuilder: (context, index) {
        final item = accounts[index];
        return _buildAccountTile(item, index);
      },
    );
  }

  Widget _buildAccountTile(_AccountItem item, int index) {
    return InkWell(
      onTap: item.onTap,
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: AppColors.card,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: item.isLinked
                ? AppColors.success.withOpacity(0.3)
                : Colors.white10,
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: item.isLinked
                    ? AppColors.success.withOpacity(0.1)
                    : AppColors.surface,
                shape: BoxShape.circle,
              ),
              child: Icon(
                item.icon ?? Icons.link,
                color: item.isLinked ? AppColors.success : Colors.white38,
                size: 20,
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    item.label,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  Text(
                    item.isLinked
                        ? (item.identifier ?? "Bog'langan")
                        : "Bog'lanmagan",
                    style: TextStyle(
                      color: item.isLinked
                          ? AppColors.success
                          : Colors.white38,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
            if (item.isLinked)
              const Icon(
                Icons.check_circle,
                color: AppColors.success,
                size: 20,
              )
            else
              const Icon(
                Icons.chevron_right,
                color: Colors.white38,
                size: 20,
              ),
          ],
        ),
      ),
    ).animate().fadeIn(duration: 300.ms, delay: Duration(milliseconds: index * 60)).slideY(begin: 0.05);
  }

  Widget _buildShimmer() {
    return Shimmer.fromColors(
      baseColor: AppColors.card,
      highlightColor: AppColors.surface,
      child: ListView.builder(
        padding: const EdgeInsets.symmetric(vertical: 8),
        itemCount: 4,
        itemBuilder: (_, __) => Container(
          margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
          height: 72,
          decoration: BoxDecoration(
            color: AppColors.card,
            borderRadius: BorderRadius.circular(14),
          ),
        ),
      ),
    );
  }
}

class _AccountItem {
  final IconData? icon;
  final String? iconAsset;
  final String label;
  final String? identifier;
  final bool isLinked;
  final VoidCallback onTap;

  const _AccountItem({
    this.icon,
    this.iconAsset,
    required this.label,
    this.identifier,
    required this.isLinked,
    required this.onTap,
  });
}
