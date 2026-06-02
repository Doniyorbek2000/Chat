import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:pinput/pinput.dart';
import '../../../../core/providers/auth_provider.dart';
import '../../../../core/router/app_router.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/utils/app_utils.dart';
import '../../../../shared/widgets/voxo_button.dart';

class OtpScreen extends ConsumerStatefulWidget {
  final String phone;
  final String countryCode;

  const OtpScreen({
    super.key,
    required this.phone,
    required this.countryCode,
  });

  @override
  ConsumerState<OtpScreen> createState() => _OtpScreenState();
}

class _OtpScreenState extends ConsumerState<OtpScreen> {
  final _otpController = TextEditingController();
  Timer? _timer;
  int _secondsRemaining = 60;
  bool _canResend = false;
  bool _isVerifying = false;

  @override
  void initState() {
    super.initState();
    _startTimer();
  }

  @override
  void dispose() {
    _timer?.cancel();
    _otpController.dispose();
    super.dispose();
  }

  void _startTimer() {
    _secondsRemaining = 60;
    _canResend = false;
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_secondsRemaining > 0) {
        setState(() => _secondsRemaining--);
      } else {
        timer.cancel();
        setState(() => _canResend = true);
      }
    });
  }

  Future<void> _verifyOtp(String otp) async {
    if (otp.length < 6 || _isVerifying) return;

    setState(() => _isVerifying = true);
    AppUtils.mediumImpact();

    final success = await ref.read(authProvider.notifier).verifyOtp(
          phone: widget.phone,
          countryCode: widget.countryCode,
          otp: otp,
        );

    setState(() => _isVerifying = false);

    if (success && mounted) {
      final user = ref.read(authProvider).user;
      // If new user, go to profile setup; otherwise go home
      if (user != null && user.username.isEmpty) {
        context.go(AppRoutes.profileSetup);
      } else {
        context.go(AppRoutes.home);
      }
    } else if (mounted) {
      AppUtils.showErrorSnackBar(context, 'Invalid OTP. Please try again.');
      _otpController.clear();
    }
  }

  Future<void> _resendOtp() async {
    if (!_canResend) return;
    await ref.read(authProvider.notifier).sendOtp(
          widget.phone,
          widget.countryCode,
        );
    _startTimer();
    if (mounted) {
      AppUtils.showSnackBar(context, 'OTP sent successfully');
    }
  }

  @override
  Widget build(BuildContext context) {
    final defaultPinTheme = PinTheme(
      width: 52,
      height: 60,
      textStyle: const TextStyle(
        fontSize: 22,
        color: AppColors.textPrimary,
        fontWeight: FontWeight.bold,
        fontFamily: 'Poppins',
      ),
      decoration: BoxDecoration(
        color: AppColors.surfaceDark,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.dividerDark),
      ),
    );

    final focusedPinTheme = defaultPinTheme.copyWith(
      decoration: defaultPinTheme.decoration!.copyWith(
        border: Border.all(color: AppColors.primary, width: 2),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withOpacity(0.2),
            blurRadius: 8,
          ),
        ],
      ),
    );

    final submittedPinTheme = defaultPinTheme.copyWith(
      decoration: defaultPinTheme.decoration!.copyWith(
        color: AppColors.primary.withOpacity(0.15),
        border: Border.all(color: AppColors.primary),
      ),
    );

    return Scaffold(
      backgroundColor: AppColors.backgroundDark,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_rounded,
              color: AppColors.textPrimary),
          onPressed: () => context.pop(),
        ),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 20),

              // Header
              const Text(
                'Verify your\nphone number',
                style: TextStyle(
                  color: AppColors.textPrimary,
                  fontSize: 32,
                  fontWeight: FontWeight.bold,
                  fontFamily: 'Poppins',
                  height: 1.2,
                ),
              ).animate().fadeIn().slideX(begin: -0.3),

              const SizedBox(height: 12),

              RichText(
                text: TextSpan(
                  text: 'Enter the 6-digit code sent to ',
                  style: const TextStyle(
                    color: AppColors.textSecondary,
                    fontSize: 15,
                    fontFamily: 'Poppins',
                  ),
                  children: [
                    TextSpan(
                      text: '${widget.countryCode} ${widget.phone}',
                      style: const TextStyle(
                        color: AppColors.textPrimary,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ).animate().fadeIn(delay: 200.ms),

              const SizedBox(height: 48),

              // OTP Input
              Center(
                child: Pinput(
                  controller: _otpController,
                  length: 6,
                  defaultPinTheme: defaultPinTheme,
                  focusedPinTheme: focusedPinTheme,
                  submittedPinTheme: submittedPinTheme,
                  autofocus: true,
                  onCompleted: _verifyOtp,
                  hapticFeedbackType: HapticFeedbackType.lightImpact,
                ),
              ).animate().fadeIn(delay: 300.ms).scale(
                    begin: const Offset(0.8, 0.8),
                    delay: 300.ms,
                  ),

              const SizedBox(height: 32),

              // Resend timer
              Center(
                child: _canResend
                    ? TextButton(
                        onPressed: _resendOtp,
                        child: const Text(
                          'Resend OTP',
                          style: TextStyle(
                            color: AppColors.primary,
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                            fontFamily: 'Poppins',
                          ),
                        ),
                      )
                    : RichText(
                        text: TextSpan(
                          text: 'Resend code in ',
                          style: const TextStyle(
                            color: AppColors.textSecondary,
                            fontSize: 14,
                            fontFamily: 'Poppins',
                          ),
                          children: [
                            TextSpan(
                              text: '${_secondsRemaining}s',
                              style: const TextStyle(
                                color: AppColors.primary,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ),
              ).animate().fadeIn(delay: 400.ms),

              const SizedBox(height: 32),

              // Verify button
              VoxoButton(
                label: 'Verify',
                onPressed: _isVerifying
                    ? null
                    : () => _verifyOtp(_otpController.text),
                isLoading: _isVerifying,
                icon: Icons.verified_outlined,
              ).animate().fadeIn(delay: 500.ms).slideY(begin: 0.3),

              const Spacer(),

              // Security note
              Center(
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(
                      Icons.lock_outline_rounded,
                      color: AppColors.textTertiary,
                      size: 14,
                    ),
                    const SizedBox(width: 6),
                    const Text(
                      'Your data is secured with end-to-end encryption',
                      style: TextStyle(
                        color: AppColors.textTertiary,
                        fontSize: 12,
                        fontFamily: 'Poppins',
                      ),
                    ),
                  ],
                ),
              ).animate().fadeIn(delay: 600.ms),
            ],
          ),
        ),
      ),
    );
  }
}
