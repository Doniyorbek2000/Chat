import 'package:flutter/material.dart';

class AppColors {
  AppColors._();

  // Convenience aliases
  static const Color background = backgroundDark;
  static const Color surface = surfaceDark;
  static const Color card = cardDark;

  // Brand Colors
  static const Color primary = Color(0xFF7C3AED);
  static const Color primaryLight = Color(0xFF9F67FF);
  static const Color primaryDark = Color(0xFF5B21B6);
  static const Color secondary = Color(0xFFEC4899);
  static const Color secondaryLight = Color(0xFFF472B6);
  static const Color secondaryDark = Color(0xFFBE185D);
  static const Color accent = Color(0xFF06B6D4);
  static const Color accentLight = Color(0xFF67E8F9);

  // Background Colors (Dark Theme)
  static const Color backgroundDark = Color(0xFF0A0A0F);
  static const Color surfaceDark = Color(0xFF12121A);
  static const Color cardDark = Color(0xFF1A1A28);
  static const Color elevatedDark = Color(0xFF222236);
  static const Color dividerDark = Color(0xFF2A2A3E);

  // Background Colors (Light Theme)
  static const Color backgroundLight = Color(0xFFF8F8FC);
  static const Color surfaceLight = Color(0xFFFFFFFF);
  static const Color cardLight = Color(0xFFF0F0F8);
  static const Color elevatedLight = Color(0xFFE8E8F0);
  static const Color dividerLight = Color(0xFFDDDDEE);

  // Text Colors
  static const Color textPrimary = Color(0xFFFFFFFF);
  static const Color textSecondary = Color(0xFFB0B0C8);
  static const Color textTertiary = Color(0xFF6B6B8A);
  static const Color textDisabled = Color(0xFF3D3D5C);
  static const Color textDark = Color(0xFF0A0A1A);
  static const Color textDarkSecondary = Color(0xFF444466);

  // Status Colors
  static const Color success = Color(0xFF10B981);
  static const Color successLight = Color(0xFF34D399);
  static const Color warning = Color(0xFFF59E0B);
  static const Color warningLight = Color(0xFFFBBF24);
  static const Color error = Color(0xFFEF4444);
  static const Color errorLight = Color(0xFFF87171);
  static const Color info = Color(0xFF3B82F6);
  static const Color infoLight = Color(0xFF60A5FA);

  // VIP Colors
  static const Color vip1 = Color(0xFFCD7F32); // Bronze
  static const Color vip2 = Color(0xFFC0C0C0); // Silver
  static const Color vip3 = Color(0xFFFFD700); // Gold
  static const Color vip4 = Color(0xFF00CED1); // Teal
  static const Color vip5 = Color(0xFF9400D3); // Violet
  static const Color vip6 = Color(0xFFFF4500); // OrangeRed
  static const Color vip7 = Color(0xFF00FFFF); // Cyan
  static const Color vip8 = Color(0xFFFF69B4); // HotPink
  static const Color vip9 = Color(0xFF7FFFD4); // Aquamarine
  static const Color vip10 = Color(0xFFFFD700); // Diamond Gold

  static List<Color> vipColors = [
    Colors.transparent, vip1, vip2, vip3, vip4,
    vip5, vip6, vip7, vip8, vip9, vip10,
  ];

  // Coin & Diamond
  static const Color coin = Color(0xFFFFD700);
  static const Color diamond = Color(0xFF00CFFF);

  // Room seat colors
  static const Color seatEmpty = Color(0xFF1E1E30);
  static const Color seatLocked = Color(0xFF16162A);
  static const Color seatOccupied = Color(0xFF2A1A50);
  static const Color seatHost = Color(0xFF3D1A6E);
  static const Color micOn = Color(0xFF10B981);
  static const Color micOff = Color(0xFFEF4444);

  // Gradients
  static const LinearGradient primaryGradient = LinearGradient(
    colors: [Color(0xFF7C3AED), Color(0xFFEC4899)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient backgroundGradient = LinearGradient(
    colors: [Color(0xFF0A0A0F), Color(0xFF12122A)],
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
  );

  static const LinearGradient cardGradient = LinearGradient(
    colors: [Color(0xFF1A1A28), Color(0xFF14142A)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient purpleGradient = LinearGradient(
    colors: [Color(0xFF5B21B6), Color(0xFF7C3AED), Color(0xFF9F67FF)],
    begin: Alignment.bottomLeft,
    end: Alignment.topRight,
  );

  static const LinearGradient goldGradient = LinearGradient(
    colors: [Color(0xFFB45309), Color(0xFFFFD700), Color(0xFFB45309)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient diamondGradient = LinearGradient(
    colors: [Color(0xFF0EA5E9), Color(0xFF00CFFF), Color(0xFF67E8F9)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const RadialGradient spotlightGradient = RadialGradient(
    colors: [Color(0x557C3AED), Colors.transparent],
    radius: 0.8,
  );

  // Overlay colors
  static const Color overlay = Color(0x80000000);
  static const Color overlayLight = Color(0x40000000);
  static const Color overlayHeavy = Color(0xB0000000);

  // Online indicator
  static const Color online = Color(0xFF10B981);
  static const Color offline = Color(0xFF6B6B8A);
  static const Color busy = Color(0xFFF59E0B);

  // Shadow
  static const Color shadowPrimary = Color(0x407C3AED);
  static const Color shadowDark = Color(0x40000000);
}
