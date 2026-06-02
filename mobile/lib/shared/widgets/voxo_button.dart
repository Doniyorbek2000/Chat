import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';

enum VoxoButtonType { primary, secondary, outline, ghost, danger }
enum VoxoButtonSize { small, medium, large }

class VoxoButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final VoxoButtonType type;
  final VoxoButtonSize size;
  final bool isLoading;
  final bool isFullWidth;
  final IconData? icon;
  final Widget? leading;
  final Widget? trailing;
  final BorderRadius? borderRadius;

  const VoxoButton({
    super.key,
    required this.label,
    this.onPressed,
    this.type = VoxoButtonType.primary,
    this.size = VoxoButtonSize.medium,
    this.isLoading = false,
    this.isFullWidth = true,
    this.icon,
    this.leading,
    this.trailing,
    this.borderRadius,
  });

  @override
  Widget build(BuildContext context) {
    final isDisabled = onPressed == null || isLoading;

    return SizedBox(
      width: isFullWidth ? double.infinity : null,
      height: _getHeight(),
      child: _buildButton(context, isDisabled),
    );
  }

  Widget _buildButton(BuildContext context, bool isDisabled) {
    switch (type) {
      case VoxoButtonType.primary:
        return _PrimaryButton(
          label: label,
          onPressed: isDisabled ? null : onPressed,
          isLoading: isLoading,
          size: size,
          icon: icon,
          leading: leading,
          trailing: trailing,
          borderRadius: borderRadius ?? BorderRadius.circular(12),
        );
      case VoxoButtonType.secondary:
        return _SecondaryButton(
          label: label,
          onPressed: isDisabled ? null : onPressed,
          isLoading: isLoading,
          size: size,
          icon: icon,
          borderRadius: borderRadius ?? BorderRadius.circular(12),
        );
      case VoxoButtonType.outline:
        return _OutlineButton(
          label: label,
          onPressed: isDisabled ? null : onPressed,
          isLoading: isLoading,
          size: size,
          icon: icon,
          borderRadius: borderRadius ?? BorderRadius.circular(12),
        );
      case VoxoButtonType.ghost:
        return _GhostButton(
          label: label,
          onPressed: isDisabled ? null : onPressed,
          isLoading: isLoading,
          size: size,
          icon: icon,
          borderRadius: borderRadius ?? BorderRadius.circular(12),
        );
      case VoxoButtonType.danger:
        return _DangerButton(
          label: label,
          onPressed: isDisabled ? null : onPressed,
          isLoading: isLoading,
          size: size,
          icon: icon,
          borderRadius: borderRadius ?? BorderRadius.circular(12),
        );
    }
  }

  double _getHeight() {
    switch (size) {
      case VoxoButtonSize.small:
        return 36;
      case VoxoButtonSize.medium:
        return 48;
      case VoxoButtonSize.large:
        return 56;
    }
  }
}

class _PrimaryButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final bool isLoading;
  final VoxoButtonSize size;
  final IconData? icon;
  final Widget? leading;
  final Widget? trailing;
  final BorderRadius borderRadius;

  const _PrimaryButton({
    required this.label,
    this.onPressed,
    required this.isLoading,
    required this.size,
    this.icon,
    this.leading,
    this.trailing,
    required this.borderRadius,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        gradient: onPressed != null
            ? AppColors.primaryGradient
            : const LinearGradient(
                colors: [Color(0xFF3D3D5C), Color(0xFF2A2A40)],
              ),
        borderRadius: borderRadius,
        boxShadow: onPressed != null
            ? [
                BoxShadow(
                  color: AppColors.primary.withOpacity(0.4),
                  blurRadius: 20,
                  offset: const Offset(0, 8),
                ),
              ]
            : null,
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onPressed,
          borderRadius: borderRadius,
          child: Padding(
            padding: _getPadding(),
            child: _buildContent(),
          ),
        ),
      ),
    );
  }

  Widget _buildContent() {
    if (isLoading) {
      return const Center(
        child: SizedBox(
          width: 20,
          height: 20,
          child: CircularProgressIndicator(
            color: Colors.white,
            strokeWidth: 2,
          ),
        ),
      );
    }

    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      mainAxisSize: MainAxisSize.min,
      children: [
        if (leading != null) ...[leading!, const SizedBox(width: 8)],
        if (icon != null) ...[
          Icon(icon, color: Colors.white, size: _getIconSize()),
          const SizedBox(width: 8),
        ],
        Text(
          label,
          style: TextStyle(
            color: Colors.white,
            fontSize: _getFontSize(),
            fontWeight: FontWeight.w600,
            fontFamily: 'Poppins',
          ),
        ),
        if (trailing != null) ...[const SizedBox(width: 8), trailing!],
      ],
    );
  }

  EdgeInsets _getPadding() {
    switch (size) {
      case VoxoButtonSize.small:
        return const EdgeInsets.symmetric(horizontal: 16, vertical: 8);
      case VoxoButtonSize.medium:
        return const EdgeInsets.symmetric(horizontal: 24, vertical: 12);
      case VoxoButtonSize.large:
        return const EdgeInsets.symmetric(horizontal: 32, vertical: 16);
    }
  }

  double _getFontSize() {
    switch (size) {
      case VoxoButtonSize.small:
        return 13;
      case VoxoButtonSize.medium:
        return 15;
      case VoxoButtonSize.large:
        return 17;
    }
  }

  double _getIconSize() {
    switch (size) {
      case VoxoButtonSize.small:
        return 16;
      case VoxoButtonSize.medium:
        return 18;
      case VoxoButtonSize.large:
        return 20;
    }
  }
}

