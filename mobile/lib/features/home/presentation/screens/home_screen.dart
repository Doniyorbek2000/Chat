import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/app_router.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../messages/presentation/screens/messages_screen.dart';
import '../../../profile/presentation/screens/profile_screen.dart';
import '../../../rooms/presentation/screens/room_list_screen.dart';
import 'discover_screen.dart';

final _homeIndexProvider = StateProvider<int>((ref) => 0);

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  final _screens = [
    const DiscoverScreen(),
    const RoomListScreen(),
    const SizedBox.shrink(),
    const MessagesScreen(),
    const ProfileScreen(),
  ];

  void _onNavTap(int index) {
    if (index == 2) {
      context.push(AppRoutes.createRoom);
      return;
    }
    ref.read(_homeIndexProvider.notifier).state = index;
  }

  @override
  Widget build(BuildContext context) {
    final currentIndex = ref.watch(_homeIndexProvider);

    return Scaffold(
      backgroundColor: AppColors.backgroundDark,
      body: IndexedStack(
        index: currentIndex > 2 ? currentIndex - 1 : currentIndex,
        children: [
          _screens[0],
          _screens[1],
          _screens[3],
          _screens[4],
        ],
      ),
      bottomNavigationBar: _buildBottomNav(currentIndex),
      floatingActionButton: null,
    );
  }

  Widget _buildBottomNav(int currentIndex) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surfaceDark,
        border: Border(
          top: BorderSide(
            color: AppColors.dividerDark,
            width: 0.5,
          ),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.3),
            blurRadius: 20,
            offset: const Offset(0, -5),
          ),
        ],
      ),
      child: SafeArea(
        child: SizedBox(
          height: 60,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildNavItem(
                index: 0,
                icon: Icons.home_outlined,
                activeIcon: Icons.home,
                label: 'Home',
                currentIndex: currentIndex,
              ),
              _buildNavItem(
                index: 1,
                icon: Icons.mic_none_outlined,
                activeIcon: Icons.mic,
                label: 'Rooms',
                currentIndex: currentIndex,
              ),
              _buildFABItem(),
              _buildNavItem(
                index: 3,
                icon: Icons.chat_bubble_outline,
                activeIcon: Icons.chat_bubble,
                label: 'Messages',
                currentIndex: currentIndex,
                badgeCount: 3,
              ),
              _buildNavItem(
                index: 4,
                icon: Icons.person_outline,
                activeIcon: Icons.person,
                label: 'Profile',
                currentIndex: currentIndex,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildNavItem({
    required int index,
    required IconData icon,
    required IconData activeIcon,
    required String label,
    required int currentIndex,
    int badgeCount = 0,
  }) {
    final isActive = currentIndex == index;
    return GestureDetector(
      onTap: () => _onNavTap(index),
      behavior: HitTestBehavior.opaque,
      child: SizedBox(
        width: 64,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Stack(
              clipBehavior: Clip.none,
              children: [
                AnimatedSwitcher(
                  duration: const Duration(milliseconds: 200),
                  child: Icon(
                    isActive ? activeIcon : icon,
                    key: ValueKey(isActive),
                    color: isActive ? AppColors.primary : AppColors.textTertiary,
                    size: 24,
                  ),
                ),
                if (badgeCount > 0)
                  Positioned(
                    top: -4,
                    right: -8,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 5, vertical: 1),
                      decoration: BoxDecoration(
                        color: AppColors.error,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        badgeCount > 99 ? '99+' : badgeCount.toString(),
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 9,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 3),
            AnimatedDefaultTextStyle(
              duration: const Duration(milliseconds: 200),
              style: TextStyle(
                fontSize: 10,
                fontWeight: isActive ? FontWeight.w600 : FontWeight.normal,
                color: isActive ? AppColors.primary : AppColors.textTertiary,
                fontFamily: 'Poppins',
              ),
              child: Text(label),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFABItem() {
    return GestureDetector(
      onTap: () => _onNavTap(2),
      child: Container(
        width: 52,
        height: 52,
        decoration: BoxDecoration(
          gradient: AppColors.primaryGradient,
          shape: BoxShape.circle,
          boxShadow: [
            BoxShadow(
              color: AppColors.primary.withOpacity(0.5),
              blurRadius: 16,
              spreadRadius: 2,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: const Icon(
          Icons.add,
          color: Colors.white,
          size: 28,
        ),
      ),
    );
  }
}
