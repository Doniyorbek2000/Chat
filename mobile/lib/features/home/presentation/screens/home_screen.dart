import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/network/api_client.dart';
import '../../../profile/presentation/screens/profile_screen.dart';
import '../../../messages/presentation/screens/messages_screen.dart';
import 'home_feed_screen.dart';
import 'discover_screen.dart';

final homeTabIndexProvider = StateProvider<int>((ref) => 0);
final unreadCountProvider = StateProvider<int>((ref) => 0);

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  late final List<Widget> _tabs;

  @override
  void initState() {
    super.initState();
    _tabs = const [
      HomeFeedScreen(),
      DiscoverScreen(),
      MessagesScreen(),
      ProfileScreen(),
    ];
    _loadUnreadCount();
  }

  Future<void> _loadUnreadCount() async {
    try {
      final api = ref.read(apiClientProvider);
      final res = await api.get('/notifications/unread-count');
      if (res.statusCode == 200 && mounted) {
        final data = res.data['data'] ?? res.data;
        final count = (data is Map ? data['count'] as int? : null) ?? 0;
        ref.read(unreadCountProvider.notifier).state = count;
      }
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final currentIndex = ref.watch(homeTabIndexProvider);
    final unread = ref.watch(unreadCountProvider);

    return Scaffold(
      backgroundColor: AppColors.backgroundDark,
      body: IndexedStack(
        index: currentIndex,
        children: _tabs,
      ),
      bottomNavigationBar: _BottomNav(
        currentIndex: currentIndex,
        unread: unread,
        onTap: (i) => ref.read(homeTabIndexProvider.notifier).state = i,
      ),
    );
  }
}

class _BottomNav extends StatelessWidget {
  final int currentIndex;
  final int unread;
  final ValueChanged<int> onTap;

  const _BottomNav({
    required this.currentIndex,
    required this.unread,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF0E0E1A),
        border: Border(
          top: BorderSide(color: Colors.white.withOpacity(0.08), width: 0.5),
        ),
      ),
      child: SafeArea(
        top: false,
        child: SizedBox(
          height: 60,
          child: Row(
            children: [
              _NavItem(
                index: 0,
                icon: Icons.home_outlined,
                activeIcon: Icons.home_rounded,
                label: 'Asosiy',
                current: currentIndex,
                onTap: onTap,
              ),
              _NavItem(
                index: 1,
                icon: Icons.explore_outlined,
                activeIcon: Icons.explore,
                label: 'Kashf qilish',
                current: currentIndex,
                onTap: onTap,
              ),
              _NavItem(
                index: 2,
                icon: Icons.chat_bubble_outline,
                activeIcon: Icons.chat_bubble,
                label: 'Xabar',
                current: currentIndex,
                badge: unread,
                onTap: onTap,
              ),
              _NavItem(
                index: 3,
                icon: Icons.person_outline,
                activeIcon: Icons.person,
                label: 'Men',
                current: currentIndex,
                onTap: onTap,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _NavItem extends StatelessWidget {
  final int index;
  final int current;
  final int badge;
  final IconData icon;
  final IconData activeIcon;
  final String label;
  final ValueChanged<int> onTap;

  const _NavItem({
    required this.index,
    required this.current,
    required this.icon,
    required this.activeIcon,
    required this.label,
    required this.onTap,
    this.badge = 0,
  });

  @override
  Widget build(BuildContext context) {
    final isActive = index == current;
    return Expanded(
      child: GestureDetector(
        onTap: () => onTap(index),
        behavior: HitTestBehavior.opaque,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Stack(
              clipBehavior: Clip.none,
              children: [
                AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  padding: const EdgeInsets.all(8),
                  decoration: isActive
                      ? BoxDecoration(
                          color: AppColors.primary.withOpacity(0.15),
                          borderRadius: BorderRadius.circular(12),
                        )
                      : null,
                  child: Icon(
                    isActive ? activeIcon : icon,
                    color: isActive ? AppColors.primary : Colors.white38,
                    size: 22,
                  ),
                ),
                if (badge > 0)
                  Positioned(
                    right: -2,
                    top: -2,
                    child: Container(
                      padding: const EdgeInsets.all(3),
                      decoration: const BoxDecoration(
                        color: Colors.red,
                        shape: BoxShape.circle,
                      ),
                      constraints: const BoxConstraints(
                        minWidth: 16,
                        minHeight: 16,
                      ),
                      child: Text(
                        badge > 99 ? '99+' : badge.toString(),
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 9,
                          fontWeight: FontWeight.bold,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: TextStyle(
                color: isActive ? AppColors.primary : Colors.white38,
                fontSize: 10,
                fontWeight: isActive ? FontWeight.w600 : FontWeight.normal,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
