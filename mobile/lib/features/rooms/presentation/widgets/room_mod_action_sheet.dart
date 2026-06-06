import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../../core/theme/app_colors.dart';
import '../../../../../core/network/api_client.dart';
import '../../../../../shared/widgets/user_avatar.dart';

class RoomModActionSheet extends ConsumerStatefulWidget {
  final String roomId;
  final String targetUserId;
  final String targetDisplayName;
  final String? targetAvatar;
  final bool isCurrentUserHost;
  final bool isCurrentUserModerator;

  const RoomModActionSheet({
    super.key,
    required this.roomId,
    required this.targetUserId,
    required this.targetDisplayName,
    this.targetAvatar,
    required this.isCurrentUserHost,
    required this.isCurrentUserModerator,
  });

  static Future<void> show(
    BuildContext context, {
    required String roomId,
    required String targetUserId,
    required String targetDisplayName,
    String? targetAvatar,
    required bool isCurrentUserHost,
    required bool isCurrentUserModerator,
  }) {
    return showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (_) => RoomModActionSheet(
        roomId: roomId,
        targetUserId: targetUserId,
        targetDisplayName: targetDisplayName,
        targetAvatar: targetAvatar,
        isCurrentUserHost: isCurrentUserHost,
        isCurrentUserModerator: isCurrentUserModerator,
      ),
    );
  }

  @override
  ConsumerState<RoomModActionSheet> createState() => _RoomModActionSheetState();
}

class _RoomModActionSheetState extends ConsumerState<RoomModActionSheet> {
  bool _loading = false;
  String? _activeAction;

