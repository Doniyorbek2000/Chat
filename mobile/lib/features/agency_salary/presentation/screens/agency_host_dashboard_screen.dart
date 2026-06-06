import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/network/api_client.dart';

class AgencyHostDashboardScreen extends ConsumerStatefulWidget {
  const AgencyHostDashboardScreen({super.key});

  @override
  ConsumerState<AgencyHostDashboardScreen> createState() => _AgencyHostDashboardScreenState();
}

class _AgencyHostDashboardScreenState extends ConsumerState<AgencyHostDashboardScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tab;
  bool _loading = true;
  String _error = '';
  Map<String, dynamic>? _earning;
  List<Map<String, dynamic>> _payouts = [];
  bool _requesting = false;

  @override
  void initState() {
    super.initState();
    _tab = TabController(length: 2, vsync: this);
    _load();
  }

  @override
  void dispose() {
    _tab.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = ''; });
    try {
      final api = ref.read(apiClientProvider);
      final results = await Future.wait([
        api.get('/agency/host/earnings'),
        api.get('/agency/host/payouts'),
      ]);
      if (mounted) {
        setState(() {
          final earningData = results[0].data['data'] ?? results[0].data;
          _earning = earningData is Map ? Map<String, dynamic>.from(earningData) : null;
          _payouts = List<Map<String, dynamic>>.from(((results[1].data['data'] ?? results[1].data) as List? ?? []).map((e) => Map<String, dynamic>.from(e as Map)));
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() { _error = e.toString(); _loading = false; });
    }
  }

  Future<void> _requestPayout() async {
    if (_requesting) return;
    setState(() => _requesting = true);
    try {
      final api = ref.read(apiClientProvider);
      await api.post('/agency/host/payouts/request');
      await _load();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Pul yechish so\'rovi yuborildi!', style: TextStyle(fontFamily: 'Poppins')), backgroundColor: AppColors.success),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString(), style: const TextStyle(fontFamily: 'Poppins')), backgroundColor: AppColors.error),
        );
      }
    } finally {
      if (mounted) setState(() => _requesting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundDark,
      body: SafeArea(
        child: Column(
          children: [
            _buildHeader(),
            _buildTabBar(),
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
                  : _error.isNotEmpty
                      ? _buildError()
                      : TabBarView(
                          controller: _tab,
                          children: [
                            _buildEarningsTab(),
                            _buildPayoutsTab(),
                          ],
                        ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
      child: Row(
        children: [
          IconButton(icon: const Icon(Icons.arrow_back_ios_new, color: Colors.white), onPressed: () => context.pop()),
          const Expanded(child: Text('Host Daromad Paneli', textAlign: TextAlign.center, style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold, fontFamily: 'Poppins'))),
          const SizedBox(width: 48),
        ],
      ),
    );
  }

  Widget _buildTabBar() {
    return Container(
      color: AppColors.surfaceDark,
      child: TabBar(
        controller: _tab,
        indicatorColor: AppColors.primary,
        labelColor: AppColors.primary,
        unselectedLabelColor: AppColors.textSecondary,
        labelStyle: const TextStyle(fontFamily: 'Poppins', fontWeight: FontWeight.w600, fontSize: 14),
        tabs: const [Tab(text: 'Daromad'), Tab(text: 'To\'lovlar')],
      ),
    );
  }

  Widget _buildError() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.error_outline, color: AppColors.error, size: 48),
          const SizedBox(height: 12),
          Text(_error, style: const TextStyle(color: AppColors.textSecondary, fontFamily: 'Poppins'), textAlign: TextAlign.center),
          const SizedBox(height: 16),
          ElevatedButton(onPressed: _load, style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary), child: const Text('Qayta urinish')),
        ],
      ),
    );
  }

  Widget _buildEarningsTab() {
    if (_earning == null) {
      return const Center(child: Text('Daromad ma\'lumoti topilmadi', style: TextStyle(color: AppColors.textSecondary, fontFamily: 'Poppins')));
    }
    final netAmount = _earning!['netAmount'] as String? ?? '0';
    final commissionRate = ((_earning!['commissionRate'] as num?)?.toDouble() ?? 0.0);
    final hasPending = _payouts.any((p) => p['status'] == 'PENDING');

    return RefreshIndicator(
      onRefresh: _load,
      color: AppColors.primary,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            _buildEarningsCard(netAmount, commissionRate).animate().fadeIn(duration: 400.ms),
            const SizedBox(height: 16),
            _buildRecentEarnings().animate().fadeIn(delay: 200.ms),
            const SizedBox(height: 16),
            _buildPayoutButton(hasPending).animate().fadeIn(delay: 300.ms),
          ],
        ),
      ),
    );
  }

  Widget _buildEarningsCard(String netAmount, double commissionRate) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: const LinearGradient(colors: [Color(0xFF2D1B69), Color(0xFF1A0F3A)]),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.primary.withOpacity(0.4)),
      ),
      child: Column(
        children: [
          const Text('💰', style: TextStyle(fontSize: 40)),
          const SizedBox(height: 8),
          Text(netAmount, style: const TextStyle(color: AppColors.coin, fontSize: 28, fontWeight: FontWeight.bold, fontFamily: 'Poppins')),
          const Text('Jami Sof Daromad (Olmos)', style: TextStyle(color: AppColors.textSecondary, fontSize: 13, fontFamily: 'Poppins')),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            decoration: BoxDecoration(color: Colors.black.withOpacity(0.3), borderRadius: BorderRadius.circular(10)),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.percent, color: AppColors.warning, size: 16),
                const SizedBox(width: 6),
                Text('Agentlik komissiyasi: ${(commissionRate * 100).toStringAsFixed(0)}%', style: const TextStyle(color: AppColors.textSecondary, fontFamily: 'Poppins', fontSize: 12)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRecentEarnings() {
    final history = List<Map<String, dynamic>>.from((_earning?['recentHistory'] as List? ?? []).map((e) => Map<String, dynamic>.from(e as Map)));
    if (history.isEmpty) return const SizedBox.shrink();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('So\'nggi Sovg\'a Daromadlari', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontFamily: 'Poppins')),
        const SizedBox(height: 10),
        ...history.take(10).map((h) => Container(
          margin: const EdgeInsets.only(bottom: 8),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(color: AppColors.cardDark, borderRadius: BorderRadius.circular(10), border: Border.all(color: AppColors.dividerDark)),
          child: Row(
            children: [
              const Text('🎁', style: TextStyle(fontSize: 18)),
              const SizedBox(width: 10),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('Sovg\'a: ${h['giftValue'] ?? '0'}', style: const TextStyle(color: Colors.white, fontFamily: 'Poppins', fontSize: 13)),
                Text('Komissiya: ${h['commission'] ?? '0'}', style: const TextStyle(color: AppColors.textSecondary, fontSize: 11, fontFamily: 'Poppins')),
              ])),
              Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                Text('💎 ${h['netAmount'] ?? '0'}', style: const TextStyle(color: AppColors.diamond, fontWeight: FontWeight.bold, fontFamily: 'Poppins', fontSize: 13)),
                Text(_shortDate(h['createdAt'] as String? ?? ''), style: const TextStyle(color: AppColors.textTertiary, fontSize: 10, fontFamily: 'Poppins')),
              ]),
            ],
          ),
        )),
      ],
    );
  }

  Widget _buildPayoutButton(bool hasPending) {
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton.icon(
        onPressed: hasPending || _requesting ? null : _requestPayout,
        icon: _requesting ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)) : const Icon(Icons.account_balance_wallet, color: Colors.white),
        label: Text(
          hasPending ? 'Kutilayotgan so\'rov mavjud' : 'Pul Yechish So\'rovi',
          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontFamily: 'Poppins'),
        ),
        style: ElevatedButton.styleFrom(
          backgroundColor: hasPending ? AppColors.dividerDark : AppColors.primary,
          disabledBackgroundColor: AppColors.dividerDark,
          padding: const EdgeInsets.symmetric(vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      ),
    );
  }

  Widget _buildPayoutsTab() {
    if (_payouts.isEmpty) {
      return const Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
        Text('💸', style: TextStyle(fontSize: 48)),
        SizedBox(height: 12),
        Text('Hali to\'lovlar yo\'q', style: TextStyle(color: AppColors.textSecondary, fontFamily: 'Poppins')),
      ]));
    }
    return RefreshIndicator(
      onRefresh: _load,
      color: AppColors.primary,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _payouts.length,
        itemBuilder: (_, i) => _buildPayoutItem(_payouts[i]).animate(delay: Duration(milliseconds: i * 50)).fadeIn(duration: 300.ms),
      ),
    );
  }

  Widget _buildPayoutItem(Map<String, dynamic> p) {
    final status = p['status'] as String? ?? 'PENDING';
    final statusColor = _statusColor(status);
    final statusLabel = _statusLabel(status);
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: AppColors.cardDark, borderRadius: BorderRadius.circular(14), border: Border.all(color: AppColors.dividerDark)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('💎 ${p['amount'] ?? '0'}', style: const TextStyle(color: AppColors.diamond, fontWeight: FontWeight.bold, fontSize: 18, fontFamily: 'Poppins')),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(color: statusColor.withOpacity(0.15), borderRadius: BorderRadius.circular(20), border: Border.all(color: statusColor.withOpacity(0.4))),
                child: Text(statusLabel, style: TextStyle(color: statusColor, fontFamily: 'Poppins', fontSize: 12, fontWeight: FontWeight.bold)),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(_shortDate(p['createdAt'] as String? ?? ''), style: const TextStyle(color: AppColors.textTertiary, fontSize: 12, fontFamily: 'Poppins')),
          if (p['rejectedReason'] != null)
            Padding(
              padding: const EdgeInsets.only(top: 6),
              child: Text('Sabab: ${p['rejectedReason']}', style: const TextStyle(color: AppColors.error, fontSize: 12, fontFamily: 'Poppins')),
            ),
        ],
      ),
    );
  }

  Color _statusColor(String s) {
    switch (s) {
      case 'COMPLETED': return AppColors.success;
      case 'REJECTED': return AppColors.error;
      case 'PROCESSING': return AppColors.warning;
      default: return AppColors.info;
    }
  }

  String _statusLabel(String s) {
    switch (s) {
      case 'PENDING': return 'Kutilmoqda';
      case 'PROCESSING': return 'Jarayonda';
      case 'COMPLETED': return 'To\'landi';
      case 'REJECTED': return 'Rad etildi';
      default: return s;
    }
  }

  String _shortDate(String iso) {
    try {
      final d = DateTime.parse(iso).toLocal();
      return '${d.day.toString().padLeft(2,'0')}.${d.month.toString().padLeft(2,'0')}.${d.year}';
    } catch (_) {
      return iso;
    }
  }
}
