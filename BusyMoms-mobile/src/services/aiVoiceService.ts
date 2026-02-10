import { Audio } from 'expo-av';
import { readAsStringAsync, getInfoAsync, deleteAsync } from 'expo-file-system';
import { callEdgeFunction } from '../lib/supabase';
import { logger } from '../utils/logger';

interface TranscriptionResponse {
  text: string;
}

class AIVoiceService {
  private recording: Audio.Recording | null = null;
  private isRecording = false;

  /**
   * Request microphone permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      return status === 'granted';
    } catch (error: unknown) {
      logger.error('[AIVoiceService] Error requesting permissions:', error);
      return false;
    }
  }

  /**
   * Start recording audio
   */
  async startRecording(): Promise<boolean> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        logger.warn('[AIVoiceService] Microphone permission denied');
        return false;
      }

      // Configure audio mode for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      this.recording = recording;
      this.isRecording = true;
      logger.debug('[AIVoiceService] Recording started');
      return true;
    } catch (error: unknown) {
      logger.error('[AIVoiceService] Error starting recording:', error);
      this.isRecording = false;
      return false;
    }
  }

  /**
   * Stop recording and return the audio URI
   */
  async stopRecording(): Promise<string | null> {
    try {
      if (!this.recording || !this.isRecording) {
        return null;
      }

      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();

      // Reset audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      this.recording = null;
      this.isRecording = false;

      logger.debug('[AIVoiceService] Recording stopped, URI:', uri);
      return uri;
    } catch (error: unknown) {
      logger.error('[AIVoiceService] Error stopping recording:', error);
      this.recording = null;
      this.isRecording = false;
      return null;
    }
  }

  /**
   * Cancel the current recording
   */
  async cancelRecording(): Promise<void> {
    try {
      if (this.recording && this.isRecording) {
        await this.recording.stopAndUnloadAsync();
      }
    } catch {
      // Ignore errors on cancel
    } finally {
      this.recording = null;
      this.isRecording = false;
    }
  }

  /**
   * Get current recording status
   */
  getIsRecording(): boolean {
    return this.isRecording;
  }

  /**
   * Send audio to the edge function for transcription
   * Returns the transcribed text
   */
  async transcribeAudio(audioUri: string): Promise<string | null> {
    try {
      // Verify file exists
      const fileInfo = await getInfoAsync(audioUri);
      if (!fileInfo.exists) {
        logger.error('[AIVoiceService] Audio file does not exist:', audioUri);
        return null;
      }

      // Read audio file as base64
      const base64Audio = await readAsStringAsync(audioUri, {
        encoding: 'base64',
      });

      // Extract format from URI
      const audioFormat = audioUri.split('.').pop() || 'm4a';

      const response = await callEdgeFunction<TranscriptionResponse>('openai-chat', {
        action: 'transcribe',
        audio: base64Audio,
        audio_format: audioFormat,
      });

      return response.text || null;
    } catch (error: unknown) {
      logger.error('[AIVoiceService] Error transcribing audio:', error);
      return null;
    }
  }

  /**
   * Clean up temporary audio files
   */
  async cleanupAudioFile(uri: string): Promise<void> {
    try {
      const fileInfo = await getInfoAsync(uri);
      if (fileInfo.exists) {
        await deleteAsync(uri);
      }
    } catch {
      // Ignore cleanup errors
    }
  }
}

export const aiVoiceService = new AIVoiceService();
