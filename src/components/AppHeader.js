import { useState } from 'react';
import * as RN from 'react-native';
import { useScreenMetrics } from './ScreenLayout';
import AppMenuModal from './AppMenuModal';
import { colors } from '../theme/colors';

const { StyleSheet, Text, View, Pressable } = RN;
const Image = RN.Image || View;

let ipRiskLogo = null;
try {
  ipRiskLogo = require('../../assets/ip-risk-logo.png');
} catch {
  ipRiskLogo = null;
}

/** Cabeçalho institucional "IP RISK" (Protótipo 2). `onMenuPress` ou `showMenu` exibe o ícone de menu à direita.
 * @param {{ onMenuPress?: () => void, showMenu?: boolean, onPressTcle?: () => void }} props */
export default function AppHeader({ onMenuPress, showMenu = false, onPressTcle } = {}) {
  const { scale = 1, textScale = 1, insets } = useScreenMetrics();
  const [menuOpen, setMenuOpen] = useState(false);
  const handleMenuPress = onMenuPress || (showMenu ? () => setMenuOpen(true) : undefined);

  return (
    <>
      <View style={[local.bar, {
        paddingTop: Math.max(12 * scale, (insets?.top || 0) + 8 * scale),
        paddingBottom: 12 * scale,
        paddingHorizontal: 20 * scale,
      }]}>
        <View style={local.logoRow} accessible accessibilityRole="header" accessibilityLabel="IP RISK">
          {ipRiskLogo ? (
            <Image
              source={ipRiskLogo}
              style={{ width: 110 * scale, height: 36 * scale }}
              resizeMode="contain"
              accessible={false}
            />
          ) : (
            <Text style={[local.logoIp, { fontSize: 15 * textScale }]}>IP RISK</Text>
          )}
        </View>
        {handleMenuPress && (
          <Pressable accessibilityRole="button" accessibilityLabel="Abrir menu" onPress={handleMenuPress} style={local.menuButton}>
            <View accessible={false} aria-hidden style={local.menuIcon}>
              <View style={local.menuLine} />
              <View style={local.menuLine} />
              <View style={local.menuLine} />
            </View>
          </Pressable>
        )}
      </View>
      {showMenu && !onMenuPress && (
        <AppMenuModal visible={menuOpen} onClose={() => setMenuOpen(false)} onPressTcle={onPressTcle} />
      )}
    </>
  );
}

const local = StyleSheet.create({
  bar: { width: '100%', backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logoRow: { flexDirection: 'row', alignItems: 'center' },
  logoIp: { color: '#2E533A', fontWeight: 'bold', letterSpacing: 0.5 },
  menuButton: { minWidth: 44, minHeight: 44, alignItems: 'flex-end', justifyContent: 'center' },
  menuIcon: { width: 20, gap: 4 },
  menuLine: { width: '100%', height: 2, borderRadius: 1, backgroundColor: '#2E533A' },
});
