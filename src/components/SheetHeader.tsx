import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import COLORS from '../constants/colors';

interface SheetHeaderProps {
  title: string;
  onClose: () => void;
  onBack?: () => void;
}

export default function SheetHeader({ title, onClose, onBack }: SheetHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.dragIndicator} />

      <View style={styles.titleRow}>
        <View style={styles.sideContainer}>
          {onBack ? (
            <TouchableOpacity
              style={styles.backButton}
              onPress={onBack}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.backIcon}>{'<'}</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.sideSpacer} />
          )}
        </View>

        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>

        <View style={styles.sideContainer}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.closeIcon}>x</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 8,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.background.primary,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  dragIndicator: {
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 44,
  },
  sideContainer: {
    width: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  sideSpacer: {
    width: 30,
    height: 30,
  },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text.primary,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  backButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(212,175,55,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 16,
    color: COLORS.accent.gold,
    fontWeight: '700',
    marginTop: -1,
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
});
