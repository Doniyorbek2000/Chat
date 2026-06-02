import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/network/api_client.dart';

class NotificationsScreen extends ConsumerStatefulWidget {
  const NotificationsScreen({super.key});

  @override
  ConsumerState<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends ConsumerState<NotificationsScreen> {
  List<Map<String, dynamic>> _notifications = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final api = ref.read(apiClientProvider);
      final response = await api.get('/notifications', queryParameters: {'limit': 50});
      if (response.statusCode == 200 && mounted) {
        final data = response.data['data'] ?? response.data['items'] ?? [];
        setState(() {
          _notifications = (data as List).map((e) => Map<String, dynamic>.from(e as Map)).toList();
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _markAllRead() async {
    try {
      final api = ref.read(apiClientProvider);
      await api.patch('/notifications/read-all');
      setState(() {
        for (final n in _notifications) n['isRead'] = true;
      });
    } catch (_) {}
  }

  Future<void> _markRead(String id) async {
    try {
      final api = ref.read(apiClientProvider);
      await api.patch('/notifications/$id/read');
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final unreadCount = _notifications.where((n) => n['isRead'] != true).length;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        title: Row(
          children: [
            const Text('Notifications', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            if (unreadCount > 0) ...[
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                decoration: BoxDecoration(color: AppColors.primary, borderRadius: BorderRadius.circular(10)),
                child: Text('$unreadCount', style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
              ),
            ],
          ],
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, color: Colors.white),
          onPressed: () => context.pop(),
        ),
        actions: [
          if (unreadCount > 0)
            TextButton(
              onPressed: _markAllRead,
              child: const Text('Read All', style: TextStyle(color: AppColors.primary, fontSize: 12)),
            ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : _notifications.isEmpty
              ? _buildEmpty()
              : RefreshIndicator(
                  color: AppColors.primary,
                  onRefresh: _load,
                  child: ListView.separated(
                    itemCount: _notifications.length,
                    separatorBuilder: (_, __) => const Divider(color: Colors.white10, height: 1),
                    itemBuilder: (_, i) => _buildNotifTile(_notifications[i], i),
                  ),
                ),
    );
  }

  Widget _buildEmpty() {
    return const Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text('🔔', style: TextStyle(fontSize: 56)),
          SizedBox(height: 12),
          Text('No notifications', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
          SizedBox(height: 8),
          Text("You're all caught up!", style: TextStyle(color: Colors.white54)),
        ],
      ),
    );
  }

  Widget _buildNotifTile(Map<String, dynamic> notif, int index) {
    final isRead = notif['isRead'] as bool? ?? false;
    final type = notif['type'] as String? ?? 'INFO';
    final title = notif['title'] as String? ?? '';
    final body = notif['body'] as String? ?? '';
    final createdAt = notif['createdAt'] as String? ?? '';

    return InkWell(
      onTap: () {
        if (!isRead) {
          _markRead(notif['id'] as String? ?? '');
          setState(() => notif['isRead'] = true);
        }
        // Navigate based on type
        final data = notif['data'] as Map<String, dynamic>?;
        if (data != null) {
          final roomId = data['roomId'] as String?;
          final userId = data['userId'] as String?;
          if (roomId != null) context.push('/rooms/$roomId');
          else if (userId != null) context.push('/profile/$userId');
        }
      },
      child: Container(
        color: isRead ? Colors.transparent : AppColors.primary.withOpacity(0.05),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 42, height: 42,
              decoration: BoxDecoration(
                color: _typeColor(type).withOpacity(0.15),
                shape: BoxShape.circle,
              ),
              child: Center(child: Text(_typeIcon(type), style: const TextStyle(fontSize: 20))),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(title, style: TextStyle(
                          color: Colors.white,
                          fontWeight: isRead ? FontWeight.normal : FontWeight.w600,
                          fontSize: 14,
                        )),
                      ),
                      if (!isRead)
                        Container(
                          width: 8, height: 8,
                          decoration: const BoxDecoration(color: AppColors.primary, shape: BoxShape.circle),
                        ),
                    ],
                  ),
                  if (body.isNotEmpty) ...[
                    const SizedBox(height: 3),
                    Text(body, style: const TextStyle(color: Colors.white54, fontSize: 12), maxLines: 2, overflow: TextOverflow.ellipsis),
                  ],
                  const SizedBox(height: 4),
                  Text(_formatTime(createdAt), style: const TextStyle(color: Colors.white38, fontSize: 11)),
                ],
              ),
            ),
          ],
        ),
      ),
    ).animate(delay: Duration(milliseconds: index * 20)).fadeIn(duration: 200.ms);
  }

  Color _typeColor(String type) {
    switch (type) {
      case 'GIFT': return AppColors.coin;
      case 'FOLLOW': return AppColors.primary;
      case 'MESSAGE': return AppColors.accent;
      case 'VIP': return Colors.amber;
      case 'SYSTEM': return AppColors.info;
      default: return AppColors.primary;
    }
  }

  String _typeIcon(String type) {
    switch (type) {
      case 'GIFT': return '🎁';
      case 'FOLLOW': return '👤';
      case 'MESSAGE': return '💬';
      case 'VIP': return '👑';
      case 'ROOM_INVITE': return '🎙️';
      case 'SYSTEM': return '🔔';
      default: return '📢';
    }
  }

  String _formatTime(String iso) {
    if (iso.isEmpty) return '';
    try {
      final dt = DateTime.parse(iso).toLocal();
      final diff = DateTime.now().difference(dt);
      if (diff.inMinutes < 1) return 'just now';
      if (diff.inHours < 1) return '${diff.inMinutes} min ago';
      if (diff.inDays < 1) return '${diff.inHours}h ago';
      if (diff.inDays < 7) return '${diff.inDays}d ago';
      return '${dt.day}/${dt.month}/${dt.year}';
    } catch (_) {
      return '';
    }
  }
}
