import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shimmer/shimmer.dart';
import 'package:smooth_page_indicator/smooth_page_indicator.dart';

import '../../../../core/network/api_client.dart';
import '../../../../core/providers/auth_provider.dart';
import '../../../../core/router/app_router.dart';
import '../../../../core/theme/app_colors.dart';
import 'home_screen.dart';

String _flag(String? code) {
  if (code == null) return '';
  const m = {
    'UZ': '🇺🇿', 'KG': '🇰🇬', 'KZ': '🇰🇿', 'TR': '🇹🇷',
    'RU': '🇷🇺', 'US': '🇺🇸', 'GB': '🇬🇧',
  };
  return m[code.toUpperCase()] ?? '🌐';
}

class HomeFeedScreen extends ConsumerStatefulWidget {
  const HomeFeedScreen({super.key});

  @override
  ConsumerState<HomeFeedScreen> createState() => _HomeFeedScreenState();
}

class _HomeFeedScreenState extends ConsumerState<HomeFeedScreen> {
  final _scrollCtrl = ScrollController();
  final _bannerCtrl = PageController();

  List<Map<String, dynamic>> _banners = [];
  List<Map<String, dynamic>> _categories = [];
  List<Map<String, dynamic>> _rooms = [];

  String _selectedCountry = '';
  int _bannerPage = 0;
  int _page = 1;
  bool _loading = false;
  bool _hasMore = true;
  bool _initialLoad = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _scrollCtrl.addListener(_onScroll);
    _loadAll();
  }

  @override
  void dispose() {
    _scrollCtrl.dispose();
    _bannerCtrl.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollCtrl.position.pixels >= _scrollCtrl.position.maxScrollExtent - 300) {
      if (!_loading && _hasMore) _loadRooms();
    }
  }

  Future<void> _loadAll() async {
    _page = 1;
    _hasMore = true;
    _error = null;
    setState(() => _loading = true);
    try {
      final api = ref.read(apiClientProvider);
      final results = await Future.wait([
        api.get('/home/banners?placement=HOME'),
        api.get('/home/categories'),
        api.get('/rooms/feed?page=1&limit=20${_selectedCountry.isNotEmpty ? "&country=$_selectedCountry" : ""}'),
      ]);
      if (!mounted) return;
      final bd = results[0].data['data'] ?? results[0].data;
      final cd = results[1].data['data'] ?? results[1].data;
      final rd = results[2].data['data'] ?? results[2].data;
      final roomItems = rd is Map ? (rd['items'] ?? rd) : rd;
      setState(() {
        _banners = (bd is List ? bd : []).map((e) => Map<String, dynamic>.from(e as Map)).toList();
        _categories = (cd is List ? cd : []).map((e) => Map<String, dynamic>.from(e as Map)).toList();
        _rooms = (roomItems is List ? roomItems : []).map((e) => Map<String, dynamic>.from(e as Map)).toList();
        _hasMore = _rooms.length >= 20;
        _page = 2;
        _initialLoad = false;
        _loading = false;
      });
    } catch (e) {
      if (mounted) setState(() { _error = e.toString(); _loading = false; _initialLoad = false; });
    }
  }

  Future<void> _loadRooms() async {
    if (_loading) return;
    setState(() => _loading = true);
    try {
      final api = ref.read(apiClientProvider);
      final country = _selectedCountry.isNotEmpty ? '&country=$_selectedCountry' : '';
      final res = await api.get('/rooms/feed?page=$_page&limit=20$country');
      if (!mounted) return;
      final data = res.data['data'] ?? res.data;
      final items = data is Map ? (data['items'] ?? data) : data;
      final newRooms = (items is List ? items : []).map((e) => Map<String, dynamic>.from(e as Map)).toList();
      setState(() {
        _rooms.addAll(newRooms);
        _hasMore = newRooms.length >= 20;
        _page++;
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _joinRoom(String roomId) async {
    try {
      final api = ref.read(apiClientProvider);
      await api.post('/rooms/$roomId/join');
    } catch (_) {}
    if (mounted) context.push('/rooms/$roomId');
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(currentUserProvider);
    return Scaffold(
      backgroundColor: AppColors.backgroundDark,
      body: SafeArea(
        child: Column(
          children: [
            _TopBar(user: user, onSearchTap: () => context.push(AppRoutes.search)),
            Expanded(
              child: RefreshIndicator(
                color: AppColors.primary,
                onRefresh: _loadAll,
                child: _initialLoad
                    ? _buildSkeleton()
                    : _error != null
                        ? _buildError()
                        : CustomScrollView(
                            controller: _scrollCtrl,
                            slivers: [
                              if (_banners.isNotEmpty)
                                SliverToBoxAdapter(child: _buildBanners()),
                              if (_categories.isNotEmpty)
                                SliverToBoxAdapter(child: _buildCategories()),
                              SliverToBoxAdapter(child: _buildCountryFilter()),
                              if (_rooms.isEmpty && !_loading)
                                const SliverFillRemaining(
                                  child: _EmptyRooms(),
                                )
                              else
                                SliverPadding(
                                  padding: const EdgeInsets.all(12),
                                  sliver: SliverGrid(
                                    delegate: SliverChildBuilderDelegate(
                                      (ctx, i) => _RoomCard(
                                        room: _rooms[i],
                                        index: i,
                                        onTap: () => _joinRoom(_rooms[i]['id'] as String),
                                      ),
                                      childCount: _rooms.length,
                                    ),
                                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                                      crossAxisCount: 2,
                                      mainAxisSpacing: 10,
                                      crossAxisSpacing: 10,
                                      childAspectRatio: 0.82,
                                    ),
                                  ),
                                ),
                              if (_loading && !_initialLoad)
                                const SliverToBoxAdapter(
                                  child: Padding(
                                    padding: EdgeInsets.all(16),
                                    child: Center(child: CircularProgressIndicator(color: AppColors.primary, strokeWidth: 2)),
                                  ),
                                ),
                            ],
                          ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBanners() {
    return Column(children: [
      SizedBox(
        height: 155,
        child: PageView.builder(
          controller: _bannerCtrl,
          itemCount: _banners.length,
          onPageChanged: (i) => setState(() => _bannerPage = i),
          itemBuilder: (ctx, i) {
            final b = _banners[i];
            return Container(
              margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: CachedNetworkImage(
                  imageUrl: b['imageUrl'] as String? ?? '',
                  fit: BoxFit.cover,
                  errorWidget: (_, __, ___) => Container(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(colors: [AppColors.primary.withOpacity(0.6), AppColors.backgroundDark]),
                    ),
                    child: Center(child: Text(b['title'] as String? ?? '', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18))),
                  ),
                ),
              ),
            );
          },
        ),
      ),
      if (_banners.length > 1)
        Padding(
          padding: const EdgeInsets.only(bottom: 4),
          child: AnimatedSmoothIndicator(
            activeIndex: _bannerPage,
            count: _banners.length,
            effect: ExpandingDotsEffect(
              dotHeight: 5, dotWidth: 5, expansionFactor: 3,
              activeDotColor: AppColors.primary, dotColor: Colors.white24,
            ),
          ),
        ),
    ]);
  }

  Widget _buildCategories() {
    return SizedBox(
      height: 86,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 12),
        itemCount: _categories.length,
        separatorBuilder: (_, __) => const SizedBox(width: 10),
        itemBuilder: (ctx, i) {
          final cat = _categories[i];
          return GestureDetector(
            onTap: () {},
            child: Container(
              width: 74,
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.06),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: Colors.white.withOpacity(0.08)),
              ),
              child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                Text(cat['icon'] as String? ?? '🎯', style: const TextStyle(fontSize: 26)),
                const SizedBox(height: 4),
                Text(cat['label'] as String? ?? '', style: const TextStyle(color: Colors.white70, fontSize: 11), textAlign: TextAlign.center, maxLines: 1, overflow: TextOverflow.ellipsis),
              ]),
            ),
          );
        },
      ),
    );
  }

  Widget _buildCountryFilter() {
    const countries = [
      {'label': 'Issiq', 'value': ''},
      {'label': 'Global', 'value': 'GLOBAL'},
      {'label': 'O\'zbekiston', 'value': 'UZ'},
      {'label': 'Qirg\'iziston', 'value': 'KG'},
      {'label': 'Qozog\'iston', 'value': 'KZ'},
      {'label': 'Turkiya', 'value': 'TR'},
    ];
    return SizedBox(
      height: 46,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 12),
        itemCount: countries.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (ctx, i) {
          final c = countries[i];
          final sel = _selectedCountry == c['value'];
          return GestureDetector(
            onTap: () { setState(() => _selectedCountry = c['value']!); _loadAll(); },
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              decoration: BoxDecoration(
                color: sel ? AppColors.primary : Colors.white.withOpacity(0.06),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: sel ? AppColors.primary : Colors.white.withOpacity(0.1)),
              ),
              child: Text(c['label']!, style: TextStyle(color: sel ? Colors.white : Colors.white54, fontSize: 13, fontWeight: sel ? FontWeight.w600 : FontWeight.normal)),
            ),
          );
        },
      ),
    );
  }

  Widget _buildSkeleton() {
    return Shimmer.fromColors(
      baseColor: Colors.white.withOpacity(0.05),
      highlightColor: Colors.white.withOpacity(0.12),
      child: GridView.builder(
        padding: const EdgeInsets.all(12),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 2, mainAxisSpacing: 10, crossAxisSpacing: 10, childAspectRatio: 0.82),
        itemCount: 8,
        itemBuilder: (_, __) => Container(decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14))),
      ),
    );
  }

  Widget _buildError() {
    return Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
      const Icon(Icons.error_outline, color: Colors.red54, size: 52),
      const SizedBox(height: 12),
      const Text('Xatolik yuz berdi', style: TextStyle(color: Colors.white54, fontSize: 16)),
      const SizedBox(height: 12),
      ElevatedButton(
        style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
        onPressed: _loadAll,
        child: const Text('Qayta urinish'),
      ),
    ]));
  }
}

