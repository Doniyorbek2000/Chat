import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shimmer/shimmer.dart';

import '../../../../core/network/api_client.dart';
import '../../../../core/theme/app_colors.dart';

// ---------------------------------------------------------------------------
// Providers
// ---------------------------------------------------------------------------

enum RoomSortOption { hot, newest, mostGifts, vipOnly }

final _roomListSortProvider =
    StateProvider<RoomSortOption>((ref) => RoomSortOption.hot);

final _roomListCategoryProvider = StateProvider<String>((ref) => 'All');

final _roomListProvider =
    StateNotifierProvider<_RoomListNotifier, AsyncValue<List<Map<String, dynamic>>>>(
        (ref) => _RoomListNotifier(ref));

class _RoomListNotifier
    extends StateNotifier<AsyncValue<List<Map<String, dynamic>>>> {
  final Ref _ref;
  int _page = 1;
  bool _hasMore = true;

  _RoomListNotifier(this._ref) : super(const AsyncValue.loading()) {
    load();
  }

  Future<void> load({int page = 1, String category = 'All', String sort = 'hot'}) async {
    if (page == 1) {
      _page = 1;
      _hasMore = true;
      state = const AsyncValue.loading();
    }
    try {
      final api = _ref.read(apiClientProvider);
      final catParam = category != 'All' ? '&category=${category.toLowerCase()}' : '';
      final sortParam = sort == 'hot' ? '' : '&sort=$sort';
      final res = await api.get('/rooms/feed?page=$page&limit=20$catParam$sortParam');
      final data = res.data;
      final List<dynamic> raw = (data is Map ? data['data'] ?? data['rooms'] ?? [] : data) as List;
      final rooms = raw.map((e) => Map<String, dynamic>.from(e as Map)).toList();
      _hasMore = rooms.length >= 20;
      if (page == 1) {
        state = AsyncValue.data(rooms);
      } else {
        final prev = state.value ?? [];
        state = AsyncValue.data([...prev, ...rooms]);
      }
      _page = page;
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> loadMore(String category, String sort) async {
    if (!_hasMore || state is AsyncLoading) return;
    await load(page: _page + 1, category: category, sort: sort);
  }
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

class RoomListScreen extends ConsumerStatefulWidget {
  const RoomListScreen({super.key});

  @override
  ConsumerState<RoomListScreen> createState() => _RoomListScreenState();
}

class _RoomListScreenState extends ConsumerState<RoomListScreen> {
  final _scrollCtrl = ScrollController();

  @override
  void initState() {
    super.initState();
    _scrollCtrl.addListener(_onScroll);
  }

  void _onScroll() {
    if (_scrollCtrl.position.pixels >= _scrollCtrl.position.maxScrollExtent - 200) {
      final category = ref.read(_roomListCategoryProvider);
      final sort = ref.read(_roomListSortProvider).name;
      ref.read(_roomListProvider.notifier).loadMore(category, sort);
    }
  }

  @override
  void dispose() {
    _scrollCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final rooms = ref.watch(_roomListProvider);

    return Scaffold(
      backgroundColor: AppColors.backgroundDark,
      appBar: AppBar(
        backgroundColor: AppColors.surfaceDark,
        elevation: 0,
        title: const Text(
          'Rooms',
          style: TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.bold,
            fontFamily: 'Poppins',
          ),
        ),
        actions: [
          PopupMenuButton<RoomSortOption>(
            icon: const Icon(Icons.filter_list, color: AppColors.textSecondary),
            color: AppColors.cardDark,
            shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12)),
            onSelected: (option) {
              ref.read(_roomListSortProvider.notifier).state = option;
              final cat = ref.read(_roomListCategoryProvider);
              ref.read(_roomListProvider.notifier).load(category: cat, sort: option.name);
            },
            itemBuilder: (_) => [
              _buildPopupItem(RoomSortOption.hot, 'Hot', Icons.local_fire_department),
              _buildPopupItem(RoomSortOption.newest, 'New', Icons.fiber_new),
              _buildPopupItem(
                  RoomSortOption.mostGifts, 'Most Gifts', Icons.card_giftcard),
              _buildPopupItem(RoomSortOption.vipOnly, 'VIP Only',
                  Icons.workspace_premium),
            ],
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(48),
          child: _buildCategoryChips(),
        ),
      ),
      body: RefreshIndicator(
        color: AppColors.primary,
        backgroundColor: AppColors.cardDark,
        onRefresh: () {
          final category = ref.read(_roomListCategoryProvider);
          final sort = ref.read(_roomListSortProvider).name;
          return ref.read(_roomListProvider.notifier).load(category: category, sort: sort);
        },
        child: rooms.when(
          loading: () => _buildShimmer(),
          error: (_, __) => _buildErrorState(),
          data: (list) => ListView.builder(
            controller: _scrollCtrl,
            padding: const EdgeInsets.symmetric(vertical: 8),
            itemCount: list.length,
            itemBuilder: (ctx, i) =>
                _RoomListItem(room: list[i], index: i),
          ),
        ),
      ),
    );
  }

  PopupMenuItem<RoomSortOption> _buildPopupItem(
      RoomSortOption value, String label, IconData icon) {
    return PopupMenuItem(
      value: value,
      child: Row(
        children: [
          Icon(icon, color: AppColors.textSecondary, size: 18),
          const SizedBox(width: 8),
          Text(label,
              style: const TextStyle(
                  color: Colors.white, fontFamily: 'Poppins')),
        ],
      ),
    );
  }

  Widget _buildCategoryChips() {
    final selected = ref.watch(_roomListCategoryProvider);
    final categories = [
      'All', 'Music', 'Gaming', 'Study', 'Talk', 'Comedy', 'VIP'
    ];

    return Container(
      height: 48,
      color: AppColors.surfaceDark,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        itemCount: categories.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (ctx, i) {
          final cat = categories[i];
          final isSelected = selected == cat;
          return GestureDetector(
            onTap: () {
              ref.read(_roomListCategoryProvider.notifier).state = cat;
              final sort = ref.read(_roomListSortProvider).name;
              ref.read(_roomListProvider.notifier).load(category: cat, sort: sort);
            },
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
              decoration: BoxDecoration(
                gradient: isSelected ? AppColors.primaryGradient : null,
                color: isSelected ? null : AppColors.cardDark,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Text(
                cat,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
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

  Widget _buildShimmer() {
    return Shimmer.fromColors(
      baseColor: AppColors.cardDark,
      highlightColor: AppColors.elevatedDark,
      child: ListView.builder(
        padding: const EdgeInsets.symmetric(vertical: 8),
        itemCount: 8,
        itemBuilder: (_, __) => Container(
          margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
          height: 80,
          decoration: BoxDecoration(
            color: AppColors.cardDark,
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      ),
    );
  }

  Widget _buildErrorState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.error_outline, size: 64, color: AppColors.error),
          const SizedBox(height: 16),
          Text('Failed to load rooms',
              style: TextStyle(
                  color: AppColors.textSecondary, fontFamily: 'Poppins')),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: () {
              final cat = ref.read(_roomListCategoryProvider);
              final sort = ref.read(_roomListSortProvider).name;
              ref.read(_roomListProvider.notifier).load(category: cat, sort: sort);
            },
            style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary),
            child: const Text('Retry'),
          ),
        ],
      ),
    );
  }
}

class _RoomListItem extends StatelessWidget {
  final Map<String, dynamic> room;
  final int index;

  const _RoomListItem({required this.room, required this.index});

  @override
  Widget build(BuildContext context) {
    final String id = room['id'] as String? ?? '';
    final String title = room['title'] as String? ?? 'Room';
    final String? cover = room['cover'] as String?;
    final String hostName = room['hostName'] as String? ?? 'Host';
    final String? hostAvatar = room['hostAvatar'] as String?;
    final int viewerCount = room['viewerCount'] as int? ?? 0;
    final bool isVip = room['isVip'] as bool? ?? false;
    final String type = room['type'] as String? ?? 'Public';

    return GestureDetector(
      onTap: () => context.push('/rooms/$id'),
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: AppColors.cardDark,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.dividerDark),
        ),
        child: Row(
          children: [
            // Cover
            ClipRRect(
              borderRadius: BorderRadius.circular(10),
              child: SizedBox(
                width: 60,
                height: 60,
                child: cover != null
                    ? CachedNetworkImage(
                        imageUrl: cover,
                        fit: BoxFit.cover,
                        errorWidget: (_, __, ___) =>
                            _buildPlaceholder(),
                      )
                    : _buildPlaceholder(),
              ),
            ),
            const SizedBox(width: 12),
            // Info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          title,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w600,
                            fontSize: 14,
                            fontFamily: 'Poppins',
                          ),
                        ),
                      ),
                      _buildTypeBadge(type, isVip),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      if (hostAvatar != null)
                        ClipOval(
                          child: SizedBox(
                            width: 18,
                            height: 18,
                            child: CachedNetworkImage(
                              imageUrl: hostAvatar,
                              fit: BoxFit.cover,
                              errorWidget: (_, __, ___) => const Icon(
                                  Icons.person,
                                  size: 14,
                                  color: AppColors.textTertiary),
                            ),
                          ),
                        ),
                      const SizedBox(width: 4),
                      Text(
                        hostName,
                        style: TextStyle(
                          color: AppColors.textSecondary,
                          fontSize: 12,
                          fontFamily: 'Poppins',
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Icon(Icons.remove_red_eye_outlined,
                          size: 13,
                          color: AppColors.textTertiary),
                      const SizedBox(width: 3),
                      Text(
                        _formatCount(viewerCount),
                        style: TextStyle(
                          color: AppColors.textTertiary,
                          fontSize: 12,
                          fontFamily: 'Poppins',
                        ),
                      ),
                      const SizedBox(width: 10),
                      _LiveDot(),
                      const SizedBox(width: 3),
                      Text(
                        'LIVE',
                        style: TextStyle(
                          color: AppColors.error,
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          fontFamily: 'Poppins',
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            Icon(Icons.chevron_right, color: AppColors.textTertiary),
          ],
        ),
      ).animate().fadeIn(
            delay: Duration(milliseconds: index * 50),
            duration: 300.ms,
          ),
    );
  }

  Widget _buildPlaceholder() {
    return Container(
      color: AppColors.elevatedDark,
      child: const Icon(Icons.mic, color: Colors.white38, size: 24),
    );
  }

  Widget _buildTypeBadge(String type, bool isVip) {
    Color color = AppColors.info;
    if (type == 'VIP' || isVip) color = AppColors.vip3;
    if (type == 'Private') color = AppColors.error;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: color.withOpacity(0.15),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withOpacity(0.5)),
      ),
      child: Text(
        isVip ? 'VIP' : type,
        style: TextStyle(
          color: color,
          fontSize: 10,
          fontWeight: FontWeight.bold,
          fontFamily: 'Poppins',
        ),
      ),
    );
  }

  String _formatCount(int count) {
    if (count >= 1000) return '${(count / 1000).toStringAsFixed(1)}k';
    return count.toString();
  }
}

class _LiveDot extends StatefulWidget {
  @override
  State<_LiveDot> createState() => _LiveDotState();
}

class _LiveDotState extends State<_LiveDot>
    with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: Tween<double>(begin: 0.4, end: 1.0).animate(_ctrl),
      child: Container(
        width: 6,
        height: 6,
        decoration: const BoxDecoration(
          color: AppColors.error,
          shape: BoxShape.circle,
        ),
      ),
    );
  }
}
