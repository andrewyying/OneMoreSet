import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import PrimaryButton from './PrimaryButton';
import { FeedbackImagePayload, FeedbackRequestType, submitFeedback } from '../lib/feedbackApi';

type Props = {
  type: FeedbackRequestType;
  onSubmitted: (successMessage: string) => void;
};

type SelectedImage = FeedbackImagePayload & {
  previewUri: string;
  sizeBytes: number;
};

type FieldLabelProps = {
  label: string;
  required?: boolean;
};

const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const MAX_IMAGES = 5;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ISSUE_DETAILS_HELP_ITEMS = [
  ' What you were trying to do',
  ' What actually happened',
  ' What you expected to happen',
  ' Any error messages you saw',
];

const getMessageLabel = (type: FeedbackRequestType): string =>
  type === 'bug_report' ? 'Issue Details' : 'Feedback';

const getSubmitLabel = (type: FeedbackRequestType, isSubmitting: boolean): string => {
  if (isSubmitting) {
    return type === 'bug_report' ? 'Sending Report...' : 'Sending Feedback...';
  }

  return type === 'bug_report' ? 'Send Report' : 'Send Feedback';
};

const getSuccessMessage = (type: FeedbackRequestType): string =>
  type === 'bug_report'
    ? 'Your issue report was sent. Thank you for helping us improve OneMoreSet.'
    : 'Your feedback was sent. Thank you for helping us improve OneMoreSet.';

const estimateSizeFromBase64 = (base64: string): number => Math.floor((base64.length * 3) / 4);

const FieldLabel: React.FC<FieldLabelProps> = ({ label, required = false }) => (
  <View style={styles.labelRow}>
    <Text style={styles.label}>{label}</Text>
    {required ? <Text style={styles.requiredAsterisk}>*</Text> : null}
  </View>
);

