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

class NameplateModel {
  final String id;
  final String name;
  final String description;
  final String? imageUrl;
  final String grade;
  final int priceCoins;
  final int priceDiamonds;
  final int? durationDays;
  final bool isPermanent;
  final int levelRequired;
  final bool isActive;

  const NameplateModel({
    required this.id,
    required this.name,
    required this.description,
    this.imageUrl,
    required this.grade,
    required this.priceCoins,
    required this.priceDiamonds,
    this.durationDays,
    required this.isPermanent,
    required this.levelRequired,
    required this.isActive,
  });

  factory NameplateModel.fromJson(Map<String, dynamic> json) => NameplateModel(
        id: json['id'] as String,
        name: json['name'] as String,
        description: json['description'] as String? ?? '',
        imageUrl: json['imageUrl'] as String?,
        grade: json['grade'] as String? ?? 'C',
        priceCoins: json['priceCoins'] as int? ?? 0,
        priceDiamonds: json['priceDiamonds'] as int? ?? 0,
        durationDays: json['durationDays'] as int?,
        isPermanent: json['isPermanent'] as bool? ?? false,
        levelRequired: json['levelRequired'] as int? ?? 0,
        isActive: json['isActive'] as bool? ?? true,
      );
}

class UserNameplateModel {
  final String id;
  final String nameplateId;
  final DateTime purchasedAt;
  final DateTime? expiresAt;
  final bool isEquipped;
  final NameplateModel? nameplate;

  const UserNameplateModel({
    required this.id,
    required this.nameplateId,
    required this.purchasedAt,
    this.expiresAt,
    required this.isEquipped,
    this.nameplate,
  });

  factory UserNameplateModel.fromJson(Map<String, dynamic> json) =>
      UserNameplateModel(
        id: json['id'] as String,
        nameplateId: json['nameplateId'] as String,
        purchasedAt: DateTime.parse(json['purchasedAt'] as String),
        expiresAt: json['expiresAt'] != null
            ? DateTime.parse(json['expiresAt'] as String)
            : null,
        isEquipped: json['isEquipped'] as bool? ?? false,
        nameplate: json['nameplate'] != null
            ? NameplateModel.fromJson(
                json['nameplate'] as Map<String, dynamic>)
            : null,
      );

  bool get isExpired =>
      expiresAt != null && expiresAt!.isBefore(DateTime.now());
}

class NameplateScreen extends ConsumerStatefulWidget {
  const NameplateScreen({super.key});

  @override
  ConsumerState<NameplateScreen> createState() => _NameplateScreenState();
}

class _NameplateScreenState extends ConsumerState<NameplateScreen> {
  List<NameplateModel> _nameplates = [];
  List<UserNameplateModel> _myNameplates = [];
  bool _loading = true;
  bool _actionLoading = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final api = ref.read(apiClientProvider);
      final results = await Future.wait([
        api.get('/nameplates'),
        api.get('/nameplates/me'),
      ]);

