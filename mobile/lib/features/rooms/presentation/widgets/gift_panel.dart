import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/network/socket_client.dart';
import '../../../../core/providers/wallet_provider.dart';
import '../../../../core/theme/app_colors.dart';

// ---------------------------------------------------------------------------
// Providers
// ---------------------------------------------------------------------------

final _selectedGiftIdxProvider =
    StateProvider.autoDispose<int?>((ref) => null);
final _giftQuantityProvider = StateProvider.autoDispose<int>((ref) => 1);

class GiftPanel extends ConsumerStatefulWidget {
  final String roomId;
  final String? hostId;
  final VoidCallback onClose;

  const GiftPanel({
    super.key,
    required this.roomId,
    this.hostId,
    required this.onClose,
  });

  @override
  ConsumerState<GiftPanel> createState() => _GiftPanelState();
}

class _GiftPanelState extends ConsumerState<GiftPanel>
    with SingleTickerProviderStateMixin {
  late TabController _tabCtrl;

  final _tabs = ['All', 'Normal', 'Luxury', 'VIP', 'Lucky', 'Couple'];

  static final _gifts = List.generate(24, (i) => {
        'id': 'gift_$i',
        'name': _giftNames[i % _giftNames.length],
        'icon': _giftIcons[i % _giftIcons.length],
        'price': [10, 50, 100, 500, 1000, 5000][i % 6],
        'isHot': i % 4 == 0,
        'isNew': i % 5 == 0,
      });

  static const _giftNames = [
    'Rose', 'Heart', 'Crown', 'Diamond', 'Car', 'Castle',
    'Star', 'Fireworks', 'Gift Box', 'Ring', 'Balloon', 'Teddy',
  ];
  static const _giftIcons = [
    '🌹', '💖', '👑', '💎', '🚗', '🏰',
    '⭐', '🎆', '🎁', '💍', '🎈', '🧸',
  ];

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: _tabs.length, vsync: this);
  }

  @override
  void dispose() {
    _tabCtrl.dispose();
    super.dispose();
  }

  Future<void> _sendGift() async {
    final selectedIdx = ref.read(_selectedGiftIdxProvider);
    final quantity = ref.read(_giftQuantityProvider);
    if (selectedIdx == null) return;

    final gift = _gifts[selectedIdx];
    HapticFeedback.mediumImpact();

    try {
      SocketClient.instance.sendGift(
        roomId: widget.roomId,
        giftId: gift['id'] as String,
        count: quantity,
        targetUserId: widget.hostId,
      );

      ref.read(walletProvider.notifier).deductCoins(
            (gift['price'] as int) * quantity,
          );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                Text(gift['icon'] as String,
                    style: const TextStyle(fontSize: 18)),
                const SizedBox(width: 8),
                Text('Sent ${gift['name']} x$quantity!',
                    style: const TextStyle(fontFamily: 'Poppins')),
              ],
            ),
            backgroundColor: AppColors.success,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12)),
          ),
        );
      }
    } catch (_) {}

    ref.read(_selectedGiftIdxProvider.notifier).state = null;
    widget.onClose();
  }

  @override
  Widget build(BuildContext context) {
    final selectedIdx = ref.watch(_selectedGiftIdxProvider);
    final quantity = ref.watch(_giftQuantityProvider);
    final coins = ref.watch(walletBalanceProvider);

    return Container(
      height: MediaQuery.of(context).size.height * 0.55,
      decoration: const BoxDecoration(
        color: AppColors.surfaceDark,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        children: [
          _buildHandle(),
          _buildTabBar(),
          Expanded(child: _buildGiftGrid(selectedIdx)),
          _buildBottomBar(selectedIdx, quantity, coins),
        ],
      ),
    );
  }

  Widget _buildHandle() {
    return Container(
      margin: const EdgeInsets.only(top: 10, bottom: 4),
      width: 36,
      height: 4,
      decoration: BoxDecoration(
        color: AppColors.dividerDark,
        borderRadius: BorderRadius.circular(2),
      ),
    );
  }

  Widget _buildTabBar() {
    return TabBar(
      controller: _tabCtrl,
      isScrollable: true,
      indicatorColor: AppColors.primary,
      indicatorWeight: 2,
      labelColor: Colors.white,
      unselectedLabelColor: AppColors.textTertiary,
      labelStyle: const TextStyle(
        fontSize: 13,
        fontWeight: FontWeight.w600,
        fontFamily: 'Poppins',
      ),
      tabs: _tabs.map((t) => Tab(text: t)).toList(),
    );
  }

  Widget _buildGiftGrid(int? selectedIdx) {
    return GridView.builder(
      padding: const EdgeInsets.all(12),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 4,
        crossAxisSpacing: 8,
        mainAxisSpacing: 8,
        childAspectRatio: 0.85,
      ),
      itemCount: _gifts.length,
      itemBuilder: (ctx, i) {
        final gift = _gifts[i];
        final isSelected = selectedIdx == i;

        return GestureDetector(
          onTap: () =>
              ref.read(_selectedGiftIdxProvider.notifier).state =
                  isSelected ? null : i,
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            decoration: BoxDecoration(
              color: isSelected
                  ? AppColors.primary.withOpacity(0.15)
                  : AppColors.cardDark,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(
                color: isSelected ? AppColors.primary : Colors.transparent,
                width: 1.5,
              ),
            ),
            child: Stack(
              children: [
                Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(gift['icon'] as String,
                        style: const TextStyle(fontSize: 28)),
                    const SizedBox(height: 2),
                    Text(
                      gift['name'] as String,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: AppColors.textSecondary,
                        fontSize: 10,
                        fontFamily: 'Poppins',
                      ),
                    ),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Text('🪙', style: TextStyle(fontSize: 10)),
                        Text(
                          ' ${gift['price']}',
                          style: TextStyle(
                            color: AppColors.coin,
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            fontFamily: 'Poppins',
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                if (isSelected)
                  Positioned(
                    top: 4,
                    right: 4,
                    child: Container(
                      width: 16,
                      height: 16,
                      decoration: const BoxDecoration(
                        color: AppColors.primary,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.check,
                          color: Colors.white, size: 10),
                    ),
                  ),
                if (gift['isHot'] as bool)
                  Positioned(
                    top: 0,
                    left: 0,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 4, vertical: 1),
                      decoration: BoxDecoration(
                        color: AppColors.error,
                        borderRadius: const BorderRadius.only(
                          topLeft: Radius.circular(10),
                          bottomRight: Radius.circular(6),
                        ),
                      ),
                      child: const Text('🔥',
                          style: TextStyle(fontSize: 8)),
                    ),
                  ),
              ],
            ),
          ),
        ).animate().fadeIn(
              delay: Duration(milliseconds: i * 30),
              duration: 200.ms,
            );
      },
    );
  }

  Widget _buildBottomBar(int? selectedIdx, int quantity, int coins) {
    final isEnabled = selectedIdx != null;
    final gift = isEnabled ? _gifts[selectedIdx!] : null;
    final cost = (gift?['price'] as int? ?? 0) * quantity;

    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 20),
      decoration: BoxDecoration(
        color: AppColors.cardDark,
        border: Border(top: BorderSide(color: AppColors.dividerDark)),
      ),
      child: Row(
        children: [
          const Text('🪙', style: TextStyle(fontSize: 18)),
          const SizedBox(width: 4),
          Text(
            coins.toString(),
            style: TextStyle(
              color: AppColors.coin,
              fontWeight: FontWeight.bold,
              fontSize: 15,
              fontFamily: 'Poppins',
            ),
          ),
          const SizedBox(width: 10),
          _buildQuantityBtn(1, quantity),
          const SizedBox(width: 4),
          _buildQuantityBtn(10, quantity),
          const SizedBox(width: 4),
          _buildQuantityBtn(99, quantity),
          const Spacer(),
          GestureDetector(
            onTap: isEnabled ? _sendGift : null,
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              padding:
                  const EdgeInsets.symmetric(horizontal: 20, vertical: 11),
              decoration: BoxDecoration(
                gradient: isEnabled ? AppColors.primaryGradient : null,
                color: isEnabled ? null : AppColors.elevatedDark,
                borderRadius: BorderRadius.circular(22),
                boxShadow: isEnabled
                    ? [
                        BoxShadow(
                          color: AppColors.primary.withOpacity(0.4),
                          blurRadius: 12,
                          offset: const Offset(0, 4),
                        ),
                      ]
                    : null,
              ),
              child: Text(
                isEnabled ? 'Send ($cost🪙)' : 'SEND',
                style: TextStyle(
                  color: isEnabled ? Colors.white : AppColors.textTertiary,
                  fontWeight: FontWeight.bold,
                  fontSize: 13,
                  fontFamily: 'Poppins',
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildQuantityBtn(int qty, int current) {
    final isSelected = current == qty;
    return GestureDetector(
      onTap: () => ref.read(_giftQuantityProvider.notifier).state = qty,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
        decoration: BoxDecoration(
          color: isSelected
              ? AppColors.primary.withOpacity(0.2)
              : AppColors.elevatedDark,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: isSelected ? AppColors.primary : Colors.transparent,
          ),
        ),
        child: Text(
          'x$qty',
          style: TextStyle(
            color: isSelected ? AppColors.primary : AppColors.textSecondary,
            fontSize: 11,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
            fontFamily: 'Poppins',
          ),
        ),
      ),
    );
  }
}
