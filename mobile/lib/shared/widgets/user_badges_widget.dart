import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme/app_colors.dart';
import '../../core/network/api_client.dart';

class UserBadgesWidget extends ConsumerStatefulWidget {
  final String userId;
  const UserBadgesWidget({super.key, required this.userId});

  @override
  ConsumerState<UserBadgesWidget> createState() => _UserBadgesWidgetState();
}

class _UserBadgesWidgetState extends ConsumerState<UserBadgesWidget> {
  List<Map<String, dynamic>> _badges = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final api = ref.read(apiClientProvider);
      final res = await api.get('/users/${widget.userId}/verification');
      final data = res.data['data'] ?? res.data;
      if (mounted) {
        setState(() {
          _badges = List<Map<String, dynamic>>.from(
            ((data['badges'] as List?) ?? []).map((e) => Map<String, dynamic>.from(e as Map)),
          );
        });
      }
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    if (_badges.isEmpty) return const SizedBox.shrink();
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: _badges.map((b) => _BadgeChip(badge: b)).toList(),
      ),
    );
  }
}

class _BadgeChip extends StatelessWidget {
  final Map<String, dynamic> badge;
  const _BadgeChip({required this.badge});

  @override
  Widget build(BuildContext context) {
    final type = badge['badgeType'] as String? ?? '';
    final data = _badgeData(type);
    return Tooltip(
      message: badge['badge']?['description'] as String? ?? data['label'] as String,
      child: Container(
        margin: const EdgeInsets.only(right: 6),
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          color: (data['color'] as Color).withOpacity(0.15),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: (data['color'] as Color).withOpacity(0.5)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(data['emoji'] as String, style: const TextStyle(fontSize: 13)),
            const SizedBox(width: 4),
            Text(data['label'] as String, style: TextStyle(color: data['color'] as Color, fontSize: 11, fontFamily: 'Poppins', fontWeight: FontWeight.w600)),
          ],
        ),
      ),
    );
  }

  Map<String, dynamic> _badgeData(String type) {
    const badges = {
      'PHONE_VERIFIED': {'emoji': '📱', 'label': 'Tel', 'color': AppColors.success},
      'EMAIL_VERIFIED': {'emoji': '✉️', 'label': 'Email', 'color': AppColors.info},
      'VERIFIED_HOST': {'emoji': '🎙️', 'label': 'Host', 'color': AppColors.primary},
      'VERIFIED_AGENCY': {'emoji': '🏢', 'label': 'Agentlik', 'color': AppColors.warning},
      'OFFICIAL': {'emoji': '✅', 'label': 'Rasmiy', 'color': AppColors.accent},
      'SAFE_ROOM': {'emoji': '🛡️', 'label': 'Xavfsiz', 'color': AppColors.success},
      'TOP_CREATOR': {'emoji': '⭐', 'label': 'Top', 'color': AppColors.coin},
    };
    return badges[type] ?? {'emoji': '🏅', 'label': type, 'color': AppColors.textSecondary};
  }
}
