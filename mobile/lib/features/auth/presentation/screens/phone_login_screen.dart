import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:sign_in_with_apple/sign_in_with_apple.dart';
import '../../../../core/providers/auth_provider.dart';
import '../../../../core/router/app_router.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/utils/app_utils.dart';
import '../../../../shared/widgets/voxo_button.dart';

class PhoneLoginScreen extends ConsumerStatefulWidget {
  const PhoneLoginScreen({super.key});

  @override
  ConsumerState<PhoneLoginScreen> createState() => _PhoneLoginScreenState();
}

class _PhoneLoginScreenState extends ConsumerState<PhoneLoginScreen> {
  final _phoneController = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  String _selectedCountryCode = '+998';
  String _selectedCountryFlag = '🇺🇿';
  bool _isLoading = false;

  final _countries = [
    {'flag': '🇺🇿', 'code': '+998', 'name': 'Uzbekistan'},
    {'flag': '🇷🇺', 'code': '+7', 'name': 'Russia'},
    {'flag': '🇰🇿', 'code': '+7', 'name': 'Kazakhstan'},
    {'flag': '🇺🇸', 'code': '+1', 'name': 'United States'},
    {'flag': '🇬🇧', 'code': '+44', 'name': 'United Kingdom'},
    {'flag': '🇸🇦', 'code': '+966', 'name': 'Saudi Arabia'},
    {'flag': '🇦🇪', 'code': '+971', 'name': 'UAE'},
    {'flag': '🇹🇷', 'code': '+90', 'name': 'Turkey'},
  ];

  @override
  void dispose() {
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _sendOtp() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);
    final phone = _phoneController.text.trim();
    final success = await ref
        .read(authProvider.notifier)
        .sendOtp(phone, _selectedCountryCode);

    setState(() => _isLoading = false);

