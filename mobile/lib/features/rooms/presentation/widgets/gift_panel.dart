import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/providers/gifts_provider.dart';
import '../../../../core/providers/wallet_provider.dart';
import '../../../../core/theme/app_colors.dart';

// ---------------------------------------------------------------------------
// Local providers
// ---------------------------------------------------------------------------

final _selectedGiftProvider = StateProvider.autoDispose<GiftModel?>((ref) => null);
final _giftQuantityProvider = StateProvider.autoDispose<int>((ref) => 1);
final _selectedTabProvider = StateProvider.autoDispose<String>((ref) => 'ALL');

const _categoryOrder = ['ALL', 'NORMAL', 'LUXURY', 'VIP', 'LUCKY', 'LUCKY_FRUIT', 'COUPLE', 'RELATIONSHIP', 'ARISTOCRACY'];

const _categoryLabels = {
  'ALL': 'Hammasi',
  'NORMAL': 'Oddiy',
  'LUXURY': 'Premium',
  'VIP': 'VIP',
  'LUCKY': 'Omadli',
  'LUCKY_FRUIT': 'Meva',
  'COUPLE': 'Juft',
  'RELATIONSHIP': 'Muhabbat',
  'ARISTOCRACY': 'Aristokrat',
};

// ---------------------------------------------------------------------------
// Gift panel widget
// ---------------------------------------------------------------------------

class GiftPanel extends ConsumerStatefulWidget {
  final String roomId;
  final String receiverId;
  final VoidCallback onClose;

  const GiftPanel({
    super.key,
    required this.roomId,
    required this.receiverId,
    required this.onClose,
  });

  @override
  ConsumerState<GiftPanel> createState() => _GiftPanelState();
}

