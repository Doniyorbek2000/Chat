import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/network/api_client.dart';

const _gradeColors = {
  'SS': Color(0xFFFF4444),
  'S': Color(0xFFFF8C00),
  'A': Color(0xFFFFD700),
  'B': Color(0xFF00CED1),
  'C': Color(0xFF808080),
};

class MedalModel {
  final String id;
  final String name;
  final String description;
  final String? imageUrl;
  final String category;
  final String grade;
  final int prestigeValue;
  final bool isActive;
  final bool isPaid;
  final int priceCoins;

  const MedalModel({
    required this.id,
    required this.name,
    required this.description,
    this.imageUrl,
    required this.category,
    required this.grade,
    required this.prestigeValue,
    required this.isActive,
    required this.isPaid,
    required this.priceCoins,
  });

  factory MedalModel.fromJson(Map<String, dynamic> json) => MedalModel(
        id: json['id'] as String,
        name: json['name'] as String,
        description: json['description'] as String? ?? '',
        imageUrl: json['imageUrl'] as String?,
        category: json['category'] as String? ?? 'ACHIEVEMENT',
        grade: json['grade'] as String? ?? 'C',
        prestigeValue: json['prestigeValue'] as int? ?? 0,
        isActive: json['isActive'] as bool? ?? true,
        isPaid: json['isPaid'] as bool? ?? false,
        priceCoins: json['priceCoins'] as int? ?? 0,
      );
}

class UserMedalModel {
  final String id;
  final String medalId;
  final int? equippedSlot;
  final DateTime unlockedAt;
  final MedalModel? medal;

  const UserMedalModel({
    required this.id,
    required this.medalId,
    this.equippedSlot,
    required this.unlockedAt,
    this.medal,
  });

  factory UserMedalModel.fromJson(Map<String, dynamic> json) => UserMedalModel(
        id: json['id'] as String,
        medalId: json['medalId'] as String,
        equippedSlot: json['equippedSlot'] as int?,
        unlockedAt: DateTime.parse(json['unlockedAt'] as String),
        medal: json['medal'] != null
            ? MedalModel.fromJson(json['medal'] as Map<String, dynamic>)
            : null,
      );

  bool get isEquipped => equippedSlot != null;
}

class PrestigeModel {
  final int totalPoints;
  final int level;

  const PrestigeModel({required this.totalPoints, required this.level});

  factory PrestigeModel.fromJson(Map<String, dynamic> json) => PrestigeModel(
        totalPoints: json['totalPoints'] as int? ?? 0,
        level: json['level'] as int? ?? 0,
      );
}

class PrestigeRule {
  final int level;
  final int requiredPoints;
  final int rewardCoins;

  const PrestigeRule({
    required this.level,
    required this.requiredPoints,
    required this.rewardCoins,
  });

  factory PrestigeRule.fromJson(Map<String, dynamic> json) => PrestigeRule(
        level: json['level'] as int? ?? 0,
        requiredPoints: json['requiredPoints'] as int? ?? 0,
        rewardCoins: json['rewardCoins'] as int? ?? 0,
      );
}

class LeaderboardEntry {
  final String userId;
  final int totalPoints;
  final int level;
  final String? displayName;
  final String? avatar;

  const LeaderboardEntry({
    required this.userId,
    required this.totalPoints,
    required this.level,
    this.displayName,
    this.avatar,
  });

  factory LeaderboardEntry.fromJson(Map<String, dynamic> json) {
    final user = json['user'] as Map<String, dynamic>?;
    return LeaderboardEntry(
      userId: json['userId'] as String,
      totalPoints: json['totalPoints'] as int? ?? 0,
      level: json['level'] as int? ?? 0,
      displayName: user?['displayName'] as String?,
      avatar: user?['avatar'] as String?,
    );
  }
}

class MedalScreen extends ConsumerStatefulWidget {
  const MedalScreen({super.key});

  @override
  ConsumerState<MedalScreen> createState() => _MedalScreenState();
}

