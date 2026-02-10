import React, { useCallback } from 'react';
import { ActivityIndicator, Alert, Linking, StyleSheet, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'ReportIssueForm'>;

const REPORT_ISSUE_FORM_URL = 'https://forms.gle/RDEgUQNyc8znPNNK9';

const ReportIssueFormScreen: React.FC<Props> = () => {
  const handleOpenInBrowser = useCallback(() => {
    void Linking.openURL(REPORT_ISSUE_FORM_URL).catch(() => {
      Alert.alert('Unable to Open Link', 'Please try again later.');
    });
  }, []);

  const handleLoadError = useCallback(() => {
    Alert.alert(
      'Unable to Load Form',
      'Please check your connection and try again.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open in Browser', onPress: handleOpenInBrowser },
      ],
    );
  }, [handleOpenInBrowser]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <WebView
        source={{ uri: REPORT_ISSUE_FORM_URL }}
        startInLoadingState
        setSupportMultipleWindows={false}
        renderLoading={() => (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#0f172a" />
          </View>
        )}
        onError={handleLoadError}
        onHttpError={handleLoadError}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  loaderContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
});

export default ReportIssueFormScreen;
