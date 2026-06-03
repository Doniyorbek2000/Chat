// Google Play Billing Service
// Requires: in_app_purchase: ^3.1.13 in pubspec.yaml dependencies
// Add to pubspec.yaml:
//   in_app_purchase: ^3.1.13
//   in_app_purchase_android: ^0.3.5+6

import 'dart:async';
import 'package:flutter/foundation.dart';
// ignore: depend_on_referenced_packages
import 'package:in_app_purchase/in_app_purchase.dart';
import '../network/api_client.dart';

/// Defines a purchasable product in VOXO
class BillingProduct {
  final String type; // 'vip', 'coins', 'diamonds'
  final int level;
  final int durationMonths;
  final int coins;
  final int diamonds;

  const BillingProduct({
    required this.type,
    this.level = 0,
    required this.durationMonths,
    this.coins = 0,
    this.diamonds = 0,
  });
}

/// Result of a billing operation
enum BillingResultStatus {
  success,
  error,
  cancelled,
  pending,
  alreadyOwned,
}

class BillingResult {
  final BillingResultStatus status;
  final String? message;
  final PurchaseDetails? purchase;

  const BillingResult({
    required this.status,
    this.message,
    this.purchase,
  });
}

/// Main billing service managing IAP lifecycle
class BillingService {
  BillingService._();

  static final BillingService instance = BillingService._();

  final InAppPurchase _iap = InAppPurchase.instance;
  StreamSubscription<List<PurchaseDetails>>? _purchaseSubscription;

  bool _isAvailable = false;
  bool _isInitialized = false;

  // Pending purchase queue — accumulates purchases awaiting verification
  final List<PurchaseDetails> _pendingPurchases = [];

  // Broadcast stream controller for purchase updates
  final StreamController<List<PurchaseDetails>> _purchaseStreamController =
      StreamController<List<PurchaseDetails>>.broadcast();

  /// Stream of purchase updates consumers can listen to
  Stream<List<PurchaseDetails>> get purchaseStream =>
      _purchaseStreamController.stream;

  /// All available product definitions
  static const Map<String, BillingProduct> products = {
    'voxo_vip_1_month': BillingProduct(
      type: 'vip',
      level: 1,
      durationMonths: 1,
      coins: 0,
    ),
    'voxo_vip_3_month': BillingProduct(
      type: 'vip',
      level: 1,
      durationMonths: 3,
      coins: 0,
    ),
    'voxo_vip_12_month': BillingProduct(
      type: 'vip',
      level: 1,
      durationMonths: 12,
      coins: 0,
    ),
    'voxo_coins_small': BillingProduct(
      type: 'coins',
      coins: 100,
      durationMonths: 0,
    ),
    'voxo_coins_medium': BillingProduct(
      type: 'coins',
      coins: 500,
      durationMonths: 0,
    ),
    'voxo_coins_large': BillingProduct(
      type: 'coins',
      coins: 1000,
      durationMonths: 0,
    ),
    'voxo_diamonds_small': BillingProduct(
      type: 'diamonds',
      diamonds: 50,
      durationMonths: 0,
    ),
    'voxo_diamonds_medium': BillingProduct(
      type: 'diamonds',
      diamonds: 200,
      durationMonths: 0,
    ),
    'voxo_diamonds_large': BillingProduct(
      type: 'diamonds',
      diamonds: 500,
      durationMonths: 0,
    ),
  };

  /// Initialize the billing service and start listening to purchase updates.
  /// Returns true if Google Play Billing is available on this device.
  Future<bool> initialize() async {
    if (_isInitialized) return _isAvailable;

    try {
      _isAvailable = await _iap.isAvailable();
      if (!_isAvailable) {
        debugPrint('[BillingService] In-app purchases not available.');
        _isInitialized = true;
        return false;
      }

      // Listen to purchase updates
      _purchaseSubscription =
          _iap.purchaseStream.listen(_onPurchaseUpdate, onError: (Object err) {
        debugPrint('[BillingService] Purchase stream error: $err');
        _purchaseStreamController.addError(err);
      });

      _isInitialized = true;
      debugPrint('[BillingService] Initialized successfully.');
      return true;
    } catch (e) {
      debugPrint('[BillingService] Initialization error: $e');
      _isInitialized = true;
      return false;
    }
  }

  /// Fetch product details for given product IDs from the store.
  Future<List<ProductDetails>> getProducts(List<String> ids) async {
    if (!_isAvailable) return [];
    try {
      final response =
          await _iap.queryProductDetails(ids.toSet());
      if (response.error != null) {
        debugPrint(
            '[BillingService] Product query error: ${response.error!.message}');
      }
      if (response.notFoundIDs.isNotEmpty) {
        debugPrint(
            '[BillingService] Products not found: ${response.notFoundIDs}');
      }
      return response.productDetails;
    } catch (e) {
      debugPrint('[BillingService] getProducts error: $e');
      return [];
    }
  }

