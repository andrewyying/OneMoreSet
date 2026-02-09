import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LegalDocumentType, RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'LegalDocument'>;

type LegalSection = {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
};

type LegalDocumentContent = {
  title: string;
  effectiveDate: string;
  intro: string;
  sections: LegalSection[];
  closing?: string;
};

const PRIVACY_CONTENT: LegalDocumentContent = {
  title: 'Privacy & Data',
  effectiveDate: 'February 9, 2026',
  intro:
    'This notice explains how OneMoreSet handles your information based on the app behavior available on February 9, 2026.',
  sections: [
    {
      heading: 'What Data We Process',
      paragraphs: [
        'OneMoreSet is designed to run without an account. Most data in the app is workout data that you create directly.',
      ],
      bullets: [
        'Workout schedules you create, including exercise names, durations, repeats, and rest settings.',
        'Workout completion history, including completion timestamps and streak calculations.',
        'Session state required to run timers and Live Activity updates during active workouts.',
      ],
    },
    {
      heading: 'Where Data Is Stored',
      paragraphs: [
        'Workout data is stored locally on your device using app storage.',
        'As of February 9, 2026, OneMoreSet does not upload schedules or workout history to OneMoreSet servers.',
        'Your device platform provider (for example, Apple or Google) may include app data in device backups under their own policies.',
      ],
    },
    {
      heading: 'How Data Is Used',
      bullets: [
        'To provide timer, schedule, calendar, and streak features.',
        'To keep your workouts available between sessions on your device.',
        'To show current workout details on lock screen or Dynamic Island when Live Activity features are enabled.',
      ],
      paragraphs: [],
    },
    {
      heading: 'Sharing and Selling',
      paragraphs: [
        'OneMoreSet does not sell personal information and does not share your workout data with advertisers.',
        'Information may be disclosed only if required by law or to protect safety, rights, and app security.',
      ],
    },
    {
      heading: 'Your Choices',
      bullets: [
        'Edit or delete schedules at any time.',
        'Delete individual workout history entries from the calendar history cards.',
        'Uninstall the app to remove local data from your device, subject to any device backups.',
      ],
      paragraphs: [],
    },
    {
      heading: "Children's Privacy",
      paragraphs: [
        'OneMoreSet is not intended for children under 13. If you believe a child provided personal information, use the support contact listed on the app store listing.',
      ],
    },
    {
      heading: 'Changes to This Notice',
      paragraphs: [
        'This notice may be updated as features change. The effective date at the top will be revised when updates are made.',
      ],
    },
  ],
  closing:
    'For privacy questions, use the support contact listed on the OneMoreSet app store listing.',
};

const TERMS_CONTENT: LegalDocumentContent = {
  title: 'Terms of Service',
  effectiveDate: 'February 9, 2026',
  intro: 'These terms govern your use of OneMoreSet. By using the app, you agree to these terms.',
  sections: [
    {
      heading: 'Use Eligibility',
      paragraphs: [
        'You must be legally able to accept these terms in your location. If required by law, use the app with parent or guardian permission.',
      ],
    },
    {
      heading: 'Health and Safety Notice',
      paragraphs: [
        'OneMoreSet is a workout timer and logging tool. It does not provide medical advice, diagnosis, or treatment.',
        'Exercise carries risk. Stop if you feel pain, dizziness, or unusual symptoms, and consult a qualified professional.',
      ],
    },
    {
      heading: 'License',
      paragraphs: [
        'You receive a limited, non-exclusive, non-transferable, revocable license to use OneMoreSet for personal, non-commercial use.',
      ],
    },
    {
      heading: 'Prohibited Conduct',
      bullets: [
        'Do not copy, reverse engineer, or redistribute the app except where law allows.',
        "Do not use the app in a way that violates law or others' rights.",
        'Do not interfere with app security, availability, or normal operation.',
      ],
      paragraphs: [],
    },
    {
      heading: 'Your Data and Content',
      paragraphs: [
        'You are responsible for the workout names, routines, and other content you enter into the app.',
        'Keep your own backup copies if you need guaranteed retention.',
      ],
    },
    {
      heading: 'Availability and Updates',
      paragraphs: [
        'Features may change, be suspended, or be removed at any time.',
        'Updates may be required for compatibility, reliability, and safety improvements.',
      ],
    },
    {
      heading: 'Third-Party Platforms',
      paragraphs: [
        'App distribution and some platform features are provided by third parties such as Apple and Google. Their terms and policies apply to your use of those services.',
      ],
    },
    {
      heading: 'Disclaimer of Warranties',
      paragraphs: [
        "OneMoreSet is provided 'as is' and 'as available' without warranties of any kind, to the maximum extent permitted by law.",
      ],
    },
    {
      heading: 'Limitation of Liability',
      paragraphs: [
        'To the maximum extent permitted by law, OneMoreSet and its operators are not liable for indirect, incidental, special, consequential, or punitive damages, including loss of data, profits, or goodwill.',
      ],
    },
    {
      heading: 'Termination',
      paragraphs: [
        'You may stop using the app at any time by uninstalling it.',
        'Access may be restricted for users who violate these terms.',
      ],
    },
    {
      heading: 'Changes to Terms',
      paragraphs: [
        'These terms may be updated. Continued use after an update means you accept the revised terms.',
      ],
    },
  ],
  closing:
    'For legal questions, use the support contact listed on the OneMoreSet app store listing.',
};

const LEGAL_CONTENT_BY_TYPE: Record<LegalDocumentType, LegalDocumentContent> = {
  privacy: PRIVACY_CONTENT,
  terms: TERMS_CONTENT,
};

const LegalDocumentScreen: React.FC<Props> = ({ route }) => {
  const content = LEGAL_CONTENT_BY_TYPE[route.params.document];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.title}>{content.title}</Text>
          <Text style={styles.meta}>Effective date: {content.effectiveDate}</Text>
          <Text style={styles.intro}>{content.intro}</Text>

          {content.sections.map((section, sectionIndex) => (
            <View key={`${section.heading}-${sectionIndex}`} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.heading}</Text>
              {section.paragraphs.map((paragraph, paragraphIndex) => (
                <Text key={`${section.heading}-p-${paragraphIndex}`} style={styles.bodyText}>
                  {paragraph}
                </Text>
              ))}
              {section.bullets?.map((bullet, bulletIndex) => (
                <Text key={`${section.heading}-b-${bulletIndex}`} style={styles.bulletText}>
                  - {bullet}
                </Text>
              ))}
            </View>
          ))}

          {content.closing ? <Text style={styles.closing}>{content.closing}</Text> : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  card: {
    borderRadius: 14,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 18,
    shadowColor: '#0f172a',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  title: {
    fontSize: 31,
    fontFamily: 'BebasNeue_400Regular',
    color: '#0f172a',
  },
  meta: {
    marginTop: 2,
    fontSize: 14,
    color: '#64748b',
  },
  intro: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    color: '#334155',
  },
  section: {
    marginTop: 18,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'BebasNeue_400Regular',
    color: '#0f172a',
  },
  bodyText: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    color: '#334155',
  },
  bulletText: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    color: '#334155',
  },
  closing: {
    marginTop: 20,
    fontSize: 15,
    lineHeight: 22,
    color: '#475569',
  },
});

export default LegalDocumentScreen;