class _MedalScreenState extends ConsumerState<MedalScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;

  List<MedalModel> _allMedals = [];
  List<UserMedalModel> _myMedals = [];
  PrestigeModel? _myPrestige;
  List<PrestigeRule> _prestigeRules = [];
  List<LeaderboardEntry> _leaderboard = [];

  bool _loading = true;
  bool _actionLoading = false;
  String _selectedCategory = 'ACHIEVEMENT';

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _load();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final api = ref.read(apiClientProvider);
      final results = await Future.wait([
        api.get('/medals'),
        api.get('/medals/me'),
        api.get('/medals/prestige-rules'),
        api.get('/medals/leaderboard'),
      ]);

      if (mounted) {
        final rawMedals = (results[0].data['data'] ?? results[0].data) as List;
        final meRes = results[1].data['data'] ?? results[1].data;
        final rawRules = (results[2].data['data'] ?? results[2].data) as List;
        final rawLeader = (results[3].data['data'] ?? results[3].data) as List;

        setState(() {
          _allMedals = rawMedals
              .map((e) => MedalModel.fromJson(e as Map<String, dynamic>))
              .toList();

          if (meRes is Map) {
            final rawMy = (meRes['medals'] as List?) ?? [];
            _myMedals = rawMy
                .map((e) =>
                    UserMedalModel.fromJson(e as Map<String, dynamic>))
                .toList();
            if (meRes['prestige'] != null) {
              _myPrestige = PrestigeModel.fromJson(
                  meRes['prestige'] as Map<String, dynamic>);
            }
          }

          _prestigeRules = rawRules
              .map((e) => PrestigeRule.fromJson(e as Map<String, dynamic>))
              .toList();

          _leaderboard = rawLeader
              .map((e) =>
                  LeaderboardEntry.fromJson(e as Map<String, dynamic>))
              .toList();
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content: const Text('Amaliyot bajarilmadi'), backgroundColor: Colors.red),
        );
      }
    }
    if (mounted) setState(() => _loading = false);
  }

  bool _isOwned(String medalId) =>
      _myMedals.any((m) => m.medalId == medalId);

  UserMedalModel? _getUserMedal(String medalId) {
    try {
      return _myMedals.firstWhere((m) => m.medalId == medalId);
    } catch (_) {
      return null;
    }
  }

  Future<void> _unlock(MedalModel medal) async {
    setState(() => _actionLoading = true);
    try {
      final api = ref.read(apiClientProvider);
      await api.post('/medals/${medal.id}/unlock',
          data: {'medalId': medal.id});
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('${medal.name} qulfdan chiqarildi!'),
            backgroundColor: AppColors.success,
          ),
        );
        await _load();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content: const Text('Amaliyot bajarilmadi'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _actionLoading = false);
    }
  }

  Future<void> _equip(MedalModel medal) async {
    setState(() => _actionLoading = true);
    try {
      final api = ref.read(apiClientProvider);
      await api.post('/medals/${medal.id}/equip',
          data: {'medalId': medal.id, 'slot': 0});
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('${medal.name} jihozlandi!'),
            backgroundColor: AppColors.success,
          ),
        );
        await _load();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content: const Text('Amaliyot bajarilmadi'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _actionLoading = false);
    }
  }

  Future<void> _unequip(MedalModel medal) async {
    setState(() => _actionLoading = true);
    try {
      final api = ref.read(apiClientProvider);
      await api.post('/medals/${medal.id}/unequip');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Medal yechildi!'),
            backgroundColor: AppColors.success,
          ),
        );
        await _load();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content: const Text('Amaliyot bajarilmadi'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _actionLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundDark,
      body: NestedScrollView(
        headerSliverBuilder: (ctx, inner) => [
          SliverAppBar(
            expandedHeight: 140,
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
                    colors: [
                      Color(0xFF2D1060),
                      Color(0xFF0D0D3A),
                      Color(0xFF0A0A0F),
                    ],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                ),
                child: const Padding(
                  padding: EdgeInsets.fromLTRB(16, 60, 16, 12),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.end,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Medallar',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                          fontFamily: 'Poppins',
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            bottom: TabBar(
              controller: _tabController,
              labelColor: Colors.white,
              unselectedLabelColor: Colors.white38,
              indicatorColor: AppColors.primary,
              indicatorWeight: 2,
              tabs: const [
                Tab(text: 'Medal'),
                Tab(text: 'Liderlar'),
                Tab(text: 'Menim'),
              ],
            ),
          ),
        ],
        body: _loading
            ? const Center(
                child: CircularProgressIndicator(color: AppColors.primary),
              )
            : TabBarView(
                controller: _tabController,
                children: [
                  _buildMedalTab(),
                  _buildLeaderboardTab(),
                  _buildMyTab(),
                ],
              ),
      ),
    );
  }

  Widget _buildMedalTab() {
    final categories = ['ACHIEVEMENT', 'EVENT', 'GIFT'];
    final categoryLabels = {
      'ACHIEVEMENT': 'Yutuq',
      'EVENT': 'Tadbir',
      'GIFT': 'Sovg\'a',
    };
    final filtered =
        _allMedals.where((m) => m.category == _selectedCategory).toList();

    return Column(
      children: [
        SizedBox(
          height: 52,
          child: ListView.separated(
            padding:
                const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            scrollDirection: Axis.horizontal,
            itemCount: categories.length,
            separatorBuilder: (_, __) => const SizedBox(width: 8),
            itemBuilder: (ctx, i) {
              final cat = categories[i];
              final selected = cat == _selectedCategory;
              return GestureDetector(
                onTap: () => setState(() => _selectedCategory = cat),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  padding: const EdgeInsets.symmetric(
                      horizontal: 16, vertical: 6),
                  decoration: BoxDecoration(
                    color: selected
                        ? AppColors.primary
                        : AppColors.cardDark,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: selected
                          ? AppColors.primary
                          : AppColors.dividerDark,
                    ),
                  ),
                  child: Text(
                    categoryLabels[cat] ?? cat,
                    style: TextStyle(
                      color:
                          selected ? Colors.white : Colors.white54,
                      fontSize: 13,
                      fontWeight: selected
                          ? FontWeight.bold
                          : FontWeight.normal,
                    ),
                  ),
                ),
              );
            },
          ),
        ),
        Expanded(
          child: filtered.isEmpty
              ? const Center(
                  child: Text(
                    'Medallar mavjud emas',
                    style: TextStyle(color: Colors.white38),
                  ),
                )
              : GridView.builder(
                  padding: const EdgeInsets.all(12),
                  gridDelegate:
                      const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 3,
                    childAspectRatio: 0.68,
                    crossAxisSpacing: 10,
                    mainAxisSpacing: 10,
                  ),
                  itemCount: filtered.length,
                  itemBuilder: (ctx, i) {
                    final medal = filtered[i];
                    final owned = _isOwned(medal.id);
                    final userMedal = _getUserMedal(medal.id);
                    return _MedalCard(
                      medal: medal,
                      owned: owned,
                      isEquipped: userMedal?.isEquipped ?? false,
                      actionLoading: _actionLoading,
                      onUnlock: () => _unlock(medal),
                      onEquip: () => _equip(medal),
                      onUnequip: () => _unequip(medal),
                    )
                        .animate(
                            delay:
                                Duration(milliseconds: i * 40))
                        .fadeIn(duration: 300.ms)
                        .scale(
                            begin: const Offset(0.9, 0.9));
                  },
                ),
        ),
      ],
    );
  }

  Widget _buildLeaderboardTab() {
    if (_leaderboard.isEmpty) {
      return const Center(
        child: Text(
          'Liderlar ro\'yxati mavjud emas',
          style: TextStyle(color: Colors.white38),
        ),
      );
    }
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _leaderboard.length,
      itemBuilder: (ctx, i) {
        final entry = _leaderboard[i];
        final rank = i + 1;
        Color rankColor = Colors.white54;
        if (rank == 1) rankColor = const Color(0xFFFFD700);
        if (rank == 2) rankColor = const Color(0xFFC0C0C0);
        if (rank == 3) rankColor = const Color(0xFFCD7F32);

        return Container(
          margin: const EdgeInsets.only(bottom: 10),
          padding:
              const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: BoxDecoration(
            color: AppColors.cardDark,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: rank <= 3
                  ? rankColor.withOpacity(0.3)
                  : Colors.transparent,
            ),
          ),
          child: Row(
            children: [
              SizedBox(
                width: 28,
                child: Text(
                  '#$rank',
                  style: TextStyle(
                    color: rankColor,
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                  ),
                ),
              ),
              CircleAvatar(
                radius: 20,
                backgroundColor: AppColors.elevatedDark,
                backgroundImage: entry.avatar != null
                    ? NetworkImage(entry.avatar!)
                    : null,
                child: entry.avatar == null
                    ? const Icon(Icons.person,
                        color: Colors.white38, size: 20)
                    : null,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      entry.displayName ?? 'Foydalanuvchi',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    Text(
                      'Daraja ${entry.level}',
                      style: const TextStyle(
                        color: Colors.white54,
                        fontSize: 11,
                      ),
                    ),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    '${entry.totalPoints}',
                    style: TextStyle(
                      color: rankColor,
                      fontWeight: FontWeight.bold,
                      fontSize: 15,
                    ),
                  ),
                  const Text(
                    'ball',
                    style: TextStyle(
                        color: Colors.white38, fontSize: 10),
                  ),
                ],
              ),
            ],
          ),
        )
            .animate(delay: Duration(milliseconds: i * 50))
            .fadeIn(duration: 400.ms)
            .slideX(begin: 0.05);
      },
    );
  }

  Widget _buildMyTab() {
    final prestige = _myPrestige;
    final nextRule = _prestigeRules
        .where((r) => r.level > (prestige?.level ?? 0))
        .toList()
      ..sort((a, b) => a.level.compareTo(b.level));
    final nextThreshold =
        nextRule.isNotEmpty ? nextRule.first.requiredPoints : null;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF2D1060), Color(0xFF0D0D3A)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              children: [
                const Text(
                  'Mening Prestijim',
                  style: TextStyle(
                    color: Colors.white70,
                    fontSize: 13,
                    fontFamily: 'Poppins',
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  '${prestige?.totalPoints ?? 0}',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 36,
                    fontWeight: FontWeight.bold,
                    fontFamily: 'Poppins',
                  ),
                ),
                const Text(
                  'ball',
                  style: TextStyle(color: Colors.white54, fontSize: 13),
                ),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 14, vertical: 6),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withOpacity(0.25),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                        color: AppColors.primary.withOpacity(0.5)),
                  ),
                  child: Text(
                    'Daraja ${prestige?.level ?? 0}',
                    style: const TextStyle(
                      color: AppColors.primaryLight,
                      fontWeight: FontWeight.bold,
                      fontSize: 14,
                    ),
                  ),
                ),
                if (nextThreshold != null) ...[
                  const SizedBox(height: 12),
                  LinearProgressIndicator(
                    value: nextThreshold > 0
                        ? ((prestige?.totalPoints ?? 0) /
                                nextThreshold)
                            .clamp(0.0, 1.0)
                        : 0,
                    backgroundColor: Colors.white12,
                    color: AppColors.primary,
                    borderRadius: BorderRadius.circular(4),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Keyingi daraja: $nextThreshold ball',
                    style: const TextStyle(
                        color: Colors.white38, fontSize: 11),
                  ),
                ],
              ],
            ),
          ).animate().fadeIn(duration: 400.ms).slideY(begin: 0.05),
          const SizedBox(height: 20),
          Text(
            'Mening medallarim (${_myMedals.length})',
            style: const TextStyle(
              color: Colors.white,
              fontSize: 16,
              fontWeight: FontWeight.bold,
              fontFamily: 'Poppins',
            ),
          ),
          const SizedBox(height: 12),
          if (_myMedals.isEmpty)
            const Center(
              child: Padding(
                padding: EdgeInsets.symmetric(vertical: 32),
                child: Text(
                  'Hali medal yo\'q',
                  style: TextStyle(color: Colors.white38),
                ),
              ),
            )
          else
            GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              gridDelegate:
                  const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 3,
                childAspectRatio: 0.72,
                crossAxisSpacing: 10,
                mainAxisSpacing: 10,
              ),
              itemCount: _myMedals.length,
              itemBuilder: (ctx, i) {
                final um = _myMedals[i];
                final medal = um.medal;
                if (medal == null) return const SizedBox.shrink();
                return _MedalCard(
                  medal: medal,
                  owned: true,
                  isEquipped: um.isEquipped,
                  actionLoading: _actionLoading,
                  onUnlock: () {},
                  onEquip: () => _equip(medal),
                  onUnequip: () => _unequip(medal),
                )
                    .animate(
                        delay: Duration(milliseconds: i * 40))
                    .fadeIn(duration: 300.ms);
              },
            ),
        ],
      ),
    );
  }
}

