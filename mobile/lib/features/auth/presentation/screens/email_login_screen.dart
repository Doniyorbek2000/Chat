import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/providers/auth_provider.dart';
import '../../../../core/router/app_router.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/utils/app_utils.dart';
import '../../../../shared/widgets/voxo_button.dart';

enum _EmailAuthMode { signIn, signUp, verify }

class EmailLoginScreen extends ConsumerStatefulWidget {
  const EmailLoginScreen({super.key});

  @override
  ConsumerState<EmailLoginScreen> createState() => _EmailLoginScreenState();
}

class _EmailLoginScreenState extends ConsumerState<EmailLoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _nameController = TextEditingController();
  final _codeController = TextEditingController();

  _EmailAuthMode _mode = _EmailAuthMode.signIn;
  bool _isLoading = false;
  bool _obscurePassword = true;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _nameController.dispose();
    _codeController.dispose();
    super.dispose();
  }

  void _goHome() {
    final user = ref.read(authProvider).user;
    if (user?.username == null || user!.username.isEmpty) {
      context.go(AppRoutes.profileSetup);
    } else {
      context.go(AppRoutes.home);
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _isLoading = true);

    final notifier = ref.read(authProvider.notifier);
    final email = _emailController.text.trim();

    switch (_mode) {
      case _EmailAuthMode.signIn:
        final result = await notifier.loginWithEmail(
          email: email,
          password: _passwordController.text,
        );
        if (!mounted) return;
        setState(() => _isLoading = false);
        if (result == 'ok') {
          _goHome();
        } else if (result == 'verify') {
          setState(() => _mode = _EmailAuthMode.verify);
          AppUtils.showErrorSnackBar(
              context, 'Verification code sent to your email');
        } else {
          AppUtils.showErrorSnackBar(
              context, ref.read(authProvider).error ?? 'Sign in failed');
        }
        break;

      case _EmailAuthMode.signUp:
        final result = await notifier.registerWithEmail(
          email: email,
          password: _passwordController.text,
          displayName: _nameController.text.trim(),
        );
        if (!mounted) return;
        setState(() => _isLoading = false);
        if (result == 'ok') {
          _goHome();
        } else if (result == 'verify') {
          setState(() => _mode = _EmailAuthMode.verify);
        } else {
          AppUtils.showErrorSnackBar(
              context, ref.read(authProvider).error ?? 'Registration failed');
        }
        break;

      case _EmailAuthMode.verify:
        final success = await notifier.verifyEmail(
          email: email,
          code: _codeController.text.trim(),
        );
        if (!mounted) return;
        setState(() => _isLoading = false);
        if (success) {
          _goHome();
        } else {
          AppUtils.showErrorSnackBar(
              context, ref.read(authProvider).error ?? 'Invalid code');
        }
        break;
    }
  }

  Future<void> _resendCode() async {
    await ref
        .read(authProvider.notifier)
        .resendEmailCode(_emailController.text.trim());
    if (mounted) {
      AppUtils.showErrorSnackBar(context, 'A new code has been sent');
    }
  }

  String get _title {
    switch (_mode) {
      case _EmailAuthMode.signIn:
        return 'Sign in with Email';
      case _EmailAuthMode.signUp:
        return 'Create your account';
      case _EmailAuthMode.verify:
        return 'Verify your email';
    }
  }

  String get _buttonLabel {
    switch (_mode) {
      case _EmailAuthMode.signIn:
        return 'Sign In';
      case _EmailAuthMode.signUp:
        return 'Create Account';
      case _EmailAuthMode.verify:
        return 'Verify';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundDark,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded,
              color: Colors.white, size: 20),
          onPressed: () => context.pop(),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 16),
                Text(
                  _title,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 26,
                    fontWeight: FontWeight.bold,
                    fontFamily: 'Poppins',
                  ),
                ).animate().fadeIn().slideY(begin: 0.2),
                const SizedBox(height: 8),
                Text(
                  _mode == _EmailAuthMode.verify
                      ? 'Enter the 6-digit code sent to ${_emailController.text.trim()}'
                      : 'Use your email address to continue',
                  style: const TextStyle(
                    color: AppColors.textTertiary,
                    fontSize: 14,
                    fontFamily: 'Poppins',
                  ),
                ),
                const SizedBox(height: 32),
                if (_mode == _EmailAuthMode.verify)
                  _buildCodeField()
                else ...[
                  if (_mode == _EmailAuthMode.signUp) ...[
                    _buildTextField(
                      controller: _nameController,
                      hint: 'Display name',
                      icon: Icons.person_outline_rounded,
                      validator: (v) => null,
                    ),
                    const SizedBox(height: 16),
                  ],
                  _buildTextField(
                    controller: _emailController,
                    hint: 'Email address',
                    icon: Icons.email_outlined,
                    keyboardType: TextInputType.emailAddress,
                    validator: (v) {
                      final value = v?.trim() ?? '';
                      if (value.isEmpty) return 'Email is required';
                      if (!RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')
                          .hasMatch(value)) {
                        return 'Enter a valid email';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 16),
                  _buildTextField(
                    controller: _passwordController,
                    hint: 'Password',
                    icon: Icons.lock_outline_rounded,
                    obscureText: _obscurePassword,
                    suffix: IconButton(
                      icon: Icon(
                        _obscurePassword
                            ? Icons.visibility_off_outlined
                            : Icons.visibility_outlined,
                        color: AppColors.textTertiary,
                        size: 20,
                      ),
                      onPressed: () => setState(
                          () => _obscurePassword = !_obscurePassword),
                    ),
                    validator: (v) {
                      if (v == null || v.isEmpty) return 'Password is required';
                      if (_mode == _EmailAuthMode.signUp && v.length < 8) {
                        return 'Password must be at least 8 characters';
                      }
                      return null;
                    },
                  ),
                ],
                const SizedBox(height: 28),
                VoxoButton(
                  label: _buttonLabel,
                  isLoading: _isLoading,
                  onPressed: _isLoading ? null : _submit,
                ),
                const SizedBox(height: 20),
                Center(child: _buildFooterAction()),
                const SizedBox(height: 24),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildFooterAction() {
    if (_mode == _EmailAuthMode.verify) {
      return TextButton(
        onPressed: _isLoading ? null : _resendCode,
        child: const Text(
          'Resend code',
          style: TextStyle(
            color: AppColors.primaryLight,
            fontFamily: 'Poppins',
          ),
        ),
      );
    }

    final isSignIn = _mode == _EmailAuthMode.signIn;
    return TextButton(
      onPressed: _isLoading
          ? null
          : () => setState(() => _mode =
              isSignIn ? _EmailAuthMode.signUp : _EmailAuthMode.signIn),
      child: Text.rich(
        TextSpan(
          text: isSignIn
              ? "Don't have an account? "
              : 'Already have an account? ',
          style: const TextStyle(
            color: AppColors.textTertiary,
            fontFamily: 'Poppins',
          ),
          children: [
            TextSpan(
              text: isSignIn ? 'Sign up' : 'Sign in',
              style: const TextStyle(
                color: AppColors.primaryLight,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCodeField() {
    return _buildTextField(
      controller: _codeController,
      hint: '6-digit code',
      icon: Icons.pin_outlined,
      keyboardType: TextInputType.number,
      validator: (v) {
        final value = v?.trim() ?? '';
        if (value.length != 6) return 'Enter the 6-digit code';
        return null;
      },
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String hint,
    required IconData icon,
    required String? Function(String?) validator,
    TextInputType? keyboardType,
    bool obscureText = false,
    Widget? suffix,
  }) {
    return TextFormField(
      controller: controller,
      keyboardType: keyboardType,
      obscureText: obscureText,
      validator: validator,
      style: const TextStyle(color: Colors.white, fontFamily: 'Poppins'),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: const TextStyle(color: AppColors.textTertiary),
        prefixIcon: Icon(icon, color: AppColors.textTertiary, size: 20),
        suffixIcon: suffix,
        filled: true,
        fillColor: AppColors.cardDark,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.dividerDark),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.primary),
        ),
      ),
    );
  }
}
