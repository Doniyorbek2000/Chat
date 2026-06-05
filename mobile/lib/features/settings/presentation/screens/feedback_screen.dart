import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import 'package:shimmer/shimmer.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/providers/auth_provider.dart';
import '../../../../core/constants/api_constants.dart';

class FeedbackScreen extends ConsumerStatefulWidget {
  const FeedbackScreen({super.key});

  @override
  ConsumerState<FeedbackScreen> createState() => _FeedbackScreenState();
}

class _FeedbackScreenState extends ConsumerState<FeedbackScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  // Create ticket form
  String _selectedCategory = 'Texnik muammo';
  final _titleCtrl = TextEditingController();
  final _bodyCtrl = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  bool _submitting = false;

  // My tickets
  bool _loadingTickets = true;
  List<Map<String, dynamic>> _tickets = [];
  Set<String> _expandedTickets = {};

  static const _categories = [
    'Texnik muammo',
    "To'lov muammosi",
    'Hisobot',
    'Boshqa',
  ];

  static const _categoryValues = {
    'Texnik muammo': 'TECHNICAL',
    "To'lov muammosi": 'PAYMENT',
    'Hisobot': 'REPORT',
    'Boshqa': 'OTHER',
  };

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadTickets();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _titleCtrl.dispose();
    _bodyCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadTickets() async {
    setState(() => _loadingTickets = true);
    try {
      final api = ref.read(apiClientProvider);
      final response = await api.get(ApiConstants.supportTickets);
      final raw = response.data;
      List<dynamic> list = [];
      if (raw is List) {
        list = raw;
      } else if (raw is Map && raw['data'] is List) {
        list = raw['data'] as List;
      }
      if (mounted) {
        setState(() {
          _tickets = list.map((e) => e as Map<String, dynamic>).toList();
          _loadingTickets = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loadingTickets = false);
    }
  }

  Future<void> _submitTicket() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _submitting = true);
    try {
      final api = ref.read(apiClientProvider);
      await api.post(ApiConstants.supportTickets, data: {
        'category': _categoryValues[_selectedCategory] ?? 'OTHER',
        'title': _titleCtrl.text.trim(),
        'body': _bodyCtrl.text.trim(),
      });
      if (mounted) {
        _titleCtrl.clear();
        _bodyCtrl.clear();
        setState(() => _selectedCategory = 'Texnik muammo');
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text("So'rov yuborildi"),
            backgroundColor: AppColors.success,
          ),
        );
        await _loadTickets();
        _tabController.animateTo(1);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text("Xatolik: $e"),
            backgroundColor: AppColors.error,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Color _statusColor(String status) {
    switch (status.toUpperCase()) {
      case 'OPEN':
        return Colors.amber;
      case 'IN_PROGRESS':
        return AppColors.info;
      case 'RESOLVED':
        return AppColors.success;
      case 'CLOSED':
        return Colors.grey;
      default:
        return Colors.white38;
    }
  }

  String _statusLabel(String status) {
    switch (status.toUpperCase()) {
      case 'OPEN':
        return 'Ochiq';
      case 'IN_PROGRESS':
        return 'Ko\'rib chiqilmoqda';
      case 'RESOLVED':
        return 'Hal qilindi';
      case 'CLOSED':
        return 'Yopildi';
      default:
        return status;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        title: const Text(
          "Yordam markazi",
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, color: Colors.white),
          onPressed: () => context.pop(),
        ),
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: AppColors.primary,
          labelColor: AppColors.primary,
          unselectedLabelColor: Colors.white38,
          tabs: const [
            Tab(text: "Muammo yuborish"),
            Tab(text: "Mening so'rovlarim"),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildCreateTab(),
          _buildMyTicketsTab(),
        ],
      ),
    );
  }

  Widget _buildCreateTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              "Kategoriya",
              style: TextStyle(color: Colors.white54, fontSize: 12, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14),
              decoration: BoxDecoration(
                color: AppColors.card,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.white10),
              ),
              child: DropdownButtonHideUnderline(
                child: DropdownButton<String>(
                  value: _selectedCategory,
                  dropdownColor: AppColors.surface,
                  style: const TextStyle(color: Colors.white, fontSize: 14),
                  isExpanded: true,
                  icon: const Icon(Icons.expand_more, color: Colors.white38),
                  items: _categories
                      .map((c) => DropdownMenuItem(value: c, child: Text(c)))
                      .toList(),
                  onChanged: (v) {
                    if (v != null) setState(() => _selectedCategory = v);
                  },
                ),
              ),
            ),
            const SizedBox(height: 16),
            _buildField(
              label: "Sarlavha",
              controller: _titleCtrl,
              hint: "Muammoingizni qisqacha tavsiflang",
              validator: (v) =>
                  (v == null || v.trim().isEmpty) ? 'Sarlavha kiritish shart' : null,
            ),
            const SizedBox(height: 16),
            _buildField(
              label: "Tafsilot",
              controller: _bodyCtrl,
              hint: "Muammoingizni batafsil tasvirlab bering...",
              maxLines: 5,
              validator: (v) =>
                  (v == null || v.trim().isEmpty) ? 'Tafsilot kiritish shart' : null,
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
                onPressed: _submitting ? null : _submitTicket,
                child: _submitting
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          color: Colors.white,
                          strokeWidth: 2,
                        ),
                      )
                    : const Text(
                        "Yuborish",
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                        ),
                      ),
              ),
            ),
          ],
        ).animate().fadeIn(duration: 300.ms),
      ),
    );
  }

  Widget _buildMyTicketsTab() {
    if (_loadingTickets) {
      return Shimmer.fromColors(
        baseColor: AppColors.card,
        highlightColor: AppColors.surface,
        child: ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: 5,
          itemBuilder: (_, __) => Container(
            margin: const EdgeInsets.only(bottom: 12),
            height: 80,
            decoration: BoxDecoration(
              color: AppColors.card,
              borderRadius: BorderRadius.circular(14),
            ),
          ),
        ),
      );
    }

    if (_tickets.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.inbox_outlined, color: Colors.white24, size: 64),
            const SizedBox(height: 16),
            const Text(
              "So'rovlar yo'q",
              style: TextStyle(color: Colors.white54, fontSize: 16),
            ),
            const SizedBox(height: 8),
            const Text(
              "Sizning so'rovlaringiz bu yerda ko'rinadi",
              style: TextStyle(color: Colors.white38, fontSize: 13),
            ),
          ],
        ).animate().fadeIn(duration: 400.ms),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _tickets.length,
      itemBuilder: (context, index) {
        final ticket = _tickets[index];
        final id = ticket['id'] as String? ?? ticket['_id'] as String? ?? '$index';
        final title = ticket['title'] as String? ?? 'So\'rov';
        final status = ticket['status'] as String? ?? 'OPEN';
        final replies = ticket['replies'] as List? ?? [];
        final isExpanded = _expandedTickets.contains(id);

        return Container(
          margin: const EdgeInsets.only(bottom: 12),
          decoration: BoxDecoration(
            color: AppColors.card,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: Colors.white10),
          ),
          child: Column(
            children: [
              InkWell(
                onTap: () {
                  setState(() {
                    if (isExpanded) {
                      _expandedTickets.remove(id);
                    } else {
                      _expandedTickets.add(id);
                    }
                  });
                },
                borderRadius: BorderRadius.circular(14),
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              title,
                              style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.w600,
                                fontSize: 14,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 8, vertical: 2),
                              decoration: BoxDecoration(
                                color: _statusColor(status).withOpacity(0.15),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                _statusLabel(status),
                                style: TextStyle(
                                  color: _statusColor(status),
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      Icon(
                        isExpanded
                            ? Icons.keyboard_arrow_up
                            : Icons.keyboard_arrow_down,
                        color: Colors.white38,
                      ),
                    ],
                  ),
                ),
              ),
              if (isExpanded) ...[
                const Divider(color: Colors.white10, height: 1),
                if (replies.isEmpty)
                  const Padding(
                    padding: EdgeInsets.all(14),
                    child: Text(
                      "Javoblar yo'q",
                      style: TextStyle(color: Colors.white38, fontSize: 13),
                    ),
                  ),
                ...replies.map((reply) {
                  final replyMap = reply as Map<String, dynamic>;
                  final isAdmin =
                      (replyMap['role'] as String?) == 'admin' ||
                          (replyMap['isAdmin'] as bool?) == true;
                  final body = replyMap['body'] as String? ?? '';

                  return Container(
                    margin: const EdgeInsets.fromLTRB(14, 8, 14, 8),
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: isAdmin
                          ? AppColors.primary.withOpacity(0.1)
                          : AppColors.surface,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                        color: isAdmin
                            ? AppColors.primary.withOpacity(0.3)
                            : Colors.white10,
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          isAdmin ? "Qo'llab-quvvatlash" : "Siz",
                          style: TextStyle(
                            color: isAdmin ? AppColors.primary : Colors.white54,
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          body,
                          style: const TextStyle(
                            color: Colors.white70,
                            fontSize: 13,
                          ),
                        ),
                      ],
                    ),
                  );
                }),
                const SizedBox(height: 8),
              ],
            ],
          ),
        ).animate().fadeIn(duration: 300.ms);
      },
    );
  }

  Widget _buildField({
    required String label,
    required TextEditingController controller,
    String? hint,
    int maxLines = 1,
    String? Function(String?)? validator,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            color: Colors.white54,
            fontSize: 12,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 6),
        TextFormField(
          controller: controller,
          maxLines: maxLines,
          validator: validator,
          style: const TextStyle(color: Colors.white),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: const TextStyle(color: Colors.white24),
            filled: true,
            fillColor: AppColors.card,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide.none,
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide:
                  const BorderSide(color: AppColors.primary, width: 1.5),
            ),
            errorBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: AppColors.error),
            ),
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          ),
        ),
      ],
    );
  }
}
