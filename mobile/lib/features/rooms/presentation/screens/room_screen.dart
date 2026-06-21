import 'dart:async';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/models/room_model.dart';
import '../../../../core/network/socket_client.dart';
import '../../../../core/providers/room_provider.dart';
import '../../../../core/theme/app_colors.dart';
import '../widgets/gift_panel.dart';
import '../widgets/pk_battle_widget.dart';
import '../widgets/room_chat_panel.dart';
import '../widgets/seat_widget.dart';

class RoomScreen extends ConsumerStatefulWidget {
  final String roomId;

  const RoomScreen({super.key, required this.roomId});

  @override
  ConsumerState<RoomScreen> createState() => _RoomScreenState();
}

class _RoomScreenState extends ConsumerState<RoomScreen>
    with WidgetsBindingObserver {
  bool _isChatExpanded = false;
  final List<Map<String, dynamic>> _activeGiftStream = [];
  Timer? _giftStreamTimer;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    SystemChrome.setSystemUIOverlayStyle(
      const SystemUiOverlayStyle(
        statusBarColor: Colors.transparent,
        statusBarIconBrightness: Brightness.light,
      ),
    );
    // Join room
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(roomProvider.notifier).joinRoom(widget.roomId);
    });
    _setupGiftStreamListener();
  }

  void _setupGiftStreamListener() {
    SocketClient.instance.on('room:kicked', (data) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('You were removed from this room'),
          backgroundColor: AppColors.error,
        ),
      );
      context.pop();
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    SystemChrome.setEnabledSystemUIMode(
      SystemUiMode.manual,
      overlays: SystemUiOverlay.values,
    );
    _giftStreamTimer?.cancel();
    ref.read(roomProvider.notifier).leaveRoom();
    SocketClient.instance.off('room:kicked');
    super.dispose();
  }

  void _toggleMic() {
    ref.read(roomProvider.notifier).toggleMic();
  }

  void _openGiftPanel() {
    final room = ref.read(roomProvider).room;
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => GiftPanel(
        roomId: widget.roomId,
        receiverId: room?.host.id ?? '',
        onClose: () => Navigator.of(context).pop(),
      ),
    );
  }

  void _toggleChat() {
    if (_isChatExpanded) {
      setState(() => _isChatExpanded = false);
    } else {
      setState(() => _isChatExpanded = true);
      showModalBottomSheet(
        context: context,
        isScrollControlled: true,
        backgroundColor: Colors.transparent,
        builder: (ctx) {
          final messages = ref.watch(roomMessagesProvider);
          return RoomChatPanel(
            roomId: widget.roomId,
            messages: messages,
            isExpanded: true,
            onToggle: () {
              Navigator.of(ctx).pop();
              setState(() => _isChatExpanded = false);
            },
          );
        },
      ).whenComplete(() {
        if (mounted) setState(() => _isChatExpanded = false);
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final roomState = ref.watch(roomProvider);
    final messages = ref.watch(roomMessagesProvider);
    final activeGifts = ref.watch(activeGiftsProvider);

    return Scaffold(
      backgroundColor: AppColors.backgroundDark,
      body: roomState.isLoading && roomState.room == null
          ? _buildLoading()
          : roomState.room == null
              ? _buildError(roomState.error)
              : _buildRoomContent(
                  roomState,
                  messages,
                  activeGifts,
                ),
    );
  }

  Widget _buildLoading() {
    return Container(
      decoration: const BoxDecoration(gradient: AppColors.backgroundGradient),
      child: const Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            CircularProgressIndicator(color: AppColors.primary),
            SizedBox(height: 16),
            Text(
              'Joining room...',
              style: TextStyle(
                color: Colors.white70,
                fontFamily: 'Poppins',
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildError(String? error) {
    return Container(
      decoration: const BoxDecoration(gradient: AppColors.backgroundGradient),
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline,
                color: AppColors.error, size: 64),
            const SizedBox(height: 16),
            Text(
              error ?? 'Failed to join room',
              style: const TextStyle(
                  color: Colors.white70, fontFamily: 'Poppins'),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: () => context.pop(),
              style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary),
              child: const Text('Go Back'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRoomContent(
    RoomState roomState,
    List<RoomMessageModel> messages,
    List<GiftEventModel> activeGifts,
  ) {
    final room = roomState.room!;
    final isMicOn = roomState.isMicOn;

    return Stack(
      children: [
        // Background
        _buildBackground(room.cover),

        // Main safe area content
        SafeArea(
          child: Column(
            children: [
              // Top bar
              _buildTopBar(room),

              // Announcement
              if (room.announcement != null &&
                  room.announcement!.isNotEmpty)
                _buildAnnouncementBanner(room.announcement!),

              // PK Battle
              if (room.hasPkBattle)
                PkBattleWidget(
                  pkBattle: room.pkBattle!.toJson(),
                ),

              // Seats
              Expanded(
                child: _buildSeatsArea(room),
              ),

              // Chat preview (mini mode)
              if (!_isChatExpanded && messages.isNotEmpty)
                RoomChatPanel(
                  roomId: widget.roomId,
                  messages: messages,
                  isExpanded: false,
                  onToggle: _toggleChat,
                ),

              // Bottom toolbar
              _buildBottomToolbar(isMicOn),
              SizedBox(
                  height: MediaQuery.of(context).padding.bottom + 8),
            ],
          ),
        ),

        // Gift stream overlay
        if (activeGifts.isNotEmpty)
          Positioned(
            right: 16,
            bottom: 180,
            child: _buildGiftStreamOverlay(activeGifts),
          ),
      ],
    );
  }

  Widget _buildBackground(String? cover) {
    return Positioned.fill(
      child: Stack(
        fit: StackFit.expand,
        children: [
          if (cover != null)
            CachedNetworkImage(
              imageUrl: cover,
              fit: BoxFit.cover,
              errorWidget: (_, __, ___) => _buildDefaultBackground(),
            )
          else
            _buildDefaultBackground(),
          // Overlay
          Container(
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  Color(0xCC000000),
                  Color(0x80000000),
                  Color(0xDD000000),
                ],
                stops: [0.0, 0.5, 1.0],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDefaultBackground() {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [
            Color(0xFF1A0A2E),
            Color(0xFF0A0A1A),
            Color(0xFF0D1B2A),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
    );
  }

  Widget _buildTopBar(RoomModel room) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      child: Row(
        children: [
          // Back
          GestureDetector(
            onTap: () => context.pop(),
            child: Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: Colors.black38,
                borderRadius: BorderRadius.circular(18),
              ),
              child: const Icon(Icons.arrow_back_ios_new,
                  color: Colors.white, size: 18),
            ),
          ),
          const SizedBox(width: 12),
          // Title + live badge
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  room.title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 15,
                    fontFamily: 'Poppins',
                  ),
                ),
                Row(
                  children: [
                    _AnimatedLiveBadge(),
                    const SizedBox(width: 8),
                    Icon(Icons.remove_red_eye_outlined,
                        size: 12, color: Colors.white60),
                    const SizedBox(width: 3),
                    Text(
                      _formatCount(room.viewerCount),
                      style: const TextStyle(
                        color: Colors.white60,
                        fontSize: 11,
                        fontFamily: 'Poppins',
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          // Gift count
          Row(
            children: [
              const Text('🎁', style: TextStyle(fontSize: 16)),
              const SizedBox(width: 4),
              Text(
                _formatCount(room.totalGifts),
                style: TextStyle(
                  color: AppColors.coin,
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  fontFamily: 'Poppins',
                ),
              ),
            ],
          ),
          const SizedBox(width: 10),
          GestureDetector(
            onTap: () => _showRoomOptions(room),
            child: const Icon(Icons.more_vert, color: Colors.white70),
          ),
        ],
      ),
    );
  }

  Widget _buildAnnouncementBanner(String text) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFFB45309), Color(0xFFFFD700)],
        ),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          const Icon(Icons.campaign, color: Colors.white, size: 16),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              text,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 12,
                fontWeight: FontWeight.w500,
                fontFamily: 'Poppins',
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSeatsArea(RoomModel room) {
    final seats = room.seats;
    final maxSeats = room.maxSeats;

    // Build host seat + guest seats
    final hostSeat =
        seats.isNotEmpty ? seats[0] : null;
    final guestSeats =
        seats.length > 1 ? seats.sublist(1) : <SeatModel>[];

    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      child: Column(
        children: [
          // Host seat (center, larger)
          _buildHostSeatWidget(hostSeat, room.host),
          const SizedBox(height: 28),
          // Guest seats grid
          _buildGuestSeatsGrid(guestSeats, maxSeats, room),
        ],
      ),
    );
  }

  Widget _buildHostSeatWidget(SeatModel? seat, user) {
    final Map<String, dynamic>? userMap = seat?.user != null
        ? {
            'id': seat!.user!.id,
            'displayName': seat.user!.displayName,
            'username': seat.user!.username,
            'avatar': seat.user!.avatar,
            'vipLevel': seat.user!.vipLevel,
          }
        : {
            'id': user.id,
            'displayName': user.displayName,
            'username': user.username,
            'avatar': user.avatar,
            'vipLevel': user.vipLevel,
          };

    return SeatWidget(
      position: 1,
      user: userMap,
      isHost: true,
      isMuted: seat?.isMuted ?? false,
      isLocked: false,
      isMine: false,
      isSpeaking: seat?.speakingLevel != null &&
          seat!.speakingLevel > 20,
      onTap: () {
        final hostId = seat?.user?.id ?? user?.id;
        if (hostId != null) {
          context.push('/profile/$hostId');
        }
      },
    );
  }

  Widget _buildGuestSeatsGrid(
    List<SeatModel> seats,
    int maxSeats,
    RoomModel room,
  ) {
    final totalGuest = maxSeats - 1;
    final mySeatIdx = ref.read(roomProvider).mySeatIndex;

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 4,
        childAspectRatio: 0.75,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
      ),
      itemCount: totalGuest,
      itemBuilder: (ctx, i) {
        final position = i + 2;
        final seat = i < seats.length ? seats[i] : null;
        final isMine = mySeatIdx == position;

        Map<String, dynamic>? userMap;
        if (seat?.user != null) {
          userMap = {
            'id': seat!.user!.id,
            'displayName': seat.user!.displayName,
            'username': seat.user!.username,
            'avatar': seat.user!.avatar,
            'vipLevel': seat.user!.vipLevel,
          };
        }

        return SeatWidget(
          position: position,
          user: userMap,
          isHost: false,
          isMuted: seat?.isMuted ?? false,
          isLocked: seat?.isLocked ?? false,
          isMine: isMine,
          isSpeaking: seat != null && seat.speakingLevel > 20,
          onTap: () => _onSeatTap(position, seat),
        );
      },
    );
  }

  Widget _buildGiftStreamOverlay(List<GiftEventModel> gifts) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.end,
      mainAxisSize: MainAxisSize.min,
      children: gifts
          .take(3)
          .map((gift) => _buildGiftStreamItem(gift))
          .toList(),
    );
  }

  Widget _buildGiftStreamItem(GiftEventModel gift) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.black54,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: AppColors.primary.withOpacity(0.4)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (gift.senderAvatar != null)
            ClipOval(
              child: CachedNetworkImage(
                imageUrl: gift.senderAvatar!,
                width: 28,
                height: 28,
                fit: BoxFit.cover,
                errorWidget: (_, __, ___) => const Icon(
                  Icons.person,
                  size: 18,
                  color: Colors.white60,
                ),
              ),
            ),
          const SizedBox(width: 6),
          Text(
            gift.senderName,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 12,
              fontWeight: FontWeight.w600,
              fontFamily: 'Poppins',
            ),
          ),
          const SizedBox(width: 4),
          const Text('sent',
              style: TextStyle(
                  color: Colors.white54,
                  fontSize: 11,
                  fontFamily: 'Poppins')),
          const SizedBox(width: 4),
          Text(
            '${gift.gift.name} x${gift.count}',
            style: TextStyle(
              color: AppColors.primary,
              fontSize: 12,
              fontWeight: FontWeight.w600,
              fontFamily: 'Poppins',
            ),
          ),
        ],
      ),
    )
        .animate()
        .slideX(begin: 1.0, duration: 300.ms, curve: Curves.easeOut)
        .fadeIn(duration: 300.ms);
  }

  Widget _buildBottomToolbar(bool isMicOn) {
    return Container(
      padding:
          const EdgeInsets.symmetric(horizontal: 24, vertical: 10),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          _buildToolbarButton(
            icon: isMicOn ? Icons.mic : Icons.mic_off,
            label: isMicOn ? 'Mic On' : 'Muted',
            iconColor: isMicOn ? Colors.white : AppColors.error,
            bgColor: isMicOn
                ? Colors.white10
                : AppColors.error.withOpacity(0.2),
            onTap: _toggleMic,
          ),
          _buildToolbarButton(
            icon: Icons.card_giftcard_outlined,
            label: 'Gift',
            iconColor: AppColors.vip3,
            bgColor: AppColors.vip3.withOpacity(0.15),
            onTap: _openGiftPanel,
          ),
          _buildToolbarButton(
            icon: Icons.chat_bubble_outline,
            label: 'Chat',
            iconColor: AppColors.primary,
            bgColor: AppColors.primary.withOpacity(0.15),
            onTap: _toggleChat,
          ),
          _buildToolbarButton(
            icon: Icons.more_horiz,
            label: 'More',
            iconColor: Colors.white70,
            bgColor: Colors.white10,
            onTap: _showMoreOptions,
          ),
        ],
      ),
    );
  }

  Widget _buildToolbarButton({
    required IconData icon,
    required String label,
    required Color iconColor,
    required Color bgColor,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 52,
            height: 52,
            decoration: BoxDecoration(
              color: bgColor,
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: iconColor, size: 24),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: TextStyle(
              color: Colors.white54,
              fontSize: 10,
              fontFamily: 'Poppins',
            ),
          ),
        ],
      ),
    );
  }

  void _onSeatTap(int position, SeatModel? seat) {
    if (seat == null || seat.isEmpty) {
      ref.read(roomProvider.notifier).takeSeat(position - 1);
    } else if (seat.isOccupied && seat.user != null) {
      _showUserOptions(seat.user!.id, seat.user!.displayName);
    }
  }

  void _showUserOptions(String userId, String name) {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.cardDark,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              margin: const EdgeInsets.only(top: 12, bottom: 8),
              width: 36,
              height: 4,
              decoration: BoxDecoration(
                color: AppColors.dividerDark,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(
                  horizontal: 20, vertical: 8),
              child: Text(
                name,
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                  fontFamily: 'Poppins',
                ),
              ),
            ),
            ListTile(
              leading: const Icon(Icons.person_outline,
                  color: Colors.white70),
              title: const Text('View Profile',
                  style: TextStyle(
                      color: Colors.white, fontFamily: 'Poppins')),
              onTap: () {
                Navigator.pop(context);
                context.push('/profile/$userId');
              },
            ),
            ListTile(
              leading: const Icon(Icons.card_giftcard_outlined,
                  color: AppColors.vip3),
              title: const Text('Send Gift',
                  style: TextStyle(
                      color: Colors.white, fontFamily: 'Poppins')),
              onTap: () {
                Navigator.pop(context);
                _openGiftPanel();
              },
            ),
            ListTile(
              leading: const Icon(Icons.flag_outlined,
                  color: AppColors.error),
              title: const Text('Report',
                  style: TextStyle(
                      color: AppColors.error,
                      fontFamily: 'Poppins')),
              onTap: () => Navigator.pop(context),
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }

  void _showRoomOptions(RoomModel room) {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.cardDark,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              margin: const EdgeInsets.only(top: 12, bottom: 8),
              width: 36,
              height: 4,
              decoration: BoxDecoration(
                color: AppColors.dividerDark,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            ListTile(
              leading: const Icon(Icons.info_outline,
                  color: Colors.white70),
              title: const Text('Room Info',
                  style: TextStyle(
                      color: Colors.white, fontFamily: 'Poppins')),
              onTap: () => Navigator.pop(context),
            ),
            ListTile(
              leading: const Icon(Icons.share_outlined,
                  color: Colors.white70),
              title: const Text('Share',
                  style: TextStyle(
                      color: Colors.white, fontFamily: 'Poppins')),
              onTap: () => Navigator.pop(context),
            ),
            ListTile(
              leading: const Icon(Icons.flag_outlined,
                  color: AppColors.error),
              title: const Text('Report',
                  style: TextStyle(
                      color: AppColors.error,
                      fontFamily: 'Poppins')),
              onTap: () => Navigator.pop(context),
            ),
            ListTile(
              leading: const Icon(Icons.exit_to_app,
                  color: AppColors.error),
              title: const Text('Leave Room',
                  style: TextStyle(
                      color: AppColors.error,
                      fontFamily: 'Poppins')),
              onTap: () {
                Navigator.pop(context);
                context.pop();
              },
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }

  void _showMoreOptions() {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.cardDark,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              margin: const EdgeInsets.only(top: 12, bottom: 8),
              width: 36,
              height: 4,
              decoration: BoxDecoration(
                color: AppColors.dividerDark,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            ListTile(
              leading: const Icon(Icons.leaderboard_outlined,
                  color: AppColors.vip3),
              title: const Text('Gift Ranking',
                  style: TextStyle(
                      color: Colors.white, fontFamily: 'Poppins')),
              onTap: () => Navigator.pop(context),
            ),
            ListTile(
              leading: const Icon(Icons.sports_kabaddi,
                  color: AppColors.primary),
              title: const Text('PK Battle',
                  style: TextStyle(
                      color: Colors.white, fontFamily: 'Poppins')),
              onTap: () => Navigator.pop(context),
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }

  String _formatCount(int n) {
    if (n >= 1000000) return '${(n / 1000000).toStringAsFixed(1)}M';
    if (n >= 1000) return '${(n / 1000).toStringAsFixed(1)}K';
    return n.toString();
  }
}

// ---------------------------------------------------------------------------
// Animated LIVE badge
// ---------------------------------------------------------------------------

class _AnimatedLiveBadge extends StatefulWidget {
  @override
  State<_AnimatedLiveBadge> createState() => _AnimatedLiveBadgeState();
}

class _AnimatedLiveBadgeState extends State<_AnimatedLiveBadge>
    with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  late Animation<double> _opacity;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    )..repeat(reverse: true);
    _opacity = Tween<double>(begin: 0.5, end: 1.0).animate(_ctrl);
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: _opacity,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
        decoration: BoxDecoration(
          color: AppColors.error,
          borderRadius: BorderRadius.circular(5),
        ),
        child: const Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('●',
                style: TextStyle(color: Colors.white, fontSize: 8)),
            SizedBox(width: 3),
            Text(
              'LIVE',
              style: TextStyle(
                color: Colors.white,
                fontSize: 10,
                fontWeight: FontWeight.bold,
                letterSpacing: 0.5,
                fontFamily: 'Poppins',
              ),
            ),
          ],
        ),
      ),
    );
  }
}
