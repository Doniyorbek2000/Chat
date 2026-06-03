import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../../../core/theme/app_colors.dart';

class EventCard extends StatefulWidget {
  final Map<String, dynamic> event;
  final VoidCallback onTap;

  const EventCard({super.key, required this.event, required this.onTap});

  @override
  State<EventCard> createState() => _EventCardState();
}

class _EventCardState extends State<EventCard> {
  Timer? _timer;
  String _countdown = '';

  @override
  void initState() {
    super.initState();
    _startTimer();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _startTimer() {
    _updateCountdown();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      _updateCountdown();
    });
  }

  void _updateCountdown() {
    final status = widget.event['status'] as String? ?? '';
    if (status == 'active') {
      final endTimeStr = widget.event['endTime'] as String?;
      if (endTimeStr != null) {
        try {
          final endTime = DateTime.parse(endTimeStr);
          final diff = endTime.difference(DateTime.now());
          if (diff.isNegative) {
            if (mounted) setState(() => _countdown = 'Ended');
            _timer?.cancel();
          } else {
            final h = diff.inHours;
            final m = diff.inMinutes.remainder(60).toString().padLeft(2, '0');
            final s = diff.inSeconds.remainder(60).toString().padLeft(2, '0');
            if (mounted) {
              setState(() => _countdown = h > 0 ? '${h}h ${m}m ${s}s' : '${m}m ${s}s');
            }
          }
        } catch (_) {
          _timer?.cancel();
        }
      }
    } else if (status == 'upcoming') {
      final startTimeStr = widget.event['startTime'] as String?;
      if (startTimeStr != null) {
        try {
          final startTime = DateTime.parse(startTimeStr);
          final diff = startTime.difference(DateTime.now());
          if (diff.isNegative) {
            if (mounted) setState(() => _countdown = 'Starting...');
          } else {
            final d = diff.inDays;
            final h = diff.inHours.remainder(24);
            final m = diff.inMinutes.remainder(60).toString().padLeft(2, '0');
            if (mounted) {
              setState(
                () => _countdown = d > 0 ? '${d}d ${h}h ${m}m' : '${h}h ${m}m',
              );
            }
          }
        } catch (_) {}
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final name = widget.event['name'] as String? ?? 'Event';
    final coverImage = widget.event['coverImage'] as String?;
    final status = widget.event['status'] as String? ?? 'active';
    final prizeCoins = (widget.event['prizeCoins'] as num?)?.toInt() ?? 0;
    final prizeDiamonds = (widget.event['prizeDiamonds'] as num?)?.toInt() ?? 0;
    final isJoined = widget.event['isJoined'] as bool? ?? false;
    final requiresVip = widget.event['requiresVip'] as bool? ?? false;

    return GestureDetector(
      onTap: widget.onTap,
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        height: 200,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
              color: AppColors.primary.withOpacity(0.2),
              blurRadius: 16,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(20),
          child: Stack(
            fit: StackFit.expand,
            children: [
              // Background image
              if (coverImage != null && coverImage.isNotEmpty)
                CachedNetworkImage(
                  imageUrl: coverImage,
                  fit: BoxFit.cover,
                  placeholder: (_, __) => Container(
                    color: AppColors.cardDark,
                    child: const Center(
                      child: CircularProgressIndicator(
                        color: AppColors.primary,
                        strokeWidth: 2,
                      ),
                    ),
                  ),
                  errorWidget: (_, __, ___) => _buildPlaceholderBg(),
                )
              else
                _buildPlaceholderBg(),

              // Gradient overlay
              Container(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    colors: [Colors.transparent, Color(0xDD000000)],
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    stops: [0.3, 1.0],
                  ),
                ),
              ),

              // VIP lock badge
              if (requiresVip)
                Positioned(
                  top: 12,
                  left: 12,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      gradient: AppColors.goldGradient,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.star, color: Colors.black, size: 12),
                        SizedBox(width: 4),
                        Text(
                          'VIP Only',
                          style: TextStyle(
                            color: Colors.black,
                            fontWeight: FontWeight.bold,
                            fontSize: 11,
                            fontFamily: 'Poppins',
                          ),
                        ),
                      ],
                    ),
                  ),
                ),

              // Countdown badge
              if (_countdown.isNotEmpty)
                Positioned(
                  top: 12,
                  right: 12,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: status == 'active'
                          ? AppColors.error.withOpacity(0.9)
                          : AppColors.primary.withOpacity(0.9),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          status == 'active'
                              ? Icons.timer
                              : Icons.schedule,
                          color: Colors.white,
                          size: 12,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          _countdown,
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            fontSize: 11,
                            fontFamily: 'Poppins',
                          ),
                        ),
                      ],
                    ),
                  ),
                ),

              // Bottom content
              Positioned(
                left: 16,
                right: 16,
                bottom: 14,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      name,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        fontFamily: 'Poppins',
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        if (prizeCoins > 0) ...[
                          const Icon(Icons.monetization_on,
                              color: AppColors.coin, size: 16),
                          const SizedBox(width: 3),
                          Text(
                            _formatNumber(prizeCoins),
                            style: const TextStyle(
                              color: AppColors.coin,
                              fontWeight: FontWeight.w600,
                              fontSize: 13,
                              fontFamily: 'Poppins',
                            ),
                          ),
                          const SizedBox(width: 12),
                        ],
                        if (prizeDiamonds > 0) ...[
                          const Icon(Icons.diamond,
                              color: AppColors.diamond, size: 16),
                          const SizedBox(width: 3),
                          Text(
                            _formatNumber(prizeDiamonds),
                            style: const TextStyle(
                              color: AppColors.diamond,
                              fontWeight: FontWeight.w600,
                              fontSize: 13,
                              fontFamily: 'Poppins',
                            ),
                          ),
                        ],
                        const Spacer(),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 14, vertical: 6),
                          decoration: BoxDecoration(
                            gradient: isJoined
                                ? const LinearGradient(
                                    colors: [
                                      AppColors.success,
                                      Color(0xFF059669)
                                    ],
                                  )
                                : AppColors.primaryGradient,
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            isJoined ? 'Joined' : 'Join',
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 12,
                              fontFamily: 'Poppins',
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ).animate().fadeIn(duration: 350.ms).slideY(begin: 0.1),
    );
  }

  Widget _buildPlaceholderBg() {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [Color(0xFF1A1A40), Color(0xFF2D1B69)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: const Center(
        child: Icon(
          Icons.event,
          color: Colors.white24,
          size: 64,
        ),
      ),
    );
  }

  String _formatNumber(int n) {
    if (n >= 1000000) return '${(n / 1000000).toStringAsFixed(1)}M';
    if (n >= 1000) return '${(n / 1000).toStringAsFixed(1)}K';
    return '$n';
  }
}
