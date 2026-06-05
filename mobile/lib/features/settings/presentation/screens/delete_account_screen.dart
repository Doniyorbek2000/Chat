import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/providers/auth_provider.dart';
import '../../../../core/constants/api_constants.dart';

class DeleteAccountScreen extends ConsumerStatefulWidget {
  const DeleteAccountScreen({super.key});

  @override
  ConsumerState<DeleteAccountScreen> createState() =>
      _DeleteAccountScreenState();
}

class _DeleteAccountScreenState extends ConsumerState<DeleteAccountScreen> {
  bool _loading = true;
  bool _submitting = false;
  bool _isScheduled = false;
  String? _scheduledAt;
  final _reasonCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _checkDeletionRequest();
  }

  @override
  void dispose() {
    _reasonCtrl.dispose();
    super.dispose();
  }

  Future<void> _checkDeletionRequest() async {
    setState(() => _loading = true);
    try {
      final api = ref.read(apiClientProvider);
      final response = await api.get(ApiConstants.settingsDeletionRequest);
      final data = response.data as Map<String, dynamic>? ?? {};
      final status = data['status'] as String?;
      if (mounted) {
        setState(() {
          _isScheduled = status == 'SCHEDULED';
          _scheduledAt = data['scheduledAt'] as String?;
          _loading = false;
        });
      }
    } catch (_) {
      // No existing request — show the form
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _requestDeletion() async {
    setState(() => _submitting = true);
    try {
      final api = ref.read(apiClientProvider);
      await api.post(ApiConstants.settingsDeletionRequest, data: {
        if (_reasonCtrl.text.trim().isNotEmpty)
          'reason': _reasonCtrl.text.trim(),
      });
      if (mounted) {
        await ref.read(authProvider.notifier).logout();
        context.go('/onboarding');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text("Xatolik: $e"),
            backgroundColor: AppColors.error,
          ),
        );
        setState(() => _submitting = false);
      }
    }
  }

  Future<void> _cancelDeletion() async {
    setState(() => _submitting = true);
    try {
      final api = ref.read(apiClientProvider);
      await api.delete(ApiConstants.settingsDeletionRequest);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text("O'chirish so'rovi bekor qilindi"),
            backgroundColor: AppColors.success,
          ),
        );
        context.pop();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text("Xatolik: $e"),
            backgroundColor: AppColors.error,
          ),
        );
        setState(() => _submitting = false);
      }
    }
  }

  String _formatDate(String? iso) {
    if (iso == null) return '';
    try {
      final dt = DateTime.parse(iso).toLocal();
      return '${dt.day.toString().padLeft(2, '0')}.${dt.month.toString().padLeft(2, '0')}.${dt.year}';
    } catch (_) {
      return iso;
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
          "Hisobni o'chirish",
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, color: Colors.white),
          onPressed: () => context.pop(),
        ),
      ),
      body: _loading
          ? const Center(
              child: CircularProgressIndicator(color: AppColors.primary),
            )
          : _isScheduled
              ? _buildCancellationView()
              : _buildDeletionForm(),
    );
  }

  Widget _buildDeletionForm() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Warning icon
          Center(
            child: Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: AppColors.error.withOpacity(0.1),
                shape: BoxShape.circle,
                border: Border.all(
                  color: AppColors.error.withOpacity(0.3),
                  width: 2,
                ),
              ),
              child: const Icon(
                Icons.warning_amber_rounded,
                color: AppColors.error,
                size: 40,
              ),
            ),
          ).animate().fadeIn(duration: 300.ms).scale(begin: const Offset(0.8, 0.8)),

          const SizedBox(height: 24),

          const Text(
            "Hisobni o'chirish haqida",
            style: TextStyle(
              color: Colors.white,
              fontSize: 20,
              fontWeight: FontWeight.bold,
            ),
            textAlign: TextAlign.center,
          ).animate().fadeIn(duration: 350.ms).slideY(begin: 0.05),

          const SizedBox(height: 16),

          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.error.withOpacity(0.08),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.error.withOpacity(0.2)),
            ),
            child: const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  "Diqqat! Quyidagilar o'chiriladi:",
                  style: TextStyle(
                    color: AppColors.error,
                    fontWeight: FontWeight.bold,
                    fontSize: 13,
                  ),
                ),
                SizedBox(height: 8),
                _BulletPoint("Profil ma'lumotlaringiz"),
                _BulletPoint("Barcha xabarlaringiz"),
                _BulletPoint("Hamyon balansingiz va tarixingiz"),
                _BulletPoint("Oila va juft aloqalaringiz"),
                _BulletPoint("Barcha sovg'alar va mukofotlaringiz"),
              ],
            ),
          ).animate().fadeIn(duration: 400.ms),

          const SizedBox(height: 16),

          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.amber.withOpacity(0.08),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.amber.withOpacity(0.2)),
            ),
            child: Row(
              children: [
                const Icon(Icons.schedule, color: Colors.amber, size: 18),
                const SizedBox(width: 10),
                const Expanded(
                  child: Text(
                    "So'rov yuborilgandan 30 kun o'tib hisobingiz o'chiriladi. Bu davr ichida bekor qilishingiz mumkin.",
                    style: TextStyle(color: Colors.amber, fontSize: 13),
                  ),
                ),
              ],
            ),
          ).animate().fadeIn(duration: 450.ms),

          const SizedBox(height: 24),

          const Text(
            "Sabab (ixtiyoriy)",
            style: TextStyle(
              color: Colors.white54,
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _reasonCtrl,
            maxLines: 3,
            style: const TextStyle(color: Colors.white),
            decoration: InputDecoration(
              hintText: "Nima uchun ketmoqchisiz?",
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
                    const BorderSide(color: AppColors.error, width: 1.5),
              ),
              contentPadding: const EdgeInsets.all(14),
            ),
          ).animate().fadeIn(duration: 500.ms),

          const SizedBox(height: 32),

          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.error,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
              onPressed: _submitting ? null : _showConfirmDialog,
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
                      "Hisobni o'chirish",
                      style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
            ),
          ).animate().fadeIn(duration: 550.ms),

          const SizedBox(height: 40),
        ],
      ),
    );
  }

  Widget _buildCancellationView() {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              color: Colors.amber.withOpacity(0.1),
              shape: BoxShape.circle,
              border: Border.all(color: Colors.amber.withOpacity(0.3), width: 2),
            ),
            child: const Icon(
              Icons.schedule,
              color: Colors.amber,
              size: 40,
            ),
          ).animate().fadeIn(duration: 300.ms).scale(begin: const Offset(0.8, 0.8)),

          const SizedBox(height: 24),

          const Text(
            "Hisob o'chirilishi rejalashtirilgan",
            style: TextStyle(
              color: Colors.white,
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
            textAlign: TextAlign.center,
          ).animate().fadeIn(duration: 350.ms),

          const SizedBox(height: 12),

          if (_scheduledAt != null)
            Text(
              "O'chirish sanasi: ${_formatDate(_scheduledAt)}",
              style: const TextStyle(color: Colors.white54, fontSize: 14),
              textAlign: TextAlign.center,
            ).animate().fadeIn(duration: 400.ms),

          const SizedBox(height: 32),

          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.success,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
              onPressed: _submitting ? null : _cancelDeletion,
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
                      "Bekor qilish",
                      style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
            ),
          ).animate().fadeIn(duration: 450.ms),
        ],
      ),
    );
  }

  void _showConfirmDialog() {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: AppColors.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text(
          "Tasdiqlang",
          style: TextStyle(color: Colors.red),
        ),
        content: const Text(
          "Haqiqatan ham hisobingizni o'chirmoqchimisiz? So'rov 30 kun ichida amalga oshiriladi.",
          style: TextStyle(color: Colors.white70),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Bekor qilish'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () {
              Navigator.pop(context);
              _requestDeletion();
            },
            child: const Text(
              "Ha, o'chirish",
              style: TextStyle(color: Colors.white),
            ),
          ),
        ],
      ),
    );
  }
}

class _BulletPoint extends StatelessWidget {
  final String text;
  const _BulletPoint(this.text);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('• ',
              style: TextStyle(color: AppColors.error, fontSize: 13)),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(color: Colors.white60, fontSize: 13),
            ),
          ),
        ],
      ),
    );
  }
}
