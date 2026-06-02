import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/providers/auth_provider.dart';
import '../../../../core/router/app_router.dart';
import '../../../../core/theme/app_colors.dart';

class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _pulseController;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat(reverse: true);

    _initialize();
  }

  Future<void> _initialize() async {
    // Check auth status
    await ref.read(authProvider.notifier).checkAuthStatus();

    // Minimum splash display time
    await Future.delayed(const Duration(milliseconds: 2500));

    if (mounted) {
      final authState = ref.read(authProvider);
      if (authState.isAuthenticated) {
        context.go(AppRoutes.home);
      } else {
        context.go(AppRoutes.onboarding);
      }
    }
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundDark,
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [
              Color(0xFF0A0A0F),
              Color(0xFF14083A),
              Color(0xFF0A0A0F),
            ],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: Stack(
          children: [
            // Background particles
            ..._buildParticles(),

            // Main content
            Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // Logo
                  _buildLogo(),

                  const SizedBox(height: 24),

                  // App name
                  _buildAppName(),

                  const SizedBox(height: 8),

                  // Tagline
                  _buildTagline(),

                  const SizedBox(height: 60),

                  // Loading indicator
                  _buildLoadingIndicator(),
                ],
              ),
            ),

            // Version text at bottom
            Positioned(
              bottom: 40,
              left: 0,
              right: 0,
              child: const Text(
                'v1.0.0',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: AppColors.textTertiary,
                  fontSize: 12,
                  fontFamily: 'Poppins',
                ),
              ).animate().fadeIn(delay: 1.seconds),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLogo() {
    return AnimatedBuilder(
      animation: _pulseController,
      builder: (context, child) {
        return Transform.scale(
          scale: 1.0 + (_pulseController.value * 0.05),
          child: child,
        );
      },
      child: Container(
        width: 120,
        height: 120,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          gradient: const RadialGradient(
            colors: [
              Color(0xFF9F67FF),
              Color(0xFF7C3AED),
              Color(0xFF5B21B6),
            ],
          ),
          boxShadow: [
            BoxShadow(
              color: AppColors.primary.withOpacity(0.6),
              blurRadius: 40,
              spreadRadius: 10,
            ),
          ],
        ),
        child: const Center(
          child: Text(
            'V',
            style: TextStyle(
              color: Colors.white,
              fontSize: 64,
              fontWeight: FontWeight.bold,
              fontFamily: 'Poppins',
            ),
          ),
        ),
      )
          .animate()
          .scale(
            begin: const Offset(0.3, 0.3),
            duration: 800.ms,
            curve: Curves.elasticOut,
          )
          .fadeIn(duration: 400.ms),
    );
  }

  Widget _buildAppName() {
    return ShaderMask(
      shaderCallback: (bounds) => AppColors.primaryGradient.createShader(bounds),
      child: const Text(
        'VOXO',
        style: TextStyle(
          color: Colors.white,
          fontSize: 48,
          fontWeight: FontWeight.bold,
          fontFamily: 'Poppins',
          letterSpacing: 8,
        ),
      ),
    )
        .animate()
        .fadeIn(delay: 400.ms, duration: 600.ms)
        .slideY(begin: 0.3, delay: 400.ms, duration: 600.ms);
  }

  Widget _buildTagline() {
    return const Text(
      'Connect. Chat. Vibe.',
      style: TextStyle(
        color: AppColors.textSecondary,
        fontSize: 16,
        fontFamily: 'Poppins',
        letterSpacing: 2,
      ),
    )
        .animate()
        .fadeIn(delay: 800.ms, duration: 600.ms)
        .slideY(begin: 0.3, delay: 800.ms, duration: 600.ms);
  }

  Widget _buildLoadingIndicator() {
    return Column(
      children: [
        SizedBox(
          width: 120,
          child: ClipRRect(
            borderRadius: BorderRadius.circular(2),
            child: LinearProgressIndicator(
              backgroundColor: AppColors.dividerDark,
              valueColor: const AlwaysStoppedAnimation<Color>(AppColors.primary),
              minHeight: 3,
            )
                .animate(onPlay: (c) => c.repeat())
                .shimmer(duration: 1.5.seconds, color: AppColors.primaryLight),
          ),
        ),
      ],
    ).animate().fadeIn(delay: 1.2.seconds, duration: 400.ms);
  }

  List<Widget> _buildParticles() {
    return List.generate(12, (index) {
      final positions = [
        [0.1, 0.1], [0.9, 0.15], [0.2, 0.8], [0.8, 0.7],
        [0.05, 0.5], [0.95, 0.45], [0.3, 0.05], [0.7, 0.95],
        [0.15, 0.65], [0.85, 0.35], [0.45, 0.9], [0.55, 0.08],
      ];
      final sizes = [4.0, 6.0, 3.0, 8.0, 5.0, 4.0, 7.0, 3.0, 5.0, 6.0, 4.0, 7.0];
      final delays = [0, 200, 400, 600, 800, 1000, 300, 500, 700, 100, 900, 150];

      final pos = positions[index % positions.length];
      final size = sizes[index % sizes.length];
      final delay = delays[index % delays.length];

      return Positioned(
        left: MediaQuery.of(context).size.width * pos[0],
        top: MediaQuery.of(context).size.height * pos[1],
        child: Container(
          width: size,
          height: size,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: index.isEven
                ? AppColors.primary.withOpacity(0.4)
                : AppColors.secondary.withOpacity(0.3),
          ),
        )
            .animate(
              onPlay: (c) => c.repeat(reverse: true),
            )
            .fadeIn(delay: Duration(milliseconds: delay))
            .scale(
              begin: const Offset(0.5, 0.5),
              end: const Offset(1.5, 1.5),
              duration: const Duration(seconds: 2),
            ),
      );
    });
  }
}
