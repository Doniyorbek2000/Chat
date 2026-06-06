import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/network/api_client.dart';

class HostLevelScreen extends ConsumerStatefulWidget {
  const HostLevelScreen({super.key});

  @override
  ConsumerState<HostLevelScreen> createState() => _HostLevelScreenState();
}

class _HostLevelScreenState extends ConsumerState<HostLevelScreen> {
  bool _loading = true;
  String _error = '';
  Map<String, dynamic>? _profile;
  Map<String, dynamic>? _rule;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = ''; });
    try {
      final api = ref.read(apiClientProvider);
      final res = await api.get('/host/level/me');
      final data = res.data['data'] ?? res.data;
      if (mounted) {
        setState(() {
          _profile = Map<String, dynamic>.from((data['profile'] as Map?) ?? {});
          _rule = data['currentRule'] != null ? Map<String, dynamic>.from(data['currentRule'] as Map) : null;
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
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : _error.isNotEmpty
              ? _buildError()
              : _buildContent(),
    );
  }

  Widget _buildError() {
    return SafeArea(
      child: Column(
        children: [
          _buildAppBar(),
          Expanded(
            child: Center(
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
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildContent() {
    final tier = _profile?['tier'] as String? ?? 'ROOKIE';
    final level = (_profile?['level'] as num?)?.toInt() ?? 1;
    final xp = (_profile?['xp'] as num?)?.toInt() ?? 0;
    final minXp = (_rule?['minXp'] as num?)?.toInt() ?? 0;
    final maxXp = (_rule?['maxXp'] as num?)?.toInt() ?? 500;
    final progress = maxXp > minXp ? ((xp - minXp) / (maxXp - minXp)).clamp(0.0, 1.0) : 0.0;

    return SafeArea(
      child: RefreshIndicator(
        onRefresh: _load,
        color: AppColors.primary,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          child: Column(
            children: [
              _buildAppBar(),
              _buildTierBanner(tier, level).animate().fadeIn(duration: 400.ms).slideY(begin: -0.2),
              Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    _buildXpCard(xp, minXp, maxXp, progress, level, tier).animate().fadeIn(delay: 200.ms),
                    const SizedBox(height: 16),
                    _buildStatsGrid().animate().fadeIn(delay: 300.ms),
                    const SizedBox(height: 16),
                    _buildRankingButton().animate().fadeIn(delay: 400.ms),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildAppBar() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
      child: Row(
        children: [
          IconButton(icon: const Icon(Icons.arrow_back_ios_new, color: Colors.white), onPressed: () => context.pop()),
          const Expanded(child: Text('Host Darajasi', textAlign: TextAlign.center, style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold, fontFamily: 'Poppins'))),
          const SizedBox(width: 48),
        ],
      ),
    );
  }

  Widget _buildTierBanner(String tier, int level) {
    final tierData = _tierInfo(tier);
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: tierData['gradient'] as LinearGradient,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        children: [
          Text(tierData['emoji'] as String, style: const TextStyle(fontSize: 56)),
          const SizedBox(height: 8),
          Text(tierData['name'] as String, style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold, fontFamily: 'Poppins')),
          Text('Daraja $level', style: TextStyle(color: Colors.white.withOpacity(0.8), fontSize: 14, fontFamily: 'Poppins')),
        ],
      ),
    );
  }

  Widget _buildXpCard(int xp, int minXp, int maxXp, double progress, int level, String tier) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(color: AppColors.cardDark, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppColors.dividerDark)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Tajriba Ballari (XP)', style: TextStyle(color: AppColors.textSecondary, fontSize: 13, fontFamily: 'Poppins')),
              Text('$xp XP', style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold, fontSize: 16, fontFamily: 'Poppins')),
            ],
          ),
          const SizedBox(height: 12),
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: LinearProgressIndicator(value: progress, backgroundColor: AppColors.dividerDark, valueColor: const AlwaysStoppedAnimation<Color>(AppColors.primary), minHeight: 10),
          ),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('$minXp XP', style: const TextStyle(color: AppColors.textTertiary, fontSize: 11, fontFamily: 'Poppins')),
              Text('${(progress * 100).toInt()}% to\'ldirildi', style: const TextStyle(color: AppColors.textSecondary, fontSize: 11, fontFamily: 'Poppins')),
              Text('$maxXp XP', style: const TextStyle(color: AppColors.textTertiary, fontSize: 11, fontFamily: 'Poppins')),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStatsGrid() {
    final stats = [
      {'label': 'Jami Efir', 'value': '${_profile?['totalLiveMinutes'] ?? 0} min', 'icon': '🎙️'},
      {'label': 'Olingan Sovg\'alar', 'value': '${_profile?['totalGiftValue'] ?? '0'}', 'icon': '🎁'},
      {'label': 'Izdoshlar', 'value': '${_profile?['totalFollowers'] ?? 0}', 'icon': '👥'},
      {'label': 'PK G\'alabalar', 'value': '${_profile?['totalPkWins'] ?? 0}', 'icon': '⚔️'},
    ];
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 2, crossAxisSpacing: 12, mainAxisSpacing: 12, childAspectRatio: 1.8),
      itemCount: stats.length,
      itemBuilder: (_, i) {
        final s = stats[i];
        return Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(color: AppColors.cardDark, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.dividerDark)),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(s['icon']!, style: const TextStyle(fontSize: 22)),
              const SizedBox(height: 4),
              Text(s['value']!, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16, fontFamily: 'Poppins')),
              Text(s['label']!, style: const TextStyle(color: AppColors.textSecondary, fontSize: 11, fontFamily: 'Poppins')),
            ],
          ),
        );
      },
    );
  }

  Widget _buildRankingButton() {
    return SizedBox(
      width: double.infinity,
      child: OutlinedButton.icon(
        onPressed: () => context.push('/host-ranking'),
        icon: const Icon(Icons.leaderboard, color: AppColors.primary),
        label: const Text('Reyting Jadvalini Ko\'rish', style: TextStyle(color: AppColors.primary, fontFamily: 'Poppins', fontWeight: FontWeight.w600)),
        style: OutlinedButton.styleFrom(
          side: const BorderSide(color: AppColors.primary),
          padding: const EdgeInsets.symmetric(vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      ),
    );
  }

  Map<String, dynamic> _tierInfo(String tier) {
    const tiers = {
      'ROOKIE': {'emoji': '🌱', 'name': 'Yangi Boshlovchi', 'gradient': LinearGradient(colors: [Color(0xFF2A4A2A), Color(0xFF1A3A1A)])},
      'BRONZE': {'emoji': '🥉', 'name': 'Bronza', 'gradient': LinearGradient(colors: [Color(0xFF6B3A2A), Color(0xFF4A2A1A)])},
      'SILVER': {'emoji': '🥈', 'name': 'Kumush', 'gradient': LinearGradient(colors: [Color(0xFF3A3A5A), Color(0xFF2A2A3A)])},
      'GOLD': {'emoji': '🥇', 'name': 'Oltin', 'gradient': LinearGradient(colors: [Color(0xFF6B5A1A), Color(0xFF4A4A0A)])},
      'PLATINUM': {'emoji': '💿', 'name': 'Platina', 'gradient': LinearGradient(colors: [Color(0xFF1A5A6B), Color(0xFF0A3A4A)])},
      'DIAMOND': {'emoji': '💎', 'name': 'Olmos', 'gradient': LinearGradient(colors: [Color(0xFF0A3A6B), Color(0xFF0A1A4A)])},
      'LEGEND': {'emoji': '👑', 'name': 'Afsonaviy', 'gradient': LinearGradient(colors: [Color(0xFF6B1A5A), Color(0xFF4A0A3A)])},
    };
    return tiers[tier] ?? tiers['ROOKIE']!;
  }
}
