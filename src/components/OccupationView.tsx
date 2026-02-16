import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Modal } from 'react-native';
import COLORS from '../constants/colors';
import type { Character, Job, Coworker } from '../types/game.types';
import ClassmatesView from './ClassmatesView';
import { getClassmateTitle } from '../utils/classmates';

type CoworkerActionType =
  | 'COMPLIMENT' | 'TAVERN' | 'GIFT' | 'LOAN'
  | 'PLEASE' | 'HELP' | 'REPORT'
  | 'INSULT' | 'SABOTAGE' | 'HERESY' | 'DUEL';

interface OccupationViewProps {
  character: Character;
  onWork: () => void;
  onClassmateInteraction: (classmateId: string, actionType: 'PLAY' | 'CHAT' | 'FIGHT') => void;
  onTakeJob: (job: Job) => void;
  onResignJob: () => void;
  onCoworkerInteraction: (coworkerId: string, actionType: CoworkerActionType) => void;
}

interface OccupationInfo {
  title: string;
  emoji: string;
  action: string;
  description: string;
  rewards: string;
}

interface JobListing extends Job {
  requirements: {
    strength?: number;
    honor?: number;
  };
}

type SubView = 'menu' | 'current' | 'available';

const getOccupationInfo = (socialClass: string, age: number): OccupationInfo => {
  if (age < 6) {
    return {
      title: 'Criança',
      emoji: '👶',
      action: 'Brincar',
      description: 'Você ainda é muito jovem para trabalhar.',
      rewards: 'Nenhum',
    };
  }

  if (age >= 13) {
    return {
      title: 'Adulto',
      emoji: '💼',
      action: 'Escolher Trabalho',
      description: 'Você é adulto agora. Escolha um trabalho para ganhar a vida.',
      rewards: 'Varia por trabalho',
    };
  }

  const occupations: Record<string, OccupationInfo> = {
    nobility: {
      title: 'Pajem',
      emoji: '🏰',
      action: 'Treinar com Espada',
      description: 'Você serve como pajem na corte, aprendendo etiqueta e combate.',
      rewards: '+2 Força, +1 Honra, -2 Vitalidade',
    },
    gentry: {
      title: 'Estudante',
      emoji: '📚',
      action: 'Estudar com Tutor',
      description: 'Seu tutor lhe ensina história, latim e matemática.',
      rewards: '+2 Honra, +1 Fé, -1 Vitalidade',
    },
    artisan: {
      title: 'Aprendiz de Balcão',
      emoji: '🏪',
      action: 'Organizar Estoque',
      description: 'Você ajuda na loja da família, organizando mercadorias.',
      rewards: '+1 Honra, -1 Vitalidade, chance de $1',
    },
    peasant: {
      title: 'Ajudante na Vila',
      emoji: '🌾',
      action: 'Trabalhar na Terra',
      description: 'Você trabalha duro nos campos sob o sol.',
      rewards: '+2 Força, +1 Fé, -3 Vitalidade',
    },
  };

  return occupations[socialClass] || occupations.peasant;
};

const getAvailableJobs = (socialClass: string): JobListing[] => {
  const jobs: Record<string, JobListing[]> = {
    peasant: [
      {
        id: 'field_plower',
        title: 'Lavrador de Campo',
        emoji: '🌾',
        description: 'Trabalho árduo arando e plantando os campos do senhor.',
        income: 5,
        vitalityImpact: -10,
        strengthImpact: 2,
        requirements: { strength: 30 },
      },
      {
        id: 'shepherd',
        title: 'Pastor de Ovelhas',
        emoji: '🐑',
        description: 'Cuida do rebanho nas colinas, trabalho leve mas solitário.',
        income: 3,
        vitalityImpact: -5,
        faithImpact: 1,
        requirements: { strength: 10 },
      },
    ],
    artisan: [
      {
        id: 'market_trader',
        title: 'Comerciante de Feira',
        emoji: '🏪',
        description: 'Vende mercadorias na feira, negocia com clientes.',
        income: 15,
        vitalityImpact: -5,
        honorImpact: 2,
        requirements: { honor: 40 },
      },
      {
        id: 'craft_officer',
        title: 'Oficial de Ofício',
        emoji: '🔨',
        description: 'Trabalha na oficina da família, aprende o ofício completo.',
        income: 12,
        vitalityImpact: -8,
        honorImpact: 5,
        requirements: { honor: 50 },
      },
    ],
    gentry: [
      {
        id: 'estate_manager',
        title: 'Administrador de Propriedade',
        emoji: '📜',
        description: 'Gerencia terras e rendas da família.',
        income: 30,
        vitalityImpact: -5,
        honorImpact: 10,
        requirements: { honor: 60 },
      },
      {
        id: 'clerk',
        title: 'Escrivão',
        emoji: '✒️',
        description: 'Trabalha com documentos e contratos legais.',
        income: 25,
        vitalityImpact: -3,
        honorImpact: 5,
        requirements: { honor: 50 },
      },
    ],
    nobility: [
      {
        id: 'court_advisor',
        title: 'Conselheiro da Corte',
        emoji: '👑',
        description: 'Aconselha nobres e participa de decisões importantes.',
        income: 50,
        vitalityImpact: -2,
        honorImpact: 15,
        requirements: { honor: 70 },
      },
      {
        id: 'knight_squire',
        title: 'Escudeiro de Cavaleiro',
        emoji: '🛡️',
        description: 'Serve um cavaleiro, treina para a cavalaria.',
        income: 40,
        vitalityImpact: -10,
        honorImpact: 12,
        strengthImpact: 5,
        requirements: { honor: 60 },
      },
    ],
  };

  return jobs[socialClass] || jobs.peasant;
};

