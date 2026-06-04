import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/providers/wallet_provider.dart';
import '../../../../core/models/wallet_model.dart';
import '../../../../core/services/billing_service.dart';

const _paymentMethods = [
  {'id': 'CLICK', 'label': 'Click', 'icon': '💳'},
  {'id': 'PAYME', 'label': 'Payme', 'icon': '📱'},
  {'id': 'UZUM', 'label': 'Uzum Bank', 'icon': '🏦'},
  {'id': 'GOOGLE', 'label': 'Google Play', 'icon': '🎮'},
];

class RechargeScreen extends ConsumerStatefulWidget {
  const RechargeScreen({super.key});

  @override
  ConsumerState<RechargeScreen> createState() => _RechargeScreenState();
}

class _RechargeScreenState extends ConsumerState<RechargeScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabCtrl;
  int? _selectedIdx;
  String _paymentMethod = 'GOOGLE';
  bool _purchasing = false;
  String? _errorMsg;

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: 2, vsync: this);
    BillingService.instance.initialize();
  }

  @override
  void dispose() {
    _tabCtrl.dispose();
    super.dispose();
  }

  Future<void> _purchase(RechargeProductModel product) async {
    setState(() { _purchasing = true; _errorMsg = null; });

    try {
      if (_paymentMethod == 'GOOGLE') {
        // Google Play IAP flow
        final launched = await BillingService.instance.buyProduct(product.productId);
        if (!launched && mounted) {
          // Listen for result via purchaseStream
          BillingService.instance.purchaseStream.first.then((purchases) async {
            for (final p in purchases) {
              final result = await BillingService.instance.verifyPurchase(p);
              if (result != null && mounted) {
                await ref.read(walletProvider.notifier).refreshBalance();
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text("Xarid muvaffaqiyatli yakunlandi! +${_formatNum((result['coinsAdded'] as num?)?.toInt() ?? 0)} Tanga"),
                    backgroundColor: AppColors.success,
                  ),
                );
                if (mounted) context.pop();
              }
            }
            if (mounted) setState(() => _purchasing = false);
          });
          return;
        }
        if (!launched && mounted) {
          setState(() { _errorMsg = "Google Play Billing mavjud emas"; _purchasing = false; });
        }
      } else {
        // Click / Payme / Uzum flow — get payment URL from backend
        final result = await ref.read(walletProvider.notifier).initiatePayment(
          productId: product.productId,
          provider: _paymentMethod,
          amount: product.priceUzs,
        );
        if (result != null && mounted) {
          final url = result['paymentUrl'] as String?;
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(url != null ? "To'lov sahifasiga o'tilmoqda..." : "To'lov boshlandi"),
              backgroundColor: AppColors.primary,
            ),
          );
        } else if (mounted) {
          setState(() => _errorMsg = "To'lovni boshlash muvaffaqiyatsiz bo'ldi");
        }
        setState(() => _purchasing = false);
      }
    } catch (e) {
      if (mounted) setState(() { _errorMsg = e.toString(); _purchasing = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    final productsAsync = ref.watch(rechargeProductsProvider);
    final offerAsync = ref.watch(firstRechargeOfferProvider);

    return Scaffold(
      backgroundColor: AppColors.backgroundDark,
      appBar: AppBar(
        backgroundColor: AppColors.backgroundDark,
        title: const Text("To'ldirish", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, color: Colors.white),
          onPressed: () => context.pop(),
        ),
        bottom: TabBar(
          controller: _tabCtrl,
          indicatorColor: AppColors.primary,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white54,
          tabs: const [Tab(text: 'Tangalar'), Tab(text: 'Olmos')],
        ),
      ),
      body: productsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator(color: AppColors.primary)),
        error: (_, __) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Text("Mahsulotlarni yuklashda xatolik", style: TextStyle(color: Colors.white54)),
              TextButton(
                onPressed: () => ref.invalidate(rechargeProductsProvider),
                child: const Text('Qayta urinish', style: TextStyle(color: AppColors.primary)),
              ),
            ],
          ),
        ),
        data: (allProducts) {
          final coinProducts = allProducts.where((p) => p.isCoins).toList();
          final diamondProducts = allProducts.where((p) => p.isDiamonds).toList();
          final firstRechargeOffer = offerAsync.value;

          return Column(
            children: [
              Expanded(
                child: TabBarView(
                  controller: _tabCtrl,
                  children: [
                    _buildProductsPage(coinProducts, firstRechargeOffer),
                    _buildProductsPage(diamondProducts, null),
                  ],
                ),
              ),
              _buildBottomBar(allProducts),
            ],
          );
        },
      ),
    );
  }

  Widget _buildProductsPage(List<RechargeProductModel> products, FirstRechargeOffer? offer) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // First recharge offer banner
          if (offer != null && offer.eligible) ...[
            _buildFirstRechargeBanner(offer),
            const SizedBox(height: 20),
          ],

          if (products.isEmpty)
            const Center(child: Text('Mahsulotlar mavjud emas', style: TextStyle(color: Colors.white54)))
          else ...[
            Text(
              products.first.isDiamonds ? 'Olmos paketlari' : 'Tanga paketlari',
              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
            ),
            const SizedBox(height: 12),
            GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                crossAxisSpacing: 10,
                mainAxisSpacing: 10,
                childAspectRatio: 1.2,
              ),
              itemCount: products.length,
              itemBuilder: (_, i) => _buildProductCard(products[i], i),
            ),
          ],

          const SizedBox(height: 24),
          _buildPaymentMethodSection(),

          if (_errorMsg != null) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.red.withOpacity(0.1),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: Colors.red.withOpacity(0.3)),
              ),
              child: Text(_errorMsg!, style: const TextStyle(color: Colors.red, fontSize: 12)),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildFirstRechargeBanner(FirstRechargeOffer offer) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [Colors.orange.withOpacity(0.2), Colors.deepOrange.withOpacity(0.15)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.orange.withOpacity(0.4)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Text('🎁', style: TextStyle(fontSize: 24)),
              const SizedBox(width: 8),
              const Text("Birinchi to'ldirish bonusi!", style: TextStyle(color: Colors.orange, fontWeight: FontWeight.bold, fontSize: 15)),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(color: Colors.orange, borderRadius: BorderRadius.circular(8)),
                child: const Text('Yangi', style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
              ),
            ],
          ),
          const SizedBox(height: 8),
          const Text('Birinchi marta to\'ldirishda 2x bonus oling!', style: TextStyle(color: Colors.white70, fontSize: 12)),
          const SizedBox(height: 12),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: offer.offers.map((item) => _buildFirstRechargeCard(item)).toList(),
            ),
          ),
        ],
      ),
    ).animate().fadeIn(duration: 400.ms);
  }

  Widget _buildFirstRechargeCard(FirstRechargeOfferItem item) {
    return GestureDetector(
      onTap: () => _purchase(RechargeProductModel(
        productId: item.productId,
        title: "Birinchi to'ldirish",
        type: 'FIRST_RECHARGE',
        baseAmount: item.coins,
        bonusAmount: item.bonusCoins,
        priceUzs: item.priceUzs,
        isFirstRechargeOnly: true,
        isActive: true,
        sortOrder: 0,
      )),
      child: Container(
        width: 130,
        margin: const EdgeInsets.only(right: 10),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.orange.withOpacity(0.15),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.orange.withOpacity(0.4)),
        ),
        child: Column(
          children: [
            const Text('🪙', style: TextStyle(fontSize: 22)),
            Text(_formatNum(item.coins + item.bonusCoins),
                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
            Text('+${_formatNum(item.bonusCoins)} bonus',
                style: const TextStyle(color: Colors.orange, fontSize: 10)),
            const SizedBox(height: 4),
            Text('${_formatPrice(item.priceUzs)} so\'m',
                style: const TextStyle(color: Colors.white70, fontSize: 11)),
          ],
        ),
      ),
    );
  }

  Widget _buildProductCard(RechargeProductModel product, int i) {
    final productsAsync = ref.watch(rechargeProductsProvider);
    final allProducts = productsAsync.value ?? [];
    final tabProducts = _tabCtrl.index == 0
        ? allProducts.where((p) => p.isCoins).toList()
        : allProducts.where((p) => p.isDiamonds).toList();
    final isSelected = _selectedIdx == tabProducts.indexOf(product);
    final emoji = product.isDiamonds ? '💎' : '🪙';

    return GestureDetector(
      onTap: () => setState(() => _selectedIdx = tabProducts.indexOf(product)),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primary.withOpacity(0.15) : AppColors.cardDark,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isSelected ? AppColors.primary : Colors.white12,
            width: isSelected ? 2 : 1,
          ),
        ),
        child: Stack(
          children: [
            if (i == 1)
              Positioned(
                top: 0, right: 0,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: const BoxDecoration(
                    color: AppColors.secondary,
                    borderRadius: BorderRadius.only(topRight: Radius.circular(13), bottomLeft: Radius.circular(8)),
                  ),
                  child: const Text('POPULAR', style: TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold)),
                ),
              ),
            Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(emoji, style: const TextStyle(fontSize: 26)),
                const SizedBox(height: 4),
                Text(
                  _formatNum(product.baseAmount),
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
                ),
                if (product.hasBonus)
                  Text('+${_formatNum(product.bonusAmount)} bonus',
                      style: const TextStyle(color: AppColors.success, fontSize: 10)),
                const SizedBox(height: 4),
                Text(
                  '${_formatPrice(product.priceUzs)} so\'m',
                  style: const TextStyle(color: Colors.white54, fontSize: 11),
                ),
              ],
            ),
          ],
        ),
      ).animate(delay: Duration(milliseconds: i * 50)).fadeIn(duration: 300.ms),
    );
  }

  Widget _buildPaymentMethodSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text("To'lov usuli", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
        const SizedBox(height: 12),
        ..._paymentMethods.map((m) {
          final isSelected = _paymentMethod == m['id'];
          return GestureDetector(
            onTap: () => setState(() => _paymentMethod = m['id'] as String),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: isSelected ? AppColors.primary.withOpacity(0.1) : AppColors.cardDark,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: isSelected ? AppColors.primary : Colors.white12),
              ),
              child: Row(
                children: [
                  Text(m['icon'] as String, style: const TextStyle(fontSize: 22)),
                  const SizedBox(width: 12),
                  Text(m['label'] as String, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w500)),
                  const Spacer(),
                  if (isSelected) const Icon(Icons.check_circle, color: AppColors.primary, size: 20),
                ],
              ),
            ),
          );
        }),
      ],
    );
  }

  Widget _buildBottomBar(List<RechargeProductModel> allProducts) {
    final tabProducts = _tabCtrl.index == 0
        ? allProducts.where((p) => p.isCoins).toList()
        : allProducts.where((p) => p.isDiamonds).toList();
    final selected = (_selectedIdx != null && _selectedIdx! < tabProducts.length)
        ? tabProducts[_selectedIdx!]
        : null;

    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
      decoration: const BoxDecoration(
        color: AppColors.surfaceDark,
        border: Border(top: BorderSide(color: Colors.white10)),
      ),
      child: SafeArea(
        top: false,
        child: Column(
          children: [
            if (selected != null) ...[
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Jami:', style: TextStyle(color: Colors.white54)),
                  Text(
                    '${_formatPrice(selected.priceUzs)} so\'m',
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                ],
              ),
              const SizedBox(height: 8),
            ],
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: selected == null ? AppColors.surfaceDark : AppColors.primary,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
                onPressed: (selected == null || _purchasing) ? null : () => _purchase(selected),
                child: _purchasing
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : Text(
                        selected == null ? 'Paket tanlang' : 'Sotib olish',
                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _formatNum(int n) {
    if (n >= 1000000) return '${(n / 1000000).toStringAsFixed(1)}M';
    if (n >= 1000) return '${(n / 1000).toStringAsFixed(0)}K';
    return n.toString();
  }

  String _formatPrice(int p) {
    final s = p.toString();
    final buf = StringBuffer();
    for (var i = 0; i < s.length; i++) {
      if (i > 0 && (s.length - i) % 3 == 0) buf.write(',');
      buf.write(s[i]);
    }
    return buf.toString();
  }
}
