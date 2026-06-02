import 'dart:async';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';

import '../../../../core/providers/auth_provider.dart';
import '../../../../core/router/app_router.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../shared/widgets/voxo_button.dart';

class ProfileSetupScreen extends ConsumerStatefulWidget {
  const ProfileSetupScreen({super.key});

  @override
  ConsumerState<ProfileSetupScreen> createState() => _ProfileSetupScreenState();
}

class _ProfileSetupScreenState extends ConsumerState<ProfileSetupScreen> {
  final _formKey = GlobalKey<FormState>();
  final _usernameController = TextEditingController();
  final _displayNameController = TextEditingController();
  String? _selectedAvatarPath;
  String? _selectedGender = 'male';
  bool _isCheckingUsername = false;
  bool _isUsernameAvailable = false;
  bool _isUsernameChecked = false;
  Timer? _debounceTimer;
  bool _isSubmitting = false;

  @override
  void dispose() {
    _usernameController.dispose();
    _displayNameController.dispose();
    _debounceTimer?.cancel();
    super.dispose();
  }

  void _onUsernameChanged(String value) {
    _debounceTimer?.cancel();
    if (value.length < 3) {
      setState(() {
        _isUsernameChecked = false;
        _isUsernameAvailable = false;
      });
      return;
    }
    _debounceTimer = Timer(const Duration(milliseconds: 500), () {
      _checkUsernameAvailability(value);
    });
  }

  Future<void> _checkUsernameAvailability(String username) async {
    setState(() {
      _isCheckingUsername = true;
      _isUsernameChecked = false;
    });
    // Simulate API check
    await Future.delayed(const Duration(milliseconds: 400));
    if (mounted) {
      setState(() {
        _isCheckingUsername = false;
        _isUsernameChecked = true;
        _isUsernameAvailable = username.length >= 3 && !username.contains(' ');
      });
    }
  }

