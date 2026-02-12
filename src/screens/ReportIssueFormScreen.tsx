import React, { useCallback } from 'react';
import { Alert, InteractionManager } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import FeedbackSubmissionForm from '../components/FeedbackSubmissionForm';
import { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'ReportIssueForm'>;

const ReportIssueFormScreen: React.FC<Props> = ({ navigation }) => {
  const handleSubmitted = useCallback(
    (successMessage: string) => {
      navigation.goBack();
      InteractionManager.runAfterInteractions(() => {
        Alert.alert('Submitted', successMessage);
      });
    },
    [navigation],
  );

  return <FeedbackSubmissionForm type="bug_report" onSubmitted={handleSubmitted} />;
};

export default ReportIssueFormScreen;
