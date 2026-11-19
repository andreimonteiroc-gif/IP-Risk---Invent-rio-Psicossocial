import { useState } from 'react';
import * as RN from 'react-native';
import { router } from 'expo-router';
import { useScreenMetrics } from './ScreenLayout';
import { colors } from '../theme/colors';
import { TCLE_SECTIONS, TCLE_TITLE } from '../constants/tcleContent';
import { openOrDownloadTcle } from '../utils/tclePdf';

const { Pressable, StyleSheet, Text, View } = RN;
const Modal = RN.Modal || View;
const Image = RN.Image || View;
const ScrollView = RN.ScrollView || View;

let cesmacLogo = null;
let ipRiskLogo = null;
try {
  cesmacLogo = require('../../assets/cesmac-citec.png');
} catch {
  cesmacLogo = null;
}
try {
  ipRiskLogo = require('../../assets/ip-risk-logo.png');
} catch {
  ipRiskLogo = null;
}

/** Ícones vetoriais simples com Views nativas (sem dependência externa de fontes).
 * @param {{ kind: 'info' | 'tag' | 'doc' | 'download', scale: number }} props */
function MenuIcon({ kind, scale }) {
  if (kind === 'info') {
    return (
      <View accessible={false} aria-hidden style={[icons.box, { width: 20 * scale, height: 20 * scale }]}>
        <View style={[icons.infoCircle, { width: 18 * scale, height: 18 * scale, borderRadius: 9 * scale }]}>
          <Text style={[icons.infoLetter, { fontSize: 11 * scale, lineHeight: 13 * scale }]}>i</Text>
        </View>
      </View>
    );
  }
  if (kind === 'tag') {
    return (
      <View accessible={false} aria-hidden style={[icons.box, { width: 20 * scale, height: 20 * scale }]}>
        <View style={[icons.tagBody, { width: 15 * scale, height: 11 * scale, borderRadius: 2 * scale }]}>
          <View style={[icons.tagDot, { width: 3 * scale, height: 3 * scale, borderRadius: 1.5 * scale }]} />
        </View>
      </View>
    );
  }
  if (kind === 'doc') {
    return (
      <View accessible={false} aria-hidden style={[icons.box, { width: 20 * scale, height: 20 * scale }]}>
        <View style={[icons.docBody, { width: 14 * scale, height: 18 * scale, borderRadius: 2 * scale }]}>
          <View style={[icons.docLine, { width: 8 * scale }]} />
          <View style={[icons.docLine, { width: 8 * scale }]} />
          <View style={[icons.docLine, { width: 6 * scale }]} />
        </View>
      </View>
    );
  }
  return (
    <View accessible={false} aria-hidden style={[icons.box, { width: 20 * scale, height: 20 * scale }]}>
      <View style={[icons.dlShaft, { height: 9 * scale }]} />
      <View style={[icons.dlHead, { width: 7 * scale, height: 7 * scale }]} />
      <View style={[icons.dlTray, { width: 14 * scale, height: 5 * scale }]} />
    </View>
  );
}

/** Bottom Sheet de Menu Principal e Créditos ("Sobre o Aplicativo"), conforme Protótipo 2.
 * @param {{ visible: boolean, onClose?: () => void, onPressTcle?: () => Promise<{ status?: string } | void> | void }} props */
