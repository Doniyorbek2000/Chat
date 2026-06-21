import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/models/user_model.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/providers/auth_provider.dart';
import '../../../../core/router/app_router.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../shared/widgets/voxo_button.dart';

class ProfileScreen extends ConsumerStatefulWidget {
  final String? uid;
  const ProfileScreen({super.key, this.uid});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  bool _followLoading = false;

  Future<void> _toggleFollow(UserModel user) async {
    if (_followLoading) return;
    setState(() => _followLoading = true);
    try {
      final api = ref.read(apiClientProvider);
      if (user.isFollowing) {
        await api.delete('/users/${user.id}/follow');
      } else {
        await api.post('/users/${user.id}/follow');
      }
      ref.read(authProvider.notifier).refreshUserData();
    } catch (_) {}
    if (mounted) setState(() => _followLoading = false);
  }

  bool get _isOwnProfile {
    final currentUser = ref.read(currentUserProvider);
    final uid = widget.uid;
    return uid == null ||
        uid == 'me' ||
        uid == currentUser?.id ||
        uid == currentUser?.uid;
  }

  @override
  Widget build(BuildContext context) {
    final currentUser = ref.watch(currentUserProvider);
    final user = currentUser;

    if (user == null) {
      return Scaffold(
        backgroundColor: AppColors.backgroundDark,
        body: const Center(
          child: CircularProgressIndicator(color: AppColors.primary),
        ),
      );
    }

    return _buildProfile(user);
  }

