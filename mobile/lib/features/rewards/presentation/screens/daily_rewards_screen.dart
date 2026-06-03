import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:confetti/confetti.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/providers/auth_provider.dart';
import '../widgets/reward_day_card.dart';

class DailyRewardsScreen extends ConsumerStatefulWidget {
  const DailyRewardsScreen({super.key});

  @override
  ConsumerState<DailyRewardsScreen> createState() =>
      _DailyRewardsScreenState();
}

class _DailyRewardsScreenState extends ConsumerState<DailyRewardsScreen> {
  bool _loading = true;
  String _error = '';
  Map<String, dynamic>? _status;
  List<Map<String, dynamic>> _schedule = [];
  bool _claiming = false;

  late ConfettiController _confettiCtrl;
  Timer? _countdownTimer;
  String _nextRewardCountdown = '';

  @override
  void initState() {
    super.initState();
    _confettiCtrl =
        ConfettiController(duration: const Duration(seconds: 3));
    _load();
    _startCountdownTimer();
  }

  @override
  void dispose() {
    _confettiCtrl.dispose();
    _countdownTimer?.cancel();
    super.dispose();
  }

  void _startCountdownTimer() {
    _updateCountdown();
    _countdownTimer =
        Timer.periodic(const Duration(seconds: 1), (_) => _updateCountdown());
  }