export default function AppMenuModal({ visible, onClose, onPressTcle }) {
  const { scale = 1, textScale = 1, insets } = useScreenMetrics();
  const [view, setView] = useState('menu');

  if (!visible) return null;

  const closeModal = () => {
    setView('menu');
    onClose?.();
  };

  const handleBackPress = () => {
    if (view === 'about' || view === 'tcle') {
      setView('menu');
      return;
    }
    closeModal();
  };

  const handleReviewPress = () => {
    closeModal();
    router.navigate('/review');
  };

  const handleTclePress = async () => {
    const action = onPressTcle || openOrDownloadTcle;
    try {
      const result = await action();
      if (result && result.status === 'fallback') {
        setView('tcle');
        return;
      }
    } catch {
      setView('tcle');
      return;
    }
    closeModal();
  };

  const isAbout = view === 'about';
  const isTcle = view === 'tcle';
  const bottomPadding = Math.max(24 * scale, (insets?.bottom || 0) + 16 * scale);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={handleBackPress}
    >
      <View style={local.overlay}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fechar menu"
          onPress={closeModal}
          style={local.backdrop}
        />
        <View
          style={[
            local.sheet,
            {
              borderTopLeftRadius: 24 * scale,
              borderTopRightRadius: 24 * scale,
              paddingBottom: bottomPadding,
            },
          ]}
        >
          {/* Alça superior centralizada */}
          <View
            accessible={false}
            aria-hidden
            style={[
              local.handle,
              {
                width: 48 * scale,
                height: 3 * scale,
                borderRadius: 2 * scale,
                marginTop: 12 * scale,
                marginBottom: 4 * scale,
              },
            ]}
          />

          {/* Barra interna: seta à esquerda, título à direita e divisória */}
          <View style={[local.topBar, { paddingHorizontal: 20 * scale, paddingVertical: 8 * scale }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={isAbout || isTcle ? 'Voltar para o menu' : 'Fechar menu'}
              onPress={handleBackPress}
              style={local.backButton}
            >
              <Text style={[local.backArrow, { fontSize: 20 * textScale }]}>←</Text>
            </Pressable>
            <Text
              accessibilityRole="header"
              style={[local.headerTitle, { fontSize: 15 * textScale, lineHeight: 20 * textScale }]}
            >
              {isAbout ? 'Sobre o Aplicativo' : isTcle ? 'LGPD | TCLE' : 'Menu'}
            </Text>
          </View>

          {view === 'menu' ? (
            <View style={[local.content, { paddingHorizontal: 24 * scale, paddingTop: 18 * scale }]}>
              <Text style={[local.sectionTitle, { fontSize: 14 * textScale, lineHeight: 20 * textScale }]}>
                Questionário
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Revisar Respostas"
                onPress={handleReviewPress}
                style={[local.row, { paddingVertical: 12 * scale }]}
              >
                <Text style={[local.rowText, { fontSize: 14 * textScale, lineHeight: 20 * textScale }]}>
                  Revisar Respostas
                </Text>
                <Text accessible={false} aria-hidden style={[local.chevron, { fontSize: 22 * textScale }]}>
                  ›
                </Text>
              </Pressable>

              <Text
                style={[
                  local.sectionTitle,
                  { fontSize: 14 * textScale, lineHeight: 20 * textScale, marginTop: 18 * scale },
                ]}
              >
                Informações
              </Text>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Sobre o Aplicativo"
                onPress={() => setView('about')}
                style={[local.row, { paddingVertical: 12 * scale }]}
              >
                <View style={[local.rowLeft, { gap: 12 * scale }]}>
                  <MenuIcon kind="info" scale={scale} />
                  <Text style={[local.rowText, { fontSize: 14 * textScale, lineHeight: 20 * textScale }]}>
                    Sobre o Aplicativo
                  </Text>
                </View>
                <Text accessible={false} aria-hidden style={[local.chevron, { fontSize: 22 * textScale }]}>
                  ›
                </Text>
              </Pressable>

              <View style={[local.row, { paddingVertical: 12 * scale }]}>
                <View style={[local.rowLeft, { gap: 12 * scale }]}>
                  <MenuIcon kind="tag" scale={scale} />
                  <Text style={[local.rowText, { fontSize: 14 * textScale, lineHeight: 20 * textScale }]}>
                    Versão
                  </Text>
                </View>
                <Text style={[local.versionText, { fontSize: 13 * textScale, lineHeight: 18 * textScale }]}>
                  1.0.0
                </Text>
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="LGPD | TCLE"
                onPress={handleTclePress}
                style={[local.row, { paddingVertical: 12 * scale }]}
              >
                <View style={[local.rowLeft, { gap: 12 * scale }]}>
                  <MenuIcon kind="doc" scale={scale} />
                  <Text style={[local.rowText, { fontSize: 14 * textScale, lineHeight: 20 * textScale }]}>
                    LGPD | TCLE
                  </Text>
                </View>
                <MenuIcon kind="download" scale={scale} />
              </Pressable>
            </View>
          ) : isAbout ? (
            <ScrollView
              contentContainerStyle={[
                local.aboutContent,
                { paddingHorizontal: 24 * scale, paddingTop: 18 * scale, paddingBottom: 8 * scale },
              ]}
              showsVerticalScrollIndicator={false}
            >
              {ipRiskLogo && (
                <Image
                  source={ipRiskLogo}
                  resizeMode="contain"
                  accessibilityRole="image"
                  accessibilityLabel="Logo IP RISK Inventário Psicossocial"
                  style={[
                    local.logoImage,
                    { width: 120 * scale, height: 60 * scale, marginBottom: 14 * scale },
                  ]}
                />
              )}
              <Text style={[local.creditLabel, { fontSize: 14 * textScale, lineHeight: 20 * textScale }]}>
                Desenvolvido por:
              </Text>
              {cesmacLogo && (
                <Image
                  source={cesmacLogo}
                  resizeMode="contain"
                  accessibilityRole="image"
                  accessibilityLabel="CESMAC CITEC"
                  style={[
                    local.logoImage,
                    { width: 112 * scale, height: 100 * scale, marginTop: 10 * scale, marginBottom: 18 * scale },
                  ]}
                />
              )}

              <Text style={[local.creditLabel, { fontSize: 14 * textScale, lineHeight: 20 * textScale }]}>
                Professores e Pesquisadores envolvidos:
              </Text>
              <View style={[local.creditList, { marginTop: 6 * scale, marginBottom: 16 * scale, gap: 2 * scale }]}>
                <Text style={[local.creditItem, { fontSize: 13 * textScale, lineHeight: 19 * textScale }]}>
                  Prof. Gabriel Rosendo
                </Text>
                <Text style={[local.creditItem, { fontSize: 13 * textScale, lineHeight: 19 * textScale }]}>
                  Prof. João Paulo
                </Text>
                <Text style={[local.creditItem, { fontSize: 13 * textScale, lineHeight: 19 * textScale }]}>
                  Wellington Moreira
                </Text>
              </View>

              <Text style={[local.creditLabel, { fontSize: 14 * textScale, lineHeight: 20 * textScale }]}>
                Desenvolvedores responsáveis:
              </Text>
              <View style={[local.creditList, { marginTop: 6 * scale, marginBottom: 16 * scale }]}>
                <Text style={[local.creditItem, { fontSize: 13 * textScale, lineHeight: 19 * textScale }]}>
                  Andrei Matheus
                </Text>
              </View>

              <Text style={[local.creditLabel, { fontSize: 14 * textScale, lineHeight: 20 * textScale }]}>
                Designers:
              </Text>
              <View style={[local.creditList, { marginTop: 6 * scale }]}>
                <Text style={[local.creditItem, { fontSize: 13 * textScale, lineHeight: 19 * textScale }]}>
                  Dayane Pontes
                </Text>
              </View>
            </ScrollView>
          ) : (
            <ScrollView
              contentContainerStyle={[
                local.aboutContent,
                { paddingHorizontal: 24 * scale, paddingTop: 18 * scale, paddingBottom: 16 * scale },
              ]}
              showsVerticalScrollIndicator
            >
              <Text
                accessibilityRole="header"
                style={[local.sectionTitle, { fontSize: 16 * textScale, lineHeight: 22 * textScale, marginBottom: 12 * scale }]}
              >
                {TCLE_TITLE}
              </Text>
              {TCLE_SECTIONS.map(section => (
                <View key={section.title} style={{ marginTop: 12 * scale }}>
                  <Text style={[local.creditLabel, { fontSize: 14 * textScale, lineHeight: 20 * textScale, marginBottom: 4 * scale }]}>
                    {section.title}
                  </Text>
                  {section.paragraphs.map((paragraph, idx) => (
                    <Text
                      key={`${section.title}-${idx}`}
                      style={[
                        local.creditItem,
                        { fontSize: 13 * textScale, lineHeight: 19 * textScale, marginTop: idx > 0 ? 6 * scale : 0 },
                      ]}
                    >
                      {paragraph}
                    </Text>
                  ))}
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const local = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  backdrop: {
    flex: 1,
    width: '100%',
  },
  sheet: {
    width: '100%',
    maxWidth: 430,
    maxHeight: '85%',
    backgroundColor: colors.white,
    boxShadow: '0px -4px 16px rgba(0, 0, 0, 0.18)',
  },
  handle: {
    alignSelf: 'center',
    backgroundColor: colors.primary,
  },
  topBar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  backArrow: {
    color: colors.text,
    fontWeight: '500',
  },
  headerTitle: {
    color: colors.text,
    fontWeight: '600',
    textAlign: 'right',
  },
  content: {
    width: '100%',
  },
  sectionTitle: {
    color: colors.primary,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  row: {
    width: '100%',
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  rowText: {
    color: colors.text,
    fontWeight: '400',
  },
  chevron: {
    color: colors.text,
    lineHeight: 24,
  },
  versionText: {
    color: colors.textMuted,
    fontWeight: '500',
  },
  aboutContent: {
    width: '100%',
  },
  creditLabel: {
    color: colors.text,
    fontWeight: 'bold',
  },
  logoImage: {
    alignSelf: 'flex-start',
  },
  creditList: {
    paddingLeft: 12,
  },
  creditItem: {
    color: colors.text,
    fontWeight: '400',
  },
});

const icons = StyleSheet.create({
  box: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCircle: {
    borderWidth: 1.5,
    borderColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoLetter: {
    color: colors.text,
    fontWeight: 'bold',
  },
  tagBody: {
    borderWidth: 1.5,
    borderColor: colors.text,
    justifyContent: 'center',
    paddingLeft: 3,
  },
  tagDot: {
    backgroundColor: colors.text,
  },
  docBody: {
    borderWidth: 1.5,
    borderColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  docLine: {
    height: 1.5,
    backgroundColor: colors.text,
  },
  dlShaft: {
    width: 2,
    backgroundColor: colors.primary,
  },
  dlHead: {
    marginTop: -5,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: colors.primary,
    transform: [{ rotate: '45deg' }],
  },
  dlTray: {
    marginTop: 2,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: colors.primary,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
});