class _TopBar extends StatelessWidget {
  final dynamic user;
  final VoidCallback onSearchTap;
  const _TopBar({required this.user, required this.onSearchTap});

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 56,
      padding: const EdgeInsets.symmetric(horizontal: 14),
      child: Row(children: [
        GestureDetector(
          onTap: () => ProviderScope.containerOf(context).read(homeTabIndexProvider.notifier).state = 3,
          child: CircleAvatar(
            radius: 18,
            backgroundColor: AppColors.primary.withOpacity(0.3),
            backgroundImage: user?.avatar != null ? CachedNetworkImageProvider(user!.avatar!) : null,
            child: user?.avatar == null ? const Icon(Icons.person, color: Colors.white70, size: 18) : null,
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: GestureDetector(
            onTap: onSearchTap,
            child: Container(
              height: 36,
              decoration: BoxDecoration(color: Colors.white.withOpacity(0.06), borderRadius: BorderRadius.circular(18)),
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: const Row(children: [
                Icon(Icons.search, color: Colors.white38, size: 18),
                SizedBox(width: 8),
                Text('Qidirish...', style: TextStyle(color: Colors.white38, fontSize: 14)),
              ]),
            ),
          ),
        ),
        const SizedBox(width: 8),
        GestureDetector(
          onTap: () => context.push(AppRoutes.createRoom),
          child: Container(
            width: 36, height: 36,
            decoration: BoxDecoration(
              gradient: const LinearGradient(colors: [AppColors.primary, Color(0xFF7B2FBE)]),
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(Icons.add, color: Colors.white, size: 20),
          ),
        ),
      ]),
    );
  }
}

