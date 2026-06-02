import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import '../theme/app_colors.dart';

class AppUtils {
  AppUtils._();

  // Number formatting
  static String formatNumber(num number) {
    if (number >= 1000000) {
      return '${(number / 1000000).toStringAsFixed(1)}M';
    } else if (number >= 1000) {
      return '${(number / 1000).toStringAsFixed(1)}K';
    }
    return number.toString();
  }

  static String formatCoins(int coins) {
    return NumberFormat('#,###').format(coins);
  }

  static String formatCurrency(double amount, {String currency = 'UZS'}) {
    return NumberFormat.currency(
      symbol: currency,
      decimalDigits: 0,
    ).format(amount);
  }

  // Duration formatting
  static String formatDuration(Duration duration) {
    final hours = duration.inHours;
    final minutes = duration.inMinutes.remainder(60);
    final seconds = duration.inSeconds.remainder(60);

    if (hours > 0) {
      return '${hours.toString().padLeft(2, '0')}:'
          '${minutes.toString().padLeft(2, '0')}:'
          '${seconds.toString().padLeft(2, '0')}';
    }
    return '${minutes.toString().padLeft(2, '0')}:'
        '${seconds.toString().padLeft(2, '0')}';
  }

  static String formatLiveDuration(DateTime startTime) {
    final diff = DateTime.now().difference(startTime);
    return formatDuration(diff);
  }

  // Date formatting
  static String formatDate(DateTime date, {String format = 'MMM d, yyyy'}) {
    return DateFormat(format).format(date);
  }

  static String formatTime(DateTime date) {
    return DateFormat('HH:mm').format(date);
  }

  static String formatDateTime(DateTime date) {
    return DateFormat('MMM d, HH:mm').format(date);
  }

  static String formatTimeAgo(DateTime date) {
    final now = DateTime.now();
    final diff = now.difference(date);

    if (diff.inSeconds < 60) {
      return 'just now';
    } else if (diff.inMinutes < 60) {
      return '${diff.inMinutes}m ago';
    } else if (diff.inHours < 24) {
      return '${diff.inHours}h ago';
    } else if (diff.inDays < 7) {
      return '${diff.inDays}d ago';
    } else {
      return formatDate(date);
    }
  }

  // Clipboard
  static Future<void> copyToClipboard(
    BuildContext context,
    String text, {
    String? message,
  }) async {
    await Clipboard.setData(ClipboardData(text: text));
    if (context.mounted) {
      showSnackBar(context, message ?? 'Copied to clipboard');
    }
  }

  // Snackbar
  static void showSnackBar(
    BuildContext context,
    String message, {
    Color? backgroundColor,
    Duration duration = const Duration(seconds: 2),
    SnackBarAction? action,
    bool isError = false,
  }) {
    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          message,
          style: const TextStyle(
            color: Colors.white,
            fontFamily: 'Poppins',
            fontSize: 14,
          ),
        ),
        backgroundColor: backgroundColor ??
            (isError ? AppColors.error : AppColors.cardDark),
        duration: duration,
        action: action,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        margin: const EdgeInsets.all(16),
      ),
    );
  }

  static void showErrorSnackBar(BuildContext context, String message) {
    showSnackBar(context, message, isError: true);
  }

  static void showSuccessSnackBar(BuildContext context, String message) {
    showSnackBar(context, message, backgroundColor: AppColors.success);
  }

  // Dialogs
  static Future<bool> showConfirmDialog(
    BuildContext context, {
    required String title,
    required String message,
    String? confirmText,
    String? cancelText,
    bool isDestructive = false,
  }) async {
    final result = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(title),
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: Text(cancelText ?? 'Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: isDestructive
                ? TextButton.styleFrom(foregroundColor: AppColors.error)
                : null,
            child: Text(confirmText ?? 'Confirm'),
          ),
        ],
      ),
    );
    return result ?? false;
  }

  // Validation
  static bool isValidPhone(String phone) {
    return RegExp(r'^\d{7,15}$').hasMatch(phone);
  }

  static bool isValidUsername(String username) {
    return RegExp(r'^[a-zA-Z0-9_]{3,20}$').hasMatch(username);
  }

  static bool isValidEmail(String email) {
    return RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$').hasMatch(email);
  }

  static String? validateUsername(String? value) {
    if (value == null || value.isEmpty) return 'Username is required';
    if (value.length < 3) return 'Username must be at least 3 characters';
    if (value.length > 20) return 'Username must be at most 20 characters';
    if (!RegExp(r'^[a-zA-Z0-9_]+$').hasMatch(value)) {
      return 'Username can only contain letters, numbers and underscore';
    }
    return null;
  }

  // Color utilities
  static Color getVipColor(int vipLevel) {
    return AppColors.vipColors[vipLevel.clamp(0, 10)];
  }

  static Color getUsernameColor(int vipLevel) {
    if (vipLevel >= 8) return AppColors.vip10;
    if (vipLevel >= 5) return AppColors.vip5;
    if (vipLevel >= 3) return AppColors.vip3;
    if (vipLevel >= 1) return AppColors.vip1;
    return AppColors.textSecondary;
  }

  // Level XP
  static double getLevelProgress(int xp, int xpToNext) {
    if (xpToNext <= 0) return 1.0;
    return (xp / xpToNext).clamp(0.0, 1.0);
  }

  // Gift rarity color
  static Color getGiftRarityColor(String rarity) {
    switch (rarity.toLowerCase()) {
      case 'legendary':
        return const Color(0xFFFFD700);
      case 'epic':
        return const Color(0xFF9400D3);
      case 'rare':
        return const Color(0xFF0066FF);
      default:
        return AppColors.textSecondary;
    }
  }

  // Room type icon
  static IconData getRoomTypeIcon(String type) {
    switch (type.toLowerCase()) {
      case 'private':
        return Icons.lock_outline;
      case 'password':
        return Icons.key_outlined;
      case 'family':
        return Icons.people_outline;
      case 'vip':
        return Icons.diamond_outlined;
      default:
        return Icons.public;
    }
  }

  // Generate unique ID
  static String generateId() {
    return DateTime.now().millisecondsSinceEpoch.toRadixString(36) +
        (DateTime.now().microsecond).toRadixString(36);
  }

  // Haptic feedback
  static void lightImpact() {
    HapticFeedback.lightImpact();
  }

  static void mediumImpact() {
    HapticFeedback.mediumImpact();
  }

  static void heavyImpact() {
    HapticFeedback.heavyImpact();
  }

  static void selectionClick() {
    HapticFeedback.selectionClick();
  }
}
