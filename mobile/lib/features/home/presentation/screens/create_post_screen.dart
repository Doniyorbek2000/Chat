import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/network/api_client.dart';
import '../../../../core/theme/app_colors.dart';

class CreatePostScreen extends ConsumerStatefulWidget {
  const CreatePostScreen({super.key});

  @override
  ConsumerState<CreatePostScreen> createState() => _CreatePostScreenState();
}

class _CreatePostScreenState extends ConsumerState<CreatePostScreen> {
  final _textCtrl = TextEditingController();
  bool _loading = false;

  @override
  void dispose() {
    _textCtrl.dispose();
    super.dispose();
  }

  Future<void> _post() async {
    final text = _textCtrl.text.trim();
    if (text.isEmpty) return;
    setState(() => _loading = true);
    try {
      final api = ref.read(apiClientProvider);
      await api.post('/discover/posts', data: {'text': text});
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Post qo\'shildi!'), backgroundColor: Colors.green),
        );
        context.pop();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Xatolik: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundDark,
      appBar: AppBar(
        backgroundColor: AppColors.backgroundDark,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.close, color: Colors.white),
          onPressed: () => context.pop(),
        ),
        title: const Text('Yangi post', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: TextButton(
              onPressed: _loading ? null : _post,
              child: _loading
                  ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(color: AppColors.primary, strokeWidth: 2))
                  : const Text('Ulashish', style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold)),
            ),
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: TextField(
          controller: _textCtrl,
          maxLines: null,
          maxLength: 500,
          style: const TextStyle(color: Colors.white, fontSize: 16, height: 1.5),
          autofocus: true,
          decoration: const InputDecoration(
            hintText: 'Nima haqida yozmoqchisiz?',
            hintStyle: TextStyle(color: Colors.white38, fontSize: 16),
            border: InputBorder.none,
            counterStyle: TextStyle(color: Colors.white38),
          ),
        ),
      ),
    );
  }
}
