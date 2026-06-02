import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/network/api_client.dart';

class LeaderboardScreen extends ConsumerStatefulWidget {
  const LeaderboardScreen({super.key});

  @override
  ConsumerState<LeaderboardScreen> createState() => _LeaderboardScreenState();
}

class _LeaderboardScreenState extends ConsumerState<LeaderboardScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabCtrl;
  int _periodIdx = 0; // 0=daily, 1=weekly, 2=monthly

  final _periods = ['Daily', 'Weekly', 'Monthly'];
  final _categories = ['Rich', 'Hosts', 'Families', 'Rising'];

  List<Map<String, dynamic>> _entries = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: _categories.length, vsync: this);
    _tabCtrl.addListener(() { if (!_tabCtrl.indexIsChanging) _load(); });
    _load();
  }

  @override
  void dispose() {
    _tabCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final api = ref.read(apiClientProvider);
      final period = _periods[_periodIdx].toLowerCase();
      final category = _categories[_tabCtrl.index].toLowerCase();
      final response = await api.get('/leaderboard', queryParameters: {
        'period': period,
        'type': category,
        'limit': 50,
      });
      if (response.statusCode == 200 && mounted) {
        final data = response.data;
        final items = (data['data'] ?? data['items'] ?? []) as List;
        setState(() {
          _entries = items.map((e) => Map<String, dynamic>.from(e as Map)).toList();
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundDark,
      body: NestedScrollView(
        headerSliverBuilder: (ctx, _) => [
          SliverAppBar(
            expandedHeight: 160,
            pinned: true,
            backgroundColor: AppColors.backgroundDark,
            leading: IconButton(
              icon: const Icon(Icons.arrow_back_ios_new, color: Colors.white),
              onPressed: () => context.pop(),
            ),
            flexibleSpace: FlexibleSpaceBar(
              background: Container(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    colors: [Color(0xFF3D1A6E), Color(0xFF1A0A3E), Color(0xFF0A0A1A)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const SizedBox(height: 40),
                    const Text('🏆', style: TextStyle(fontSize: 40)),
                    const Text('Leaderboard', style: TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 12),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: _periods.asMap().entries.map((e) => GestureDetector(
                        onTap: () {
                          setState(() => _periodIdx = e.key);
                          _load();
                        },
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 200),
                          margin: const EdgeInsets.symmetric(horizontal: 4),
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                          decoration: BoxDecoration(
                            color: _periodIdx == e.key ? AppColors.primary : Colors.white12,
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(e.value, style: TextStyle(
                            color: _periodIdx == e.key ? Colors.white : Colors.white60,
                            fontSize: 12, fontWeight: FontWeight.w600,
                          )),
                        ),
                      )).toList(),
                    ),
                  ],
                ),
              ),
            ),
            bottom: TabBar(
              controller: _tabCtrl,
              indicatorColor: AppColors.primary,
              labelColor: Colors.white,
              unselectedLabelColor: Colors.white54,
              tabs: _categories.map((c) => Tab(text: c)).toList(),
            ),
          ),
        ],
        body: _loading
            ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
            : _entries.isEmpty
                ? const Center(child: Text('No data yet', style: TextStyle(color: Colors.white54)))
                : _buildList(),
      ),
    );
  }

  Widget _buildList() {
    return ListView.builder(
      padding: const EdgeInsets.symmetric(vertical: 8),
      itemCount: _entries.length,
      itemBuilder: (_, i) {
        final entry = _entries[i];
        final rank = i + 1;
        return _buildRankItem(entry, rank)
            .animate(delay: Duration(milliseconds: i * 30))
            .fadeIn(duration: 300.ms);
      },
    );
  }

  Widget _buildRankItem(Map<String, dynamic> entry, int rank) {
    final user = entry['user'] as Map<String, dynamic>? ?? entry;
    final displayName = user['displayName'] as String? ?? 'User';
    final avatar = user['avatar'] as String?;
    final score = entry['score'] as int? ?? entry['value'] as int? ?? 0;

    Widget rankWidget;
    if (rank == 1) {
      rankWidget = const Text('🥇', style: TextStyle(fontSize: 24));
    } else if (rank == 2) {
      rankWidget = const Text('🥈', style: TextStyle(fontSize: 24));
    } else if (rank == 3) {
      rankWidget = const Text('🥉', style: TextStyle(fontSize: 24));
    } else {
      rankWidget = SizedBox(
        width: 28,
        child: Text(
          '#$rank',
          style: const TextStyle(color: Colors.white54, fontWeight: FontWeight.bold),
          textAlign: TextAlign.center,
        ),
      );
    }

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 3),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: rank <= 3 ? AppColors.primary.withOpacity(0.08) : AppColors.cardDark,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: rank <= 3 ? AppColors.primary.withOpacity(0.2) : Colors.transparent,
        ),
      ),
      child: Row(
        children: [
          SizedBox(width: 36, child: rankWidget),
          const SizedBox(width: 8),
          CircleAvatar(
            radius: 20,
            backgroundImage: avatar != null ? NetworkImage(avatar) : null,
            backgroundColor: AppColors.surfaceDark,
            child: avatar == null ? Text(
              displayName.isNotEmpty ? displayName[0].toUpperCase() : 'U',
              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
            ) : null,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(displayName, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
                if (user['uid'] != null)
                  Text('ID: ${user['uid']}', style: const TextStyle(color: Colors.white38, fontSize: 11)),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                _formatScore(score),
                style: const TextStyle(color: AppColors.coin, fontWeight: FontWeight.bold, fontSize: 15),
              ),
              const Text('score', style: TextStyle(color: Colors.white38, fontSize: 10)),
            ],
          ),
        ],
      ),
    );
  }

  String _formatScore(int n) {
    if (n >= 1000000) return '${(n / 1000000).toStringAsFixed(1)}M';
    if (n >= 1000) return '${(n / 1000).toStringAsFixed(1)}K';
    return n.toString();
  }
}
