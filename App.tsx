import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import FooterMenu from './src/components/FooterMenu';
import OccupationView from './src/components/OccupationView';
import RelationshipsView from './src/components/RelationshipsView';
import COLORS from './src/constants/colors';
import { getChildhoodEventByClass, type ChildhoodEvent } from './src/data/childhoodEventsByClass';
import { didEraChange, getCurrentEra } from './src/data/eras';
import { checkHistoricalEvent, type HistoricalEvent } from './src/data/historicalEvents';
import { SIMPLE_RANDOM_EVENTS, filterChoicesForAge, getRandomEvent, type RandomEvent } from './src/data/randomEvents';
import type { Character, Era, RandomGameEvent } from './src/types/game.types';
import { generatePhysicalTraits, getAgeLabel, getAvatarEmoji, getPhysicalDescription } from './src/utils/avatar';
import { generateFamilyBackground, generateNameForClass, getSocialClassIcon, getSocialClassName } from './src/utils/socialClass';

import { EventModal } from './src/components/EventModal';
import SheetHeader from './src/components/SheetHeader';
import { ViewProvider, useViewContext } from './src/context/ViewContext';
import type { SimpleEvent } from './src/types/game.types';
import { generateClassmates, generateNewClassmateName } from './src/utils/classmates';
import { calculateMoneyResult } from './src/utils/moneyInteractions';
import { generateChatResult } from './src/utils/npcInteractions';

// === LOCALIZAÇÃO FIXA: INGLATERRA (1500) ===
const STARTING_LOCATION = {
  name: 'Inglaterra',
  description: 'Reino da Inglaterra - Era Tudor',
  context: 'Você nasce durante o reinado da dinastia Tudor.',
};

// === NOMES ALEATÓRIOS INGLESES ===
const ENGLISH_NAMES = {
  male: ['William', 'John', 'Henry', 'Edward', 'Thomas', 'Richard', 'George', 'Robert', 'James', 'Charles'],
  female: ['Elizabeth', 'Mary', 'Catherine', 'Anne', 'Margaret', 'Jane', 'Alice', 'Dorothy', 'Joan', 'Agnes'],
  surnames: ['Smith', 'Taylor', 'Brown', 'Wilson', 'Moore', 'Clark', 'White', 'Hall', 'Wood', 'Baker'],
};

