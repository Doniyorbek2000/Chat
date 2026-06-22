import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/network/api_client.dart';

class ShopItem {
  final String id;
  final String category;
  final String title;
  final String? description;
  final String imageUrl;
  final int priceCoins;
  final int priceDiamonds;
  final int? durationDays;
  final bool isPermanent;
  final int vipRequired;
  final String? nobleRequired;
  final int levelRequired;
  final String grade;
  final bool isActive;
  final bool owned;
  final UserShopItem? userItem;

  const ShopItem({
    required this.id,
    required this.category,
    required this.title,
    this.description,
    required this.imageUrl,
    required this.priceCoins,
    required this.priceDiamonds,
    this.durationDays,
    required this.isPermanent,
    required this.vipRequired,
    this.nobleRequired,
    required this.levelRequired,
    required this.grade,
    required this.isActive,
    this.owned = false,
    this.userItem,
  });

  factory ShopItem.fromJson(Map<String, dynamic> json) => ShopItem(
        id: json['id'] as String,
        category: json['category'] as String,
        title: json['title'] as String,
        description: json['description'] as String?,
        imageUrl: json['imageUrl'] as String? ?? '',
        priceCoins: json['priceCoins'] as int? ?? 0,
        priceDiamonds: json['priceDiamonds'] as int? ?? 0,
        durationDays: json['durationDays'] as int?,
        isPermanent: json['isPermanent'] as bool? ?? false,
        vipRequired: json['vipRequired'] as int? ?? 0,
        nobleRequired: json['nobleRequired'] as String?,
        levelRequired: json['levelRequired'] as int? ?? 0,
        grade: json['grade'] as String? ?? 'C',
        isActive: json['isActive'] as bool? ?? true,
        owned: json['owned'] as bool? ?? false,
        userItem: json['userItem'] != null
            ? UserShopItem.fromJson(
                json['userItem'] as Map<String, dynamic>)
            : null,
      );
}

class UserShopItem {
  final String itemId;
  final DateTime purchasedAt;
  final DateTime? expiresAt;
  final bool isEquipped;

  const UserShopItem({
    required this.itemId,
    required this.purchasedAt,
    this.expiresAt,
    required this.isEquipped,
  });

  factory UserShopItem.fromJson(Map<String, dynamic> json) => UserShopItem(
        itemId: json['itemId'] as String,
        purchasedAt: DateTime.parse(json['purchasedAt'] as String),
        expiresAt: json['expiresAt'] != null
            ? DateTime.parse(json['expiresAt'] as String)
            : null,
        isEquipped: json['isEquipped'] as bool? ?? false,
      );

  bool get isExpired =>
      expiresAt != null && expiresAt!.isBefore(DateTime.now());
}

const _categoryConfig = {
  'FRAME': {'label': 'Ramka', 'icon': Icons.crop_square},
  'ENTRANCE_EFFECT': {'label': 'Kirish', 'icon': Icons.auto_awesome},
  'CHAT_BUBBLE': {'label': 'Chat', 'icon': Icons.chat_bubble_outline},
  'MIC_DECORATION': {'label': 'Mik', 'icon': Icons.mic},
  'VEHICLE': {'label': 'Transport', 'icon': Icons.directions_car},
  'ROOM_THEME': {'label': 'Xona', 'icon': Icons.style},
  'PROFILE_BACKGROUND': {'label': 'Fon', 'icon': Icons.image},
  'NAMEPLATE': {'label': 'Ism plita', 'icon': Icons.badge},
  'NOBLE_BADGE': {'label': 'Badge', 'icon': Icons.verified},
  'GIFT_SKIN': {'label': 'Sovg\'a teri', 'icon': Icons.card_giftcard},
};

const _gradeColors = {
  'SS': Color(0xFFFF4444),
  'S': Color(0xFFFF8C00),
  'A': Color(0xFFFFD700),
  'B': Color(0xFF00CED1),
  'C': Color(0xFF808080),
};

class ShopScreen extends ConsumerStatefulWidget {
  const ShopScreen({super.key});

  @override
  ConsumerState<ShopScreen> createState() => _ShopScreenState();
}

