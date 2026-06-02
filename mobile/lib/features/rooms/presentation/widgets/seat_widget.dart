import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../../../core/theme/app_colors.dart';

class SeatWidget extends StatelessWidget {
  final int position;
  final Map<String, dynamic>? user;
  final bool isHost;
  final bool isMuted;
  final bool isLocked;
  final bool isMine;
  final bool isSpeaking;
  final VoidCallback? onTap;

  const SeatWidget({
    super.key,
    required this.position,
    this.user,
    this.isHost = false,
    this.isMuted = false,
    this.isLocked = false,
    this.isMine = false,
    this.isSpeaking = false,
    this.onTap,
  });

  bool get _isEmpty => user == null && !isLocked;
  bool get _isOccupied => user != null;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: _isEmpty ? onTap : (isMine ? onTap : null),
      child: SizedBox(
        width: 70,
        height: 90,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Stack(
              alignment: Alignment.center,
              clipBehavior: Clip.none,
              children: [
                _buildAvatarCircle(),
                if (isHost) _buildCrownBadge(),
                if (_isOccupied && isMuted) _buildMutedBadge(),
                if (isMine) _buildMyIndicator(),
              ],
            ),
            const SizedBox(height: 4),
            _buildUsername(),
          ],
        ),
      ),
    );
  }

  Widget _buildAvatarCircle() {
    if (isLocked) {
      return const _LockedCircle();
    }

    if (_isEmpty) {
      return _EmptyCircle(position: position);
    }

    final String? avatar = user?['avatar'] as String?;
    final int vipLevel = user?['vipLevel'] as int? ?? 0;

    return _SpeakingRing(
      isSpeaking: isSpeaking,
      vipLevel: vipLevel,
      child: ClipOval(
        child: SizedBox(
          width: 50,
          height: 50,
          child: avatar != null
              ? CachedNetworkImage(
                  imageUrl: avatar,
                  fit: BoxFit.cover,
                  errorWidget: (_, __, ___) => _defaultAvatar(),
                )
              : _defaultAvatar(),
        ),
      ),
    );
  }

  Widget _defaultAvatar() {
    return Container(
      color: AppColors.elevatedDark,
      child: const Icon(Icons.person, color: Colors.white60, size: 28),
    );
  }

  Widget _buildCrownBadge() {
    return Positioned(
      top: -10,
      child: Container(
        padding: const EdgeInsets.all(3),
        decoration: BoxDecoration(
          gradient: AppColors.goldGradient,
          shape: BoxShape.circle,
          boxShadow: [
            BoxShadow(
              color: AppColors.vip3.withOpacity(0.5),
              blurRadius: 6,
              spreadRadius: 1,
            ),
          ],
        ),
        child: const Icon(Icons.workspace_premium,
            color: Colors.white, size: 14),
      ),
    );
  }

  Widget _buildMutedBadge() {
    return Positioned(
      bottom: -2,
      right: -2,
      child: Container(
        width: 20,
        height: 20,
        decoration: BoxDecoration(
          color: AppColors.micOff,
          shape: BoxShape.circle,
          border: Border.all(color: AppColors.backgroundDark, width: 1.5),
        ),
        child: const Icon(Icons.mic_off, color: Colors.white, size: 11),
      ),
    );
  }

  Widget _buildMyIndicator() {
    return Positioned.fill(
      child: Container(
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          border: Border.all(
            color: AppColors.secondary,
            width: 2,
          ),
        ),
      ),
    );
  }

  Widget _buildUsername() {
    if (isLocked) {
      return Text(
        'Locked',
        maxLines: 1,
        style: TextStyle(
          fontSize: 10,
          color: AppColors.textTertiary,
          fontFamily: 'Poppins',
        ),
      );
    }

    if (_isEmpty) {
      return Text(
        'Seat $position',
        maxLines: 1,
        style: TextStyle(
          fontSize: 10,
          color: AppColors.textTertiary,
          fontFamily: 'Poppins',
        ),
      );
    }

    final String name =
        (user?['displayName'] as String? ??
                user?['username'] as String? ??
                'User')
            ._take(8);

    return Text(
      name,
      maxLines: 1,
      overflow: TextOverflow.ellipsis,
      style: TextStyle(
        fontSize: 11,
        fontWeight: FontWeight.w500,
        color: isHost ? AppColors.vip3 : Colors.white,
        fontFamily: 'Poppins',
      ),
    );
  }
}

