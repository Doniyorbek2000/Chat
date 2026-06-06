import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/network/api_client.dart';
import '../../../../shared/widgets/user_avatar.dart';

class PkSeasonScreen extends ConsumerStatefulWidget {
  const PkSeasonScreen({super.key});

  @override
  ConsumerState<PkSeasonScreen> createState() => _PkSeasonScreenState();
}

class _PkSeasonScreenState extends ConsumerState<PkSeasonScreen> {
  bool _loading = true;
  String _error = '';
  Map<String, dynamic>? _season;
  Map<String, dynamic>? _myParticipant;
  List<Map<String, dynamic>> _ranking = [];
  Timer? _timer;
  String _countdown = '';
  bool _claiming = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = ''; });
    try {
      final api = ref.read(apiClientProvider);
      final res = await api.get('/pk/season/current');
      final data = res.data['data'] ?? res.data;
      if (mounted) {
        setState(() {
          _season = data['season'] != null ? Map<String, dynamic>.from(data['season'] as Map) : null;
          _myParticipant = data['myParticipant'] != null ? Map<String, dynamic>.from(data['myParticipant'] as Map) : null;
          _ranking = List<Map<String, dynamic>>.from((data['ranking'] as List? ?? []).map((e) => Map<String, dynamic>.from(e as Map)));
          _loading = false;
        });
        _startCountdown();
      }
    } catch (e) {
      if (mounted) setState(() { _error = e.toString(); _loading = false; });
    }
  }

  void _startCountdown() {
    _timer?.cancel();
    _updateCountdown();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) => _updateCountdown());
  }

  void _updateCountdown() {
    final endAt = _season?['endAt'] as String?;
    if (endAt == null) return;
    try {
      final end = DateTime.parse(endAt);
      final diff = end.difference(DateTime.now());
      if (diff.isNegative) {
        if (mounted) setState(() => _countdown = 'Mavsum tugadi');
        return;
      }
      final d = diff.inDays;
      final h = diff.inHours.remainder(24).toString().padLeft(2, '0');
      final m = diff.inMinutes.remainder(60).toString().padLeft(2, '0');
      final s = diff.inSeconds.remainder(60).toString().padLeft(2, '0');
      if (mounted) setState(() => _countdown = '$d kun $h:$m:$s');
    } catch (_) {}
  }

  Future<void> _claimReward() async {
    final seasonId = _season?['id'] as String?;
    if (seasonId == null || _claiming) return;
    setState(() => _claiming = true);
    try {
      final api = ref.read(apiClientProvider);
      await api.post('/pk/season/$seasonId/claim-reward');
      await _load();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Mukofot muvaffaqiyatli olindi!', style: TextStyle(fontFamily: 'Poppins')), backgroundColor: AppColors.success),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString(), style: const TextStyle(fontFamily: 'Poppins')), backgroundColor: AppColors.error),
        );
      }
    } finally {
      if (mounted) setState(() => _claiming = false);
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
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
                  : _error.isNotEmpty
                      ? _buildError()
                      : _season == null
                          ? _buildNoSeason()
                          : _buildContent(),
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
          const Expanded(child: Text('PK Mavsumi', textAlign: TextAlign.center, style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold, fontFamily: 'Poppins'))),
          const SizedBox(width: 48),
        ],
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

  Widget _buildNoSeason() {
    return const Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text('⚔️', style: TextStyle(fontSize: 64)),
          SizedBox(height: 16),
          Text('Faol mavsum topilmadi', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold, fontFamily: 'Poppins')),
          SizedBox(height: 8),
          Text('Tez orada yangi mavsum boshlanadi', style: TextStyle(color: AppColors.textSecondary, fontFamily: 'Poppins')),
        ],
      ),
    );
  }

  Widget _buildContent() {
    return RefreshIndicator(
      onRefresh: _load,
      color: AppColors.primary,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            _buildSeasonCard().animate().fadeIn(duration: 400.ms).slideY(begin: -0.1),
            const SizedBox(height: 16),
            if (_myParticipant != null) _buildMyStats().animate().fadeIn(delay: 200.ms),
            const SizedBox(height: 16),
            _buildRankingSection().animate().fadeIn(delay: 300.ms),
          ],
        ),
      ),
    );
  }

  Widget _buildSeasonCard() {
    final status = _season?['status'] as String? ?? 'UPCOMING';
    final isActive = status == 'ACTIVE';
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(colors: [Color(0xFF2D1B69), Color(0xFF1A0F3A)]),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.primary.withOpacity(0.4)),
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('⚔️', style: TextStyle(fontSize: 36)),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                decoration: BoxDecoration(
                  color: isActive ? AppColors.success.withOpacity(0.2) : AppColors.warning.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: isActive ? AppColors.success : AppColors.warning),
                ),
                child: Text(isActive ? 'Faol' : status, style: TextStyle(color: isActive ? AppColors.success : AppColors.warning, fontFamily: 'Poppins', fontWeight: FontWeight.bold, fontSize: 12)),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(_season?['name'] as String? ?? '', style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold, fontFamily: 'Poppins')),
          if (_season?['description'] != null)
            Padding(
              padding: const EdgeInsets.only(top: 6),
              child: Text(_season!['description'] as String, style: const TextStyle(color: AppColors.textSecondary, fontSize: 13, fontFamily: 'Poppins'), textAlign: TextAlign.center),
            ),
          if (_countdown.isNotEmpty) ...[
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.timer, color: AppColors.textSecondary, size: 16),
                const SizedBox(width: 6),
                Text(_countdown, style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold, fontFamily: 'Poppins')),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildMyStats() {
    final rank = (_myParticipant?['rank'] as num?)?.toInt();
    final wins = (_myParticipant?['wins'] as num?)?.toInt() ?? 0;
    final losses = (_myParticipant?['losses'] as num?)?.toInt() ?? 0;
    final score = (_myParticipant?['totalScore'] as num?)?.toInt() ?? 0;
    final isRewarded = _myParticipant?['isRewarded'] as bool? ?? false;
    final seasonEnded = _season?['status'] == 'ENDED';

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: AppColors.cardDark, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppColors.dividerDark)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Mening Natijalarim', style: TextStyle(color: AppColors.textSecondary, fontSize: 13, fontFamily: 'Poppins')),
          const SizedBox(height: 12),
          Row(
            children: [
              _statChip('${rank ?? '--'}', 'O\'rin', AppColors.primary),
              const SizedBox(width: 8),
              _statChip('$wins', 'G\'alaba', AppColors.success),
              const SizedBox(width: 8),
              _statChip('$losses', 'Mag\'lubiyat', AppColors.error),
              const SizedBox(width: 8),
              _statChip('$score', 'Ball', AppColors.coin),
            ],
          ),
          if (seasonEnded && rank != null && !isRewarded) ...[
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _claiming ? null : _claimReward,
                style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary, padding: const EdgeInsets.symmetric(vertical: 12), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
                child: _claiming ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)) : const Text('Mukofot Olish 🎁', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontFamily: 'Poppins')),
              ),
            ),
          ],
          if (isRewarded)
            const Padding(
              padding: EdgeInsets.only(top: 12),
              child: Text('✅ Mukofot allaqachon olindi', style: TextStyle(color: AppColors.success, fontFamily: 'Poppins')),
            ),
        ],
      ),
    );
  }

  Widget _statChip(String value, String label, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(10), border: Border.all(color: color.withOpacity(0.3))),
        child: Column(
          children: [
            Text(value, style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 16, fontFamily: 'Poppins')),
            Text(label, style: const TextStyle(color: AppColors.textSecondary, fontSize: 10, fontFamily: 'Poppins')),
          ],
        ),
      ),
    );
  }

  Widget _buildRankingSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Reyting', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold, fontFamily: 'Poppins')),
        const SizedBox(height: 12),
        if (_ranking.isEmpty)
          const Center(child: Padding(padding: EdgeInsets.all(32), child: Text('Hali qatnashuvchilar yo\'q', style: TextStyle(color: AppColors.textSecondary, fontFamily: 'Poppins'))))
        else
          ...List.generate(_ranking.length, (i) => _buildRankItem(_ranking[i], i + 1)),
      ],
    );
  }

  Widget _buildRankItem(Map<String, dynamic> p, int rank) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: rank <= 3 ? _rankColor(rank).withOpacity(0.08) : AppColors.cardDark,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: rank <= 3 ? _rankColor(rank).withOpacity(0.3) : AppColors.dividerDark),
      ),
      child: Row(
        children: [
          SizedBox(
            width: 32,
            child: rank <= 3
                ? Text(['🥇', '🥈', '🥉'][rank - 1], textAlign: TextAlign.center, style: const TextStyle(fontSize: 22))
                : Text('$rank', textAlign: TextAlign.center, style: const TextStyle(color: AppColors.textSecondary, fontWeight: FontWeight.bold, fontFamily: 'Poppins')),
          ),
          const SizedBox(width: 10),
          UserAvatar(avatarUrl: p['user']?['avatar'] as String?, size: 40, isOnline: false),
          const SizedBox(width: 10),
          Expanded(child: Text(p['user']?['displayName'] as String? ?? '---', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontFamily: 'Poppins'))),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text('${p['totalScore'] ?? 0} ball', style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold, fontFamily: 'Poppins', fontSize: 13)),
              Text('${p['wins'] ?? 0}W/${p['losses'] ?? 0}L', style: const TextStyle(color: AppColors.textSecondary, fontSize: 11, fontFamily: 'Poppins')),
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
}
