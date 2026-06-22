import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/network/api_client.dart';

class NoblePlan {
  final String id;
  final String name;
  final String tier;
  final int monthlyPriceCoins;
  final int dailyCoins;
  final int expBoostPercent;
  final int giftDiscountPercent;
  final String? badgeUrl;
  final String coloredNameStyle;
  final bool isActive;

  const NoblePlan({
    required this.id,
    required this.name,
    required this.tier,
    required this.monthlyPriceCoins,
    required this.dailyCoins,
    required this.expBoostPercent,
    required this.giftDiscountPercent,
    this.badgeUrl,
    required this.coloredNameStyle,
    required this.isActive,
  });

  factory NoblePlan.fromJson(Map<String, dynamic> json) => NoblePlan(
        id: json['id'] as String,
        name: json['name'] as String,
        tier: json['tier'] as String,
        monthlyPriceCoins: json['monthlyPriceCoins'] as int,
        dailyCoins: json['dailyCoins'] as int? ?? 0,
        expBoostPercent: json['expBoostPercent'] as int? ?? 0,
        giftDiscountPercent: json['giftDiscountPercent'] as int? ?? 0,
        badgeUrl: json['badgeUrl'] as String?,
        coloredNameStyle: json['coloredNameStyle'] as String? ?? '',
        isActive: json['isActive'] as bool? ?? true,
      );
}

class UserNobleSubscription {
  final String planId;
  final String tier;
  final DateTime expiresAt;
  final bool isActive;
  final NoblePlan? plan;

  const UserNobleSubscription({
    required this.planId,
    required this.tier,
    required this.expiresAt,
    required this.isActive,
    this.plan,
  });

  factory UserNobleSubscription.fromJson(Map<String, dynamic> json) =>
      UserNobleSubscription(
        planId: json['planId'] as String,
        tier: json['tier'] as String,
        expiresAt: DateTime.parse(json['expiresAt'] as String),
        isActive: json['isActive'] as bool? ?? false,
        plan: json['plan'] != null
            ? NoblePlan.fromJson(json['plan'] as Map<String, dynamic>)
            : null,
      );

  bool get isExpired => expiresAt.isBefore(DateTime.now());
}

final _tierConfig = {
  'PRINCE': {'icon': '👑', 'label': 'Shahzoda', 'color': 0xFFFFD700},
  'NOBLE': {'icon': '🔮', 'label': 'Olijanob', 'color': 0xFF9C27B0},
  'RULER': {'icon': '⚡', 'label': 'Hukmdor', 'color': 0xFFFF4444},
  'PRESIDENT': {'icon': '🌟', 'label': 'Prezident', 'color': 0xFFFF6B00},
};

class NobleScreen extends ConsumerStatefulWidget {
  const NobleScreen({super.key});

  @override
  ConsumerState<NobleScreen> createState() => _NobleScreenState();
}

