import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/network/api_client.dart';

const _vipPlans = [
  {
    'level': 1, 'name': 'Bronze VIP', 'icon': '🥉', 'color': 0xFFCD7F32,
    'price': 299, 'days': 30,
    'perks': ['Bronze frame', 'VIP badge', 'Gift x1.1', 'Entry effect'],
  },
  {
    'level': 2, 'name': 'Silver VIP', 'icon': '🥈', 'color': 0xFFC0C0C0,
    'price': 699, 'days': 30,
    'perks': ['Silver frame', 'VIP badge', 'Gift x1.2', 'Custom entry', 'Priority support'],
  },
  {
    'level': 3, 'name': 'Gold VIP', 'icon': '👑', 'color': 0xFFFFD700,
    'price': 1499, 'days': 30,
    'perks': ['Gold frame', 'VIP badge', 'Gift x1.5', 'Gold entry effect', 'Priority seating', 'Name highlight'],
  },
  {
    'level': 4, 'name': 'Platinum VIP', 'icon': '💎', 'color': 0xFF00CED1,
    'price': 2999, 'days': 30,
    'perks': ['Platinum frame', 'VIP badge', 'Gift x2.0', 'Unique entry', 'Profile spotlight', 'Priority matching'],
  },
  {
    'level': 5, 'name': 'Diamond VIP', 'icon': '🌟', 'color': 0xFF9400D3,
    'price': 5999, 'days': 30,
    'perks': ['Diamond frame', 'All effects', 'Gift x2.5', 'Exclusive badge', 'Custom vehicle', 'Admin access'],
  },
];

class VipScreen extends ConsumerStatefulWidget {
  const VipScreen({super.key});

  @override
  ConsumerState<VipScreen> createState() => _VipScreenState();
}

class _VipScreenState extends ConsumerState<VipScreen> {
  int? _currentVipLevel;
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    _loadVipStatus();
  }

  Future<void> _loadVipStatus() async {
    try {
      final api = ref.read(apiClientProvider);
      final response = await api.get('/users/me');
      if (response.statusCode == 200 && mounted) {
        final data = response.data['data'] ?? response.data;
        setState(() => _currentVipLevel = data['vipLevel'] as int? ?? 0);
      }
    } catch (_) {}
  }

  Future<void> _purchase(Map<String, dynamic> plan) async {
    setState(() => _loading = true);
    try {
      final api = ref.read(apiClientProvider);
      final level = plan['level'] as int;
      await api.post('/vip/purchase', data: {'level': level, 'duration': 30});
      if (mounted) {
        setState(() => _currentVipLevel = level);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('🎉 ${plan['name']} activated!'),
            backgroundColor: AppColors.success,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Purchase failed: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundDark,
      body: CustomScrollView(
        slivers: [
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
                    colors: [Color(0xFF4A1080), Color(0xFF1A0050), Color(0xFF0A0A1A)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                ),
                child: Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const SizedBox(height: 40),
                      const Text('👑', style: TextStyle(fontSize: 48)),
                      const Text('VIP Membership', style: TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold)),
                      if (_currentVipLevel != null && _currentVipLevel! > 0)
                        Text(
                          'Current: VIP Level $_currentVipLevel',
                          style: const TextStyle(color: Colors.amber, fontSize: 13),
                        ),
                    ],
                  ),
                ),
              ),
            ),
          ),
          SliverPadding(
            padding: const EdgeInsets.all(16),
            sliver: SliverList(
              delegate: SliverChildBuilderDelegate(
                (ctx, i) {
                  final plan = _vipPlans[i];
                  final level = plan['level'] as int;
                  final isOwned = (_currentVipLevel ?? 0) >= level;
                  final planColor = Color(plan['color'] as int);

                  return Container(
                    margin: const EdgeInsets.only(bottom: 16),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [planColor.withOpacity(0.15), AppColors.cardDark],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: isOwned ? planColor : planColor.withOpacity(0.3),
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
                              Text(plan['icon'] as String, style: const TextStyle(fontSize: 28)),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      plan['name'] as String,
                                      style: TextStyle(color: planColor, fontWeight: FontWeight.bold, fontSize: 16),
                                    ),
                                    Text(
                                      '${plan['price']} 💎 / ${plan['days']} days',
                                      style: const TextStyle(color: Colors.white54, fontSize: 12),
                                    ),
                                  ],
                                ),
                              ),
                              if (isOwned)
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                                  decoration: BoxDecoration(
                                    color: AppColors.success.withOpacity(0.2),
                                    borderRadius: BorderRadius.circular(20),
                                    border: Border.all(color: AppColors.success.withOpacity(0.5)),
                                  ),
                                  child: const Text('Active', style: TextStyle(color: AppColors.success, fontSize: 12)),
                                )
                              else
                                ElevatedButton(
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: planColor,
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                                  ),
                                  onPressed: _loading ? null : () => _purchase(Map<String, dynamic>.from(plan)),
                                  child: const Text('Get VIP', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12)),
                                ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          const Divider(color: Colors.white10),
                          const SizedBox(height: 8),
                          Wrap(
                            spacing: 8,
                            runSpacing: 6,
                            children: (plan['perks'] as List<String>).map((perk) => Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Icons.check_circle, color: planColor, size: 14),
                                const SizedBox(width: 4),
                                Text(perk, style: const TextStyle(color: Colors.white70, fontSize: 12)),
                              ],
                            )).toList(),
                          ),
                        ],
                      ),
                    ),
                  ).animate(delay: Duration(milliseconds: i * 80)).fadeIn(duration: 400.ms).slideY(begin: 0.1);
                },
                childCount: _vipPlans.length,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
