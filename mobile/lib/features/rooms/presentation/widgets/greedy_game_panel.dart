import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/constants/api_constants.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/utils/app_utils.dart';

/// Greedy — the classic live-room wheel betting game.
///
/// The server runs a global round loop (22s betting + 8s reveal). This panel
/// polls `GET /greedy/state` every 2 seconds while open, places bets through
/// `POST /greedy/bet`, and shows the result when the round settles.
class GreedyGamePanel extends ConsumerStatefulWidget {
  const GreedyGamePanel({super.key});

  @override
  ConsumerState<GreedyGamePanel> createState() => _GreedyGamePanelState();
}

class _GreedyGamePanelState extends ConsumerState<GreedyGamePanel> {
  static const _itemEmojis = <String, String>{
    'bread': '🍞',
    'candy': '🍬',
    'beer': '🍺',
    'hotdog': '🌭',
    'watermelon': '🍉',
    'pizza': '🍕',
    'steak': '🥩',
    'crown': '👑',
  };

  static const _chips = <int>[1000, 10000, 100000, 1000000];

  Map<String, dynamic>? _state;
  int _selectedChip = _chips.first;
  Timer? _pollTimer;
  Timer? _countdownTimer;
  int _secondsLeft = 0;
  bool _isBetting = false;
  String? _lastSettledRoundId;
  int _lastWin = 0;

