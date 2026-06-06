import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/network/api_client.dart';
import '../../../../shared/widgets/user_avatar.dart';

class HostRankingScreen extends ConsumerStatefulWidget {
  const HostRankingScreen({super.key});

  @override
  ConsumerState<HostRankingScreen> createState() => _HostRankingScreenState();
}

class _HostRankingScreenState extends ConsumerState<HostRankingScreen> {
  bool _loading = true;
  String _error = '';
  List<Map<String, dynamic>> _ranking = [];
  String _period = 'weekly';

  static const _periods = [
    ('weekly', 'Haftalik'),
    ('monthly', 'Oylik'),
    ('all', 'Barcha vaqt'),
  ];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = ''; });
    try {
      final api = ref.read(apiClientProvider);
      final res = await api.get('/host/ranking?period=$_period&limit=50');
      final data = res.data['data'] ?? res.data;
      if (mounted) {
        setState(() {
          _ranking = List<Map<String, dynamic>>.from((data['ranking'] as List? ?? []).map((e) => Map<String, dynamic>.from(e as Map)));
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() { _error = e.toString(); _loading = false; });
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
            _buildPeriodSelector(),
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
                  : _error.isNotEmpty
                      ? _buildError()
                      : _buildList(),
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
          const Expanded(child: Text('Host Reytingi', textAlign: TextAlign.center, style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold, fontFamily: 'Poppins'))),
          const SizedBox(width: 48),
        ],
      ),
    );
  }

  Widget _buildPeriodSelector() {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        children: _periods.map((p) {
          final isActive = _period == p.$1;
          return GestureDetector(
            onTap: () { setState(() => _period = p.$1); _load(); },
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              margin: const EdgeInsets.only(right: 10),
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 9),
              decoration: BoxDecoration(
                color: isActive ? AppColors.primary : AppColors.cardDark,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: isActive ? AppColors.primary : AppColors.dividerDark),
              ),
              child: Text(p.$2, style: TextStyle(color: isActive ? Colors.white : AppColors.textSecondary, fontFamily: 'Poppins', fontWeight: isActive ? FontWeight.bold : FontWeight.normal, fontSize: 13)),
            ),
          );
        }).toList(),
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

  Widget _buildList() {
    if (_ranking.isEmpty) {
      return const Center(child: Text('Hali reyting mavjud emas', style: TextStyle(color: AppColors.textSecondary, fontFamily: 'Poppins')));
    }
    return RefreshIndicator(
      onRefresh: _load,
      color: AppColors.primary,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _ranking.length,
        itemBuilder: (context, i) => _buildRankItem(_ranking[i], i + 1).animate(delay: Duration(milliseconds: i * 40)).fadeIn(duration: 300.ms).slideX(begin: -0.1),
      ),
    );
  }

  Widget _buildRankItem(Map<String, dynamic> host, int rank) {
    final tier = host['tier'] as String? ?? 'ROOKIE';
    final tierEmoji = _tierEmoji(tier);
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: rank <= 3 ? _rankColor(rank).withOpacity(0.1) : AppColors.cardDark,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: rank <= 3 ? _rankColor(rank).withOpacity(0.4) : AppColors.dividerDark),
      ),
      child: Row(
        children: [
          SizedBox(
            width: 36,
            child: rank <= 3
                ? Text(['🥇', '🥈', '🥉'][rank - 1], style: const TextStyle(fontSize: 24), textAlign: TextAlign.center)
                : Text('$rank', style: const TextStyle(color: AppColors.textSecondary, fontSize: 16, fontWeight: FontWeight.bold, fontFamily: 'Poppins'), textAlign: TextAlign.center),
          ),
          const SizedBox(width: 10),
          UserAvatar(avatarUrl: host['user']?['avatar'] as String?, size: 42, isOnline: false),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(host['user']?['displayName'] as String? ?? '---', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontFamily: 'Poppins')),
                Text('$tierEmoji ${_tierName(tier)} · Lv.${host['level'] ?? 1}', style: const TextStyle(color: AppColors.textSecondary, fontSize: 12, fontFamily: 'Poppins')),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text('${host['xp'] ?? 0} XP', style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold, fontFamily: 'Poppins')),
              Text('🎁 ${host['totalGiftValue'] ?? '0'}', style: const TextStyle(color: AppColors.coin, fontSize: 11, fontFamily: 'Poppins')),
            ],
          ),
        ],
      ),
    );
  }

  Color _rankColor(int rank) {
    if (rank == 1) return AppColors.coin;
    if (rank == 2) return const Color(0xFFC0C0C0);
    return const Color(0xFFCD7F32);
  }

  String _tierEmoji(String tier) {
    const m = {'ROOKIE': '🌱', 'BRONZE': '🥉', 'SILVER': '🥈', 'GOLD': '🥇', 'PLATINUM': '💿', 'DIAMOND': '💎', 'LEGEND': '👑'};
    return m[tier] ?? '🌱';
  }

  String _tierName(String tier) {
    const m = {'ROOKIE': 'Yangi', 'BRONZE': 'Bronza', 'SILVER': 'Kumush', 'GOLD': 'Oltin', 'PLATINUM': 'Platina', 'DIAMOND': 'Olmos', 'LEGEND': 'Afsonaviy'};
    return m[tier] ?? tier;
  }
}
