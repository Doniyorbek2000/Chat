import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import 'package:smooth_page_indicator/smooth_page_indicator.dart';
import '../../../../core/router/app_router.dart';
import '../../../../core/storage/local_storage.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../shared/widgets/voxo_button.dart';

class OnboardingPage {
  final String title;
  final String subtitle;
  final IconData icon;
  final List<Color> gradientColors;

  const OnboardingPage({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.gradientColors,
  });
}

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final _pageController = PageController();
  int _currentPage = 0;

  final List<OnboardingPage> _pages = const [
    OnboardingPage(
      title: 'Voice Rooms\nCome Alive',
      subtitle:
          'Join thousands of live voice rooms. Talk, laugh and share moments with people worldwide.',
      icon: Icons.mic_rounded,
      gradientColors: [Color(0xFF7C3AED), Color(0xFF5B21B6)],
    ),
    OnboardingPage(
      title: 'Send Gifts &\nShow Love',
      subtitle:
          'Express yourself with stunning animated gifts. From roses to rockets — make someone\'s day!',
      icon: Icons.card_giftcard_rounded,
      gradientColors: [Color(0xFFEC4899), Color(0xFFBE185D)],
    ),
    OnboardingPage(
      title: 'Rise to the\nTop Together',
      subtitle:
          'Form families, find your couple, compete in PK battles and climb the leaderboards!',
      icon: Icons.emoji_events_rounded,
      gradientColors: [Color(0xFFF59E0B), Color(0xFFD97706)],
    ),
  ];

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  void _onGetStarted() {
    LocalStorageService.setOnboardingShown();
    context.go(AppRoutes.phoneLogin);
  }

  void _onSkip() {
    LocalStorageService.setOnboardingShown();
    context.go(AppRoutes.phoneLogin);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundDark,
      body: SafeArea(
        child: Column(
          children: [
            // Skip button
            Align(
              alignment: Alignment.topRight,
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: TextButton(
                  onPressed: _onSkip,
                  child: const Text(
                    'Skip',
                    style: TextStyle(
                      color: AppColors.textSecondary,
                      fontSize: 15,
                      fontFamily: 'Poppins',
                    ),
                  ),
                ),
              ),
            ),

            // Pages
            Expanded(
              child: PageView.builder(
                controller: _pageController,
                onPageChanged: (index) {
                  setState(() => _currentPage = index);
                },
                itemCount: _pages.length,
                itemBuilder: (context, index) {
                  return _buildPage(_pages[index], index);
                },
              ),
            ),

            // Bottom section
            Padding(
              padding: const EdgeInsets.all(32),
              child: Column(
                children: [
                  // Page indicator
                  SmoothPageIndicator(
                    controller: _pageController,
                    count: _pages.length,
                    effect: ExpandingDotsEffect(
                      dotColor: AppColors.dividerDark,
                      activeDotColor: AppColors.primary,
                      dotHeight: 8,
                      dotWidth: 8,
                      expansionFactor: 3,
                    ),
                  ),
                  const SizedBox(height: 32),

                  // Action buttons
                  if (_currentPage < _pages.length - 1)
                    VoxoButton(
                      label: 'Next',
                      onPressed: () {
                        _pageController.nextPage(
                          duration: const Duration(milliseconds: 400),
                          curve: Curves.easeInOut,
                        );
                      },
                    )
                  else
                    VoxoButton(
                      label: 'Get Started',
                      onPressed: _onGetStarted,
                      icon: Icons.arrow_forward_rounded,
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPage(OnboardingPage page, int index) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 32),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          // Illustration
          Container(
            width: 220,
            height: 220,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: RadialGradient(
                colors: [
                  page.gradientColors[0].withOpacity(0.2),
                  Colors.transparent,
                ],
              ),
            ),
            child: Center(
              child: Container(
                width: 150,
                height: 150,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: LinearGradient(
                    colors: page.gradientColors,
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: page.gradientColors[0].withOpacity(0.5),
                      blurRadius: 40,
                      spreadRadius: 10,
                    ),
                  ],
                ),
                child: Icon(
                  page.icon,
                  size: 70,
                  color: Colors.white,
                ),
              ),
            ),
          )
              .animate(key: ValueKey('icon_$index'))
              .scale(
                begin: const Offset(0.5, 0.5),
                duration: 700.ms,
                curve: Curves.elasticOut,
              )
              .fadeIn(duration: 400.ms),

          const SizedBox(height: 48),

          // Title
          Text(
            page.title,
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: AppColors.textPrimary,
              fontSize: 32,
              fontWeight: FontWeight.bold,
              fontFamily: 'Poppins',
              height: 1.2,
            ),
          )
              .animate(key: ValueKey('title_$index'))
              .fadeIn(delay: 200.ms, duration: 500.ms)
              .slideY(begin: 0.3, delay: 200.ms, duration: 500.ms),

          const SizedBox(height: 16),

          // Subtitle
          Text(
            page.subtitle,
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: AppColors.textSecondary,
              fontSize: 16,
              fontFamily: 'Poppins',
              height: 1.6,
            ),
          )
              .animate(key: ValueKey('sub_$index'))
              .fadeIn(delay: 400.ms, duration: 500.ms)
              .slideY(begin: 0.3, delay: 400.ms, duration: 500.ms),
        ],
      ),
    );
  }
}