extension _StringTake on String {
  String _take(int n) {
    if (length <= n) return this;
    return '${substring(0, n)}...';
  }
}

// ---------------------------------------------------------------------------
// Sub-widgets
// ---------------------------------------------------------------------------

class _EmptyCircle extends StatelessWidget {
  final int position;
  const _EmptyCircle({required this.position});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 50,
      height: 50,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: AppColors.seatEmpty,
        border: Border.all(
          color: AppColors.dividerDark,
          width: 1.5,
          style: BorderStyle.solid,
        ),
      ),
      child: const Icon(Icons.add, color: AppColors.textTertiary, size: 22),
    );
  }
}

class _LockedCircle extends StatelessWidget {
  const _LockedCircle();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 50,
      height: 50,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: AppColors.seatLocked,
        border: Border.all(color: AppColors.dividerDark, width: 1),
      ),
      child: const Icon(Icons.lock_outline,
          color: AppColors.textTertiary, size: 18),
    );
  }
}

class _SpeakingRing extends StatefulWidget {
  final bool isSpeaking;
  final int vipLevel;
  final Widget child;

  const _SpeakingRing({
    required this.isSpeaking,
    required this.vipLevel,
    required this.child,
  });

  @override
  State<_SpeakingRing> createState() => _SpeakingRingState();
}

class _SpeakingRingState extends State<_SpeakingRing>
    with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  late Animation<double> _scale;
  late Animation<double> _opacity;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    );
    _scale = Tween<double>(begin: 1.0, end: 1.15)
        .animate(CurvedAnimation(parent: _ctrl, curve: Curves.easeInOut));
    _opacity = Tween<double>(begin: 0.6, end: 1.0)
        .animate(CurvedAnimation(parent: _ctrl, curve: Curves.easeInOut));

    if (widget.isSpeaking) {
      _ctrl.repeat(reverse: true);
    }
  }

  @override
  void didUpdateWidget(_SpeakingRing old) {
    super.didUpdateWidget(old);
    if (widget.isSpeaking && !old.isSpeaking) {
      _ctrl.repeat(reverse: true);
    } else if (!widget.isSpeaking && old.isSpeaking) {
      _ctrl.stop();
      _ctrl.reset();
    }
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  Color get _ringColor {
    if (widget.isSpeaking) return AppColors.primary;
    if (widget.vipLevel > 0) {
      return AppColors.vipColors[
          widget.vipLevel.clamp(1, AppColors.vipColors.length - 1)];
    }
    return AppColors.dividerDark;
  }

  @override
  Widget build(BuildContext context) {
    final ringColor = _ringColor;

    return AnimatedBuilder(
      animation: _ctrl,
      builder: (ctx, child) {
        return Container(
          width: 56,
          height: 56,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            border: Border.all(
              color: widget.isSpeaking
                  ? ringColor.withOpacity(_opacity.value)
                  : ringColor,
              width: widget.isSpeaking ? 2.5 : 1.5,
            ),
            boxShadow: widget.isSpeaking
                ? [
                    BoxShadow(
                      color: AppColors.primary.withOpacity(0.5),
                      blurRadius: 10 * _scale.value,
                      spreadRadius: 2,
                    ),
                  ]
                : widget.vipLevel > 0
                    ? [
                        BoxShadow(
                          color: ringColor.withOpacity(0.3),
                          blurRadius: 8,
                          spreadRadius: 1,
                        ),
                      ]
                    : null,
          ),
          child: Transform.scale(
            scale: widget.isSpeaking ? _scale.value : 1.0,
            child: widget.child,
          ),
        );
      },
    );
  }
}
