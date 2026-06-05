import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import 'package:shimmer/shimmer.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/providers/auth_provider.dart';
import '../../../../core/constants/api_constants.dart';

class PolicyScreen extends ConsumerStatefulWidget {
  final String slug;

  const PolicyScreen({super.key, required this.slug});

  @override
  ConsumerState<PolicyScreen> createState() => _PolicyScreenState();
}

class _PolicyScreenState extends ConsumerState<PolicyScreen> {
  bool _loading = true;
  String _title = '';
  String _content = '';
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadPolicy();
  }

  String get _screenTitle {
    switch (widget.slug) {
      case 'privacy-policy':
        return 'Maxfiylik siyosati';
      case 'terms-of-service':
        return 'Foydalanish shartlari';
      default:
        return _title.isNotEmpty ? _title : 'Siyosat';
    }
  }

  Future<void> _loadPolicy() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final api = ref.read(apiClientProvider);
      final response = await api.get(
        '${ApiConstants.supportPolicies}/${widget.slug}',
        queryParameters: {'language': 'uz'},
      );
      final data = response.data as Map<String, dynamic>? ?? {};
      if (mounted) {
        setState(() {
          _title = (data['title'] as String?) ?? _screenTitle;
          _content = (data['content'] as String?) ?? '';
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _loading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        title: Text(
          _screenTitle,
          style: const TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.bold,
          ),
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, color: Colors.white),
          onPressed: () => context.pop(),
        ),
      ),
      body: _loading
          ? _buildShimmer()
          : _error != null
              ? _buildError()
              : _buildContent(),
    );
  }

  Widget _buildContent() {
    final lines = _content.split('\n');
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (_title.isNotEmpty)
            Text(
              _title,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
            ).animate().fadeIn(duration: 300.ms),
          if (_title.isNotEmpty) const SizedBox(height: 16),
          ...lines.asMap().entries.map((entry) {
            final i = entry.key;
            final line = entry.value.trim();
            if (line.isEmpty) return const SizedBox(height: 8);

            // Heading-like lines (ALL CAPS or starts with digit+dot)
            final isHeading = line == line.toUpperCase() && line.length > 3 ||
                RegExp(r'^\d+\.').hasMatch(line);

            return Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Text(
                line,
                style: TextStyle(
                  color: isHeading ? Colors.white : Colors.white70,
                  fontSize: isHeading ? 15 : 14,
                  fontWeight:
                      isHeading ? FontWeight.bold : FontWeight.normal,
                  height: 1.6,
                ),
              ),
            ).animate().fadeIn(
                  duration: 250.ms,
                  delay: Duration(milliseconds: i * 20),
                );
          }),
          const SizedBox(height: 40),
        ],
      ),
    );
  }

  Widget _buildError() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.error_outline, color: Colors.white38, size: 48),
          const SizedBox(height: 16),
          const Text(
            "Yuklab bo'lmadi",
            style: TextStyle(color: Colors.white70, fontSize: 16),
          ),
          const SizedBox(height: 8),
          TextButton(
            onPressed: _loadPolicy,
            child: const Text(
              "Qayta urinish",
              style: TextStyle(color: AppColors.primary),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildShimmer() {
    return Shimmer.fromColors(
      baseColor: AppColors.card,
      highlightColor: AppColors.surface,
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              height: 24,
              width: 200,
              decoration: BoxDecoration(
                color: AppColors.card,
                borderRadius: BorderRadius.circular(6),
              ),
            ),
            const SizedBox(height: 20),
            ...List.generate(
              12,
              (i) => Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: Container(
                  height: 14,
                  width: i % 3 == 0
                      ? MediaQuery.of(context).size.width * 0.6
                      : double.infinity,
                  decoration: BoxDecoration(
                    color: AppColors.card,
                    borderRadius: BorderRadius.circular(6),
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