class _RoomCard extends StatelessWidget {
  final Map<String, dynamic> room;
  final int index;
  final VoidCallback onTap;
  const _RoomCard({required this.room, required this.index, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final owner = room['owner'] as Map<String, dynamic>? ?? {};
    final memberCount = room['memberCount'] as int? ?? room['onlineCount'] as int? ?? 0;
    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.cardDark,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: Colors.white.withOpacity(0.06)),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Expanded(
            flex: 3,
            child: ClipRRect(
              borderRadius: const BorderRadius.vertical(top: Radius.circular(14)),
              child: Stack(fit: StackFit.expand, children: [
                room['coverImage'] != null
                    ? CachedNetworkImage(imageUrl: room['coverImage'] as String, fit: BoxFit.cover, errorWidget: (_, __, ___) => _defaultCover())
                    : _defaultCover(),
                Positioned(bottom: 6, right: 6, child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                  decoration: BoxDecoration(color: Colors.black54, borderRadius: BorderRadius.circular(8)),
                  child: Row(mainAxisSize: MainAxisSize.min, children: [
                    const Icon(Icons.people, color: Colors.white70, size: 10),
                    const SizedBox(width: 3),
                    Text('$memberCount', style: const TextStyle(color: Colors.white, fontSize: 10)),
                  ]),
                )),
                if (room['country'] != null)
                  Positioned(top: 6, left: 6, child: Text(_flag(room['country'] as String?), style: const TextStyle(fontSize: 16))),
              ]),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(8),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(room['name'] as String? ?? 'Xona', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 12), maxLines: 1, overflow: TextOverflow.ellipsis),
              const SizedBox(height: 4),
              Row(children: [
                CircleAvatar(
                  radius: 8,
                  backgroundColor: AppColors.primary.withOpacity(0.3),
                  backgroundImage: owner['avatar'] != null ? CachedNetworkImageProvider(owner['avatar'] as String) : null,
                  child: owner['avatar'] == null ? const Icon(Icons.person, size: 8, color: Colors.white) : null,
                ),
                const SizedBox(width: 4),
                Expanded(child: Text(owner['displayName'] as String? ?? 'User', style: const TextStyle(color: Colors.white54, fontSize: 10), maxLines: 1, overflow: TextOverflow.ellipsis)),
              ]),
            ]),
          ),
        ]),
      ),
    ).animate(delay: Duration(milliseconds: index * 40)).fadeIn(duration: 300.ms).scale(begin: const Offset(0.96, 0.96));
  }

  Widget _defaultCover() => Container(
    decoration: BoxDecoration(
      gradient: LinearGradient(
        colors: [AppColors.primary.withOpacity(0.4), AppColors.backgroundDark],
        begin: Alignment.topCenter, end: Alignment.bottomCenter,
      ),
    ),
    child: const Icon(Icons.mic, color: Colors.white30, size: 32),
  );
}

class _EmptyRooms extends StatelessWidget {
  const _EmptyRooms();
  @override
  Widget build(BuildContext context) => Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
    const Icon(Icons.mic_none, color: Colors.white24, size: 60),
    const SizedBox(height: 12),
    const Text('Hozir faol xona yo\'q', style: TextStyle(color: Colors.white38, fontSize: 16)),
  ]));
}
