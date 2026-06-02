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
    _tabCtrl = TabController(length: 3, vsync: this);
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
        title: const Text('Wallet', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, color: Colors.white),
          onPressed: () => context.pop(),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.history, color: Colors.white70),
            onPressed: () {},
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
              const Text('Failed to load wallet', style: TextStyle(color: Colors.white54)),
              TextButton(
                onPressed: () => ref.read(walletProvider.notifier).loadWallet(),
                child: const Text('Retry', style: TextStyle(color: AppColors.primary)),
              ),
            ],
          ),
        ),
        data: (wallet) => _buildContent(wallet),
      ),
    );
  }

  Widget _buildContent(WalletModel wallet) {
    return Column(
      children: [
        _buildBalanceCard(wallet),
        _buildActionRow(),
        const SizedBox(height: 8),
        TabBar(
          controller: _tabCtrl,
          indicatorColor: AppColors.primary,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white54,
          tabs: const [
            Tab(text: 'All'),
            Tab(text: 'Coins'),
            Tab(text: 'Diamonds'),
          ],
        ),
        Expanded(
          child: TabBarView(
            controller: _tabCtrl,
            children: [
              _TransactionsList(type: null),
              _TransactionsList(type: 'COIN'),
              _TransactionsList(type: 'DIAMOND'),
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
          const Text('Total Balance', style: TextStyle(color: Colors.white70, fontSize: 13)),
          const SizedBox(height: 4),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              const Text('🪙 ', style: TextStyle(fontSize: 20)),
              Text(
                _formatNumber(wallet.coins),
                style: const TextStyle(color: Colors.white, fontSize: 36, fontWeight: FontWeight.bold),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              _buildMiniStat('💎 ${_formatNumber(wallet.diamonds)}', 'Diamonds'),
              Container(width: 1, height: 32, color: Colors.white24),
              _buildMiniStat('🪙 ${_formatNumber(wallet.totalGiftsReceived.toInt())}', 'Earned'),
              Container(width: 1, height: 32, color: Colors.white24),
              _buildMiniStat('💸 ${_formatNumber(wallet.totalGiftsSent.toInt())}', 'Spent'),
            ],
          ),
        ],
      ),
    ).animate().fadeIn(duration: 400.ms).slideY(begin: 0.1);
  }

  Widget _buildMiniStat(String value, String label) {
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
          _buildActionBtn(
            icon: Icons.add_circle_outline,
            label: 'Recharge',
            color: AppColors.primary,
            onTap: () => context.push('/wallet/recharge'),
          ),
          const SizedBox(width: 12),
          _buildActionBtn(
            icon: Icons.swap_horiz,
            label: 'Transfer',
            color: AppColors.accent,
            onTap: () => _showTransferDialog(),
          ),
          const SizedBox(width: 12),
          _buildActionBtn(
            icon: Icons.arrow_upward,
            label: 'Withdraw',
            color: AppColors.secondary,
            onTap: () => _showWithdrawDialog(),
          ),
        ],
      ),
    );
  }

  Widget _buildActionBtn({
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
              Icon(icon, color: color, size: 24),
              const SizedBox(height: 4),
              Text(label, style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.w600)),
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
        title: const Text('Transfer Coins', style: TextStyle(color: Colors.white)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: toCtrl,
              style: const TextStyle(color: Colors.white),
              decoration: InputDecoration(
                labelText: 'User ID',
                labelStyle: const TextStyle(color: Colors.white54),
                filled: true,
                fillColor: AppColors.cardDark,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: amtCtrl,
              keyboardType: TextInputType.number,
              style: const TextStyle(color: Colors.white),
              decoration: InputDecoration(
                labelText: 'Amount',
                labelStyle: const TextStyle(color: Colors.white54),
                filled: true,
                fillColor: AppColors.cardDark,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
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
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text(ok ? 'Transfer successful!' : 'Transfer failed'), backgroundColor: ok ? AppColors.success : Colors.red),
                );
              }
            },
            child: const Text('Transfer'),
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
          title: const Text('Withdraw Diamonds', style: TextStyle(color: Colors.white)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              DropdownButtonFormField<String>(
                value: method,
                dropdownColor: AppColors.cardDark,
                style: const TextStyle(color: Colors.white),
                decoration: InputDecoration(
                  labelText: 'Method',
                  labelStyle: const TextStyle(color: Colors.white54),
                  filled: true,
                  fillColor: AppColors.cardDark,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
                ),
                items: ['CLICK', 'PAYME', 'UZUM'].map((m) => DropdownMenuItem(value: m, child: Text(m))).toList(),
                onChanged: (v) => setSt(() => method = v ?? method),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: amtCtrl,
                keyboardType: TextInputType.number,
                style: const TextStyle(color: Colors.white),
                decoration: InputDecoration(
                  labelText: 'Amount (diamonds, min 100)',
                  labelStyle: const TextStyle(color: Colors.white54),
                  filled: true,
                  fillColor: AppColors.cardDark,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: accCtrl,
                style: const TextStyle(color: Colors.white),
                decoration: InputDecoration(
                  labelText: 'Account/Phone',
                  labelStyle: const TextStyle(color: Colors.white54),
                  filled: true,
                  fillColor: AppColors.cardDark,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
                ),
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
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
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text(ok ? 'Withdrawal requested!' : 'Request failed'), backgroundColor: ok ? AppColors.success : Colors.red),
                  );
                }
              },
              child: const Text('Request'),
            ),
          ],
        ),
      ),
    );
  }

  String _formatNumber(num n) {
    if (n >= 1000000) return '${(n / 1000000).toStringAsFixed(1)}M';
    if (n >= 1000) return '${(n / 1000).toStringAsFixed(1)}K';
    return n.toString();
  }
}

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
      return const Center(child: Text('No transactions yet', style: TextStyle(color: Colors.white54)));
    }
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: _items.length,
      separatorBuilder: (_, __) => const Divider(color: Colors.white10, height: 1),
      itemBuilder: (_, i) => _buildTxItem(_items[i]),
    );
  }

  Widget _buildTxItem(TransactionModel tx) {
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
      subtitle: Text(tx.createdAt.toLocal().toString().substring(0, 16), style: const TextStyle(color: Colors.white38, fontSize: 11)),
      trailing: Text(
        '${isCredit ? '+' : '-'}${tx.amount}',
        style: TextStyle(
          color: isCredit ? AppColors.success : Colors.red,
          fontWeight: FontWeight.bold,
          fontSize: 15,
        ),
      ),
    );
  }
}
