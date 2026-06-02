import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';

class VipBadge extends StatelessWidget {
  final int level;
  final double fontSize;
  final bool showStar;
  final bool compact;

  const VipBadge({
    super.key,
    required this.level,
    this.fontSize = 10,
    this.showStar = true,
    this.compact = false,
  });

  @override
  Widget build(BuildContext context) {
    if (level <= 0) return const SizedBox.shrink();

    final colors = _getVipColors(level);

    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: compact ? 4 : 6,
        vertical: compact ? 1 : 2,
      ),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: colors,
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(compact ? 4 : 6),
        boxShadow: [
          BoxShadow(
            color: colors.first.withOpacity(0.4),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (showStar && !compact) ...[
            Icon(
              Icons.star,
              size: fontSize,
              color: Colors.white,
            ),
            const SizedBox(width: 2),
          ],
          Text(
            compact ? 'V$level' : 'VIP $level',
            style: TextStyle(
              color: Colors.white,
              fontSize: fontSize,
              fontWeight: FontWeight.bold,
              fontFamily: 'Poppins',
              letterSpacing: 0.5,
            ),
          ),
        ],
      ),
    );
  }

  List<Color> _getVipColors(int level) {
    switch (level) {
      case 1:
        return [const Color(0xFFCD7F32), const Color(0xFFE8A84B)];
      case 2:
        return [const Color(0xFF888888), const Color(0xFFBBBBBB)];
      case 3:
        return [const Color(0xFFB8860B), const Color(0xFFFFD700)];
      case 4:
        return [const Color(0xFF009999), const Color(0xFF00CED1)];
      case 5:
        return [const Color(0xFF7C3AED), const Color(0xFFEC4899)];
      case 6:
        return [const Color(0xFFCC3300), const Color(0xFFFF6600)];
      case 7:
        return [const Color(0xFF0066CC), const Color(0xFF00CCFF)];
      case 8:
        return [const Color(0xFFCC0066), const Color(0xFFFF69B4)];
      case 9:
        return [const Color(0xFF009944), const Color(0xFF00FF88)];
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

class VipLevelIndicator extends StatelessWidget {
  final int level;
  final double size;

  const VipLevelIndicator({
    super.key,
    required this.level,
    this.size = 32,
  });

  @override
  Widget build(BuildContext context) {
    if (level <= 0) return const SizedBox.shrink();

    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: LinearGradient(
          colors: AppColors.vipColors[level.clamp(0, 10)] != Colors.transparent
              ? [
                  AppColors.vipColors[level.clamp(0, 10)],
                  AppColors.vipColors[level.clamp(0, 10)].withOpacity(0.6),
                ]
              : [AppColors.primary, AppColors.secondary],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        boxShadow: [
          BoxShadow(
            color: AppColors.vipColors[level.clamp(0, 10)].withOpacity(0.5),
            blurRadius: 8,
          ),
        ],
      ),
      child: Center(
        child: Text(
          '$level',
          style: TextStyle(
            color: Colors.white,
            fontSize: size * 0.4,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
    );
  }
}

class VipFrameWidget extends StatelessWidget {
  final Widget child;
  final int vipLevel;

  const VipFrameWidget({
    super.key,
    required this.child,
    required this.vipLevel,
  });

  @override
  Widget build(BuildContext context) {
    if (vipLevel <= 0) return child;

    return Stack(
      children: [
        child,
        Positioned.fill(
          child: IgnorePointer(
            child: CustomPaint(
              painter: VipFramePainter(vipLevel: vipLevel),
            ),
          ),
        ),
      ],
    );
  }
}

class VipFramePainter extends CustomPainter {
  final int vipLevel;

  VipFramePainter({required this.vipLevel});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.0;

    if (vipLevel >= 10) {
      paint.shader = const LinearGradient(
        colors: [Color(0xFFFFD700), Color(0xFFFF6600), Color(0xFFFFD700)],
      ).createShader(Rect.fromLTWH(0, 0, size.width, size.height));
    } else {
      paint.color = AppColors.vipColors[vipLevel.clamp(0, 10)];
    }

    final rect = Rect.fromLTWH(1, 1, size.width - 2, size.height - 2);
    final rRect = RRect.fromRectAndRadius(rect, const Radius.circular(8));
    canvas.drawRRect(rRect, paint);
  }

  @override
  bool shouldRepaint(VipFramePainter oldDelegate) =>
      oldDelegate.vipLevel != vipLevel;
}