const FeedbackSubmissionForm: React.FC<Props> = ({ type, onSubmitted }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [featureRequest, setFeatureRequest] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);

  const isBugReport = type === 'bug_report';
  const isFeedback = type === 'feedback';
  const messageLabel = useMemo(() => getMessageLabel(type), [type]);
  const submitLabel = useMemo(() => getSubmitLabel(type, isSubmitting), [isSubmitting, type]);
  const emailHelpText = useMemo(
    () =>
      isFeedback
        ? 'We may contact you if we need clarification about your feedback.'
        : 'We may contact you if we need clarification about your issue.',
    [isFeedback],
  );

  const handleChooseImage = useCallback(async () => {
    if (selectedImages.length >= MAX_IMAGES) {
      Alert.alert('Image Limit Reached', `You can attach up to ${MAX_IMAGES} images.`);
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Permission Needed',
        'Allow photo access so you can attach a screenshot to your bug report.',
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsMultipleSelection: true,
      selectionLimit: MAX_IMAGES - selectedImages.length,
      allowsEditing: false,
      quality: 0.8,
      base64: true,
    });

    if (result.canceled) {
      return;
    }

    const validAssets = result.assets.filter((asset) => {
      if (!asset.base64) {
        return false;
      }

      const sizeBytes = asset.fileSize ?? estimateSizeFromBase64(asset.base64);
      return sizeBytes <= MAX_IMAGE_BYTES;
    });

    if (validAssets.length === 0) {
      Alert.alert(
        'Images Not Available',
        'Unable to read these images, or they are larger than 3 MB each.',
      );
      return;
    }

    if (validAssets.length < result.assets.length) {
      Alert.alert(
        'Some Images Skipped',
        'Only images smaller than 3 MB were added.',
      );
    }

    setSelectedImages((prev) => {
      const mapped = validAssets.map((asset, index) => ({
        previewUri: asset.uri,
        base64: asset.base64 as string,
        filename: asset.fileName?.trim() || `bug-screenshot-${Date.now()}-${index + 1}.jpg`,
        mimeType: asset.mimeType?.trim() || 'image/jpeg',
        sizeBytes: asset.fileSize ?? estimateSizeFromBase64(asset.base64 as string),
      }));

      const combined = [...prev, ...mapped];
      if (combined.length > MAX_IMAGES) {
        Alert.alert('Image Limit Reached', `You can attach up to ${MAX_IMAGES} images.`);
        return combined.slice(0, MAX_IMAGES);
      }

      return combined;
    });
  }, [selectedImages.length]);

  const handleRemoveImage = useCallback((indexToRemove: number) => {
    setSelectedImages((prev) => prev.filter((_, index) => index !== indexToRemove));
  }, []);

  const handleSubmit = useCallback(async () => {
    const sanitizedEmail = email.trim();
    const sanitizedMessage = message.trim();
    const sanitizedFeatureRequest = featureRequest.trim();

    if (!EMAIL_PATTERN.test(sanitizedEmail)) {
      Alert.alert('Invalid Email', 'Enter a valid email so we can follow up.');
      return;
    }

    if (sanitizedMessage.length < 5) {
      Alert.alert('Message Required', 'Please add a bit more detail before submitting.');
      return;
    }

    setIsSubmitting(true);

    try {
      await submitFeedback({
        type,
        name,
        email: sanitizedEmail,
        message: sanitizedMessage,
        featureRequest: isFeedback ? sanitizedFeatureRequest : undefined,
        images: isBugReport && selectedImages.length > 0 ? selectedImages : undefined,
      });

      onSubmitted(getSuccessMessage(type));
    } catch (error) {
      const messageFromError =
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : 'Unable to submit right now. Please try again.';
      Alert.alert('Submission Failed', messageFromError);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    email,
    featureRequest,
    isBugReport,
    isFeedback,
    message,
    name,
    onSubmitted,
    selectedImages,
    type,
  ]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <FieldLabel label="Name" />
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              autoCapitalize="words"
              style={styles.input}
              editable={!isSubmitting}
            />

            <FieldLabel label="Email" required />
            <Text style={styles.helpText}>{emailHelpText}</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@email.com"
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
              style={styles.input}
              editable={!isSubmitting}
            />

            <FieldLabel label={messageLabel} required />
            {isBugReport ? (
              <View style={styles.helpListContainer}>
                <Text style={styles.helpText}>Please describe:</Text>
                {ISSUE_DETAILS_HELP_ITEMS.map((item) => (
                  <Text key={item} style={styles.helpBullet}>
                    -{item}
                  </Text>
                ))}
              </View>
            ) : null}
            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder={
                isBugReport
                  ? 'What happened? What did you expect? Steps to reproduce?'
                  : 'Tell us what is working well or what we can improve.'
              }
              multiline
              textAlignVertical="top"
              style={styles.messageInput}
              editable={!isSubmitting}
            />

            {isFeedback ? (
              <View>
                <FieldLabel label="Feature Request" />
                <TextInput
                  value={featureRequest}
                  onChangeText={setFeatureRequest}
                  placeholder="Are there any features or improvements you'd like to see?"
                  multiline
                  textAlignVertical="top"
                  style={styles.featureRequestInput}
                  editable={!isSubmitting}
                />
              </View>
            ) : null}

            {isBugReport ? (
              <View style={styles.imageSection}>
                <FieldLabel label="Images" />
                <Text style={styles.helpText}>Attach screenshots if they help explain the issue.</Text>

                {selectedImages.length > 0 ? (
                  <View style={styles.imageGrid}>
                    {selectedImages.map((image, index) => (
                      <View key={`${image.previewUri}-${index}`} style={styles.imagePreviewCard}>
                        <Image source={{ uri: image.previewUri }} style={styles.imagePreview} />
                        <View style={styles.imageCardFooter}>
                          <Text style={styles.imageMeta}>
                            {(image.sizeBytes / (1024 * 1024)).toFixed(2)} MB
                          </Text>
                          <Pressable
                            onPress={() => handleRemoveImage(index)}
                            disabled={isSubmitting}
                            style={({ pressed }) => [
                              styles.removeActionInline,
                              pressed ? styles.actionPressed : undefined,
                            ]}
                          >
                            <Text style={styles.removeActionLabel}>Remove</Text>
                          </Pressable>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : null}

                <Text style={styles.imageLimitText}>
                  {selectedImages.length}/{MAX_IMAGES} selected
                </Text>

                <Pressable
                  onPress={handleChooseImage}
                  style={({ pressed }) => [
                    styles.imagePickerButton,
                    pressed ? styles.actionPressed : undefined,
                  ]}
                  disabled={isSubmitting}
                >
                  <MaterialIcons name="add-photo-alternate" size={18} color="#0f172a" />
                  <Text style={styles.imagePickerLabel}>
                    {selectedImages.length > 0 ? 'Add More Images' : 'Choose Images'}
                  </Text>
                </Pressable>
              </View>
            ) : null}

            <PrimaryButton
              label={submitLabel}
              onPress={() => {
                void handleSubmit();
              }}
              disabled={isSubmitting}
              style={styles.submitButton}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  keyboardContainer: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  card: {
    borderRadius: 14,
    backgroundColor: '#fff',
    padding: 14,
    shadowColor: '#0f172a',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 18,
    fontFamily: 'BebasNeue_400Regular',
    color: '#0f172a',
  },
  requiredAsterisk: {
    marginLeft: 4,
    fontSize: 18,
    lineHeight: 18,
    color: '#dc2626',
    fontFamily: 'BebasNeue_400Regular',
  },
  helpText: {
    fontSize: 14,
    fontFamily: 'BebasNeue_400Regular',
    color: '#64748b',
    marginBottom: 8,
  },
  helpListContainer: {
    marginBottom: 8,
  },
  helpBullet: {
    fontSize: 14,
    fontFamily: 'BebasNeue_400Regular',
    color: '#64748b',
    marginBottom: 2,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 20,
    fontFamily: 'BebasNeue_400Regular',
    color: '#0f172a',
    marginBottom: 14,
  },
  messageInput: {
    minHeight: 150,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 20,
    fontFamily: 'BebasNeue_400Regular',
    color: '#0f172a',
    marginBottom: 14,
  },
  featureRequestInput: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 20,
    fontFamily: 'BebasNeue_400Regular',
    color: '#0f172a',
    marginBottom: 14,
  },
  imageSection: {
    marginBottom: 8,
  },
  imagePickerButton: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  imagePickerLabel: {
    marginLeft: 8,
    fontSize: 18,
    fontFamily: 'BebasNeue_400Regular',
    color: '#0f172a',
  },
  imageLimitText: {
    marginTop: 6,
    marginBottom: 8,
    fontSize: 14,
    fontFamily: 'BebasNeue_400Regular',
    color: '#64748b',
  },
  imageGrid: {
    gap: 8,
  },
  imagePreviewCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 10,
    backgroundColor: '#f8fafc',
  },
  imagePreview: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 10,
    backgroundColor: '#e2e8f0',
  },
  imageCardFooter: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  imageMeta: {
    fontSize: 15,
    fontFamily: 'BebasNeue_400Regular',
    color: '#64748b',
  },
  removeActionInline: {
    minWidth: 84,
    height: 34,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fff1f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeActionLabel: {
    fontSize: 16,
    fontFamily: 'BebasNeue_400Regular',
    color: '#b91c1c',
  },
  actionPressed: {
    opacity: 0.75,
  },
  submitButton: {
    marginTop: 10,
  },
});

export default FeedbackSubmissionForm;
