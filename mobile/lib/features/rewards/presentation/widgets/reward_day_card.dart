import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../../../core/theme/app_colors.dart';

class RewardDayCard extends StatelessWidget {
  final int day;
  final int coins;
  final int diamonds;
  final bool isClaimed;
  final bool isToday;
  final bool isLocked;

  const RewardDayCard({
    super.key,
    required this.day,
    required this.coins,
    required this.diamonds,
    required this.isClaimed,
    required this.isToday,
    required this.isLocked,
  });

  @override
  Widget build(BuildContext context) {
    final isSpecial = day == 7;

    return AnimatedContainer(
      duration: const Duration(milliseconds: 300),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(isSpecial ? 20 : 14),
        gradient: isToday
            ? AppColors.primaryGradient
            : isClaimed
                ? const LinearGradient(
                    colors: [Color(0xFF1A3A1A), Color(0xFF0D2B0D)],
                  )
                : isLocked
                    ? const LinearGradient(
                        colors: [Color(0xFF111120), Color(0xFF111120)],
                      )
                    : const LinearGradient(
                        colors: [AppColors.cardDark, AppColors.elevatedDark],
                      ),
        border: Border.all(
          color: isToday
              ? AppColors.primary
              : isClaimed
                  ? AppColors.success.withOpacity(0.5)
                  : isSpecial
                      ? AppColors.coin.withOpacity(0.5)
                      : AppColors.dividerDark,
          width: isToday ? 2 : 1,
        ),
        boxShadow: isToday
            ? [
                BoxShadow(
                  color: AppColors.primary.withOpacity(0.4),
                  blurRadius: 12,
                  spreadRadius: 1,
                ),
              ]
            : isSpecial
                ? [
                    BoxShadow(
                      color: AppColors.coin.withOpacity(0.2),
                      blurRadius: 8,
                    ),
                  ]
                : [],
      ),
      child: Stack(
        children: [
          Padding(
            padding: EdgeInsets.all(isSpecial ? 14 : 10),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // Day label
                Text(
                  isSpecial ? 'Day 7' : 'Day $day',
                  style: TextStyle(
                    color: isLocked
                        ? AppColors.textTertiary
                        : isToday
                            ? Colors.white
                            : AppColors.textSecondary,
                    fontSize: isSpecial ? 13 : 11,
                    fontWeight: isToday || isSpecial
                        ? FontWeight.bold
                        : FontWeight.w500,
                    fontFamily: 'Poppins',
                  ),
                ),
                SizedBox(height: isSpecial ? 8 : 6),

                // Icon
                if (isLocked)
                  Icon(
                    Icons.lock_outline,
                    color: AppColors.textTertiary,
                    size: isSpecial ? 28 : 22,
                  )
                else if (isClaimed)
                  Container(
                    padding: EdgeInsets.all(isSpecial ? 6 : 4),
                    decoration: BoxDecoration(
                      color: AppColors.success.withOpacity(0.2),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      Icons.check,
                      color: AppColors.success,
                      size: isSpecial ? 26 : 20,
                    ),
                  )
                else if (isSpecial)
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      gradient: AppColors.goldGradient,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.card_giftcard,
                      color: Colors.black,
                      size: 26,
                    ),
                  ).animate(onPlay: (c) => c.repeat(reverse: true)).shimmer(
                        duration: 2000.ms,
                        color: AppColors.coin.withOpacity(0.4),
                      )
                else
                  Icon(
                    Icons.monetization_on,
                    color: isToday ? Colors.white : AppColors.coin,
                    size: isSpecial ? 28 : 22,
                  ),

                SizedBox(height: isSpecial ? 8 : 6),

                // Coins amount
                if (!isLocked)
                  Text(
                    '+$coins',
                    style: TextStyle(
                      color: isToday
                          ? Colors.white
                          : isClaimed
                              ? AppColors.success
                              : isSpecial
                                  ? AppColors.coin
                                  : Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: isSpecial ? 16 : 13,
                      fontFamily: 'Poppins',
                    ),
                  ),

                // Diamonds
                if (!isLocked && diamonds > 0) ...[
                  const SizedBox(height: 4),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.diamond,
                        color: isToday ? Colors.white70 : AppColors.diamond,
                        size: 12,
                      ),
                      const SizedBox(width: 2),
                      Text(
                        '+$diamonds',
                        style: TextStyle(
                          color: isToday
                              ? Colors.white70
                              : AppColors.diamond,
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          fontFamily: 'Poppins',
                        ),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),

          // Today glow border overlay
          if (isToday)
            Positioned.fill(
              child: Container(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(isSpecial ? 20 : 14),
                  border: Border.all(
                    color: AppColors.primaryLight.withOpacity(0.6),
                    width: 1.5,
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
