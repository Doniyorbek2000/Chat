import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/network/api_client.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../home/presentation/screens/home_screen.dart';

class MessagesScreen extends ConsumerStatefulWidget {
  const MessagesScreen({super.key});

  @override
  ConsumerState<MessagesScreen> createState() => _MessagesScreenState();
}

class _MessagesScreenState extends ConsumerState<MessagesScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tab;
  List<Map<String, dynamic>> _notifications = [];
  List<Map<String, dynamic>> _conversations = [];
  bool _loadingNotifs = true;
  bool _loadingConvs = true;

  @override
  void initState() {
    super.initState();
    _tab = TabController(length: 2, vsync: this);
    _tab.addListener(() => setState(() {}));
    _loadNotifications();
    _loadConversations();
  }

  @override
  void dispose() {
    _tab.dispose();
    super.dispose();
  }

  Future<void> _loadNotifications() async {
    setState(() => _loadingNotifs = true);
    try {
      final api = ref.read(apiClientProvider);
      final res = await api.get('/notifications?limit=50');
      if (!mounted) return;
      final data = res.data['data'] ?? res.data;
      final items = (data is Map ? (data['items'] ?? data) : data) as List? ?? [];
      setState(() {
        _notifications = items.map((e) => Map<String, dynamic>.from(e as Map)).toList();
        _loadingNotifs = false;
      });
      // Update unread badge
      final unread = _notifications.where((n) => !(n['isRead'] as bool? ?? false)).length;
      ref.read(unreadCountProvider.notifier).state = unread;
    } catch (_) {
      if (mounted) setState(() => _loadingNotifs = false);
    }
  }

  Future<void> _loadConversations() async {
    setState(() => _loadingConvs = true);
    try {
      final api = ref.read(apiClientProvider);
      final res = await api.get('/chat/conversations');
      if (!mounted) return;
      final data = res.data['data'] ?? res.data['items'] ?? res.data;
      setState(() {
        _conversations = (data is List ? data : [])
            .map((e) => Map<String, dynamic>.from(e as Map))
            .toList();
        _loadingConvs = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loadingConvs = false);
    }
  }

  Future<void> _markAllRead() async {
    try {
      final api = ref.read(apiClientProvider);
      await api.post('/notifications/read-all');
      if (!mounted) return;
      setState(() {
        _notifications = _notifications.map((n) => {...n, 'isRead': true}).toList();
      });
      ref.read(unreadCountProvider.notifier).state = 0;
    } catch (_) {}
  }

  Future<void> _markRead(String notifId, int index) async {
    if (_notifications[index]['isRead'] as bool? ?? false) return;
    try {
      final api = ref.read(apiClientProvider);
      await api.post('/notifications/$notifId/read');
      if (!mounted) return;
      setState(() => _notifications[index] = {..._notifications[index], 'isRead': true});
      final unread = _notifications.where((n) => !(n['isRead'] as bool? ?? false)).length;
      ref.read(unreadCountProvider.notifier).state = unread;
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundDark,
      appBar: AppBar(
        backgroundColor: AppColors.backgroundDark,
        elevation: 0,
        title: const Text('Xabar', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18)),
        actions: [
          if (_tab.index == 0 && _notifications.isNotEmpty)
            TextButton(
              onPressed: _markAllRead,
              child: const Text('Barchasini o\'qish', style: TextStyle(color: AppColors.primary, fontSize: 12)),
            ),
        ],
        bottom: TabBar(
          controller: _tab,
          indicatorColor: AppColors.primary,
          indicatorWeight: 2,
          labelColor: AppColors.primary,
          unselectedLabelColor: Colors.white38,
          labelStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
          tabs: const [Tab(text: 'Xabar'), Tab(text: 'Do\'st')],
        ),
      ),
      body: TabBarView(
        controller: _tab,
        children: [
          _buildNotifTab(),
          _buildConvTab(),
        ],
      ),
    );
  }

  Widget _buildNotifTab() {
    if (_loadingNotifs) return const Center(child: CircularProgressIndicator(color: AppColors.primary, strokeWidth: 2));
    return Column(children: [
      _buildCategoryShortcuts(),
      Expanded(
        child: _notifications.isEmpty
            ? _buildEmpty("Hali yangilik yo'q", Icons.notifications_none)
            : RefreshIndicator(
                color: AppColors.primary,
                onRefresh: _loadNotifications,
                child: ListView.separated(
                  itemCount: _notifications.length,
                  separatorBuilder: (_, __) => const Divider(color: Colors.white10, height: 1),
                  itemBuilder: (ctx, i) {
                    final n = _notifications[i];
                    final isRead = n['isRead'] as bool? ?? false;
                    return ListTile(
                      tileColor: isRead ? Colors.transparent : AppColors.primary.withOpacity(0.04),
                      leading: _notifIcon(n['type'] as String? ?? ''),
                      title: Text(n['title'] as String? ?? '',
                          style: TextStyle(color: Colors.white, fontWeight: isRead ? FontWeight.normal : FontWeight.w600, fontSize: 14)),
                      subtitle: Text(n['body'] as String? ?? '',
                          style: const TextStyle(color: Colors.white54, fontSize: 12), maxLines: 2, overflow: TextOverflow.ellipsis),
                      trailing: isRead ? null : Container(width: 8, height: 8, decoration: const BoxDecoration(color: AppColors.primary, shape: BoxShape.circle)),
                      onTap: () => _markRead(n['id'] as String, i),
                    ).animate(delay: Duration(milliseconds: i * 25)).fadeIn(duration: 250.ms);
                  },
                ),
              ),
      ),
    ]);
  }

  Widget _buildCategoryShortcuts() {
    const cats = [
      {'label': "Do'stlik taklifi", 'icon': '👥'},
      {'label': 'Sovg\'a', 'icon': '🎁'},
      {'label': 'VOXO Mukofoti', 'icon': '🏆'},
      {'label': 'System', 'icon': '⚙️'},
      {'label': 'Oila', 'icon': '👨‍👩‍👧'},
    ];
    return SizedBox(
      height: 72,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        itemCount: cats.length,
        separatorBuilder: (_, __) => const SizedBox(width: 10),
        itemBuilder: (ctx, i) => Column(mainAxisAlignment: MainAxisAlignment.center, children: [
          Container(
            width: 40, height: 40,
            decoration: BoxDecoration(color: Colors.white.withOpacity(0.06), borderRadius: BorderRadius.circular(12)),
            child: Center(child: Text(cats[i]['icon']!, style: const TextStyle(fontSize: 18))),
          ),
          const SizedBox(height: 2),
          Text(cats[i]['label']!, style: const TextStyle(color: Colors.white38, fontSize: 9)),
        ]),
      ),
    );
  }

  Widget _buildConvTab() {
    if (_loadingConvs) return const Center(child: CircularProgressIndicator(color: AppColors.primary, strokeWidth: 2));
    if (_conversations.isEmpty) return _buildEmpty("Hali xabar yo'q", Icons.chat_bubble_outline);
    return RefreshIndicator(
      color: AppColors.primary,
      onRefresh: _loadConversations,
      child: ListView.separated(
        itemCount: _conversations.length,
        separatorBuilder: (_, __) => const Divider(color: Colors.white10, indent: 72, height: 1),
        itemBuilder: (ctx, i) {
          final conv = _conversations[i];
          final other = conv['other'] as Map<String, dynamic>? ?? conv['participant'] as Map<String, dynamic>? ?? {};
          final lastMsg = conv['lastMessage'] as Map<String, dynamic>? ?? {};
          return ListTile(
            leading: CircleAvatar(
              radius: 24,
              backgroundColor: AppColors.primary.withOpacity(0.3),
              backgroundImage: other['avatar'] != null ? CachedNetworkImageProvider(other['avatar'] as String) : null,
              child: other['avatar'] == null ? const Icon(Icons.person, color: Colors.white60) : null,
            ),
            title: Text(other['displayName'] as String? ?? 'User',
                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 14)),
            subtitle: Text(lastMsg['content'] as String? ?? '',
                style: const TextStyle(color: Colors.white54, fontSize: 12), maxLines: 1, overflow: TextOverflow.ellipsis),
            onTap: () => context.push('/messages/${other['id']}',
                extra: {'username': other['displayName'], 'avatar': other['avatar']}),
          );
        },
      ),
    );
  }

  Widget _notifIcon(String type) {
    final t = type.toLowerCase();
    String emoji;
    Color color;
    if (t.contains('friend') || t.contains('follow')) { emoji = '👥'; color = Colors.blue; }
    else if (t.contains('gift')) { emoji = '🎁'; color = Colors.orange; }
    else if (t.contains('reward') || t.contains('bonus')) { emoji = '🏆'; color = Colors.amber; }
    else if (t.contains('family')) { emoji = '👨‍👩‍👧'; color = Colors.green; }
    else { emoji = '🔔'; color = Colors.blueGrey; }
    return Container(
      width: 40, height: 40,
      decoration: BoxDecoration(color: color.withOpacity(0.15), borderRadius: BorderRadius.circular(12)),
      child: Center(child: Text(emoji, style: const TextStyle(fontSize: 18))),
    );
  }

  Widget _buildEmpty(String msg, IconData icon) {
    return Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
      Icon(icon, color: Colors.white24, size: 60),
      const SizedBox(height: 12),
      Text(msg, style: const TextStyle(color: Colors.white38, fontSize: 16)),
    ]));
  }
}
