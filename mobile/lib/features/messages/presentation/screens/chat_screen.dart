import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/network/socket_client.dart';

class ChatScreen extends ConsumerStatefulWidget {
  final String userId;
  final String username;
  final String? avatar;

  const ChatScreen({
    super.key,
    required this.userId,
    required this.username,
    this.avatar,
  });

  @override
  ConsumerState<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends ConsumerState<ChatScreen> {
  final _controller = TextEditingController();
  final _scrollCtrl = ScrollController();
  final List<Map<String, dynamic>> _messages = [];
  bool _loading = true;
  bool _sending = false;
  StreamSubscription<Map<String, dynamic>>? _msgSub;

  @override
  void initState() {
    super.initState();
    _loadMessages();
    _listenSocket();
  }

  @override
  void dispose() {
    _msgSub?.cancel();
    _controller.dispose();
    _scrollCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadMessages() async {
    try {
      final api = ref.read(apiClientProvider);
      final response = await api.get('/chat/messages/${widget.userId}');
      if (response.statusCode == 200 && mounted) {
        final data = response.data['data'] ?? response.data['items'] ?? [];
        setState(() {
          _messages.addAll((data as List).map((e) => Map<String, dynamic>.from(e as Map)));
          _loading = false;
        });
        _scrollToBottom();
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _listenSocket() {
    _msgSub = SocketClient.instance.onPrivateMessage.listen((msg) {
      if (!mounted) return;
      if (msg['senderId'] == widget.userId || msg['receiverId'] == widget.userId) {
        setState(() => _messages.add(msg));
        _scrollToBottom();
      }
    });
    SocketClient.instance.subscribeToUser(widget.userId);
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollCtrl.hasClients) {
        _scrollCtrl.animateTo(
          _scrollCtrl.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _sendMessage() async {
    final text = _controller.text.trim();
    if (text.isEmpty || _sending) return;
    setState(() => _sending = true);
    _controller.clear();
    try {
      SocketClient.instance.sendPrivateMessage(
        toUserId: widget.userId,
        content: text,
      );
      setState(() {
        _messages.add({
          'content': text,
          'type': 'TEXT',
          'isMine': true,
          'createdAt': DateTime.now().toIso8601String(),
        });
      });
      _scrollToBottom();
    } catch (_) {} finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, color: Colors.white),
          onPressed: () => context.pop(),
        ),
        title: GestureDetector(
          onTap: () => context.push('/profile/${widget.userId}'),
          child: Row(
            children: [
              CircleAvatar(
                radius: 18,
                backgroundImage: widget.avatar != null ? NetworkImage(widget.avatar!) : null,
                backgroundColor: AppColors.surface,
                child: widget.avatar == null ? Text(
                  widget.username.isNotEmpty ? widget.username[0].toUpperCase() : 'U',
                  style: const TextStyle(color: Colors.white),
                ) : null,
              ),
              const SizedBox(width: 10),
              Text(widget.username, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
            ],
          ),
        ),
        actions: [
          PopupMenuButton<String>(
            icon: const Icon(Icons.more_vert, color: Colors.white70),
            color: AppColors.cardDark,
            onSelected: (val) {
              if (val == 'profile') {
                context.push('/profile/${widget.userId}');
              }
            },
            itemBuilder: (_) => [
              const PopupMenuItem(value: 'profile', child: Text('View Profile', style: TextStyle(color: Colors.white))),
            ],
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
                : _messages.isEmpty
                    ? const Center(child: Text('No messages yet', style: TextStyle(color: Colors.white38)))
                    : ListView.builder(
                        controller: _scrollCtrl,
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        itemCount: _messages.length,
                        itemBuilder: (_, i) => _buildBubble(_messages[i]),
                      ),
          ),
          _buildInput(),
        ],
      ),
    );
  }

  Widget _buildBubble(Map<String, dynamic> msg) {
    final isMine = msg['isMine'] as bool? ?? false;
    final content = msg['content'] as String? ?? '';
    final time = _formatTime(msg['createdAt'] as String? ?? '');

    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        mainAxisAlignment: isMine ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          if (!isMine) ...[
            CircleAvatar(
              radius: 14,
              backgroundImage: widget.avatar != null ? NetworkImage(widget.avatar!) : null,
              backgroundColor: AppColors.surface,
              child: widget.avatar == null ? Text(widget.username.isNotEmpty ? widget.username[0].toUpperCase() : 'U', style: const TextStyle(color: Colors.white, fontSize: 10)) : null,
            ),
            const SizedBox(width: 6),
          ],
          Column(
            crossAxisAlignment: isMine ? CrossAxisAlignment.end : CrossAxisAlignment.start,
            children: [
              Container(
                constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.65),
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                decoration: BoxDecoration(
                  color: isMine ? AppColors.primary : AppColors.card,
                  borderRadius: BorderRadius.only(
                    topLeft: const Radius.circular(16),
                    topRight: const Radius.circular(16),
                    bottomLeft: Radius.circular(isMine ? 16 : 4),
                    bottomRight: Radius.circular(isMine ? 4 : 16),
                  ),
                ),
                child: Text(content, style: TextStyle(color: isMine ? Colors.white : Colors.white70, fontSize: 14)),
              ),
              const SizedBox(height: 2),
              Text(time, style: const TextStyle(color: Colors.white38, fontSize: 10)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildInput() {
    return Container(
      padding: EdgeInsets.only(
        left: 12, right: 12, top: 8,
        bottom: MediaQuery.of(context).viewInsets.bottom + 8 + MediaQuery.of(context).padding.bottom,
      ),
      decoration: const BoxDecoration(
        color: AppColors.surface,
        border: Border(top: BorderSide(color: Colors.white10)),
      ),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: _controller,
              style: const TextStyle(color: Colors.white),
              maxLines: null,
              textInputAction: TextInputAction.send,
              onSubmitted: (_) => _sendMessage(),
              decoration: InputDecoration(
                hintText: 'Message...',
                hintStyle: const TextStyle(color: Colors.white38),
                filled: true,
                fillColor: Colors.white10,
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(22),
                  borderSide: BorderSide.none,
                ),
              ),
            ),
          ),
          const SizedBox(width: 8),
          GestureDetector(
            onTap: _sendMessage,
            child: Container(
              width: 42, height: 42,
              decoration: const BoxDecoration(
                gradient: AppColors.primaryGradient,
                shape: BoxShape.circle,
              ),
              child: _sending
                  ? const Padding(
                      padding: EdgeInsets.all(10),
                      child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                    )
                  : const Icon(Icons.send, color: Colors.white, size: 18),
            ),
          ),
        ],
      ),
    );
  }

  String _formatTime(String iso) {
    if (iso.isEmpty) return '';
    try {
      final dt = DateTime.parse(iso).toLocal();
      final now = DateTime.now();
      final diff = now.difference(dt);
      if (diff.inMinutes < 1) return 'now';
      if (diff.inHours < 1) return '${diff.inMinutes}m';
      if (diff.inDays < 1) return '${dt.hour}:${dt.minute.toString().padLeft(2, '0')}';
      return '${dt.day}/${dt.month}';
    } catch (_) {
      return '';
    }
  }
}
