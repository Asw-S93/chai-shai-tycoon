import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IapProductId, UpgradeCategory } from '../../domain/value-objects';
import { UPGRADE_VISUAL_MANIFEST } from '../../infrastructure/assets';
import { useGameStore } from '../state/useGameStore';
import { COLORS, MIN_TOUCH_TARGET_DP, RADIUS, SPACING } from '../theme';

type ShopTabKey = UpgradeCategory | 'all' | 'coins';

const TABS: { key: ShopTabKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'equipment', label: 'Equipment' },
  { key: 'staff', label: 'Staff' },
  { key: 'decor', label: 'Decor' },
  { key: 'coins', label: 'Coins (IAP)' },
];

const IAP_GLYPHS: Record<IapProductId, string> = {
  cs_coins_pouch: '💰',
  cs_coins_pot: '🏺',
  cs_coins_chest: '👑',
  cs_bundle_starter: '⭐',
};

export const UpgradeShopScreen: React.FC = () => {
  const router = useRouter();
  const snapshot = useGameStore((s) => s.snapshot);
  const buyUpgrade = useGameStore((s) => s.buyUpgrade);
  const buyIapProduct = useGameStore((s) => s.buyIapProduct);
  const restoreIapPurchases = useGameStore((s) => s.restoreIapPurchases);
  const [selectedTab, setSelectedTab] = useState<ShopTabKey>('all');

  const filteredUpgrades = snapshot.upgrades.filter(
    (u) => selectedTab === 'all' || u.category === selectedTab
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Bar */}
      <View style={styles.header}>
        <Pressable
          testID="shop-back-btn"
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          style={styles.backBtn}
        >
          <Text style={styles.backBtnText}>← Back</Text>
        </Pressable>

        <Text style={styles.headerTitle}>Tapri Upgrade Bazaar</Text>

        <View style={styles.coinBadge}>
          <Text testID="shop-coins-text" style={styles.coinBadgeText}>
            🪙 {snapshot.coins}
          </Text>
        </View>
      </View>

      {/* Category Filter Tabs */}
      <View style={styles.tabsRow}>
        {TABS.map((t) => {
          const active = selectedTab === t.key;
          return (
            <Pressable
              key={t.key}
              testID={`shop-tab-${t.key}`}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => setSelectedTab(t.key)}
              style={[styles.tabButton, active && styles.tabButtonActive]}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {selectedTab === 'coins' ? (
          <>
            {snapshot.iapCatalog.map((product) => {
              const isOwned =
                product.type === 'non_consumable' &&
                snapshot.ownedEntitlements.includes(product.id);
              const glyph = product.glyph ?? IAP_GLYPHS[product.id] ?? '🪙';

              return (
                <View key={product.id} style={styles.upgradeCard}>
                  <View style={styles.propIconFrame}>
                    <Text style={{ fontSize: 30 }}>{glyph}</Text>
                  </View>

                  <View style={styles.cardInfo}>
                    <View style={styles.titleRow}>
                      <Text style={styles.upgradeName} numberOfLines={1}>
                        {product.title}
                      </Text>
                      <Text style={styles.levelBadge}>
                        +{product.coinsReward} Coins
                      </Text>
                    </View>
                    <Text style={styles.upgradeDesc}>{product.description}</Text>
                  </View>

                  <Pressable
                    testID={`buy-iap-${product.id}`}
                    accessibilityRole="button"
                    accessibilityState={{
                      disabled: isOwned || snapshot.isIapPurchasing,
                    }}
                    accessibilityLabel={
                      isOwned
                        ? `${product.title} already owned`
                        : `Buy ${product.title} for ${product.priceFormatted}`
                    }
                    onPress={() => buyIapProduct(product.id)}
                    style={[
                      styles.buyButton,
                      isOwned && styles.buyButtonMaxed,
                      snapshot.isIapPurchasing && styles.buyButtonDisabled,
                    ]}
                  >
                    {isOwned ? (
                      <Text style={styles.buyButtonText}>OWNED ✓</Text>
                    ) : snapshot.isIapPurchasing ? (
                      <ActivityIndicator size="small" color={COLORS.cream} />
                    ) : (
                      <>
                        <Text style={styles.buyButtonText}>BUY</Text>
                        <Text style={styles.buyCostText}>{product.priceFormatted}</Text>
                      </>
                    )}
                  </Pressable>
                </View>
              );
            })}

            <Pressable
              testID="iap-restore-btn"
              accessibilityRole="button"
              accessibilityLabel="Restore Purchases"
              disabled={snapshot.isIapPurchasing}
              onPress={() => restoreIapPurchases()}
              style={styles.restoreButton}
            >
              <Text style={styles.restoreButtonText}>🔄 Restore Purchases</Text>
            </Pressable>
          </>
        ) : (
          filteredUpgrades.map((upg) => {
            const propIcon = UPGRADE_VISUAL_MANIFEST[upg.id];
            return (
              <View key={upg.id} style={styles.upgradeCard}>
                {/* Illustrated Upgrade Prop / Staff Sprite */}
                <View style={styles.propIconFrame}>
                  <Image
                    source={propIcon}
                    style={styles.propIconImage}
                    resizeMode="contain"
                  />
                </View>

                <View style={styles.cardInfo}>
                  <View style={styles.titleRow}>
                    <Text style={styles.upgradeName} numberOfLines={1}>
                      {upg.name}
                    </Text>
                    <Text style={styles.levelBadge}>
                      Lv. {upg.currentLevel}/{upg.maxLevel}
                    </Text>
                  </View>
                  <Text style={styles.upgradeDesc}>{upg.description}</Text>

                  {/* Level Progress Dots */}
                  <View style={styles.dotsRow}>
                    {Array.from({ length: upg.maxLevel }).map((_, i) => (
                      <View
                        key={i}
                        style={[
                          styles.levelDot,
                          i < upg.currentLevel && styles.levelDotFilled,
                        ]}
                      />
                    ))}
                  </View>
                </View>

                <Pressable
                  testID={`buy-upgrade-${upg.id}`}
                  accessibilityRole="button"
                  accessibilityState={{
                    disabled: upg.isMaxed || !upg.canAfford,
                  }}
                  accessibilityLabel={
                    upg.isMaxed
                      ? `${upg.name} max level reached`
                      : `Buy ${upg.name} for ${upg.nextCost} coins`
                  }
                  onPress={() => buyUpgrade(upg.id)}
                  style={[
                    styles.buyButton,
                    upg.isMaxed && styles.buyButtonMaxed,
                    !upg.isMaxed && !upg.canAfford && styles.buyButtonDisabled,
                  ]}
                >
                  {upg.isMaxed ? (
                    <Text style={styles.buyButtonText}>MAXED ✓</Text>
                  ) : (
                    <>
                      <Text style={styles.buyButtonText}>Upgrade</Text>
                      <Text style={styles.buyCostText}>🪙 {upg.nextCost}</Text>
                    </>
                  )}
                </Pressable>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.cream,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.teaBrown,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  backBtn: {
    minHeight: MIN_TOUCH_TARGET_DP,
    paddingHorizontal: SPACING.sm,
    justifyContent: 'center',
  },
  backBtnText: {
    color: COLORS.saffronLight,
    fontWeight: '800',
    fontSize: 15,
  },
  headerTitle: {
    color: COLORS.cream,
    fontWeight: '900',
    fontSize: 18,
  },
  coinBadge: {
    backgroundColor: COLORS.teaBrownMid,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
  },
  coinBadgeText: {
    color: COLORS.gold,
    fontWeight: '900',
    fontSize: 14,
  },
  tabsRow: {
    flexDirection: 'row',
    padding: SPACING.sm,
    backgroundColor: COLORS.creamWarm,
    gap: SPACING.xs,
  },
  tabButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.milkWhite,
    borderWidth: 1,
    borderColor: COLORS.teaBrownLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonActive: {
    backgroundColor: COLORS.terracotta,
    borderColor: COLORS.teaBrown,
  },
  tabText: {
    color: COLORS.teaBrown,
    fontWeight: '800',
    fontSize: 12,
  },
  tabTextActive: {
    color: COLORS.cream,
  },
  listContent: {
    padding: SPACING.md,
    gap: SPACING.md,
  },
  upgradeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.milkWhite,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.teaBrownMid,
    padding: SPACING.sm,
    gap: SPACING.sm,
  },
  propIconFrame: {
    width: 60,
    height: 60,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.creamWarm,
    borderWidth: 1.5,
    borderColor: COLORS.saffron,
    alignItems: 'center',
    justifyContent: 'center',
  },
  propIconImage: {
    width: 50,
    height: 50,
  },
  cardInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
    gap: 4,
  },
  upgradeName: {
    color: COLORS.teaBrown,
    fontWeight: '900',
    fontSize: 14,
    flex: 1,
  },
  levelBadge: {
    color: COLORS.cardamomDark,
    fontWeight: '800',
    fontSize: 11,
  },
  upgradeDesc: {
    color: COLORS.mutedText,
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 6,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  levelDot: {
    width: 14,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E0D0C0',
  },
  levelDotFilled: {
    backgroundColor: COLORS.saffron,
  },
  buyButton: {
    minWidth: 88,
    minHeight: Math.max(MIN_TOUCH_TARGET_DP, 54),
    backgroundColor: COLORS.cardamom,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.sm,
  },
  buyButtonDisabled: {
    backgroundColor: '#B5A89E',
  },
  buyButtonMaxed: {
    backgroundColor: COLORS.saffronDark,
  },
  buyButtonText: {
    color: COLORS.cream,
    fontWeight: '900',
    fontSize: 13,
  },
  buyCostText: {
    color: COLORS.gold,
    fontWeight: '900',
    fontSize: 13,
    marginTop: 2,
  },
  restoreButton: {
    minHeight: MIN_TOUCH_TARGET_DP,
    backgroundColor: COLORS.creamWarm,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.teaBrownLight,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    marginTop: SPACING.md,
    marginBottom: SPACING.xl,
  },
  restoreButtonText: {
    color: COLORS.teaBrown,
    fontWeight: '800',
    fontSize: 14,
  },
});
