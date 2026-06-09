import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';

import '../../../../core/network/api_client.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../shared/widgets/voxo_button.dart';

enum _RoomTypeOption { public, private, password, vip }

final _createRoomLoadingProvider = StateProvider<bool>((ref) => false);

class CreateRoomScreen extends ConsumerStatefulWidget {
  const CreateRoomScreen({super.key});

  @override
  ConsumerState<CreateRoomScreen> createState() => _CreateRoomScreenState();
}

class _CreateRoomScreenState extends ConsumerState<CreateRoomScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  final _tagCtrl = TextEditingController();

  String? _coverPath;
  _RoomTypeOption _roomType = _RoomTypeOption.public;
  int _seatCount = 8;
  final List<String> _tags = [];
  String _language = 'English';

  @override
  void dispose() {
    _titleCtrl.dispose();
    _descCtrl.dispose();
    _passwordCtrl.dispose();
    _tagCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickCover() async {
    final picker = ImagePicker();
    final image = await picker.pickImage(
      source: ImageSource.gallery,
      imageQuality: 85,
      maxWidth: 800,
    );
    if (image != null) {
      setState(() => _coverPath = image.path);
    }
  }

  void _addTag(String tag) {
    final trimmed = tag.trim();
    if (trimmed.isEmpty || _tags.contains(trimmed) || _tags.length >= 5) return;
    setState(() {
      _tags.add(trimmed);
      _tagCtrl.clear();
    });
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    ref.read(_createRoomLoadingProvider.notifier).state = true;
    try {
      final api = ref.read(apiClientProvider);

      final body = <String, dynamic>{
        'title': _titleCtrl.text.trim(),
        'description': _descCtrl.text.trim(),
        'roomType': _roomType.name.toUpperCase(),
        'maxSeats': _seatCount,
        'language': _language,
        if (_tags.isNotEmpty) 'tags': _tags,
        if (_roomType == _RoomTypeOption.password && _passwordCtrl.text.isNotEmpty)
          'password': _passwordCtrl.text,
      };

      // Upload cover if selected
      if (_coverPath != null) {
        final formData = FormData.fromMap({
          'file': await MultipartFile.fromFile(_coverPath!, filename: 'cover.jpg'),
        });
        final uploadRes = await api.uploadFile('/storage/upload', formData);
        final url = (uploadRes.data is Map ? uploadRes.data['url'] : null) as String?;
        if (url != null) body['coverImage'] = url;
      }

      final res = await api.post('/rooms', data: body);
      final roomId = (res.data is Map ? res.data['id'] ?? res.data['data']?['id'] : null) as String?;

      if (mounted) {
        context.go('/rooms/${roomId ?? 'new'}');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.toString(), style: const TextStyle(fontFamily: 'Poppins')),
            backgroundColor: AppColors.error,
          ),
        );
      }
    } finally {
      if (mounted) ref.read(_createRoomLoadingProvider.notifier).state = false;
    }
  }

  @override
  Widget build(BuildContext context) {
    final isLoading = ref.watch(_createRoomLoadingProvider);

    return Scaffold(
      backgroundColor: AppColors.backgroundDark,
      appBar: AppBar(
        backgroundColor: AppColors.surfaceDark,
        elevation: 0,
        title: const Text(
          'Create Room',
          style: TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.bold,
            fontFamily: 'Poppins',
          ),
        ),
        leading: IconButton(
          icon: const Icon(Icons.close, color: Colors.white),
          onPressed: () => context.pop(),
        ),
      ),
      body: Stack(
        children: [
          GestureDetector(
            onTap: () => FocusScope.of(context).unfocus(),
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildCoverPicker()
                        .animate()
                        .fadeIn(duration: 400.ms)
                        .scale(begin: const Offset(0.9, 0.9)),
                    const SizedBox(height: 24),
                    _buildSectionLabel('Room Title *'),
                    const SizedBox(height: 8),
                    _buildTextField(
                      controller: _titleCtrl,
                      hint: 'Enter room title',
                      validator: (v) =>
                          v == null || v.isEmpty ? 'Title is required' : null,
                    ).animate().fadeIn(delay: 100.ms),
                    const SizedBox(height: 16),
                    _buildSectionLabel('Description'),
                    const SizedBox(height: 8),
                    _buildTextField(
                      controller: _descCtrl,
                      hint: 'Tell people what your room is about...',
                      maxLines: 3,
                    ).animate().fadeIn(delay: 150.ms),
                    const SizedBox(height: 16),
                    _buildSectionLabel('Room Type'),
                    const SizedBox(height: 8),
                    _buildRoomTypeSelector()
                        .animate()
                        .fadeIn(delay: 200.ms),
                    if (_roomType == _RoomTypeOption.password) ...[
                      const SizedBox(height: 16),
                      _buildSectionLabel('Password'),
                      const SizedBox(height: 8),
                      _buildTextField(
                        controller: _passwordCtrl,
                        hint: 'Enter room password',
                        obscureText: true,
                        validator: (v) => _roomType == _RoomTypeOption.password
                            ? (v == null || v.isEmpty
                                ? 'Password is required'
                                : null)
                            : null,
                      ),
                    ],
                    const SizedBox(height: 16),
                    _buildSectionLabel('Seat Count'),
                    const SizedBox(height: 8),
                    _buildSeatCountSelector()
                        .animate()
                        .fadeIn(delay: 250.ms),
                    const SizedBox(height: 16),
                    _buildSectionLabel('Tags (max 5)'),
                    const SizedBox(height: 8),
                    _buildTagsInput().animate().fadeIn(delay: 300.ms),
                    const SizedBox(height: 16),
                    _buildSectionLabel('Language'),
                    const SizedBox(height: 8),
                    _buildLanguageDropdown()
                        .animate()
                        .fadeIn(delay: 350.ms),
                    const SizedBox(height: 32),
                    VoxoButton(
                      label: 'Go Live!',
                      isLoading: isLoading,
                      onPressed: _submit,
                      size: VoxoButtonSize.large,
                      icon: Icons.live_tv,
                    ).animate().fadeIn(delay: 400.ms).slideY(begin: 0.2),
                    const SizedBox(height: 40),
                  ],
                ),
              ),
            ),
          ),
          if (isLoading)
            Container(
              color: Colors.black54,
              child: const Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    CircularProgressIndicator(color: AppColors.primary),
                    SizedBox(height: 16),
                    Text(
                      'Creating your room...',
                      style: TextStyle(
                        color: Colors.white,
                        fontFamily: 'Poppins',
                        fontSize: 16,
                      ),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildCoverPicker() {
    return GestureDetector(
      onTap: _pickCover,
      child: Container(
        width: double.infinity,
        height: 160,
        decoration: BoxDecoration(
          color: AppColors.cardDark,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: AppColors.dividerDark,
            style: BorderStyle.solid,
          ),
          image: _coverPath != null
              ? DecorationImage(
                  image: FileImage(File(_coverPath!)),
                  fit: BoxFit.cover,
                )
              : null,
        ),
        child: _coverPath == null
            ? Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    width: 56,
                    height: 56,
                    decoration: BoxDecoration(
                      gradient: AppColors.primaryGradient,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.add_photo_alternate,
                        color: Colors.white, size: 28),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'Add Cover Image',
                    style: TextStyle(
                      color: AppColors.textSecondary,
                      fontSize: 14,
                      fontFamily: 'Poppins',
                    ),
                  ),
                  Text(
                    'Tap to select from gallery',
                    style: TextStyle(
                      color: AppColors.textTertiary,
                      fontSize: 12,
                      fontFamily: 'Poppins',
                    ),
                  ),
                ],
              )
            : Stack(
                children: [
                  Positioned(
                    top: 8,
                    right: 8,
                    child: GestureDetector(
                      onTap: () =>
                          setState(() => _coverPath = null),
                      child: Container(
                        padding: const EdgeInsets.all(6),
                        decoration: BoxDecoration(
                          color: Colors.black54,
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.close,
                            color: Colors.white, size: 16),
                      ),
                    ),
                  ),
                ],
              ),
      ),
    );
  }

  Widget _buildSectionLabel(String label) {
    return Text(
      label,
      style: TextStyle(
        fontSize: 14,
        fontWeight: FontWeight.w600,
        color: AppColors.textSecondary,
        fontFamily: 'Poppins',
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String hint,
    int maxLines = 1,
    bool obscureText = false,
    String? Function(String?)? validator,
  }) {
    return TextFormField(
      controller: controller,
      maxLines: maxLines,
      obscureText: obscureText,
      style: const TextStyle(color: Colors.white, fontFamily: 'Poppins'),
      validator: validator,
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: TextStyle(color: AppColors.textTertiary),
        filled: true,
        fillColor: AppColors.cardDark,
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
          borderSide: const BorderSide(color: AppColors.error, width: 1.5),
        ),
      ),
    );
  }

  Widget _buildRoomTypeSelector() {
    final types = [
      (_RoomTypeOption.public, 'Public', Icons.public),
      (_RoomTypeOption.private, 'Private', Icons.lock_outline),
      (_RoomTypeOption.password, 'Password', Icons.password),
      (_RoomTypeOption.vip, 'VIP', Icons.workspace_premium),
    ];

    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: types.map((t) {
        final (type, label, icon) = t;
        final isSelected = _roomType == type;
        return GestureDetector(
          onTap: () => setState(() => _roomType = type),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            padding:
                const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              gradient: isSelected ? AppColors.primaryGradient : null,
              color: isSelected ? null : AppColors.cardDark,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(
                color: isSelected
                    ? Colors.transparent
                    : AppColors.dividerDark,
              ),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  icon,
                  size: 16,
                  color: isSelected ? Colors.white : AppColors.textTertiary,
                ),
                const SizedBox(width: 6),
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: isSelected
                        ? FontWeight.w600
                        : FontWeight.normal,
                    color: isSelected ? Colors.white : AppColors.textSecondary,
                    fontFamily: 'Poppins',
                  ),
                ),
              ],
            ),
          ),
        );
      }).toList(),
    );
  }

  Widget _buildSeatCountSelector() {
    return Row(
      children: [8, 12, 16].map((count) {
        final isSelected = _seatCount == count;
        return Expanded(
          child: GestureDetector(
            onTap: () => setState(() => _seatCount = count),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              margin: const EdgeInsets.symmetric(horizontal: 4),
              padding: const EdgeInsets.symmetric(vertical: 12),
              decoration: BoxDecoration(
                gradient: isSelected ? AppColors.primaryGradient : null,
                color: isSelected ? null : AppColors.cardDark,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                  color: isSelected
                      ? Colors.transparent
                      : AppColors.dividerDark,
                ),
              ),
              child: Column(
                children: [
                  Icon(
                    Icons.people,
                    size: 20,
                    color: isSelected ? Colors.white : AppColors.textTertiary,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '$count seats',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: isSelected
                          ? FontWeight.w600
                          : FontWeight.normal,
                      color: isSelected ? Colors.white : AppColors.textSecondary,
                      fontFamily: 'Poppins',
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      }).toList(),
    );
  }

  Widget _buildTagsInput() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (_tags.isNotEmpty) ...[
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: _tags.map((tag) => Chip(
                  label: Text(
                    '#$tag',
                    style: const TextStyle(
                        color: Colors.white,
                        fontSize: 12,
                        fontFamily: 'Poppins'),
                  ),
                  backgroundColor: AppColors.primary.withOpacity(0.2),
                  side: BorderSide(
                      color: AppColors.primary.withOpacity(0.5)),
                  deleteIcon: const Icon(Icons.close,
                      size: 14, color: Colors.white70),
                  onDeleted: () =>
                      setState(() => _tags.remove(tag)),
                  padding: EdgeInsets.zero,
                )).toList(),
          ),
          const SizedBox(height: 8),
        ],
        if (_tags.length < 5)
          Row(
            children: [
              Expanded(
                child: TextFormField(
                  controller: _tagCtrl,
                  style: const TextStyle(
                      color: Colors.white, fontFamily: 'Poppins'),
                  onFieldSubmitted: _addTag,
                  decoration: InputDecoration(
                    hintText: 'Add a tag and press enter',
                    hintStyle:
                        TextStyle(color: AppColors.textTertiary),
                    prefixText: '# ',
                    prefixStyle: TextStyle(color: AppColors.primary),
                    filled: true,
                    fillColor: AppColors.cardDark,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide.none,
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(
                          color: AppColors.primary, width: 1.5),
                    ),
                    contentPadding: const EdgeInsets.symmetric(
                        horizontal: 16, vertical: 12),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              GestureDetector(
                onTap: () => _addTag(_tagCtrl.text),
                child: Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    gradient: AppColors.primaryGradient,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.add,
                      color: Colors.white, size: 22),
                ),
              ),
            ],
          ),
      ],
    );
  }

  Widget _buildLanguageDropdown() {
    const languages = [
      'English', 'Russian', 'Uzbek', 'Arabic', 'Turkish',
      'Spanish', 'French', 'German', 'Korean', 'Japanese',
    ];

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      decoration: BoxDecoration(
        color: AppColors.cardDark,
        borderRadius: BorderRadius.circular(12),
      ),
      child: DropdownButton<String>(
        value: _language,
        isExpanded: true,
        dropdownColor: AppColors.cardDark,
        icon: Icon(Icons.arrow_drop_down, color: AppColors.textTertiary),
        underline: const SizedBox.shrink(),
        style: const TextStyle(
            color: Colors.white, fontFamily: 'Poppins', fontSize: 14),
        onChanged: (v) {
          if (v != null) setState(() => _language = v);
        },
        items: languages.map((lang) => DropdownMenuItem(
              value: lang,
              child: Text(lang),
            )).toList(),
      ),
    );
  }
}
