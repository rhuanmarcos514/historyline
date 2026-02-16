import React, { useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import COLORS from '../constants/colors';
import type { Character } from '../types/game.types';

interface RelationshipsViewProps {
  character: Character;
  setCharacter: React.Dispatch<React.SetStateAction<Character | null>>;
  onNPCInteraction: (npcId: string, actionType: 'CHAT' | 'MONEY' | 'HELP_WORK' | 'ASK_TOY' | 'TANTRUM') => void;
  onAddToLog?: (message: string, type: 'neutral' | 'success' | 'fail') => void;
  onSetCurrentEvent?: (event: any) => void;
}

interface NPCStats {
  vitality: number;
  faith: number;
  strength: number;
  honor: number;
  money: number;
}

interface FamilyMember {
  id: string;
  name: string;
  role: string;
  age: number;
  gender: 'male' | 'female';
  occupation: string;
  relationship: number;
  isAlive: boolean;
  stats: NPCStats;
}

export default function RelationshipsView({ character, setCharacter, onNPCInteraction, onAddToLog, onSetCurrentEvent }: RelationshipsViewProps) {
  const [selectedNPC, setSelectedNPC] = useState<FamilyMember | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Gerar lista de família
  const getFamilyMembers = (): FamilyMember[] => {
    const members: FamilyMember[] = [];

    const defaultStats: NPCStats = { vitality: 50, faith: 50, strength: 50, honor: 50, money: 0 };

    // Pai
    if (character.family.fatherName) {
      members.push({
        id: 'father',
        name: `${character.family.fatherName} ${character.surname}`,
        role: 'Pai',
        age: character.family.fatherAge || 30,
        gender: 'male',
        occupation: character.family.fatherOccupation,
        relationship: character.family?.fatherRelationship || 50,
        isAlive: character.family.fatherAlive !== false,
        stats: character.family.fatherStats || defaultStats,
      });
    }

    // Mãe
    if (character.family.motherName) {
      const motherOccupation = getMotherOccupation(character.socialClass);
      members.push({
        id: 'mother',
        name: character.family.motherName,
        role: 'Mãe',
        age: character.family.motherAge || 28,
        gender: 'female',
        occupation: motherOccupation,
        relationship: character.family?.motherRelationship || 50,
        isAlive: character.family.motherAlive !== false,
        stats: character.family.motherStats || defaultStats,
      });
    }

    // Irmãos
    if (character.siblings && character.siblings.length > 0) {
      character.siblings.forEach((sibling) => {
        members.push({
          id: sibling.id,
          name: `${sibling.name} ${character.surname}`,
          role: sibling.gender === 'male' ? 'Irmão' : 'Irmã',
          age: sibling.age,
          gender: sibling.gender,
          occupation: sibling.age < 7 ? 'Criança' : 'Ajudante',
          relationship: sibling.relationship,
          isAlive: true,
          stats: sibling.stats || defaultStats,
        });
      });
    }

    return members;
  };

  const getMotherOccupation = (socialClass: string): string => {
    switch (socialClass) {
      case 'nobility':
        return 'Lady da Casa';
      case 'gentry':
        return 'Dona de Casa';
      case 'artisan':
        return 'Costureira';
      case 'peasant':
      default:
        return 'Camponesa';
    }
  };

  const getRelationshipColor = (value: number): string => {
    if (value >= 70) return '#4ade80';
    if (value >= 40) return '#fbbf24';
    return '#ef4444';
  };

  const renderStatBar = (label: string, value: number, color: string) => (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={styles.statBarBg}>
        <View style={[styles.statBarFill, { width: `${value}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );

  const handleNPCPress = (member: FamilyMember) => {
    setSelectedNPC(member);
    setShowModal(true);
  };

  const handleAction = (actionType: 'CHAT' | 'MONEY' | 'HELP_WORK' | 'ASK_TOY' | 'TANTRUM') => {
    if (!selectedNPC) return;
    onNPCInteraction(selectedNPC.id, actionType);
    setShowModal(false);
  };

  const isChildAge = character.age < 13;
  const isWorkingClass = character.socialClass === 'peasant' || character.socialClass === 'artisan';
  const canHelpWork = character.age >= 6 && isWorkingClass;

  const familyMembers = getFamilyMembers();

  return (
    <View style={styles.container}>
      {/* Title removed - displayed in SheetHeader */}


      <Text style={styles.subtitle}>Sua Família</Text>

      <ScrollView style={styles.scrollContainer} nestedScrollEnabled>
        {familyMembers.length === 0 ? (
          <Text style={styles.emptyText}>Nenhum familiar encontrado.</Text>
        ) : (
          familyMembers.map((member) => (
            <TouchableOpacity
              key={member.id}
              style={[styles.card, !member.isAlive && styles.cardDeceased]}
              onPress={() => handleNPCPress(member)}
              disabled={!member.isAlive}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardName}>{member.name}</Text>
                <Text style={styles.cardRole}>{member.role}</Text>
              </View>

              <View style={styles.cardInfo}>
                <Text style={styles.cardAge}>
                  {member.isAlive ? `${member.age} anos` : 'Falecido(a)'}
                </Text>
                <Text style={styles.cardOccupation}>{member.occupation}</Text>
              </View>

              {member.isAlive && (
                <View style={styles.relationshipContainer}>
                  <Text style={styles.relationshipLabel}>Relação:</Text>
                  <View style={styles.relationshipBarBg}>
                    <View
                      style={[
                        styles.relationshipBarFill,
                        {
                          width: `${member.relationship}%`,
                          backgroundColor: getRelationshipColor(member.relationship),
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.relationshipValue}>{member.relationship}%</Text>
                </View>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Modal de Interação */}
      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setShowModal(false)}
            >
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>

            {/* Profile Card */}
            {selectedNPC && (
              <View style={styles.profileCard}>
                <Text style={styles.profileEmoji}>
                  {selectedNPC.gender === 'male' ? '👨' : '👩'}
                </Text>
                <Text style={styles.profileName}>{selectedNPC.name}</Text>
                <Text style={styles.profileRole}>
                  {selectedNPC.role} • {selectedNPC.age} anos
                </Text>
                <Text style={styles.profileMoney}>
                  💰 {selectedNPC.stats.money} moedas
                </Text>

                <View style={styles.profileBars}>
                  {renderStatBar('Vitalidade', selectedNPC.stats.vitality, '#ef4444')}
                  {renderStatBar('Fé', selectedNPC.stats.faith, '#c9a84c')}
                  {renderStatBar('Força', selectedNPC.stats.strength, '#f97316')}
                  {renderStatBar('Honra', selectedNPC.stats.honor, '#8b5cf6')}
                </View>
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  character.age < 5 && styles.actionButtonDisabled,
                ]}
                onPress={() => handleAction('CHAT')}
                disabled={character.age < 5}
              >
                <Text style={styles.actionButtonText}>
                  💬 Conversar {character.age < 5 ? '(5+)' : ''}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.actionButton,
                  character.age < 13 && styles.actionButtonDisabled,
                ]}
                onPress={() => handleAction('MONEY')}
                disabled={character.age < 13}
              >
                <Text style={styles.actionButtonText}>
                  💰 Pedir Dinheiro {character.age < 13 ? '(13+)' : ''}
                </Text>
              </TouchableOpacity>

              {/* AÇÕES DE CRIANÇA (age < 13) */}
              {isChildAge && isWorkingClass && (selectedNPC?.role === 'Pai' || selectedNPC?.role === 'Mãe') && (
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    !canHelpWork && styles.actionButtonDisabled,
                  ]}
                  onPress={() => handleAction('HELP_WORK')}
                  disabled={!canHelpWork}
                >
                  <Text style={styles.actionButtonText}>
                    ⚒️ Ajudar no Trabalho{!canHelpWork ? ' (6+)' : ''}
                  </Text>
                </TouchableOpacity>
              )}

              {isChildAge && (selectedNPC?.role === 'Pai' || selectedNPC?.role === 'Mãe') && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleAction('ASK_TOY')}
                >
                  <Text style={styles.actionButtonText}>🪀 Pedir Brinquedo</Text>
                </TouchableOpacity>
              )}

              {isChildAge && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleAction('TANTRUM')}
                >
                  <Text style={styles.actionButtonText}>😤 Fazer Birra</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingBottom: 40,
  },
  // Title style removed

  subtitle: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  scrollContainer: {
    flex: 1,
  },
  emptyText: {
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginTop: 40,
    fontSize: 14,
  },
  card: {
    backgroundColor: COLORS.background.secondary,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  cardDeceased: {
    opacity: 0.5,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  cardRole: {
    fontSize: 12,
    color: COLORS.accent.gold,
    fontWeight: '600',
  },
  cardInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  cardAge: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  cardOccupation: {
    fontSize: 12,
    color: COLORS.text.secondary,
    fontStyle: 'italic',
  },
  relationshipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  relationshipLabel: {
    fontSize: 11,
    color: COLORS.text.secondary,
    marginRight: 8,
  },
  relationshipBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.background.tertiary,
    borderRadius: 4,
    overflow: 'hidden',
  },
  relationshipBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  relationshipValue: {
    fontSize: 11,
    color: COLORS.text.secondary,
    marginLeft: 8,
    width: 35,
    textAlign: 'right',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.background.secondary,
    padding: 24,
    borderRadius: 12,
    width: '85%',
    alignItems: 'center',
  },
  modalClose: {
    position: 'absolute',
    top: 10,
    right: 14,
    padding: 4,
  },
  modalCloseText: {
    fontSize: 20,
    color: COLORS.text.secondary,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.accent.gold,
    marginBottom: 4,
    marginTop: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginBottom: 20,
  },
  modalActions: {
    width: '100%',
    gap: 10,
  },
  actionButton: {
    backgroundColor: COLORS.accent.bronze,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonText: {
    color: COLORS.text.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  actionPreview: {
    color: COLORS.text.secondary,
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 2,
  },
  profileCard: {
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  profileEmoji: {
    fontSize: 40,
    marginBottom: 6,
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.accent.gold,
    marginBottom: 2,
  },
  profileRole: {
    fontSize: 13,
    color: COLORS.text.secondary,
    marginBottom: 8,
  },
  profileMoney: {
    fontSize: 14,
    color: '#fbbf24',
    fontWeight: '600',
    marginBottom: 12,
  },
  profileBars: {
    width: '100%',
    gap: 6,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.text.secondary,
    width: 70,
  },
  statBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.background.tertiary,
    borderRadius: 4,
    overflow: 'hidden',
  },
  statBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  statValue: {
    fontSize: 11,
    color: COLORS.text.secondary,
    width: 30,
    textAlign: 'right',
  },
});
