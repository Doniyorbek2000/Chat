import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../features/auth/presentation/screens/splash_screen.dart';
import '../../features/auth/presentation/screens/onboarding_screen.dart';
import '../../features/auth/presentation/screens/phone_login_screen.dart';
import '../../features/auth/presentation/screens/otp_screen.dart';
import '../../features/auth/presentation/screens/profile_setup_screen.dart';
import '../../features/home/presentation/screens/home_screen.dart';
import '../../features/home/presentation/screens/discover_screen.dart';
import '../../features/rooms/presentation/screens/room_list_screen.dart';
import '../../features/rooms/presentation/screens/room_screen.dart';
import '../../features/rooms/presentation/screens/create_room_screen.dart';
import '../../features/profile/presentation/screens/profile_screen.dart';
import '../../features/profile/presentation/screens/edit_profile_screen.dart';
import '../../features/wallet/presentation/screens/wallet_screen.dart';
import '../../features/wallet/presentation/screens/recharge_screen.dart';
import '../../features/vip/presentation/screens/vip_screen.dart';
import '../../features/leaderboard/presentation/screens/leaderboard_screen.dart';
import '../../features/family/presentation/screens/family_screen.dart';
import '../../features/family/presentation/screens/family_details_screen.dart';
import '../../features/messages/presentation/screens/messages_screen.dart';
import '../../features/messages/presentation/screens/chat_screen.dart';
import '../../features/notifications/presentation/screens/notifications_screen.dart';
import '../../features/settings/presentation/screens/settings_screen.dart';
import '../../features/agency/presentation/screens/agency_screen.dart';
import '../../features/couple/presentation/screens/couple_screen.dart';
import '../../features/events/presentation/screens/events_screen.dart';
import '../../features/events/presentation/screens/event_detail_screen.dart';
import '../../features/rewards/presentation/screens/daily_rewards_screen.dart';
import '../providers/auth_provider.dart';

class AppRoutes {
  static const String splash = '/splash';
  static const String onboarding = '/onboarding';
  static const String phoneLogin = '/auth/phone';
  static const String otp = '/auth/otp';
  static const String profileSetup = '/auth/profile-setup';
  static const String home = '/';
  static const String discover = '/discover';
  static const String rooms = '/rooms';
  static const String room = '/rooms/:id';
  static const String createRoom = '/rooms/create';
  static const String profile = '/profile/:uid';
  static const String editProfile = '/profile/edit';
  static const String wallet = '/wallet';
  static const String recharge = '/wallet/recharge';
  static const String transfer = '/wallet/transfer';
  static const String withdraw = '/wallet/withdraw';
  static const String vip = '/vip';
  static const String leaderboard = '/leaderboard';
  static const String family = '/family';
  static const String familyDetails = '/family/:id';
  static const String createFamily = '/family/create';
  static const String messages = '/messages';
  static const String chat = '/messages/:userId';
  static const String notifications = '/notifications';
  static const String settings = '/settings';
  static const String agency = '/agency';
  static const String couple = '/couple';
  static const String events = '/events';
  static const String eventDetail = '/events/:id';
  static const String dailyRewards = '/rewards/daily';
}

