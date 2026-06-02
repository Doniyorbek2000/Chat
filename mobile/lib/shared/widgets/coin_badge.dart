import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/utils/app_utils.dart';

class CoinBadge extends StatelessWidget {
  final int amount;
  final bool showIcon;
  final double fontSize;
  final bool isDiamond;

  const CoinBadge({
    super.key,
    required this.amount,
    this.showIcon = true,
    this.fontSize = 13,
    this.isDiamond = false,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (showIcon) ...[
          ShaderMask(
            shaderCallback: (bounds) => (isDiamond
                    ? AppColors.diamondGradient
                    : AppColors.goldGradient)
                .createShader(bounds),
            child: Icon(
              isDiamond ? Icons.diamond : Icons.monetization_on,
              size: fontSize + 3,
              color: Colors.white,
            ),
          ),
          const SizedBox(width: 3),
        ],
        Text(
          AppUtils.formatCoins(amount),
          style: TextStyle(
            fontSize: fontSize,
            fontWeight: FontWeight.w600,
            fontFamily: 'Poppins',
            color: isDiamond ? AppColors.diamond : AppColors.coin,
          ),
        ),
      ],
    );
  }
}

class CoinBalanceBadge extends StatelessWidget {
  final int coins;
  final int? diamonds;
  final bool showBoth;

  const CoinBalanceBadge({
    super.key,
    required this.coins,
    this.diamonds,
    this.showBoth = false,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: AppColors.cardDark,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.dividerDark),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          CoinBadge(amount: coins),
          if (showBoth && diamonds != null) ...[
            const SizedBox(width: 12),
            const SizedBox(
              height: 14,
              child: VerticalDivider(color: AppColors.dividerDark, width: 1),
            ),
            const SizedBox(width: 12),
            CoinBadge(amount: diamonds!, isDiamond: true),
          ],
        ],
      ),
    );
  }
}

class GiftCostBadge extends StatelessWidget {
  final int price;
  final int count;

  const GiftCostBadge({
    super.key,
    required this.price,
    required this.count,
  });

  @override
  Widget build(BuildContext context) {
    final total = price * count;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        gradient: AppColors.goldGradient,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.monetization_on, color: Colors.white, size: 14),
          const SizedBox(width: 4),
          Text(
            AppUtils.formatCoins(total),
            style: const TextStyle(
              color: Colors.white,
              fontSize: 13,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }
}