class _GiftPanelState extends ConsumerState<GiftPanel>
    with SingleTickerProviderStateMixin {
  late TabController _tabCtrl;
  bool _isSending = false;
  List<String> _visibleTabs = ['ALL'];

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: 1, vsync: this);
  }

  @override
  void dispose() {
    _tabCtrl.dispose();
    super.dispose();
  }

  void _rebuildTabs(Map<String, List<GiftModel>> byCategory) {
    final tabs = ['ALL'];
    for (final cat in _categoryOrder.skip(1)) {
      if (byCategory.containsKey(cat) && (byCategory[cat]?.isNotEmpty ?? false)) {
        tabs.add(cat);
      }
    }
    if (tabs.length != _visibleTabs.length) {
      _visibleTabs = tabs;
      _tabCtrl.dispose();
      _tabCtrl = TabController(length: tabs.length, vsync: this);
    }
  }

  Future<void> _sendGift() async {
    final gift = ref.read(_selectedGiftProvider);
    final quantity = ref.read(_giftQuantityProvider);
    if (gift == null || _isSending) return;

    HapticFeedback.mediumImpact();
    setState(() => _isSending = true);

    try {
      final result = await ref.read(giftSendProvider.notifier).send(
            giftId: gift.id,
            receiverId: widget.receiverId,
            roomId: widget.roomId,
            quantity: quantity,
          );

      if (!mounted) return;

      if (result != null) {
        // Refresh wallet balance from server (no frontend-only update)
        ref.read(walletProvider.notifier).refreshBalance();

        if (result.isLucky && result.multiplier > 1) {
          _showLuckyResult(gift, result.multiplier, quantity);
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                '${gift.name} x$quantity yuborildi!',
                style: const TextStyle(fontFamily: 'Poppins'),
              ),
              backgroundColor: AppColors.success,
              behavior: SnackBarBehavior.floating,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
          );
          widget.onClose();
        }
      } else {
        final err = ref.read(giftSendProvider).asError?.error.toString() ?? 'Xatolik yuz berdi';
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(err, style: const TextStyle(fontFamily: 'Poppins')),
            backgroundColor: AppColors.error,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isSending = false);
    }

    ref.read(_selectedGiftProvider.notifier).state = null;
  }

  void _showLuckyResult(GiftModel gift, int multiplier, int quantity) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => _LuckyResultDialog(
        giftName: gift.name,
        multiplier: multiplier,
        quantity: quantity,
        onDone: () {
          Navigator.of(context).pop();
          widget.onClose();
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final giftsByCat = ref.watch(giftsByCategoryProvider);
    final selectedGift = ref.watch(_selectedGiftProvider);
    final quantity = ref.watch(_giftQuantityProvider);
    final coins = ref.watch(walletBalanceProvider);
    final selectedTab = ref.watch(_selectedTabProvider);

    return Container(
      height: MediaQuery.of(context).size.height * 0.55,
      decoration: const BoxDecoration(
        color: AppColors.surfaceDark,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: giftsByCat.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (_, __) => Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('Sovg\'alar yuklanmadi', style: TextStyle(color: Colors.white)),
              TextButton(
                onPressed: () => ref.refresh(giftsByCategoryProvider),
                child: const Text('Qayta urinish'),
              ),
            ],
          ),
        ),
        data: (byCategory) {
          _rebuildTabs(byCategory);

          final allGifts = byCategory.values.expand((l) => l).toList();
          final filtered = selectedTab == 'ALL'
              ? allGifts
              : (byCategory[selectedTab] ?? []);

          return Column(
            children: [
              _buildHandle(),
              _buildTabBar(),
              Expanded(child: _buildGiftGrid(filtered, selectedGift)),
              _buildBottomBar(selectedGift, quantity, coins),
            ],
          );
        },
      ),
    );
  }

  Widget _buildHandle() => Container(
        margin: const EdgeInsets.only(top: 10, bottom: 4),
        width: 36,
        height: 4,
        decoration: BoxDecoration(
          color: AppColors.dividerDark,
          borderRadius: BorderRadius.circular(2),
        ),
      );

  Widget _buildTabBar() {
    return TabBar(
      controller: _tabCtrl,
      isScrollable: true,
      indicatorColor: AppColors.primary,
      indicatorWeight: 2,
      labelColor: Colors.white,
      unselectedLabelColor: AppColors.textTertiary,
      labelStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, fontFamily: 'Poppins'),
      onTap: (i) => ref.read(_selectedTabProvider.notifier).state = _visibleTabs[i],
      tabs: _visibleTabs
          .map((t) => Tab(text: _categoryLabels[t] ?? t))
          .toList(),
    );
  }

  Widget _buildGiftGrid(List<GiftModel> gifts, GiftModel? selectedGift) {
    if (gifts.isEmpty) {
      return const Center(
        child: Text('Bu kategoriyada sovg\'a yo\'q', style: TextStyle(color: Colors.white54)),
      );
    }

    return GridView.builder(
      padding: const EdgeInsets.all(12),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 4,
        crossAxisSpacing: 8,
        mainAxisSpacing: 8,
        childAspectRatio: 0.85,
      ),
      itemCount: gifts.length,
      itemBuilder: (ctx, i) {
        final gift = gifts[i];
        final isSelected = selectedGift?.id == gift.id;
        final isLucky = gift.category == 'LUCKY' || gift.category == 'LUCKY_FRUIT';

        return GestureDetector(
          onTap: () => ref.read(_selectedGiftProvider.notifier).state =
              isSelected ? null : gift,
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
                    // Gift icon/image
                    gift.imageUrl.isNotEmpty
                        ? Image.network(
                            gift.imageUrl,
                            width: 36,
                            height: 36,
                            errorBuilder: (_, __, ___) =>
                                const Text('🎁', style: TextStyle(fontSize: 28)),
                          )
                        : Text(
                            _categoryEmoji(gift.category),
                            style: const TextStyle(fontSize: 28),
                          ),
                    const SizedBox(height: 2),
                    Text(
                      gift.name,
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
                          ' ${gift.coinPrice}',
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
                      child: const Icon(Icons.check, color: Colors.white, size: 10),
                    ),
                  ),
                if (isLucky)
                  Positioned(
                    top: 0,
                    left: 0,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 3, vertical: 1),
                      decoration: BoxDecoration(
                        color: Colors.amber,
                        borderRadius: const BorderRadius.only(
                          topLeft: Radius.circular(10),
                          bottomRight: Radius.circular(6),
                        ),
                      ),
                      child: const Text('🍀', style: TextStyle(fontSize: 7)),
                    ),
                  ),
              ],
            ),
          ),
        ).animate().fadeIn(delay: Duration(milliseconds: i * 20), duration: 200.ms);
      },
    );
  }

  Widget _buildBottomBar(GiftModel? selectedGift, int quantity, int coins) {
    final isEnabled = selectedGift != null && !_isSending;
    final cost = (selectedGift?.coinPrice ?? 0) * quantity;
    final canAfford = coins >= cost;

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
            onTap: isEnabled && canAfford ? _sendGift : null,
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 11),
              decoration: BoxDecoration(
                gradient: (isEnabled && canAfford) ? AppColors.primaryGradient : null,
                color: (isEnabled && canAfford) ? null : AppColors.elevatedDark,
                borderRadius: BorderRadius.circular(22),
                boxShadow: (isEnabled && canAfford)
                    ? [
                        BoxShadow(
                          color: AppColors.primary.withOpacity(0.4),
                          blurRadius: 12,
                          offset: const Offset(0, 4),
                        ),
                      ]
                    : null,
              ),
              child: _isSending
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : Text(
                      isEnabled
                          ? (canAfford ? 'Yuborish ($cost🪙)' : 'Yetarli emas')
                          : 'YUBORISH',
                      style: TextStyle(
                        color: (isEnabled && canAfford) ? Colors.white : AppColors.textTertiary,
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
          color: isSelected ? AppColors.primary.withOpacity(0.2) : AppColors.elevatedDark,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: isSelected ? AppColors.primary : Colors.transparent),
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

  String _categoryEmoji(String category) {
    return switch (category) {
      'NORMAL' => '🎁',
      'LUXURY' => '💎',
      'VIP' => '👑',
      'LUCKY' => '🍀',
      'LUCKY_FRUIT' => '🍎',
      'COUPLE' => '💑',
      'RELATIONSHIP' => '💕',
      'ARISTOCRACY' => '🏰',
      'NATION' => '🌍',
      _ => '🎁',
    };
  }
}