  Future<void> _pickImage() async {
    final picker = ImagePicker();
    final image = await picker.pickImage(
      source: ImageSource.gallery,
      imageQuality: 80,
      maxWidth: 512,
      maxHeight: 512,
    );
    if (image != null) {
      setState(() {
        _selectedAvatarPath = image.path;
      });
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (!_isUsernameAvailable) {
      _showError('Please enter a valid username');
      return;
    }

    setState(() => _isSubmitting = true);
    final success = await ref.read(authProvider.notifier).setupProfile(
          username: _usernameController.text.trim(),
          displayName: _displayNameController.text.trim(),
          gender: _selectedGender ?? 'male',
          avatarPath: _selectedAvatarPath,
        );

    if (mounted) {
      setState(() => _isSubmitting = false);
      if (success) {
        context.go(AppRoutes.home);
      } else {
        _showError('Failed to set up profile. Please try again.');
      }
    }
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: AppColors.error,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundDark,
      body: SafeArea(
        child: GestureDetector(
          onTap: () => FocusScope.of(context).unfocus(),
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  _buildHeader()
                      .animate()
                      .fadeIn(duration: 400.ms)
                      .slideY(begin: -0.2),
                  const SizedBox(height: 36),
                  _buildAvatarPicker()
                      .animate()
                      .fadeIn(delay: 100.ms, duration: 400.ms)
                      .scale(begin: const Offset(0.8, 0.8)),
                  const SizedBox(height: 32),
                  _buildUsernameField()
                      .animate()
                      .fadeIn(delay: 200.ms, duration: 400.ms)
                      .slideX(begin: -0.1),
                  const SizedBox(height: 16),
                  _buildDisplayNameField()
                      .animate()
                      .fadeIn(delay: 300.ms, duration: 400.ms)
                      .slideX(begin: -0.1),
                  const SizedBox(height: 20),
                  _buildGenderSelector()
                      .animate()
                      .fadeIn(delay: 400.ms, duration: 400.ms),
                  const SizedBox(height: 40),
                  _buildContinueButton()
                      .animate()
                      .fadeIn(delay: 500.ms, duration: 400.ms)
                      .slideY(begin: 0.2),
                  const SizedBox(height: 16),
                  _buildSkipButton()
                      .animate()
                      .fadeIn(delay: 600.ms, duration: 400.ms),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Column(
      children: [
        ShaderMask(
          shaderCallback: (bounds) =>
              AppColors.primaryGradient.createShader(bounds),
          child: const Text(
            'Set Up Your Profile',
            style: TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.bold,
              color: Colors.white,
              fontFamily: 'Poppins',
            ),
          ),
        ),
        const SizedBox(height: 8),
        Text(
          'Let others know who you are',
          style: TextStyle(
            fontSize: 14,
            color: AppColors.textSecondary,
            fontFamily: 'Poppins',
          ),
        ),
      ],
    );
  }

  Widget _buildAvatarPicker() {
    return GestureDetector(
      onTap: _pickImage,
      child: Stack(
        children: [
          Container(
            width: 110,
            height: 110,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: _selectedAvatarPath == null
                  ? AppColors.primaryGradient
                  : null,
              border: Border.all(
                color: AppColors.primary,
                width: 3,
              ),
              boxShadow: [
                BoxShadow(
                  color: AppColors.primary.withOpacity(0.4),
                  blurRadius: 20,
                  spreadRadius: 2,
                ),
              ],
            ),
            child: ClipOval(
              child: _selectedAvatarPath != null
                  ? Image.file(
                      File(_selectedAvatarPath!),
                      fit: BoxFit.cover,
                    )
                  : const Icon(
                      Icons.person,
                      color: Colors.white,
                      size: 56,
                    ),
            ),
          ),
          Positioned(
            bottom: 4,
            right: 4,
            child: Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [AppColors.primary, AppColors.secondary],
                ),
                shape: BoxShape.circle,
                border: Border.all(color: AppColors.backgroundDark, width: 2),
              ),
              child: const Icon(
                Icons.camera_alt,
                color: Colors.white,
                size: 16,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildUsernameField() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Username',
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: AppColors.textSecondary,
            fontFamily: 'Poppins',
          ),
        ),
        const SizedBox(height: 8),
        TextFormField(
          controller: _usernameController,
          onChanged: _onUsernameChanged,
          style: const TextStyle(color: Colors.white, fontFamily: 'Poppins'),
          decoration: InputDecoration(
            hintText: 'Enter username (min 3 chars)',
            hintStyle: TextStyle(color: AppColors.textTertiary),
            prefixIcon: Icon(Icons.alternate_email, color: AppColors.primary),
            suffixIcon: _buildUsernameStatus(),
            filled: true,
            fillColor: AppColors.cardDark,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide.none,
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
            ),
            errorBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: AppColors.error, width: 1.5),
            ),
          ),
          validator: (value) {
            if (value == null || value.isEmpty) return 'Username is required';
            if (value.length < 3) return 'Username must be at least 3 characters';
            if (value.contains(' ')) return 'Username cannot contain spaces';
            if (!RegExp(r'^[a-zA-Z0-9_]+$').hasMatch(value)) {
              return 'Only letters, numbers, and underscores';
            }
            return null;
          },
        ),
        if (_isUsernameChecked) ...[
          const SizedBox(height: 6),
          Row(
            children: [
              Icon(
                _isUsernameAvailable ? Icons.check_circle : Icons.cancel,
                size: 14,
                color: _isUsernameAvailable ? AppColors.success : AppColors.error,
              ),
              const SizedBox(width: 4),
              Text(
                _isUsernameAvailable
                    ? 'Username is available!'
                    : 'Username is taken',
                style: TextStyle(
                  fontSize: 12,
                  color: _isUsernameAvailable
                      ? AppColors.success
                      : AppColors.error,
                  fontFamily: 'Poppins',
                ),
              ),
            ],
          ),
        ],
      ],
    );
  }

  Widget? _buildUsernameStatus() {
    if (_isCheckingUsername) {
      return const Padding(
        padding: EdgeInsets.all(12),
        child: SizedBox(
          width: 20,
          height: 20,
          child: CircularProgressIndicator(
            strokeWidth: 2,
            color: AppColors.primary,
          ),
        ),
      );
    }
    if (_isUsernameChecked) {
      return Icon(
        _isUsernameAvailable ? Icons.check_circle : Icons.cancel,
        color: _isUsernameAvailable ? AppColors.success : AppColors.error,
      );
    }
    return null;
  }

  Widget _buildDisplayNameField() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Display Name',
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: AppColors.textSecondary,
            fontFamily: 'Poppins',
          ),
        ),
        const SizedBox(height: 8),
        TextFormField(
          controller: _displayNameController,
          style: const TextStyle(color: Colors.white, fontFamily: 'Poppins'),
          decoration: InputDecoration(
            hintText: 'Your display name',
            hintStyle: TextStyle(color: AppColors.textTertiary),
            prefixIcon: Icon(Icons.badge_outlined, color: AppColors.primary),
            filled: true,
            fillColor: AppColors.cardDark,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide.none,
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
            ),
          ),
          validator: (value) {
            if (value == null || value.isEmpty) return 'Display name is required';
            if (value.length < 2) return 'Display name must be at least 2 characters';
            return null;
          },
        ),
      ],
    );
  }

  Widget _buildGenderSelector() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Gender',
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: AppColors.textSecondary,
            fontFamily: 'Poppins',
          ),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            _buildGenderOption('male', 'Male', Icons.male, AppColors.info),
            const SizedBox(width: 12),
            _buildGenderOption(
                'female', 'Female', Icons.female, AppColors.secondary),
            const SizedBox(width: 12),
            _buildGenderOption(
                'other', 'Other', Icons.person, AppColors.primary),
          ],
        ),
      ],
    );
  }

  Widget _buildGenderOption(
      String value, String label, IconData icon, Color color) {
    final isSelected = _selectedGender == value;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _selectedGender = value),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(vertical: 14),
          decoration: BoxDecoration(
            color: isSelected
                ? color.withOpacity(0.15)
                : AppColors.cardDark,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isSelected ? color : Colors.transparent,
              width: 1.5,
            ),
          ),
          child: Column(
            children: [
              Icon(icon, color: isSelected ? color : AppColors.textTertiary),
              const SizedBox(height: 4),
              Text(
                label,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: isSelected ? color : AppColors.textTertiary,
                  fontFamily: 'Poppins',
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildContinueButton() {
    return VoxoButton(
      label: 'Continue',
      isLoading: _isSubmitting,
      onPressed: _submit,
      size: VoxoButtonSize.large,
    );
  }

  Widget _buildSkipButton() {
    return TextButton(
      onPressed: () => context.go(AppRoutes.home),
      child: Text(
        'Skip for now',
        style: TextStyle(
          color: AppColors.textSecondary,
          fontSize: 14,
          fontFamily: 'Poppins',
          decoration: TextDecoration.underline,
          decorationColor: AppColors.textSecondary,
        ),
      ),
    );
  }
}
