import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/providers/wallet_provider.dart';
import '../../../../core/models/wallet_model.dart';

class WalletScreen extends ConsumerStatefulWidget {
  const WalletScreen({super.key});

  @override
  ConsumerState<WalletScreen> createState() => _WalletScreenState();
}

class _WalletScreenState extends ConsumerState<WalletScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabCtrl;

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: 4, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(walletProvider.notifier).loadWallet();
    });
  }

  @override
  void dispose() {
    _tabCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final walletAsync = ref.watch(walletProvider);

    return Scaffold(
      backgroundColor: AppColors.backgroundDark,
      appBar: AppBar(
        backgroundColor: AppColors.backgroundDark,
        title: const Text('Hamyon', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, color: Colors.white),
          onPressed: () => context.pop(),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.history, color: Colors.white70),
            onPressed: () => ref.read(walletProvider.notifier).loadWallet(),
            tooltip: 'Refresh',
          ),
        ],
      ),
      body: walletAsync.when(
        loading: () => const Center(child: CircularProgressIndicator(color: AppColors.primary)),
        error: (_, __) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, color: Colors.white54, size: 48),
              const SizedBox(height: 12),
              const Text('Hamyonni yuklashda xatolik', style: TextStyle(color: Colors.white54)),
              TextButton(
                onPressed: () => ref.read(walletProvider.notifier).loadWallet(),
                child: const Text('Qayta urinish', style: TextStyle(color: AppColors.primary)),
              ),
            ],
          ),
        ),
        data: (wallet) => RefreshIndicator(
          color: AppColors.primary,
          backgroundColor: AppColors.cardDark,
          onRefresh: () => ref.read(walletProvider.notifier).loadWallet(),
          child: _buildContent(wallet),
        ),
      ),
    );
  }

  Widget _buildContent(WalletModel wallet) {
    return Column(
      children: [
        _buildBalanceCard(wallet),
        _buildActionRow(),
        const SizedBox(height: 4),
        // Daily recharge progress
        const _DailyRechargeBar(),
        const SizedBox(height: 4),
        TabBar(
          controller: _tabCtrl,
          indicatorColor: AppColors.primary,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white54,
          isScrollable: true,
          tabAlignment: TabAlignment.start,
          tabs: const [
            Tab(text: 'Tangalar'),
            Tab(text: 'Olmos'),
            Tab(text: "O'yin tangalari"),
            Tab(text: 'Omadli'),
          ],
        ),
        Expanded(
          child: TabBarView(
            controller: _tabCtrl,
            children: [
              _TransactionsList(type: 'COINS'),
              _TransactionsList(type: 'DIAMONDS'),
              _TransactionsList(type: 'COINS'),   // game coins filter
              _TransactionsList(type: null),       // lucky/jackpot rewards
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildBalanceCard(WalletModel wallet) {
    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: AppColors.primaryGradient,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withOpacity(0.3),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        children: [
          const Text('Mening tangam', style: TextStyle(color: Colors.white70, fontSize: 13)),
          const SizedBox(height: 4),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              const Text('🪙 ', style: TextStyle(fontSize: 20)),
              Text(
                _fmt(wallet.coins),
                style: const TextStyle(color: Colors.white, fontSize: 36, fontWeight: FontWeight.bold),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              _miniStat('💎 ${_fmt(wallet.diamonds)}', 'Olmos'),
              Container(width: 1, height: 32, color: Colors.white24),
              _miniStat('🎁 ${_fmt(wallet.totalGiftsReceived.toInt())}', 'Sovg\'a'),
              Container(width: 1, height: 32, color: Colors.white24),
              _miniStat('💸 ${_fmt(wallet.totalGiftsSent.toInt())}', 'Yuborildi'),
            ],
          ),
        ],
      ),
    ).animate().fadeIn(duration: 400.ms).slideY(begin: 0.1);
  }

  Widget _miniStat(String value, String label) {
    return Column(
      children: [
        Text(value, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
        Text(label, style: const TextStyle(color: Colors.white60, fontSize: 11)),
      ],
    );
  }

  Widget _buildActionRow() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        children: [
          _actionBtn(
            icon: Icons.add_circle_outline,
            label: "To'ldirish",
            color: AppColors.primary,
            onTap: () => context.push('/wallet/recharge'),
          ),
          const SizedBox(width: 12),
          _actionBtn(
            icon: Icons.swap_horiz,
            label: "O'tkazish",
            color: AppColors.accent,
            onTap: _showTransferDialog,
          ),
          const SizedBox(width: 12),
          _actionBtn(
            icon: Icons.arrow_upward,
            label: 'Yechib olish',
            color: AppColors.secondary,
            onTap: _showWithdrawDialog,
          ),
        ],
      ),
    );
  }

  Widget _actionBtn({
    required IconData icon,
    required String label,
    required Color color,
    required VoidCallback onTap,
  }) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 14),
          decoration: BoxDecoration(
            color: color.withOpacity(0.1),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: color.withOpacity(0.3)),
          ),
          child: Column(
            children: [
              Icon(icon, color: color, size: 22),
              const SizedBox(height: 4),
              Text(label, style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w600)),
            ],
          ),
        ),
      ),
    );
  }

  void _showTransferDialog() {
    final toCtrl = TextEditingController();
    final amtCtrl = TextEditingController();
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: AppColors.surfaceDark,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text("Tanga o'tkazish", style: TextStyle(color: Colors.white)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            _inputField(toCtrl, 'Foydalanuvchi ID'),
            const SizedBox(height: 12),
            _inputField(amtCtrl, 'Miqdor', isNumber: true),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Bekor qilish')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
            onPressed: () async {
              final amt = int.tryParse(amtCtrl.text) ?? 0;
              if (amt <= 0 || toCtrl.text.isEmpty) return;
              final ok = await ref.read(walletProvider.notifier).transfer(
                toUserId: toCtrl.text.trim(),
                amount: amt,
              );
              if (mounted) {
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                  content: Text(ok ? "O'tkazma muvaffaqiyatli!" : "O'tkazma amalga oshmadi"),
                  backgroundColor: ok ? AppColors.success : Colors.red,
                ));
              }
            },
            child: const Text("O'tkazish"),
          ),
        ],
      ),
    );
  }

  void _showWithdrawDialog() {
    final amtCtrl = TextEditingController();
    final accCtrl = TextEditingController();
    String method = 'CLICK';
    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSt) => AlertDialog(
          backgroundColor: AppColors.surfaceDark,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: const Text('Olmos yechib olish', style: TextStyle(color: Colors.white)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              DropdownButtonFormField<String>(
                value: method,
                dropdownColor: AppColors.cardDark,
                style: const TextStyle(color: Colors.white),
                decoration: _inputDecoration("To'lov usuli"),
                items: ['CLICK', 'PAYME', 'UZUM'].map((m) => DropdownMenuItem(value: m, child: Text(m))).toList(),
                onChanged: (v) => setSt(() => method = v ?? method),
              ),
              const SizedBox(height: 12),
              _inputField(amtCtrl, 'Miqdor (olmos, min 100)', isNumber: true),
              const SizedBox(height: 12),
              _inputField(accCtrl, 'Hisob/Telefon raqam'),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Bekor qilish')),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.secondary),
              onPressed: () async {
                final amt = int.tryParse(amtCtrl.text) ?? 0;
                if (amt < 100 || accCtrl.text.isEmpty) return;
                final ok = await ref.read(walletProvider.notifier).requestWithdraw(
                  amount: amt,
                  method: method,
                  accountInfo: accCtrl.text.trim(),
                );
                if (mounted) {
                  Navigator.pop(ctx);
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                    content: Text(ok ? 'So\'rov yuborildi!' : 'So\'rov amalga oshmadi'),
                    backgroundColor: ok ? AppColors.success : Colors.red,
                  ));
                }
              },
              child: const Text('Yuborish'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _inputField(TextEditingController ctrl, String label, {bool isNumber = false}) {
    return TextField(
      controller: ctrl,
      keyboardType: isNumber ? TextInputType.number : TextInputType.text,
      style: const TextStyle(color: Colors.white),
      decoration: _inputDecoration(label),
    );
  }

  InputDecoration _inputDecoration(String label) {
    return InputDecoration(
      labelText: label,
      labelStyle: const TextStyle(color: Colors.white54),
      filled: true,
      fillColor: AppColors.cardDark,
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
    );
  }

  String _fmt(num n) {
    if (n >= 1000000) return '${(n / 1000000).toStringAsFixed(1)}M';
    if (n >= 1000) return '${(n / 1000).toStringAsFixed(1)}K';
    return n.toString();
  }
}

