import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/network/api_client.dart';

class FamilyScreen extends ConsumerStatefulWidget {
  const FamilyScreen({super.key});

  @override
  ConsumerState<FamilyScreen> createState() => _FamilyScreenState();
}

class _FamilyScreenState extends ConsumerState<FamilyScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabCtrl;
  List<Map<String, dynamic>> _families = [];
  Map<String, dynamic>? _myFamily;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: 2, vsync: this);
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
      final [rankRes, myRes] = await Future.wait([
        api.get('/families/ranking'),
        api.get('/families/my').catchError((_) => null),
      ]);
      if (mounted) {
        setState(() {
          _families = (rankRes.data['data'] ?? rankRes.data['items'] ?? [] as List)
              .map((e) => Map<String, dynamic>.from(e as Map)).toList();
          if (myRes != null && myRes.statusCode == 200) {
            _myFamily = Map<String, dynamic>.from(myRes.data['data'] ?? myRes.data);
          }
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
      appBar: AppBar(
        backgroundColor: AppColors.backgroundDark,
        title: const Text('Family', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, color: Colors.white),
          onPressed: () => context.pop(),
        ),
        actions: [
          if (_myFamily == null)
            TextButton(
              onPressed: () => _showCreateDialog(),
              child: const Text('+ Create', style: TextStyle(color: AppColors.primary)),
            ),
        ],
        bottom: TabBar(
          controller: _tabCtrl,
          indicatorColor: AppColors.primary,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white54,
          tabs: const [Tab(text: 'Ranking'), Tab(text: 'My Family')],
        ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : TabBarView(
              controller: _tabCtrl,
              children: [
                _buildRankingTab(),
                _buildMyFamilyTab(),
              ],
            ),
    );
  }

  Widget _buildRankingTab() {
    if (_families.isEmpty) {
      return const Center(child: Text('No families yet', style: TextStyle(color: Colors.white54)));
    }
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _families.length,
      itemBuilder: (_, i) {
        final f = _families[i];
        return GestureDetector(
          onTap: () => context.push('/family/${f['id']}'),
          child: Container(
            margin: const EdgeInsets.only(bottom: 10),
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppColors.cardDark,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: Colors.white10),
            ),
            child: Row(
              children: [
                _buildRankBadge(i + 1),
                const SizedBox(width: 12),
                Container(
                  width: 46,
                  height: 46,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: AppColors.surfaceDark,
                    image: f['avatar'] != null
                        ? DecorationImage(image: NetworkImage(f['avatar'] as String), fit: BoxFit.cover)
                        : null,
                  ),
                  child: f['avatar'] == null
                      ? Center(child: Text(
                          (f['name'] as String? ?? 'F').substring(0, 1).toUpperCase(),
                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18),
                        ))
                      : null,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(f['name'] as String? ?? 'Family', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                      Text('${f['memberCount'] ?? f['_count']?['members'] ?? 0} members', style: const TextStyle(color: Colors.white54, fontSize: 12)),
                    ],
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      _formatNumber(f['treasury'] as int? ?? 0),
                      style: const TextStyle(color: AppColors.coin, fontWeight: FontWeight.bold),
                    ),
                    const Text('treasury', style: TextStyle(color: Colors.white38, fontSize: 10)),
                  ],
                ),
              ],
            ),
          ),
        ).animate(delay: Duration(milliseconds: i * 40)).fadeIn(duration: 300.ms);
      },
    );
  }

  Widget _buildRankBadge(int rank) {
    if (rank == 1) return const Text('🥇', style: TextStyle(fontSize: 24));
    if (rank == 2) return const Text('🥈', style: TextStyle(fontSize: 24));
    if (rank == 3) return const Text('🥉', style: TextStyle(fontSize: 24));
    return SizedBox(width: 28, child: Text('#$rank', style: const TextStyle(color: Colors.white54, fontWeight: FontWeight.bold), textAlign: TextAlign.center));
  }

  Widget _buildMyFamilyTab() {
    if (_myFamily == null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Text('🏠', style: TextStyle(fontSize: 64)),
            const SizedBox(height: 16),
            const Text('No Family Yet', style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            const Text('Create or join a family to unlock exclusive features', style: TextStyle(color: Colors.white54, fontSize: 13), textAlign: TextAlign.center),
            const SizedBox(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                  ),
                  onPressed: _showCreateDialog,
                  child: const Text('Create Family', style: TextStyle(color: Colors.white)),
                ),
                const SizedBox(width: 12),
                OutlinedButton(
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: AppColors.primary),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                  ),
                  onPressed: _showJoinDialog,
                  child: const Text('Join Family', style: TextStyle(color: AppColors.primary)),
                ),
              ],
            ),
          ],
        ),
      );
    }
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          _buildFamilyCard(_myFamily!),
          const SizedBox(height: 16),
          _buildDonateSection(),
        ],
      ),
    );
  }

  Widget _buildFamilyCard(Map<String, dynamic> family) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [AppColors.primary.withOpacity(0.2), AppColors.cardDark],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.primary.withOpacity(0.3)),
      ),
      child: Column(
        children: [
          CircleAvatar(
            radius: 36,
            backgroundImage: family['avatar'] != null ? NetworkImage(family['avatar'] as String) : null,
            backgroundColor: AppColors.surfaceDark,
            child: family['avatar'] == null ? Text(
              (family['name'] as String? ?? 'F').substring(0, 1).toUpperCase(),
              style: const TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.bold),
            ) : null,
          ),
          const SizedBox(height: 10),
          Text(family['name'] as String? ?? 'Family', style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
          if (family['tag'] != null)
            Text('[${family['tag']}]', style: const TextStyle(color: AppColors.primary, fontSize: 13)),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              _buildFamilyStat('${family['_count']?['members'] ?? 0}', 'Members'),
              Container(width: 1, height: 32, color: Colors.white12),
              _buildFamilyStat(_formatNumber(family['treasury'] as int? ?? 0), 'Treasury'),
              Container(width: 1, height: 32, color: Colors.white12),
              _buildFamilyStat('Lv.${family['level'] ?? 1}', 'Level'),
            ],
          ),
          const SizedBox(height: 16),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
            ),
            onPressed: () => context.push('/family/${family['id']}'),
            child: const Text('View Family', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  Widget _buildFamilyStat(String value, String label) {
    return Column(
      children: [
        Text(value, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
        Text(label, style: const TextStyle(color: Colors.white54, fontSize: 11)),
      ],
    );
  }

  Widget _buildDonateSection() {
    final amtCtrl = TextEditingController();
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.cardDark,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Donate to Treasury', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: amtCtrl,
                  keyboardType: TextInputType.number,
                  style: const TextStyle(color: Colors.white),
                  decoration: InputDecoration(
                    hintText: 'Amount in coins',
                    hintStyle: const TextStyle(color: Colors.white38),
                    filled: true,
                    fillColor: AppColors.surfaceDark,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                ),
                onPressed: () async {
                  final amount = int.tryParse(amtCtrl.text.trim()) ?? 0;
                  if (amount <= 0 || _myFamily == null) return;
                  try {
                    final api = ref.read(apiClientProvider);
                    await api.post('/families/${_myFamily!['id']}/donate', data: {'amount': amount});
                    amtCtrl.clear();
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Donation successful!'), backgroundColor: AppColors.success),
                      );
                      _load();
                    }
                  } catch (e) {
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
                      );
                    }
                  }
                },
                child: const Text('Donate', style: TextStyle(color: Colors.white)),
              ),
            ],
          ),
        ],
      ),
    );
  }

  void _showCreateDialog() {
    final nameCtrl = TextEditingController();
    final tagCtrl = TextEditingController();
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: AppColors.surfaceDark,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Create Family', style: TextStyle(color: Colors.white)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('Cost: 5000 coins', style: TextStyle(color: Colors.white54, fontSize: 13)),
            const SizedBox(height: 12),
            TextField(
              controller: nameCtrl,
              style: const TextStyle(color: Colors.white),
              decoration: InputDecoration(
                labelText: 'Family Name',
                labelStyle: const TextStyle(color: Colors.white54),
                filled: true, fillColor: AppColors.cardDark,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
              ),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: tagCtrl,
              style: const TextStyle(color: Colors.white),
              decoration: InputDecoration(
                labelText: 'Tag (e.g. VOXO)',
                labelStyle: const TextStyle(color: Colors.white54),
                filled: true, fillColor: AppColors.cardDark,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
            onPressed: () async {
              if (nameCtrl.text.trim().isEmpty) return;
              try {
                final api = ref.read(apiClientProvider);
                await api.post('/families', data: {'name': nameCtrl.text.trim(), 'tag': tagCtrl.text.trim()});
                if (mounted) {
                  Navigator.pop(context);
                  _load();
                }
              } catch (e) {
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red));
                }
              }
            },
            child: const Text('Create'),
          ),
        ],
      ),
    );
  }

  void _showJoinDialog() {
    final codeCtrl = TextEditingController();
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: AppColors.surfaceDark,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Join Family', style: TextStyle(color: Colors.white)),
        content: TextField(
          controller: codeCtrl,
          style: const TextStyle(color: Colors.white),
          decoration: InputDecoration(
            labelText: 'Family ID or Invite Code',
            labelStyle: const TextStyle(color: Colors.white54),
            filled: true, fillColor: AppColors.cardDark,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
            onPressed: () async {
              if (codeCtrl.text.trim().isEmpty) return;
              try {
                final api = ref.read(apiClientProvider);
                await api.post('/families/${codeCtrl.text.trim()}/join');
                if (mounted) {
                  Navigator.pop(context);
                  _load();
                }
              } catch (e) {
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red));
                }
              }
            },
            child: const Text('Join'),
          ),
        ],
      ),
    );
  }

  String _formatNumber(int n) {
    if (n >= 1000000) return '${(n / 1000000).toStringAsFixed(1)}M';
    if (n >= 1000) return '${(n / 1000).toStringAsFixed(1)}K';
    return n.toString();
  }
}