class _SecondaryButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final bool isLoading;
  final VoxoButtonSize size;
  final IconData? icon;
  final BorderRadius borderRadius;

  const _SecondaryButton({
    required this.label,
    this.onPressed,
    required this.isLoading,
    required this.size,
    this.icon,
    required this.borderRadius,
  });

  @override
  Widget build(BuildContext context) {
    return ElevatedButton(
      onPressed: onPressed,
      style: ElevatedButton.styleFrom(
        backgroundColor: AppColors.secondary,
        foregroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: borderRadius),
        elevation: 0,
      ),
      child: isLoading
          ? const SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(
                color: Colors.white,
                strokeWidth: 2,
              ),
            )
          : Row(
              mainAxisAlignment: MainAxisAlignment.center,
              mainAxisSize: MainAxisSize.min,
              children: [
                if (icon != null) ...[
                  Icon(icon, size: 18),
                  const SizedBox(width: 8),
                ],
                Text(label,
                    style: const TextStyle(
                        fontWeight: FontWeight.w600,
                        fontFamily: 'Poppins')),
              ],
            ),
    );
  }
}

class _OutlineButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final bool isLoading;
  final VoxoButtonSize size;
  final IconData? icon;
  final BorderRadius borderRadius;

  const _OutlineButton({
    required this.label,
    this.onPressed,
    required this.isLoading,
    required this.size,
    this.icon,
    required this.borderRadius,
  });

  @override
  Widget build(BuildContext context) {
    return OutlinedButton(
      onPressed: onPressed,
      style: OutlinedButton.styleFrom(
        foregroundColor: AppColors.primary,
        side: const BorderSide(color: AppColors.primary, width: 1.5),
        shape: RoundedRectangleBorder(borderRadius: borderRadius),
      ),
      child: isLoading
          ? const SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(
                color: AppColors.primary,
                strokeWidth: 2,
              ),
            )
          : Row(
              mainAxisAlignment: MainAxisAlignment.center,
              mainAxisSize: MainAxisSize.min,
              children: [
                if (icon != null) ...[
                  Icon(icon, size: 18),
                  const SizedBox(width: 8),
                ],
                Text(label,
                    style: const TextStyle(
                        fontWeight: FontWeight.w600,
                        fontFamily: 'Poppins')),
              ],
            ),
    );
  }
}

class _GhostButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final bool isLoading;
  final VoxoButtonSize size;
  final IconData? icon;
  final BorderRadius borderRadius;

  const _GhostButton({
    required this.label,
    this.onPressed,
    required this.isLoading,
    required this.size,
    this.icon,
    required this.borderRadius,
  });

  @override
  Widget build(BuildContext context) {
    return TextButton(
      onPressed: onPressed,
      style: TextButton.styleFrom(
        foregroundColor: AppColors.textSecondary,
        shape: RoundedRectangleBorder(borderRadius: borderRadius),
        backgroundColor: AppColors.cardDark,
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 18),
            const SizedBox(width: 8),
          ],
          Text(label,
              style: const TextStyle(
                  fontWeight: FontWeight.w500, fontFamily: 'Poppins')),
        ],
      ),
    );
  }
}

class _DangerButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final bool isLoading;
  final VoxoButtonSize size;
  final IconData? icon;
  final BorderRadius borderRadius;

  const _DangerButton({
    required this.label,
    this.onPressed,
    required this.isLoading,
    required this.size,
    this.icon,
    required this.borderRadius,
  });

  @override
  Widget build(BuildContext context) {
    return ElevatedButton(
      onPressed: onPressed,
      style: ElevatedButton.styleFrom(
        backgroundColor: AppColors.error,
        foregroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: borderRadius),
        elevation: 0,
      ),
      child: isLoading
          ? const SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(
                color: Colors.white,
                strokeWidth: 2,
              ),
            )
          : Row(
              mainAxisAlignment: MainAxisAlignment.center,
              mainAxisSize: MainAxisSize.min,
              children: [
                if (icon != null) ...[
                  Icon(icon, size: 18),
                  const SizedBox(width: 8),
                ],
                Text(label,
                    style: const TextStyle(
                        fontWeight: FontWeight.w600,
                        fontFamily: 'Poppins')),
              ],
            ),
    );
  }
}

// Gradient icon button
class GradientIconButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback? onPressed;
  final double size;
  final List<Color>? gradientColors;
  final String? tooltip;

  const GradientIconButton({
    super.key,
    required this.icon,
    this.onPressed,
    this.size = 44,
    this.gradientColors,
    this.tooltip,
  });

  @override
  Widget build(BuildContext context) {
    final colors = gradientColors ??
        [AppColors.primary, AppColors.secondary];

    return Tooltip(
      message: tooltip ?? '',
      child: GestureDetector(
        onTap: onPressed,
        child: Container(
          width: size,
          height: size,
          decoration: BoxDecoration(
            gradient: LinearGradient(colors: colors),
            shape: BoxShape.circle,
            boxShadow: [
              BoxShadow(
                color: colors.first.withOpacity(0.4),
                blurRadius: 12,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Icon(icon, color: Colors.white, size: size * 0.45),
        ),
      ),
    );
  }
}