// ---------------------------------------------------------------------------
// Daily Recharge Progress Bar widget
// ---------------------------------------------------------------------------

class _DailyRechargeBar extends ConsumerWidget {
  const _DailyRechargeBar();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final progressAsync = ref.watch(dailyRechargeProvider);

    return progressAsync.when(
      loading: () => const SizedBox.shrink(),
      error: (_, __) => const SizedBox.shrink(),
      data: (progress) {
        if (progress == null) return const SizedBox.shrink();

        final thresholds = progress.thresholds;
        final rewards = progress.rewards;
        final total = progress.totalCoins;
        final maxThreshold = thresholds.isNotEmpty ? thresholds.last : 1;
        final progressRatio = (total / maxThreshold).clamp(0.0, 1.0);

        return Container(
          margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: AppColors.cardDark,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: Colors.white10),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text("Kunlik to'lov mukofotlari", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
                  Text('${_fmt(total)} / ${_fmt(maxThreshold)}',
                      style: const TextStyle(color: Colors.white54, fontSize: 11)),
                ],
              ),
              const SizedBox(height: 8),
              // Progress bar
              ClipRRect(
                borderRadius: BorderRadius.circular(6),
                child: LinearProgressIndicator(
                  value: progressRatio,
                  backgroundColor: Colors.white12,
                  valueColor: const AlwaysStoppedAnimation(AppColors.primary),
                  minHeight: 8,
                ),
              ),
              const SizedBox(height: 10),
              // Milestone markers
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: List.generate(thresholds.length, (i) {
                  final reached = total >= thresholds[i];
                  final claimed = progress.claimedTiers.contains(i);
                  final canClaim = reached && !claimed;

                  return GestureDetector(
                    onTap: canClaim
                        ? () async {
                            final ok = await ref.read(walletProvider.notifier).claimDailyRecharge(i);
                            if (ok && context.mounted) {
                              ref.invalidate(dailyRechargeProvider);
                              ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                                content: Text('+${_fmt(rewards[i])} tanga olindi!'),
                                backgroundColor: AppColors.success,
                              ));
                            }
                          }
                        : null,
                    child: Column(
                      children: [
                        Container(
                          width: 32,
                          height: 32,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: claimed
                                ? AppColors.success.withOpacity(0.2)
                                : canClaim
                                    ? AppColors.primary.withOpacity(0.2)
                                    : Colors.white10,
                            border: Border.all(
                              color: claimed
                                  ? AppColors.success
                                  : canClaim
                                      ? AppColors.primary
                                      : Colors.white24,
                              width: 1.5,
                            ),
                          ),
                          child: Center(
                            child: claimed
                                ? const Icon(Icons.check, color: AppColors.success, size: 16)
                                : canClaim
                                    ? const Icon(Icons.card_giftcard, color: AppColors.primary, size: 14)
                                    : const Icon(Icons.lock_outline, color: Colors.white38, size: 14),
                          ),
                        ),
                        const SizedBox(height: 3),
                        Text('+${_fmt(rewards[i])}',
                            style: TextStyle(
                              color: claimed ? AppColors.success : canClaim ? Colors.white : Colors.white38,
                              fontSize: 9,
                              fontWeight: FontWeight.bold,
                            )),
                      ],
                    ),
                  );
                }),
              ),
            ],
          ),
        ).animate().fadeIn(duration: 300.ms);
      },
    );
  }

  String _fmt(num n) {
    if (n >= 1000000) return '${(n / 1000000).toStringAsFixed(0)}M';
    if (n >= 1000) return '${(n / 1000).toStringAsFixed(0)}K';
    return n.toString();
  }
}