      if (mounted) {
        final rawAll =
            (results[0].data['data'] ?? results[0].data) as List;
        final rawMy =
            (results[1].data['data'] ?? results[1].data) as List;

        setState(() {
          _nameplates = rawAll
              .map((e) =>
                  NameplateModel.fromJson(e as Map<String, dynamic>))
              .where((n) => n.isActive)
              .toList();
          _myNameplates = rawMy
              .map((e) => UserNameplateModel.fromJson(
                  e as Map<String, dynamic>))
              .toList();
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

  bool _isOwned(String nameplateId) =>
      _myNameplates.any((n) => n.nameplateId == nameplateId);

  UserNameplateModel? _getUserNameplate(String nameplateId) {
    try {
      return _myNameplates.firstWhere((n) => n.nameplateId == nameplateId);
    } catch (_) {
      return null;
    }
  }

  Future<void> _buy(NameplateModel nameplate) async {
    setState(() => _actionLoading = true);
    try {
      final api = ref.read(apiClientProvider);
      await api.post('/nameplates/${nameplate.id}/buy');
      if (mounted) {
        Navigator.of(context).pop();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('${nameplate.name} sotib olindi!'),
            backgroundColor: AppColors.success,
          ),
        );
        await _load();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content: Text('Xatolik: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _actionLoading = false);
    }
  }

  Future<void> _equip(NameplateModel nameplate) async {
    setState(() => _actionLoading = true);
    try {
      final api = ref.read(apiClientProvider);
      await api.post('/nameplates/${nameplate.id}/equip');
      if (mounted) {
        Navigator.of(context).pop();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('${nameplate.name} kiyildi!'),
            backgroundColor: AppColors.success,
          ),
        );
        await _load();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content: Text('Xatolik: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _actionLoading = false);
    }
  }

  Future<void> _unequip(NameplateModel nameplate) async {
    setState(() => _actionLoading = true);
    try {
      final api = ref.read(apiClientProvider);
      await api.delete('/nameplates/active');
      if (mounted) {
        Navigator.of(context).pop();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Ismlik taxtasi yechildi!'),
            backgroundColor: AppColors.success,
          ),
        );
        await _load();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content: Text('Xatolik: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _actionLoading = false);
    }
  }

  void _showDetail(NameplateModel nameplate) {
    final gradeColor =
        _gradeColors[nameplate.grade] ?? const Color(0xFF808080);
    final owned = _isOwned(nameplate.id);
    final userNp = _getUserNameplate(nameplate.id);
    final isEquipped = userNp?.isEquipped ?? false;

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
              width: 90,
              height: 90,
              decoration: BoxDecoration(
                gradient: RadialGradient(
                  colors: [
                    gradeColor.withOpacity(0.3),
                    Colors.transparent,
                  ],
                ),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: gradeColor.withOpacity(0.5)),
              ),
              child: const Icon(
                Icons.badge_outlined,
                color: Colors.white54,
                size: 44,
              ),
            ),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  nameplate.name,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    fontFamily: 'Poppins',
                  ),
                ),
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: gradeColor.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(
                        color: gradeColor.withOpacity(0.5)),
                  ),
                  child: Text(
                    nameplate.grade,
                    style: TextStyle(
                      color: gradeColor,
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
            if (nameplate.description.isNotEmpty) ...[
              const SizedBox(height: 6),
              Text(
                nameplate.description,
                style: const TextStyle(
                    color: Colors.white54, fontSize: 13),
                textAlign: TextAlign.center,
              ),
            ],
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                if (nameplate.priceCoins > 0) ...[
                  const Icon(Icons.monetization_on,
                      color: Colors.amber, size: 16),
                  const SizedBox(width: 4),
                  Text(
                    '${nameplate.priceCoins}',
                    style: const TextStyle(
                      color: Colors.amber,
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
                if (nameplate.priceDiamonds > 0) ...[
                  const SizedBox(width: 12),
                  const Icon(Icons.diamond,
                      color: Colors.cyan, size: 16),
                  const SizedBox(width: 4),
                  Text(
                    '${nameplate.priceDiamonds}',
                    style: const TextStyle(
                      color: Colors.cyan,
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ],
            ),
            if (!nameplate.isPermanent &&
                nameplate.durationDays != null) ...[
              const SizedBox(height: 4),
              Text(
                '${nameplate.durationDays} kun amal qiladi',
                style: const TextStyle(
                    color: Colors.white38, fontSize: 12),
              ),
            ],
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: owned
                  ? ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: isEquipped
                            ? Colors.white12
                            : AppColors.primary,
                        padding:
                            const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                      ),
                      onPressed: _actionLoading
                          ? null
                          : isEquipped
                              ? () => _unequip(nameplate)
                              : () => _equip(nameplate),
                      child: _actionLoading
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                color: Colors.white,
                                strokeWidth: 2,
                              ),
                            )
                          : Text(
                              isEquipped ? 'Yechish' : 'Kiyish',
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
                        padding:
                            const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                      ),
                      onPressed: _actionLoading
                          ? null
                          : () => _buy(nameplate),
                      child: _actionLoading
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                color: Colors.white,
                                strokeWidth: 2,
                              ),
                            )
                          : Text(
                              nameplate.priceCoins > 0
                                  ? 'Sotib olish — ${nameplate.priceCoins} tanga'
                                  : 'Sotib olish — ${nameplate.priceDiamonds} olmos',
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
      appBar: AppBar(
        backgroundColor: AppColors.surfaceDark,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, color: Colors.white),
          onPressed: () => context.pop(),
        ),
        title: const Text(
          'Ismlik taxtasi',
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
          : _nameplates.isEmpty
              ? const Center(
                  child: Text(
                    'Ismlik taxtalar mavjud emas',
                    style: TextStyle(color: Colors.white38),
                  ),
                )
              : GridView.builder(
                  padding: const EdgeInsets.all(12),
                  gridDelegate:
                      const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    childAspectRatio: 0.78,
                    crossAxisSpacing: 12,
                    mainAxisSpacing: 12,
                  ),
                  itemCount: _nameplates.length,
                  itemBuilder: (ctx, i) {
                    final np = _nameplates[i];
                    final owned = _isOwned(np.id);
                    final userNp = _getUserNameplate(np.id);
                    final isEquipped = userNp?.isEquipped ?? false;
                    final gradeColor =
                        _gradeColors[np.grade] ?? const Color(0xFF808080);

                    return GestureDetector(
                      onTap: () => _showDetail(np),
                      child: Container(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: [
                              gradeColor.withOpacity(0.1),
                              AppColors.cardDark,
                            ],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(
                            color: isEquipped
                                ? AppColors.primary
                                : gradeColor.withOpacity(0.3),
                            width: isEquipped ? 1.5 : 1,
                          ),
                        ),
                        child: Stack(
                          children: [
                            Padding(
                              padding: const EdgeInsets.all(14),
                              child: Column(
                                mainAxisAlignment:
                                    MainAxisAlignment.center,
                                children: [
                                  Container(
                                    width: 64,
                                    height: 64,
                                    decoration: BoxDecoration(
                                      gradient: RadialGradient(
                                        colors: [
                                          gradeColor.withOpacity(0.25),
                                          Colors.transparent,
                                        ],
                                      ),
                                      borderRadius:
                                          BorderRadius.circular(14),
                                      border: Border.all(
                                        color: gradeColor
                                            .withOpacity(0.3),
                                      ),
                                    ),
                                    child: const Icon(
                                      Icons.badge_outlined,
                                      color: Colors.white38,
                                      size: 32,
                                    ),
                                  ),
                                  const SizedBox(height: 10),
                                  Text(
                                    np.name,
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 13,
                                      fontWeight: FontWeight.w600,
                                      fontFamily: 'Poppins',
                                    ),
                                    maxLines: 2,
                                    textAlign: TextAlign.center,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  const SizedBox(height: 6),
                                  if (owned)
                                    Container(
                                      padding:
                                          const EdgeInsets.symmetric(
                                              horizontal: 10,
                                              vertical: 4),
                                      decoration: BoxDecoration(
                                        color: isEquipped
                                            ? AppColors.success
                                                .withOpacity(0.2)
                                            : AppColors.primary
                                                .withOpacity(0.2),
                                        borderRadius:
                                            BorderRadius.circular(8),
                                        border: Border.all(
                                          color: isEquipped
                                              ? AppColors.success
                                                  .withOpacity(0.4)
                                              : AppColors.primary
                                                  .withOpacity(0.4),
                                        ),
                                      ),
                                      child: Text(
                                        isEquipped
                                            ? 'Kiyilgan'
                                            : 'Kiyish',
                                        style: TextStyle(
                                          color: isEquipped
                                              ? AppColors.success
                                              : AppColors.primaryLight,
                                          fontSize: 11,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    )
                                  else
                                    Row(
                                      mainAxisAlignment:
                                          MainAxisAlignment.center,
                                      children: [
                                        if (np.priceCoins > 0) ...[
                                          const Icon(
                                              Icons.monetization_on,
                                              color: Colors.amber,
                                              size: 13),
                                          const SizedBox(width: 3),
                                          Text(
                                            '${np.priceCoins}',
                                            style: const TextStyle(
                                              color: Colors.amber,
                                              fontSize: 12,
                                              fontWeight:
                                                  FontWeight.bold,
                                            ),
                                          ),
                                        ] else if (np.priceDiamonds >
                                            0) ...[
                                          const Icon(Icons.diamond,
                                              color: Colors.cyan,
                                              size: 13),
                                          const SizedBox(width: 3),
                                          Text(
                                            '${np.priceDiamonds}',
                                            style: const TextStyle(
                                              color: Colors.cyan,
                                              fontSize: 12,
                                              fontWeight:
                                                  FontWeight.bold,
                                            ),
                                          ),
                                        ],
                                      ],
                                    ),
                                ],
                              ),
                            ),
                            Positioned(
                              top: 8,
                              right: 8,
                              child: Container(
                                padding:
                                    const EdgeInsets.symmetric(
                                        horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color:
                                      gradeColor.withOpacity(0.2),
                                  borderRadius:
                                      BorderRadius.circular(5),
                                  border: Border.all(
                                      color: gradeColor
                                          .withOpacity(0.5)),
                                ),
                                child: Text(
                                  np.grade,
                                  style: TextStyle(
                                    color: gradeColor,
                                    fontSize: 10,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    )
                        .animate(
                            delay:
                                Duration(milliseconds: i * 50))
                        .fadeIn(duration: 350.ms)
                        .scale(begin: const Offset(0.92, 0.92));
                  },
                ),
    );
  }
}
