import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../../core/theme/app_colors.dart';
import '../../../../../core/network/api_client.dart';

class RoomSettingsSheet extends ConsumerStatefulWidget {
  final String roomId;

  const RoomSettingsSheet({super.key, required this.roomId});

  static Future<void> show(BuildContext context, String roomId) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => RoomSettingsSheet(roomId: roomId),
    );
  }

  @override
  ConsumerState<RoomSettingsSheet> createState() => _RoomSettingsSheetState();
}

class _RoomSettingsSheetState extends ConsumerState<RoomSettingsSheet> {
  bool _loading = true;
  String _error = '';
  bool _slowMode = false;
  int _slowModeInterval = 5;
  bool _giftOnly = false;
  List<String> _keywords = [];
  final TextEditingController _keywordCtrl = TextEditingController();
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _keywordCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = ''; });
    try {
      final api = ref.read(apiClientProvider);
      final kRes = await api.get('/rooms/${widget.roomId}/keywords');
      final kData = kRes.data['data'] ?? kRes.data;
      if (mounted) {
        setState(() {
          _keywords = List<String>.from((kData as List? ?? []).map((e) => e['keyword']?.toString() ?? e.toString()));
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() { _error = e.toString(); _loading = false; });
    }
  }

  Future<void> _saveSlowMode() async {
    setState(() => _saving = true);
    try {
      final api = ref.read(apiClientProvider);
      await api.post('/rooms/${widget.roomId}/settings/slow-mode', data: {'isEnabled': _slowMode, 'intervalSec': _slowModeInterval});
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Sekin rejim yangilandi', style: TextStyle(fontFamily: 'Poppins')), backgroundColor: AppColors.success),
        );
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString()), backgroundColor: AppColors.error));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _saveGiftOnly() async {
    setState(() => _saving = true);
    try {
      final api = ref.read(apiClientProvider);
      await api.post('/rooms/${widget.roomId}/settings/gift-only', data: {'giftOnly': _giftOnly});
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Faqat sovg\'a rejimi yangilandi', style: TextStyle(fontFamily: 'Poppins')), backgroundColor: AppColors.success),
        );
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString()), backgroundColor: AppColors.error));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _addKeyword() async {
    final kw = _keywordCtrl.text.trim();
    if (kw.isEmpty) return;
    try {
      final api = ref.read(apiClientProvider);
      await api.post('/rooms/${widget.roomId}/keywords', data: {'keyword': kw});
      _keywordCtrl.clear();
      await _load();
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString()), backgroundColor: AppColors.error));
    }
  }

  Future<void> _removeKeyword(String kw) async {
    try {
      final api = ref.read(apiClientProvider);
      await api.delete('/rooms/${widget.roomId}/keywords/$kw');
      await _load();
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString()), backgroundColor: AppColors.error));
    }
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.7,
      maxChildSize: 0.9,
      minChildSize: 0.4,
      builder: (_, controller) => Container(
        decoration: const BoxDecoration(
          color: AppColors.surfaceDark,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Column(
          children: [
            _buildHandle(),
            _buildTitle(),
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
                  : _error.isNotEmpty
                      ? Center(child: Text(_error, style: const TextStyle(color: AppColors.error, fontFamily: 'Poppins')))
                      : ListView(
                          controller: controller,
                          padding: const EdgeInsets.all(20),
                          children: [
                            _buildSlowModeSection(),
                            const SizedBox(height: 20),
                            _buildGiftOnlySection(),
                            const SizedBox(height: 20),
                            _buildKeywordSection(),
                            const SizedBox(height: 40),
                          ],
                        ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHandle() {
    return Center(child: Container(margin: const EdgeInsets.only(top: 12, bottom: 8), width: 40, height: 4, decoration: BoxDecoration(color: AppColors.dividerDark, borderRadius: BorderRadius.circular(2))));
  }

  Widget _buildTitle() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
      child: Row(
        children: [
          const Expanded(child: Text('Xona Sozlamalari', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18, fontFamily: 'Poppins'))),
          IconButton(icon: const Icon(Icons.close, color: AppColors.textSecondary), onPressed: () => Navigator.pop(context)),
        ],
      ),
    );
  }

  Widget _buildSlowModeSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Icon(Icons.hourglass_bottom, color: AppColors.warning, size: 20),
            const SizedBox(width: 8),
            const Expanded(child: Text('Sekin Rejim', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontFamily: 'Poppins'))),
            Switch(value: _slowMode, onChanged: (v) => setState(() => _slowMode = v), activeColor: AppColors.primary),
          ],
        ),
        if (_slowMode) ...[
          const SizedBox(height: 12),
          const Text('Xabar oralig\'i (soniya)', style: TextStyle(color: AppColors.textSecondary, fontSize: 13, fontFamily: 'Poppins')),
          Slider(
            value: _slowModeInterval.toDouble(),
            min: 1,
            max: 60,
            divisions: 11,
            label: '$_slowModeInterval sek',
            activeColor: AppColors.primary,
            onChanged: (v) => setState(() => _slowModeInterval = v.toInt()),
          ),
          ElevatedButton(
            onPressed: _saving ? null : _saveSlowMode,
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
            child: const Text('Saqlash', style: TextStyle(fontFamily: 'Poppins')),
          ),
        ],
      ],
    );
  }

  Widget _buildGiftOnlySection() {
    return Row(
      children: [
        const Text('🎁', style: TextStyle(fontSize: 20)),
        const SizedBox(width: 8),
        const Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('Faqat Sovg\'a Rejimi', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontFamily: 'Poppins')),
            Text('Faqat sovg\'a yuborgan foydalanuvchilar gapira oladi', style: TextStyle(color: AppColors.textSecondary, fontSize: 12, fontFamily: 'Poppins')),
          ]),
        ),
        Switch(
          value: _giftOnly,
          onChanged: (v) {
            setState(() => _giftOnly = v);
            _saveGiftOnly();
          },
          activeColor: AppColors.primary,
        ),
      ],
    );
  }

  Widget _buildKeywordSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Row(
          children: [
            Icon(Icons.filter_alt, color: AppColors.info, size: 20),
            SizedBox(width: 8),
            Text('Taqiqlangan So\'zlar', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontFamily: 'Poppins')),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: TextField(
                controller: _keywordCtrl,
                style: const TextStyle(color: Colors.white, fontFamily: 'Poppins'),
                decoration: InputDecoration(
                  hintText: 'Yangi so\'z qo\'shing...',
                  hintStyle: const TextStyle(color: AppColors.textSecondary, fontFamily: 'Poppins'),
                  filled: true,
                  fillColor: AppColors.cardDark,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                ),
                onSubmitted: (_) => _addKeyword(),
              ),
            ),
            const SizedBox(width: 10),
            ElevatedButton(onPressed: _addKeyword, style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary, shape: const CircleBorder(), padding: const EdgeInsets.all(12)), child: const Icon(Icons.add, color: Colors.white)),
          ],
        ),
        if (_keywords.isNotEmpty) ...[
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: _keywords.map((kw) => Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(color: AppColors.cardDark, borderRadius: BorderRadius.circular(20), border: Border.all(color: AppColors.dividerDark)),
              child: Row(mainAxisSize: MainAxisSize.min, children: [
                Text(kw, style: const TextStyle(color: Colors.white, fontFamily: 'Poppins', fontSize: 13)),
                const SizedBox(width: 6),
                GestureDetector(onTap: () => _removeKeyword(kw), child: const Icon(Icons.close, size: 14, color: AppColors.textSecondary)),
              ]),
            )).toList(),
          ),
        ],
      ],
    );
  }
}
