import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/network/api_client.dart';

class FamilyDetailsScreen extends ConsumerStatefulWidget {
  final String familyId;
  const FamilyDetailsScreen({super.key, required this.familyId});

  @override
  ConsumerState<FamilyDetailsScreen> createState() => _FamilyDetailsScreenState();
}

class _FamilyDetailsScreenState extends ConsumerState<FamilyDetailsScreen> {
  Map<String, dynamic>? _family;
  List<Map<String, dynamic>> _members = [];
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
      final response = await api.get('/families/${widget.familyId}');
      if (response.statusCode == 200 && mounted) {
        final data = response.data['data'] ?? response.data;
        setState(() {
          _family = Map<String, dynamic>.from(data as Map);
          _members = ((data['members'] ?? []) as List)
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
    if (_loading) {
      return const Scaffold(
        backgroundColor: AppColors.background,
        body: Center(child: CircularProgressIndicator(color: AppColors.primary)),
      );
    }
    if (_family == null) {
      return Scaffold(
        backgroundColor: AppColors.background,
        appBar: AppBar(backgroundColor: AppColors.background, leading: IconButton(icon: const Icon(Icons.arrow_back_ios_new, color: Colors.white), onPressed: () => context.pop())),
        body: const Center(child: Text('Family not found', style: TextStyle(color: Colors.white54))),
      );
    }

    return Scaffold(
      backgroundColor: AppColors.background,
      body: CustomScrollView(
        slivers: [
          _buildSliverAppBar(),
          SliverToBoxAdapter(child: _buildContent()),
        ],
      ),
    );
  }

  Widget _buildSliverAppBar() {
    return SliverAppBar(
      expandedHeight: 180,
      pinned: true,
      backgroundColor: AppColors.background,
      leading: IconButton(
        icon: const Icon(Icons.arrow_back_ios_new, color: Colors.white),
        onPressed: () => context.pop(),
      ),
      flexibleSpace: FlexibleSpaceBar(
        background: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: [Color(0xFF3D1A6E), Color(0xFF1A0A3E), Color(0xFF0A0A1A)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const SizedBox(height: 40),
              CircleAvatar(
                radius: 36,
                backgroundImage: _family!['avatar'] != null ? NetworkImage(_family!['avatar'] as String) : null,
                backgroundColor: AppColors.surface,
                child: _family!['avatar'] == null ? Text(
                  (_family!['name'] as String? ?? 'F').substring(0, 1).toUpperCase(),
                  style: const TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.bold),
                ) : null,
              ),
              const SizedBox(height: 8),
              Text(_family!['name'] as String? ?? 'Family', style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
              if (_family!['tag'] != null)
                Text('[${_family!['tag']}]', style: const TextStyle(color: AppColors.primary, fontSize: 13)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildContent() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Stats
        Container(
          margin: const EdgeInsets.all(16),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.card,
            borderRadius: BorderRadius.circular(14),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              _statItem('${_family!['_count']?['members'] ?? _members.length}', 'Members'),
              Container(width: 1, height: 32, color: Colors.white12),
              _statItem(_formatNumber(_family!['treasury'] as int? ?? 0), 'Treasury'),
              Container(width: 1, height: 32, color: Colors.white12),
              _statItem('Lv.${_family!['level'] ?? 1}', 'Level'),
            ],
          ),
        ),
        // Description
        if (_family!['description'] != null) ...[
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 16),
            child: Text('About', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Text(_family!['description'] as String, style: const TextStyle(color: Colors.white70, fontSize: 13)),
          ),
        ],
        // Members
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Text('Members (${_members.length})', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
        ),
        ..._members.map((m) {
          final user = m['user'] as Map<String, dynamic>? ?? m;
          final role = m['role'] as String? ?? 'MEMBER';
          return ListTile(
            leading: CircleAvatar(
              backgroundImage: user['avatar'] != null ? NetworkImage(user['avatar'] as String) : null,
              backgroundColor: AppColors.surface,
              child: user['avatar'] == null ? Text(
                (user['displayName'] as String? ?? 'U').substring(0, 1).toUpperCase(),
                style: const TextStyle(color: Colors.white),
              ) : null,
            ),
            title: Text(user['displayName'] as String? ?? 'User', style: const TextStyle(color: Colors.white)),
            subtitle: Text(role, style: TextStyle(color: role == 'OWNER' ? AppColors.coin : Colors.white54, fontSize: 11)),
            trailing: GestureDetector(
              onTap: () => context.push('/profile/${user['id']}'),
              child: const Icon(Icons.chevron_right, color: Colors.white38),
            ),
          );
        }),
        const SizedBox(height: 32),
      ],
    );
  }

  Widget _statItem(String val, String label) {
    return Column(
      children: [
        Text(val, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18)),
        Text(label, style: const TextStyle(color: Colors.white54, fontSize: 11)),
      ],
    );
  }

  String _formatNumber(int n) {
    if (n >= 1000000) return '${(n / 1000000).toStringAsFixed(1)}M';
    if (n >= 1000) return '${(n / 1000).toStringAsFixed(1)}K';
    return n.toString();
  }
}
