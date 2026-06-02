import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import 'voxo_button.dart';

class EmptyStateWidget extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? subtitle;
  final String? actionLabel;
  final VoidCallback? onAction;
  final double iconSize;
  final Color? iconColor;

  const EmptyStateWidget({
    super.key,
    required this.icon,
    required this.title,
    this.subtitle,
    this.actionLabel,
    this.onAction,
    this.iconSize = 72,
    this.iconColor,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: iconSize + 32,
              height: iconSize + 32,
              decoration: BoxDecoration(
                color: (iconColor ?? AppColors.primary).withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(
                icon,
                size: iconSize,
                color: iconColor ?? AppColors.primary.withOpacity(0.5),
              ),
            ),
            const SizedBox(height: 20),
            Text(
              title,
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: AppColors.textPrimary,
                fontSize: 18,
                fontWeight: FontWeight.w600,
                fontFamily: 'Poppins',
              ),
            ),
            if (subtitle != null) ...[
              const SizedBox(height: 8),
              Text(
                subtitle!,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: AppColors.textSecondary,
                  fontSize: 14,
                  fontFamily: 'Poppins',
                ),
              ),
            ],
            if (actionLabel != null && onAction != null) ...[
              const SizedBox(height: 24),
              VoxoButton(
                label: actionLabel!,
                onPressed: onAction,
                isFullWidth: false,
                size: VoxoButtonSize.medium,
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class NoRoomsWidget extends StatelessWidget {
  final VoidCallback? onCreateRoom;

  const NoRoomsWidget({super.key, this.onCreateRoom});

  @override
  Widget build(BuildContext context) {
    return EmptyStateWidget(
      icon: Icons.mic_none_outlined,
      title: 'No rooms available',
      subtitle: 'Be the first to start a voice room\nand invite others!',
      actionLabel: 'Create Room',
      onAction: onCreateRoom,
    );
  }
}

class NoMessagesWidget extends StatelessWidget {
  const NoMessagesWidget({super.key});

  @override
  Widget build(BuildContext context) {
    return const EmptyStateWidget(
      icon: Icons.chat_bubble_outline,
      title: 'No messages yet',
      subtitle: 'Start a conversation with someone\nyou follow!',
    );
  }
}

class NoNotificationsWidget extends StatelessWidget {
  const NoNotificationsWidget({super.key});

  @override
  Widget build(BuildContext context) {
    return const EmptyStateWidget(
      icon: Icons.notifications_none_outlined,
      title: 'No notifications',
      subtitle: 'You\'re all caught up!\nCheck back later.',
    );
  }
}

class ErrorStateWidget extends StatelessWidget {
  final String? message;
  final VoidCallback? onRetry;

  const ErrorStateWidget({
    super.key,
    this.message,
    this.onRetry,
  });

  @override
  Widget build(BuildContext context) {
    return EmptyStateWidget(
      icon: Icons.error_outline,
      iconColor: AppColors.error,
      title: 'Something went wrong',
      subtitle: message ?? 'Please try again later.',
      actionLabel: onRetry != null ? 'Try Again' : null,
      onAction: onRetry,
    );
  }
}