  @override
  void initState() {
    super.initState();
    _fetchState();
    _pollTimer = Timer.periodic(
      const Duration(seconds: 2),
      (_) => _fetchState(),
    );
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (_secondsLeft > 0 && mounted) {
        setState(() => _secondsLeft--);
      }
    });
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    _countdownTimer?.cancel();
    super.dispose();
  }

  Map<String, dynamic> _unwrap(dynamic body) {
    if (body is Map && body['data'] is Map) {
      return Map<String, dynamic>.from(body['data'] as Map);
    }
    return Map<String, dynamic>.from(body as Map);
  }

  Future<void> _fetchState() async {
    try {
      final res = await ApiClient.instance.get(ApiConstants.greedyState);
      if (!mounted) return;
      final state = _unwrap(res.data);

      // Detect a fresh settlement to show the win banner once
      if (state['status'] == 'SETTLED' &&
          state['roundId'] != _lastSettledRoundId) {
        _lastSettledRoundId = state['roundId'] as String?;
        final result = state['resultItem'] as String?;
        int win = 0;
        for (final bet in (state['myBets'] as List? ?? [])) {
          if (bet is Map && bet['item'] == result) {
            win += (bet['payout'] as num? ?? 0).toInt();
          }
        }
        _lastWin = win;
      }

      final endsAt = DateTime.tryParse(state['endsAt'] as String? ?? '');
      final serverTime =
          DateTime.tryParse(state['serverTime'] as String? ?? '');
      int seconds = 0;
      if (endsAt != null && serverTime != null) {
        seconds = endsAt.difference(serverTime).inSeconds;
      }

      setState(() {
        _state = state;
        if (state['status'] == 'BETTING') {
          _secondsLeft = seconds.clamp(0, 60);
        } else {
          _secondsLeft = 0;
        }
      });
    } catch (_) {
      // Keep the last known state; the next poll will retry
    }
  }

  Future<void> _placeBet(String item) async {
    if (_isBetting) return;
    if (_state?['status'] != 'BETTING' || _secondsLeft <= 0) {
      AppUtils.showErrorSnackBar(context, 'Betting is closed — next round soon');
      return;
    }

    setState(() => _isBetting = true);
    try {
      await ApiClient.instance.post(
        ApiConstants.greedyBet,
        data: {'item': item, 'amount': _selectedChip},
      );
      await _fetchState();
    } catch (e) {
      if (mounted) {
        AppUtils.showErrorSnackBar(
          context,
          e.toString().contains('Insufficient')
              ? 'Not enough coins'
              : 'Bet failed — try again',
        );
      }
    } finally {
      if (mounted) setState(() => _isBetting = false);
    }
  }

  int _myBetOn(String item) {
    int total = 0;
    for (final bet in (_state?['myBets'] as List? ?? [])) {
      if (bet is Map && bet['item'] == item) {
        total += (bet['amount'] as num? ?? 0).toInt();
      }
    }
    return total;
  }

  int _poolOn(String item) {
    for (final agg in (_state?['bets'] as List? ?? [])) {
      if (agg is Map && agg['item'] == item) {
        return (agg['total'] as num? ?? 0).toInt();
      }
    }
    return 0;
  }

  String _fmt(num n) {
    if (n >= 1000000) {
      final m = n / 1000000;
      return '${m.toStringAsFixed(m.truncateToDouble() == m ? 0 : 1)}M';
    }
    if (n >= 1000) {
      final k = n / 1000;
      return '${k.toStringAsFixed(k.truncateToDouble() == k ? 0 : 1)}K';
    }
    return n.toString();
  }

  @override
  Widget build(BuildContext context) {
    final state = _state;
    final isSettled = state?['status'] == 'SETTLED';
    final resultItem = state?['resultItem'] as String?;
    final items = (state?['items'] as List? ?? []);

    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
      decoration: const BoxDecoration(
        color: AppColors.surfaceDark,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: AppColors.dividerDark,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(height: 12),
          _buildHeader(),
          const SizedBox(height: 10),
          _buildHistoryStrip(),
          const SizedBox(height: 12),
          if (state == null)
            const Padding(
              padding: EdgeInsets.all(48),
              child: CircularProgressIndicator(color: AppColors.primary),
            )
          else ...[
            _buildStatusBar(isSettled, resultItem),
            const SizedBox(height: 12),
            _buildItemsGrid(items, isSettled, resultItem),
            const SizedBox(height: 14),
            _buildChipSelector(),
          ],
        ],
      ),
    );
  }

  Widget _buildHeader() {
    final coins = (_state?['myCoins'] as num? ?? 0).toInt();
    return Row(
      children: [
        const Text('🎰', style: TextStyle(fontSize: 22)),
        const SizedBox(width: 8),
        const Text(
          'Greedy',
          style: TextStyle(
            color: Colors.white,
            fontSize: 18,
            fontWeight: FontWeight.bold,
            fontFamily: 'Poppins',
          ),
        ),
        const Spacer(),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: AppColors.cardDark,
            borderRadius: BorderRadius.circular(16),
          ),
          child: Row(
            children: [
              const Text('🪙', style: TextStyle(fontSize: 14)),
              const SizedBox(width: 6),
              Text(
                _fmt(coins),
                style: const TextStyle(
                  color: Colors.amber,
                  fontWeight: FontWeight.w600,
                  fontFamily: 'Poppins',
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildHistoryStrip() {
    final results = (_state?['lastResults'] as List? ?? []);
    if (results.isEmpty) return const SizedBox.shrink();
    return SizedBox(
      height: 28,
      child: Row(
        children: [
          const Text(
            'Last:',
            style: TextStyle(
              color: AppColors.textTertiary,
              fontSize: 12,
              fontFamily: 'Poppins',
            ),
          ),
          const SizedBox(width: 6),
          Expanded(
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: results.length,
              separatorBuilder: (_, __) => const SizedBox(width: 4),
              itemBuilder: (_, i) {
                final item = (results[i] as Map)['item'] as String?;
                return Container(
                  width: 28,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: AppColors.cardDark,
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    _itemEmojis[item] ?? '❔',
                    style: const TextStyle(fontSize: 14),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusBar(bool isSettled, String? resultItem) {
    if (isSettled) {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(
          color: _lastWin > 0
              ? Colors.green.withOpacity(0.15)
              : AppColors.cardDark,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          children: [
            Text(
              'Result: ${_itemEmojis[resultItem] ?? ''} ${resultItem ?? ''}',
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
                fontSize: 16,
                fontFamily: 'Poppins',
              ),
              textAlign: TextAlign.center,
            ),
            if (_lastWin > 0)
              Text(
                'You won ${_fmt(_lastWin)} coins! 🎉',
                style: const TextStyle(
                  color: Colors.greenAccent,
                  fontWeight: FontWeight.w600,
                  fontSize: 14,
                  fontFamily: 'Poppins',
                ),
                textAlign: TextAlign.center,
              ),
          ],
        ),
      );
    }

    final urgent = _secondsLeft <= 5;
    return Row(
      children: [
        Expanded(
          child: ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: (_secondsLeft / 22).clamp(0.0, 1.0),
              minHeight: 8,
              backgroundColor: AppColors.cardDark,
              valueColor: AlwaysStoppedAnimation(
                urgent ? AppColors.error : AppColors.primary,
              ),
            ),
          ),
        ),
        const SizedBox(width: 10),
        Text(
          '${_secondsLeft}s',
          style: TextStyle(
            color: urgent ? AppColors.error : Colors.white,
            fontWeight: FontWeight.bold,
            fontFamily: 'Poppins',
          ),
        ),
      ],
    );
  }

  Widget _buildItemsGrid(
    List<dynamic> items,
    bool isSettled,
    String? resultItem,
  ) {
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 4,
        mainAxisSpacing: 8,
        crossAxisSpacing: 8,
        childAspectRatio: 0.72,
      ),
      itemCount: items.length,
      itemBuilder: (_, i) {
        final item = items[i] as Map;
        final key = item['key'] as String;
        final multiplier = (item['multiplier'] as num).toInt();
        final myBet = _myBetOn(key);
        final pool = _poolOn(key);
        final isWinner = isSettled && key == resultItem;
        final dimmed = isSettled && !isWinner;

        return GestureDetector(
          onTap: isSettled ? null : () => _placeBet(key),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 250),
            decoration: BoxDecoration(
              color: isWinner
                  ? Colors.amber.withOpacity(0.25)
                  : myBet > 0
                      ? AppColors.primary.withOpacity(0.18)
                      : AppColors.cardDark,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: isWinner
                    ? Colors.amber
                    : myBet > 0
                        ? AppColors.primary
                        : AppColors.dividerDark,
                width: isWinner ? 2 : 1,
              ),
            ),
            child: Opacity(
              opacity: dimmed ? 0.35 : 1,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    _itemEmojis[key] ?? '❔',
                    style: const TextStyle(fontSize: 26),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'x$multiplier',
                    style: TextStyle(
                      color: multiplier >= 25
                          ? Colors.amber
                          : multiplier >= 10
                              ? AppColors.primaryLight
                              : Colors.white70,
                      fontWeight: FontWeight.bold,
                      fontSize: 13,
                      fontFamily: 'Poppins',
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    pool > 0 ? _fmt(pool) : '—',
                    style: const TextStyle(
                      color: AppColors.textTertiary,
                      fontSize: 10,
                      fontFamily: 'Poppins',
                    ),
                  ),
                  if (myBet > 0)
                    Text(
                      'My: ${_fmt(myBet)}',
                      style: const TextStyle(
                        color: AppColors.primaryLight,
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                        fontFamily: 'Poppins',
                      ),
                    ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildChipSelector() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
      children: _chips.map((chip) {
        final selected = chip == _selectedChip;
        return GestureDetector(
          onTap: () => setState(() => _selectedChip = chip),
          child: Container(
            padding:
                const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
            decoration: BoxDecoration(
              color: selected ? AppColors.primary : AppColors.cardDark,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: selected ? AppColors.primaryLight : AppColors.dividerDark,
              ),
            ),
            child: Text(
              _fmt(chip),
              style: TextStyle(
                color: selected ? Colors.white : Colors.white70,
                fontWeight: FontWeight.bold,
                fontFamily: 'Poppins',
              ),
            ),
          ),
        );
      }).toList(),
    );
  }
}
