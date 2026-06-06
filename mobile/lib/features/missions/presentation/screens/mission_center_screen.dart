import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/network/api_client.dart';

class MissionCenterScreen extends ConsumerStatefulWidget {
  const MissionCenterScreen({super.key});

  @override
  ConsumerState<MissionCenterScreen> createState() => _MissionCenterScreenState();
}

class _MissionCenterScreenState extends ConsumerState<MissionCenterScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tab;
  bool _loading = true;
  String _error = '';
  List<Map<String, dynamic>> _daily = [];
  List<Map<String, dynamic>> _weekly = [];
  final Set<String> _claiming = {};

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
      final res = await api.get('/missions/me');
      final data = res.data['data'] ?? res.data;
      if (mounted) {
        setState(() {
          _daily = List<Map<String, dynamic>>.from((data['daily'] as List? ?? []).map((e) => Map<String, dynamic>.from(e as Map)));
          _weekly = List<Map<String, dynamic>>.from((data['weekly'] as List? ?? []).map((e) => Map<String, dynamic>.from(e as Map)));
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() { _error = e.toString(); _loading = false; });
    }
  }

  Future<void> _claim(String missionId, List<Map<String, dynamic>> list) async {
    if (_claiming.contains(missionId)) return;
    setState(() => _claiming.add(missionId));
    try {
      final api = ref.read(apiClientProvider);
      await api.post('/missions/$missionId/claim');
      await _load();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Mukofot olindi!', style: TextStyle(fontFamily: 'Poppins')), backgroundColor: AppColors.success),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString(), style: const TextStyle(fontFamily: 'Poppins')), backgroundColor: AppColors.error),
        );
      }
    } finally {
      if (mounted) setState(() => _claiming.remove(missionId));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundDark,
      body: Column(
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
                          _buildMissionList(_daily),
                          _buildMissionList(_weekly),
                        ],
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [Color(0xFF150D2A), Color(0xFF0A0A0F)],
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
        ),
      ),
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
          child: Row(
            children: [
              IconButton(
                icon: const Icon(Icons.arrow_back_ios_new, color: Colors.white),
                onPressed: () => context.pop(),
              ),
              const Expanded(
                child: Text(
                  'Vazifalar Markazi',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold, fontFamily: 'Poppins'),
                ),
              ),
              const SizedBox(width: 48),
            ],
          ),
        ),
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
        tabs: const [Tab(text: 'Kunlik'), Tab(text: 'Haftalik')],
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

  Widget _buildMissionList(List<Map<String, dynamic>> missions) {
    if (missions.isEmpty) {
      return const Center(child: Text('Vazifalar topilmadi', style: TextStyle(color: AppColors.textSecondary, fontFamily: 'Poppins')));
    }
    return RefreshIndicator(
      onRefresh: _load,
      color: AppColors.primary,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: missions.length,
        itemBuilder: (context, i) => _buildMissionCard(missions[i], i).animate(delay: Duration(milliseconds: i * 60)).fadeIn(duration: 350.ms).slideX(begin: -0.1),
      ),
    );
  }

  Widget _buildMissionCard(Map<String, dynamic> m, int index) {
    final progress = (m['progress'] as num?)?.toInt() ?? 0;
    final target = (m['targetCount'] as num?)?.toInt() ?? 1;
    final isClaimed = m['isClaimed'] as bool? ?? false;
    final rewardType = m['rewardType'] as String? ?? 'COINS';
    final rewardAmount = m['rewardAmount'] as String? ?? '0';
    final isComplete = progress >= target;
    final missionId = m['id'] as String? ?? '';
    final isClaiming = _claiming.contains(missionId);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.cardDark,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isClaimed ? AppColors.success.withOpacity(0.3) : isComplete ? AppColors.primary.withOpacity(0.4) : AppColors.dividerDark,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              _missionIcon(m['actionType'] as String? ?? ''),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(m['title'] as String? ?? '', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14, fontFamily: 'Poppins')),
                    if (m['description'] != null)
                      Text(m['description'] as String, style: const TextStyle(color: AppColors.textSecondary, fontSize: 12, fontFamily: 'Poppins')),
                  ],
                ),
              ),
              _buildRewardBadge(rewardType, rewardAmount),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: target > 0 ? (progress / target).clamp(0.0, 1.0) : 0,
                    backgroundColor: AppColors.dividerDark,
                    valueColor: AlwaysStoppedAnimation<Color>(isClaimed ? AppColors.success : AppColors.primary),
                    minHeight: 6,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Text('$progress/$target', style: const TextStyle(color: AppColors.textSecondary, fontSize: 12, fontFamily: 'Poppins')),
            ],
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: isClaimed || !isComplete || isClaiming ? null : () => _claim(missionId, _tab.index == 0 ? _daily : _weekly),
              style: ElevatedButton.styleFrom(
                backgroundColor: isClaimed ? AppColors.dividerDark : isComplete ? AppColors.primary : AppColors.elevatedDark,
                disabledBackgroundColor: isClaimed ? AppColors.dividerDark : AppColors.elevatedDark,
                padding: const EdgeInsets.symmetric(vertical: 10),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              child: isClaiming
                  ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : Text(
                      isClaimed ? 'Olindi ✓' : isComplete ? 'Mukofot Olish' : 'Bajarilmoqda...',
                      style: TextStyle(color: isClaimed ? AppColors.textSecondary : Colors.white, fontWeight: FontWeight.bold, fontFamily: 'Poppins'),
                    ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _missionIcon(String actionType) {
    const icons = {
      'LOGIN': ('🔑', AppColors.primary),
      'SEND_GIFT': ('🎁', AppColors.secondary),
      'JOIN_ROOM': ('🎙️', AppColors.accent),
      'HOST_ROOM': ('📡', AppColors.warning),
      'LIKE_POST': ('❤️', AppColors.error),
      'ADD_FRIEND': ('👥', AppColors.success),
      'STREAK_3': ('🔥', AppColors.warning),
      'SEND_MESSAGE': ('💬', AppColors.info),
      'COMMENT_POST': ('💬', AppColors.info),
    };
    final icon = icons[actionType] ?? ('✅', AppColors.primary);
    return Container(
      width: 40,
      height: 40,
      decoration: BoxDecoration(
        color: (icon.$2 as Color).withOpacity(0.15),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Center(child: Text(icon.$1 as String, style: const TextStyle(fontSize: 20))),
    );
  }

  Widget _buildRewardBadge(String rewardType, String amount) {
    final isCoins = rewardType == 'COINS';
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: isCoins ? AppColors.coin.withOpacity(0.15) : AppColors.diamond.withOpacity(0.15),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: isCoins ? AppColors.coin.withOpacity(0.4) : AppColors.diamond.withOpacity(0.4)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(isCoins ? '🪙' : '💎', style: const TextStyle(fontSize: 14)),
          const SizedBox(width: 4),
          Text(amount, style: TextStyle(color: isCoins ? AppColors.coin : AppColors.diamond, fontWeight: FontWeight.bold, fontSize: 13, fontFamily: 'Poppins')),
        ],
      ),
    );
  }
}