  Widget _buildProfile(UserModel user) {
    final isOwn = _isOwnProfile;

    return Scaffold(
      backgroundColor: AppColors.backgroundDark,
      body: CustomScrollView(
        slivers: [
          _buildSliverAppBar(user, isOwn),
          SliverToBoxAdapter(
            child: Column(
              children: [
                _buildAvatarSection(user, isOwn),
                _buildStatsRow(user),
                if (!isOwn) _buildActionButtons(user),
                if (isOwn) _buildPremiumShortcuts(),
                if (isOwn) _buildMenMenu(),
                if (!isOwn) _buildRecentRooms(),
                const SizedBox(height: 40),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSliverAppBar(UserModel user, bool isOwn) {
    return SliverAppBar(
      expandedHeight: 200,
      pinned: true,
      backgroundColor: AppColors.surfaceDark,
      automaticallyImplyLeading: !isOwn,
      leading: isOwn
          ? null
          : IconButton(
              icon: const Icon(Icons.arrow_back_ios_new, color: Colors.white),
              onPressed: () => context.pop(),
            ),
      actions: isOwn
          ? [
              IconButton(
                icon: const Icon(Icons.edit_outlined, color: Colors.white),
                onPressed: () => context.push(AppRoutes.editProfile),
              ),
              IconButton(
                icon: const Icon(Icons.settings_outlined, color: Colors.white),
                onPressed: () => context.push(AppRoutes.settings),
              ),
            ]
          : [
              IconButton(
                icon: const Icon(Icons.more_vert, color: Colors.white),
                onPressed: () => _showMoreOptions(user),
              ),
            ],
      flexibleSpace: FlexibleSpaceBar(
        background: Stack(
          fit: StackFit.expand,
          children: [
            if (user.cover != null)
              CachedNetworkImage(
                imageUrl: user.cover!,
                fit: BoxFit.cover,
                errorWidget: (_, __, ___) => _coverPlaceholder(),
              )
            else
              _coverPlaceholder(),
            Container(
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [Colors.transparent, Color(0xCC0A0A0F)],
                  stops: [0.5, 1.0],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _coverPlaceholder() {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [Color(0xFF1A0A2E), Color(0xFF0A0A1A)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
    );
  }

  Widget _buildAvatarSection(UserModel user, bool isOwn) {
    return Transform.translate(
      offset: const Offset(0, -40),
      child: Column(
        children: [
          Stack(
            alignment: Alignment.center,
            children: [
              Container(
                width: 94,
                height: 94,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: user.vipLevel > 0 ? AppColors.goldGradient : null,
                  border: user.vipLevel == 0
                      ? Border.all(color: AppColors.primary, width: 3)
                      : null,
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.primary.withOpacity(0.3),
                      blurRadius: 16,
                      spreadRadius: 2,
                    ),
                  ],
                ),
              ),
              ClipOval(
                child: SizedBox(
                  width: user.vipLevel > 0 ? 84 : 88,
                  height: user.vipLevel > 0 ? 84 : 88,
                  child: CachedNetworkImage(
                    imageUrl: user.avatarUrl,
                    fit: BoxFit.cover,
                    errorWidget: (_, __, ___) => Container(
                      color: AppColors.elevatedDark,
                      child: const Icon(Icons.person,
                          color: Colors.white60, size: 44),
                    ),
                  ),
                ),
              ),
              if (user.isVerified)
                Positioned(
                  bottom: 2,
                  right: 2,
                  child: Container(
                    width: 22,
                    height: 22,
                    decoration: const BoxDecoration(
                      color: AppColors.info,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.verified,
                        color: Colors.white, size: 14),
                  ),
                ),
            ],
          ).animate().scale(
                begin: const Offset(0.8, 0.8),
                duration: 400.ms,
                curve: Curves.elasticOut,
              ),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                user.displayName,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                  fontFamily: 'Poppins',
                ),
              ),
              if (user.vipLevel > 0) ...[
                const SizedBox(width: 6),
                _buildVipBadge(user.vipLevel),
              ],
            ],
          ),
          const SizedBox(height: 4),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                '@${user.username}',
                style: TextStyle(
                  color: AppColors.textSecondary,
                  fontSize: 13,
                  fontFamily: 'Poppins',
                ),
              ),
              const SizedBox(width: 10),
              GestureDetector(
                onTap: () {
                  Clipboard.setData(ClipboardData(text: user.uid));
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('UID copied!'),
                      duration: Duration(seconds: 1),
                    ),
                  );
                },
                child: Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: AppColors.cardDark,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        'ID: ${user.uid}',
                        style: TextStyle(
                          color: AppColors.textTertiary,
                          fontSize: 11,
                          fontFamily: 'Poppins',
                        ),
                      ),
                      const SizedBox(width: 3),
                      const Icon(Icons.copy,
                          size: 10, color: AppColors.textTertiary),
                    ],
                  ),
                ),
              ),
            ],
          ),
          if (user.bio != null && user.bio!.isNotEmpty) ...[
            const SizedBox(height: 8),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 32),
              child: Text(
                user.bio!,
                textAlign: TextAlign.center,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  color: AppColors.textSecondary,
                  fontSize: 13,
                  fontFamily: 'Poppins',
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildVipBadge(int level) {
    final color = AppColors.vipColors[level.clamp(1, AppColors.vipColors.length - 1)];
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [color.withOpacity(0.8), color],
        ),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        'VIP $level',
        style: const TextStyle(
          color: Colors.white,
          fontSize: 10,
          fontWeight: FontWeight.bold,
          fontFamily: 'Poppins',
        ),
      ),
    );
  }

  Widget _buildStatsRow(UserModel user) {
    return Transform.translate(
      offset: const Offset(0, -24),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 16),
          decoration: BoxDecoration(
            color: AppColors.cardDark,
            borderRadius: BorderRadius.circular(16),
          ),
          child: Row(
            children: [
              _buildStat(
                _fmt(user.followersCount),
                'Followers',
                AppColors.primary,
              ),
              Container(
                  width: 1,
                  height: 30,
                  color: AppColors.dividerDark),
              _buildStat(
                _fmt(user.followingCount),
                'Following',
                AppColors.secondary,
              ),
              Container(
                  width: 1,
                  height: 30,
                  color: AppColors.dividerDark),
              _buildStat(
                _fmt(user.giftsReceived),
                'Gifts',
                AppColors.vip3,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStat(String value, String label, Color color) {
    return Expanded(
      child: Column(
        children: [
          Text(
            value,
            style: TextStyle(
              color: color,
              fontSize: 18,
              fontWeight: FontWeight.bold,
              fontFamily: 'Poppins',
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: TextStyle(
              color: AppColors.textSecondary,
              fontSize: 11,
              fontFamily: 'Poppins',
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActionButtons(UserModel user) {
    return Transform.translate(
      offset: const Offset(0, -14),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24),
        child: Row(
          children: [
            Expanded(
              child: VoxoButton(
                label: user.isFollowing ? 'Following' : 'Follow',
                type: user.isFollowing
                    ? VoxoButtonType.outline
                    : VoxoButtonType.primary,
                size: VoxoButtonSize.medium,
                isLoading: _followLoading,
                onPressed: () => _toggleFollow(user),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: VoxoButton(
                label: 'Message',
                type: VoxoButtonType.ghost,
                size: VoxoButtonSize.medium,
                icon: Icons.chat_bubble_outline,
                onPressed: () => context.push(
                  '/messages/${user.id}',
                  extra: {'username': user.displayName},
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPremiumShortcuts() {
    final shortcuts = [
      {'label': 'Do\'kon', 'icon': Icons.store, 'route': AppRoutes.shop},
      {'label': 'Noble', 'icon': Icons.auto_awesome, 'route': AppRoutes.noble},
      {'label': 'Medal', 'icon': Icons.military_tech, 'route': AppRoutes.medals},
      {'label': 'Kolleksiya', 'icon': Icons.inventory_2_outlined, 'route': AppRoutes.collection},
      {'label': 'Ismlik taxtasi', 'icon': Icons.badge_outlined, 'route': AppRoutes.nameplate},
      {'label': 'VIP', 'icon': Icons.workspace_premium, 'route': AppRoutes.vip},
    ];

    return Transform.translate(
      offset: const Offset(0, -14),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Padding(
              padding: EdgeInsets.only(bottom: 10),
              child: Text(
                'Premium',
                style: TextStyle(
                  color: Colors.white70,
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  fontFamily: 'Poppins',
                ),
              ),
            ),
            SizedBox(
              height: 72,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: shortcuts.length,
                separatorBuilder: (_, __) => const SizedBox(width: 12),
                itemBuilder: (ctx, i) {
                  final item = shortcuts[i];
                  return GestureDetector(
                    onTap: () => context.push(item['route'] as String),
                    child: Container(
                      width: 64,
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 10),
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: [
                            AppColors.primary.withOpacity(0.25),
                            AppColors.cardDark,
                          ],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: AppColors.primary.withOpacity(0.3),
                        ),
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            item['icon'] as IconData,
                            color: AppColors.primaryLight,
                            size: 22,
                          ),
                          const SizedBox(height: 4),
                          Text(
                            item['label'] as String,
                            style: const TextStyle(
                              color: Colors.white70,
                              fontSize: 9,
                              fontFamily: 'Poppins',
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            textAlign: TextAlign.center,
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    ).animate().fadeIn(duration: 400.ms).slideY(begin: 0.05);
  }

  Widget _buildRecentRooms() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Recent Rooms',
            style: TextStyle(
              color: Colors.white,
              fontSize: 16,
              fontWeight: FontWeight.bold,
              fontFamily: 'Poppins',
            ),
          ),
          const SizedBox(height: 10),
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate:
                const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              crossAxisSpacing: 10,
              mainAxisSpacing: 10,
              childAspectRatio: 1.6,
            ),
            itemCount: 4,
            itemBuilder: (ctx, i) => ClipRRect(
              borderRadius: BorderRadius.circular(10),
              child: CachedNetworkImage(
                imageUrl:
                    'https://picsum.photos/seed/profile_room$i/200/120',
                fit: BoxFit.cover,
                errorWidget: (_, __, ___) => Container(
                  color: AppColors.cardDark,
                  child: const Icon(Icons.mic,
                      color: Colors.white38, size: 28),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMenMenu() {
    final menuItems = [
      {'label': 'Taklif qilish orqali tangalar olish', 'icon': Icons.people_outline, 'route': '/referral'},
      {'label': 'Hamyon', 'icon': Icons.account_balance_wallet_outlined, 'route': AppRoutes.wallet},
      {'label': 'Aristokratiya', 'icon': Icons.auto_awesome_outlined, 'route': AppRoutes.noble},
      {'label': 'Kolleksiya Zali', 'icon': Icons.inventory_2_outlined, 'route': AppRoutes.collection},
      {'label': 'Ismlik taxtasi', 'icon': Icons.badge_outlined, 'route': AppRoutes.nameplate},
      {'label': 'Sevgi uyi', 'icon': Icons.favorite_border, 'route': AppRoutes.couple},
      {'label': 'Oila', 'icon': Icons.group_outlined, 'route': AppRoutes.family},
      {'label': 'Sozlamalar', 'icon': Icons.settings_outlined, 'route': AppRoutes.settings},
    ];
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: AppColors.cardDark,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withOpacity(0.06)),
      ),
      child: Column(
        children: menuItems.asMap().entries.map((e) {
          final item = e.value;
          final isLast = e.key == menuItems.length - 1;
          return Column(children: [
            ListTile(
              leading: Container(
                width: 36, height: 36,
                decoration: BoxDecoration(color: AppColors.primary.withOpacity(0.12), borderRadius: BorderRadius.circular(10)),
                child: Icon(item['icon'] as IconData, color: AppColors.primary, size: 18),
              ),
              title: Text(item['label'] as String, style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w500)),
              trailing: const Icon(Icons.chevron_right, color: Colors.white24, size: 18),
              onTap: () => context.push(item['route'] as String),
              dense: true,
            ),
            if (!isLast) const Divider(height: 1, color: Colors.white10, indent: 60),
          ]);
        }).toList(),
      ),
    );
  }

  void _showMoreOptions(UserModel user) {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.cardDark,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              margin: const EdgeInsets.symmetric(vertical: 8),
              width: 36,
              height: 4,
              decoration: BoxDecoration(
                color: AppColors.dividerDark,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            ListTile(
              leading: const Icon(Icons.block, color: AppColors.error),
              title: const Text('Block User',
                  style: TextStyle(
                      color: AppColors.error,
                      fontFamily: 'Poppins')),
              onTap: () => Navigator.pop(context),
            ),
            ListTile(
              leading: const Icon(Icons.flag_outlined,
                  color: AppColors.error),
              title: const Text('Report',
                  style: TextStyle(
                      color: AppColors.error,
                      fontFamily: 'Poppins')),
              onTap: () => Navigator.pop(context),
            ),
          ],
        ),
      ),
    );
  }

  String _fmt(int n) {
    if (n >= 1000000) return '${(n / 1000000).toStringAsFixed(1)}M';
    if (n >= 1000) return '${(n / 1000).toStringAsFixed(1)}K';
    return n.toString();
  }
}
