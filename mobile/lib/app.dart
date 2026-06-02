import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'core/router/app_router.dart';
import 'core/theme/app_theme.dart';
import 'core/storage/local_storage.dart';

class VoxoApp extends ConsumerStatefulWidget {
  const VoxoApp({super.key});

  @override
  ConsumerState<VoxoApp> createState() => _VoxoAppState();
}

class _VoxoAppState extends ConsumerState<VoxoApp> {
  @override
  Widget build(BuildContext context) {
    final router = ref.watch(routerProvider);
    final themeMode = _getThemeMode();

    return ScreenUtilInit(
      designSize: const Size(390, 844),
      minTextAdapt: true,
      splitScreenMode: true,
      builder: (context, child) {
        return MaterialApp.router(
          title: 'VOXO',
          debugShowCheckedModeBanner: false,
          theme: AppTheme.lightTheme,
          darkTheme: AppTheme.darkTheme,
          themeMode: themeMode,
          routerConfig: router,
          builder: (context, widget) {
            // Ensure text scaling doesn't break layout
            return MediaQuery(
              data: MediaQuery.of(context).copyWith(
                textScaler: TextScaler.linear(
                  MediaQuery.of(context).textScaleFactor.clamp(0.8, 1.2),
                ),
              ),
              child: widget ?? const SizedBox.shrink(),
            );
          },
        );
      },
    );
  }

  ThemeMode _getThemeMode() {
    final savedMode = LocalStorageService.getThemeMode();
    switch (savedMode) {
      case 'light':
        return ThemeMode.light;
      case 'system':
        return ThemeMode.system;
      default:
        return ThemeMode.dark;
    }
  }
}