// ---------------------------------------------------------------------------
// Transactions list
// ---------------------------------------------------------------------------

class _TransactionsList extends ConsumerStatefulWidget {
  final String? type;
  const _TransactionsList({this.type});

  @override
  ConsumerState<_TransactionsList> createState() => _TransactionsListState();
}

class _TransactionsListState extends ConsumerState<_TransactionsList> {
  List<TransactionModel> _items = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final items = await ref.read(walletProvider.notifier).getTransactions(type: widget.type);
    if (mounted) setState(() { _items = items; _loading = false; });
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator(color: AppColors.primary));
    if (_items.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.receipt_long_outlined, color: Colors.white24, size: 48),
            const SizedBox(height: 12),
            const Text("Tranzaksiyalar yo'q", style: TextStyle(color: Colors.white54)),
          ],
        ),
      );
    }
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: _items.length,
      separatorBuilder: (_, __) => const Divider(color: Colors.white10, height: 1),
      itemBuilder: (_, i) => _txItem(_items[i]),
    );
  }

  Widget _txItem(TransactionModel tx) {
    final isCredit = tx.isCredit;
    return ListTile(
      contentPadding: EdgeInsets.zero,
      leading: Container(
        width: 42,
        height: 42,
        decoration: BoxDecoration(
          color: (isCredit ? AppColors.success : Colors.red).withOpacity(0.1),
          shape: BoxShape.circle,
        ),
        child: Icon(
          isCredit ? Icons.arrow_downward : Icons.arrow_upward,
          color: isCredit ? AppColors.success : Colors.red,
          size: 18,
        ),
      ),
      title: Text(tx.description ?? tx.type.name, style: const TextStyle(color: Colors.white, fontSize: 13)),
      subtitle: Text(tx.createdAt.toLocal().toString().substring(0, 16),
          style: const TextStyle(color: Colors.white38, fontSize: 11)),
      trailing: Text(
        '${isCredit ? '+' : ''}${tx.amount}',
        style: TextStyle(
          color: isCredit ? AppColors.success : Colors.red,
          fontWeight: FontWeight.bold,
          fontSize: 15,
        ),
      ),
    );
  }
}
