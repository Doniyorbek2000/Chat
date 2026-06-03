import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:intl/intl.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/providers/auth_provider.dart';

class EventDetailScreen extends ConsumerStatefulWidget {
  final String eventId;

  const EventDetailScreen({super.key, required this.eventId});

  @override
  ConsumerState<EventDetailScreen> createState() =>
      _EventDetailScreenState();
}

class _EventDetailScreenState extends ConsumerState<EventDetailScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabCtrl;
  bool _loading = true;
  String _error = '';
  Map<String, dynamic>? _event;
  List<Map<String, dynamic>> _leaderboard = [];
  bool _leaderboardLoading = false;

  bool _joining = false;
  bool _claiming = false;

  Timer? _countdownTimer;
  String _countdown = '';

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: 2, vsync: this);
    _tabCtrl.addListener(() {
      if (_tabCtrl.index == 1 && _leaderboard.isEmpty) {
        _loadLeaderboard();
      }
    });
    _load();
  }

  @override
  void dispose() {
    _tabCtrl.dispose();
    _countdownTimer?.cancel();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = '';
    });
    try {
      final api = ref.read(apiClientProvider);
      final res = await api.get('/events/${widget.eventId}');
      final data = res.data['data'] ?? res.data;
      if (mounted) {
        setState(() {
          _event = Map<String, dynamic>.from(data as Map);
          _loading = false;
        });
        _startCountdown();
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

  Future<void> _loadLeaderboard() async {
    setState(() => _leaderboardLoading = true);
    try {
      final api = ref.read(apiClientProvider);
      final res = await api.get('/events/${widget.eventId}/leaderboard');
      final data = res.data['data'] ?? res.data;
      final list = data is List
          ? data
          : (data['entries'] ?? data['items'] ?? []) as List;
      if (mounted) {
        setState(() {
          _leaderboard =
              list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
          _leaderboardLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _leaderboardLoading = false);
    }
  }

  void _startCountdown() {
    _updateCountdown();
    _countdownTimer =
        Timer.periodic(const Duration(seconds: 1), (_) => _updateCountdown());
  }

  void _updateCountdown() {
    if (_event == null) return;
    final status = _event!['status'] as String? ?? '';
    String targetStr;
    if (status == 'active') {
      targetStr = _event!['endTime'] as String? ?? '';
    } else {
      targetStr = _event!['startTime'] as String? ?? '';
    }
    if (targetStr.isEmpty) return;

    try {
      final target = DateTime.parse(targetStr);
      final diff = target.difference(DateTime.now());
      if (diff.isNegative) {
        if (mounted) setState(() => _countdown = 'Ended');
        _countdownTimer?.cancel();
        return;
      }
      final d = diff.inDays;
      final h = diff.inHours.remainder(24);
      final m = diff.inMinutes.remainder(60).toString().padLeft(2, '0');
      final s = diff.inSeconds.remainder(60).toString().padLeft(2, '0');
      if (mounted) {
        setState(() {
          _countdown = d > 0
              ? '${d}d ${h}h ${m}m ${s}s'
              : h > 0
                  ? '${h}h ${m}m ${s}s'
                  : '${m}m ${s}s';
        });
      }
    } catch (_) {}
  }

  Future<void> _joinEvent() async {
    setState(() => _joining = true);
    try {
      final api = ref.read(apiClientProvider);
      await api.post('/events/${widget.eventId}/join');
      if (mounted) {
        setState(() {
          _joining = false;
          if (_event != null) _event!['isJoined'] = true;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Successfully joined the event!',
                style: TextStyle(fontFamily: 'Poppins')),
            backgroundColor: AppColors.success,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _joining = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to join: $e',
                style: const TextStyle(fontFamily: 'Poppins')),
            backgroundColor: AppColors.error,
          ),
        );
      }
    }
  }

  Future<void> _claimReward() async {
    setState(() => _claiming = true);
    try {
      final api = ref.read(apiClientProvider);
      final res = await api.post('/events/${widget.eventId}/claim-reward');
      final data = res.data['data'] ?? res.data;
      if (mounted) {
        setState(() {
          _claiming = false;
          if (_event != null) _event!['rewardClaimed'] = true;
        });
        final coins = (data['coins'] as num?)?.toInt() ?? 0;
        final diamonds = (data['diamonds'] as num?)?.toInt() ?? 0;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.celebration, color: Colors.white, size: 18),
                const SizedBox(width: 8),
                Text(
                  'Reward claimed! +$coins coins +$diamonds diamonds',
                  style: const TextStyle(fontFamily: 'Poppins'),
                ),
              ],
            ),
            backgroundColor: AppColors.success,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _claiming = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to claim: $e',
                style: const TextStyle(fontFamily: 'Poppins')),
            backgroundColor: AppColors.error,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return Scaffold(
        backgroundColor: AppColors.backgroundDark,
        appBar: AppBar(
          backgroundColor: AppColors.backgroundDark,
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_ios_new, color: Colors.white),
            onPressed: () => context.pop(),
          ),
        ),
        body: const Center(
          child: CircularProgressIndicator(color: AppColors.primary),
        ),
      );
    }

    if (_error.isNotEmpty) {
      return Scaffold(
        backgroundColor: AppColors.backgroundDark,
        appBar: AppBar(
          backgroundColor: AppColors.backgroundDark,
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_ios_new, color: Colors.white),
            onPressed: () => context.pop(),
          ),
        ),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.error_outline,
                    color: AppColors.error, size: 64),
                const SizedBox(height: 16),
                const Text(
                  'Failed to load event',
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
        ),
      );
    }

    final event = _event!;
    final name = event['name'] as String? ?? 'Event';
    final description = event['description'] as String? ?? '';
    final coverImage = event['coverImage'] as String?;
    final status = event['status'] as String? ?? 'active';
    final isJoined = event['isJoined'] as bool? ?? false;
    final rewardClaimed = event['rewardClaimed'] as bool? ?? false;
    final isEligibleForReward = event['isEligibleForReward'] as bool? ?? false;
    final requiresVip = event['requiresVip'] as bool? ?? false;
    final progressCurrent =
        (event['progressCurrent'] as num?)?.toDouble() ?? 0;
    final progressTarget =
        (event['progressTarget'] as num?)?.toDouble() ?? 0;
    final hasProgress = progressTarget > 0;
    final startTime = event['startTime'] as String?;
    final endTime = event['endTime'] as String?;
    final rewards = event['rewards'] as List? ?? [];

    return Scaffold(
      backgroundColor: AppColors.backgroundDark,
      body: NestedScrollView(
        headerSliverBuilder: (context, innerBoxIsScrolled) {
          return [
            SliverAppBar(
              backgroundColor: AppColors.backgroundDark,
              expandedHeight: 260,
              pinned: true,
              leading: IconButton(
                icon: const Icon(Icons.arrow_back_ios_new,
                    color: Colors.white),
                onPressed: () => context.pop(),
              ),
              flexibleSpace: FlexibleSpaceBar(
                background: Stack(
                  fit: StackFit.expand,
                  children: [
                    if (coverImage != null && coverImage.isNotEmpty)
                      CachedNetworkImage(
                        imageUrl: coverImage,
                        fit: BoxFit.cover,
                        placeholder: (_, __) => Container(
                            color: AppColors.cardDark),
                        errorWidget: (_, __, ___) =>
                            _buildPlaceholderBg(),
                      )
                    else
                      _buildPlaceholderBg(),
                    Container(
                      decoration: const BoxDecoration(
                        gradient: LinearGradient(
                          colors: [
                            Colors.transparent,
                            AppColors.backgroundDark,
                          ],
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          stops: [0.4, 1.0],
                        ),
                      ),
                    ),
                    if (requiresVip)
                      Positioned(
                        top: 60,
                        right: 16,
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            gradient: AppColors.goldGradient,
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.star,
                                  color: Colors.black, size: 14),
                              SizedBox(width: 4),
                              Text(
                                'VIP Only',
                                style: TextStyle(
                                  color: Colors.black,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 12,
                                  fontFamily: 'Poppins',
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    Positioned(
                      left: 16,
                      right: 16,
                      bottom: 16,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            name,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 22,
                              fontWeight: FontWeight.bold,
                              fontFamily: 'Poppins',
                            ),
                          ),
                          if (_countdown.isNotEmpty) ...[
                            const SizedBox(height: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 12, vertical: 6),
                              decoration: BoxDecoration(
                                color: status == 'active'
                                    ? AppColors.error.withOpacity(0.9)
                                    : AppColors.primary.withOpacity(0.9),
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Icon(Icons.timer,
                                      color: Colors.white, size: 14),
                                  const SizedBox(width: 6),
                                  Text(
                                    status == 'active'
                                        ? 'Ends in $_countdown'
                                        : 'Starts in $_countdown',
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 12,
                                      fontFamily: 'Poppins',
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              bottom: TabBar(
                controller: _tabCtrl,
                indicatorColor: AppColors.primary,
                indicatorWeight: 3,
                labelColor: Colors.white,
                unselectedLabelColor: AppColors.textSecondary,
                labelStyle: const TextStyle(
                  fontFamily: 'Poppins',
                  fontWeight: FontWeight.w600,
                ),
                tabs: const [
                  Tab(text: 'Details'),
                  Tab(text: 'Leaderboard'),
                ],
              ),
            ),
          ];
        },
        body: TabBarView(
          controller: _tabCtrl,
          children: [
            // Details tab
            RefreshIndicator(
              onRefresh: _load,
              color: AppColors.primary,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Time info
                    _buildTimeInfo(startTime, endTime),
                    const SizedBox(height: 20),

                    // Description
                    if (description.isNotEmpty) ...[
                      const Text(
                        'About this Event',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          fontFamily: 'Poppins',
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        description,
                        style: const TextStyle(
                          color: AppColors.textSecondary,
                          fontSize: 14,
                          fontFamily: 'Poppins',
                          height: 1.6,
                        ),
                      ),
                      const SizedBox(height: 20),
                    ],

                    // Progress bar
                    if (hasProgress) ...[
                      _buildProgressSection(
                          progressCurrent, progressTarget),
                      const SizedBox(height: 20),
                    ],

                    // Rewards
                    if (rewards.isNotEmpty) ...[
                      const Text(
                        'Rewards',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          fontFamily: 'Poppins',
                        ),
                      ),
                      const SizedBox(height: 12),
                      ...rewards.map((r) => _buildRewardItem(
                          Map<String, dynamic>.from(r as Map))),
                      const SizedBox(height: 20),
                    ],

                    // Action buttons
                    _buildActionButtons(
                      isJoined: isJoined,
                      rewardClaimed: rewardClaimed,
                      isEligibleForReward: isEligibleForReward,
                      status: status,
                    ),
                    const SizedBox(height: 40),
                  ],
                ),
              ),
            ),

            // Leaderboard tab
            _leaderboardLoading
                ? const Center(
                    child: CircularProgressIndicator(
                        color: AppColors.primary),
                  )
                : _leaderboard.isEmpty
                    ? _buildEmptyLeaderboard()
                    : ListView.builder(
                        padding: const EdgeInsets.symmetric(
                            vertical: 12, horizontal: 16),
                        itemCount: _leaderboard.length,
                        itemBuilder: (context, index) {
                          return _buildLeaderboardEntry(
                              _leaderboard[index], index + 1);
                        },
                      ),
          ],
        ),
      ),
    );
  }

  Widget _buildPlaceholderBg() {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [Color(0xFF1A1A40), Color(0xFF2D1B69)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: const Center(
        child: Icon(Icons.event, color: Colors.white24, size: 80),
      ),
    );
  }

  Widget _buildTimeInfo(String? startTime, String? endTime) {
    String formatTime(String? t) {
      if (t == null) return 'TBD';
      try {
        final dt = DateTime.parse(t).toLocal();
        return DateFormat('MMM dd, yyyy • HH:mm').format(dt);
      } catch (_) {
        return t;
      }
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.cardDark,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.dividerDark),
      ),
      child: Column(
        children: [
          Row(
            children: [
              const Icon(Icons.play_circle_outline,
                  color: AppColors.success, size: 20),
              const SizedBox(width: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Starts',
                    style: TextStyle(
                      color: AppColors.textTertiary,
                      fontSize: 11,
                      fontFamily: 'Poppins',
                    ),
                  ),
                  Text(
                    formatTime(startTime),
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 13,
                      fontFamily: 'Poppins',
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ],
          ),
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 10),
            child: Container(
              height: 1,
              color: AppColors.dividerDark,
            ),
          ),
          Row(
            children: [
              const Icon(Icons.stop_circle_outlined,
                  color: AppColors.error, size: 20),
              const SizedBox(width: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Ends',
                    style: TextStyle(
                      color: AppColors.textTertiary,
                      fontSize: 11,
                      fontFamily: 'Poppins',
                    ),
                  ),
                  Text(
                    formatTime(endTime),
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 13,
                      fontFamily: 'Poppins',
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    ).animate().fadeIn(duration: 300.ms);
  }

  Widget _buildProgressSection(double current, double target) {
    final progress = (current / target).clamp(0.0, 1.0);
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.cardDark,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.dividerDark),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Event Progress',
                style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w600,
                  fontSize: 14,
                  fontFamily: 'Poppins',
                ),
              ),
              Text(
                '${current.toInt()} / ${target.toInt()}',
                style: const TextStyle(
                  color: AppColors.primary,
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                  fontFamily: 'Poppins',
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: LinearProgressIndicator(
              value: progress,
              minHeight: 10,
              backgroundColor: AppColors.elevatedDark,
              valueColor: const AlwaysStoppedAnimation<Color>(
                AppColors.primary,
              ),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            '${(progress * 100).toStringAsFixed(1)}% complete',
            style: const TextStyle(
              color: AppColors.textSecondary,
              fontSize: 12,
              fontFamily: 'Poppins',
            ),
          ),
        ],
      ),
    ).animate().fadeIn(duration: 300.ms);
  }

  Widget _buildRewardItem(Map<String, dynamic> reward) {
    final type = reward['type'] as String? ?? 'coins';
    final amount = (reward['amount'] as num?)?.toInt() ?? 0;
    final rank = reward['rank'] as String? ?? '';

    IconData icon;
    Color color;
    String label;
    if (type == 'coins') {
      icon = Icons.monetization_on;
      color = AppColors.coin;
      label = '$amount Coins';
    } else if (type == 'diamonds') {
      icon = Icons.diamond;
      color = AppColors.diamond;
      label = '$amount Diamonds';
    } else if (type == 'vip') {
      icon = Icons.star;
      color = AppColors.vip3;
      label = '$amount VIP Days';
    } else {
      icon = Icons.card_giftcard;
      color = AppColors.primary;
      label = '$amount ${type.toUpperCase()}';
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: AppColors.cardDark,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: color.withOpacity(0.15),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              label,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 15,
                fontWeight: FontWeight.w600,
                fontFamily: 'Poppins',
              ),
            ),
          ),
          if (rank.isNotEmpty)
            Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: AppColors.elevatedDark,
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                rank,
                style: const TextStyle(
                  color: AppColors.textSecondary,
                  fontSize: 11,
                  fontFamily: 'Poppins',
                ),
              ),
            ),
        ],
      ),
    ).animate().fadeIn(duration: 300.ms).slideX(begin: 0.1);
  }

  Widget _buildActionButtons({
    required bool isJoined,
    required bool rewardClaimed,
    required bool isEligibleForReward,
    required String status,
  }) {
    final showJoin = status == 'active' && !isJoined;
    final showClaim = status == 'completed' &&
        isJoined &&
        isEligibleForReward &&
        !rewardClaimed;

    if (!showJoin && !showClaim) return const SizedBox.shrink();

    return Column(
      children: [
        if (showJoin)
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _joining ? null : _joinEvent,
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14)),
                backgroundColor: Colors.transparent,
                shadowColor: Colors.transparent,
              ),
              child: Ink(
                decoration: BoxDecoration(
                  gradient: AppColors.primaryGradient,
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Container(
                  alignment: Alignment.center,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  child: _joining
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            color: Colors.white,
                            strokeWidth: 2,
                          ),
                        )
                      : const Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.play_arrow, color: Colors.white),
                            SizedBox(width: 8),
                            Text(
                              'Join Event',
                              style: TextStyle(
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
          ).animate().fadeIn(duration: 300.ms),
        if (showClaim)
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _claiming ? null : _claimReward,
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14)),
                backgroundColor: Colors.transparent,
                shadowColor: Colors.transparent,
              ),
              child: Ink(
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [AppColors.coin, Color(0xFFB45309)],
                  ),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Container(
                  alignment: Alignment.center,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  child: _claiming
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            color: Colors.white,
                            strokeWidth: 2,
                          ),
                        )
                      : const Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.celebration, color: Colors.white),
                            SizedBox(width: 8),
                            Text(
                              'Claim Reward',
                              style: TextStyle(
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
          ).animate().fadeIn(duration: 300.ms),
      ],
    );
  }

  Widget _buildLeaderboardEntry(
      Map<String, dynamic> entry, int rank) {
    final user = entry['user'] as Map<String, dynamic>? ?? {};
    final username = user['username'] as String? ?? 'User';
    final avatar = user['avatar'] as String?;
    final score = (entry['score'] as num?)?.toInt() ?? 0;

    Color rankColor;
    IconData? rankIcon;
    if (rank == 1) {
      rankColor = AppColors.coin;
      rankIcon = Icons.emoji_events;
    } else if (rank == 2) {
      rankColor = const Color(0xFFC0C0C0);
      rankIcon = Icons.emoji_events;
    } else if (rank == 3) {
      rankColor = const Color(0xFFCD7F32);
      rankIcon = Icons.emoji_events;
    } else {
      rankColor = AppColors.textTertiary;
      rankIcon = null;
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: rank <= 3
            ? rankColor.withOpacity(0.08)
            : AppColors.cardDark,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: rank <= 3
              ? rankColor.withOpacity(0.3)
              : AppColors.dividerDark,
        ),
      ),
      child: Row(
        children: [
          SizedBox(
            width: 36,
            child: rankIcon != null
                ? Icon(rankIcon, color: rankColor, size: 22)
                : Text(
                    '#$rank',
                    style: TextStyle(
                      color: rankColor,
                      fontWeight: FontWeight.bold,
                      fontSize: 14,
                      fontFamily: 'Poppins',
                    ),
                  ),
          ),
          CircleAvatar(
            radius: 20,
            backgroundColor: AppColors.elevatedDark,
            backgroundImage: avatar != null && avatar.isNotEmpty
                ? CachedNetworkImageProvider(avatar)
                : null,
            child: avatar == null || avatar.isEmpty
                ? Text(
                    username.isNotEmpty ? username[0].toUpperCase() : 'U',
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontFamily: 'Poppins',
                    ),
                  )
                : null,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              username,
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w600,
                fontFamily: 'Poppins',
              ),
            ),
          ),
          Text(
            _formatScore(score),
            style: TextStyle(
              color: rankColor,
              fontWeight: FontWeight.bold,
              fontSize: 15,
              fontFamily: 'Poppins',
            ),
          ),
        ],
      ),
    ).animate().fadeIn(duration: 300.ms).slideX(begin: 0.1);
  }

  Widget _buildEmptyLeaderboard() {
    return const Center(
      child: Padding(
        padding: EdgeInsets.all(40),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.leaderboard, color: AppColors.textTertiary, size: 64),
            SizedBox(height: 16),
            Text(
              'No leaderboard data yet',
              style: TextStyle(
                color: AppColors.textSecondary,
                fontSize: 16,
                fontFamily: 'Poppins',
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _formatScore(int n) {
    if (n >= 1000000) return '${(n / 1000000).toStringAsFixed(1)}M';
    if (n >= 1000) return '${(n / 1000).toStringAsFixed(1)}K';
    return '$n';
  }
}
