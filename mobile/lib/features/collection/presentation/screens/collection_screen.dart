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

const _categoryConfig = [
  {'key': 'FRAME', 'label': 'Ramka', 'icon': Icons.crop_square},
  {'key': 'ENTRANCE_EFFECT', 'label': 'Kirish', 'icon': Icons.auto_awesome},
  {'key': 'VEHICLE', 'label': 'Transport', 'icon': Icons.directions_car},
  {'key': 'MIC_DECORATION', 'label': 'Mikrofon', 'icon': Icons.mic},
  {'key': 'CHAT_BUBBLE', 'label': 'Chat', 'icon': Icons.chat_bubble_outline},
  {'key': 'MEDAL', 'label': 'Medal', 'icon': Icons.military_tech},
  {'key': 'ROOM_THEME', 'label': 'Xona mavzusi', 'icon': Icons.style},
  {'key': 'NAMEPLATE', 'label': 'Ismlik taxtasi', 'icon': Icons.badge},
];

class CollectionItem {
  final String id;
  final String title;
  final String grade;
  final String category;
  final bool isEquipped;
  final String? imageUrl;

  const CollectionItem({
    required this.id,
    required this.title,
    required this.grade,
    required this.category,
    required this.isEquipped,
    this.imageUrl,
  });
}

class CollectionScreen extends ConsumerStatefulWidget {
  const CollectionScreen({super.key});

  @override
  ConsumerState<CollectionScreen> createState() => _CollectionScreenState();
}

class _CollectionScreenState extends ConsumerState<CollectionScreen> {
  bool _loading = true;
  String _selectedCategory = 'FRAME';

  // Raw collection data
  Map<String, dynamic> _shopItems = {};
  List<dynamic> _vehicles = [];
  List<dynamic> _medals = [];
  List<dynamic> _nameplates = [];
  List<dynamic> _roomThemes = [];

  // Grade counts aggregated
  Map<String, int> _gradeCounts = {};

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final api = ref.read(apiClientProvider);
      final res = await api.get('/collection/me');
      final data = res.data['data'] ?? res.data;

