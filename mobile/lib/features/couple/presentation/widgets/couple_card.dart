import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../../../core/theme/app_colors.dart';

class CoupleCard extends StatelessWidget {
  final Map<String, dynamic> coupleData;

  const CoupleCard({super.key, required this.coupleData});

  @override
  Widget build(BuildContext context) {
    final user1 = coupleData['user1'] as Map<String, dynamic>? ?? {};
    final user2 = coupleData['user2'] as Map<String, dynamic>? ?? {};
    final level = coupleData['level'] as int? ?? 1;
    final daysTogether = coupleData['daysTogether'] as int? ?? 0;
    final totalGifts = coupleData['totalGifts'] as int? ?? 0;
    final xp = (coupleData['xp'] as num?)?.toDouble() ?? 0;
    final xpRequired = (coupleData['xpRequired'] as num?)?.toDouble() ?? 100;
    final xpProgress = (xp / xpRequired).clamp(0.0, 1.0);

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        gradient: const LinearGradient(
          colors: [Color(0xFF2D0A3E), Color(0xFF4A0020), Color(0xFF2D0A3E)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.pink.withOpacity(0.3),
            blurRadius: 20,
            spreadRadius: 2,
            offset: const Offset(0, 4),
          ),
        ],
        border: Border.all(
          color: Colors.pink.withOpacity(0.4),
          width: 1.5,
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            // Level badge
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFFEC4899), Color(0xFFBE185D)],
                ),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                'Couple Level $level',
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 13,
                  fontFamily: 'Poppins',
                ),
              ),
            ),
            const SizedBox(height: 24),
            // Avatars row
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                _UserAvatar(user: user1),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Column(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          gradient: const LinearGradient(
                            colors: [Color(0xFFEC4899), Color(0xFFFF6B6B)],
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.pink.withOpacity(0.5),
                              blurRadius: 12,
                              spreadRadius: 2,
                            ),
                          ],
                        ),
                        child: const Icon(
                          Icons.favorite,
                          color: Colors.white,
                          size: 22,
                        ),
                      ).animate(onPlay: (c) => c.repeat()).shimmer(
                            duration: 2000.ms,
                            color: Colors.pink.withOpacity(0.4),
                          ),
                    ],
                  ),
                ),
                _UserAvatar(user: user2),
              ],
            ),
            const SizedBox(height: 20),
            // Names
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Expanded(
                  child: Text(
                    user1['username'] as String? ?? 'User',
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w600,
                      fontSize: 14,
                      fontFamily: 'Poppins',
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                const SizedBox(width: 48),
                Expanded(
                  child: Text(
                    user2['username'] as String? ?? 'User',
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w600,
                      fontSize: 14,
                      fontFamily: 'Poppins',
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),
            // Stats row
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                _StatItem(
                  icon: Icons.calendar_today,
                  value: '$daysTogether',
                  label: 'Days',
                  iconColor: const Color(0xFFFF6B6B),
                ),
                Container(
                  width: 1,
                  height: 40,
                  color: Colors.white.withOpacity(0.15),
                ),
                _StatItem(
                  icon: Icons.card_giftcard,
                  value: '$totalGifts',
                  label: 'Gifts',
                  iconColor: const Color(0xFFEC4899),
                ),
                Container(
                  width: 1,
                  height: 40,
                  color: Colors.white.withOpacity(0.15),
                ),
                _StatItem(
                  icon: Icons.star,
                  value: '${xp.toInt()}',
                  label: 'XP',
                  iconColor: AppColors.coin,
                ),
              ],
            ),
            const SizedBox(height: 20),
            // XP progress bar
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'XP to Level ${level + 1}',
                      style: const TextStyle(
                        color: Colors.white70,
                        fontSize: 12,
                        fontFamily: 'Poppins',
                      ),
                    ),
                    Text(
                      '${xp.toInt()} / ${xpRequired.toInt()}',
                      style: const TextStyle(
                        color: Colors.white70,
                        fontSize: 12,
                        fontFamily: 'Poppins',
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: LinearProgressIndicator(
                    value: xpProgress,
                    minHeight: 8,
                    backgroundColor: Colors.white.withOpacity(0.1),
                    valueColor: const AlwaysStoppedAnimation<Color>(
                      Color(0xFFEC4899),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    ).animate().fadeIn(duration: 400.ms).slideY(begin: 0.2);
  }
}

class _UserAvatar extends StatelessWidget {
  final Map<String, dynamic> user;

  const _UserAvatar({required this.user});

  @override
  Widget build(BuildContext context) {
    final avatar = user['avatar'] as String?;
    final username = user['username'] as String? ?? 'U';

    return Container(
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        border: Border.all(
          color: const Color(0xFFEC4899),
          width: 2.5,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.pink.withOpacity(0.3),
            blurRadius: 12,
            spreadRadius: 1,
          ),
        ],
      ),
      child: CircleAvatar(
        radius: 40,
        backgroundColor: AppColors.cardDark,
        backgroundImage: avatar != null && avatar.isNotEmpty
            ? CachedNetworkImageProvider(avatar)
            : null,
        child: avatar == null || avatar.isEmpty
            ? Text(
                username.isNotEmpty ? username[0].toUpperCase() : 'U',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                  fontFamily: 'Poppins',
                ),
              )
            : null,
      ),
    );
  }
}

class _StatItem extends StatelessWidget {
  final IconData icon;
  final String value;
  final String label;
  final Color iconColor;

  const _StatItem({
    required this.icon,
    required this.value,
    required this.label,
    required this.iconColor,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Icon(icon, color: iconColor, size: 20),
        const SizedBox(height: 4),
        Text(
          value,
          style: const TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.bold,
            fontSize: 16,
            fontFamily: 'Poppins',
          ),
        ),
        Text(
          label,
          style: const TextStyle(
            color: Colors.white54,
            fontSize: 11,
            fontFamily: 'Poppins',
          ),
        ),
      ],
    );
  }
}
