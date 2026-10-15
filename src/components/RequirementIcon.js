import { StyleSheet, View } from 'react-native';

// Formas nativas, sem fonte de ícones ou módulo adicional.
/** @param {{ kind: string }} props */
export default function RequirementIcon({ kind }) {
  return (
    <View style={icon.frame} pointerEvents="none" accessible={false} aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {kind === 'person' ? <>
        <View style={icon.head} />
        <View style={icon.shoulders} />
      </> : kind === 'work' ? <>
        <View style={icon.handle} />
        <View style={icon.case} />
        <View style={icon.caseLine} />
        <View style={icon.clasp} />
      </> : <>
        <View style={icon.calendar} />
        <View style={icon.calendarLine} />
        <View style={[icon.ring, { left: 10 }]} />
        <View style={[icon.ring, { right: 10 }]} />
        {[0, 1, 2].map(column => <View key={column} style={[icon.day, { left: 10 + column * 7 }]} />)}
      </>}
    </View>
  );
}

const icon = StyleSheet.create({
  frame: { width: 36, height: 36 },
  head: { position: 'absolute', top: 3, left: 12, width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: '#20465A' },
  shoulders: { position: 'absolute', top: 19, left: 6, width: 24, height: 14, borderTopLeftRadius: 12, borderTopRightRadius: 12, borderWidth: 2, borderColor: '#20465A' },
  handle: { position: 'absolute', top: 5, left: 12, width: 12, height: 8, borderRadius: 3, borderWidth: 2, borderColor: '#20465A' },
  case: { position: 'absolute', top: 11, left: 3, width: 30, height: 21, borderRadius: 4, borderWidth: 2, borderColor: '#20465A' },
  caseLine: { position: 'absolute', top: 20, left: 4, right: 4, height: 2, backgroundColor: '#20465A' },
  clasp: { position: 'absolute', top: 18, left: 15, width: 6, height: 6, borderRadius: 1, backgroundColor: '#20465A' },
  calendar: { position: 'absolute', top: 7, left: 4, width: 28, height: 26, borderRadius: 4, borderWidth: 2, borderColor: '#20465A' },
  calendarLine: { position: 'absolute', top: 15, left: 5, right: 5, height: 2, backgroundColor: '#20465A' },
  ring: { position: 'absolute', top: 3, width: 2, height: 9, backgroundColor: '#20465A', borderRadius: 1 },
  day: { position: 'absolute', top: 22, width: 4, height: 4, borderRadius: 1, backgroundColor: '#20465A' },
});