      if (mounted && data is Map) {
        final shopItemsData = data['shopItems'] as Map<String, dynamic>? ?? {};
        final vehiclesData = data['vehicles'] as Map<String, dynamic>? ?? {};
        final medalsData = data['medals'] as Map<String, dynamic>? ?? {};
        final nameplatesData =
            data['nameplates'] as Map<String, dynamic>? ?? {};
        final roomThemesData =
            data['roomThemes'] as Map<String, dynamic>? ?? {};

        final vehicles =
            (vehiclesData['items'] as List?) ?? [];
        final medals = (medalsData['items'] as List?) ?? [];
        final nameplates =
            (nameplatesData['items'] as List?) ?? [];
        final roomThemes =
            (roomThemesData['items'] as List?) ?? [];

        // Aggregate grade counts
        final gradeCounts = <String, int>{
          'SS': 0,
          'S': 0,
          'A': 0,
          'B': 0,
          'C': 0,
        };

        void countGrades(List items) {
          for (final item in items) {
            if (item is Map) {
              final grade =
                  (item['grade'] as String?) ?? 'C';
              gradeCounts[grade] =
                  (gradeCounts[grade] ?? 0) + 1;
            }
          }
        }

        final byCategory =
            shopItemsData['byCategory'] as Map<String, dynamic>? ?? {};
        for (final catItems in byCategory.values) {
          if (catItems is List) countGrades(catItems);
        }
        countGrades(vehicles);
        countGrades(medals);
        countGrades(nameplates);
        countGrades(roomThemes);

        // Also count from byGrade if available
        final shopByGrade =
            shopItemsData['byGrade'] as Map<String, dynamic>?;
        if (shopByGrade != null) {
          for (final entry in shopByGrade.entries) {
            final grade = entry.key;
            if (entry.value is List) {
              gradeCounts[grade] =
                  (gradeCounts[grade] ?? 0) +
                      (entry.value as List).length;
            }
          }
        }

        setState(() {
          _shopItems = shopItemsData;
          _vehicles = vehicles;
          _medals = medals;
          _nameplates = nameplates;
          _roomThemes = roomThemes;
          _gradeCounts = gradeCounts;
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content: Text('Xatolik: $e'), backgroundColor: Colors.red),
        );
      }
    }
    if (mounted) setState(() => _loading = false);
  }

  List<CollectionItem> _getItemsForCategory(String category) {
    List<dynamic> raw = [];

    if (category == 'VEHICLE') {
      raw = _vehicles;
    } else if (category == 'MEDAL') {
      raw = _medals;
    } else if (category == 'NAMEPLATE') {
      raw = _nameplates;
    } else if (category == 'ROOM_THEME') {
      raw = _roomThemes;
    } else {
      final byCategory =
          _shopItems['byCategory'] as Map<String, dynamic>? ?? {};
      raw = (byCategory[category] as List?) ?? [];
    }

    return raw.map((item) {
      if (item is! Map<String, dynamic>) {
        return CollectionItem(
          id: '',
          title: 'Unknown',
          grade: 'C',
          category: category,
          isEquipped: false,
        );
      }
      return CollectionItem(
        id: item['id'] as String? ?? '',
        title: (item['title'] as String?) ??
            (item['name'] as String?) ??
            'Item',
        grade: item['grade'] as String? ?? 'C',
        category: category,
        isEquipped: item['isEquipped'] as bool? ?? false,
        imageUrl: item['imageUrl'] as String?,
      );
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundDark,
      appBar: AppBar(
        backgroundColor: AppColors.surfaceDark,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, color: Colors.white),
          onPressed: () => context.pop(),
        ),
        title: const Text(
          'Kolleksiyam',
          style: TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.bold,
            fontFamily: 'Poppins',
          ),
        ),
        elevation: 0,
      ),
      body: _loading
          ? const Center(
              child: CircularProgressIndicator(color: AppColors.primary),
            )
          : Column(
              children: [
                _buildGradeStatsRow(),
                _buildCategoryFilter(),
                Expanded(child: _buildItemList()),
              ],
            ),
    );
  }

  Widget _buildGradeStatsRow() {
    final grades = ['SS', 'S', 'A', 'B', 'C'];
    return Container(
      color: AppColors.surfaceDark,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: grades.map((grade) {
          final color = _gradeColors[grade] ?? const Color(0xFF808080);
          final count = _gradeCounts[grade] ?? 0;
          return Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: color.withOpacity(0.15),
                  shape: BoxShape.circle,
                  border: Border.all(color: color.withOpacity(0.4)),
                ),
                child: Center(
                  child: Text(
                    grade,
                    style: TextStyle(
                      color: color,
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 4),
              Text(
                '$count',
                style: TextStyle(
                  color: color,
                  fontSize: 13,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          );
        }).toList(),
      ),
    ).animate().fadeIn(duration: 300.ms);
  }

  Widget _buildCategoryFilter() {
    return SizedBox(
      height: 52,
      child: ListView.separated(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        scrollDirection: Axis.horizontal,
        itemCount: _categoryConfig.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (ctx, i) {
          final cfg = _categoryConfig[i];
          final key = cfg['key'] as String;
          final label = cfg['label'] as String;
          final selected = key == _selectedCategory;
          return GestureDetector(
            onTap: () => setState(() => _selectedCategory = key),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              padding:
                  const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
              decoration: BoxDecoration(
                color:
                    selected ? AppColors.primary : AppColors.cardDark,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                  color: selected
                      ? AppColors.primary
                      : AppColors.dividerDark,
                ),
              ),
              child: Text(
                label,
                style: TextStyle(
                  color: selected ? Colors.white : Colors.white54,
                  fontSize: 12,
                  fontWeight: selected
                      ? FontWeight.bold
                      : FontWeight.normal,
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildItemList() {
    final items = _getItemsForCategory(_selectedCategory);

    if (items.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.inventory_2_outlined,
              color: Colors.white24,
              size: 64,
            ),
            const SizedBox(height: 16),
            const Text(
              'Hali hech narsa yo\'q',
              style: TextStyle(
                color: Colors.white38,
                fontSize: 15,
              ),
            ),
          ],
        ),
      );
    }

    return GridView.builder(
      padding: const EdgeInsets.all(12),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 3,
        childAspectRatio: 0.78,
        crossAxisSpacing: 10,
        mainAxisSpacing: 10,
      ),
      itemCount: items.length,
      itemBuilder: (ctx, i) {
        final item = items[i];
        final gradeColor =
            _gradeColors[item.grade] ?? const Color(0xFF808080);

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
              color: item.isEquipped
                  ? AppColors.primary
                  : gradeColor.withOpacity(0.3),
              width: item.isEquipped ? 1.5 : 1,
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
                            gradeColor.withOpacity(0.2),
                            Colors.transparent,
                          ],
                        ),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(
                        Icons.image_outlined,
                        color: Colors.white24,
                        size: 26,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      item.title,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 10,
                        fontWeight: FontWeight.w500,
                      ),
                      maxLines: 2,
                      textAlign: TextAlign.center,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      item.isEquipped ? 'Kiyilgan' : 'Jihozlash',
                      style: TextStyle(
                        color: item.isEquipped
                            ? AppColors.success
                            : Colors.white38,
                        fontSize: 9,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
              Positioned(
                top: 5,
                right: 5,
                child: Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 4, vertical: 1),
                  decoration: BoxDecoration(
                    color: gradeColor.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(4),
                    border: Border.all(
                        color: gradeColor.withOpacity(0.5)),
                  ),
                  child: Text(
                    item.grade,
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
        )
            .animate(delay: Duration(milliseconds: i * 40))
            .fadeIn(duration: 300.ms)
            .scale(begin: const Offset(0.9, 0.9));
      },
    );
  }
}
