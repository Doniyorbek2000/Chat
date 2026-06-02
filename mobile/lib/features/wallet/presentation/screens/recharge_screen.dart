import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/providers/wallet_provider.dart';

const _packages = [
  {'id': 'pkg_1', 'coins': 100, 'price': 999, 'label': 'Starter', 'bonus': 0},
  {'id': 'pkg_2', 'coins': 500, 'price': 4500, 'label': 'Popular', 'bonus': 50},
  {'id': 'pkg_3', 'coins': 1000, 'price': 8500, 'label': 'Value', 'bonus': 150},
  {'id': 'pkg_4', 'coins': 3000, 'price': 24000, 'label': 'Pro', 'bonus': 600},
  {'id': 'pkg_5', 'coins': 10000, 'price': 79000, 'label': 'Elite', 'bonus': 2500},
  {'id': 'pkg_6', 'coins': 50000, 'price': 380000, 'label': 'Diamond', 'bonus': 15000},
];

const _methods = [
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

class _RechargeScreenState extends ConsumerState<RechargeScreen> {
  int? _selectedPkgIdx;
  String _selectedMethod = 'CLICK';
  bool _loading = false;

  Future<void> _pay() async {
    if (_selectedPkgIdx == null) return;
    setState(() => _loading = true);
    final pkg = _packages[_selectedPkgIdx!];
    final url = await ref.read(walletProvider.notifier).recharge(
      packageId: pkg['id'] as String,
      paymentMethod: _selectedMethod,
    );
    setState(() => _loading = false);
    if (mounted) {
      if (url != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Redirecting to payment...'), backgroundColor: AppColors.success),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Payment initiation failed'), backgroundColor: Colors.red),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundDark,
      appBar: AppBar(
        backgroundColor: AppColors.backgroundDark,
        title: const Text('Recharge', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, color: Colors.white),
          onPressed: () => context.pop(),
        ),
      ),
      body: Column(
        children: [
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Select Package', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
                  const SizedBox(height: 12),
                  GridView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      crossAxisSpacing: 10,
                      mainAxisSpacing: 10,
                      childAspectRatio: 1.3,
                    ),
                    itemCount: _packages.length,
                    itemBuilder: (_, i) {
                      final pkg = _packages[i];
                      final isSelected = _selectedPkgIdx == i;
                      return GestureDetector(
                        onTap: () => setState(() => _selectedPkgIdx = i),
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
                              if (pkg['label'] == 'Popular')
                                Positioned(
                                  top: 0, right: 0,
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                    decoration: const BoxDecoration(
                                      color: AppColors.secondary,
                                      borderRadius: BorderRadius.only(topRight: Radius.circular(13), bottomLeft: Radius.circular(8)),
                                    ),
                                    child: const Text('HOT', style: TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold)),
                                  ),
                                ),
                              Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  const Text('🪙', style: TextStyle(fontSize: 28)),
                                  Text(
                                    _formatCoins(pkg['coins'] as int),
                                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18),
                                  ),
                                  if ((pkg['bonus'] as int) > 0)
                                    Text('+${pkg['bonus']} bonus', style: const TextStyle(color: AppColors.success, fontSize: 10)),
                                  const SizedBox(height: 4),
                                  Text(
                                    '${_formatPrice(pkg['price'] as int)} so\'m',
                                    style: const TextStyle(color: Colors.white54, fontSize: 11),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ).animate(delay: Duration(milliseconds: i * 50)).fadeIn(duration: 300.ms);
                    },
                  ),
                  const SizedBox(height: 24),
                  const Text('Payment Method', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
                  const SizedBox(height: 12),
                  ...(_methods.map((m) {
                    final isSelected = _selectedMethod == m['id'];
                    return GestureDetector(
                      onTap: () => setState(() => _selectedMethod = m['id'] as String),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 200),
                        margin: const EdgeInsets.only(bottom: 8),
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: isSelected ? AppColors.primary.withOpacity(0.1) : AppColors.cardDark,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: isSelected ? AppColors.primary : Colors.white12,
                          ),
                        ),
                        child: Row(
                          children: [
                            Text(m['icon'] as String, style: const TextStyle(fontSize: 24)),
                            const SizedBox(width: 12),
                            Text(m['label'] as String, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w500)),
                            const Spacer(),
                            if (isSelected) const Icon(Icons.check_circle, color: AppColors.primary, size: 20),
                          ],
                        ),
                      ),
                    );
                  })),
                ],
              ),
            ),
          ),
          Container(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
            decoration: const BoxDecoration(
              color: AppColors.surfaceDark,
              border: Border(top: BorderSide(color: Colors.white10)),
            ),
            child: SafeArea(
              top: false,
              child: Column(
                children: [
                  if (_selectedPkgIdx != null) ...[
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Total:', style: TextStyle(color: Colors.white54)),
                        Text(
                          '${_formatPrice(_packages[_selectedPkgIdx!]['price'] as int)} so\'m',
                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                  ],
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: _selectedPkgIdx == null ? AppColors.surfaceDark : AppColors.primary,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                      onPressed: _selectedPkgIdx == null ? null : _pay,
                      child: _loading
                          ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                          : const Text('Pay Now', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _formatCoins(int n) {
    if (n >= 1000) return '${(n / 1000).toStringAsFixed(0)}K';
    return n.toString();
  }

  String _formatPrice(int p) {
    final s = p.toString();
    final result = StringBuffer();
    for (var i = 0; i < s.length; i++) {
      if (i > 0 && (s.length - i) % 3 == 0) result.write(',');
      result.write(s[i]);
    }
    return result.toString();
  }
}
