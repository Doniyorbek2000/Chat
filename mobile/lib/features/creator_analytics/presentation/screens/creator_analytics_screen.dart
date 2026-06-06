import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/network/api_client.dart';
import '../../../../shared/widgets/user_avatar.dart';

class CreatorAnalyticsScreen extends ConsumerStatefulWidget {
  const CreatorAnalyticsScreen({super.key});

  @override
  ConsumerState<CreatorAnalyticsScreen> createState() => _CreatorAnalyticsScreenState();
}

class _CreatorAnalyticsScreenState extends ConsumerState<CreatorAnalyticsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tab;
  bool _loading = true;
  String _error = '';
  Map<String, dynamic>? _summary;
  List<Map<String, dynamic>> _giftChart = [];
  List<Map<String, dynamic>> _topSupporters = [];
  String _fromDate = '';
  String _toDate = '';

  @override
  void initState() {
    super.initState();
    _tab = TabController(length: 3, vsync: this);
    final now = DateTime.now();
    _toDate = now.toIso8601String().split('T')[0];
    _fromDate = now.subtract(const Duration(days: 30)).toIso8601String().split('T')[0];
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
      final query = 'from=$_fromDate&to=$_toDate';
      final results = await Future.wait([
        api.get('/creator/analytics/summary?$query'),
        api.get('/creator/analytics/gifts?$query'),
        api.get('/creator/analytics/supporters?limit=10'),
      ]);
      if (mounted) {
        setState(() {
          _summary = Map<String, dynamic>.from((results[0].data['data'] ?? results[0].data) as Map);
          final giftData = results[1].data['data'] ?? results[1].data;
          _giftChart = List<Map<String, dynamic>>.from(((giftData['dailyChart'] as List?) ?? []).map((e) => Map<String, dynamic>.from(e as Map)));
          _topSupporters = List<Map<String, dynamic>>.from(((results[2].data['data'] ?? results[2].data) as List? ?? []).map((e) => Map<String, dynamic>.from(e as Map)));
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
      body: SafeArea(
        child: Column(
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
                            _buildSummaryTab(),
                            _buildGiftTab(),
                            _buildSupportersTab(),
                          ],
                        ),
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
          const Expanded(child: Text('Kreator Analitikasi', textAlign: TextAlign.center, style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold, fontFamily: 'Poppins'))),
          IconButton(icon: const Icon(Icons.date_range, color: AppColors.primary), onPressed: _showDatePicker),
        ],
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
        labelStyle: const TextStyle(fontFamily: 'Poppins', fontWeight: FontWeight.w600, fontSize: 13),
        tabs: const [Tab(text: 'Umumiy'), Tab(text: 'Sovg\'alar'), Tab(text: 'Muxlislar')],
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

  Widget _buildSummaryTab() {
    if (_summary == null) return const Center(child: Text('Ma\'lumot yo\'q', style: TextStyle(color: AppColors.textSecondary, fontFamily: 'Poppins')));
    final stats = [
      {'icon': '🎁', 'label': 'Sovg\'a Qiymati', 'value': _summary!['giftsValue'] ?? '0', 'color': AppColors.coin},
      {'icon': '📦', 'label': 'Sovg\'alar Soni', 'value': '${_summary!['giftsCount'] ?? 0}', 'color': AppColors.primary},
      {'icon': '👥', 'label': 'Yangi Izdoshlar', 'value': '${_summary!['newFollowers'] ?? 0}', 'color': AppColors.success},
      {'icon': '⏱️', 'label': 'Efir Daqiqalari', 'value': '${_summary!['totalLiveMinutes'] ?? 0}', 'color': AppColors.accent},
      {'icon': '💰', 'label': 'Daromad', 'value': '${_summary!['estimatedEarnings'] ?? '0'}', 'color': AppColors.coin},
      {'icon': '⚔️', 'label': 'PK G\'alabalar', 'value': '${_summary!['pkWins'] ?? 0}', 'color': AppColors.error},
      {'icon': '👁️', 'label': "O'rtacha Tomoshabinlar", 'value': '${_summary!['avgViewers'] ?? 0}', 'color': AppColors.info},
      {'icon': '🎙️', 'label': 'Xonalar Soni', 'value': '${_summary!['roomsCount'] ?? 0}', 'color': AppColors.secondary},
    ];
    return RefreshIndicator(
      onRefresh: _load,
      color: AppColors.primary,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _buildDateRange(),
          const SizedBox(height: 16),
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 2, crossAxisSpacing: 12, mainAxisSpacing: 12, childAspectRatio: 1.6),
            itemCount: stats.length,
            itemBuilder: (_, i) => _statCard(stats[i]).animate(delay: Duration(milliseconds: i * 50)).fadeIn(duration: 300.ms),
          ),
        ],
      ),
    );
  }

  Widget _statCard(Map<String, dynamic> s) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: AppColors.cardDark, borderRadius: BorderRadius.circular(14), border: Border.all(color: AppColors.dividerDark)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(s['icon'] as String, style: const TextStyle(fontSize: 22)),
          const SizedBox(height: 6),
          Text(s['value'] as String, style: TextStyle(color: s['color'] as Color, fontWeight: FontWeight.bold, fontSize: 16, fontFamily: 'Poppins'), overflow: TextOverflow.ellipsis),
          Text(s['label'] as String, style: const TextStyle(color: AppColors.textSecondary, fontSize: 11, fontFamily: 'Poppins')),
        ],
      ),
    );
  }

  Widget _buildGiftTab() {
    if (_giftChart.isEmpty) {
      return const Center(child: Text('Sovg\'a ma\'lumoti yo\'q', style: TextStyle(color: AppColors.textSecondary, fontFamily: 'Poppins')));
    }
    return RefreshIndicator(
      onRefresh: _load,
      color: AppColors.primary,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _buildDateRange(),
          const SizedBox(height: 16),
          const Text('Kunlik Sovg\'a Grafigi', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontFamily: 'Poppins')),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: AppColors.cardDark, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppColors.dividerDark)),
            child: Column(
              children: _giftChart.map((d) {
                final value = double.tryParse(d['value'] as String? ?? '0') ?? 0;
                final maxValue = _giftChart.map((e) => double.tryParse(e['value'] as String? ?? '0') ?? 0).reduce((a, b) => a > b ? a : b);
                final ratio = maxValue > 0 ? value / maxValue : 0.0;
                return Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Row(
                    children: [
                      SizedBox(width: 80, child: Text(d['date'] as String? ?? '', style: const TextStyle(color: AppColors.textSecondary, fontSize: 11, fontFamily: 'Poppins'))),
                      Expanded(
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(4),
                          child: LinearProgressIndicator(value: ratio, backgroundColor: AppColors.dividerDark, valueColor: const AlwaysStoppedAnimation<Color>(AppColors.coin), minHeight: 8),
                        ),
                      ),
                      const SizedBox(width: 8),
                      SizedBox(width: 60, child: Text(d['value'] as String? ?? '', style: const TextStyle(color: AppColors.coin, fontSize: 11, fontFamily: 'Poppins'), textAlign: TextAlign.right, overflow: TextOverflow.ellipsis)),
                    ],
                  ),
                );
              }).toList(),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSupportersTab() {
    if (_topSupporters.isEmpty) {
      return const Center(child: Text('Hali muxlislar yo\'q', style: TextStyle(color: AppColors.textSecondary, fontFamily: 'Poppins')));
    }
    return RefreshIndicator(
      onRefresh: _load,
      color: AppColors.primary,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _topSupporters.length,
        itemBuilder: (_, i) {
          final s = _topSupporters[i];
          return Container(
            margin: const EdgeInsets.only(bottom: 10),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: i < 3 ? [AppColors.coin, const Color(0xFFC0C0C0), const Color(0xFFCD7F32)][i].withOpacity(0.08) : AppColors.cardDark,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppColors.dividerDark),
            ),
            child: Row(
              children: [
                SizedBox(width: 28, child: i < 3 ? Text(['🥇','🥈','🥉'][i], style: const TextStyle(fontSize: 20), textAlign: TextAlign.center) : Text('${i+1}', style: const TextStyle(color: AppColors.textSecondary, fontFamily: 'Poppins'), textAlign: TextAlign.center)),
                const SizedBox(width: 10),
                UserAvatar(avatarUrl: s['avatar'] as String?, size: 40, isOnline: false),
                const SizedBox(width: 12),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(s['displayName'] as String? ?? '---', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontFamily: 'Poppins')),
                  Text('@${s['uid'] ?? ''}', style: const TextStyle(color: AppColors.textSecondary, fontSize: 11, fontFamily: 'Poppins')),
                ])),
                Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                  Text('🪙 ${s['totalGiftValue'] ?? '0'}', style: const TextStyle(color: AppColors.coin, fontWeight: FontWeight.bold, fontFamily: 'Poppins', fontSize: 13)),
                  Text('${s['giftCount'] ?? 0} sovg\'a', style: const TextStyle(color: AppColors.textSecondary, fontSize: 11, fontFamily: 'Poppins')),
                ]),
              ],
            ),
          ).animate(delay: Duration(milliseconds: i * 50)).fadeIn(duration: 300.ms);
        },
      ),
    );
  }

  Widget _buildDateRange() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(color: AppColors.cardDark, borderRadius: BorderRadius.circular(10), border: Border.all(color: AppColors.dividerDark)),
      child: Row(
        children: [
          const Icon(Icons.date_range, color: AppColors.textSecondary, size: 16),
          const SizedBox(width: 8),
          Text('$_fromDate — $_toDate', style: const TextStyle(color: AppColors.textSecondary, fontFamily: 'Poppins', fontSize: 13)),
          const Spacer(),
          GestureDetector(onTap: _showDatePicker, child: const Text('O\'zgartirish', style: TextStyle(color: AppColors.primary, fontFamily: 'Poppins', fontSize: 13))),
        ],
      ),
    );
  }

  Future<void> _showDatePicker() async {
    final picked = await showDateRangePicker(
      context: context,
      firstDate: DateTime(2024),
      lastDate: DateTime.now(),
      initialDateRange: DateTimeRange(
        start: DateTime.tryParse(_fromDate) ?? DateTime.now().subtract(const Duration(days: 30)),
        end: DateTime.tryParse(_toDate) ?? DateTime.now(),
      ),
      builder: (context, child) => Theme(data: ThemeData.dark().copyWith(colorScheme: const ColorScheme.dark(primary: AppColors.primary)), child: child!),
    );
    if (picked != null && mounted) {
      setState(() {
        _fromDate = picked.start.toIso8601String().split('T')[0];
        _toDate = picked.end.toIso8601String().split('T')[0];
      });
      _load();
    }
  }
}
