import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/network/api_client.dart';
import '../../../../core/theme/app_colors.dart';

class ReferralScreen extends ConsumerStatefulWidget {
  const ReferralScreen({super.key});

  @override
  ConsumerState<ReferralScreen> createState() => _ReferralScreenState();
}

class _ReferralScreenState extends ConsumerState<ReferralScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tab;
  Map<String, dynamic> _info = {};
  List<Map<String, dynamic>> _ranking = [];
  bool _loading = true;

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
    setState(() => _loading = true);
    try {
      final api = ref.read(apiClientProvider);
      final results = await Future.wait([
        api.get('/referrals/me'),
        api.get('/referrals/rebate/ranking?limit=20'),
      ]);
      if (!mounted) return;
      setState(() {
        final infoData = results[0].data['data'] ?? results[0].data;
        _info = infoData is Map ? Map<String, dynamic>.from(infoData) : {};
        final rankData = results[1].data['data'] ?? results[1].data;
        _ranking = (rankData is List ? rankData : [])
            .map((e) => Map<String, dynamic>.from(e as Map))
            .toList();
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _copy(String text, String msg) {
    Clipboard.setData(ClipboardData(text: text));
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg), backgroundColor: Colors.green, duration: const Duration(seconds: 2)),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundDark,
      appBar: AppBar(
        backgroundColor: AppColors.backgroundDark,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, color: Colors.white),
          onPressed: () => context.pop(),
        ),
        title: const Text('Taklif qilish', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        bottom: TabBar(
          controller: _tab,
          indicatorColor: AppColors.primary,
          labelColor: AppColors.primary,
          unselectedLabelColor: Colors.white38,
          labelStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
          tabs: const [Tab(text: 'Taklif'), Tab(text: 'Reyting')],
        ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : TabBarView(
              controller: _tab,
              children: [_buildInviteTab(), _buildRankingTab()],
            ),
    );
  }

  Widget _buildInviteTab() {
    final code = _info['code'] as String? ?? '------';
    final link = _info['shareLink'] as String? ?? '';
    final totalEarned = _info['totalEarned'] as int? ?? 0;
    final friendsCount = _info['friendsCount'] as int? ?? 0;
    final friends = (_info['friends'] as List?)
            ?.map((e) => Map<String, dynamic>.from(e as Map))
            .toList() ??
        [];

    return RefreshIndicator(
      color: AppColors.primary,
      onRefresh: _load,
      child: ListView(padding: const EdgeInsets.all(16), children: [
        // Header
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFF4A1080), Color(0xFF1A0050)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(20),
          ),
          child: Column(children: [
            const Text('🎁', style: TextStyle(fontSize: 48)),
            const SizedBox(height: 8),
            const Text('Do\'stlarni taklif qilish', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 4),
            const Text(
              'Do\'sting recharge qilsa bonus tangalar olasiz!',
              style: TextStyle(color: Colors.white60, fontSize: 13),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            Row(mainAxisAlignment: MainAxisAlignment.spaceEvenly, children: [
              _StatBox(label: 'Jami mukofotlar', value: '$totalEarned 💰'),
              Container(width: 1, height: 40, color: Colors.white24),
              _StatBox(label: 'Mening do\'stlarim', value: '$friendsCount'),
            ]),
          ]),
        ).animate().fadeIn(duration: 400.ms),
        const SizedBox(height: 20),
        // Code card
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.cardDark,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Colors.white.withOpacity(0.08)),
          ),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('Sizning kodingiz', style: TextStyle(color: Colors.white54, fontSize: 12)),
            const SizedBox(height: 8),
            Row(children: [
              Expanded(
                child: Text(code,
                    style: const TextStyle(color: Colors.white, fontSize: 26, fontWeight: FontWeight.bold, letterSpacing: 4)),
              ),
              IconButton(
                icon: const Icon(Icons.copy, color: AppColors.primary),
                onPressed: () => _copy(code, 'Nusxa olindi'),
              ),
            ]),
            const Divider(color: Colors.white10, height: 20),
            const Text('Havola', style: TextStyle(color: Colors.white54, fontSize: 12)),
            const SizedBox(height: 6),
            Row(children: [
              Expanded(
                child: Text(link, style: const TextStyle(color: Colors.white70, fontSize: 12), maxLines: 1, overflow: TextOverflow.ellipsis),
              ),
              IconButton(
                icon: const Icon(Icons.share, color: AppColors.primary),
                onPressed: () => _copy(link, 'Havola nusxa olindi'),
              ),
            ]),
          ]),
        ).animate(delay: 100.ms).fadeIn(duration: 400.ms),
        const SizedBox(height: 20),
        // Friends list
        const Text('Mening do\'stlarim', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
        const SizedBox(height: 12),
        if (friends.isEmpty)
          const Center(
            child: Padding(
              padding: EdgeInsets.all(24),
              child: Text('Hali do\'stlar yo\'q', style: TextStyle(color: Colors.white38, fontSize: 14)),
            ),
          )
        else
          ...friends.asMap().entries.map((e) {
            final f = e.value;
            final user = f['user'] as Map<String, dynamic>? ?? {};
            final rewardCoins = f['rewardCoins'] as int? ?? 0;
            return ListTile(
              contentPadding: EdgeInsets.zero,
              leading: CircleAvatar(
                radius: 20,
                backgroundColor: AppColors.primary.withOpacity(0.3),
                child: Text(
                  (user['displayName'] as String? ?? 'U').substring(0, 1).toUpperCase(),
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                ),
              ),
              title: Text(user['displayName'] as String? ?? 'User',
                  style: const TextStyle(color: Colors.white, fontSize: 14)),
              subtitle: Text('Qo\'shilgan: ${_fmtDate(f['joinedAt'] as String?)}',
                  style: const TextStyle(color: Colors.white38, fontSize: 11)),
              trailing: Text('+$rewardCoins 💰',
                  style: const TextStyle(color: Colors.amber, fontSize: 13, fontWeight: FontWeight.bold)),
            ).animate(delay: Duration(milliseconds: e.key * 50)).fadeIn(duration: 300.ms).slideX(begin: 0.1);
          }),
      ]),
    );
  }

  Widget _buildRankingTab() {
    if (_ranking.isEmpty) {
      return const Center(child: Text('Reyting bo\'sh', style: TextStyle(color: Colors.white38, fontSize: 16)));
    }
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: _ranking.length,
      separatorBuilder: (_, __) => const SizedBox(height: 8),
      itemBuilder: (ctx, i) {
        final entry = _ranking[i];
        final user = entry['user'] as Map<String, dynamic>? ?? {};
        final coins = entry['totalCoins'] as int? ?? 0;
        final rank = entry['rank'] as int? ?? i + 1;
        final medal = rank == 1 ? '🥇' : rank == 2 ? '🥈' : rank == 3 ? '🥉' : '#$rank';
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: BoxDecoration(
            color: AppColors.cardDark,
            borderRadius: BorderRadius.circular(12),
            border: rank <= 3
                ? Border.all(
                    color: [Colors.amber, Colors.grey, const Color(0xFFCD7F32)][rank - 1].withOpacity(0.35),
                  )
                : null,
          ),
          child: Row(children: [
            SizedBox(width: 36, child: Text(medal, style: const TextStyle(fontSize: 20), textAlign: TextAlign.center)),
            const SizedBox(width: 12),
            CircleAvatar(
              radius: 18,
              backgroundColor: AppColors.primary.withOpacity(0.3),
              child: Text(
                (user['displayName'] as String? ?? 'U').substring(0, 1).toUpperCase(),
                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(child: Text(user['displayName'] as String? ?? 'User',
                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600))),
            Text('$coins 💰', style: const TextStyle(color: Colors.amber, fontWeight: FontWeight.bold, fontSize: 14)),
          ]),
        ).animate(delay: Duration(milliseconds: i * 40)).fadeIn(duration: 300.ms);
      },
    );
  }

  String _fmtDate(String? iso) {
    if (iso == null) return '';
    try {
      final dt = DateTime.parse(iso);
      return '${dt.day}.${dt.month}.${dt.year}';
    } catch (_) {
      return '';
    }
  }
}

class _StatBox extends StatelessWidget {
  final String label, value;
  const _StatBox({required this.label, required this.value});

  @override
  Widget build(BuildContext context) => Column(children: [
    Text(value, style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
    const SizedBox(height: 4),
    Text(label, style: const TextStyle(color: Colors.white60, fontSize: 11)),
  ]);
}
