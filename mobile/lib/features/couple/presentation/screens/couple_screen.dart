import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/providers/auth_provider.dart';
import '../widgets/couple_card.dart';
import '../widgets/couple_request_card.dart';

class CoupleScreen extends ConsumerStatefulWidget {
  const CoupleScreen({super.key});

  @override
  ConsumerState<CoupleScreen> createState() => _CoupleScreenState();
}

class _CoupleScreenState extends ConsumerState<CoupleScreen> {
  bool _loading = true;
  bool _hasCouple = false;
  Map<String, dynamic>? _coupleData;
  List<Map<String, dynamic>> _requests = [];
  String _error = '';

  // Search state
  final TextEditingController _searchCtrl = TextEditingController();
  List<Map<String, dynamic>> _searchResults = [];
  bool _searching = false;
  Timer? _searchDebounce;

  // Request message
  final TextEditingController _messageCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    _messageCtrl.dispose();
    _searchDebounce?.cancel();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = '';
    });
    try {
      final api = ref.read(apiClientProvider);
      final results = await Future.wait([
        api.get('/couples/me').catchError((_) => null),
        api.get('/couples/requests').catchError((_) => null),
      ]);

      final coupleRes = results[0];
      final requestsRes = results[1];

      if (mounted) {
        setState(() {
          if (coupleRes != null && coupleRes.statusCode == 200) {
            final data = coupleRes.data['data'] ?? coupleRes.data;
            if (data != null && data is Map) {
              _coupleData = Map<String, dynamic>.from(data as Map);
              _hasCouple = true;
            } else {
              _hasCouple = false;
            }
          } else {
            _hasCouple = false;
          }

          if (requestsRes != null && requestsRes.statusCode == 200) {
            final data = requestsRes.data['data'] ?? requestsRes.data;
            if (data is List) {
              _requests = data
                  .map((e) => Map<String, dynamic>.from(e as Map))
                  .toList();
            }
          }
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _loading = false;
        });
      }
    }
  }

  Future<void> _searchUsers(String query) async {
    if (query.trim().isEmpty) {
      setState(() => _searchResults = []);
      return;
    }
    setState(() => _searching = true);
    try {
      final api = ref.read(apiClientProvider);
      final res = await api.get('/users/search', queryParameters: {'q': query});
      final data = res.data['data'] ?? res.data;
      if (mounted) {
        setState(() {
          _searchResults = (data is List
                  ? data
                  : (data['users'] ?? data['items'] ?? []) as List)
              .map((e) => Map<String, dynamic>.from(e as Map))
              .toList();
          _searching = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _searching = false);
    }
  }

  Future<void> _sendRequest(String receiverId) async {
    final message = _messageCtrl.text.trim();
    try {
      final api = ref.read(apiClientProvider);
      await api.post('/couples/request', data: {
        'receiverId': receiverId,
        'message': message,
      });
      if (mounted) {
        Navigator.of(context).pop();
        _messageCtrl.clear();
        setState(() => _searchResults = []);
        _searchCtrl.clear();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Row(
              children: [
                Icon(Icons.favorite, color: Colors.white, size: 18),
                SizedBox(width: 8),
                Text('Couple request sent!',
                    style: TextStyle(fontFamily: 'Poppins')),
              ],
            ),
            backgroundColor: Color(0xFFEC4899),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to send request: $e',
                style: const TextStyle(fontFamily: 'Poppins')),
            backgroundColor: AppColors.error,
          ),
        );
      }
    }
  }

  Future<void> _acceptRequest(String requestId) async {
    try {
      final api = ref.read(apiClientProvider);
      await api.post('/couples/request/$requestId/accept');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Request accepted!',
                style: TextStyle(fontFamily: 'Poppins')),
            backgroundColor: Color(0xFFEC4899),
          ),
        );
        _load();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed: $e',
                style: const TextStyle(fontFamily: 'Poppins')),
            backgroundColor: AppColors.error,
          ),
        );
      }
    }
  }

  Future<void> _rejectRequest(String requestId) async {
    try {
      final api = ref.read(apiClientProvider);
      await api.post('/couples/request/$requestId/reject');
      if (mounted) {
        setState(() {
          _requests.removeWhere((r) => r['id'] == requestId);
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed: $e',
                style: const TextStyle(fontFamily: 'Poppins')),
            backgroundColor: AppColors.error,
          ),
        );
      }
    }
  }

  Future<void> _endRelationship() async {
    final reason = await _showEndConfirmDialog();
    if (reason == null) return;

    try {
      final api = ref.read(apiClientProvider);
      final coupleId = _coupleData?['id'];
      await api.delete('/couples/$coupleId', data: {'reason': reason});
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Relationship ended.',
                style: TextStyle(fontFamily: 'Poppins')),
            backgroundColor: AppColors.error,
          ),
        );
        _load();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed: $e',
                style: const TextStyle(fontFamily: 'Poppins')),
            backgroundColor: AppColors.error,
          ),
        );
      }
    }
  }

  Future<String?> _showEndConfirmDialog() async {
    final reasonCtrl = TextEditingController();
    return showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.cardDark,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Row(
          children: [
            Icon(Icons.heart_broken, color: AppColors.error, size: 24),
            SizedBox(width: 8),
            Text(
              'End Relationship',
              style: TextStyle(
                color: Colors.white,
                fontFamily: 'Poppins',
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              'Are you sure you want to end your relationship? This action cannot be undone.',
              style: TextStyle(
                color: AppColors.textSecondary,
                fontFamily: 'Poppins',
                fontSize: 14,
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: reasonCtrl,
              style: const TextStyle(
                  color: Colors.white, fontFamily: 'Poppins'),
              decoration: InputDecoration(
                hintText: 'Reason (optional)',
                hintStyle: const TextStyle(
                  color: AppColors.textTertiary,
                  fontFamily: 'Poppins',
                ),
                filled: true,
                fillColor: AppColors.elevatedDark,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide.none,
                ),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(null),
            child: const Text(
              'Cancel',
              style: TextStyle(
                  color: AppColors.textSecondary, fontFamily: 'Poppins'),
            ),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.error,
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12)),
            ),
            onPressed: () =>
                Navigator.of(ctx).pop(reasonCtrl.text.trim().isEmpty
                    ? 'No reason given'
                    : reasonCtrl.text.trim()),
            child: const Text(
              'End It',
              style:
                  TextStyle(color: Colors.white, fontFamily: 'Poppins'),
            ),
          ),
        ],
      ),
    );
  }

  void _showSendRequestModal(Map<String, dynamic> user) {
    _messageCtrl.clear();
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.cardDark,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(
          left: 24,
          right: 24,
          top: 24,
          bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.white24,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 20),
            const Icon(Icons.favorite, color: Color(0xFFEC4899), size: 32),
            const SizedBox(height: 12),
            Text(
              'Send couple request to ${user['username']}?',
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
                fontSize: 16,
                fontFamily: 'Poppins',
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _messageCtrl,
              style:
                  const TextStyle(color: Colors.white, fontFamily: 'Poppins'),
              maxLines: 3,
              decoration: InputDecoration(
                hintText: 'Add a love message... 💕',
                hintStyle: const TextStyle(
                  color: AppColors.textTertiary,
                  fontFamily: 'Poppins',
                ),
                filled: true,
                fillColor: AppColors.elevatedDark,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide.none,
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(
                    color: Color(0xFFEC4899),
                    width: 1.5,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14)),
                  backgroundColor: Colors.transparent,
                  shadowColor: Colors.transparent,
                ).copyWith(
                  backgroundColor: WidgetStateProperty.all(Colors.transparent),
                ),
                onPressed: () => _sendRequest(user['id'] as String),
                child: Ink(
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFFEC4899), Color(0xFFBE185D)],
                    ),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Container(
                    alignment: Alignment.center,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    child: const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.favorite, color: Colors.white, size: 18),
                        SizedBox(width: 8),
                        Text(
                          'Send Request',
                          style: TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            fontSize: 15,
                            fontFamily: 'Poppins',
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundDark,
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFF0A0A0F), Color(0xFF1A0820), Color(0xFF0A0A0F)],
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
          ),
        ),
        child: SafeArea(
          child: _loading
              ? const Center(
                  child: CircularProgressIndicator(
                    color: Color(0xFFEC4899),
                  ),
                )
              : _error.isNotEmpty
                  ? _buildError()
                  : _hasCouple
                      ? _buildHasCoupleView()
                      : _buildNoCoupleView(),
        ),
      ),
    );
  }

  Widget _buildError() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, color: AppColors.error, size: 64),
            const SizedBox(height: 16),
            const Text(
              'Something went wrong',
              style: TextStyle(
                color: Colors.white,
                fontSize: 18,
                fontWeight: FontWeight.bold,
                fontFamily: 'Poppins',
              ),
            ),
            const SizedBox(height: 8),
            Text(
              _error,
              style: const TextStyle(
                color: AppColors.textSecondary,
                fontSize: 13,
                fontFamily: 'Poppins',
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: _load,
              style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary),
              child: const Text('Retry',
                  style: TextStyle(fontFamily: 'Poppins')),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHasCoupleView() {
    return RefreshIndicator(
      onRefresh: _load,
      color: const Color(0xFFEC4899),
      child: CustomScrollView(
        slivers: [
          SliverAppBar(
            backgroundColor: Colors.transparent,
            elevation: 0,
            pinned: true,
            leading: IconButton(
              icon: const Icon(Icons.arrow_back_ios_new, color: Colors.white),
              onPressed: () => context.pop(),
            ),
            title: const Text(
              'Our Love Story',
              style: TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
                fontFamily: 'Poppins',
              ),
            ),
            centerTitle: true,
            flexibleSpace: Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    const Color(0xFF1A0820),
                    Colors.transparent,
                  ],
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                ),
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: Column(
              children: [
                const SizedBox(height: 16),
                if (_coupleData != null) CoupleCard(coupleData: _coupleData!),
                const SizedBox(height: 32),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: AppColors.error),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14)),
                      ),
                      onPressed: _endRelationship,
                      icon: const Icon(Icons.heart_broken,
                          color: AppColors.error, size: 18),
                      label: const Text(
                        'End Relationship',
                        style: TextStyle(
                          color: AppColors.error,
                          fontFamily: 'Poppins',
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ),
                ).animate().fadeIn(delay: 300.ms),
                const SizedBox(height: 32),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNoCoupleView() {
    final hasRequests = _requests.isNotEmpty;
    final hasSearchResults = _searchResults.isNotEmpty;

    return RefreshIndicator(
      onRefresh: _load,
      color: const Color(0xFFEC4899),
      child: CustomScrollView(
        slivers: [
          SliverAppBar(
            backgroundColor: Colors.transparent,
            elevation: 0,
            pinned: true,
            leading: IconButton(
              icon: const Icon(Icons.arrow_back_ios_new, color: Colors.white),
              onPressed: () => context.pop(),
            ),
            title: const Text(
              'Find Your Match',
              style: TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
                fontFamily: 'Poppins',
              ),
            ),
            centerTitle: true,
          ),
          SliverToBoxAdapter(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Search bar
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
                  child: Container(
                    decoration: BoxDecoration(
                      color: AppColors.cardDark,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: Colors.pink.withOpacity(0.3),
                        width: 1,
                      ),
                    ),
                    child: TextField(
                      controller: _searchCtrl,
                      style: const TextStyle(
                          color: Colors.white, fontFamily: 'Poppins'),
                      onChanged: (val) {
                        _searchDebounce?.cancel();
                        _searchDebounce = Timer(
                          const Duration(milliseconds: 500),
                          () => _searchUsers(val),
                        );
                      },
                      decoration: InputDecoration(
                        hintText: 'Search users by name...',
                        hintStyle: const TextStyle(
                          color: AppColors.textTertiary,
                          fontFamily: 'Poppins',
                        ),
                        prefixIcon: const Icon(
                          Icons.search,
                          color: Color(0xFFEC4899),
                        ),
                        suffixIcon: _searching
                            ? const Padding(
                                padding: EdgeInsets.all(12),
                                child: SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: Color(0xFFEC4899),
                                  ),
                                ),
                              )
                            : _searchCtrl.text.isNotEmpty
                                ? IconButton(
                                    icon: const Icon(Icons.clear,
                                        color: AppColors.textSecondary),
                                    onPressed: () {
                                      _searchCtrl.clear();
                                      setState(() => _searchResults = []);
                                    },
                                  )
                                : null,
                        border: InputBorder.none,
                        contentPadding: const EdgeInsets.symmetric(
                            horizontal: 16, vertical: 14),
                      ),
                    ),
                  ),
                ).animate().fadeIn(duration: 300.ms).slideY(begin: -0.2),

                // Search results
                if (hasSearchResults) ...[
                  const Padding(
                    padding: EdgeInsets.fromLTRB(16, 4, 16, 8),
                    child: Text(
                      'Search Results',
                      style: TextStyle(
                        color: AppColors.textSecondary,
                        fontSize: 13,
                        fontFamily: 'Poppins',
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                  ..._searchResults.map((user) => _buildUserSearchTile(user)),
                  const SizedBox(height: 16),
                ],

                // Pending requests
                if (hasRequests) ...[
                  const Padding(
                    padding: EdgeInsets.fromLTRB(16, 8, 16, 8),
                    child: Row(
                      children: [
                        Icon(Icons.favorite_border,
                            color: Color(0xFFEC4899), size: 18),
                        SizedBox(width: 8),
                        Text(
                          'Couple Requests',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            fontFamily: 'Poppins',
                          ),
                        ),
                      ],
                    ),
                  ),
                  ..._requests.map((req) => CoupleRequestCard(
                        request: req,
                        onAccept: () =>
                            _acceptRequest(req['id'] as String),
                        onReject: () =>
                            _rejectRequest(req['id'] as String),
                      )),
                ],

                // Empty state
                if (!hasRequests && !hasSearchResults)
                  _buildEmptyState(),
                const SizedBox(height: 40),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildUserSearchTile(Map<String, dynamic> user) {
    final avatar = user['avatar'] as String?;
    final username = user['username'] as String? ?? 'Unknown';

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      decoration: BoxDecoration(
        color: AppColors.cardDark,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: Colors.pink.withOpacity(0.15),
        ),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
        leading: CircleAvatar(
          radius: 24,
          backgroundColor: AppColors.elevatedDark,
          backgroundImage: avatar != null && avatar.isNotEmpty
              ? CachedNetworkImageProvider(avatar)
              : null,
          child: avatar == null || avatar.isEmpty
              ? Text(
                  username.isNotEmpty ? username[0].toUpperCase() : 'U',
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontFamily: 'Poppins',
                  ),
                )
              : null,
        ),
        title: Text(
          username,
          style: const TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.w600,
            fontFamily: 'Poppins',
          ),
        ),
        subtitle: user['displayName'] != null
            ? Text(
                user['displayName'] as String,
                style: const TextStyle(
                  color: AppColors.textSecondary,
                  fontSize: 12,
                  fontFamily: 'Poppins',
                ),
              )
            : null,
        trailing: GestureDetector(
          onTap: () => _showSendRequestModal(user),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFFEC4899), Color(0xFFBE185D)],
              ),
              borderRadius: BorderRadius.circular(20),
            ),
            child: const Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.favorite, color: Colors.white, size: 14),
                SizedBox(width: 4),
                Text(
                  'Request',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    fontFamily: 'Poppins',
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    ).animate().fadeIn(duration: 250.ms);
  }

  Widget _buildEmptyState() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(32, 40, 32, 24),
      child: Column(
        children: [
          Container(
            width: 120,
            height: 120,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: RadialGradient(
                colors: [
                  Colors.pink.withOpacity(0.2),
                  Colors.transparent,
                ],
              ),
            ),
            child: const Icon(
              Icons.favorite_border,
              color: Color(0xFFEC4899),
              size: 64,
            ),
          ).animate(onPlay: (c) => c.repeat(reverse: true)).scale(
                begin: const Offset(0.95, 0.95),
                end: const Offset(1.05, 1.05),
                duration: 1500.ms,
                curve: Curves.easeInOut,
              ),
          const SizedBox(height: 24),
          const Text(
            'Find Your Perfect Match',
            style: TextStyle(
              color: Colors.white,
              fontSize: 22,
              fontWeight: FontWeight.bold,
              fontFamily: 'Poppins',
            ),
          ),
          const SizedBox(height: 12),
          const Text(
            'Search for someone special and send them a couple request. Your love story starts here.',
            textAlign: TextAlign.center,
            style: TextStyle(
              color: AppColors.textSecondary,
              fontSize: 14,
              fontFamily: 'Poppins',
              height: 1.5,
            ),
          ),
          const SizedBox(height: 32),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.cardDark,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: Colors.pink.withOpacity(0.2),
              ),
            ),
            child: const Row(
              children: [
                Icon(Icons.tips_and_updates,
                    color: Color(0xFFEC4899), size: 20),
                SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'Tip: Search by username above to find and connect with users',
                    style: TextStyle(
                      color: AppColors.textSecondary,
                      fontSize: 13,
                      fontFamily: 'Poppins',
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ).animate().fadeIn(duration: 500.ms).slideY(begin: 0.2),
    );
  }
}