  Future<void> _perform(String action, Map<String, dynamic>? body) async {
    setState(() { _loading = true; _activeAction = action; });
    try {
      final api = ref.read(apiClientProvider);
      final roomId = widget.roomId;
      final userId = widget.targetUserId;

      switch (action) {
        case 'mute':
          await api.post('/rooms/$roomId/users/$userId/mute', data: body ?? {});
          break;
        case 'unmute':
          await api.delete('/rooms/$roomId/users/$userId/mute');
          break;
        case 'kick':
          await api.post('/rooms/$roomId/users/$userId/kick');
          break;
        case 'ban':
          await api.post('/rooms/$roomId/users/$userId/ban', data: body ?? {});
          break;
        case 'unban':
          await api.delete('/rooms/$roomId/users/$userId/ban');
          break;
        case 'add_mod':
          await api.post('/rooms/$roomId/moderators/$userId');
          break;
        case 'remove_mod':
          await api.delete('/rooms/$roomId/moderators/$userId');
          break;
      }

      if (mounted) {
        Navigator.pop(context, action);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(_actionSuccess(action), style: const TextStyle(fontFamily: 'Poppins')), backgroundColor: AppColors.success),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString(), style: const TextStyle(fontFamily: 'Poppins')), backgroundColor: AppColors.error),
        );
      }
    } finally {
      if (mounted) setState(() { _loading = false; _activeAction = null; });
    }
  }

  String _actionSuccess(String action) {
    const msgs = {
      'mute': 'Foydalanuvchi ovozi o\'chirildi',
      'unmute': 'Foydalanuvchi ovozi yoqildi',
      'kick': 'Foydalanuvchi xonadan chiqarildi',
      'ban': 'Foydalanuvchi bloklandi',
      'unban': 'Blok bekor qilindi',
      'add_mod': 'Moderator qo\'shildi',
      'remove_mod': 'Moderator olib tashlandi',
    };
    return msgs[action] ?? 'Amal bajarildi';
  }

  @override
  Widget build(BuildContext context) {
    final canModerate = widget.isCurrentUserHost || widget.isCurrentUserModerator;
    return Container(
      decoration: const BoxDecoration(
        color: AppColors.surfaceDark,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Center(child: Container(margin: const EdgeInsets.only(top: 12, bottom: 16), width: 40, height: 4, decoration: BoxDecoration(color: AppColors.dividerDark, borderRadius: BorderRadius.circular(2)))),
            _buildTargetUser(),
            const Divider(color: AppColors.dividerDark, height: 1),
            if (canModerate) ...[
              _buildAction('mute', Icons.mic_off, 'Ovozni O\'chirish', AppColors.warning),
              _buildAction('unmute', Icons.mic, 'Ovozni Yoqish', AppColors.success),
              _buildAction('kick', Icons.logout, 'Xonadan Chiqarish', AppColors.warning),
              if (widget.isCurrentUserHost) ...[
                _buildAction('ban', Icons.block, 'Bloklash', AppColors.error, destructive: true),
                _buildAction('add_mod', Icons.shield, 'Moderator Qo\'shish', AppColors.info),
                _buildAction('remove_mod', Icons.shield_outlined, 'Moderatorni Olib Tashlash', AppColors.textSecondary),
              ],
            ] else
              const Padding(
                padding: EdgeInsets.all(24),
                child: Text('Sizda moderator huquqlari yo\'q', style: TextStyle(color: AppColors.textSecondary, fontFamily: 'Poppins')),
              ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }

  Widget _buildTargetUser() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
      child: Row(
        children: [
          UserAvatar(avatarUrl: widget.targetAvatar, size: 44, isOnline: false),
          const SizedBox(width: 12),
          Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(widget.targetDisplayName, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16, fontFamily: 'Poppins')),
            const Text('Foydalanuvchi amallari', style: TextStyle(color: AppColors.textSecondary, fontSize: 12, fontFamily: 'Poppins')),
          ]),
        ],
      ),
    );
  }

  Widget _buildAction(String action, IconData icon, String label, Color color, {bool destructive = false}) {
    final isActive = _activeAction == action && _loading;
    return ListTile(
      onTap: _loading ? null : () => _showConfirmDialog(action, label, destructive),
      leading: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(color: color.withOpacity(0.15), borderRadius: BorderRadius.circular(10)),
        child: isActive
            ? const Center(child: SizedBox(width: 18, height: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)))
            : Icon(icon, color: color, size: 20),
      ),
      title: Text(label, style: TextStyle(color: destructive ? AppColors.error : Colors.white, fontFamily: 'Poppins', fontWeight: FontWeight.w500)),
    );
  }

  Future<void> _showConfirmDialog(String action, String label, bool destructive) async {
    // For mute, show duration input
    if (action == 'mute') {
      final dur = await _showMuteDurationDialog();
      if (dur == null || !mounted) return;
      await _perform(action, dur > 0 ? {'durationMinutes': dur} : {});
      return;
    }
    if (action == 'ban') {
      final reason = await _showReasonDialog('Bloklash sababi');
      if (reason == null || !mounted) return;
      await _perform(action, reason.isNotEmpty ? {'reason': reason} : {});
      return;
    }
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: AppColors.cardDark,
        title: Text(label, style: const TextStyle(color: Colors.white, fontFamily: 'Poppins')),
        content: Text('$label amalini tasdiqlaysizmi?', style: const TextStyle(color: AppColors.textSecondary, fontFamily: 'Poppins')),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Bekor', style: TextStyle(color: AppColors.textSecondary, fontFamily: 'Poppins'))),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(backgroundColor: destructive ? AppColors.error : AppColors.primary),
            child: const Text('Tasdiqlash', style: TextStyle(fontFamily: 'Poppins')),
          ),
        ],
      ),
    );
    if (confirmed == true && mounted) await _perform(action, null);
  }

  Future<int?> _showMuteDurationDialog() {
    int selected = 5;
    return showDialog<int>(
      context: context,
      builder: (_) => StatefulBuilder(
        builder: (ctx, setSt) => AlertDialog(
          backgroundColor: AppColors.cardDark,
          title: const Text('Ovoz O\'chirish Muddati', style: TextStyle(color: Colors.white, fontFamily: 'Poppins')),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [5, 10, 30, 60, 0].map((min) => RadioListTile<int>(
              value: min,
              groupValue: selected,
              onChanged: (v) => setSt(() => selected = v!),
              title: Text(min == 0 ? 'Muddatsiz' : '$min daqiqa', style: const TextStyle(color: Colors.white, fontFamily: 'Poppins')),
              activeColor: AppColors.primary,
            )).toList(),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Bekor', style: TextStyle(color: AppColors.textSecondary, fontFamily: 'Poppins'))),
            ElevatedButton(onPressed: () => Navigator.pop(ctx, selected), style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary), child: const Text('Tasdiqlash', style: TextStyle(fontFamily: 'Poppins'))),
          ],
        ),
      ),
    );
  }

  Future<String?> _showReasonDialog(String title) {
    final ctrl = TextEditingController();
    return showDialog<String>(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: AppColors.cardDark,
        title: Text(title, style: const TextStyle(color: Colors.white, fontFamily: 'Poppins')),
        content: TextField(
          controller: ctrl,
          style: const TextStyle(color: Colors.white, fontFamily: 'Poppins'),
          decoration: const InputDecoration(hintText: 'Sabab (ixtiyoriy)', hintStyle: TextStyle(color: AppColors.textSecondary), enabledBorder: UnderlineInputBorder(borderSide: BorderSide(color: AppColors.dividerDark)), focusedBorder: UnderlineInputBorder(borderSide: BorderSide(color: AppColors.primary))),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Bekor', style: TextStyle(color: AppColors.textSecondary, fontFamily: 'Poppins'))),
          ElevatedButton(onPressed: () => Navigator.pop(context, ctrl.text.trim()), style: ElevatedButton.styleFrom(backgroundColor: AppColors.error), child: const Text('Tasdiqlash', style: TextStyle(fontFamily: 'Poppins'))),
        ],
      ),
    );
  }
}