// ---------------------------------------------------------------------------
// Lucky result dialog
// ---------------------------------------------------------------------------

class _LuckyResultDialog extends StatelessWidget {
  final String giftName;
  final int multiplier;
  final int quantity;
  final VoidCallback onDone;

  const _LuckyResultDialog({
    required this.giftName,
    required this.multiplier,
    required this.quantity,
    required this.onDone,
  });

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: Colors.transparent,
      child: Container(
        padding: const EdgeInsets.all(28),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [Color(0xFF1A0A3E), Color(0xFF2D1B69)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: Colors.amber, width: 2),
          boxShadow: [
            BoxShadow(color: Colors.amber.withOpacity(0.4), blurRadius: 30, spreadRadius: 5),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('🍀', style: TextStyle(fontSize: 56))
                .animate()
                .scale(duration: 600.ms, curve: Curves.elasticOut),
            const SizedBox(height: 12),
            Text(
              'OMADLI SOVG\'A!',
              style: TextStyle(
                color: Colors.amber,
                fontSize: 20,
                fontWeight: FontWeight.w900,
                fontFamily: 'Poppins',
                letterSpacing: 2,
              ),
            ).animate().fadeIn(delay: 200.ms),
            const SizedBox(height: 8),
            Text(
              '$giftName x$quantity',
              style: const TextStyle(color: Colors.white70, fontSize: 14, fontFamily: 'Poppins'),
            ).animate().fadeIn(delay: 300.ms),
            const SizedBox(height: 16),
            Text(
              '${multiplier}X ko\'paytiruvchi!',
              style: TextStyle(
                color: Colors.white,
                fontSize: 32,
                fontWeight: FontWeight.w900,
                fontFamily: 'Poppins',
              ),
            ).animate().scale(delay: 400.ms, curve: Curves.elasticOut),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: onDone,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.amber,
                  foregroundColor: Colors.black,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
                child: const Text(
                  'Zo\'r!',
                  style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16, fontFamily: 'Poppins'),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
