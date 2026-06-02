import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/network/api_client.dart';

class MessagesScreen extends ConsumerStatefulWidget {
  const MessagesScreen({super.key});

  @override
  ConsumerState<MessagesScreen> createState() => _MessagesScreenState();
}

class _MessagesScreenState extends ConsumerState<MessagesScreen> {
  List<Map<String, dynamic>> _conversations = [];
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
      final response = await api.get('/chat/conversations');
      if (response.statusCode == 200 && mounted) {
        final data = response.data['data'] ?? response.data['items'] ?? response.data;
        setState(() {
          _conversations = (data as List? ?? [])
              .map((e) => Map<String, dynamic>.from(e as Map)).toList();
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        title: const Text('Messages', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, color: Colors.white),
          onPressed: () => context.pop(),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.search, color: Colors.white70),
            onPressed: () {},
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : _conversations.isEmpty
              ? _buildEmpty()
              : RefreshIndicator(
                  color: AppColors.primary,
                  onRefresh: _load,
                  child: ListView.separated(
                    itemCount: _conversations.length,
                    separatorBuilder: (_, __) => const Divider(color: Colors.white10, indent: 72, height: 1),
                    itemBuilder: (_, i) => _buildConversationTile(_conversations[i], i),
                  ),
                ),
    );
  }

  Widget _buildEmpty() {
    return const Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text('💬', style: TextStyle(fontSize: 56)),
          SizedBox(height: 12),
          Text('No conversations yet', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
          SizedBox(height: 8),
          Text('Start chatting with other users', style: TextStyle(color: Colors.white54)),
        ],
      ),
    );
  }

  Widget _buildConversationTile(Map<String, dynamic> conv, int index) {
    final otherUser = conv['otherUser'] as Map<String, dynamic>? ?? {};
    final lastMsg = conv['lastMessage'] as Map<String, dynamic>?;
    final unread = conv['unreadCount'] as int? ?? 0;
    final displayName = otherUser['displayName'] as String? ?? 'User';
    final avatar = otherUser['avatar'] as String?;
    final userId = otherUser['id'] as String? ?? '';

    return InkWell(
      onTap: () => context.push('/messages/$userId', extra: {
        'username': displayName,
        'avatar': avatar,
      }),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Row(
          children: [
            Stack(
              children: [
                CircleAvatar(
                  radius: 26,
                  backgroundImage: avatar != null ? NetworkImage(avatar) : null,
                  backgroundColor: AppColors.surface,
                  child: avatar == null ? Text(
                    displayName.isNotEmpty ? displayName[0].toUpperCase() : 'U',
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18),
                  ) : null,
                ),
                if (otherUser['isOnline'] == true)
                  Positioned(
                    bottom: 0, right: 0,
                    child: Container(
                      width: 12, height: 12,
                      decoration: BoxDecoration(
                        color: AppColors.online,
                        shape: BoxShape.circle,
                        border: Border.all(color: AppColors.background, width: 2),
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(displayName, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
                      ),
                      if (lastMsg != null)
                        Text(
                          _formatTime(lastMsg['createdAt'] as String? ?? ''),
                          style: const TextStyle(color: Colors.white38, fontSize: 11),
                        ),
                    ],
                  ),
                  const SizedBox(height: 3),
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          lastMsg?['content'] as String? ?? 'No messages yet',
                          style: TextStyle(
                            color: unread > 0 ? Colors.white70 : Colors.white38,
                            fontSize: 13,
                            fontWeight: unread > 0 ? FontWeight.w500 : FontWeight.normal,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      if (unread > 0)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                          decoration: BoxDecoration(
                            color: AppColors.primary,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Text('$unread', style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
                        ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    ).animate(delay: Duration(milliseconds: index * 30)).fadeIn(duration: 300.ms);
  }

  String _formatTime(String iso) {
    if (iso.isEmpty) return '';
    try {
      final dt = DateTime.parse(iso).toLocal();
      final now = DateTime.now();
      final diff = now.difference(dt);
      if (diff.inMinutes < 1) return 'now';
      if (diff.inHours < 1) return '${diff.inMinutes}m';
      if (diff.inDays < 1) return '${diff.inHours}h';
      if (diff.inDays < 7) return '${diff.inDays}d';
      return '${dt.day}/${dt.month}';
    } catch (_) {
      return '';
    }
  }
}
