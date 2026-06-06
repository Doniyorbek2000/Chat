import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../../../../core/theme/app_colors.dart';
import '../../../../../core/network/api_client.dart';
import '../../../../../shared/widgets/user_avatar.dart';

class RoomSupportersSheet extends ConsumerStatefulWidget {
  final String roomId;
  const RoomSupportersSheet({super.key, required this.roomId});

  static Future<void> show(BuildContext context, String roomId) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => RoomSupportersSheet(roomId: roomId),
    );
  }

  @override
  ConsumerState<RoomSupportersSheet> createState() => _RoomSupportersSheetState();
}

class _RoomSupportersSheetState extends ConsumerState<RoomSupportersSheet>
    with SingleTickerProviderStateMixin {
  late TabController _tab;
  bool _loading = true;
  String _error = '';
  List<Map<String, dynamic>> _top3 = [];
  List<Map<String, dynamic>> _list = [];
  String _period = 'session';

  static const _periods = [
    ('session', 'Sessiya'),
    ('daily', 'Bugun'),
    ('weekly', 'Haftalik'),
    ('monthly', 'Oylik'),
    ('all', 'Barcha'),
  ];

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
      final results = await Future.wait([
        api.get('/rooms/${widget.roomId}/supporters/top3'),
        api.get('/rooms/${widget.roomId}/supporters?period=$_period'),
      ]);
      if (mounted) {
        setState(() {
          _top3 = List<Map<String, dynamic>>.from(((results[0].data['data'] ?? results[0].data) as List? ?? []).map((e) => Map<String, dynamic>.from(e as Map)));
          final listData = results[1].data['data'] ?? results[1].data;
          _list = List<Map<String, dynamic>>.from(((listData['data'] as List?) ?? [listData]).where((e) => e is Map).map((e) => Map<String, dynamic>.from(e as Map)));
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() { _error = e.toString(); _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.7,
      maxChildSize: 0.9,
      minChildSize: 0.4,
      builder: (_, controller) => Container(
        decoration: const BoxDecoration(
          color: AppColors.surfaceDark,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Column(
          children: [
            _buildHandle(),
            _buildTitle(),
            _buildTop3(),
            _buildTabBar(),
            _buildPeriodSelector(),
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
                  : _error.isNotEmpty
                      ? Center(child: Text(_error, style: const TextStyle(color: AppColors.error, fontFamily: 'Poppins')))
                      : _buildList(controller),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHandle() {
    return Center(
      child: Container(
        margin: const EdgeInsets.only(top: 12, bottom: 8),
        width: 40,
        height: 4,
        decoration: BoxDecoration(color: AppColors.dividerDark, borderRadius: BorderRadius.circular(2)),
      ),
    );
  }

  Widget _buildTitle() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
      child: Row(
        children: [
          const Expanded(child: Text('Top Muxlislar', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18, fontFamily: 'Poppins'))),
          IconButton(icon: const Icon(Icons.close, color: AppColors.textSecondary), onPressed: () => Navigator.pop(context)),
        ],
      ),
    );
  }

  Widget _buildTop3() {
    if (_top3.isEmpty) return const SizedBox.shrink();
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: const LinearGradient(colors: [Color(0xFF2D1B69), Color(0xFF1A0F3A)]),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: List.generate(_top3.length > 3 ? 3 : _top3.length, (i) {
          final s = _top3[i];
          return Column(
            children: [
              Stack(
                clipBehavior: Clip.none,
                children: [
                  UserAvatar(avatarUrl: s['avatar'] as String?, size: i == 0 ? 52 : 44, isOnline: false),
                  Positioned(top: -8, left: 0, right: 0, child: Center(child: Text(['🥇','🥈','🥉'][i], style: const TextStyle(fontSize: 18)))),
                ],
              ),
              const SizedBox(height: 6),
              Text(s['displayName'] as String? ?? '---', style: const TextStyle(color: Colors.white, fontSize: 11, fontFamily: 'Poppins', fontWeight: FontWeight.bold), overflow: TextOverflow.ellipsis),
              Text('🪙 ${s['totalGiftValue'] ?? '0'}', style: const TextStyle(color: AppColors.coin, fontSize: 10, fontFamily: 'Poppins')),
            ],
          );
        }),
      ),
    ).animate().fadeIn(duration: 400.ms);
  }

  Widget _buildTabBar() {
    return Container(
      color: AppColors.cardDark,
      child: TabBar(
        controller: _tab,
        indicatorColor: AppColors.primary,
        labelColor: AppColors.primary,
        unselectedLabelColor: AppColors.textSecondary,
        labelStyle: const TextStyle(fontFamily: 'Poppins', fontSize: 13),
        tabs: const [Tab(text: 'Reyting'), Tab(text: 'Mening Statsim')],
      ),
    );
  }

  Widget _buildPeriodSelector() {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      child: Row(
        children: _periods.map((p) {
          final isActive = _period == p.$1;
          return GestureDetector(
            onTap: () { setState(() => _period = p.$1); _load(); },
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              margin: const EdgeInsets.only(right: 8),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
              decoration: BoxDecoration(
                color: isActive ? AppColors.primary : AppColors.cardDark,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: isActive ? AppColors.primary : AppColors.dividerDark),
              ),
              child: Text(p.$2, style: TextStyle(color: isActive ? Colors.white : AppColors.textSecondary, fontFamily: 'Poppins', fontSize: 12, fontWeight: isActive ? FontWeight.bold : FontWeight.normal)),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildList(ScrollController controller) {
    if (_list.isEmpty) {
      return const Center(child: Text('Hali muxlislar yo\'q', style: TextStyle(color: AppColors.textSecondary, fontFamily: 'Poppins')));
    }
    return ListView.builder(
      controller: controller,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      itemCount: _list.length,
      itemBuilder: (_, i) {
        final s = _list[i];
        return Container(
          margin: const EdgeInsets.only(bottom: 8),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(color: AppColors.cardDark, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.dividerDark)),
          child: Row(
            children: [
              SizedBox(width: 26, child: Text('${i + 1}', textAlign: TextAlign.center, style: const TextStyle(color: AppColors.textSecondary, fontFamily: 'Poppins', fontWeight: FontWeight.bold))),
              const SizedBox(width: 8),
              UserAvatar(avatarUrl: s['avatar'] as String?, size: 36, isOnline: false),
              const SizedBox(width: 10),
              Expanded(child: Text(s['displayName'] as String? ?? '---', style: const TextStyle(color: Colors.white, fontFamily: 'Poppins', fontWeight: FontWeight.w600))),
              Text('🪙 ${s['totalGiftValue'] ?? '0'}', style: const TextStyle(color: AppColors.coin, fontWeight: FontWeight.bold, fontFamily: 'Poppins', fontSize: 13)),
            ],
          ),
        ).animate(delay: Duration(milliseconds: i * 40)).fadeIn(duration: 250.ms);
      },
    );
  }
}
