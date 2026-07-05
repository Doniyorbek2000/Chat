import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:lottie/lottie.dart';
import 'package:svgaplayer_flutter/svgaplayer_flutter.dart';
import '../../core/models/gift_model.dart';

/// Full-screen gift animation player.
///
/// Plays one gift at a time from the queue: `.svga` files through the SVGA
/// player (the live-streaming industry standard for rich gift effects),
/// `.json` through Lottie, anything else as a scaling image burst.
/// Calls [onCompleted] with the gift event id when playback finishes so the
/// owner can remove it from the queue.
class GiftAnimationOverlay extends StatefulWidget {
  final List<GiftEventModel> gifts;
  final void Function(String giftEventId) onCompleted;

  const GiftAnimationOverlay({
    super.key,
    required this.gifts,
    required this.onCompleted,
  });

  @override
  State<GiftAnimationOverlay> createState() => _GiftAnimationOverlayState();
}

class _GiftAnimationOverlayState extends State<GiftAnimationOverlay>
    with SingleTickerProviderStateMixin {
  SVGAAnimationController? _svgaController;
  String? _playingId;
  Timer? _safetyTimer;

  @override
  void initState() {
    super.initState();
    _svgaController = SVGAAnimationController(vsync: this);
    _maybePlayNext();
  }

  @override
  void didUpdateWidget(covariant GiftAnimationOverlay oldWidget) {
    super.didUpdateWidget(oldWidget);
    _maybePlayNext();
  }

  @override
  void dispose() {
    _safetyTimer?.cancel();
    _svgaController?.dispose();
    super.dispose();
  }

  GiftEventModel? get _current {
    if (_playingId == null) return null;
    for (final gift in widget.gifts) {
      if (gift.id == _playingId) return gift;
    }
    return null;
  }

  GiftEventModel? _nextAnimated() {
    for (final gift in widget.gifts) {
      if (gift.gift.hasAnimation) return gift;
    }
    return null;
  }

  void _maybePlayNext() {
    if (_playingId != null) return;
    final next = _nextAnimated();
    if (next == null) return;

    _playingId = next.id;
    final url = next.gift.animationUrl!;

    // A stuck download or bad file must never block the queue
    _safetyTimer?.cancel();
    _safetyTimer = Timer(const Duration(seconds: 8), _finish);

    if (url.toLowerCase().endsWith('.svga')) {
      _playSvga(url);
    } else {
      // Lottie/image variants complete via their own callbacks below;
      // trigger a rebuild so the widget tree picks up _playingId.
      setState(() {});
    }
  }

  Future<void> _playSvga(String url) async {
    setState(() {});
    try {
      final videoItem = await SVGAParser.shared.decodeFromURL(url);
      if (!mounted || _playingId == null) return;
      _svgaController!.videoItem = videoItem;
      await _svgaController!.forward();
      _svgaController!.videoItem = null;
    } catch (_) {
      // fall through to finish — never let a bad file freeze the overlay
    }
    _finish();
  }

  void _finish() {
    _safetyTimer?.cancel();
    final finishedId = _playingId;
    _playingId = null;
    if (finishedId != null) {
      widget.onCompleted(finishedId);
    }
    if (mounted) {
      setState(() {});
      // Play the next queued animation on the next frame
      WidgetsBinding.instance.addPostFrameCallback((_) => _maybePlayNext());
    }
  }

  @override
  Widget build(BuildContext context) {
    final current = _current;
    if (current == null) return const SizedBox.shrink();

    final url = current.gift.animationUrl!;
    final lower = url.toLowerCase();

    Widget player;
    if (lower.endsWith('.svga')) {
      player = SVGAImage(_svgaController!, fit: BoxFit.contain);
    } else if (lower.endsWith('.json')) {
      player = Lottie.network(
        url,
        fit: BoxFit.contain,
        repeat: false,
        onLoaded: (composition) {
          Future.delayed(composition.duration, _finish);
        },
        errorBuilder: (_, __, ___) {
          WidgetsBinding.instance.addPostFrameCallback((_) => _finish());
          return const SizedBox.shrink();
        },
      );
    } else {
      // Static image burst fallback
      player = Center(
        child: Image.network(
          url,
          width: 220,
          errorBuilder: (_, __, ___) => const SizedBox.shrink(),
        )
            .animate(onComplete: (_) => _finish())
            .scale(
              begin: const Offset(0.3, 0.3),
              end: const Offset(1.4, 1.4),
              duration: 1200.ms,
              curve: Curves.easeOutBack,
            )
            .then()
            .fadeOut(duration: 600.ms),
      );
    }

    return IgnorePointer(
      child: Stack(
        fit: StackFit.expand,
        children: [
          Center(child: player),
          // Sender banner at the bottom of the animation
          Positioned(
            bottom: 260,
            left: 0,
            right: 0,
            child: Center(
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                decoration: BoxDecoration(
                  color: Colors.black54,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  '${current.senderName} sent ${current.gift.name}'
                  '${current.count > 1 ? ' x${current.count}' : ''}',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    fontFamily: 'Poppins',
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
