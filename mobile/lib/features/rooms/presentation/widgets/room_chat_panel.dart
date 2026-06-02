import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/models/room_model.dart';
import '../../../../core/network/socket_client.dart';
import '../../../../core/theme/app_colors.dart';

class RoomChatPanel extends ConsumerStatefulWidget {
  final String roomId;
  final List<RoomMessageModel> messages;
  final bool isExpanded;
  final VoidCallback onToggle;

  const RoomChatPanel({
    super.key,
    required this.roomId,
    required this.messages,
    required this.isExpanded,
    required this.onToggle,
  });

  @override
  ConsumerState<RoomChatPanel> createState() => _RoomChatPanelState();
}

class _RoomChatPanelState extends ConsumerState<RoomChatPanel> {
  final _controller = TextEditingController();
  final _scrollController = ScrollController();

  @override
  void didUpdateWidget(RoomChatPanel old) {
    super.didUpdateWidget(old);
    if (widget.messages.length != old.messages.length && widget.isExpanded) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (_scrollController.hasClients) {
          _scrollController.animateTo(
            _scrollController.position.maxScrollExtent,
            duration: const Duration(milliseconds: 200),
            curve: Curves.easeOut,
          );
        }
      });
    }
  }

  void _sendMessage() {
    final text = _controller.text.trim();
    if (text.isEmpty) return;
    SocketClient.instance.sendChatMessage(widget.roomId, text);
    _controller.clear();
  }

  @override
  void dispose() {
    _controller.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.isExpanded) return _buildMiniChat();
    return _buildFullChat();
  }

  Widget _buildMiniChat() {
    final recent = widget.messages.length > 3
        ? widget.messages.sublist(widget.messages.length - 3)
        : widget.messages;

    return GestureDetector(
      onTap: widget.onToggle,
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: recent
              .map((msg) => _buildMiniMessage(msg))
              .toList(),
        ),
      ),
    );
  }

  Widget _buildMiniMessage(RoomMessageModel msg) {
    if (msg.isSystem || msg.isJoin) {
      return Padding(
        padding: const EdgeInsets.only(bottom: 3),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
          decoration: BoxDecoration(
            color: Colors.black38,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Text(
            msg.content,
            style: TextStyle(
              color: AppColors.vip3,
              fontSize: 11,
              fontFamily: 'Poppins',
            ),
          ),
        ),
      );
    }

    final Color nameColor =
        msg.userVipLevel > 0 ? AppColors.vip3 : AppColors.primaryLight;

    return Padding(
      padding: const EdgeInsets.only(bottom: 3),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          color: Colors.black.withOpacity(0.5),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (msg.userAvatar != null)
              ClipOval(
                child: CachedNetworkImage(
                  imageUrl: msg.userAvatar!,
                  width: 16,
                  height: 16,
                  fit: BoxFit.cover,
                  errorWidget: (_, __, ___) => const Icon(Icons.person,
                      size: 14, color: Colors.white54),
                ),
              ),
            const SizedBox(width: 4),
            RichText(
              text: TextSpan(
                children: [
                  TextSpan(
                    text: '${msg.username} ',
                    style: TextStyle(
                      color: nameColor,
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      fontFamily: 'Poppins',
                    ),
                  ),
                  TextSpan(
                    text: msg.content,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 11,
                      fontFamily: 'Poppins',
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFullChat() {
    return Container(
      height: MediaQuery.of(context).size.height * 0.6,
      decoration: const BoxDecoration(
        color: Color(0xEE0A0A1A),
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        children: [
          _buildChatHeader(),
          const Divider(color: AppColors.dividerDark, height: 1),
          Expanded(child: _buildMessageList()),
          _buildInputBar(),
        ],
      ),
    );
  }

  Widget _buildChatHeader() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        children: [
          const Text(
            'Room Chat',
            style: TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.bold,
              fontSize: 16,
              fontFamily: 'Poppins',
            ),
          ),
          const Spacer(),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
            decoration: BoxDecoration(
              color: AppColors.cardDark,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Text(
              '${widget.messages.length}',
              style: TextStyle(
                color: AppColors.textSecondary,
                fontSize: 12,
                fontFamily: 'Poppins',
              ),
            ),
          ),
          const SizedBox(width: 8),
          GestureDetector(
            onTap: widget.onToggle,
            child: Icon(Icons.keyboard_arrow_down,
                color: AppColors.textSecondary),
          ),
        ],
      ),
    );
  }

  Widget _buildMessageList() {
    if (widget.messages.isEmpty) {
      return Center(
        child: Text(
          'No messages yet.\nSay something!',
          textAlign: TextAlign.center,
          style: TextStyle(
            color: AppColors.textTertiary,
            fontFamily: 'Poppins',
          ),
        ),
      );
    }

    return ListView.builder(
      controller: _scrollController,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      itemCount: widget.messages.length,
      itemBuilder: (ctx, i) =>
          _buildFullMessage(widget.messages[i]),
    );
  }

  Widget _buildFullMessage(RoomMessageModel msg) {
    if (msg.isSystem || msg.isJoin || msg.isLeave) {
      return Padding(
        padding: const EdgeInsets.only(bottom: 6),
        child: Center(
          child: Container(
            padding:
                const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
            decoration: BoxDecoration(
              color: AppColors.vip3.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
              border:
                  Border.all(color: AppColors.vip3.withOpacity(0.3)),
            ),
            child: Text(
              msg.content,
              style: TextStyle(
                color: AppColors.vip3,
                fontSize: 12,
                fontFamily: 'Poppins',
              ),
            ),
          ),
        ),
      );
    }

    if (msg.isGift) {
      return Padding(
        padding: const EdgeInsets.only(bottom: 6),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [
                AppColors.primary.withOpacity(0.1),
                AppColors.secondary.withOpacity(0.1),
              ],
            ),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.primary.withOpacity(0.3)),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('🎁', style: TextStyle(fontSize: 16)),
              const SizedBox(width: 6),
              Text(
                msg.content,
                style: TextStyle(
                  color: AppColors.primary,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  fontFamily: 'Poppins',
                ),
              ),
            ],
          ),
        ),
      );
    }

    final Color nameColor =
        msg.userVipLevel > 0 ? AppColors.vip3 : AppColors.primaryLight;

    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (msg.userAvatar != null)
            ClipOval(
              child: CachedNetworkImage(
                imageUrl: msg.userAvatar!,
                width: 28,
                height: 28,
                fit: BoxFit.cover,
                errorWidget: (_, __, ___) => Container(
                  width: 28,
                  height: 28,
                  color: AppColors.elevatedDark,
                  child: const Icon(Icons.person,
                      size: 16, color: Colors.white60),
                ),
              ),
            )
          else
            Container(
              width: 28,
              height: 28,
              decoration: const BoxDecoration(
                color: AppColors.elevatedDark,
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.person,
                  size: 16, color: Colors.white60),
            ),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  msg.username,
                  style: TextStyle(
                    color: nameColor,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    fontFamily: 'Poppins',
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  msg.content,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 13,
                    fontFamily: 'Poppins',
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInputBar() {
    return Container(
      padding: EdgeInsets.fromLTRB(
          12, 8, 12, MediaQuery.of(context).viewInsets.bottom + 12),
      decoration: const BoxDecoration(
        color: AppColors.cardDark,
        border: Border(top: BorderSide(color: AppColors.dividerDark)),
      ),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: _controller,
              style: const TextStyle(
                  color: Colors.white, fontFamily: 'Poppins'),
              onSubmitted: (_) => _sendMessage(),
              decoration: InputDecoration(
                hintText: 'Say something...',
                hintStyle: TextStyle(
                    color: AppColors.textTertiary, fontSize: 14),
                filled: true,
                fillColor: AppColors.elevatedDark,
                contentPadding: const EdgeInsets.symmetric(
                    horizontal: 16, vertical: 10),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(20),
                  borderSide: BorderSide.none,
                ),
              ),
            ),
          ),
          const SizedBox(width: 8),
          GestureDetector(
            onTap: _sendMessage,
            child: Container(
              width: 42,
              height: 42,
              decoration: const BoxDecoration(
                gradient: AppColors.primaryGradient,
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.send,
                  color: Colors.white, size: 18),
            ),
          ),
        ],
      ),
    );
  }
}