class _MedalCard extends StatelessWidget {
  final MedalModel medal;
  final bool owned;
  final bool isEquipped;
  final bool actionLoading;
  final VoidCallback onUnlock;
  final VoidCallback onEquip;
  final VoidCallback onUnequip;

  const _MedalCard({
    required this.medal,
    required this.owned,
    required this.isEquipped,
    required this.actionLoading,
    required this.onUnlock,
    required this.onEquip,
    required this.onUnequip,
  });

  @override
  Widget build(BuildContext context) {
    final gradeColor = _gradeColors[medal.grade] ?? const Color(0xFF808080);

    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            gradeColor.withOpacity(0.08),
            const Color(0xFF12121E),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isEquipped
              ? AppColors.primary
              : gradeColor.withOpacity(0.3),
          width: isEquipped ? 1.5 : 1,
        ),
      ),
      child: Stack(
        children: [
          Padding(
            padding: const EdgeInsets.all(8),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  width: 52,
                  height: 52,
                  decoration: BoxDecoration(
                    gradient: RadialGradient(
                      colors: [
                        gradeColor.withOpacity(0.25),
                        Colors.transparent,
                      ],
                    ),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(
                    Icons.military_tech,
                    color: Colors.white38,
                    size: 28,
                  ),
                ),
                const SizedBox(height: 5),
                Text(
                  medal.name,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 10,
                    fontWeight: FontWeight.w500,
                  ),
                  maxLines: 2,
                  textAlign: TextAlign.center,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 3),
                Text(
                  '${medal.prestigeValue} ball',
                  style: const TextStyle(
                    color: Colors.white38,
                    fontSize: 9,
                  ),
                ),
                const SizedBox(height: 5),
                if (owned)
                  GestureDetector(
                    onTap: actionLoading
                        ? null
                        : isEquipped
                            ? onUnequip
                            : onEquip,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: isEquipped
                            ? Colors.white12
                            : AppColors.primary.withOpacity(0.25),
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(
                          color: isEquipped
                              ? Colors.white24
                              : AppColors.primary.withOpacity(0.5),
                        ),
                      ),
                      child: Text(
                        isEquipped ? 'Kiyilgan' : 'Jihozlash',
                        style: TextStyle(
                          color: isEquipped
                              ? Colors.white54
                              : AppColors.primaryLight,
                          fontSize: 9,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  )
                else
                  GestureDetector(
                    onTap: actionLoading ? null : onUnlock,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: gradeColor.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(
                            color: gradeColor.withOpacity(0.5)),
                      ),
                      child: Text(
                        medal.isPaid
                            ? '${medal.priceCoins} tanga'
                            : 'Ochish',
                        style: TextStyle(
                          color: gradeColor,
                          fontSize: 9,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
          Positioned(
            top: 5,
            right: 5,
            child: Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
              decoration: BoxDecoration(
                color: gradeColor.withOpacity(0.2),
                borderRadius: BorderRadius.circular(4),
                border: Border.all(color: gradeColor.withOpacity(0.5)),
              ),
              child: Text(
                medal.grade,
                style: TextStyle(
                  color: gradeColor,
                  fontSize: 8,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
