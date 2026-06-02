import 'dart:async';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';

class PkBattleWidget extends StatefulWidget {
  final Map<String, dynamic> pkBattle;

  const PkBattleWidget({super.key, required this.pkBattle});

  @override
  State<PkBattleWidget> createState() => _PkBattleWidgetState();
}

class _PkBattleWidgetState extends State<PkBattleWidget> {
  Timer? _timer;
  late Duration _remaining;

  @override
  void initState() {
    super.initState();
    _calcRemaining();
    _startTimer();
  }

  void _calcRemaining() {
    final endTime = widget.pkBattle['endTime'];
    if (endTime is DateTime) {
      _remaining = endTime.difference(DateTime.now());
      if (_remaining.isNegative) _remaining = Duration.zero;
    } else {
      _remaining = const Duration(minutes: 10);
    }
  }

  void _startTimer() {
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted) return;
      setState(() {
        if (_remaining.inSeconds > 0) {
          _remaining -= const Duration(seconds: 1);
        } else {
          _timer?.cancel();
        }
      });
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final int score1 = widget.pkBattle['score1'] as int? ?? 0;
    final int score2 = widget.pkBattle['score2'] as int? ?? 0;
    final String name1 = widget.pkBattle['hostName1'] as String? ?? 'Team 1';
    final String name2 = widget.pkBattle['hostName2'] as String? ?? 'Team 2';
    final String? avatar1 = widget.pkBattle['hostAvatar1'] as String?;
    final String? avatar2 = widget.pkBattle['hostAvatar2'] as String?;
    final String? winnerId = widget.pkBattle['winnerId'] as String?;
    final bool isEnded = _remaining.inSeconds == 0 || winnerId != null;

    final totalScore = score1 + score2;
    final pct1 = totalScore > 0 ? score1 / totalScore : 0.5;

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            AppColors.primary.withOpacity(0.2),
            AppColors.secondary.withOpacity(0.1),
          ],
        ),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: AppColors.primary.withOpacity(0.3),
        ),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(child: _buildTeamInfo(name1, avatar1, score1, isEnded,
                  winnerId == widget.pkBattle['hostId1'])),
              _buildCenterTimer(isEnded),
              Expanded(
                child: _buildTeamInfo(name2, avatar2, score2, isEnded,
                    winnerId == widget.pkBattle['hostId2'],
                    isRight: true),
              ),
            ],
          ),
          const SizedBox(height: 10),
          _buildScoreBar(pct1, isEnded),
        ],
      ),
    );
  }

  Widget _buildTeamInfo(String name, String? avatar, int score, bool isEnded,
      bool isWinner,
      {bool isRight = false}) {
    final opacity = isEnded && !isWinner ? 0.4 : 1.0;

    return Opacity(
      opacity: opacity,
      child: Column(
        children: [
          Stack(
            clipBehavior: Clip.none,
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: isWinner ? AppColors.vip3 : AppColors.dividerDark,
                    width: isWinner ? 2 : 1,
                  ),
                ),
                child: ClipOval(
                  child: avatar != null
                      ? CachedNetworkImage(
                          imageUrl: avatar,
                          fit: BoxFit.cover,
                          errorWidget: (_, __, ___) => _placeholder(),
                        )
                      : _placeholder(),
                ),
              ),
              if (isWinner)
                Positioned(
                  top: -8,
                  left: 0,
                  right: 0,
                  child: Center(
                    child: Icon(Icons.workspace_premium,
                        color: AppColors.vip3, size: 16),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            name,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 11,
              fontWeight: FontWeight.w600,
              fontFamily: 'Poppins',
            ),
          ),
          Text(
            score.toString(),
            style: TextStyle(
              color: AppColors.coin,
              fontSize: 13,
              fontWeight: FontWeight.bold,
              fontFamily: 'Poppins',
            ),
          ),
        ],
      ),
    );
  }

  Widget _placeholder() {
    return Container(
      color: AppColors.elevatedDark,
      child: const Icon(Icons.person, color: Colors.white60, size: 20),
    );
  }

  Widget _buildCenterTimer(bool isEnded) {
    final mm = _remaining.inMinutes.toString().padLeft(2, '0');
    final ss = (_remaining.inSeconds % 60).toString().padLeft(2, '0');
    final isUrgent = _remaining.inSeconds <= 30;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      child: Column(
        children: [
          const Text(
            'VS',
            style: TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.bold,
              fontSize: 16,
              fontFamily: 'Poppins',
            ),
          ),
          const SizedBox(height: 4),
          AnimatedDefaultTextStyle(
            duration: const Duration(milliseconds: 200),
            style: TextStyle(
              color: isEnded
                  ? AppColors.textTertiary
                  : isUrgent
                      ? AppColors.error
                      : AppColors.textSecondary,
              fontSize: 13,
              fontWeight: FontWeight.w600,
              fontFamily: 'Poppins',
            ),
            child: Text(isEnded ? 'ENDED' : '$mm:$ss'),
          ),
        ],
      ),
    );
  }

  Widget _buildScoreBar(double pct1, bool isEnded) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(6),
      child: SizedBox(
        height: 8,
        child: Row(
          children: [
            AnimatedContainer(
              duration: const Duration(milliseconds: 500),
              curve: Curves.easeInOut,
              width: (MediaQuery.of(context).size.width - 80) * pct1,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [AppColors.primary, AppColors.primaryLight],
                ),
              ),
            ),
            Expanded(
              child: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [AppColors.secondary, AppColors.secondaryDark],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