final routerProvider = Provider<GoRouter>((ref) {
  final authNotifier = ref.watch(authProvider.notifier);
  final authState = ref.watch(authProvider);

  return GoRouter(
    initialLocation: AppRoutes.splash,
    debugLogDiagnostics: true,
    redirect: (context, state) {
      final isLoading = authState.status == AuthStatus.initial ||
          authState.status == AuthStatus.loading;
      final isAuthenticated = authState.isAuthenticated;
      final location = state.matchedLocation;

      // Allow splash always
      if (location == AppRoutes.splash) return null;

      // Loading state - stay on splash
      if (isLoading) return AppRoutes.splash;

      // Auth routes
      final isOnAuthRoute = location.startsWith('/auth') ||
          location == AppRoutes.onboarding;

      if (!isAuthenticated && !isOnAuthRoute) {
        return AppRoutes.onboarding;
      }

      if (isAuthenticated && isOnAuthRoute) {
        return AppRoutes.home;
      }

      return null;
    },
    routes: [
      GoRoute(
        path: AppRoutes.splash,
        pageBuilder: (context, state) => _buildPage(
          state,
          const SplashScreen(),
        ),
      ),
      GoRoute(
        path: AppRoutes.onboarding,
        pageBuilder: (context, state) => _buildPage(
          state,
          const OnboardingScreen(),
        ),
      ),
      GoRoute(
        path: AppRoutes.phoneLogin,
        pageBuilder: (context, state) => _buildPage(
          state,
          const PhoneLoginScreen(),
        ),
      ),
      GoRoute(
        path: AppRoutes.otp,
        pageBuilder: (context, state) {
          final extra = state.extra as Map<String, String>?;
          return _buildPage(
            state,
            OtpScreen(
              phone: extra?['phone'] ?? '',
              countryCode: extra?['countryCode'] ?? '+998',
            ),
          );
        },
      ),
      GoRoute(
        path: AppRoutes.profileSetup,
        pageBuilder: (context, state) => _buildPage(
          state,
          const ProfileSetupScreen(),
        ),
      ),
      GoRoute(
        path: AppRoutes.home,
        pageBuilder: (context, state) => _buildPage(
          state,
          const HomeScreen(),
        ),
        routes: [
          GoRoute(
            path: 'rooms',
            pageBuilder: (context, state) => _buildPage(
              state,
              const RoomListScreen(),
            ),
          ),
        ],
      ),
      GoRoute(
        path: '/rooms/create',
        pageBuilder: (context, state) => _buildPage(
          state,
          const CreateRoomScreen(),
        ),
      ),
      GoRoute(
        path: '/rooms/:id',
        pageBuilder: (context, state) {
          final roomId = state.pathParameters['id']!;
          return _buildSlideUpPage(
            state,
            RoomScreen(roomId: roomId),
          );
        },
      ),
      GoRoute(
        path: '/profile/edit',
        pageBuilder: (context, state) => _buildPage(
          state,
          const EditProfileScreen(),
        ),
      ),
      GoRoute(
        path: '/profile/:uid',
        pageBuilder: (context, state) {
          final uid = state.pathParameters['uid']!;
          return _buildPage(
            state,
            ProfileScreen(uid: uid),
          );
        },
      ),
      GoRoute(
        path: AppRoutes.wallet,
        pageBuilder: (context, state) => _buildPage(
          state,
          const WalletScreen(),
        ),
      ),
      GoRoute(
        path: AppRoutes.recharge,
        pageBuilder: (context, state) => _buildPage(
          state,
          const RechargeScreen(),
        ),
      ),
      GoRoute(
        path: AppRoutes.vip,
        pageBuilder: (context, state) => _buildPage(
          state,
          const VipScreen(),
        ),
      ),
      GoRoute(
        path: AppRoutes.leaderboard,
        pageBuilder: (context, state) => _buildPage(
          state,
          const LeaderboardScreen(),
        ),
      ),
      GoRoute(
        path: '/family',
        pageBuilder: (context, state) => _buildPage(
          state,
          const FamilyScreen(),
        ),
      ),
      GoRoute(
        path: '/family/:id',
        pageBuilder: (context, state) {
          final id = state.pathParameters['id']!;
          return _buildPage(
            state,
            FamilyDetailsScreen(familyId: id),
          );
        },
      ),
      GoRoute(
        path: AppRoutes.messages,
        pageBuilder: (context, state) => _buildPage(
          state,
          const MessagesScreen(),
        ),
      ),
      GoRoute(
        path: '/messages/:userId',
        pageBuilder: (context, state) {
          final userId = state.pathParameters['userId']!;
          final extra = state.extra as Map<String, dynamic>?;
          return _buildPage(
            state,
            ChatScreen(
              userId: userId,
              username: extra?['username'] as String? ?? 'User',
              avatar: extra?['avatar'] as String?,
            ),
          );
        },
      ),
      GoRoute(
        path: AppRoutes.notifications,
        pageBuilder: (context, state) => _buildPage(
          state,
          const NotificationsScreen(),
        ),
      ),
      GoRoute(
        path: AppRoutes.settings,
        pageBuilder: (context, state) => _buildPage(
          state,
          const SettingsScreen(),
        ),
      ),
      GoRoute(
        path: AppRoutes.agency,
        pageBuilder: (context, state) => _buildPage(
          state,
          const AgencyScreen(),
        ),
      ),
      GoRoute(
        path: AppRoutes.couple,
        pageBuilder: (context, state) => _buildPage(
          state,
          const CoupleScreen(),
        ),
      ),
      GoRoute(
        path: AppRoutes.events,
        pageBuilder: (context, state) => _buildPage(
          state,
          const EventsScreen(),
        ),
      ),
      GoRoute(
        path: '/events/:id',
        pageBuilder: (context, state) {
          final eventId = state.pathParameters['id']!;
          return _buildPage(
            state,
            EventDetailScreen(eventId: eventId),
          );
        },
      ),
      GoRoute(
        path: AppRoutes.dailyRewards,
        pageBuilder: (context, state) => _buildPage(
          state,
          const DailyRewardsScreen(),
        ),
      ),
    ],
    errorBuilder: (context, state) => Scaffold(
      backgroundColor: const Color(0xFF0A0A0F),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, color: Colors.red, size: 64),
            const SizedBox(height: 16),
            Text(
              'Page not found',
              style: const TextStyle(
                color: Colors.white,
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            TextButton(
              onPressed: () => context.go(AppRoutes.home),
              child: const Text('Go Home'),
            ),
          ],
        ),
      ),
    ),
  );
});

CustomTransitionPage<T> _buildPage<T>(
  GoRouterState state,
  Widget child,
) {
  return CustomTransitionPage<T>(
    key: state.pageKey,
    child: child,
    transitionsBuilder: (context, animation, secondaryAnimation, child) {
      return FadeTransition(
        opacity: CurvedAnimation(
          parent: animation,
          curve: Curves.easeInOut,
        ),
        child: child,
      );
    },
    transitionDuration: const Duration(milliseconds: 250),
  );
}

CustomTransitionPage<T> _buildSlideUpPage<T>(
  GoRouterState state,
  Widget child,
) {
  return CustomTransitionPage<T>(
    key: state.pageKey,
    child: child,
    transitionsBuilder: (context, animation, secondaryAnimation, child) {
      const begin = Offset(0.0, 1.0);
      const end = Offset.zero;
      const curve = Curves.easeOutCubic;

      final tween =
          Tween(begin: begin, end: end).chain(CurveTween(curve: curve));

      return SlideTransition(
        position: animation.drive(tween),
        child: child,
      );
    },
    transitionDuration: const Duration(milliseconds: 400),
  );
}