class _NobleScreenState extends ConsumerState<NobleScreen> {
  List<NoblePlan> _plans = [];
  UserNobleSubscription? _mySub;
  bool _loading = true;
  bool _purchasing = false;
  int _selectedMonths = 1;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final api = ref.read(apiClientProvider);
      final plansRes = await api.get('/noble/plans');
      final subRes = await api.get('/noble/me');
      if (mounted) {
        final rawPlans = (plansRes.data['data'] ?? plansRes.data) as List;
        final rawSub = subRes.data['data'] ?? subRes.data;
        setState(() {
          _plans = rawPlans
              .map((e) => NoblePlan.fromJson(e as Map<String, dynamic>))
              .where((p) => p.isActive)
              .toList();
          if (rawSub != null && rawSub is Map) {
            _mySub = UserNobleSubscription.fromJson(rawSub as Map<String, dynamic>);
          }
        });
      }
    } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _purchase(NoblePlan plan) async {
    setState(() => _purchasing = true);
    try {
      final api = ref.read(apiClientProvider);
      await api.post('/noble/purchase', data: {
        'planId': plan.id,
        'months': _selectedMonths,
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('${plan.name} faollashtirildi!'),
            backgroundColor: AppColors.success,
          ),
        );
        await _load();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: const Text('Amaliyot bajarilmadi'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _purchasing = false);
    }
  }

  void _showPurchaseDialog(NoblePlan plan) {
    final cfg = _tierConfig[plan.tier]!;
    final planColor = Color(cfg['color'] as int);
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF1A1A2E),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) => Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.white24,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 20),
              Text(cfg['icon'] as String, style: const TextStyle(fontSize: 48)),
              const SizedBox(height: 8),
              Text(
                plan.name,
                style: TextStyle(
                  color: planColor,
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [1, 3, 6, 12].map((m) {
                  final selected = _selectedMonths == m;
                  return GestureDetector(
                    onTap: () => setModalState(() => _selectedMonths = m),
                    child: Container(
                      margin: const EdgeInsets.symmetric(horizontal: 6),
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      decoration: BoxDecoration(
                        color: selected ? planColor : Colors.white10,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: selected ? planColor : Colors.white24,
                        ),
                      ),
                      child: Text(
                        '${m}oy',
                        style: TextStyle(
                          color: selected ? Colors.white : Colors.white54,
                          fontWeight: selected ? FontWeight.bold : FontWeight.normal,
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white05,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Text('Jami: ', style: TextStyle(color: Colors.white54)),
                    Text(
                      '${plan.monthlyPriceCoins * _selectedMonths} tanga',
                      style: TextStyle(
                        color: planColor,
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: planColor,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                  onPressed: _purchasing
                      ? null
                      : () {
                          Navigator.pop(ctx);
                          _purchase(plan);
                        },
                  child: _purchasing
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            color: Colors.white,
                            strokeWidth: 2,
                          ),
                        )
                      : const Text(
                          'Sotib olish',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundDark,
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            expandedHeight: 180,
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
                      Color(0xFF8B1A1A),
                      Color(0xFF4A0080),
                      Color(0xFF0A0A1A),
                    ],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                ),
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 60, 16, 16),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      const Text(
                        'Noble',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 26,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 2,
                        ),
                      ),
                      const SizedBox(height: 4),
                      if (_mySub != null && _mySub!.isActive && !_mySub!.isExpired)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                          decoration: BoxDecoration(
                            color: Colors.amber.withOpacity(0.2),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: Colors.amber.withOpacity(0.5)),
                          ),
                          child: Text(
                            'Faol: ${_mySub!.plan?.name ?? _mySub!.tier}',
                            style: const TextStyle(color: Colors.amber, fontSize: 13),
                          ),
                        )
                      else
                        const Text(
                          'Maxsus imtiyozlarga ega bo\'ling',
                          style: TextStyle(color: Colors.white54, fontSize: 13),
                        ),
                    ],
                  ),
                ),
              ),
            ),
          ),
          if (_loading)
            const SliverFillRemaining(
              child: Center(child: CircularProgressIndicator()),
            )
          else
            SliverPadding(
              padding: const EdgeInsets.all(16),
              sliver: SliverList(
                delegate: SliverChildBuilderDelegate(
                  (ctx, i) {
                    final plan = _plans[i];
                    final cfg = _tierConfig[plan.tier] ??
                        {'icon': '⭐', 'label': plan.tier, 'color': 0xFFFFFFFF};
                    final planColor = Color(cfg['color'] as int);
                    final isOwned = _mySub != null &&
                        _mySub!.isActive &&
                        !_mySub!.isExpired &&
                        _mySub!.planId == plan.id;

                    return Container(
                      margin: const EdgeInsets.only(bottom: 16),
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: [
                            planColor.withOpacity(0.12),
                            const Color(0xFF12121E),
                          ],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: isOwned
                              ? planColor
                              : planColor.withOpacity(0.3),
                          width: isOwned ? 2 : 1,
                        ),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Text(
                                  cfg['icon'] as String,
                                  style: const TextStyle(fontSize: 32),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        plan.name,
                                        style: TextStyle(
                                          color: planColor,
                                          fontWeight: FontWeight.bold,
                                          fontSize: 17,
                                        ),
                                      ),
                                      Text(
                                        '${plan.monthlyPriceCoins} tanga / oy',
                                        style: const TextStyle(
                                          color: Colors.white54,
                                          fontSize: 12,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                if (isOwned)
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 10,
                                      vertical: 5,
                                    ),
                                    decoration: BoxDecoration(
                                      color: AppColors.success.withOpacity(0.15),
                                      borderRadius: BorderRadius.circular(20),
                                      border: Border.all(
                                        color: AppColors.success.withOpacity(0.4),
                                      ),
                                    ),
                                    child: const Text(
                                      'Faol',
                                      style: TextStyle(
                                        color: AppColors.success,
                                        fontSize: 12,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  )
                                else
                                  ElevatedButton(
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: planColor,
                                      shape: RoundedRectangleBorder(
                                        borderRadius: BorderRadius.circular(20),
                                      ),
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 16,
                                        vertical: 8,
                                      ),
                                    ),
                                    onPressed: _purchasing
                                        ? null
                                        : () => _showPurchaseDialog(plan),
                                    child: const Text(
                                      'Sotib olish',
                                      style: TextStyle(
                                        color: Colors.white,
                                        fontWeight: FontWeight.bold,
                                        fontSize: 12,
                                      ),
                                    ),
                                  ),
                              ],
                            ),
                            const SizedBox(height: 12),
                            const Divider(color: Colors.white10),
                            const SizedBox(height: 8),
                            Wrap(
                              spacing: 16,
                              runSpacing: 6,
                              children: [
                                _BenefitChip(
                                  icon: Icons.monetization_on,
                                  label: '${plan.dailyCoins} tanga/kun',
                                  color: planColor,
                                ),
                                _BenefitChip(
                                  icon: Icons.trending_up,
                                  label: '+${plan.expBoostPercent}% XP',
                                  color: planColor,
                                ),
                                _BenefitChip(
                                  icon: Icons.card_giftcard,
                                  label: '-${plan.giftDiscountPercent}% sovg\'a',
                                  color: planColor,
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    )
                        .animate(
                          delay: Duration(milliseconds: i * 80),
                        )
                        .fadeIn(duration: 400.ms)
                        .slideY(begin: 0.08);
                  },
                  childCount: _plans.length,
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _BenefitChip extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;

  const _BenefitChip({
    required this.icon,
    required this.label,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, color: color, size: 13),
        const SizedBox(width: 4),
        Text(
          label,
          style: const TextStyle(color: Colors.white70, fontSize: 11),
        ),
      ],
    );
  }
}