    if (success && mounted) {
      context.push(
        AppRoutes.otp,
        extra: {
          'phone': phone,
          'countryCode': _selectedCountryCode,
        },
      );
    } else if (mounted) {
      AppUtils.showErrorSnackBar(
          context, ref.read(authProvider).error ?? 'Failed to send OTP');
    }
  }

  Future<void> _googleSignIn() async {
    setState(() => _isLoading = true);
    try {
      final googleSignIn = GoogleSignIn(scopes: ['email', 'profile']);
      final account = await googleSignIn.signIn();
      if (account == null) {
        setState(() => _isLoading = false);
        return;
      }

      final auth = await account.authentication;
      final idToken = auth.idToken;
      if (idToken == null) {
        setState(() => _isLoading = false);
        return;
      }

      final success =
          await ref.read(authProvider.notifier).loginWithGoogle(idToken);
      setState(() => _isLoading = false);

      if (success && mounted) {
        context.go(AppRoutes.home);
      }
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        AppUtils.showErrorSnackBar(context, 'Google sign in failed');
      }
    }
  }

  Future<void> _appleSignIn() async {
    setState(() => _isLoading = true);
    try {
      final credential = await SignInWithApple.getAppleIDCredential(
        scopes: [
          AppleIDAuthorizationScopes.email,
          AppleIDAuthorizationScopes.fullName,
        ],
      );

      final identityToken = credential.identityToken;
      if (identityToken == null) {
        setState(() => _isLoading = false);
        return;
      }

      final success = await ref.read(authProvider.notifier).loginWithApple(
            identityToken: identityToken,
            firstName: credential.givenName,
            lastName: credential.familyName,
          );
      setState(() => _isLoading = false);

      if (success && mounted) {
        context.go(AppRoutes.home);
      }
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        AppUtils.showErrorSnackBar(context, 'Apple sign in failed');
      }
    }
  }

  Future<void> _guestLogin() async {
    setState(() => _isLoading = true);
    final success = await ref.read(authProvider.notifier).loginAsGuest();
    setState(() => _isLoading = false);

    if (success && mounted) {
      context.go(AppRoutes.home);
    }
  }

  void _showCountryPicker() {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.surfaceDark,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) => Column(
        children: [
          const SizedBox(height: 8),
          Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: AppColors.dividerDark,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(height: 16),
          const Text(
            'Select Country',
            style: TextStyle(
              color: AppColors.textPrimary,
              fontSize: 18,
              fontWeight: FontWeight.w600,
              fontFamily: 'Poppins',
            ),
          ),
          const SizedBox(height: 8),
          Expanded(
            child: ListView.builder(
              itemCount: _countries.length,
              itemBuilder: (context, index) {
                final country = _countries[index];
                return ListTile(
                  leading: Text(
                    country['flag']!,
                    style: const TextStyle(fontSize: 28),
                  ),
                  title: Text(
                    country['name']!,
                    style: const TextStyle(
                      color: AppColors.textPrimary,
                      fontFamily: 'Poppins',
                    ),
                  ),
                  trailing: Text(
                    country['code']!,
                    style: const TextStyle(
                      color: AppColors.textSecondary,
                      fontFamily: 'Poppins',
                    ),
                  ),
                  onTap: () {
                    setState(() {
                      _selectedCountryCode = country['code']!;
                      _selectedCountryFlag = country['flag']!;
                    });
                    Navigator.pop(context);
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundDark,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 40),

                // Logo & Header
                _buildHeader(),
                const SizedBox(height: 48),

                // Phone Input
                _buildPhoneInput(),
                const SizedBox(height: 24),

                // Send OTP Button
                VoxoButton(
                  label: 'Send OTP',
                  onPressed: _isLoading ? null : _sendOtp,
                  isLoading: _isLoading,
                  icon: Icons.send_rounded,
                ).animate().fadeIn(delay: 600.ms).slideY(begin: 0.3),

                const SizedBox(height: 24),

                // Divider
                _buildDivider(),
                const SizedBox(height: 24),

                // Social Login
                _buildSocialLogins(),
                const SizedBox(height: 24),

                // Guest Login
                _buildGuestLogin(),

                const SizedBox(height: 32),

                // Terms
                _buildTerms(),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        ShaderMask(
          shaderCallback: (bounds) =>
              AppColors.primaryGradient.createShader(bounds),
          child: const Text(
            'VOXO',
            style: TextStyle(
              color: Colors.white,
              fontSize: 40,
              fontWeight: FontWeight.bold,
              fontFamily: 'Poppins',
              letterSpacing: 4,
            ),
          ),
        ).animate().fadeIn().slideX(begin: -0.3),
        const SizedBox(height: 12),
        const Text(
          'Welcome back! 👋',
          style: TextStyle(
            color: AppColors.textPrimary,
            fontSize: 28,
            fontWeight: FontWeight.w600,
            fontFamily: 'Poppins',
          ),
        ).animate().fadeIn(delay: 200.ms).slideX(begin: -0.3),
        const SizedBox(height: 8),
        const Text(
          'Enter your phone number to get started',
          style: TextStyle(
            color: AppColors.textSecondary,
            fontSize: 15,
            fontFamily: 'Poppins',
          ),
        ).animate().fadeIn(delay: 300.ms).slideX(begin: -0.3),
      ],
    );
  }

  Widget _buildPhoneInput() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Phone Number',
          style: TextStyle(
            color: AppColors.textSecondary,
            fontSize: 13,
            fontWeight: FontWeight.w500,
            fontFamily: 'Poppins',
          ),
        ),
        const SizedBox(height: 8),
        Container(
          decoration: BoxDecoration(
            color: AppColors.surfaceDark,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppColors.dividerDark),
          ),
          child: Row(
            children: [
              // Country code picker
              GestureDetector(
                onTap: _showCountryPicker,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 16),
                  decoration: const BoxDecoration(
                    border: Border(
                      right: BorderSide(color: AppColors.dividerDark),
                    ),
                  ),
                  child: Row(
                    children: [
                      Text(
                        _selectedCountryFlag,
                        style: const TextStyle(fontSize: 22),
                      ),
                      const SizedBox(width: 6),
                      Text(
                        _selectedCountryCode,
                        style: const TextStyle(
                          color: AppColors.textPrimary,
                          fontSize: 16,
                          fontWeight: FontWeight.w500,
                          fontFamily: 'Poppins',
                        ),
                      ),
                      const SizedBox(width: 4),
                      const Icon(
                        Icons.keyboard_arrow_down_rounded,
                        color: AppColors.textTertiary,
                        size: 18,
                      ),
                    ],
                  ),
                ),
              ),

              // Phone field
              Expanded(
                child: TextFormField(
                  controller: _phoneController,
                  keyboardType: TextInputType.phone,
                  style: const TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 16,
                    fontFamily: 'Poppins',
                  ),
                  decoration: const InputDecoration(
                    hintText: '90 123 45 67',
                    hintStyle: TextStyle(
                      color: AppColors.textTertiary,
                      fontFamily: 'Poppins',
                    ),
                    border: InputBorder.none,
                    contentPadding: EdgeInsets.symmetric(horizontal: 14),
                    filled: false,
                  ),
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return null; // Show inline
                    }
                    if (!AppUtils.isValidPhone(value)) {
                      return 'Please enter a valid phone number';
                    }
                    return null;
                  },
                ),
              ),
            ],
          ),
        ),
      ],
    ).animate().fadeIn(delay: 400.ms).slideY(begin: 0.2);
  }

  Widget _buildDivider() {
    return Row(
      children: [
        const Expanded(child: Divider(color: AppColors.dividerDark)),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: const Text(
            'or continue with',
            style: TextStyle(
              color: AppColors.textTertiary,
              fontSize: 13,
              fontFamily: 'Poppins',
            ),
          ),
        ),
        const Expanded(child: Divider(color: AppColors.dividerDark)),
      ],
    ).animate().fadeIn(delay: 700.ms);
  }

  Widget _buildSocialLogins() {
    return Column(
      children: [
        // Google
        _SocialButton(
          label: 'Continue with Google',
          icon: Icons.g_mobiledata_rounded,
          iconColor: Colors.white,
          backgroundColor: const Color(0xFF4285F4),
          onPressed: _isLoading ? null : _googleSignIn,
        ),

        // Apple (iOS only)
        if (Platform.isIOS) ...[
          const SizedBox(height: 12),
          _SocialButton(
            label: 'Continue with Apple',
            icon: Icons.apple,
            iconColor: Colors.black,
            backgroundColor: Colors.white,
            onPressed: _isLoading ? null : _appleSignIn,
          ),
        ],
      ],
    ).animate().fadeIn(delay: 800.ms);
  }

  Widget _buildGuestLogin() {
    return GestureDetector(
      onTap: _isLoading ? null : _guestLogin,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          color: AppColors.cardDark,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.dividerDark),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(
              Icons.person_outline_rounded,
              color: AppColors.textSecondary,
              size: 20,
            ),
            const SizedBox(width: 8),
            const Text(
              'Continue as Guest',
              style: TextStyle(
                color: AppColors.textSecondary,
                fontSize: 15,
                fontWeight: FontWeight.w500,
                fontFamily: 'Poppins',
              ),
            ),
          ],
        ),
      ),
    ).animate().fadeIn(delay: 900.ms);
  }

  Widget _buildTerms() {
    return const Text(
      'By continuing, you agree to our Terms of Service and Privacy Policy',
      textAlign: TextAlign.center,
      style: TextStyle(
        color: AppColors.textTertiary,
        fontSize: 12,
        fontFamily: 'Poppins',
      ),
    ).animate().fadeIn(delay: 1.seconds);
  }
}

class _SocialButton extends StatelessWidget {
  final String label;
  final IconData icon;
  final Color iconColor;
  final Color backgroundColor;
  final VoidCallback? onPressed;

  const _SocialButton({
    required this.label,
    required this.icon,
    required this.iconColor,
    required this.backgroundColor,
    this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      height: 52,
      child: ElevatedButton(
        onPressed: onPressed,
        style: ElevatedButton.styleFrom(
          backgroundColor: backgroundColor,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: iconColor, size: 24),
            const SizedBox(width: 10),
            Text(
              label,
              style: TextStyle(
                color: iconColor,
                fontSize: 15,
                fontWeight: FontWeight.w600,
                fontFamily: 'Poppins',
              ),
            ),
          ],
        ),
      ),
    );
  }
}
