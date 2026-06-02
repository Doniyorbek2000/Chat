import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../core/theme/app_colors.dart';

class UserAvatar extends StatelessWidget {
  final String? imageUrl;
  final String? name;
  final double size;
  final int vipLevel;
  final bool showOnlineIndicator;
  final bool isOnline;
  final VoidCallback? onTap;
  final bool showVipFrame;
  final double borderWidth;
  final Color? borderColor;

  const UserAvatar({
    super.key,
    this.imageUrl,
    this.name,
    this.size = 44,
    this.vipLevel = 0,
    this.showOnlineIndicator = false,
    this.isOnline = false,
    this.onTap,
    this.showVipFrame = true,
    this.borderWidth = 0,
    this.borderColor,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          _buildAvatarWithFrame(),
          if (showOnlineIndicator) _buildOnlineIndicator(),
        ],
      ),
    );
  }

  Widget _buildAvatarWithFrame() {
    if (showVipFrame && vipLevel > 0) {
      return Container(
        width: size + 6,
        height: size + 6,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          gradient: LinearGradient(
            colors: _getVipFrameColors(vipLevel),
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          boxShadow: [
            BoxShadow(
              color: _getVipColor(vipLevel).withOpacity(0.5),
              blurRadius: 8,
              spreadRadius: 1,
            ),
          ],
        ),
        padding: const EdgeInsets.all(2),
        child: _buildAvatar(),
      );
    }

    if (borderWidth > 0 && borderColor != null) {
      return Container(
        width: size + borderWidth * 2,
        height: size + borderWidth * 2,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          border: Border.all(color: borderColor!, width: borderWidth),
        ),
        padding: EdgeInsets.all(borderWidth),
        child: _buildAvatar(),
      );
    }

    return _buildAvatar();
  }

  Widget _buildAvatar() {
    return Container(
      width: size,
      height: size,
      decoration: const BoxDecoration(shape: BoxShape.circle),
      clipBehavior: Clip.antiAlias,
      child: imageUrl != null && imageUrl!.isNotEmpty
          ? CachedNetworkImage(
              imageUrl: imageUrl!,
              fit: BoxFit.cover,
              placeholder: (context, url) => _buildPlaceholder(),
              errorWidget: (context, url, error) => _buildPlaceholder(),
            )
          : _buildPlaceholder(),
    );
  }

  Widget _buildPlaceholder() {
    final initial =
        name != null && name!.isNotEmpty ? name![0].toUpperCase() : '?';
    final color = _getColorFromName(name ?? '?');

    return Container(
      color: color,
      child: Center(
        child: Text(
          initial,
          style: TextStyle(
            color: Colors.white,
            fontSize: size * 0.4,
            fontWeight: FontWeight.bold,
            fontFamily: 'Poppins',
          ),
        ),
      ),
    );
  }

  Widget _buildOnlineIndicator() {
    return Positioned(
      right: 0,
      bottom: 0,
      child: Container(
        width: size * 0.28,
        height: size * 0.28,
        decoration: BoxDecoration(
          color: isOnline ? AppColors.online : AppColors.offline,
          shape: BoxShape.circle,
          border: Border.all(
            color: AppColors.backgroundDark,
            width: 2,
          ),
        ),
      ),
    );
  }

  Color _getColorFromName(String name) {
    final colors = [
      const Color(0xFF7C3AED),
      const Color(0xFFEC4899),
      const Color(0xFF06B6D4),
      const Color(0xFF10B981),
      const Color(0xFFF59E0B),
      const Color(0xFFEF4444),
      const Color(0xFF3B82F6),
      const Color(0xFF8B5CF6),
    ];

    if (name.isEmpty) return colors[0];
    final index = name.codeUnits.fold(0, (a, b) => a + b) % colors.length;
    return colors[index];
  }

  Color _getVipColor(int level) {
    return AppColors.vipColors[level.clamp(0, 10)];
  }

  List<Color> _getVipFrameColors(int level) {
    switch (level) {
      case 1:
        return [const Color(0xFFCD7F32), const Color(0xFFE8A84B)];
      case 2:
        return [const Color(0xFFC0C0C0), const Color(0xFFE8E8E8)];
      case 3:
        return [const Color(0xFFB8860B), const Color(0xFFFFD700)];
      case 4:
        return [const Color(0xFF00CED1), const Color(0xFF20E8EB)];
      case 5:
        return [const Color(0xFF7C3AED), const Color(0xFFEC4899)];
      case 6:
        return [const Color(0xFFFF4500), const Color(0xFFFF8C00)];
      case 7:
        return [const Color(0xFF00BFFF), const Color(0xFF00FFFF)];
      case 8:
        return [const Color(0xFFFF69B4), const Color(0xFFFF1493)];
      case 9:
        return [const Color(0xFF00FF7F), const Color(0xFF7FFFD4)];
      case 10:
        return [
          const Color(0xFFFFD700),
          const Color(0xFFFF6600),
          const Color(0xFFFFD700),
        ];
      default:
        return [AppColors.primary, AppColors.secondary];
    }
  }
}

// Specialized avatar with VIP badge overlaid
class UserAvatarWithBadge extends StatelessWidget {
  final String? imageUrl;
  final String? name;
  final double size;
  final int vipLevel;
  final bool isOnline;
  final VoidCallback? onTap;

  const UserAvatarWithBadge({
    super.key,
    this.imageUrl,
    this.name,
    this.size = 56,
    this.vipLevel = 0,
    this.isOnline = false,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        UserAvatar(
          imageUrl: imageUrl,
          name: name,
          size: size,
          vipLevel: vipLevel,
          showOnlineIndicator: true,
          isOnline: isOnline,
          onTap: onTap,
        ),
        if (vipLevel > 0) ...[
          const SizedBox(height: 2),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  AppColors.vipColors[vipLevel.clamp(0, 10)],
                  AppColors.vipColors[vipLevel.clamp(0, 10)].withOpacity(0.7),
                ],
              ),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              'VIP$vipLevel',
              style: const TextStyle(
                color: Colors.white,
                fontSize: 9,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ],
      ],
    );
  }
}
