import 'dart:async';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/network/api_client.dart';
import '../../../../core/theme/app_colors.dart';

class SearchScreen extends ConsumerStatefulWidget {
  const SearchScreen({super.key});

  @override
  ConsumerState<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends ConsumerState<SearchScreen> with SingleTickerProviderStateMixin {
  late TabController _tab;
  final _ctrl = TextEditingController();
  Timer? _debounce;
  List<Map<String, dynamic>> _users = [];
  List<Map<String, dynamic>> _rooms = [];
  bool _loading = false;
  String _query = '';

  @override
  void initState() {
    super.initState();
    _tab = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tab.dispose();
    _ctrl.dispose();
    _debounce?.cancel();
    super.dispose();
  }

  void _onSearch(String q) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 400), () {
      if (q.trim().length < 1) {
        setState(() { _users = []; _rooms = []; _query = ''; });
        return;
      }
      setState(() => _query = q.trim());
      _search(q.trim());
    });
  }

  Future<void> _search(String q) async {
    setState(() => _loading = true);
    try {
      final api = ref.read(apiClientProvider);
      final encoded = Uri.encodeComponent(q);
      final results = await Future.wait([
        api.get('/users/search?q=$encoded&limit=20'),
        api.get('/rooms/feed?search=$encoded&limit=20').catchError((_) => api.get('/rooms?q=$encoded&limit=20')),
      ]);
      if (!mounted) return;
      final ud = results[0].data['data'] ?? results[0].data;
      final rd = results[1].data['data'] ?? results[1].data;
      setState(() {
        _users = ((ud is Map ? (ud['items'] ?? ud) : ud) as List? ?? [])
            .map((e) => Map<String, dynamic>.from(e as Map)).toList();
        _rooms = ((rd is Map ? (rd['items'] ?? rd) : rd) as List? ?? [])
            .map((e) => Map<String, dynamic>.from(e as Map)).toList();
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundDark,
      appBar: AppBar(
        backgroundColor: AppColors.backgroundDark,
        elevation: 0,
        titleSpacing: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, color: Colors.white),
          onPressed: () => context.pop(),
        ),
        title: TextField(
          controller: _ctrl,
          autofocus: true,
          onChanged: _onSearch,
          style: const TextStyle(color: Colors.white, fontSize: 15),
          decoration: InputDecoration(
            hintText: 'Foydalanuvchi yoki xona qidirish...',
            hintStyle: TextStyle(color: Colors.white.withOpacity(0.35), fontSize: 15),
            border: InputBorder.none,
          ),
        ),
        bottom: TabBar(
          controller: _tab,
          indicatorColor: AppColors.primary,
          labelColor: AppColors.primary,
          unselectedLabelColor: Colors.white38,
          labelStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
          tabs: [
            Tab(text: 'Foydalanuvchilar (${_users.length})'),
            Tab(text: 'Xonalar (${_rooms.length})'),
          ],
        ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary, strokeWidth: 2))
          : _query.isEmpty
              ? Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                  const Icon(Icons.search, color: Colors.white24, size: 64),
                  const SizedBox(height: 12),
                  const Text('Biror narsa qidiring', style: TextStyle(color: Colors.white38, fontSize: 16)),
                ]))
              : TabBarView(
                  controller: _tab,
                  children: [
                    _buildUserList(),
                    _buildRoomList(),
                  ],
                ),
    );
  }

  Widget _buildUserList() {
    if (_users.isEmpty) return const Center(child: Text('Foydalanuvchi topilmadi', style: TextStyle(color: Colors.white38)));
    return ListView.separated(
      padding: const EdgeInsets.symmetric(vertical: 8),
      itemCount: _users.length,
      separatorBuilder: (_, __) => const Divider(color: Colors.white10, indent: 72, height: 1),
      itemBuilder: (ctx, i) {
        final u = _users[i];
        return ListTile(
          leading: CircleAvatar(
            radius: 22,
            backgroundColor: AppColors.primary.withOpacity(0.3),
            backgroundImage: u['avatar'] != null ? CachedNetworkImageProvider(u['avatar'] as String) : null,
            child: u['avatar'] == null
                ? Text((u['displayName'] as String? ?? 'U').substring(0, 1).toUpperCase(),
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold))
                : null,
          ),
          title: Text(u['displayName'] as String? ?? 'User', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 14)),
          subtitle: Text('ID: ${u['uid'] ?? ''}  Lv.${u['level'] ?? 1}',
              style: const TextStyle(color: Colors.white38, fontSize: 11)),
          trailing: u['isOnline'] == true
              ? Container(width: 8, height: 8, decoration: const BoxDecoration(color: Colors.green, shape: BoxShape.circle))
              : null,
          onTap: () => context.push('/profile/${u['uid']}'),
        ).animate(delay: Duration(milliseconds: i * 30)).fadeIn(duration: 250.ms);
      },
    );
  }

  Widget _buildRoomList() {
    if (_rooms.isEmpty) return const Center(child: Text('Xona topilmadi', style: TextStyle(color: Colors.white38)));
    return ListView.separated(
      padding: const EdgeInsets.symmetric(vertical: 8),
      itemCount: _rooms.length,
      separatorBuilder: (_, __) => const Divider(color: Colors.white10, height: 1),
      itemBuilder: (ctx, i) {
        final r = _rooms[i];
        final memberCount = r['memberCount'] as int? ?? 0;
        return ListTile(
          leading: ClipRRect(
            borderRadius: BorderRadius.circular(10),
            child: r['coverImage'] != null
                ? CachedNetworkImage(imageUrl: r['coverImage'] as String, width: 44, height: 44, fit: BoxFit.cover)
                : Container(
                    width: 44, height: 44,
                    color: AppColors.primary.withOpacity(0.25),
                    child: const Icon(Icons.mic, color: Colors.white54, size: 20),
                  ),
          ),
          title: Text(r['name'] as String? ?? 'Xona', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 14)),
          subtitle: Text('👥 $memberCount', style: const TextStyle(color: Colors.white38, fontSize: 12)),
          onTap: () async {
            try {
              final api = ref.read(apiClientProvider);
              await api.post('/rooms/${r['id']}/join');
            } catch (_) {}
            if (mounted) context.push('/rooms/${r['id']}');
          },
        ).animate(delay: Duration(milliseconds: i * 30)).fadeIn(duration: 250.ms);
      },
    );
  }
}