// === MINI-GAME: BATER CARTEIRA ===
function PickpocketGame({ difficulty, onFinish }: { difficulty: 'easy' | 'hard'; onFinish: (success: boolean) => void }) {
  const [cursorPos, setCursorPos] = useState(0);
  const [running, setRunning] = useState(true);
  const directionRef = useRef(1);
  const posRef = useRef(0);

  // Target zone: easy = 20% wide (40-60%), hard = 5% wide (47.5-52.5%)
  const targetStart = difficulty === 'easy' ? 40 : 47.5;
  const targetEnd = difficulty === 'easy' ? 60 : 52.5;
  const speed = difficulty === 'easy' ? 1.8 : 3;

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      posRef.current += directionRef.current * speed;
      if (posRef.current >= 100) {
        posRef.current = 100;
        directionRef.current = -1;
      } else if (posRef.current <= 0) {
        posRef.current = 0;
        directionRef.current = 1;
      }
      setCursorPos(posRef.current);
    }, 16);
    return () => clearInterval(interval);
  }, [running]);

  const handleTap = () => {
    if (!running) return;
    setRunning(false);
    const hit = posRef.current >= targetStart && posRef.current <= targetEnd;
    setTimeout(() => onFinish(hit), 600);
  };

  return (
    <View style={miniStyles.overlay}>
      <View style={miniStyles.container}>
        <Text style={miniStyles.title}>🗡️ Bater Carteira</Text>
        <Text style={miniStyles.instruction}>
          {difficulty === 'easy' ? 'Alvo fácil — acerte a zona verde!' : 'Alvo difícil — precisão necessária!'}
        </Text>

        {/* Bar */}
        <View style={miniStyles.barOuter}>
          {/* Target zone */}
          <View style={[miniStyles.targetZone, { left: `${targetStart}%`, width: `${targetEnd - targetStart}%` }]} />
          {/* Cursor */}
          <View style={[miniStyles.cursor, { left: `${cursorPos}%` }]} />
        </View>

        {/* Result feedback */}
        {!running && (
          <Text style={[miniStyles.resultText, {
            color: (posRef.current >= targetStart && posRef.current <= targetEnd) ? '#4ade80' : '#ef4444',
          }]}>
            {(posRef.current >= targetStart && posRef.current <= targetEnd) ? 'SUCESSO!' : 'FALHOU!'}
          </Text>
        )}

        {/* Action button */}
        {running && (
          <TouchableOpacity style={miniStyles.tapButton} onPress={handleTap} activeOpacity={0.7}>
            <Text style={miniStyles.tapButtonText}>TENTAR AGORA!</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function PoachingGame({ onFinish }: { onFinish: (success: boolean) => void }) {
  const [progress, setProgress] = useState(0);
  const [alert, setAlert] = useState(0);
  const [holding, setHolding] = useState(false);
  const [finished, setFinished] = useState(false);
  const holdingRef = useRef(false);
  const progressRef = useRef(0);
  const alertRef = useRef(0);
  const finishedRef = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => {
      if (finishedRef.current) return;

      if (holdingRef.current) {
        progressRef.current = Math.min(100, progressRef.current + 0.5);
        alertRef.current = Math.min(100, alertRef.current + 1.5);
      } else {
        alertRef.current = Math.max(0, alertRef.current - 1.0);
      }

      setProgress(progressRef.current);
      setAlert(alertRef.current);

      if (alertRef.current >= 100) {
        finishedRef.current = true;
        setFinished(true);
        setTimeout(() => onFinish(false), 800);
      } else if (progressRef.current >= 100) {
        finishedRef.current = true;
        setFinished(true);
        setTimeout(() => onFinish(true), 800);
      }
    }, 16);
    return () => clearInterval(interval);
  }, []);

  const handlePressIn = () => {
    if (finishedRef.current) return;
    holdingRef.current = true;
    setHolding(true);
  };

  const handlePressOut = () => {
    holdingRef.current = false;
    setHolding(false);
  };

  const won = finished && progressRef.current >= 100;
  const lost = finished && alertRef.current >= 100;

  return (
    <View style={miniStyles.overlay}>
      <View style={miniStyles.container}>
        <Text style={miniStyles.title}>🦌 Caça Ilegal</Text>
        <Text style={miniStyles.instruction}>
          Segure o botão para esfolar. Solte quando o alerta subir!
        </Text>

        {/* Progress bar */}
        <Text style={poachStyles.barLabel}>🥩 Progresso</Text>
        <View style={poachStyles.barOuter}>
          <View style={[poachStyles.barFill, { width: `${progress}%`, backgroundColor: '#4ade80' }]} />
        </View>

        {/* Alert bar */}
        <Text style={poachStyles.barLabel}>🚨 Alerta do Guarda</Text>
        <View style={poachStyles.barOuter}>
          <View style={[poachStyles.barFill, { width: `${alert}%`, backgroundColor: alert > 70 ? '#ef4444' : '#fbbf24' }]} />
        </View>

        {/* Result feedback */}
        {finished && (
          <Text style={[miniStyles.resultText, { color: won ? '#4ade80' : '#ef4444' }]}>
            {won ? 'SUCESSO!' : 'PEGO!'}
          </Text>
        )}

        {/* Hold button */}
        {!finished && (
          <TouchableOpacity
            style={[miniStyles.tapButton, holding && poachStyles.buttonHolding]}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            activeOpacity={0.8}
          >
            <Text style={miniStyles.tapButtonText}>
              {holding ? 'ESFOLANDO...' : 'ESFOLAR'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const poachStyles = StyleSheet.create({
  barLabel: {
    fontSize: 12,
    color: '#aaa',
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  barOuter: {
    width: '100%',
    height: 20,
    backgroundColor: '#2a2a3e',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 14,
  },
  barFill: {
    height: '100%',
    borderRadius: 6,
  },
  buttonHolding: {
    backgroundColor: '#e8b84c',
    transform: [{ scale: 0.95 }],
  },
});

const miniStyles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  container: {
    width: '85%',
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#c9a84c',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#c9a84c',
    marginBottom: 8,
  },
  instruction: {
    fontSize: 13,
    color: '#aaa',
    marginBottom: 24,
    textAlign: 'center',
  },
  barOuter: {
    width: '100%',
    height: 40,
    backgroundColor: '#2a2a3e',
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 20,
  },
  targetZone: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(74, 222, 128, 0.3)',
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderColor: '#4ade80',
  },
  cursor: {
    position: 'absolute',
    top: 2,
    bottom: 2,
    width: 4,
    backgroundColor: '#ffffff',
    borderRadius: 2,
    marginLeft: -2,
  },
  resultText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  tapButton: {
    backgroundColor: '#c9a84c',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 10,
  },
  tapButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
});

function AppContent() {
  // === VIEW CONTEXT ===
  const { currentView, setCurrentView } = useViewContext();

  // === ESTADO DO JOGO ===
  const [character, setCharacter] = useState<Character | null>(null);
  const [gameLog, setGameLog] = useState<string[]>([]);
  const [currentEvent, setCurrentEvent] = useState<any>(null);
  const [waitingForChoice, setWaitingForChoice] = useState(false);
  const [eventModal, setEventModal] = useState<{ isOpen: boolean; event?: SimpleEvent }>({ isOpen: false });
  const [simpleEvent, setSimpleEvent] = useState<RandomGameEvent | null>(null);

  // === NPC REACTIVE EVENTS ===
  const [npcEvent, setNpcEvent] = useState<{ isOpen: boolean; coworkerId?: string; coworkerName?: string; eventType?: string; event?: SimpleEvent }>({ isOpen: false });

  // === NASCIMENTO DE IRMÃO ===
  const [siblingBirthModal, setSiblingBirthModal] = useState<{ isOpen: boolean; name?: string; gender?: string }>({ isOpen: false });
  const pendingEventsCharRef = useRef<Character | null>(null);

  // === MINI-GAME ===
  const [showMiniGame, setShowMiniGame] = useState(false);
  const [miniGameDifficulty, setMiniGameDifficulty] = useState<'easy' | 'hard'>('easy');
  const [showPoachingGame, setShowPoachingGame] = useState(false);
  const [crimeStrikeCount, setCrimeStrikeCount] = useState(0);
  const pendingCrimeAction = useRef<((success: boolean) => void) | null>(null);
  const pendingPoachingAction = useRef<((success: boolean) => void) | null>(null);

  // === AUTO-SCROLL LOG ===
  const scrollViewRef = useRef<ScrollView>(null);

  // === INICIALIZAR JOGO ===
  useEffect(() => {
    startNewLife();
  }, []);

  // === AUTO-SCROLL LOG QUANDO ATUALIZADO ===
  useEffect(() => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  }, [gameLog]);

  // === GERAR STATS DE NPC ===
  const generateNPCStats = (socialClass: string) => {
    const randRange = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));
    let honor: number;
    let money: number;
    switch (socialClass) {
      case 'nobility':
        honor = randRange(70, 100);
        money = randRange(500, 1000);
        break;
      case 'gentry':
        honor = randRange(50, 80);
        money = randRange(100, 300);
        break;
      case 'artisan':
        honor = randRange(30, 60);
        money = randRange(50, 200);
        break;
      default: // peasant
        honor = randRange(10, 40);
        money = randRange(0, 25);
        break;
    }
    return {
      vitality: randRange(50, 100),
      faith: randRange(20, 100),
      strength: randRange(20, 80),
      honor,
      money,
    };
  };

  // === CRIAR NOVO PERSONAGEM ===
  const startNewLife = () => {
    // Inglaterra como localização fixa
    const location = STARTING_LOCATION;

    // Escolhe gênero
    const gender = Math.random() > 0.5 ? 'male' : 'female';

    // Gera características físicas permanentes
    const physicalTraits = generatePhysicalTraits();

    // Gera background familiar (determina classe social e recursos)
    const familyBg = generateFamilyBackground(gender, '');

    // Gera nome apropriado para a classe social
    const { firstName, surname } = generateNameForClass(gender, familyBg.socialClass);

    const era = getCurrentEra(location.name, 1500);

    const newCharacter: Character = {
      name: firstName,
      surname: surname,
      age: 0,
      gender: gender,
      health: 70 + Math.floor(Math.random() * 21),   // 70-90 (frágil)
      sanity: 100,
      honor: Math.floor(Math.random() * 11),          // 0-10 (neutro)
      intelligence: 0,
      faith: 0,                                        // aprendido depois
      strength: Math.floor(Math.random() * 6),         // 0-5 (fraco)
      money: 0,
      food: 0,
      relationships: [],
      traits: [],
      location: location.name,
      birthYear: 1500,
      currentYear: 1500,
      era: (era?.id as Era) || 'tudor',
      physicalTraits: physicalTraits,
      socialClass: familyBg.socialClass, // Classe social
      family: {
        fatherName: familyBg.fatherName,
        fatherOccupation: familyBg.fatherOccupation,
        fatherRelationship: 75,
        fatherAge: 25 + Math.floor(Math.random() * 10),
        fatherAlive: true,
        fatherStats: generateNPCStats(familyBg.socialClass),
        motherName: familyBg.motherName,
        motherDescription: familyBg.motherDescription,
        motherRelationship: 85,
        motherAge: 20 + Math.floor(Math.random() * 8),
        motherAlive: true,
        motherStats: generateNPCStats(familyBg.socialClass),
        isAlive: true,
      },
      narrativeFlags: {
        isOrphan: false,
        hasApprentice: false,
        livingWith: 'parents',
        lastMajorEvent: undefined,
      },
      usedChildhoodEvents: [],
      siblings: [],
      classmates: [],
      eventLog: [{ year: 1500, entries: [] }],
      npcInteractionHistory: [],
      activityHistory: {},
      inventory: [],
      currentJob: null,
    };

    setCharacter(newCharacter);
    setGameLog([
      `Nasceu ${firstName} ${surname}, um(a) ${gender === 'male' ? 'menino' : 'menina'}.`,
      `👤 Aparência: ${getPhysicalDescription(physicalTraits)}`,
      ``,
      `${getSocialClassIcon(familyBg.socialClass)} Classe Social: ${getSocialClassName(familyBg.socialClass)}`,
      `👨 Seu pai: ${familyBg.fatherName}, ${familyBg.fatherOccupation}`,
      `👩 Sua mãe: ${familyBg.motherName}, ${familyBg.motherDescription}`,
      ``,
      `🏠 Sua família vive em ${familyBg.housing}.`,
      `${familyBg.familyDescription}`,
      ``,
      `📍 Ano: 1500 - ${location.description}`,
      `⚡ ${era?.name || 'Era Tudor'}`,
    ]);
    setCurrentEvent(null);
    setWaitingForChoice(false);
  };

  // === PROCESSAR ENVELHECIMENTO DE FAMÍLIA ===
  const processFamilyTurn = (char: Character) => {
    const randRange = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));
    const deathMessages: string[] = [];

    // === ATUALIZAR FAMÍLIA ===
    let updatedFamily = { ...char.family };

    // Pai
    if (updatedFamily.fatherAlive) {
      updatedFamily.fatherAge = (updatedFamily.fatherAge || 30) + 1;

      if (updatedFamily.fatherStats) {
        const stats = { ...updatedFamily.fatherStats };
        const age = updatedFamily.fatherAge;

        // Vitality: decreases with age
        const vitalityDecay = age > 50 ? randRange(5, 15) : randRange(0, 5);
        stats.vitality = Math.max(0, stats.vitality - vitalityDecay);

        // Strength: grows until 30, then declines
        if (age < 30) {
          stats.strength = Math.min(100, stats.strength + randRange(0, 5));
        } else if (age > 50) {
          stats.strength = Math.max(0, stats.strength - randRange(2, 8));
        }

        // Faith/Honor: small random fluctuation
        stats.faith = Math.max(0, Math.min(100, stats.faith + randRange(-2, 2)));
        stats.honor = Math.max(0, Math.min(100, stats.honor + randRange(-2, 2)));

        // Money: income if working age (13+)
        if (age >= 13) {
          const income = char.socialClass === 'nobility' ? 100
            : char.socialClass === 'gentry' ? 50
              : char.socialClass === 'artisan' ? 20
                : 5; // peasant
          stats.money += income;

          // Random expense chance (20%)
          if (Math.random() < 0.2) {
            const expense = randRange(5, 20);
            stats.money = Math.max(0, stats.money - expense);
          }
        }

        updatedFamily.fatherStats = stats;

        // Death check
        if (stats.vitality <= 0 || age > 100) {
          updatedFamily.fatherAlive = false;
          deathMessages.push(`💀 Tristeza! Seu pai ${updatedFamily.fatherName} faleceu de causas naturais aos ${age} anos.`);
        }
      }
    }

    // Mãe
    if (updatedFamily.motherAlive) {
      updatedFamily.motherAge = (updatedFamily.motherAge || 28) + 1;

      if (updatedFamily.motherStats) {
        const stats = { ...updatedFamily.motherStats };
        const age = updatedFamily.motherAge;

        // Vitality: decreases with age
        const vitalityDecay = age > 50 ? randRange(5, 15) : randRange(0, 5);
        stats.vitality = Math.max(0, stats.vitality - vitalityDecay);

        // Strength: grows until 30, then declines
        if (age < 30) {
          stats.strength = Math.min(100, stats.strength + randRange(0, 5));
        } else if (age > 50) {
          stats.strength = Math.max(0, stats.strength - randRange(2, 8));
        }

        // Faith/Honor: small random fluctuation
        stats.faith = Math.max(0, Math.min(100, stats.faith + randRange(-2, 2)));
        stats.honor = Math.max(0, Math.min(100, stats.honor + randRange(-2, 2)));

        // Money: income if working age (13+)
        if (age >= 13) {
          const income = char.socialClass === 'nobility' ? 100
            : char.socialClass === 'gentry' ? 50
              : char.socialClass === 'artisan' ? 20
                : 5; // peasant
          stats.money += income;

          // Random expense chance (20%)
          if (Math.random() < 0.2) {
            const expense = randRange(5, 20);
            stats.money = Math.max(0, stats.money - expense);
          }
        }

        updatedFamily.motherStats = stats;

        // Death check
        if (stats.vitality <= 0 || age > 100) {
          updatedFamily.motherAlive = false;
          deathMessages.push(`💀 Tristeza! Sua mãe ${updatedFamily.motherName} faleceu de causas naturais aos ${age} anos.`);
        }
      }
    }

    // Atualiza isAlive se ambos morreram
    if (!updatedFamily.fatherAlive && !updatedFamily.motherAlive) {
      updatedFamily.isAlive = false;
    }

    // === ATUALIZAR IRMÃOS ===
    const updatedSiblings = char.siblings.map((sibling) => {
      const newSibling = { ...sibling, age: sibling.age + 1 };

      if (newSibling.stats) {
        const stats = { ...newSibling.stats };
        const age = newSibling.age;

        // Vitality: decreases with age
        const vitalityDecay = age > 50 ? randRange(5, 15) : randRange(0, 5);
        stats.vitality = Math.max(0, stats.vitality - vitalityDecay);

        // Strength: grows until 30, then declines
        if (age < 30) {
          stats.strength = Math.min(100, stats.strength + randRange(0, 5));
        } else if (age > 50) {
          stats.strength = Math.max(0, stats.strength - randRange(2, 8));
        }

        // Faith/Honor: small random fluctuation
        stats.faith = Math.max(0, Math.min(100, stats.faith + randRange(-2, 2)));
        stats.honor = Math.max(0, Math.min(100, stats.honor + randRange(-2, 2)));

        // Money: income if working age (13+)
        if (age >= 13) {
          const income = char.socialClass === 'nobility' ? 100
            : char.socialClass === 'gentry' ? 50
              : char.socialClass === 'artisan' ? 20
                : 5; // peasant
          stats.money += income;

          // Random expense chance (20%)
          if (Math.random() < 0.2) {
            const expense = randRange(5, 20);
            stats.money = Math.max(0, stats.money - expense);
          }
        }

        newSibling.stats = stats;

        // Death check
        if (stats.vitality <= 0 || age > 100) {
          deathMessages.push(`💀 Tristeza! Seu irmão ${newSibling.name} faleceu de causas naturais aos ${age} anos.`);
          return null; // Mark for removal
        }
      }

      return newSibling;
    }).filter((s) => s !== null) as typeof char.siblings;

    return { updatedFamily, updatedSiblings, deathMessages };
  };

  // === HANDLER PARA ESCOLHAS DE EVENTOS NPC ===
  const handleNpcEventChoice = (choiceId: string) => {
    if (!npcEvent.coworkerId || !npcEvent.event) return;

    const choice = npcEvent.event.choices.find(c => c.id === choiceId);
    if (!choice) return;

    const stats = choice.stats || {};
    let logMessage = '';
    let logType: 'success' | 'fail' | 'neutral' = 'neutral';

    // Get current character from state
    const currentChar = character;

    // Process special cases
    if (choiceId === 'HELP_YES') {
      logMessage = `🤝 Você ajudou ${npcEvent.coworkerName} a terminar as tarefas. Vocês trabalharam lado a lado até tarde, e agora ${npcEvent.coworkerName} é mais leal a você.`;
      logType = 'success';
    } else if (choiceId === 'HELP_NO') {
      logMessage = `❌ Você recusou ajudar ${npcEvent.coworkerName}. Eles pareceram desapontados e continuaram trabalhando sozinhos.`;
      logType = 'neutral';
    } else if (choiceId === 'TAVERN_YES') {
      logMessage = `🍺 Você foi à taverna com ${npcEvent.coworkerName}. Beberam, riram e fortaleceram sua amizade. Na manhã seguinte, a ressaca lembrou você do preço da diversão.`;
      logType = 'success';
    } else if (choiceId === 'TAVERN_NO') {
      logMessage = `🏠 Você recusou o convite de ${npcEvent.coworkerName} e foi direto para casa. Eles pareceram um pouco chateados.`;
      logType = 'neutral';
    } else if (choiceId === 'CONFRONT') {
      // Confrontation with potential fight
      const playerStrength = character?.strength || 50;
      const enemyStrength = Math.floor(Math.random() * 40) + 40;

      if (playerStrength > enemyStrength) {
        logMessage = `⚔️ Você confrontou ${npcEvent.coworkerName} pelos rumores. A discussão escalou para uma briga, mas você venceu e forçou uma retratação pública. Sua honra foi restaurada.`;
        logType = 'success';
        stats.honor = 10;
      } else {
        logMessage = `⚔️ Você tentou confrontar ${npcEvent.coworkerName}, mas perdeu a briga. Os rumores pioraram e sua reputação sofreu ainda mais.`;
        logType = 'fail';
        stats.honor = -20;
        stats.health = -15;
      }
    } else if (choiceId === 'IGNORE') {
      logMessage = `🙏 Você ignorou os rumores espalhados por ${npcEvent.coworkerName}, confiando que a verdade prevaleceria. Sua fé se fortaleceu, mas alguns ainda acreditam nas mentiras.`;
      logType = 'neutral';
    } else if (choiceId === 'LEND_MONEY') {
      if (currentChar && currentChar.money >= 5) {
        logMessage = `💰 Você emprestou 5 moedas para ${npcEvent.coworkerName}. Eles ficaram profundamente gratos e prometeram lembrar de sua bondade.`;
        logType = 'success';
      } else {
        logMessage = `💰 Você não tem moedas suficientes para emprestar a ${npcEvent.coworkerName}.`;
        logType = 'fail';
        // Close modal and continue flow without applying money changes
        stats.money = 0;
        stats.relationship = -5;
        stats.honor = 0;
      }
    } else if (choiceId === 'REFUSE_MONEY') {
      logMessage = `🚫 Você recusou emprestar dinheiro a ${npcEvent.coworkerName}. Eles pareceram desapontados e se afastaram em silêncio.`;
      logType = 'fail';
    }

    // Apply stat changes and get updated character
    let updatedChar: Character | null = null;

    setCharacter(prev => {
      if (!prev || !prev.currentJob || !prev.currentJob.coworkers) return prev;

      // Update coworker relationship
      const updatedCoworkers = prev.currentJob.coworkers.map(c => {
        if (c.id === npcEvent.coworkerId) {
          return {
            ...c,
            relationship: Math.max(0, Math.min(100, c.relationship + (stats.relationship || 0)))
          };
        }
        return c;
      });

      updatedChar = {
        ...prev,
        currentJob: { ...prev.currentJob, coworkers: updatedCoworkers },
        health: Math.max(0, Math.min(100, prev.health + (stats.health || 0))),
        honor: Math.max(0, Math.min(100, prev.honor + (stats.honor || 0))),
        money: Math.max(0, prev.money + (stats.money || 0)),
        faith: Math.max(0, Math.min(100, (prev.faith || 0) + (stats.faith || 0))),
      };

      return updatedChar;
    });

    // Add log
    addLog(`\n${logMessage}\n`);
    addToEventLog(logMessage, logType);

    // Close modal
    setNpcEvent({ isOpen: false });

    // Continue with rest of ageUp flow
    setTimeout(() => {
      if (updatedChar) {
        checkForEvents(updatedChar);
      }
    }, 100);
  };

  // === GERAR EVENTOS REATIVOS DE COLEGAS ===
  const generateCoworkerReactiveEvent = (coworker: any): SimpleEvent | null => {
    const eventTypes = ['HELP_REQUEST', 'SOCIAL_INVITE', 'RUMOR_SLANDER', 'MONEY_REQUEST'];
    const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];

    switch (eventType) {
      case 'HELP_REQUEST':
        return {
          title: '🤝 Pedido de Ajuda',
          description: `${coworker.name} se aproxima de você ao final do dia, parecendo exausto.\n\n"${character?.name}, estou sobrecarregado com as tarefas. Você poderia me ajudar a terminar isso antes do supervisor chegar?"`,
          choices: [
            {
              id: 'HELP_YES',
              text: '✅ Sim, vou ajudar',
              preview: '-10 Vitalidade | +15 Relacionamento',
              stats: { health: -10, relationship: 15 }
            },
            {
              id: 'HELP_NO',
              text: '❌ Não, termine você mesmo',
              preview: '-5 Relacionamento',
              stats: { relationship: -5 }
            }
          ]
        };

      case 'SOCIAL_INVITE':
        return {
          title: '🍺 Convite para a Taverna',
          description: `${coworker.name} te para no caminho de casa.\n\n"Ei, ${character?.name}! Vamos à taverna hoje? Uns tragos nos farão bem depois deste dia árduo."`,
          choices: [
            {
              id: 'TAVERN_YES',
              text: '🍺 Aceitar o convite',
              preview: '-3 💰 | +10 Relacionamento | -5 Vitalidade (ressaca)',
              stats: { money: -3, relationship: 10, health: -5 }
            },
            {
              id: 'TAVERN_NO',
              text: '🏠 Recusar e ir para casa',
              preview: '-2 Relacionamento',
              stats: { relationship: -2 }
            }
          ]
        };

      case 'RUMOR_SLANDER':
        return {
          title: '😠 Rumores Maliciosos',
          description: `Um colega de trabalho te puxa de lado, preocupado.\n\n"${character?.name}, você precisa saber... ${coworker.name} anda espalhando mentiras sobre sua família pela cidade. Dizem que sua linhagem é desonrada!"`,
          choices: [
            {
              id: 'CONFRONT',
              text: '⚔️ Confrontar e exigir retratação',
              preview: 'Risco de briga | Pode restaurar Honra ou causar conflito',
              stats: { relationship: -20 }
            },
            {
              id: 'IGNORE',
              text: '🙏 Ignorar e ter fé na verdade',
              preview: '+5 Fé | -10 Honra (rumores persistem)',
              stats: { faith: 5, honor: -10, relationship: -5 }
            }
          ]
        };

      case 'MONEY_REQUEST':
        return {
          title: '💸 Pedido de Empréstimo',
          description: `${coworker.name} se aproxima discretamente durante o intervalo.\n\n"${character?.name}, estou numa situação difícil... Minha família precisa de comida urgente. Você poderia emprestar 5 moedas? Prometo devolver no próximo mês!"`,
          choices: [
            {
              id: 'LEND_MONEY',
              text: '💰 Emprestar 5 moedas',
              preview: '-5 💰 | +20 Relacionamento | +5 Honra',
              stats: { money: -5, relationship: 20, honor: 5 }
            },
            {
              id: 'REFUSE_MONEY',
              text: '🚫 Recusar o pedido',
              preview: '-10 Relacionamento',
              stats: { relationship: -10 }
            }
          ]
        };

      default:
        return null;
    }
  };

  // === AVANÇAR IDADE ===
  const ageUp = () => {
    if (!character || waitingForChoice) return;

    const newAge = character.age + 1;
    const newYear = character.currentYear + 1;

    // Verifica mudança de era
    const newEra = didEraChange(character.location, character.currentYear, newYear);
    if (newEra) {
      addLog(`\n⚡ ==== NOVA ERA ====`);
      addLog(`Você entrou na ${newEra.name}!`);
      addLog(`${newEra.description}`);
      addLog(`================\n`);
    }

    // Processar envelhecimento da família
    const { updatedFamily, updatedSiblings, deathMessages } = processFamilyTurn(character);

    // Atualiza ano, era, família e irmãos
    const updatedCharacter = {
      ...character,
      age: newAge,
      currentYear: newYear,
      era: (getCurrentEra(character.location, newYear)?.id as Era) || character.era,
      family: updatedFamily,
      siblings: updatedSiblings,
    };

    setCharacter(updatedCharacter);
    addLog(`→ Idade: ${newAge} anos | Ano: ${newYear}`);

    // Mostrar mensagens de morte
    deathMessages.forEach((msg) => {
      addLog(msg);
    });

    // Gerar colegas quando atinge 6 anos
    if (newAge === 6 && (!character.classmates || character.classmates.length === 0)) {
      const newClassmates = generateClassmates(character.socialClass);
      setCharacter((prev) => {
        if (!prev) return prev;
        return { ...prev, classmates: newClassmates };
      });
      addLog(`🎓 Você começou a conhecer outras crianças!`);
    }

    // Transição para vida adulta aos 13 anos
    if (newAge === 13) {
      addLog(`\n⚔️ ==== MAIORIDADE ====`);
      addLog(`Sua infância acabou. É hora de assumir responsabilidades reais e sustentar sua linhagem.`);
      addLog(`Novos trabalhos adultos estão disponíveis na aba Ocupação.`);
      addLog(`==================\n`);
    }

    // === PROCESSAR EFEITOS DO EMPREGO ATUAL ===
    if (updatedCharacter.currentJob) {
      const job = updatedCharacter.currentJob;

      // Apply annual job effects
      let newHealth = updatedCharacter.health + job.vitalityImpact;
      const newMoney = updatedCharacter.money + job.income;
      const newStrength = (updatedCharacter.strength || 0) + (job.strengthImpact || 0);
      const newHonor = updatedCharacter.honor + (job.honorImpact || 0);
      const newFaith = (updatedCharacter.faith || 0) + (job.faithImpact || 0);

      // Check for death by exhaustion
      if (newHealth <= 0) {
        addLog(`\n💀 ==== EXAUSTÃO FATAL ====`);
        addLog(`O trabalho como ${job.title} drenou suas últimas forças.`);
        addLog(`Você morreu de exaustão por trabalho escravo aos ${newAge} anos.`);
        addLog(`========================\n`);

        setTimeout(() => {
          Alert.alert(
            '💀 Morte por Exaustão',
            `${updatedCharacter.name} ${updatedCharacter.surname} morreu de exaustão trabalhando como ${job.title} aos ${newAge} anos.\n\nO trabalho árduo cobrou seu preço final.`,
            [{ text: 'Recomeçar', onPress: () => startNewLife() }]
          );
        }, 100);

        setCharacter({
          ...updatedCharacter,
          health: 0,
        });
        return;
      }

      // Apply effects
      updatedCharacter.health = Math.max(0, Math.min(100, newHealth));
      updatedCharacter.money = Math.max(0, newMoney);
      updatedCharacter.strength = Math.max(0, Math.min(100, newStrength));
      updatedCharacter.honor = Math.max(0, Math.min(100, newHonor));
      updatedCharacter.faith = Math.max(0, Math.min(100, newFaith));

      // Log annual work effects
      addLog(`\n💼 Trabalho: ${job.emoji} ${job.title}`);

      // Build experience summary
      const experienceGains = [];
      if (job.strengthImpact) experienceGains.push(`${Math.abs(job.strengthImpact)} de Força`);
      if (job.honorImpact) experienceGains.push(`${Math.abs(job.honorImpact)} de Honra`);
      if (job.faithImpact) experienceGains.push(`${Math.abs(job.faithImpact)} de Fé`);

      const experienceText = experienceGains.length > 0 ? ` e ${experienceGains.join(', ')} de experiência` : '';
      addLog(`  📈 Seu trabalho como ${job.title} rendeu ${job.income} moedas${experienceText}.`);

      // Detailed breakdown
      if (job.income > 0) addLog(`  💰 Salário recebido: ${job.income} moedas.`);
      if (job.vitalityImpact !== 0) {
        addLog(`  ❤️ O trabalho ${job.vitalityImpact > 0 ? 'revigorou' : 'desgastou'} sua vitalidade em ${Math.abs(job.vitalityImpact)} pontos.`);
      }
      if (job.strengthImpact) {
        addLog(`  💪 Força ${job.strengthImpact > 0 ? 'aumentou' : 'diminuiu'} em ${Math.abs(job.strengthImpact)} pontos.`);
      }
      if (job.honorImpact) {
        addLog(`  🛡 Honra ${job.honorImpact > 0 ? 'aumentou' : 'diminuiu'} em ${Math.abs(job.honorImpact)} pontos.`);
      }
      if (job.faithImpact) {
        addLog(`  ⛪ Fé ${job.faithImpact > 0 ? 'fortaleceu' : 'enfraqueceu'} em ${Math.abs(job.faithImpact)} pontos.`);
      }

      setCharacter(updatedCharacter);
    }

    // === NPC REACTIVE EVENTS (COWORKERS) ===
    // 20% chance for each coworker to trigger a reactive event
    if (updatedCharacter.currentJob && updatedCharacter.currentJob.coworkers && updatedCharacter.currentJob.coworkers.length > 0) {
      for (const coworker of updatedCharacter.currentJob.coworkers) {
        if (Math.random() < 0.20) { // 20% chance
          const reactiveEvent = generateCoworkerReactiveEvent(coworker);
          if (reactiveEvent) {
            // Store the event and coworker info
            setNpcEvent({
              isOpen: true,
              coworkerId: coworker.id,
              coworkerName: coworker.name,
              eventType: reactiveEvent.title,
              event: reactiveEvent
            });
            // Stop processing - only one event per turn
            return;
          }
        }
      }
    }

    // === NASCIMENTO DE IRMÃO ===
    // Chance de 15% se mãe viva e fértil (< 45 anos)
    if (updatedFamily.motherAlive && updatedFamily.motherAge < 45 && Math.random() < 0.15) {
      const isBoy = Math.random() > 0.5;
      const siblingNames = isBoy ? ENGLISH_NAMES.male : ENGLISH_NAMES.female;
      const siblingName = siblingNames[Math.floor(Math.random() * siblingNames.length)];

      const newSibling = {
        id: `sibling_${Date.now()}`,
        name: siblingName,
        gender: isBoy ? 'male' as const : 'female' as const,
        age: 0,
        relationship: 50,
        stats: generateNPCStats(updatedCharacter.socialClass),
      };

      const charWithSibling = {
        ...updatedCharacter,
        siblings: [...updatedCharacter.siblings, newSibling],
      };

      setCharacter(charWithSibling);
      addLog(`👶 Sua mãe deu à luz a um bebê saudável: ${siblingName}!`);

      // Mostrar modal e adiar checkForEvents
      pendingEventsCharRef.current = charWithSibling;
      setSiblingBirthModal({ isOpen: true, name: siblingName, gender: isBoy ? 'male' : 'female' });
      return;
    }

    // Verifica eventos (ordem de prioridade)
    checkForEvents(updatedCharacter);
  };

  // === VERIFICAR EVENTOS ===
  const checkForEvents = (char: Character) => {
    // 1. PRIORIDADE: Eventos Históricos
    const historicalEvent = checkHistoricalEvent(char.currentYear, char.location, char);
    if (historicalEvent) {
      showEventModal(historicalEvent, 'historical');
      return;
    }

    // 2. EVENTOS DE INFÂNCIA (0-12 anos)
    if (char.age <= 12) {
      const childhoodEvent = getChildhoodEventByClass(char);
      if (childhoodEvent) {
        // Registra evento como usado para evitar repetição
        setCharacter((prev) => prev ? {
          ...prev,
          usedChildhoodEvents: [...prev.usedChildhoodEvents, childhoodEvent.id],
        } : prev);
        showEventModal(childhoodEvent, 'childhood');
        return;
      }
    }

    // 3. Eventos Aleatórios da Era
    const era = getCurrentEra(char.location, char.currentYear);
    if (era) {
      const randomEvent = getRandomEvent(era.tags, char.age);
      if (randomEvent) {
        // Verifica condições adicionais do evento
        if (randomEvent.conditions) {
          const { gender, minMoney } = randomEvent.conditions;
          if (gender && char.gender !== gender) return continueNormalYear();
          if (minMoney && char.money < minMoney) return continueNormalYear();
        }
        // Filtra opções de trabalho para crianças pequenas
        const filteredEvent = {
          ...randomEvent,
          options: filterChoicesForAge(randomEvent.options, char.age),
        };
        showEventModal(filteredEvent, 'random');
        return;
      }
    }

    // 4. Nada aconteceu
    continueNormalYear();
  };

  // === ANO NORMAL (SEM EVENTOS) ===
  const continueNormalYear = () => {
    if (!character) {
      addLog(`Você passou mais um ano. A vida continua.`);
      return;
    }

    if (Math.random() < 1.0) {
      // Filtra eventos válidos para idade e classe
      const availableEvents = SIMPLE_RANDOM_EVENTS.filter((event) => {
        if (event.minAge && character.age < event.minAge) return false;
        if (event.maxAge && character.age > event.maxAge) return false;
        if (event.socialClasses && !event.socialClasses.includes(character.socialClass)) return false;
        return true;
      });

      const fallback: RandomGameEvent = character.age <= 4
        ? { id: 'baby_calm', title: '😴 Dia Tranquilo', description: 'Você passou o dia no colo da sua mãe.', choices: [{ label: 'Dormir', consequence: 'Você dormiu tranquilamente.', effect: { vitality: 1 } }] }
        : { id: 'fallback', title: '☀️ Um dia comum', description: 'Nada de especial aconteceu hoje.', choices: [{ label: 'Continuar', consequence: 'Você seguiu com sua vida.', effect: {} }] };

      const randomEvent = availableEvents.length > 0
        ? availableEvents[Math.floor(Math.random() * availableEvents.length)]
        : fallback;

      setSimpleEvent(randomEvent);
      setWaitingForChoice(true);
      addLog(`\n${randomEvent.title}`);
      addLog(randomEvent.description);
    } else {
      addLog('Ano tranquilo sem grandes acontecimentos.');
    }
  };

  // === MOSTRAR MODAL DE EVENTO ===
  const showEventModal = (event: HistoricalEvent | RandomEvent | ChildhoodEvent, type: 'historical' | 'random' | 'childhood') => {
    setCurrentEvent(event);
    setWaitingForChoice(true);
    addLog(`\n${event.title}`);
    addLog(event.description);
  };

  // === ESCOLHER OPÇÃO DO EVENTO ===
  const chooseOption = (option: any) => {
    if (!character) return;

    const { result } = option;
    addLog(`→ ${option.text}`);
    addLog(result.message);

    // Aplicar mudanças
    const updatedChar = { ...character };

    if (result.healthChange) {
      updatedChar.health = Math.max(0, Math.min(100, updatedChar.health + result.healthChange));
      if (result.healthChange > 0) addLog(`  ❤️ +${result.healthChange} Vitalidade`);
      else addLog(`  ❤️ ${result.healthChange} Vitalidade`);
    }

    if (result.sanityChange) {
      updatedChar.sanity = Math.max(0, Math.min(100, updatedChar.sanity + result.sanityChange));
      if (result.sanityChange > 0) addLog(`  🧠 +${result.sanityChange} Sanidade`);
      else addLog(`  🧠 ${result.sanityChange} Sanidade`);
    }

    if (result.honorChange) {
      updatedChar.honor = Math.max(0, Math.min(100, updatedChar.honor + result.honorChange));
      if (result.honorChange > 0) addLog(`  🛡 +${result.honorChange} Honra`);
      else addLog(`  🛡 ${result.honorChange} Honra`);
    }

    if (result.intelligenceChange) {
      updatedChar.intelligence = Math.max(0, Math.min(100, updatedChar.intelligence + result.intelligenceChange));
      if (result.intelligenceChange > 0) addLog(`  📖 +${result.intelligenceChange} Inteligência`);
      else addLog(`  📖 ${result.intelligenceChange} Inteligência`);
    }

    if (result.faithChange && updatedChar.faith !== undefined) {
      updatedChar.faith = Math.max(0, Math.min(100, updatedChar.faith + result.faithChange));
      if (result.faithChange > 0) addLog(`  ⛪ +${result.faithChange} Fé`);
      else addLog(`  ⛪ ${result.faithChange} Fé`);
    }

    if (result.strengthChange && updatedChar.strength !== undefined) {
      updatedChar.strength = Math.max(0, Math.min(100, updatedChar.strength + result.strengthChange));
      if (result.strengthChange > 0) addLog(`  💪 +${result.strengthChange} Força`);
      else addLog(`  💪 ${result.strengthChange} Força`);
    }

    if (result.moneyChange) {
      updatedChar.money = Math.max(0, updatedChar.money + result.moneyChange);
      if (result.moneyChange > 0) addLog(`  💰 +$${result.moneyChange}`);
      else addLog(`  💰 -$${Math.abs(result.moneyChange)}`);
    }

    if (result.foodChange) {
      updatedChar.food = Math.max(0, updatedChar.food + result.foodChange);
      if (result.foodChange > 0) addLog(`  🍖 +${result.foodChange} Comida`);
      else addLog(`  🍖 ${result.foodChange} Comida`);
    }

    if (result.addTrait) {
      updatedChar.traits.push(result.addTrait);
      addLog(`  ✨ Traço adquirido: ${result.addTrait}`);
    }

    // Aplicar narrative flags
    if (result.setFlags) {
      updatedChar.narrativeFlags = {
        ...updatedChar.narrativeFlags,
        ...result.setFlags,
      };

      // Salvar evento como lastMajorEvent se for importante
      if (currentEvent && (currentEvent as any).category === 'danger') {
        updatedChar.narrativeFlags.lastMajorEvent = (currentEvent as any).id;
      }
    }

    // Adicionar irmão se evento criar um
    if (result.addSibling) {
      const siblingGender = Math.random() > 0.5 ? 'male' : 'female';
      const siblingNames = siblingGender === 'male'
        ? ENGLISH_NAMES.male
        : ENGLISH_NAMES.female;
      const siblingName = siblingNames[Math.floor(Math.random() * siblingNames.length)];

      updatedChar.siblings = [
        ...updatedChar.siblings,
        {
          id: `sibling_${Date.now()}`,
          name: siblingName,
          gender: siblingGender,
          age: 0,
          relationship: 100,
        },
      ];
      addLog(`  👶 Novo irmão: ${siblingName}`);
    }

    setCharacter(updatedChar);
    setCurrentEvent(null);
    setWaitingForChoice(false);

    // Verifica morte
    if (result.death || updatedChar.health === 0) {
      handleDeath(updatedChar, result.message);
    }
  };

  // === MORTE ===
  const handleDeath = (char: Character, message: string) => {
    addLog(`\n💀 GAME OVER`);
    addLog(`${char.name} ${char.surname} faleceu aos ${char.age} anos.`);

    setTimeout(() => {
      Alert.alert(
        '💀 Game Over',
        `${char.name} ${char.surname} morreu aos ${char.age} anos em ${char.location}.\n\n${message}\n\nSistema de sucessão em desenvolvimento.`,
        [{ text: 'Recomeçar', onPress: () => startNewLife() }]
      );
    }, 100);
  };

  // === LOG ===
  const addLog = (message: string) => {
    setGameLog((prev) => [...prev, message]);
  };

  // === LOG DE EVENTOS POR ANO ===
  const addToEventLog = (text: string, type: 'neutral' | 'success' | 'fail') => {
    if (!character) return;
    setCharacter((prev) => {
      if (!prev) return prev;
      const existingLog = prev.eventLog.find((log) => log.year === prev.currentYear);
      if (existingLog) {
        return {
          ...prev,
          eventLog: prev.eventLog.map((log) =>
            log.year === prev.currentYear
              ? { ...log, entries: [...log.entries, { text, type }] }
              : log
          ),
        };
      } else {
        return {
          ...prev,
          eventLog: [...prev.eventLog, { year: prev.currentYear, entries: [{ text, type }] }],
        };
      }
    });
  };

  // === INTERAÇÃO COM NPCs ===
  const handleNPCInteraction = (npcId: string, actionType: 'CHAT' | 'MONEY' | 'HELP_WORK' | 'ASK_TOY' | 'TANTRUM') => {
    if (!character) return;

    // Verificar se já interagiu com esse NPC neste ano (apenas para CHAT)
    if (actionType === 'CHAT') {
      const alreadyInteracted = character.npcInteractionHistory.some(
        (h) => h.year === character.currentYear && h.npcId === npcId && h.actionType === 'CHAT'
      );

      if (alreadyInteracted) {
        addLog(`❌ Você já conversou com essa pessoa este ano.`);
        addToEventLog('Você já conversou com essa pessoa este ano.', 'fail');
        return;
      }
    }

    // Encontrar o NPC
    let npcName = '';
    let npcRelationship = 50;
    let npcRoleLabel = '';

    if (npcId === 'father') {
      npcName = character.family.fatherName;
      npcRelationship = 75;
      npcRoleLabel = 'seu pai';
    } else if (npcId === 'mother') {
      npcName = character.family.motherName;
      npcRelationship = 85;
      npcRoleLabel = 'sua mãe';
    } else {
      const sibling = character.siblings.find((s) => s.id === npcId);
      if (sibling) {
        npcName = sibling.name;
        npcRelationship = sibling.relationship;
        npcRoleLabel = sibling.gender === 'male' ? 'seu irmão' : 'sua irmã';
      }
    }

    if (!npcName) return;

    if (actionType === 'CHAT') {
      const result = generateChatResult(npcName);
      addLog(`💬 ${result.text}`);
      addToEventLog(result.text, 'success');

      // Atualizar relação e adicionar ao histórico
      setCharacter((prev) => {
        if (!prev) return prev;

        let updatedFamily = prev.family;
        if (npcId === 'father') {
          updatedFamily = {
            ...prev.family,
            fatherRelationship: Math.min(100, (prev.family.fatherRelationship || 50) + result.relationshipChange),
          };
        } else if (npcId === 'mother') {
          updatedFamily = {
            ...prev.family,
            motherRelationship: Math.min(100, (prev.family.motherRelationship || 50) + result.relationshipChange),
          };
        }

        const updatedSiblings =
          npcId !== 'father' && npcId !== 'mother'
            ? prev.siblings.map((s) =>
              s.id === npcId
                ? { ...s, relationship: Math.min(100, s.relationship + result.relationshipChange) }
                : s
            )
            : prev.siblings;

        return {
          ...prev,
          family: updatedFamily,
          siblings: updatedSiblings,
          npcInteractionHistory: [
            ...prev.npcInteractionHistory,
            { year: prev.currentYear, npcId, actionType: 'CHAT' },
          ],
        };
      });

      console.log('Relação PAI:', character.family.fatherRelationship);
      console.log('Relação MÃE:', character.family.motherRelationship);
    } else if (actionType === 'MONEY') {
      const result = calculateMoneyResult(character.socialClass, npcRelationship, character.age);

      addLog(`💰 ${result.message}`);
      addToEventLog(result.message, result.success ? 'success' : 'fail');

      if (result.success) {
        setCharacter((prev) => {
          if (!prev) return prev;
          return { ...prev, money: prev.money + result.amount };
        });
      }
    } else if (actionType === 'HELP_WORK') {
      // Ajudar no Trabalho — age >= 6, peasant/artisan only
      const logMsg = `⚒️ Você ajudou ${npcRoleLabel} no trabalho. Foi cansativo, mas ficou orgulhoso(a) de você!`;
      addLog(logMsg);
      addToEventLog(logMsg, 'success');

      setCharacter((prev) => {
        if (!prev) return prev;
        let updatedFamily = prev.family;
        if (npcId === 'father') {
          updatedFamily = { ...prev.family, fatherRelationship: Math.min(100, (prev.family.fatherRelationship || 50) + 10) };
        } else if (npcId === 'mother') {
          updatedFamily = { ...prev.family, motherRelationship: Math.min(100, (prev.family.motherRelationship || 50) + 10) };
        }
        return {
          ...prev,
          health: Math.max(0, prev.health - 2),
          family: updatedFamily,
        };
      });

      // Redirecionar para DASHBOARD
      setCurrentView('DASHBOARD');
    } else if (actionType === 'ASK_TOY') {
      // Pedir Brinquedo — 80% denial if peasant
      const denialChance = character.socialClass === 'peasant' ? 0.8 : 0.2;
      const denied = Math.random() < denialChance;

      if (denied) {
        const logMsg = `🪀 Você pediu um brinquedo para ${npcRoleLabel}, mas ${character.socialClass === 'peasant' ? 'não há dinheiro para isso' : 'não foi desta vez'}.`;
        addLog(logMsg);
        addToEventLog(logMsg, 'fail');

        // Relação com pai/mãe diminui
        setCharacter((prev) => {
          if (!prev) return prev;
          let updatedFamily = prev.family;
          if (npcId === 'father') {
            updatedFamily = { ...prev.family, fatherRelationship: Math.max(0, (prev.family.fatherRelationship || 50) - 10) };
          } else if (npcId === 'mother') {
            updatedFamily = { ...prev.family, motherRelationship: Math.max(0, (prev.family.motherRelationship || 50) - 10) };
          }
          return { ...prev, family: updatedFamily };
        });
      } else {
        const toys = [
          { name: 'Boneco de Madeira', id: 'wooden_doll' },
          { name: 'Bola de Couro', id: 'leather_ball' },
          { name: 'Cavalinho de Pau', id: 'stick_horse' },
          { name: 'Pião', id: 'spinning_top' },
          { name: 'Boneca de Pano', id: 'rag_doll' },
        ];
        const toy = toys[Math.floor(Math.random() * toys.length)];
        const capitalRole = npcRoleLabel.charAt(0).toUpperCase() + npcRoleLabel.slice(1);
        const logMsg = `🪀 ${capitalRole} te deu um(a) ${toy.name}! Que alegria!`;
        addLog(logMsg);
        addToEventLog(logMsg, 'success');

        setCharacter((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            inventory: [...prev.inventory, { id: `${toy.id}_${Date.now()}`, name: toy.name, type: 'childhood' }],
          };
        });
      }

      // Redirecionar para DASHBOARD
      setCurrentView('DASHBOARD');
    } else if (actionType === 'TANTRUM') {
      // Fazer Birra — vitality -2, honor -2, parent relation -10
      const capitalRole = npcRoleLabel.charAt(0).toUpperCase() + npcRoleLabel.slice(1);
      const tantrumMessages = [
        `😤 Você fez uma birra enorme! Chorou e esperneou no chão.`,
        `😤 Você gritou e bateu os pés. ${capitalRole} ficou envergonhado(a).`,
        `😤 Você se jogou no chão e chorou até cansar.`,
      ];
      const logMsg = tantrumMessages[Math.floor(Math.random() * tantrumMessages.length)];
      addLog(logMsg);
      addToEventLog(logMsg, 'fail');

      setCharacter((prev) => {
        if (!prev) return prev;
        let updatedFamily = prev.family;
        if (npcId === 'father') {
          updatedFamily = { ...prev.family, fatherRelationship: Math.max(0, (prev.family.fatherRelationship || 50) - 10) };
        } else if (npcId === 'mother') {
          updatedFamily = { ...prev.family, motherRelationship: Math.max(0, (prev.family.motherRelationship || 50) - 10) };
        }
        return {
          ...prev,
          health: Math.max(0, prev.health - 2),
          honor: Math.max(0, prev.honor - 2),
          family: updatedFamily,
        };
      });

      // Redirecionar para DASHBOARD
      setCurrentView('DASHBOARD');
    }
  };

  // === GERAR COLEGAS DE TRABALHO ===
  const generateCoworkers = (jobTitle: string, socialClass: string): any[] => {
    const maleNames = ['Thomas', 'William', 'John', 'Richard', 'Henry', 'Robert', 'Edward'];
    const femaleNames = ['Mary', 'Elizabeth', 'Anne', 'Margaret', 'Catherine', 'Alice'];
    const surnames = ['o Veterano', 'o Jovem', 'da Cidade', 'do Campo', 'o Sábio', 'o Forte'];

    const roles: Record<string, string[]> = {
      peasant: ['Mestre', 'Veterano', 'Aprendiz'],
      artisan: ['Mestre Artesão', 'Supervisor', 'Companheiro'],
      gentry: ['Conselheiro Sênior', 'Colega Administrador', 'Assistente'],
      nobility: ['Nobre Veterano', 'Cortesão', 'Cavaleiro'],
    };

    const jobRoles = roles[socialClass] || roles.peasant;
    const coworkers = [];

    // Generate 2-3 coworkers randomly
    const numberOfCoworkers = Math.floor(Math.random() * 2) + 2; // Random: 2 or 3

    for (let i = 0; i < numberOfCoworkers; i++) {
      const isMan = Math.random() > 0.5;
      const firstName = isMan
        ? maleNames[Math.floor(Math.random() * maleNames.length)]
        : femaleNames[Math.floor(Math.random() * femaleNames.length)];
      const suffix = surnames[Math.floor(Math.random() * surnames.length)];
      const name = `${firstName} ${suffix}`;
      const role = jobRoles[i % jobRoles.length];

      coworkers.push({
        id: `coworker_${Date.now()}_${i}`,
        name,
        role,
        relationship: 50, // Neutral starting relationship
      });
    }

    return coworkers;
  };

  // === ACEITAR EMPREGO ===
  const handleTakeJob = (job: any) => {
    if (!character) return;

    // Generate coworkers for this job
    const coworkers = generateCoworkers(job.title, character.socialClass);
    const jobWithCoworkers = { ...job, coworkers };

    // IMMEDIATELY update character state
    setCharacter((prev) => {
      if (!prev) return prev;
      return { ...prev, currentJob: jobWithCoworkers };
    });

    // Add comprehensive log entry
    addLog(`\n💼 ==== NOVO EMPREGO ====`);
    addLog(`Você iniciou sua carreira como ${job.emoji} ${job.title}!`);
    addLog(`${job.description}`);
    addLog(`\n📊 Você receberá anualmente:`);
    if (job.income > 0) addLog(`  💰 +${job.income} moedas`);
    if (job.vitalityImpact !== 0) addLog(`  ❤️ ${job.vitalityImpact > 0 ? '+' : ''}${job.vitalityImpact} vitalidade`);
    if (job.strengthImpact) addLog(`  💪 ${job.strengthImpact > 0 ? '+' : ''}${job.strengthImpact} força`);
    if (job.honorImpact) addLog(`  🛡 ${job.honorImpact > 0 ? '+' : ''}${job.honorImpact} honra`);
    if (job.faithImpact) addLog(`  ⛪ ${job.faithImpact > 0 ? '+' : ''}${job.faithImpact} fé`);
    addLog(`\n👥 Colegas de Trabalho:`);
    coworkers.forEach((coworker) => {
      addLog(`  • ${coworker.name} - ${coworker.role}`);
    });
    addLog(`====================\n`);
    addToEventLog(`Empregado como ${job.title}`, 'success');

    // Switch to dashboard to show log immediately
    setCurrentView('DASHBOARD');
  };

  // === PEDIR DEMISSÃO ===
  const handleResignJob = () => {
    if (!character || !character.currentJob) return;

    const jobTitle = character.currentJob.title;

    setCharacter((prev) => {
      if (!prev) return prev;
      return { ...prev, currentJob: null };
    });

    addLog(`\n🚪 Você pediu demissão do cargo de ${jobTitle}.`);
    addLog(`Você está desempregado novamente.\n`);
    addToEventLog(`Demitiu-se de ${jobTitle}`, 'neutral');
  };

  // === INTERAÇÃO COM COLEGAS DE TRABALHO ===
  const handleCoworkerInteraction = (coworkerId: string, actionType: string) => {
    if (!character || !character.currentJob || !character.currentJob.coworkers) return;

    const coworker = character.currentJob.coworkers.find(c => c.id === coworkerId);
    if (!coworker) return;

    let relationshipChange = 0;
    let healthChange = 0;
    let honorChange = 0;
    let moneyChange = 0;
    let logMessage = '';
    let logType: 'neutral' | 'success' | 'fail' = 'neutral';

    switch (actionType) {
      // 🤝 AMIGÁVEIS
      case 'COMPLIMENT':
        relationshipChange = 5;
        logMessage = `😊 Você elogiou ${coworker.name}. Eles apreciaram suas palavras gentis.`;
        logType = 'success';
        break;

      case 'TAVERN':
        if (character.money >= 5) {
          moneyChange = -5;
          relationshipChange = 10;
          healthChange = -5;
          logMessage = `🍺 Você foi à taverna com ${coworker.name}. Vocês beberam e conversaram até tarde. (Ressaca: -5 Vitalidade)`;
          logType = 'success';
        } else {
          logMessage = `💰 Você não tem moedas suficientes para ir à taverna.`;
          logType = 'fail';
          return;
        }
        break;

      case 'GIFT':
        if (character.inventory.length > 0) {
          const randomItem = character.inventory[Math.floor(Math.random() * character.inventory.length)];
          relationshipChange = 15;
          logMessage = `🎁 Você deu "${randomItem.name}" para ${coworker.name}. Eles ficaram muito felizes!`;
          logType = 'success';
          // Remove item from inventory
          setCharacter(prev => {
            if (!prev) return prev;
            return { ...prev, inventory: prev.inventory.filter(item => item.id !== randomItem.id) };
          });
        } else {
          logMessage = `📦 Você não tem itens para dar de presente.`;
          logType = 'fail';
          return;
        }
        break;

      case 'LOAN':
        if (coworker.relationship > 80) {
          const loanAmount = Math.floor(Math.random() * 41) + 10; // 10-50
          moneyChange = loanAmount;
          relationshipChange = -5;
          logMessage = `💸 ${coworker.name} emprestou ${loanAmount} moedas para você. Você promete devolver em breve.`;
          logType = 'success';
        } else {
          logMessage = `🚫 ${coworker.name} não confia em você o suficiente para emprestar dinheiro.`;
          logType = 'fail';
          return;
        }
        break;

      // 💼 PROFISSIONAIS
      case 'PLEASE':
        honorChange = 5;
        healthChange = -10;
        relationshipChange = 3;
        logMessage = `🙇 Você agradou ${coworker.name}, fazendo todo o trabalho sujo. Sua reputação melhorou, mas você está exausto.`;
        logType = 'neutral';
        break;

      case 'HELP':
        if (coworker.relationship > 60) {
          relationshipChange = -10;
          logMessage = `🤝 ${coworker.name} concordou em ajudá-lo. Seu próximo ano de trabalho será mais leve.`;
          logType = 'success';
          // TODO: Add flag to reduce vitality cost on next age up
        } else {
          logMessage = `🚫 ${coworker.name} não está disposto a ajudá-lo ainda.`;
          logType = 'fail';
          return;
        }
        break;

      case 'REPORT':
        honorChange = 10;
        relationshipChange = -100; // Sets to 0 (enemy)
        logMessage = `📋 Você denunciou ${coworker.name} ao supervisor. Sua honra aumentou, mas agora você tem um inimigo mortal.`;
        logType = 'fail';
        break;

      // 🗡️ HOSTIS
      case 'INSULT':
        relationshipChange = -20;
        const fightChance = Math.random();
        if (fightChance < 0.3) { // 30% chance of fight
          const playerStrength = character.strength || 50;
          const enemyStrength = Math.floor(Math.random() * 40) + 40;
          if (playerStrength > enemyStrength) {
            honorChange = 5;
            healthChange = -10;
            logMessage = `😠 Você insultou ${coworker.name}. Uma briga começou e você venceu! Mas saiu ferido.`;
            logType = 'success';
          } else {
            honorChange = -10;
            healthChange = -20;
            logMessage = `😠 Você insultou ${coworker.name}. Uma briga começou e você levou uma surra!`;
            logType = 'fail';
          }
        } else {
          logMessage = `😠 Você insultou ${coworker.name}. Agora eles te odeiam.`;
          logType = 'fail';
        }
        break;

      case 'SABOTAGE':
        const sabotageSuccess = Math.random() > 0.5;
        if (sabotageSuccess) {
          relationshipChange = -30;
          logMessage = `🔧 Você sabotou o trabalho de ${coworker.name} sem ser descoberto. A reputação deles caiu.`;
          logType = 'success';
        } else {
          honorChange = -15;
          moneyChange = -20;
          relationshipChange = -50;
          logMessage = `🔧 Você foi pego sabotando! Perdeu honra, foi multado em 20 moedas, e agora é odiado.`;
          logType = 'fail';
        }
        break;

      case 'HERESY':
        if (character.currentYear >= 1500 && character.currentYear <= 1700) {
          relationshipChange = -50;
          honorChange = -10;
          logMessage = `⚠️ Você espalhou rumores de heresia sobre ${coworker.name}. A Inquisição pode investigá-los. Que Deus tenha misericórdia de sua alma.`;
          logType = 'fail';
        } else {
          logMessage = `⚠️ Rumores de heresia não têm peso nesta era.`;
          logType = 'fail';
          return;
        }
        break;

      case 'DUEL':
        const playerStrength = character.strength || 50;
        const enemyStrength = Math.floor(Math.random() * 60) + 30;
        const strengthDiff = playerStrength - enemyStrength;

        if (strengthDiff > 20) {
          // Victory
          honorChange = 20;
          healthChange = -15;
          relationshipChange = -100;
          logMessage = `⚔️ Você desafiou ${coworker.name} para um duelo e venceu! Sua honra aumentou, mas você foi ferido.`;
          logType = 'success';
        } else if (strengthDiff > 0) {
          // Close victory
          honorChange = 10;
          healthChange = -30;
          relationshipChange = -100;
          logMessage = `⚔️ Você venceu o duelo contra ${coworker.name}, mas foi uma batalha brutal. Você está gravemente ferido.`;
          logType = 'neutral';
        } else if (strengthDiff > -20) {
          // Narrow defeat
          honorChange = -15;
          healthChange = -40;
          relationshipChange = -100;
          logMessage = `⚔️ Você perdeu o duelo contra ${coworker.name}. Você está seriamente ferido e sua honra foi manchada.`;
          logType = 'fail';
        } else {
          // Decisive defeat - risk of death
          const survivalChance = Math.random();
          if (survivalChance > 0.3) {
            honorChange = -20;
            healthChange = -60;
            relationshipChange = -100;
            logMessage = `⚔️ Você foi brutalmente derrotado por ${coworker.name}. Você quase morreu e mal consegue se mover.`;
            logType = 'fail';
          } else {
            // TODO: Handle character death
            healthChange = -80;
            honorChange = -30;
            relationshipChange = -100;
            logMessage = `⚔️ ${coworker.name} te derrotou no duelo. Você está à beira da morte.`;
            logType = 'fail';
          }
        }
        break;

      default:
        logMessage = `Ação desconhecida: ${actionType}`;
        break;
    }

    // Update character state
    setCharacter((prev) => {
      if (!prev || !prev.currentJob || !prev.currentJob.coworkers) return prev;

      const updatedCoworkers = prev.currentJob.coworkers.map(c => {
        if (c.id === coworkerId) {
          return {
            ...c,
            relationship: Math.max(0, Math.min(100, c.relationship + relationshipChange))
          };
        }
        return c;
      });

      return {
        ...prev,
        currentJob: { ...prev.currentJob, coworkers: updatedCoworkers },
        health: Math.max(0, Math.min(100, prev.health + healthChange)),
        honor: Math.max(0, Math.min(100, prev.honor + honorChange)),
        money: Math.max(0, prev.money + moneyChange),
      };
    });

    // Add log entry
    addLog(logMessage);
    addToEventLog(logMessage, logType);

    // Return to dashboard
    setCurrentView('DASHBOARD');
  };

  // === TRABALHAR ===
  const handleWork = () => {
    if (!character || character.age < 6) return;

    const occupations: Record<string, { log: string; stats: { health?: number; strength?: number; faith?: number; honor?: number }; money: number }> = {
      nobility: {
        log: 'Você treinou esgrima com seu mestre de armas. Seus músculos doem, mas sua honra cresce.',
        stats: { strength: 2, honor: 1, health: -2 },
        money: 0,
      },
      gentry: {
        log: 'Seu tutor lhe ensinou a história dos seus ancestrais. Conhecimento é poder.',
        stats: { honor: 2, faith: 1, health: -1 },
        money: 0,
      },
      artisan: {
        log: 'Você ajudou na loja e aprendeu o valor de uma moeda.',
        stats: { honor: 1, health: -1 },
        money: Math.random() < 0.5 ? 1 : 0,
      },
      peasant: {
        log: 'Você capinou o terreno sob o sol forte. Deus vê seu esforço.',
        stats: { strength: 2, faith: 1, health: -3 },
        money: 0,
      },
    };

    const occ = occupations[character.socialClass] || occupations.peasant;

    addLog(`⚒️ ${occ.log}`);
    addToEventLog(occ.log, 'neutral');

    setCharacter((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        health: Math.max(0, Math.min(100, (prev.health || 100) + (occ.stats.health || 0))),
        strength: Math.max(0, Math.min(100, (prev.strength || 50) + (occ.stats.strength || 0))),
        faith: Math.max(0, Math.min(100, (prev.faith || 50) + (occ.stats.faith || 0))),
        honor: Math.max(0, Math.min(100, (prev.honor || 50) + (occ.stats.honor || 0))),
        money: prev.money + occ.money,
      };
    });

    // Mensagem de dinheiro ganho
    if (occ.money > 0) {
      addLog(`  💰 Você ganhou $${occ.money}!`);
    }

    // Chance de conhecer novo colega (10%)
    if (Math.random() < 0.1 && character.classmates && character.classmates.length > 0) {
      const newName = generateNewClassmateName(character.socialClass);
      setCharacter((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          classmates: [
            ...prev.classmates,
            {
              id: `classmate_new_${Date.now()}`,
              name: newName,
              relationship: 25,
              socialClass: prev.socialClass,
            },
          ],
        };
      });
      addLog(`  👋 Você conheceu ${newName}!`);
    }
  };

  // === INTERAÇÃO COM COLEGAS ===
  const handleClassmateInteraction = (classmateId: string, actionType: 'PLAY' | 'CHAT' | 'FIGHT') => {
    if (!character) return;

    const classmate = character.classmates?.find((c) => c.id === classmateId);
    if (!classmate) return;

    let relationshipChange = 0;
    let statsChange: { health?: number; honor?: number; strength?: number } = {};
    let logMessage = '';
    let toastType: 'success' | 'fail' | 'neutral' = 'neutral';

    if (actionType === 'PLAY') {
      relationshipChange = Math.floor(Math.random() * 6) + 5; // +5 a +10
      logMessage = `🎮 Você brincou com ${classmate.name}. Que divertido!`;
      toastType = 'success';
    } else if (actionType === 'CHAT') {
      relationshipChange = Math.floor(Math.random() * 3) + 2; // +2 a +4
      logMessage = `💬 Você conversou com ${classmate.name}.`;
      toastType = 'neutral';
    } else if (actionType === 'FIGHT') {
      const playerWins = (character.strength || 50) > Math.random() * 100;
      if (playerWins) {
        relationshipChange = -10;
        statsChange = { honor: 2 };
        logMessage = `⚔️ Você venceu ${classmate.name} na luta!`;
        toastType = 'success';
      } else {
        relationshipChange = -5;
        statsChange = { health: -5, honor: -2 };
        logMessage = `⚔️ ${classmate.name} te derrotou. Que humilhação!`;
        toastType = 'fail';
      }
    }

    addLog(logMessage);
    addToEventLog(logMessage, toastType);

    setCharacter((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        classmates: prev.classmates.map((c) =>
          c.id === classmateId
            ? { ...c, relationship: Math.max(0, Math.min(100, c.relationship + relationshipChange)) }
            : c
        ),
        health: Math.max(0, Math.min(100, prev.health + (statsChange.health || 0))),
        honor: Math.max(0, Math.min(100, prev.honor + (statsChange.honor || 0))),
        strength: Math.max(0, Math.min(100, (prev.strength || 50) + (statsChange.strength || 0))),
      };
    });
  };

  // === ESCOLHA DE EVENTO (MODAL) ===
  const handleEventChoice = (choiceId: string) => {
    if (!eventModal.event) return;

    const choice = eventModal.event.choices.find((c) => c.id === choiceId);
    if (!choice) return;

    // Aplicar stats se houver
    if (choice.stats) {
      setCharacter((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          health: Math.max(0, Math.min(100, prev.health + (choice.stats?.health || 0))),
          honor: Math.max(0, Math.min(100, prev.honor + (choice.stats?.honor || 0))),
          faith: Math.max(0, Math.min(100, (prev.faith || 50) + (choice.stats?.faith || 0))),
          strength: Math.max(0, Math.min(100, (prev.strength || 50) + (choice.stats?.strength || 0))),
          money: Math.max(0, prev.money + (choice.stats?.money || 0)),
        };
      });
    }

    addLog(`→ ${choice.text}`);
    setEventModal({ isOpen: false });
  };

  // === ESCOLHA DE EVENTO SIMPLES (RANDOM EVENTS) ===
  const handleSimpleEventChoice = (choiceIndex: number) => {
    if (!simpleEvent || !character) return;

    const choice = simpleEvent.choices[choiceIndex];
    if (!choice) return;

    addLog(`→ ${choice.label}`);
    addLog(choice.consequence);

    // Aplicar efeitos
    const effects = choice.effect;
    const updatedChar = { ...character };

    if (effects.vitality) {
      updatedChar.health = Math.max(0, Math.min(100, updatedChar.health + effects.vitality));
      if (effects.vitality > 0) addLog(`  ❤️ +${effects.vitality} Vitalidade`);
      else addLog(`  ❤️ ${effects.vitality} Vitalidade`);
    }

    if (effects.faith) {
      updatedChar.faith = Math.max(0, Math.min(100, (updatedChar.faith || 50) + effects.faith));
      if (effects.faith > 0) addLog(`  ⛪ +${effects.faith} Fé`);
      else addLog(`  ⛪ ${effects.faith} Fé`);
    }

    if (effects.strength) {
      updatedChar.strength = Math.max(0, Math.min(100, (updatedChar.strength || 50) + effects.strength));
      if (effects.strength > 0) addLog(`  💪 +${effects.strength} Força`);
      else addLog(`  💪 ${effects.strength} Força`);
    }

    if (effects.honor) {
      updatedChar.honor = Math.max(0, Math.min(100, updatedChar.honor + effects.honor));
      if (effects.honor > 0) addLog(`  🛡 +${effects.honor} Honra`);
      else addLog(`  🛡 ${effects.honor} Honra`);
    }

    if (effects.money) {
      updatedChar.money = Math.max(0, updatedChar.money + effects.money);
      if (effects.money > 0) addLog(`  💰 +$${effects.money}`);
      else addLog(`  💰 -$${Math.abs(effects.money)}`);
    }

    setCharacter(updatedChar);
    setSimpleEvent(null);
    setWaitingForChoice(false);

    // Verifica morte
    if (updatedChar.health <= 0) {
      handleDeath(updatedChar, choice.consequence);
    }
  };

  // === DISMISS NASCIMENTO DE IRMÃO ===
  const handleSiblingBirthDismiss = () => {
    setSiblingBirthModal({ isOpen: false });
    // Continuar com checkForEvents adiado
    if (pendingEventsCharRef.current) {
      const char = pendingEventsCharRef.current;
      pendingEventsCharRef.current = null;
      checkForEvents(char);
    }
  };

  // === ATIVIDADES: CORPO & ALMA (MICRO-EVENTS) ===
  const ACTIVITY_EVENTS = [
    {
      id: 'play_mud',
      label: '🏞️ Brincar na Lama',
      title: 'Chiqueiro Lamacento',
      description: 'Choveu muito e o quintal é pura lama.',
      choices: [
        { text: 'Brincar sozinho', effects: { strength: 2 }, preview: '+2 Força', logText: 'Brinquei sozinho na lama por várias horas. Foi divertido, mas um pouco solitário...' },
        { text: 'Guerra de lama com amigos', effects: { strength: 1, health: 1 }, preview: '+1 Força, +1 Vitalidade', logText: 'Fizemos uma guerra de lama! Voltei para casa sujo, mas feliz.' },
        { text: 'Desistir', effects: null, preview: '', logText: '' },
      ],
    },
    {
      id: 'listen_priest',
      label: '⛪ Ouvir o Padre',
      title: 'Sermão de Domingo',
      description: 'O padre fala sobre o fogo do inferno.',
      choices: [
        { text: 'Ouvir com temor', effects: { faith: 4 }, preview: '+4 Fé', logText: 'O sermão sobre o inferno me deu calafrios. Prometi ser uma criança melhor.' },
        { text: 'Ajudar no altar', effects: { faith: 2, honor: 2 }, preview: '+2 Fé, +2 Honra', logText: 'Limpei o altar em silêncio. O padre me deu um pedaço de pão bento.' },
        { text: 'Dormir', effects: null, preview: '', logText: '' },
      ],
    },
    {
      id: 'carry_wood',
      label: '🪵 Carregar Lenha',
      title: 'Estoque de Inverno',
      description: 'Seu pai precisa de ajuda com a lenha.',
      choices: [
        { text: 'Levar o tronco pesado', effects: { strength: 5 }, preview: '+5 Força', logText: 'Meus braços doem de carregar o tronco pesado, mas meu pai me elogiou.' },
        { text: 'Levar gravetos', effects: { strength: 2 }, preview: '+2 Força', logText: 'Carreguei apenas gravetos leves. O trabalho acabou rápido.' },
        { text: 'Fugir do trabalho', effects: null, preview: '', logText: '' },
      ],
    },
    {
      id: 'beg_food',
      label: '🧎 Suplicar por Comida',
      title: 'Carruagem Real',
      description: 'Nobres estão passando pela estrada.',
      choices: [
        { text: 'Suplicar por restos', effects: { health: 10, honor: -5 }, preview: '+10 Vitalidade, -5 Honra', logText: 'Me humilhei na estrada. Um nobre jogou restos de comida com nojo.' },
        { text: 'Dançar por moedas', effects: { health: 5, honor: -2 }, preview: '+5 Vitalidade, -2 Honra', logText: 'Dancei e pulei. Eles riram da minha desgraça, mas atiraram uma moeda.' },
        { text: 'Esconder-se', effects: null, preview: '', logText: '' },
      ],
    },
  ];

  // === CRIMES (PEASANT/ARTISAN) ===
  const CRIME_EVENTS = [
    {
      id: 'pickpocket_peasant',
      label: '💰 Bater Carteira',
      title: 'Mercado da Vila',
      description: 'O mercado da vila está movimentado hoje. Bolsas pesadas balançam nos cintos dos desatentos.',
      choices: [
        { text: 'Roubar Bêbado (Fácil)', effects: { money: 5 }, preview: 'Alvo fácil', logText: '' },
        { text: 'Roubar Mercador (Difícil)', effects: { money: 50 }, preview: 'Alto risco, alta recompensa', logText: '' },
        { text: 'Desistir', effects: null, preview: '', logText: '' },
      ],
    },
    {
      id: 'poach_peasant',
      label: '🦌 Caça Ilegal',
      title: 'Bosque Real',
      description: 'As terras de caça do senhor local estão repletas de cervos gordos. A fome aperta...',
      choices: [
        { text: 'Caçar Cervo', effects: { health: 20 }, preview: 'Carne e peles', logText: '' },
        { text: 'Desistir', effects: null, preview: '', logText: '' },
      ],
    },
  ];

  const [activeActivity, setActiveActivity] = useState<typeof ACTIVITY_EVENTS[number] | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const handleActivityPress = (activity: typeof ACTIVITY_EVENTS[number]) => {
    if (!character) return;

    if (character.activityHistory[activity.id] === character.currentYear) {
      addLog(`❌ Você já fez isso este ano.`);
      return;
    }

    // Switch to dashboard first so the modal overlays the main view
    setSelectedCategory(null);
    setCurrentView('DASHBOARD');
    setActiveActivity(activity);
  };

  const handleActivityChoice = (choiceId: string) => {
    if (!activeActivity || !character) return;

    const choiceIndex = Number(choiceId);
    const choice = activeActivity.choices[choiceIndex];
    if (!choice) return;

    // Close modal first
    const activity = activeActivity;
    setActiveActivity(null);

    // Cancel choice — no stats, no mark as done
    if (!choice.effects) return;

    // === PICKPOCKET MINI-GAME INTERCEPT ===
    if (activity.id === 'pickpocket_peasant') {
      const difficulty: 'easy' | 'hard' = choiceIndex === 0 ? 'easy' : 'hard';
      setMiniGameDifficulty(difficulty);

      pendingCrimeAction.current = (success: boolean) => {
        if (success) {
          if (difficulty === 'easy') {
            setCharacter((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                money: Math.max(0, prev.money + 5),
                activityHistory: { ...prev.activityHistory, [activity.id]: prev.currentYear },
              };
            });
            addLog(`→ O bêbado nem percebeu. Peguei algumas moedas de cobre da bolsa fedida.`);
          } else {
            const goldAmount = 40 + Math.floor(Math.random() * 31); // 40-70
            setCharacter((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                money: Math.max(0, prev.money + goldAmount),
                activityHistory: { ...prev.activityHistory, [activity.id]: prev.currentYear },
              };
            });
            addLog(`→ Mãos de cirurgião! Cortei a bolsa de veludo e encontrei ${goldAmount} moedas de ouro! O risco valeu a pena.`);
          }
        } else {
          // Progressive punishment based on strike count
          setCrimeStrikeCount((prev) => prev + 1);
          const newStrike = crimeStrikeCount + 1;

          let healthPenalty = 0;
          let honorPenalty = 0;
          let logMsg = '';

          if (newStrike === 1) {
            healthPenalty = 10;
            honorPenalty = 5;
            logMsg = '→ Os guardas te deram uma surra de aviso.';
          } else if (newStrike === 2) {
            healthPenalty = 30;
            honorPenalty = 20;
            logMsg = '→ Reincidente! Você foi açoitado no tronco da praça.';
          } else {
            healthPenalty = 60;
            honorPenalty = 50;
            logMsg = '→ A marca da justiça! Cortaram parte da sua orelha como aviso eterno.';
          }

          setCharacter((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              health: Math.max(0, prev.health - healthPenalty),
              honor: Math.max(0, prev.honor - honorPenalty),
              activityHistory: { ...prev.activityHistory, [activity.id]: prev.currentYear },
            };
          });
          addLog(logMsg);
        }
        // Switch to dashboard to display log
        setCurrentView('DASHBOARD');
      };

      setShowMiniGame(true);
      return;
    }

    // === POACHING MINI-GAME INTERCEPT ===
    if (activity.id === 'poach_peasant') {
      pendingPoachingAction.current = (success: boolean) => {
        if (success) {
          const meatItem = {
            id: `venison_${Date.now()}`,
            name: 'Carne de Veado',
            type: 'food',
            value: 15,
            description: 'Carne fresca e nutritiva de caça ilegal.',
          };
          setCharacter((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              inventory: [...prev.inventory, meatItem],
              activityHistory: { ...prev.activityHistory, [activity.id]: prev.currentYear },
            };
          });
          addLog('→ Consegui esfolar o cervo e fugir sem ser visto. Carne para o inverno!');
        } else {
          setCharacter((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              health: Math.max(0, prev.health - 30),
              honor: Math.max(0, prev.honor - 20),
              activityHistory: { ...prev.activityHistory, [activity.id]: prev.currentYear },
            };
          });
          addLog('→ O guarda me viu! Tentei correr mas fui pego. O preço foi alto.');
        }
        setCurrentView('DASHBOARD');
      };

      setShowPoachingGame(true);
      return;
    }

    // === NORMAL ACTIVITY FLOW ===
    const effects = choice.effects as Record<string, number> | null;
    setCharacter((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        health: Math.max(0, Math.min(100, prev.health + (effects?.health || 0))),
        strength: Math.max(0, Math.min(100, (prev.strength || 0) + (effects?.strength || 0))),
        faith: Math.max(0, Math.min(100, (prev.faith || 0) + (effects?.faith || 0))),
        honor: Math.max(0, Math.min(100, prev.honor + (effects?.honor || 0))),
        money: Math.max(0, prev.money + (effects?.money || 0)),
        activityHistory: { ...prev.activityHistory, [activity.id]: prev.currentYear },
      };
    });

    addLog(choice.logText ? `→ ${choice.logText}` : `→ ${activity.title}: ${choice.text}`);
  };

  // === MINI-GAME FINISH ===
  const handleMiniGameFinish = (success: boolean) => {
    setShowMiniGame(false);
    if (pendingCrimeAction.current) {
      pendingCrimeAction.current(success);
      pendingCrimeAction.current = null;
    }
  };

  const handlePoachingFinish = (success: boolean) => {
    setShowPoachingGame(false);
    if (pendingPoachingAction.current) {
      pendingPoachingAction.current(success);
      pendingPoachingAction.current = null;
    }
  };

  // === INVENTORY ACTIONS ===
  const handleInventoryAction = (itemId: string, action: 'eat' | 'sell') => {
    if (!character) return;
    const item = character.inventory.find(i => i.id === itemId);
    if (!item) return;

    if (action === 'eat') {
      setCharacter((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          health: Math.min(100, prev.health + 30),
          inventory: prev.inventory.filter(i => i.id !== itemId),
        };
      });
      addLog('→ Você assou a carne e comeu até se fartar. Sentiu suas forças voltarem.');
    } else {
      const sellValue = item.value || 0;
      setCharacter((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          money: prev.money + sellValue,
          inventory: prev.inventory.filter(i => i.id !== itemId),
        };
      });
      addLog('→ Você vendeu a carne discretamente no mercado.');
    }
  };

  // === RENDERIZAR BARRA DE STATUS ===
  const renderStatusBar = (label: string, value: number, color: string) => {
    const barColor = value <= 30 ? COLORS.feedback.error : color;
    return (
      <View style={styles.statusBar}>
        <Text style={styles.statusLabel}>{label}</Text>
        <View style={styles.barContainer}>
          <View style={[styles.barFill, { width: `${value}%`, backgroundColor: barColor }]} />
        </View>
        <Text style={styles.statusValue}>{value}%</Text>
      </View>
    );
  };

  const isSheetOpen = currentView !== 'DASHBOARD';
  const sheetTranslateY = useRef(new Animated.Value(0)).current;

  const closeSheet = () => {
    setSelectedCategory(null);
    setCurrentView('DASHBOARD');
  };

  const getSheetTitle = () => {
    switch (currentView) {
      case 'RELATIONSHIPS':
        return 'Relações';
      case 'OCCUPATION':
        return 'Ocupação';
      case 'ASSETS':
        return 'Posses';
      case 'ACTIVITIES':
        return selectedCategory === 'body_soul'
          ? 'Corpo & Alma'
          : selectedCategory === 'crime'
            ? 'Crimes'
            : 'Atividades';
      default:
        return '';
    }
  };

  useEffect(() => {
    if (!isSheetOpen) {
      sheetTranslateY.setValue(0);
    }
  }, [isSheetOpen, sheetTranslateY]);

  const sheetPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 4,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          sheetTranslateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const shouldClose = gestureState.dy > 120 || gestureState.vy > 1;
        if (shouldClose) {
          Animated.timing(sheetTranslateY, {
            toValue: 520,
            duration: 180,
            useNativeDriver: true,
          }).start(() => {
            closeSheet();
            sheetTranslateY.setValue(0);
          });
          return;
        }

        Animated.spring(sheetTranslateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 70,
          friction: 9,
        }).start();
      },
    })
  ).current;

  // === RENDER ===
  if (!character) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  const currentEra = getCurrentEra(character.location, character.currentYear);

  // === RENDERIZAR TELA PLACEHOLDER ===
  const renderPlaceholderScreen = (title: string, description: string) => (
    <View style={styles.placeholderScreen}>
      <Text style={styles.placeholderTitle}>{title}</Text>
      <Text style={styles.placeholderText}>{description}</Text>
    </View>
  );

  return (
    <View style={[styles.container, character.health <= 30 && styles.hungerBorder]}>
      <StatusBar style="light" />



      {/* DASHBOARD BASE VIEW */}
      <>
          {/* CABEÇALHO */}
          <View style={styles.header}>
            <Text style={styles.headerName}>
              {character.name} {character.surname}
            </Text>
            <Text style={styles.headerInfo}>
              Idade: {character.age} anos | Ano: {character.currentYear}
            </Text>
            <Text style={styles.headerLocation}>
              📍 {character.location} | ⚡ {currentEra?.name || 'Era Desconhecida'}
            </Text>
            <Text style={styles.headerMoney}>
              💰 ${character.money} | 🍖 {character.food}
            </Text>
          </View>

          {/* AVATAR */}
          <View style={styles.avatarArea}>
            <Text style={styles.avatarPlaceholder}>
              {getAvatarEmoji(character)}
            </Text>
            <Text style={styles.avatarAge}>
              {getAgeLabel(character.age)}
            </Text>
            <Text style={styles.avatarDescription}>
              {getPhysicalDescription(character.physicalTraits)}
            </Text>
          </View>

          {/* STATUS */}
          <View style={styles.statusSection}>
            {renderStatusBar('❤️ Vitalidade', character.health, COLORS.status.health)}
            {character.faith !== undefined && renderStatusBar('⛪ Fé', character.faith, COLORS.status.sanity)}
            {character.strength !== undefined && renderStatusBar('💪 Força', character.strength, COLORS.status.honor)}
            {renderStatusBar('🛡 Honra', character.honor, COLORS.status.honor)}
            {character.faith === undefined && renderStatusBar('🧠 Sanidade', character.sanity, COLORS.status.sanity)}
          </View>

          {/* LOG */}
          <ScrollView
            ref={scrollViewRef}
            style={styles.logSection}
            nestedScrollEnabled
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          >
            {gameLog.map((log, index) => (
              <Text key={index} style={styles.logText}>
                {log}
              </Text>
            ))}
          </ScrollView>

          {/* AVISO DE FOME */}
          {character.health <= 30 && (
            <View style={styles.hungerWarning}>
              <Text style={styles.hungerWarningText}>⚠️ VOCÊ ESTÁ ENFRAQUECIDO!</Text>
            </View>
          )}

      </>

      {/* FLOATING SHEET OVERLAY */}
      {isSheetOpen && (
        <View style={styles.sheetOverlay}>
          <TouchableOpacity
            style={[
              styles.sheetBackdrop,
              Platform.OS === 'web' ? ({ backdropFilter: 'blur(5px)' } as any) : null,
            ]}
            activeOpacity={1}
            onPress={closeSheet}
          />
          <Animated.View style={[styles.sheetContainer, { transform: [{ translateY: sheetTranslateY }] }]}>
            <View {...sheetPanResponder.panHandlers}>
              <SheetHeader title={getSheetTitle()} onClose={closeSheet} onBack={closeSheet} />
            </View>
            <View style={styles.sheetBody}>

      {/* RELATIONSHIPS VIEW */}
      {currentView === 'RELATIONSHIPS' && (
        <RelationshipsView
          character={character}
          setCharacter={setCharacter}
          onAddToLog={addToEventLog}
          onSetCurrentEvent={setCurrentEvent}
          onNPCInteraction={handleNPCInteraction}
        />
      )}

      {/* OCCUPATION VIEW */}
      {currentView === 'OCCUPATION' && (
        <OccupationView
          character={character}
          onWork={handleWork}
          onClassmateInteraction={handleClassmateInteraction}
          onTakeJob={handleTakeJob}
          onResignJob={handleResignJob}
          onCoworkerInteraction={handleCoworkerInteraction}
        />
      )}

      {/* ASSETS VIEW */}
      {currentView === 'ASSETS' && (
        <View style={styles.assetsScreen}>
          <Text style={styles.assetsTitle}>💰 Posses</Text>
          <Text style={styles.assetsSubtitle}>Seus bens e pertences</Text>

          {character.inventory.length === 0 ? (
            <View style={styles.assetsEmpty}>
              <Text style={styles.assetsEmptyText}>Você não possui nenhum item.</Text>
            </View>
          ) : (
            <ScrollView style={styles.assetsScroll} nestedScrollEnabled>
              {/* Infância */}
              {character.inventory.filter(i => i.type === 'childhood').length > 0 && (
                <>
                  <Text style={styles.assetsCategoryTitle}>🧸 Infância</Text>
                  {character.inventory.filter(i => i.type === 'childhood').map((item) => (
                    <View key={item.id} style={styles.assetCard}>
                      <Text style={styles.assetName}>{item.name}</Text>
                      <Text style={styles.assetType}>Brinquedo</Text>
                    </View>
                  ))}
                </>
              )}

              {/* Comida */}
              {character.inventory.filter(i => i.type === 'food').length > 0 && (
                <>
                  <Text style={styles.assetsCategoryTitle}>🥩 Comida</Text>
                  {character.inventory.filter(i => i.type === 'food').map((item) => (
                    <View key={item.id} style={styles.assetFoodCard}>
                      <View style={styles.assetFoodInfo}>
                        <Text style={styles.assetName}>{item.name}</Text>
                        <Text style={styles.assetType}>{item.description || 'Alimento'}</Text>
                      </View>
                      <View style={styles.assetFoodActions}>
                        <TouchableOpacity
                          style={styles.assetActionBtn}
                          onPress={() => handleInventoryAction(item.id, 'eat')}
                        >
                          <Text style={styles.assetActionText}>COMER</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.assetActionBtnSell}
                          onPress={() => handleInventoryAction(item.id, 'sell')}
                        >
                          <Text style={styles.assetActionText}>VENDER</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </>
              )}
            </ScrollView>
          )}
        </View>
      )}

      {/* ACTIVITIES VIEW */}
      {currentView === 'ACTIVITIES' && !selectedCategory && (
        <View style={styles.activitiesScreen}>
          <Text style={styles.activitiesTitle}>⚡ Atividades</Text>
          <View style={styles.activitiesGrid}>
            <TouchableOpacity
              style={styles.categoryCard}
              activeOpacity={0.7}
              onPress={() => setSelectedCategory('body_soul')}
            >
              <Text style={styles.categoryLabel}>🙏 Corpo & Alma</Text>
              <Text style={styles.categoryChevron}>›</Text>
            </TouchableOpacity>

            {(character.socialClass === 'peasant' || character.socialClass === 'artisan') && (
              <TouchableOpacity
                style={[styles.categoryCard, character.age < 10 && styles.categoryCardDisabled]}
                activeOpacity={character.age < 10 ? 1 : 0.7}
                onPress={() => { if (character.age >= 10) setSelectedCategory('crime'); }}
              >
                <Text style={styles.categoryLabel}>
                  🗡️ Crimes{character.age < 10 ? ' (10+)' : ''}
                </Text>
                <Text style={styles.categoryChevron}>›</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* ACTIVITIES DETAIL: CORPO & ALMA */}
      {currentView === 'ACTIVITIES' && selectedCategory === 'body_soul' && (
        <View style={styles.activitiesScreen}>
          <TouchableOpacity
            style={styles.categoryBackButton}
            onPress={() => setSelectedCategory(null)}
          >
            <Text style={styles.categoryBackText}>← Voltar</Text>
          </TouchableOpacity>
          <Text style={styles.activitiesTitle}>🙏 Corpo & Alma</Text>
          <Text style={styles.activitiesSubtitle}>Atividades para fortalecer corpo e espírito</Text>
          <View style={styles.activitiesGrid}>
            {ACTIVITY_EVENTS.map((act) => {
              const doneThisYear = character.activityHistory[act.id] === character.currentYear;
              return (
                <TouchableOpacity
                  key={act.id}
                  style={styles.activityCard}
                  activeOpacity={0.7}
                  onPress={() => handleActivityPress(act)}
                >
                  <View style={styles.activityHeader}>
                    <Text style={styles.activityLabel}>{act.label}</Text>
                    {doneThisYear && <Text style={styles.activityCheck}>✓</Text>}
                  </View>
                  <Text style={styles.activityDesc}>{act.description}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* ACTIVITIES DETAIL: CRIMES */}
      {currentView === 'ACTIVITIES' && selectedCategory === 'crime' && (
        <View style={styles.activitiesScreen}>
          <TouchableOpacity
            style={styles.categoryBackButton}
            onPress={() => setSelectedCategory(null)}
          >
            <Text style={styles.categoryBackText}>← Voltar</Text>
          </TouchableOpacity>
          <Text style={styles.activitiesTitle}>🗡️ Crimes</Text>
          <Text style={styles.activitiesSubtitle}>Atividades ilícitas para os desesperados</Text>
          <View style={styles.activitiesGrid}>
            {CRIME_EVENTS.map((act) => {
              const doneThisYear = character.activityHistory[act.id] === character.currentYear;
              return (
                <TouchableOpacity
                  key={act.id}
                  style={styles.activityCard}
                  activeOpacity={0.7}
                  onPress={() => handleActivityPress(act as any)}
                >
                  <View style={styles.activityHeader}>
                    <Text style={styles.activityLabel}>{act.label}</Text>
                    {doneThisYear && <Text style={styles.activityCheck}>✓</Text>}
                  </View>
                  <Text style={styles.activityDesc}>{act.description}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

            </View>
          </Animated.View>
        </View>
      )}

      {/* ACTIVITY MICRO-EVENT MODAL */}
      <EventModal
        isOpen={!!activeActivity}
        event={activeActivity ? {
          title: activeActivity.title,
          description: activeActivity.description,
          choices: activeActivity.choices.map((c, i) => ({
            id: String(i),
            text: c.text,
            preview: c.preview,
          })),
        } : undefined}
        onChoice={handleActivityChoice}
      />

      {/* EVENT MODAL - eventModal state */}
      <EventModal
        isOpen={eventModal.isOpen}
        event={eventModal.event}
        onChoice={handleEventChoice}
      />

      {/* EVENT MODAL - currentEvent (historical/random) */}
      <EventModal
        isOpen={!!currentEvent}
        event={currentEvent ? {
          title: currentEvent.title,
          description: currentEvent.description,
          choices: currentEvent.options?.map((option: any, index: number) => ({
            id: String(index),
            text: option.text,
            preview: option.preview || '',
          })) || [],
        } : undefined}
        onChoice={(id) => {
          if (currentEvent?.options) {
            const option = currentEvent.options[Number(id)];
            if (option) chooseOption(option);
          }
        }}
      />

      {/* SIMPLE EVENT MODAL */}
      <EventModal
        isOpen={!!simpleEvent}
        event={simpleEvent ? {
          title: simpleEvent.title,
          description: simpleEvent.description,
          choices: simpleEvent.choices.map((choice, index) => ({
            id: String(index),
            text: choice.label,
            preview: [
              choice.effect.vitality ? `Vitalidade: ${choice.effect.vitality > 0 ? '+' : ''}${choice.effect.vitality}` : '',
              choice.effect.faith ? `Fé: ${choice.effect.faith > 0 ? '+' : ''}${choice.effect.faith}` : '',
              choice.effect.strength ? `Força: ${choice.effect.strength > 0 ? '+' : ''}${choice.effect.strength}` : '',
              choice.effect.honor ? `Honra: ${choice.effect.honor > 0 ? '+' : ''}${choice.effect.honor}` : '',
              choice.effect.money ? `$${choice.effect.money > 0 ? '+' : ''}${choice.effect.money}` : '',
            ].filter(Boolean).join(' | '),
          })),
        } : undefined}
        onChoice={(id) => handleSimpleEventChoice(Number(id))}
      />

      {/* SIBLING BIRTH MODAL */}
      <EventModal
        isOpen={siblingBirthModal.isOpen}
        event={siblingBirthModal.isOpen ? {
          title: '👶 Novo Irmão!',
          description: `Sua mãe deu à luz a ${siblingBirthModal.gender === 'male' ? 'um menino' : 'uma menina'}: ${siblingBirthModal.name}!`,
          choices: [{ id: 'ok', text: 'OK' }],
        } : undefined}
        onChoice={() => handleSiblingBirthDismiss()}
      />

      {/* NPC REACTIVE EVENT MODAL */}
      <EventModal
        isOpen={npcEvent.isOpen}
        event={npcEvent.event}
        onChoice={handleNpcEventChoice}
      />

      {/* MINI-GAME OVERLAY */}
      {showMiniGame && (
        <PickpocketGame
          difficulty={miniGameDifficulty}
          onFinish={handleMiniGameFinish}
        />
      )}

      {/* POACHING MINI-GAME OVERLAY */}
      {showPoachingGame && (
        <PoachingGame onFinish={handlePoachingFinish} />
      )}

      {/* FOOTER MENU */}
      <FooterMenu handleAgeUp={ageUp} />
    </View>
  );
}

// === APP WRAPPER COM PROVIDER ===
export default function App() {
  return (
    <ViewProvider>
      <AppContent />
    </ViewProvider>
  );
}

// === ESTILOS ===
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
    padding: 20,
    paddingTop: 50,
    paddingBottom: 80,
  },
  sheetOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: 'flex-end',
    zIndex: 20,
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  sheetContainer: {
    height: '88%',
    backgroundColor: COLORS.background.primary,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.background.tertiary,
  },
  sheetBody: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  hungerBorder: {
    borderWidth: 3,
    borderColor: COLORS.feedback.error,
  },
  loadingText: {
    color: COLORS.text.primary,
    fontSize: 18,
    textAlign: 'center',
    marginTop: 100,
  },
  header: {
    marginBottom: 15,
  },
  headerName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.accent.gold,
    textAlign: 'center',
  },
  headerInfo: {
    fontSize: 13,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginTop: 3,
  },
  headerLocation: {
    fontSize: 12,
    color: COLORS.text.highlight,
    textAlign: 'center',
    marginTop: 3,
  },
  headerMoney: {
    fontSize: 14,
    color: COLORS.text.primary,
    textAlign: 'center',
    marginTop: 3,
  },
  avatarArea: {
    alignItems: 'center',
    marginVertical: 15,
    padding: 15,
    backgroundColor: COLORS.background.secondary,
    borderRadius: 10,
  },
  avatarPlaceholder: {
    fontSize: 60,
  },
  avatarAge: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginTop: 8,
  },
  avatarDescription: {
    fontSize: 10,
    color: COLORS.text.secondary,
    marginTop: 4,
    fontStyle: 'italic',
  },
  statusSection: {
    marginBottom: 15,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusLabel: {
    color: COLORS.text.primary,
    fontSize: 13,
    width: 100,
  },
  barContainer: {
    flex: 1,
    height: 18,
    backgroundColor: COLORS.background.tertiary,
    borderRadius: 10,
    overflow: 'hidden',
    marginHorizontal: 8,
  },
  barFill: {
    height: '100%',
    borderRadius: 10,
  },
  statusValue: {
    color: COLORS.text.secondary,
    fontSize: 11,
    width: 35,
    textAlign: 'right',
  },
  logSection: {
    flex: 1,
    backgroundColor: COLORS.background.secondary,
    borderRadius: 10,
    padding: 12,
    marginBottom: 15,
  },
  logText: {
    color: COLORS.text.primary,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 3,
  },
  eventChoices: {
    marginBottom: 10,
  },
  choiceButton: {
    backgroundColor: COLORS.accent.bronze,
    padding: 14,
    borderRadius: 8,
    marginBottom: 8,
  },
  choiceText: {
    color: COLORS.text.primary,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  choicePreview: {
    color: COLORS.text.secondary,
    fontSize: 11,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  ageButton: {
    backgroundColor: COLORS.accent.gold,
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 8,
  },
  ageButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.background.primary,
  },
  hungerWarning: {
    backgroundColor: COLORS.feedback.error,
    padding: 8,
    borderRadius: 5,
    alignItems: 'center',
  },
  hungerWarningText: {
    color: COLORS.text.primary,
    fontWeight: 'bold',
    fontSize: 11,
  },
  placeholderScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background.secondary,
    borderRadius: 10,
    padding: 20,
  },
  placeholderTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.accent.gold,
    marginBottom: 16,
  },
  placeholderText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  backButton: {
    backgroundColor: COLORS.accent.gold,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    marginBottom: 15,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    color: COLORS.background.primary,
    fontWeight: 'bold',
    fontSize: 14,
  },
  // === ACTIVITIES ===
  activitiesScreen: {
    flex: 1,
  },
  activitiesTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.accent.gold,
    textAlign: 'center',
    marginBottom: 4,
  },
  activitiesSubtitle: {
    fontSize: 12,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  activitiesGrid: {
    gap: 12,
  },
  activityCard: {
    backgroundColor: COLORS.background.secondary,
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.accent.bronze,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  activityLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  activityCheck: {
    fontSize: 16,
    color: COLORS.feedback.success,
    fontWeight: 'bold',
  },
  activityDesc: {
    fontSize: 13,
    color: COLORS.accent.gold,
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
  categoryCardDisabled: {
    opacity: 0.5,
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
  categoryBackButton: {
    marginBottom: 12,
  },
  categoryBackText: {
    fontSize: 14,
    color: COLORS.accent.gold,
    fontWeight: '600',
  },
  // === ASSETS ===
  assetsScreen: {
    flex: 1,
  },
  assetsTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.accent.gold,
    textAlign: 'center',
    marginBottom: 4,
  },
  assetsSubtitle: {
    fontSize: 12,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  assetsEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  assetsEmptyText: {
    color: COLORS.text.secondary,
    fontSize: 14,
    fontStyle: 'italic',
  },
  assetsScroll: {
    flex: 1,
  },
  assetsCategoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.accent.gold,
    marginBottom: 10,
    marginTop: 4,
  },
  assetCard: {
    backgroundColor: COLORS.background.secondary,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  assetName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  assetType: {
    fontSize: 12,
    color: COLORS.text.secondary,
    fontStyle: 'italic',
  },
  assetFoodCard: {
    backgroundColor: COLORS.background.secondary,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
  },
  assetFoodInfo: {
    marginBottom: 10,
  },
  assetFoodActions: {
    flexDirection: 'row',
    gap: 8,
  },
  assetActionBtn: {
    flex: 1,
    backgroundColor: '#4ade80',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  assetActionBtnSell: {
    flex: 1,
    backgroundColor: COLORS.accent.bronze,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  assetActionText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
});