  void _updateCountdown() {
    final now = DateTime.now();
    final midnight =
        DateTime(now.year, now.month, now.day + 1, 0, 0, 0);
    final diff = midnight.difference(now);
    final h = diff.inHours.toString().padLeft(2, '0');
    final m = diff.inMinutes.remainder(60).toString().padLeft(2, '0');
    final s = diff.inSeconds.remainder(60).toString().padLeft(2, '0');
    if (mounted) {
      setState(() => _nextRewardCountdown = '$h:$m:$s');
    }
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = '';
    });
    try {
      final api = ref.read(apiClientProvider);
      final res = await api.get('/rewards/daily/status');
      final data = res.data['data'] ?? res.data;
      if (mounted) {
        setState(() {
          _status = Map<String, dynamic>.from(data as Map);
          final scheduleRaw = data['schedule'] as List? ?? [];
          _schedule = scheduleRaw
              .map((e) => Map<String, dynamic>.from(e as Map))
              .toList();
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _loading = false;
        });
      }
    }
  }

  Future<void> _claimReward() async {
    final claimedToday = _status?['claimedToday'] as bool? ?? false;
    if (claimedToday || _claiming) return;

    setState(() => _claiming = true);
    try {
      final api = ref.read(apiClientProvider);
      final res = await api.post('/rewards/daily/claim');
      final data = res.data['data'] ?? res.data;
      if (mounted) {
        final coins = (data['coins'] as num?)?.toInt() ?? 0;
        final diamonds = (data['diamonds'] as num?)?.toInt() ?? 0;
        final streak = (data['streak'] as num?)?.toInt() ?? 0;

        _confettiCtrl.play();
        setState(() {
          _claiming = false;
          if (_status != null) {
            _status!['claimedToday'] = true;
            _status!['currentStreak'] = streak;
          }
          // Mark today's schedule item as claimed
          for (final item in _schedule) {
            if (item['isToday'] == true) {
              item['claimed'] = true;
              break;
            }
          }
        });

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Text('🎉', style: TextStyle(fontSize: 18)),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Claimed! +$coins coins${diamonds > 0 ? ' +$diamonds diamonds' : ''}',
                    style: const TextStyle(
                      color: Colors.white,
                      fontFamily: 'Poppins',
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
            backgroundColor: AppColors.success,
            duration: const Duration(seconds: 3),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _claiming = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Failed to claim: $e',
              style: const TextStyle(fontFamily: 'Poppins'),
            ),
            backgroundColor: AppColors.error,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundDark,
      body: Stack(
        children: [
          // Background gradient
          Container(
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [Color(0xFF0A0A0F), Color(0xFF150D2A), Color(0xFF0A0A0F)],
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
              ),
            ),
          ),

          // Confetti
          Align(
            alignment: Alignment.topCenter,
            child: ConfettiWidget(
              confettiController: _confettiCtrl,
              blastDirection: pi / 2,
              maxBlastForce: 15,
              minBlastForce: 8,
              emissionFrequency: 0.08,
              numberOfParticles: 25,
              gravity: 0.3,
              colors: const [
                AppColors.primary,
                AppColors.primaryLight,
                AppColors.coin,
                AppColors.diamond,
                Colors.pink,
                Colors.orange,
              ],
            ),
          ),

          SafeArea(
            child: _loading
                ? const Center(
                    child: CircularProgressIndicator(
                        color: AppColors.primary),
                  )
                : _error.isNotEmpty
                    ? _buildError()
                    : _buildContent(),
          ),
        ],
      ),
    );
  }

  Widget _buildError() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, color: AppColors.error, size: 64),
            const SizedBox(height: 16),
            const Text(
              'Failed to load rewards',
              style: TextStyle(
                color: Colors.white,
                fontSize: 18,
                fontWeight: FontWeight.bold,
                fontFamily: 'Poppins',
              ),
            ),
            const SizedBox(height: 8),
            Text(
              _error,
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: AppColors.textSecondary,
                fontSize: 13,
                fontFamily: 'Poppins',
              ),
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: _load,
              style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary),
              child: const Text('Retry',
                  style: TextStyle(fontFamily: 'Poppins')),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildContent() {
    final streak = (_status?['currentStreak'] as num?)?.toInt() ?? 0;
    final claimedToday = _status?['claimedToday'] as bool? ?? false;
    final lastClaimed = _status?['lastClaimedDate'] as String?;
    final isStreakBroken = _isStreakBroken(lastClaimed, streak);

    return RefreshIndicator(
      onRefresh: _load,
      color: AppColors.primary,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            // AppBar
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
              child: Row(
                children: [
                  IconButton(
                    icon: const Icon(Icons.arrow_back_ios_new,
                        color: Colors.white),
                    onPressed: () => context.pop(),
                  ),
                  const Expanded(
                    child: Text(
                      'Daily Rewards',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        fontFamily: 'Poppins',
                      ),
                    ),
                  ),
                  const SizedBox(width: 48),
                ],
              ),
            ),

            // Streak counter
            _buildStreakSection(streak, isStreakBroken),

            const SizedBox(height: 8),

            // Streak broken warning
            if (isStreakBroken)
              _buildStreakBrokenWarning(),

            const SizedBox(height: 20),

            // 7-day grid
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: _buildRewardsGrid(),
            ),

            const SizedBox(height: 28),

            // Claim button
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: _buildClaimButton(claimedToday),
            ),

            const SizedBox(height: 16),

            // Next reward countdown
            if (claimedToday) _buildNextRewardCountdown(),

            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  Widget _buildStreakSection(int streak, bool isStreakBroken) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 16, 24, 0),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: isStreakBroken
                ? [
                    const Color(0xFF2A0A0A),
                    const Color(0xFF3A1010),
                  ]
                : [
                    const Color(0xFF1A0F2E),
                    const Color(0xFF2D1B69),
                  ],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isStreakBroken
                ? AppColors.error.withOpacity(0.4)
                : AppColors.primary.withOpacity(0.4),
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              streak > 0 ? '🔥' : '❄️',
              style: const TextStyle(fontSize: 36),
            ).animate(onPlay: (c) => c.repeat(reverse: true)).scale(
                  begin: const Offset(0.9, 0.9),
                  end: const Offset(1.1, 1.1),
                  duration: 1200.ms,
                  curve: Curves.easeInOut,
                ),
            const SizedBox(width: 16),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  streak > 0
                      ? '$streak Day Streak!'
                      : 'Start Your Streak!',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    fontFamily: 'Poppins',
                  ),
                ),
                Text(
                  streak > 0
                      ? 'Keep it up! Claim every day.'
                      : 'Claim your first daily reward',
                  style: const TextStyle(
                    color: AppColors.textSecondary,
                    fontSize: 13,
                    fontFamily: 'Poppins',
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    ).animate().fadeIn(duration: 400.ms).slideY(begin: -0.2);
  }

  Widget _buildStreakBrokenWarning() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 4),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppColors.error.withOpacity(0.1),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: AppColors.error.withOpacity(0.4),
          ),
        ),
        child: const Row(
          children: [
            Icon(Icons.warning_amber_rounded,
                color: AppColors.warning, size: 20),
            SizedBox(width: 10),
            Expanded(
              child: Text(
                'Your streak was reset. Claim today to start a new streak!',
                style: TextStyle(
                  color: AppColors.warning,
                  fontSize: 13,
                  fontFamily: 'Poppins',
                ),
              ),
            ),
          ],
        ),
      ),
    ).animate().fadeIn(duration: 400.ms).shake();
  }

  Widget _buildRewardsGrid() {
    // Build padded schedule: ensure 7 items
    final schedule = List<Map<String, dynamic>>.from(_schedule);
    while (schedule.length < 7) {
      schedule.add({
        'day': schedule.length + 1,
        'coins': 50 * (schedule.length + 1),
        'diamonds': schedule.length + 1 == 7 ? 10 : 0,
        'claimed': false,
        'isToday': false,
      });
    }

    final currentStreak =
        (_status?['currentStreak'] as num?)?.toInt() ?? 0;

    // Rows: first 6 items in 3-column grid, day 7 spans full width
    final firstSix = schedule.take(6).toList();
    final day7 = schedule[6];

    return Column(
      children: [
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 3,
            crossAxisSpacing: 10,
            mainAxisSpacing: 10,
            childAspectRatio: 0.85,
          ),
          itemCount: firstSix.length,
          itemBuilder: (context, index) {
            final item = firstSix[index];
            final dayNum = (item['day'] as num?)?.toInt() ?? (index + 1);
            final coins = (item['coins'] as num?)?.toInt() ?? 0;
            final diamonds = (item['diamonds'] as num?)?.toInt() ?? 0;
            final claimed = item['claimed'] as bool? ?? false;
            final isToday = item['isToday'] as bool? ?? false;
            final isLocked = !claimed && !isToday && dayNum > currentStreak + 1;

            return RewardDayCard(
              day: dayNum,
              coins: coins,
              diamonds: diamonds,
              isClaimed: claimed,
              isToday: isToday,
              isLocked: isLocked,
            ).animate(delay: Duration(milliseconds: index * 60))
              .fadeIn(duration: 350.ms)
              .scale(begin: const Offset(0.9, 0.9));
          },
        ),
        const SizedBox(height: 10),
        // Day 7 — full width special card
        SizedBox(
          height: 110,
          child: RewardDayCard(
            day: 7,
            coins: (day7['coins'] as num?)?.toInt() ?? 350,
            diamonds: (day7['diamonds'] as num?)?.toInt() ?? 10,
            isClaimed: day7['claimed'] as bool? ?? false,
            isToday: day7['isToday'] as bool? ?? false,
            isLocked: !(day7['claimed'] as bool? ?? false) &&
                !(day7['isToday'] as bool? ?? false) &&
                currentStreak < 6,
          ).animate(delay: 360.ms).fadeIn(duration: 400.ms).scale(
                begin: const Offset(0.9, 0.9),
              ),
        ),
      ],
    );
  }

  Widget _buildClaimButton(bool claimedToday) {
    return SizedBox(
      width: double.infinity,
      child: AnimatedOpacity(
        opacity: claimedToday ? 0.5 : 1.0,
        duration: const Duration(milliseconds: 300),
        child: ElevatedButton(
          onPressed:
              (claimedToday || _claiming) ? null : _claimReward,
          style: ElevatedButton.styleFrom(
            padding: const EdgeInsets.symmetric(vertical: 16),
            shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16)),
            backgroundColor: Colors.transparent,
            disabledBackgroundColor: Colors.transparent,
            shadowColor: Colors.transparent,
          ),
          child: Ink(
            decoration: BoxDecoration(
              gradient: claimedToday
                  ? const LinearGradient(
                      colors: [AppColors.elevatedDark, AppColors.cardDark])
                  : AppColors.primaryGradient,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Container(
              alignment: Alignment.center,
              padding: const EdgeInsets.symmetric(vertical: 16),
              child: _claiming
                  ? const SizedBox(
                      width: 24,
                      height: 24,
                      child: CircularProgressIndicator(
                        color: Colors.white,
                        strokeWidth: 2.5,
                      ),
                    )
                  : Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          claimedToday
                              ? Icons.check_circle
                              : Icons.card_giftcard,
                          color: Colors.white,
                          size: 22,
                        ),
                        const SizedBox(width: 10),
                        Text(
                          claimedToday
                              ? 'Reward Claimed Today!'
                              : "Claim Today's Reward",
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                            fontFamily: 'Poppins',
                          ),
                        ),
                      ],
                    ),
            ),
          ),
        ),
      ),
    ).animate().fadeIn(duration: 400.ms).slideY(begin: 0.3);
  }

  Widget _buildNextRewardCountdown() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 20),
        decoration: BoxDecoration(
          color: AppColors.cardDark,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.dividerDark),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.access_time,
                color: AppColors.textSecondary, size: 18),
            const SizedBox(width: 10),
            const Text(
              'Next reward in ',
              style: TextStyle(
                color: AppColors.textSecondary,
                fontSize: 14,
                fontFamily: 'Poppins',
              ),
            ),
            Text(
              _nextRewardCountdown,
              style: const TextStyle(
                color: AppColors.primary,
                fontSize: 14,
                fontWeight: FontWeight.bold,
                fontFamily: 'Poppins',
              ),
            ),
          ],
        ),
      ),
    ).animate().fadeIn(delay: 200.ms);
  }

  bool _isStreakBroken(String? lastClaimedDate, int streak) {
    if (lastClaimedDate == null || streak == 0) return false;
    try {
      final last = DateTime.parse(lastClaimedDate);
      final now = DateTime.now();
      final diff = now.difference(last).inDays;
      return diff > 1;
    } catch (_) {
      return false;
    }
  }
}
