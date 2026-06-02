import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/network/api_client.dart';

class AgencyScreen extends ConsumerStatefulWidget {
  const AgencyScreen({super.key});

  @override
  ConsumerState<AgencyScreen> createState() => _AgencyScreenState();
}

class _AgencyScreenState extends ConsumerState<AgencyScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabCtrl;
  Map<String, dynamic>? _myAgency;
  List<Map<String, dynamic>> _hosts = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: 2, vsync: this);
    _load();
  }

  @override
  void dispose() {
    _tabCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final api = ref.read(apiClientProvider);
      final myRes = await api.get('/agencies/my').catchError((_) => null);
      if (myRes != null && myRes.statusCode == 200 && mounted) {
        final data = myRes.data['data'] ?? myRes.data;
        _myAgency = Map<String, dynamic>.from(data as Map);
        final hostsRes = await api.get('/agencies/${_myAgency!['id']}/members').catchError((_) => null);
        if (hostsRes != null && hostsRes.statusCode == 200) {
          _hosts = ((hostsRes.data['data'] ?? hostsRes.data['items'] ?? []) as List)
              .map((e) => Map<String, dynamic>.from(e as Map)).toList();
        }
      }
    } catch (_) {} finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        title: const Text('Agency', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, color: Colors.white),
          onPressed: () => context.pop(),
        ),
        bottom: TabBar(
          controller: _tabCtrl,
          indicatorColor: AppColors.primary,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white54,
          tabs: const [Tab(text: 'My Agency'), Tab(text: 'Earnings')],
        ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : TabBarView(
              controller: _tabCtrl,
              children: [
                _buildAgencyTab(),
                _buildEarningsTab(),
              ],
            ),
    );
  }

  Widget _buildAgencyTab() {
    if (_myAgency == null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Text('🏢', style: TextStyle(fontSize: 64)),
            const SizedBox(height: 16),
            const Text('No Agency Yet', style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            const Text('Create an agency to manage hosts and earn commissions', style: TextStyle(color: Colors.white54, fontSize: 13), textAlign: TextAlign.center),
            const SizedBox(height: 24),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 14),
              ),
              onPressed: _showCreateDialog,
              child: const Text('Create Agency (10,000 coins)', style: TextStyle(color: Colors.white)),
            ),
          ],
        ),
      );
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          _buildAgencyCard(),
          const SizedBox(height: 16),
          _buildHostsList(),
        ],
      ),
    );
  }

  Widget _buildAgencyCard() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [AppColors.primary.withOpacity(0.2), AppColors.card],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.primary.withOpacity(0.3)),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Container(
                width: 56, height: 56,
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  shape: BoxShape.circle,
                  image: _myAgency!['avatar'] != null
                      ? DecorationImage(image: NetworkImage(_myAgency!['avatar'] as String), fit: BoxFit.cover)
                      : null,
                ),
                child: _myAgency!['avatar'] == null
                    ? Center(child: Text(
                        (_myAgency!['name'] as String? ?? 'A').substring(0, 1).toUpperCase(),
                        style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold),
                      ))
                    : null,
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(_myAgency!['name'] as String? ?? 'Agency', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18)),
                    Text('Commission: ${_myAgency!['commissionRate'] ?? 30}%', style: const TextStyle(color: AppColors.primary, fontSize: 13)),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              _statItem('${_myAgency!['_count']?['members'] ?? _hosts.length}', 'Hosts'),
              Container(width: 1, height: 32, color: Colors.white12),
              _statItem(_formatNumber(_myAgency!['totalEarnings'] as int? ?? 0), 'Total Earned'),
              Container(width: 1, height: 32, color: Colors.white12),
              _statItem(_formatNumber(_myAgency!['monthlyEarnings'] as int? ?? 0), 'This Month'),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildHostsList() {
    if (_hosts.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(color: AppColors.card, borderRadius: BorderRadius.circular(14)),
        child: const Center(child: Text('No hosts yet. Invite hosts to join your agency.', style: TextStyle(color: Colors.white54), textAlign: TextAlign.center)),
      );
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Hosts', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
        const SizedBox(height: 10),
        ..._hosts.asMap().entries.map((e) {
          final host = e.value['user'] as Map<String, dynamic>? ?? e.value;
          return Container(
            margin: const EdgeInsets.only(bottom: 8),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: AppColors.card, borderRadius: BorderRadius.circular(12)),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 22,
                  backgroundImage: host['avatar'] != null ? NetworkImage(host['avatar'] as String) : null,
                  backgroundColor: AppColors.surface,
                  child: host['avatar'] == null ? Text((host['displayName'] as String? ?? 'H').substring(0, 1).toUpperCase(), style: const TextStyle(color: Colors.white)) : null,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(host['displayName'] as String? ?? 'Host', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
                      Text('Diamonds: ${_formatNumber(e.value['diamonds'] as int? ?? 0)}', style: const TextStyle(color: Colors.white54, fontSize: 12)),
                    ],
                  ),
                ),
                GestureDetector(
                  onTap: () => context.push('/profile/${host['id']}'),
                  child: const Icon(Icons.chevron_right, color: Colors.white38),
                ),
              ],
            ),
          ).animate(delay: Duration(milliseconds: e.key * 40)).fadeIn(duration: 300.ms);
        }),
      ],
    );
  }

  Widget _buildEarningsTab() {
    return const Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text('💰', style: TextStyle(fontSize: 56)),
          SizedBox(height: 12),
          Text('Earnings History', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
          SizedBox(height: 8),
          Text('Detailed earnings report coming soon', style: TextStyle(color: Colors.white54)),
        ],
      ),
    );
  }

  Widget _statItem(String val, String label) {
    return Column(
      children: [
        Text(val, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
        Text(label, style: const TextStyle(color: Colors.white54, fontSize: 11)),
      ],
    );
  }

  void _showCreateDialog() {
    final nameCtrl = TextEditingController();
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: AppColors.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Create Agency', style: TextStyle(color: Colors.white)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('Cost: 10,000 coins', style: TextStyle(color: Colors.white54)),
            const SizedBox(height: 12),
            TextField(
              controller: nameCtrl,
              style: const TextStyle(color: Colors.white),
              decoration: InputDecoration(
                labelText: 'Agency Name',
                labelStyle: const TextStyle(color: Colors.white54),
                filled: true, fillColor: AppColors.card,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
            onPressed: () async {
              if (nameCtrl.text.trim().isEmpty) return;
              try {
                final api = ref.read(apiClientProvider);
                await api.post('/agencies', data: {'name': nameCtrl.text.trim()});
                if (mounted) {
                  Navigator.pop(context);
                  _load();
                }
              } catch (e) {
                if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red));
              }
            },
            child: const Text('Create'),
          ),
        ],
      ),
    );
  }

  String _formatNumber(int n) {
    if (n >= 1000000) return '${(n / 1000000).toStringAsFixed(1)}M';
    if (n >= 1000) return '${(n / 1000).toStringAsFixed(1)}K';
    return n.toString();
  }
}
