import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../../../core/theme/app_colors.dart';

class RoomCardWidget extends StatelessWidget {
  final dynamic room;
  final VoidCallback onTap;

  const RoomCardWidget({
    super.key,
    required this.room,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final Map<String, dynamic> data = room is Map<String, dynamic>
        ? room as Map<String, dynamic>
        : {};

    final String title = data['title'] as String? ?? 'Room';
    final String? cover = data['cover'] as String?;
    final String hostName = data['hostName'] as String? ?? 'Host';
    final String? hostAvatar = data['hostAvatar'] as String?;
    final int viewerCount = data['viewerCount'] as int? ?? 0;
    final bool isVip = data['isVip'] as bool? ?? false;
    final bool isLive = data['isLive'] as bool? ?? true;

    return GestureDetector(
      onTap: onTap,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: Container(
          color: AppColors.cardDark,
          child: Stack(
            fit: StackFit.expand,
            children: [
              // Cover image
              _buildCoverImage(cover),

              // Bottom gradient overlay
              const Positioned.fill(
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [
                        Colors.transparent,
                        Color(0x40000000),
                        Color(0xCC000000),
                      ],
                      stops: [0.4, 0.6, 1.0],
                    ),
                  ),
                ),
              ),

              // LIVE badge (top-left)
              if (isLive)
                Positioned(
                  top: 8,
                  left: 8,
                  child: _LiveBadge(),
                ),

              // VIP crown badge (top-right)
              if (isVip)
                Positioned(
                  top: 8,
                  right: 8,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      gradient: AppColors.goldGradient,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.workspace_premium,
                            color: Colors.white, size: 12),
                        SizedBox(width: 2),
                        Text(
                          'VIP',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),

              // Bottom info
              Positioned(
                left: 8,
                right: 8,
                bottom: 8,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                        fontFamily: 'Poppins',
                      ),
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        // Host avatar
                        if (hostAvatar != null)
                          Container(
                            width: 20,
                            height: 20,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              border: Border.all(
                                  color: Colors.white, width: 1),
                            ),
                            child: ClipOval(
                              child: CachedNetworkImage(
                                imageUrl: hostAvatar,
                                fit: BoxFit.cover,
                                errorWidget: (_, __, ___) => const Icon(
                                    Icons.person,
                                    size: 14,
                                    color: Colors.white),
                              ),
                            ),
                          ),
                        const SizedBox(width: 4),
                        Expanded(
                          child: Text(
                            hostName,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              color: AppColors.textSecondary,
                              fontSize: 11,
                              fontFamily: 'Poppins',
                            ),
                          ),
                        ),
                        // Viewer count
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.remove_red_eye_outlined,
                                size: 11,
                                color: AppColors.textSecondary),
                            const SizedBox(width: 2),
                            Text(
                              _formatCount(viewerCount),
                              style: TextStyle(
                                color: AppColors.textSecondary,
                                fontSize: 11,
                                fontFamily: 'Poppins',
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCoverImage(String? cover) {
    if (cover != null && cover.isNotEmpty) {
      return CachedNetworkImage(
        imageUrl: cover,
        fit: BoxFit.cover,
        placeholder: (_, __) => _buildGradientPlaceholder(),
        errorWidget: (_, __, ___) => _buildGradientPlaceholder(),
      );
    }
    return _buildGradientPlaceholder();
  }

  Widget _buildGradientPlaceholder() {
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            AppColors.primary.withOpacity(0.6),
            AppColors.secondary.withOpacity(0.4),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: const Center(
        child: Icon(Icons.mic, color: Colors.white54, size: 36),
      ),
    );
  }

  String _formatCount(int count) {
    if (count >= 1000) {
      return '${(count / 1000).toStringAsFixed(1)}k';
    }
    return count.toString();
  }
}

class _LiveBadge extends StatefulWidget {
  @override
  State<_LiveBadge> createState() => _LiveBadgeState();
}

class _LiveBadgeState extends State<_LiveBadge>
    with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  late Animation<double> _opacity;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    )..repeat(reverse: true);
    _opacity = Tween<double>(begin: 0.6, end: 1.0).animate(_ctrl);
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: _opacity,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
        decoration: BoxDecoration(
          color: AppColors.error,
          borderRadius: BorderRadius.circular(6),
        ),
        child: const Text(
          'LIVE',
          style: TextStyle(
            color: Colors.white,
            fontSize: 10,
            fontWeight: FontWeight.bold,
            letterSpacing: 1,
          ),
        ),
      ),
    );
  }
}
