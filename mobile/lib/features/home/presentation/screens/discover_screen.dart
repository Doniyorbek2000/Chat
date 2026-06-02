import 'dart:async';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shimmer/shimmer.dart';
import 'package:smooth_page_indicator/smooth_page_indicator.dart';

import '../../../../core/router/app_router.dart';
import '../../../../core/theme/app_colors.dart';
import '../widgets/room_card_widget.dart';

// ---------------------------------------------------------------------------
// Providers
// ---------------------------------------------------------------------------

enum RoomCategory { all, hot, newRooms, vip, family }

final _selectedCategoryProvider =
    StateProvider<RoomCategory>((ref) => RoomCategory.all);

final _searchQueryProvider = StateProvider<String>((ref) => '');

final _isSearchExpandedProvider = StateProvider<bool>((ref) => false);

final _discoverRoomsProvider =
    StateNotifierProvider<_DiscoverRoomsNotifier, AsyncValue<List<Map<String, dynamic>>>>(
        (ref) => _DiscoverRoomsNotifier());

class _DiscoverRoomsNotifier
    extends StateNotifier<AsyncValue<List<Map<String, dynamic>>>> {
  _DiscoverRoomsNotifier() : super(const AsyncValue.loading()) {
    load();
  }

  Future<void> load() async {
    state = const AsyncValue.loading();
    await Future.delayed(const Duration(milliseconds: 800));
    state = AsyncValue.data(_mockRooms());
  }

  Future<void> refresh() async {
    await Future.delayed(const Duration(milliseconds: 600));
    state = AsyncValue.data(_mockRooms());
  }

  List<Map<String, dynamic>> _mockRooms() {
    return List.generate(12, (i) => {
          'id': 'room_$i',
          'title': _titles[i % _titles.length],
          'cover': 'https://picsum.photos/seed/room$i/400/300',
          'hostName': 'Host ${i + 1}',
          'hostAvatar': 'https://api.dicebear.com/7.x/avataaars/png?seed=host$i',
          'viewerCount': (i + 1) * 47 + i * 13,
          'isVip': i % 3 == 0,
          'isLive': true,
          'category': RoomCategory.values[i % RoomCategory.values.length].name,
        });
  }

  static const _titles = [
    'Chill Vibes Only',
    'Music & Talk',
    'Night Lounge',
    'Language Exchange',
    'Gaming Zone',
    'Study Session',
    'Late Night Crew',
    'Poetry Corner',
    'Business Talk',
    'Fitness Motivation',
    'Comedy Hour',
    'Travel Stories',
  ];
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

class DiscoverScreen extends ConsumerStatefulWidget {
  const DiscoverScreen({super.key});

  @override
  ConsumerState<DiscoverScreen> createState() => _DiscoverScreenState();
}

class _DiscoverScreenState extends ConsumerState<DiscoverScreen> {
  final _searchController = TextEditingController();
  final _bannerController = PageController();
  Timer? _bannerTimer;
  int _bannerIndex = 0;

  final _banners = [
    {
      'image': 'https://picsum.photos/seed/banner1/800/300',
      'title': 'Top Hosts Live Now',
      'subtitle': 'Join the biggest rooms',
    },
    {
      'image': 'https://picsum.photos/seed/banner2/800/300',
      'title': 'VIP Room Night',
      'subtitle': 'Exclusive experience',
    },
    {
      'image': 'https://picsum.photos/seed/banner3/800/300',
      'title': 'Weekly Leaderboard',
      'subtitle': 'Compete for top rank',
    },
  ];

  @override
  void initState() {
    super.initState();
    _startBannerTimer();
  }

  void _startBannerTimer() {
    _bannerTimer = Timer.periodic(const Duration(seconds: 4), (_) {
      if (!mounted) return;
      _bannerIndex = (_bannerIndex + 1) % _banners.length;
      _bannerController.animateToPage(
        _bannerIndex,
        duration: const Duration(milliseconds: 400),
        curve: Curves.easeInOut,
      );
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    _bannerController.dispose();
    _bannerTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final rooms = ref.watch(_discoverRoomsProvider);
    final isExpanded = ref.watch(_isSearchExpandedProvider);

    return Scaffold(
      backgroundColor: AppColors.backgroundDark,
      body: RefreshIndicator(
        color: AppColors.primary,
        backgroundColor: AppColors.cardDark,
        onRefresh: () => ref.read(_discoverRoomsProvider.notifier).refresh(),
        child: CustomScrollView(
          slivers: [
            SliverToBoxAdapter(child: _buildAppBar(isExpanded)),
            if (isExpanded)
              SliverToBoxAdapter(child: _buildSearchBar()),
            SliverToBoxAdapter(child: _buildCategoryChips()),
            SliverToBoxAdapter(child: _buildBannerCarousel()),
            SliverToBoxAdapter(child: _buildLiveNowHeader()),
            rooms.when(
              loading: () => SliverToBoxAdapter(child: _buildShimmer()),
              error: (_, __) => SliverToBoxAdapter(child: _buildErrorState()),
              data: (list) {
                if (list.isEmpty) {
                  return SliverToBoxAdapter(child: _buildEmptyState());
                }
                return SliverPadding(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  sliver: SliverGrid(
                    gridDelegate:
                        const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      crossAxisSpacing: 12,
                      mainAxisSpacing: 12,
                      childAspectRatio: 0.8,
                    ),
                    delegate: SliverChildBuilderDelegate(
                      (ctx, i) => RoomCardWidget(
                        room: list[i],
                        onTap: () =>
                            context.push('/rooms/${list[i]['id']}'),
                      ).animate().fadeIn(
                            delay: Duration(milliseconds: i * 60),
                            duration: 300.ms,
                          ),
                      childCount: list.length,
                    ),
                  ),
                );
              },
            ),
            const SliverToBoxAdapter(child: SizedBox(height: 24)),
          ],
        ),
      ),
    );
  }

  Widget _buildAppBar(bool isExpanded) {
    return Padding(
      padding: EdgeInsets.only(
        top: MediaQuery.of(context).padding.top + 8,
        left: 16,
        right: 16,
        bottom: 8,
      ),
      child: Row(
        children: [
          ShaderMask(
            shaderCallback: (bounds) =>
                AppColors.primaryGradient.createShader(bounds),
            child: const Text(
              'VOXO',
              style: TextStyle(
                fontSize: 26,
                fontWeight: FontWeight.bold,
                color: Colors.white,
                fontFamily: 'Poppins',
                letterSpacing: 2,
              ),
            ),
          ),
          const Spacer(),
          IconButton(
            icon: AnimatedSwitcher(
              duration: const Duration(milliseconds: 200),
              child: Icon(
                isExpanded ? Icons.close : Icons.search,
                key: ValueKey(isExpanded),
                color: AppColors.textSecondary,
              ),
            ),
            onPressed: () {
              ref.read(_isSearchExpandedProvider.notifier).state = !isExpanded;
              if (!isExpanded) {
                _searchController.clear();
              }
            },
          ),
          Stack(
            clipBehavior: Clip.none,
            children: [
              IconButton(
                icon: const Icon(Icons.notifications_outlined,
                    color: AppColors.textSecondary),
                onPressed: () => context.push(AppRoutes.notifications),
              ),
              Positioned(
                top: 8,
                right: 8,
                child: Container(
                  width: 10,
                  height: 10,
                  decoration: const BoxDecoration(
                    color: AppColors.error,
                    shape: BoxShape.circle,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSearchBar() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 300),
        child: TextField(
          controller: _searchController,
          autofocus: true,
          style: const TextStyle(color: Colors.white, fontFamily: 'Poppins'),
          onChanged: (v) =>
              ref.read(_searchQueryProvider.notifier).state = v,
          decoration: InputDecoration(
            hintText: 'Search rooms, hosts...',
            hintStyle: TextStyle(color: AppColors.textTertiary),
            prefixIcon:
                Icon(Icons.search, color: AppColors.textTertiary),
            filled: true,
            fillColor: AppColors.cardDark,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide.none,
            ),
            contentPadding: const EdgeInsets.symmetric(vertical: 12),
          ),
        ),
      ).animate().fadeIn(duration: 250.ms).slideY(begin: -0.2),
    );
  }

  Widget _buildCategoryChips() {
    final selected = ref.watch(_selectedCategoryProvider);
    final categories = [
      (RoomCategory.all, 'All', null),
      (RoomCategory.hot, 'Hot', '🔥'),
      (RoomCategory.newRooms, 'New', '✨'),
      (RoomCategory.vip, 'VIP', '👑'),
      (RoomCategory.family, 'Family', '👨‍👩‍👧'),
    ];

    return SizedBox(
      height: 44,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: categories.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (ctx, i) {
          final (cat, label, emoji) = categories[i];
          final isSelected = selected == cat;
          return GestureDetector(
            onTap: () =>
                ref.read(_selectedCategoryProvider.notifier).state = cat,
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              padding:
                  const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                gradient: isSelected ? AppColors.primaryGradient : null,
                color: isSelected ? null : AppColors.cardDark,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                  color: isSelected
                      ? Colors.transparent
                      : AppColors.dividerDark,
                ),
              ),
              child: Text(
                emoji != null ? '$emoji $label' : label,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight:
                      isSelected ? FontWeight.w600 : FontWeight.normal,
                  color: isSelected ? Colors.white : AppColors.textSecondary,
                  fontFamily: 'Poppins',
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildBannerCarousel() {
    return Column(
      children: [
        const SizedBox(height: 12),
        SizedBox(
          height: 160,
          child: PageView.builder(
            controller: _bannerController,
            onPageChanged: (i) => setState(() => _bannerIndex = i),
            itemCount: _banners.length,
            itemBuilder: (ctx, i) {
              final banner = _banners[i];
              return Container(
                margin: const EdgeInsets.symmetric(horizontal: 16),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.primary.withOpacity(0.2),
                      blurRadius: 16,
                      offset: const Offset(0, 8),
                    ),
                  ],
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(16),
                  child: Stack(
                    fit: StackFit.expand,
                    children: [
                      CachedNetworkImage(
                        imageUrl: banner['image']!,
                        fit: BoxFit.cover,
                        placeholder: (_, __) => Container(
                          color: AppColors.cardDark,
                        ),
                      ),
                      Container(
                        decoration: const BoxDecoration(
                          gradient: LinearGradient(
                            colors: [Colors.transparent, Color(0xD0000000)],
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                          ),
                        ),
                      ),
                      Positioned(
                        left: 16,
                        bottom: 16,
                        right: 16,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              banner['title']!,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                                fontFamily: 'Poppins',
                              ),
                            ),
                            Text(
                              banner['subtitle']!,
                              style: TextStyle(
                                color: AppColors.textSecondary,
                                fontSize: 13,
                                fontFamily: 'Poppins',
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
        const SizedBox(height: 10),
        AnimatedSmoothIndicator(
          activeIndex: _bannerIndex,
          count: _banners.length,
          effect: ExpandingDotsEffect(
            dotHeight: 6,
            dotWidth: 6,
            activeDotColor: AppColors.primary,
            dotColor: AppColors.dividerDark,
          ),
        ),
        const SizedBox(height: 8),
      ],
    );
  }

  Widget _buildLiveNowHeader() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        children: [
          _PulsingDot(),
          const SizedBox(width: 8),
          const Text(
            'Live Now',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: Colors.white,
              fontFamily: 'Poppins',
            ),
          ),
          const Spacer(),
          GestureDetector(
            onTap: () => context.push(AppRoutes.rooms),
            child: Text(
              'See all',
              style: TextStyle(
                fontSize: 13,
                color: AppColors.primary,
                fontFamily: 'Poppins',
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildShimmer() {
    return Shimmer.fromColors(
      baseColor: AppColors.cardDark,
      highlightColor: AppColors.elevatedDark,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        child: GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
            childAspectRatio: 0.8,
          ),
          itemCount: 6,
          itemBuilder: (_, __) => Container(
            decoration: BoxDecoration(
              color: AppColors.cardDark,
              borderRadius: BorderRadius.circular(12),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Padding(
      padding: const EdgeInsets.all(40),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.mic_off_outlined,
              size: 72, color: AppColors.textTertiary),
          const SizedBox(height: 16),
          Text(
            'No rooms live right now',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w600,
              color: AppColors.textSecondary,
              fontFamily: 'Poppins',
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Be the first to go live!',
            style: TextStyle(
              fontSize: 14,
              color: AppColors.textTertiary,
              fontFamily: 'Poppins',
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorState() {
    return Padding(
      padding: const EdgeInsets.all(40),
      child: Column(
        children: [
          Icon(Icons.error_outline, size: 64, color: AppColors.error),
          const SizedBox(height: 16),
          Text(
            'Failed to load rooms',
            style: TextStyle(
                color: AppColors.textSecondary, fontFamily: 'Poppins'),
          ),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: () =>
                ref.read(_discoverRoomsProvider.notifier).load(),
            style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary),
            child: const Text('Retry'),
          ),
        ],
      ),
    );
  }
}

class _PulsingDot extends StatefulWidget {
  @override
  State<_PulsingDot> createState() => _PulsingDotState();
}

class _PulsingDotState extends State<_PulsingDot>
    with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  late Animation<double> _scale;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1000),
    )..repeat(reverse: true);
    _scale = Tween<double>(begin: 0.8, end: 1.2).animate(
      CurvedAnimation(parent: _ctrl, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ScaleTransition(
      scale: _scale,
      child: Container(
        width: 10,
        height: 10,
        decoration: const BoxDecoration(
          color: AppColors.success,
          shape: BoxShape.circle,
        ),
      ),
    );
  }
}