  /// Initiate a purchase flow for a given product ID.
  /// Returns true if the purchase flow was successfully launched.
  Future<bool> buyProduct(String productId) async {
    if (!_isAvailable) {
      debugPrint('[BillingService] Billing not available.');
      return false;
    }

    try {
      final details = await getProducts([productId]);
      if (details.isEmpty) {
        debugPrint('[BillingService] Product $productId not found.');
        return false;
      }

      final productDetail = details.first;
      final product = products[productId];
      if (product == null) {
        debugPrint('[BillingService] Unknown product ID: $productId');
        return false;
      }

      late PurchaseParam purchaseParam;

      if (product.type == 'vip') {
        // Subscription purchase
        purchaseParam = PurchaseParam(productDetails: productDetail);
        return await _iap.buyNonConsumable(purchaseParam: purchaseParam);
      } else {
        // Consumable purchase (coins / diamonds)
        purchaseParam = PurchaseParam(productDetails: productDetail);
        return await _iap.buyConsumable(purchaseParam: purchaseParam);
      }
    } on IAPError catch (e) {
      debugPrint(
          '[BillingService] IAP Error buying $productId: ${e.message}');
      return false;
    } catch (e) {
      debugPrint('[BillingService] Error buying $productId: $e');
      return false;
    }
  }

  /// Verify a purchase with the VOXO backend.
  /// Calls POST /payments/google-play/verify with purchase token.
  /// Returns true if verification succeeded and the purchase was delivered.
  Future<bool> verifyPurchase(PurchaseDetails purchase) async {
    try {
      final api = ApiClient.instance;
      final response = await api.post('/payments/google-play/verify', data: {
        'productId': purchase.productID,
        'purchaseToken': purchase.verificationData.serverVerificationData,
        'orderId': purchase.purchaseID,
        'source': purchase.verificationData.source,
      });

      final data = response.data['data'] ?? response.data;
      final verified = data['verified'] as bool? ?? false;

      if (verified) {
        debugPrint(
            '[BillingService] Purchase verified: ${purchase.productID}');
        // Complete the purchase on the platform side
        if (purchase.pendingCompletePurchase) {
          await _iap.completePurchase(purchase);
        }
        return true;
      } else {
        debugPrint(
            '[BillingService] Backend rejected purchase: ${purchase.productID}');
        return false;
      }
    } catch (e) {
      debugPrint('[BillingService] Verification error: $e');
      return false;
    }
  }

  /// Restore previously purchased non-consumable products (VIP subscriptions).
  Future<void> restorePurchases() async {
    if (!_isAvailable) return;
    try {
      await _iap.restorePurchases();
      debugPrint('[BillingService] Restore purchases triggered.');
    } catch (e) {
      debugPrint('[BillingService] Restore error: $e');
    }
  }

  /// Internal purchase update handler
  Future<void> _onPurchaseUpdate(
      List<PurchaseDetails> purchaseDetailsList) async {
    // Forward to external stream
    _purchaseStreamController.add(purchaseDetailsList);

    for (final purchase in purchaseDetailsList) {
      switch (purchase.status) {
        case PurchaseStatus.pending:
          debugPrint(
              '[BillingService] Purchase pending: ${purchase.productID}');
          _pendingPurchases.add(purchase);
          break;

        case PurchaseStatus.purchased:
          debugPrint(
              '[BillingService] Purchase received: ${purchase.productID}');
          _pendingPurchases
              .removeWhere((p) => p.productID == purchase.productID);
          final verified = await verifyPurchase(purchase);
          if (!verified) {
            debugPrint(
                '[BillingService] Verification failed for: ${purchase.productID}');
          }
          break;

        case PurchaseStatus.restored:
          debugPrint(
              '[BillingService] Purchase restored: ${purchase.productID}');
          _pendingPurchases
              .removeWhere((p) => p.productID == purchase.productID);
          await verifyPurchase(purchase);
          break;

        case PurchaseStatus.error:
          final errorMsg = purchase.error?.message ?? 'Unknown error';
          debugPrint(
              '[BillingService] Purchase error for ${purchase.productID}: $errorMsg');
          _pendingPurchases
              .removeWhere((p) => p.productID == purchase.productID);
          if (purchase.pendingCompletePurchase) {
            await _iap.completePurchase(purchase);
          }
          break;

        case PurchaseStatus.canceled:
          debugPrint(
              '[BillingService] Purchase canceled: ${purchase.productID}');
          _pendingPurchases
              .removeWhere((p) => p.productID == purchase.productID);
          if (purchase.pendingCompletePurchase) {
            await _iap.completePurchase(purchase);
          }
          break;
      }
    }
  }

  /// Returns any purchases that are currently in a pending state
  List<PurchaseDetails> get pendingPurchases =>
      List.unmodifiable(_pendingPurchases);

  /// Returns whether billing is available on this device
  bool get isAvailable => _isAvailable;

  /// Dispose resources and cancel subscriptions
  void dispose() {
    _purchaseSubscription?.cancel();
    _purchaseStreamController.close();
    _isInitialized = false;
    debugPrint('[BillingService] Disposed.');
  }
}