export default function OccupationView({
  character,
  onWork,
  onClassmateInteraction,
  onTakeJob,
  onResignJob,
  onCoworkerInteraction,
}: OccupationViewProps) {
  const [showClassmates, setShowClassmates] = useState(false);
  const [subView, setSubView] = useState<SubView>('menu');
  const [selectedCoworker, setSelectedCoworker] = useState<Coworker | null>(null);

  const occupation = getOccupationInfo(character.socialClass, character.age);
  const canWork = character.age >= 6;
  const hasClassmates = character.classmates && character.classmates.length > 0;
  const isAdult = character.age >= 13;
  const availableJobs = isAdult ? getAvailableJobs(character.socialClass) : [];
  const hasCurrentJob = !!character.currentJob;

  const canDoJob = (job: JobListing): boolean => {
    if (job.requirements.strength && (character.strength || 0) < job.requirements.strength) return false;
    if (job.requirements.honor && character.honor < job.requirements.honor) return false;
    return true;
  };

  const handleTakeJob = (job: JobListing) => {
    // Create job data and accept immediately (Alert doesn't work on web)
    const jobData: Job = {
      id: job.id,
      title: job.title,
      emoji: job.emoji,
      description: job.description,
      income: job.income,
      vitalityImpact: job.vitalityImpact,
      strengthImpact: job.strengthImpact,
      honorImpact: job.honorImpact,
      faithImpact: job.faithImpact,
    };
    onTakeJob(jobData);
  };

  const handleResign = () => {
    // Call resign directly (Alert doesn't work on web)
    onResignJob();
  };

  const formatAnnualEffects = (job: Job): string[] => {
    const effects: string[] = [];
    if (job.income > 0) effects.push(`💰 +${job.income} Moedas`);
    if (job.vitalityImpact !== 0) effects.push(`❤️ ${job.vitalityImpact > 0 ? '+' : ''}${job.vitalityImpact} Vitalidade`);
    if (job.strengthImpact) effects.push(`💪 ${job.strengthImpact > 0 ? '+' : ''}${job.strengthImpact} Força`);
    if (job.honorImpact) effects.push(`🛡 ${job.honorImpact > 0 ? '+' : ''}${job.honorImpact} Honra`);
    if (job.faithImpact) effects.push(`⛪ ${job.faithImpact > 0 ? '+' : ''}${job.faithImpact} Fé`);
    return effects;
  };

  const getRelationshipColor = (rel: number): string => {
    if (rel >= 75) return '#4ade80';
    if (rel >= 50) return '#fbbf24';
    if (rel >= 25) return '#fb923c';
    return '#ef4444';
  };

  return (
    <ScrollView style={styles.container} nestedScrollEnabled>
      {/* Title removed - redundant with SheetHeader */}

      {/* ========== SOCIAL CLASS HEADER (ALWAYS ON TOP) ========== */}
      <View style={styles.socialClassCard}>
        <Text style={styles.socialClassTitle}>Sua Classe Social</Text>
        <Text style={styles.socialClassText}>
          {character.socialClass === 'nobility' && '👑 Nobreza - Vida de privilégios e responsabilidades'}
          {character.socialClass === 'gentry' && '🎩 Pequena Nobreza - Educação e status'}
          {character.socialClass === 'artisan' && '🔨 Artesão - Comércio e ofícios'}
          {character.socialClass === 'peasant' && '🌾 Camponês - Trabalho árduo na terra'}
        </Text>
      </View>

      {/* ========== CHILDHOOD JOBS (Age < 13) ========== */}
      {!isAdult && (
        <View style={styles.childhoodCard}>
          <Text style={styles.occupationEmoji}>{occupation.emoji}</Text>
          <Text style={styles.occupationTitle}>{occupation.title}</Text>
          <Text style={styles.occupationDescription}>{occupation.description}</Text>

          <View style={styles.rewardsSection}>
            <Text style={styles.rewardsLabel}>Recompensas:</Text>
            <Text style={styles.rewardsText}>{occupation.rewards}</Text>
          </View>

          <TouchableOpacity
            style={[styles.workButton, !canWork && styles.workButtonDisabled]}
            onPress={onWork}
            disabled={!canWork}
          >
            <Text style={styles.workButtonText}>
              {canWork ? `⚒️ ${occupation.action}` : '🚫 Muito jovem (6+)'}
            </Text>
          </TouchableOpacity>

          {!canWork && (
            <Text style={styles.warningText}>
              Crianças menores de 6 anos não podem trabalhar.
            </Text>
          )}
        </View>
      )}

      {/* ========== ADULT JOB SYSTEM (Age >= 13) ========== */}
      {isAdult && (
        <>
          {/* MENU VIEW - Categories */}
          {subView === 'menu' && (
            <View style={styles.menuView}>
              {/* Current Job Category */}
              {hasCurrentJob && (
                <TouchableOpacity
                  style={styles.categoryCard}
                  activeOpacity={0.7}
                  onPress={() => setSubView('current')}
                >
                  <Text style={styles.categoryLabel}>💼 Cargo Atual</Text>
                  <Text style={styles.categoryChevron}>›</Text>
                </TouchableOpacity>
              )}

              {/* Available Jobs Category */}
              <TouchableOpacity
                style={styles.categoryCard}
                activeOpacity={0.7}
                onPress={() => setSubView('available')}
              >
                <Text style={styles.categoryLabel}>
                  {hasCurrentJob ? '📁 Outros Trabalhos' : '📁 Trabalhos Disponíveis'}
                </Text>
                <Text style={styles.categoryChevron}>›</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* CURRENT JOB DETAIL VIEW */}
          {subView === 'current' && character.currentJob && (
            <View style={styles.detailView}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setSubView('menu')}
              >
                <Text style={styles.backButtonText}>← Voltar</Text>
              </TouchableOpacity>

              <Text style={styles.detailTitle}>⭐ Cargo Atual</Text>

              <View style={styles.currentJobCard}>
                {/* Job Header */}
                <View style={styles.currentJobHeader}>
                  <Text style={styles.currentJobEmoji}>{character.currentJob.emoji}</Text>
                  <View style={styles.currentJobInfo}>
                    <Text style={styles.currentJobTitle}>{character.currentJob.title}</Text>
                    <Text style={styles.currentJobDescription}>{character.currentJob.description}</Text>
                  </View>
                </View>

                {/* Annual Rewards Box */}
                <View style={styles.annualRewardsBox}>
                  <Text style={styles.annualRewardsTitle}>📊 Recompensas Anuais</Text>
                  {formatAnnualEffects(character.currentJob).map((effect, index) => (
                    <Text key={index} style={styles.annualRewardItem}>{effect}</Text>
                  ))}
                </View>

                {/* Coworkers Section */}
                {character.currentJob.coworkers && character.currentJob.coworkers.length > 0 && (
                  <View style={styles.coworkersSection}>
                    <Text style={styles.coworkersTitle}>🤝 Colegas de Trabalho</Text>
                    {character.currentJob.coworkers.map((coworker) => (
                      <TouchableOpacity
                        key={coworker.id}
                        style={styles.coworkerCard}
                        onPress={() => setSelectedCoworker(coworker)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.coworkerHeader}>
                          <Text style={styles.coworkerEmoji}>👤</Text>
                          <View style={styles.coworkerInfo}>
                            <Text style={styles.coworkerName}>{coworker.name}</Text>
                            <Text style={styles.coworkerRole}>{coworker.role}</Text>
                          </View>
                        </View>

                        <View style={styles.relationshipBarContainer}>
                          <View style={styles.relationshipBarOuter}>
                            <View
                              style={[
                                styles.relationshipBarFill,
                                {
                                  width: `${coworker.relationship}%`,
                                  backgroundColor: getRelationshipColor(coworker.relationship),
                                },
                              ]}
                            />
                          </View>
                          <Text style={styles.relationshipValue}>{coworker.relationship}%</Text>
                        </View>

                        <Text style={styles.tapToInteractHint}>👆 Toque para interagir</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Resign Button */}
                <TouchableOpacity style={styles.resignButton} onPress={handleResign}>
                  <Text style={styles.resignButtonText}>🚪 Pedir Demissão</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* AVAILABLE JOBS DETAIL VIEW */}
          {subView === 'available' && (
            <View style={styles.detailView}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setSubView('menu')}
              >
                <Text style={styles.backButtonText}>← Voltar</Text>
              </TouchableOpacity>

              <Text style={styles.detailTitle}>
                {hasCurrentJob ? '📁 Outros Trabalhos' : '📁 Trabalhos Disponíveis'}
              </Text>

              {availableJobs
                .filter(job => !character.currentJob || job.id !== character.currentJob.id)
                .map((job) => {
                  const meetsRequirements = canDoJob(job);
                  return (
                    <View
                      key={job.id}
                      style={[
                        styles.jobCard,
                        !meetsRequirements && styles.jobCardDisabled,
                      ]}
                    >
                      <View style={styles.jobHeader}>
                        <Text style={[styles.jobEmoji, !meetsRequirements && styles.grayedOut]}>
                          {job.emoji}
                        </Text>
                        <Text style={[styles.jobTitle, !meetsRequirements && styles.grayedOut]}>
                          {job.title}
                        </Text>
                      </View>
                      <Text style={[styles.jobDescription, !meetsRequirements && styles.grayedOut]}>
                        {job.description}
                      </Text>

                      {/* Requirements */}
                      <View style={styles.jobRequirements}>
                        <Text style={styles.jobRequirementsLabel}>Requisitos:</Text>
                        <Text style={[styles.jobRequirementsText, !meetsRequirements && styles.requirementsFailed]}>
                          {job.requirements.strength && `💪 ${job.requirements.strength}+ Força`}
                          {job.requirements.honor && `🛡 ${job.requirements.honor}+ Honra`}
                        </Text>
                      </View>

                      {/* Annual Effects */}
                      <View style={styles.jobRewards}>
                        <Text style={styles.jobRewardsLabel}>Efeitos Anuais:</Text>
                        {formatAnnualEffects(job).map((effect, index) => (
                          <Text key={index} style={styles.jobRewardItem}>{effect}</Text>
                        ))}
                      </View>

                      <TouchableOpacity
                        style={[styles.jobButton, !meetsRequirements && styles.jobButtonDisabled]}
                        onPress={() => handleTakeJob(job)}
                        disabled={!meetsRequirements}
                      >
                        <Text style={styles.jobButtonText}>
                          {meetsRequirements ? '✅ Aceitar Emprego' : '🚫 Requisitos não atendidos'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
            </View>
          )}
        </>
      )}

      {/* Classmates Button - Only for children (Age 6-12) */}
      {character.age >= 6 && character.age < 13 && (
        <TouchableOpacity
          style={[styles.classmatesButton, !hasClassmates && styles.classmatesButtonDisabled]}
          onPress={() => setShowClassmates(true)}
          disabled={!hasClassmates}
        >
          <Text style={styles.classmatesButtonText}>
            👥 Ver {getClassmateTitle(character.socialClass)}
            {hasClassmates ? ` (${character.classmates.length})` : ' (Nenhum)'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Classmates Modal */}
      {showClassmates && (
        <ClassmatesView
          character={character}
          onInteraction={onClassmateInteraction}
          onClose={() => setShowClassmates(false)}
        />
      )}

      {/* Colleague Interaction Modal */}
      {selectedCoworker && (
        <Modal visible transparent animationType="slide" onRequestClose={() => setSelectedCoworker(null)}>
          <View style={styles.modalOverlay}>
            <ScrollView style={styles.modalScrollView} contentContainerStyle={styles.modalScrollContent} nestedScrollEnabled>
              <View style={styles.modalContainer}>
                {/* Header */}
                <View style={styles.modalHeader}>
                  <View style={styles.modalHeaderLeft}>
                    <Text style={styles.modalEmoji}>👤</Text>
                    <View>
                      <Text style={styles.modalName}>{selectedCoworker.name}</Text>
                      <Text style={styles.modalRole}>{selectedCoworker.role}</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.modalCloseButton}
                    onPress={() => setSelectedCoworker(null)}
                  >
                    <Text style={styles.modalCloseButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>

                {/* Relationship Bar */}
                <View style={styles.modalRelationshipSection}>
                  <Text style={styles.modalSectionLabel}>Relacionamento</Text>
                  <View style={styles.modalRelationshipBar}>
                    <View
                      style={[
                        styles.modalRelationshipFill,
                        {
                          width: `${selectedCoworker.relationship}%`,
                          backgroundColor: getRelationshipColor(selectedCoworker.relationship),
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.modalRelationshipValue}>{selectedCoworker.relationship}%</Text>
                </View>

                {/* Player Stats */}
                <View style={styles.modalStatsSection}>
                  <Text style={styles.modalSectionLabel}>Suas Estatísticas</Text>
                  <View style={styles.modalStatsGrid}>
                    <View style={styles.modalStatItem}>
                      <Text style={styles.modalStatLabel}>💰 Moedas</Text>
                      <Text style={styles.modalStatValue}>{character.money}</Text>
                    </View>
                    <View style={styles.modalStatItem}>
                      <Text style={styles.modalStatLabel}>❤️ Vitalidade</Text>
                      <View style={styles.modalStatBar}>
                        <View style={[styles.modalStatBarFill, { width: `${character.health}%` }]} />
                      </View>
                      <Text style={styles.modalStatValue}>{character.health}</Text>
                    </View>
                    {character.faith !== undefined && (
                      <View style={styles.modalStatItem}>
                        <Text style={styles.modalStatLabel}>⛪ Fé</Text>
                        <View style={styles.modalStatBar}>
                          <View style={[styles.modalStatBarFill, { width: `${character.faith}%` }]} />
                        </View>
                        <Text style={styles.modalStatValue}>{character.faith}</Text>
                      </View>
                    )}
                    {character.strength !== undefined && (
                      <View style={styles.modalStatItem}>
                        <Text style={styles.modalStatLabel}>💪 Força</Text>
                        <View style={styles.modalStatBar}>
                          <View style={[styles.modalStatBarFill, { width: `${character.strength}%` }]} />
                        </View>
                        <Text style={styles.modalStatValue}>{character.strength}</Text>
                      </View>
                    )}
                    <View style={styles.modalStatItem}>
                      <Text style={styles.modalStatLabel}>🛡 Honra</Text>
                      <View style={styles.modalStatBar}>
                        <View style={[styles.modalStatBarFill, { width: `${character.honor}%` }]} />
                      </View>
                      <Text style={styles.modalStatValue}>{character.honor}</Text>
                    </View>
                  </View>
                </View>

                {/* Action Categories */}

                {/* 🤝 AMIGÁVEIS */}
                <View style={styles.modalActionCategory}>
                  <Text style={styles.modalCategoryTitle}>🤝 Amigáveis</Text>

                  <TouchableOpacity
                    style={styles.modalActionButton}
                    onPress={() => {
                      onCoworkerInteraction(selectedCoworker.id, 'COMPLIMENT');
                      setSelectedCoworker(null);
                    }}
                  >
                    <Text style={styles.modalActionText}>😊 Elogiar</Text>
                    <Text style={styles.modalActionEffect}>+5 Relacionamento</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalActionButton, character.money < 5 && styles.modalActionButtonDisabled]}
                    onPress={() => {
                      if (character.money >= 5) {
                        onCoworkerInteraction(selectedCoworker.id, 'TAVERN');
                        setSelectedCoworker(null);
                      }
                    }}
                    disabled={character.money < 5}
                  >
                    <Text style={styles.modalActionText}>🍺 Sair para a Taverna</Text>
                    <Text style={styles.modalActionEffect}>-5 💰 | +10 Relacionamento | -5 Vitalidade</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalActionButton, character.inventory.length === 0 && styles.modalActionButtonDisabled]}
                    onPress={() => {
                      if (character.inventory.length > 0) {
                        onCoworkerInteraction(selectedCoworker.id, 'GIFT');
                        setSelectedCoworker(null);
                      }
                    }}
                    disabled={character.inventory.length === 0}
                  >
                    <Text style={styles.modalActionText}>🎁 Dar Presente</Text>
                    <Text style={styles.modalActionEffect}>Usar item do inventário | ++Relacionamento</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalActionButton, selectedCoworker.relationship <= 80 && styles.modalActionButtonDisabled]}
                    onPress={() => {
                      if (selectedCoworker.relationship > 80) {
                        onCoworkerInteraction(selectedCoworker.id, 'LOAN');
                        setSelectedCoworker(null);
                      }
                    }}
                    disabled={selectedCoworker.relationship <= 80}
                  >
                    <Text style={styles.modalActionText}>💸 Pedir Empréstimo</Text>
                    <Text style={styles.modalActionEffect}>
                      {selectedCoworker.relationship > 80 ? '+10-50 💰 | -5 Relacionamento' : '🔒 Requer 80+ Relacionamento'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* 💼 PROFISSIONAIS */}
                <View style={styles.modalActionCategory}>
                  <Text style={styles.modalCategoryTitle}>💼 Profissionais</Text>

                  <TouchableOpacity
                    style={styles.modalActionButton}
                    onPress={() => {
                      onCoworkerInteraction(selectedCoworker.id, 'PLEASE');
                      setSelectedCoworker(null);
                    }}
                  >
                    <Text style={styles.modalActionText}>🙇 Agradar</Text>
                    <Text style={styles.modalActionEffect}>+5 Honra | -10 Vitalidade</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalActionButton, selectedCoworker.relationship <= 60 && styles.modalActionButtonDisabled]}
                    onPress={() => {
                      if (selectedCoworker.relationship > 60) {
                        onCoworkerInteraction(selectedCoworker.id, 'HELP');
                        setSelectedCoworker(null);
                      }
                    }}
                    disabled={selectedCoworker.relationship <= 60}
                  >
                    <Text style={styles.modalActionText}>🤝 Pedir Ajuda na Função</Text>
                    <Text style={styles.modalActionEffect}>
                      {selectedCoworker.relationship > 60 ? 'Reduz custo de Vitalidade no próximo ano | -10 Relacionamento' : '🔒 Requer 60+ Relacionamento'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.modalActionButton}
                    onPress={() => {
                      onCoworkerInteraction(selectedCoworker.id, 'REPORT');
                      setSelectedCoworker(null);
                    }}
                  >
                    <Text style={styles.modalActionText}>📋 Denunciar ao Supervisor</Text>
                    <Text style={styles.modalActionEffect}>+10 Honra | Colega vira Inimigo (Rel = 0)</Text>
                  </TouchableOpacity>
                </View>

                {/* 🗡️ HOSTIS */}
                <View style={styles.modalActionCategory}>
                  <Text style={[styles.modalCategoryTitle, styles.modalCategoryTitleHostile]}>🗡️ Hostis</Text>

                  <TouchableOpacity
                    style={[styles.modalActionButton, styles.modalActionButtonHostile]}
                    onPress={() => {
                      onCoworkerInteraction(selectedCoworker.id, 'INSULT');
                      setSelectedCoworker(null);
                    }}
                  >
                    <Text style={styles.modalActionText}>😠 Insultar / Agredir</Text>
                    <Text style={styles.modalActionEffect}>--Relacionamento | Risco de luta</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalActionButton, styles.modalActionButtonHostile]}
                    onPress={() => {
                      onCoworkerInteraction(selectedCoworker.id, 'SABOTAGE');
                      setSelectedCoworker(null);
                    }}
                  >
                    <Text style={styles.modalActionText}>🔧 Sabotar Trabalho</Text>
                    <Text style={styles.modalActionEffect}>Ação furtiva | Sucesso: -Honra do colega | Falha: -Sua honra e multa</Text>
                  </TouchableOpacity>

                  {character.currentYear >= 1500 && character.currentYear <= 1700 && (
                    <TouchableOpacity
                      style={[styles.modalActionButton, styles.modalActionButtonHostile]}
                      onPress={() => {
                        onCoworkerInteraction(selectedCoworker.id, 'HERESY');
                        setSelectedCoworker(null);
                      }}
                    >
                      <Text style={styles.modalActionText}>⚠️ Espalhar Rumor de Heresia</Text>
                      <Text style={styles.modalActionEffect}>Era 1500+ | --Honra do colega | Risco de Inquisição</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={[styles.modalActionButton, styles.modalActionButtonHostile]}
                    onPress={() => {
                      onCoworkerInteraction(selectedCoworker.id, 'DUEL');
                      setSelectedCoworker(null);
                    }}
                  >
                    <Text style={styles.modalActionText}>⚔️ Desafiar para Duelo</Text>
                    <Text style={styles.modalActionEffect}>Confronto de vida ou morte | Teste de Força</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => setSelectedCoworker(null)}
                >
                  <Text style={styles.modalCancelButtonText}>← Voltar</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </Modal>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingBottom: 40,
  },
  // Title style removed


  // ========== SOCIAL CLASS HEADER (TOP) ==========
  socialClassCard: {
    backgroundColor: COLORS.background.secondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.accent.bronze,
  },
  socialClassTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  socialClassText: {
    fontSize: 13,
    color: COLORS.text.secondary,
    lineHeight: 18,
  },

  // ========== CHILDHOOD JOBS ==========
  childhoodCard: {
    backgroundColor: COLORS.background.secondary,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  occupationEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  occupationTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  occupationDescription: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  rewardsSection: {
    backgroundColor: COLORS.background.tertiary,
    padding: 12,
    borderRadius: 8,
    width: '100%',
    marginBottom: 16,
  },
  rewardsLabel: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginBottom: 4,
  },
  rewardsText: {
    fontSize: 14,
    color: COLORS.accent.gold,
    fontWeight: '600',
  },
  workButton: {
    backgroundColor: COLORS.accent.gold,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  workButtonDisabled: {
    backgroundColor: COLORS.background.tertiary,
    opacity: 0.6,
  },
  workButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.background.primary,
  },
  warningText: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginTop: 8,
    fontStyle: 'italic',
  },

  // ========== MENU VIEW (CATEGORIES) ==========
  menuView: {
    gap: 12,
  },
  categoryCard: {
    backgroundColor: COLORS.background.secondary,
    borderRadius: 10,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.accent.bronze,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  categoryChevron: {
    fontSize: 24,
    color: COLORS.accent.gold,
    fontWeight: 'bold',
  },

  // ========== DETAIL VIEWS ==========
  detailView: {
    flex: 1,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignSelf: 'flex-start',
    borderRadius: 20,
  },
  backButtonText: {
    fontSize: 14,
    color: COLORS.accent.gold,
    fontWeight: '600',
    marginLeft: 4,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.accent.gold,
    marginBottom: 12,
  },

  // ========== CURRENT JOB CARD ==========
  currentJobCard: {
    backgroundColor: COLORS.background.secondary,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: COLORS.accent.gold,
    marginBottom: 16,
  },
  currentJobHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  currentJobEmoji: {
    fontSize: 48,
    marginRight: 12,
  },
  currentJobInfo: {
    flex: 1,
  },
  currentJobTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  currentJobDescription: {
    fontSize: 13,
    color: COLORS.text.secondary,
    lineHeight: 18,
  },

  // Annual Rewards
  annualRewardsBox: {
    backgroundColor: COLORS.background.tertiary,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  annualRewardsTitle: {
    fontSize: 13,
    color: COLORS.text.secondary,
    marginBottom: 8,
    fontWeight: '600',
  },
  annualRewardItem: {
    fontSize: 13,
    color: '#4ade80',
    fontWeight: '600',
    marginBottom: 4,
  },

  // Coworkers Section
  coworkersSection: {
    backgroundColor: COLORS.background.tertiary,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  coworkersTitle: {
    fontSize: 13,
    color: COLORS.text.secondary,
    marginBottom: 10,
    fontWeight: '600',
  },
  coworkerCard: {
    backgroundColor: COLORS.background.secondary,
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  coworkerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  coworkerEmoji: {
    fontSize: 32,
    marginRight: 10,
  },
  coworkerInfo: {
    flex: 1,
  },
  coworkerName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  coworkerRole: {
    fontSize: 11,
    color: COLORS.text.secondary,
    fontStyle: 'italic',
  },
  relationshipBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  relationshipBarOuter: {
    flex: 1,
    height: 12,
    backgroundColor: '#2a2a3e',
    borderRadius: 6,
    overflow: 'hidden',
    marginRight: 8,
  },
  relationshipBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  relationshipValue: {
    fontSize: 11,
    color: COLORS.text.secondary,
    fontWeight: 'bold',
    width: 40,
    textAlign: 'right',
  },
  coworkerChatButton: {
    backgroundColor: COLORS.accent.bronze,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  coworkerChatButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text.primary,
  },

  resignButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  resignButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },

  // ========== AVAILABLE JOBS ==========
  jobCard: {
    backgroundColor: COLORS.background.secondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.accent.bronze,
  },
  jobCardDisabled: {
    opacity: 0.5,
  },
  jobHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  jobEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    flex: 1,
  },
  jobDescription: {
    fontSize: 13,
    color: COLORS.text.secondary,
    marginBottom: 12,
    lineHeight: 18,
  },
  grayedOut: {
    opacity: 0.6,
  },
  jobRequirements: {
    backgroundColor: COLORS.background.tertiary,
    padding: 10,
    borderRadius: 6,
    marginBottom: 8,
  },
  jobRequirementsLabel: {
    fontSize: 11,
    color: COLORS.text.secondary,
    marginBottom: 4,
  },
  jobRequirementsText: {
    fontSize: 12,
    color: COLORS.accent.gold,
    fontWeight: '600',
  },
  requirementsFailed: {
    color: COLORS.feedback.error,
  },
  jobRewards: {
    backgroundColor: COLORS.background.tertiary,
    padding: 10,
    borderRadius: 6,
    marginBottom: 12,
  },
  jobRewardsLabel: {
    fontSize: 11,
    color: COLORS.text.secondary,
    marginBottom: 6,
  },
  jobRewardItem: {
    fontSize: 12,
    color: '#4ade80',
    fontWeight: '600',
    marginBottom: 2,
  },
  jobButton: {
    backgroundColor: COLORS.accent.gold,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  jobButtonDisabled: {
    backgroundColor: COLORS.background.tertiary,
    opacity: 0.6,
  },
  jobButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.background.primary,
  },

  // ========== CLASSMATES ==========
  classmatesButton: {
    backgroundColor: COLORS.accent.bronze,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  classmatesButtonDisabled: {
    opacity: 0.5,
  },
  classmatesButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
  },

  // ========== COWORKER INTERACTION HINT ==========
  tapToInteractHint: {
    fontSize: 11,
    color: COLORS.accent.gold,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },

  // ========== COLLEAGUE INTERACTION MODAL ==========
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalScrollView: {
    flex: 1,
    width: '100%',
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: COLORS.background.secondary,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.accent.gold,
    padding: 20,
    width: '100%',
    maxWidth: 500,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.accent.bronze,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modalEmoji: {
    fontSize: 48,
    marginRight: 12,
  },
  modalName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  modalRole: {
    fontSize: 13,
    color: COLORS.text.secondary,
    fontStyle: 'italic',
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.background.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseButtonText: {
    fontSize: 18,
    color: COLORS.text.secondary,
    fontWeight: 'bold',
  },
  modalRelationshipSection: {
    marginBottom: 20,
    padding: 12,
    backgroundColor: COLORS.background.tertiary,
    borderRadius: 8,
  },
  modalSectionLabel: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginBottom: 8,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  modalRelationshipBar: {
    height: 16,
    backgroundColor: '#2a2a3e',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 6,
  },
  modalRelationshipFill: {
    height: '100%',
    borderRadius: 8,
  },
  modalRelationshipValue: {
    fontSize: 13,
    color: COLORS.text.primary,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalStatsSection: {
    marginBottom: 20,
    padding: 12,
    backgroundColor: COLORS.background.tertiary,
    borderRadius: 8,
  },
  modalStatsGrid: {
    gap: 10,
  },
  modalStatItem: {
    marginBottom: 8,
  },
  modalStatLabel: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginBottom: 4,
    fontWeight: '600',
  },
  modalStatBar: {
    height: 10,
    backgroundColor: '#2a2a3e',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 4,
  },
  modalStatBarFill: {
    height: '100%',
    backgroundColor: COLORS.accent.gold,
    borderRadius: 5,
  },
  modalStatValue: {
    fontSize: 13,
    color: COLORS.text.primary,
    fontWeight: 'bold',
  },
  modalActionCategory: {
    marginBottom: 20,
    padding: 12,
    backgroundColor: COLORS.background.tertiary,
    borderRadius: 8,
  },
  modalCategoryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.accent.gold,
    marginBottom: 12,
  },
  modalCategoryTitleHostile: {
    color: '#ef4444',
  },
  modalActionButton: {
    backgroundColor: COLORS.background.secondary,
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.accent.bronze,
  },
  modalActionButtonDisabled: {
    opacity: 0.4,
  },
  modalActionButtonHostile: {
    borderColor: '#ef4444',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  modalActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  modalActionEffect: {
    fontSize: 11,
    color: COLORS.text.secondary,
    fontStyle: 'italic',
  },
  modalCancelButton: {
    backgroundColor: COLORS.background.tertiary,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  modalCancelButtonText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    fontWeight: '600',
  },
});