class _ShopScreenState extends ConsumerState<ShopScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;
  final _categories = _categoryConfig.keys.toList();

  Map<String, List<ShopItem>> _itemsByCategory = {};
  bool _loading = true;
  bool _buying = false;
  String? _equipping;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: _categories.length, vsync: this);
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
      final res = await api.get('/shop/items');
      final raw = (res.data['data'] ?? res.data) as List;
      final items =
          raw.map((e) => ShopItem.fromJson(e as Map<String, dynamic>)).toList();
      if (mounted) {
        final byCategory = <String, List<ShopItem>>{};
        for (final cat in _categories) {
          byCategory[cat] =
              items.where((i) => i.category == cat).toList();
        }
        setState(() => _itemsByCategory = byCategory);
      }
    } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _buy(ShopItem item) async {
    setState(() => _buying = true);
    try {
      final api = ref.read(apiClientProvider);
      await api.post('/shop/items/${item.id}/buy');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('${item.title} sotib olindi!'),
            backgroundColor: AppColors.success,
          ),
        );
        await _load();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Amaliyot bajarilmadi'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _buying = false);
    }
  }

  Future<void> _toggleEquip(ShopItem item) async {
    if (_equipping != null) return;
    setState(() => _equipping = item.id);
    try {
      final api = ref.read(apiClientProvider);
      final isEquipped = item.userItem?.isEquipped ?? false;
      if (isEquipped) {
        await api.delete('/shop/items/${item.id}/equip');
      } else {
        await api.post('/shop/items/${item.id}/equip');
      }
      if (mounted) await _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('$e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _equipping = null);
    }
  }

  void _showItemDetail(ShopItem item) {
    final gradeColor = _gradeColors[item.grade] ?? const Color(0xFF808080);
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF1A1A2E),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => Padding(
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
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                gradient: RadialGradient(
                  colors: [
                    gradeColor.withOpacity(0.3),
                    Colors.transparent,
                  ],
                ),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: gradeColor.withOpacity(0.5)),
              ),
              child: const Icon(
                Icons.image_outlined,
                color: Colors.white54,
                size: 40,
              ),
            ),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  item.title,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(width: 8),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: gradeColor.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: gradeColor.withOpacity(0.5)),
                  ),
                  child: Text(
                    item.grade,
                    style: TextStyle(
                      color: gradeColor,
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
            if (item.description != null) ...[
              const SizedBox(height: 6),
              Text(
                item.description!,
                style: const TextStyle(color: Colors.white54, fontSize: 13),
                textAlign: TextAlign.center,
              ),
            ],
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                if (item.priceCoins > 0) ...[
                  const Icon(Icons.monetization_on,
                      color: Colors.amber, size: 16),
                  const SizedBox(width: 4),
                  Text(
                    '${item.priceCoins}',
                    style: const TextStyle(
                      color: Colors.amber,
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
                if (item.priceDiamonds > 0) ...[
                  const SizedBox(width: 16),
                  const Icon(Icons.diamond, color: Colors.cyan, size: 16),
                  const SizedBox(width: 4),
                  Text(
                    '${item.priceDiamonds}',
                    style: const TextStyle(
                      color: Colors.cyan,
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ],
            ),
            if (!item.isPermanent && item.durationDays != null) ...[
              const SizedBox(height: 4),
              Text(
                '${item.durationDays} kun amal qiladi',
                style: const TextStyle(color: Colors.white38, fontSize: 12),
              ),
            ],
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: item.owned
                  ? ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: (item.userItem?.isEquipped ?? false)
                            ? Colors.white12
                            : AppColors.primary,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                      ),
                      onPressed: _equipping != null
                          ? null
                          : () {
                              Navigator.pop(ctx);
                              _toggleEquip(item);
                            },
                      child: Text(
                        (item.userItem?.isEquipped ?? false)
                            ? 'Yechish'
                            : 'Kiyish',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    )
                  : ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: gradeColor,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                      ),
                      onPressed: _buying
                          ? null
                          : () {
                              Navigator.pop(ctx);
                              _buy(item);
                            },
                      child: Text(
                        item.priceCoins > 0
                            ? 'Sotib olish — ${item.priceCoins} tanga'
                            : 'Sotib olish — ${item.priceDiamonds} olmos',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundDark,
      body: NestedScrollView(
        headerSliverBuilder: (ctx, inner) => [
          SliverAppBar(
            expandedHeight: 120,
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
                      Color(0xFF1A0050),
                      Color(0xFF0A0A1A),
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
                        'Do\'kon',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            bottom: TabBar(
              controller: _tabController,
              isScrollable: true,
              labelColor: Colors.white,
              unselectedLabelColor: Colors.white38,
              indicatorColor: AppColors.primary,
              indicatorWeight: 2,
              tabs: _categories.map((cat) {
                final cfg = _categoryConfig[cat]!;
                return Tab(
                  child: Text(
                    cfg['label'] as String,
                    style: const TextStyle(fontSize: 12),
                  ),
                );
              }).toList(),
            ),
          ),
        ],
        body: _loading
            ? const Center(child: CircularProgressIndicator())
            : TabBarView(
                controller: _tabController,
                children: _categories.map((cat) {
                  final items = _itemsByCategory[cat] ?? [];
                  if (items.isEmpty) {
                    return const Center(
                      child: Text(
                        'Mahsulotlar mavjud emas',
                        style: TextStyle(color: Colors.white38),
                      ),
                    );
                  }
                  return GridView.builder(
                    padding: const EdgeInsets.all(12),
                    gridDelegate:
                        const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 3,
                      childAspectRatio: 0.72,
                      crossAxisSpacing: 10,
                      mainAxisSpacing: 10,
                    ),
                    itemCount: items.length,
                    itemBuilder: (ctx, i) =>
                        _ShopItemCard(
                          item: items[i],
                          onTap: () => _showItemDetail(items[i]),
                          equipping: _equipping == items[i].id,
                        )
                            .animate(delay: Duration(milliseconds: i * 40))
                            .fadeIn(duration: 300.ms)
                            .scale(begin: const Offset(0.9, 0.9)),
                  );
                }).toList(),
              ),
      ),
    );
  }
}

class _ShopItemCard extends StatelessWidget {
  final ShopItem item;
  final VoidCallback onTap;
  final bool equipping;

  const _ShopItemCard({
    required this.item,
    required this.onTap,
    required this.equipping,
  });

  @override
  Widget build(BuildContext context) {
    final gradeColor = _gradeColors[item.grade] ?? const Color(0xFF808080);
    final isEquipped = item.userItem?.isEquipped ?? false;

    return GestureDetector(
      onTap: onTap,
      child: Container(
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
            Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  width: 56,
                  height: 56,
                  margin: const EdgeInsets.symmetric(horizontal: 8),
                  decoration: BoxDecoration(
                    gradient: RadialGradient(
                      colors: [
                        gradeColor.withOpacity(0.2),
                        Colors.transparent,
                      ],
                    ),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(
                    Icons.image_outlined,
                    color: Colors.white24,
                    size: 28,
                  ),
                ),
                const SizedBox(height: 6),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 6),
                  child: Text(
                    item.title,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 11,
                      fontWeight: FontWeight.w500,
                    ),
                    maxLines: 2,
                    textAlign: TextAlign.center,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                const SizedBox(height: 4),
                if (item.owned)
                  Text(
                    isEquipped ? 'Kiyilgan' : 'Mavjud',
                    style: TextStyle(
                      color: isEquipped ? AppColors.primary : AppColors.success,
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                    ),
                  )
                else
                  Text(
                    item.priceCoins > 0
                        ? '${item.priceCoins} tanga'
                        : '${item.priceDiamonds} olmos',
                    style: const TextStyle(
                      color: Colors.amber,
                      fontSize: 10,
                    ),
                  ),
              ],
            ),
            Positioned(
              top: 6,
              right: 6,
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                decoration: BoxDecoration(
                  color: gradeColor.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(4),
                  border: Border.all(color: gradeColor.withOpacity(0.5)),
                ),
                child: Text(
                  item.grade,
                  style: TextStyle(
                    color: gradeColor,
                    fontSize: 9,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
            if (equipping)
              Positioned.fill(
                child: Container(
                  decoration: BoxDecoration(
                    color: Colors.black54,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Center(
                    child: SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
